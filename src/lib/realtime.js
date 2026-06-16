// Realtime (live voice) interview — OpenAI Realtime API over WebRTC.
//
// The browser connects DIRECTLY to OpenAI using a short-lived ephemeral client
// secret minted by our backend; audio never flows through our server. This
// module owns the WebRTC lifecycle (mic capture, SDP handshake, remote audio
// playback) and surfaces simple state callbacks for the UI.
//
// NOTE: this file cannot be unit-tested in jsdom (no RTCPeerConnection /
// getUserMedia) — verify manually in desktop Chrome.
// SECURITY: never log the ephemeral clientSecret.
import { getPlatform } from '../utils/platform';

// Realtime needs raw mic capture + WebRTC, which only work in a real browser.
// Capacitor native (Android/iOS) WebView has no RECORD_AUDIO yet → unsupported,
// so callers fall back to the turn-based conversational mode.
export const isRealtimeSupported = () =>
  getPlatform() === 'web' &&
  typeof RTCPeerConnection !== 'undefined' &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

const REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
const REALTIME_LEGACY_URL = 'https://api.openai.com/v1/realtime';

// Pull finalized transcript text out of realtime server events. The candidate's
// speech and the interviewer's replies arrive as separate "done" events; we use
// the finalized ones (not streaming deltas) so we get clean turns. Returns the
// turn it pushed ({ role, text }) so callers can also surface live captions.
const collectTranscript = (msg, transcript) => {
  const t = msg.type;
  // Candidate (user) speech transcription.
  if (t === 'conversation.item.input_audio_transcription.completed') {
    const text = (msg.transcript || '').trim();
    if (text) {
      const turn = { role: 'candidate', text };
      transcript.push(turn);
      return turn;
    }
    return null;
  }
  // Interviewer (assistant) spoken text — naming varies across API versions.
  if (t === 'response.output_audio_transcript.done' || t === 'response.audio_transcript.done') {
    const text = (msg.transcript || '').trim();
    if (text) {
      const turn = { role: 'interviewer', text };
      transcript.push(turn);
      return turn;
    }
  }
  return null;
};

// Map raw OpenAI realtime server events → coarse UI states. We key "speaking"
// vs "listening" off the WebRTC audio-PLAYBACK buffer (output_audio_buffer.*),
// not response.done — response.done fires when the model finishes GENERATING,
// while its audio keeps playing for a beat after. The deltas are a fallback for
// API variants that don't emit the buffer events.
const eventToState = (type) => {
  if (type === 'input_audio_buffer.speech_started') return 'listening';
  if (type === 'output_audio_buffer.stopped') return 'listening';
  if (
    type === 'output_audio_buffer.started' ||
    type === 'response.created' ||
    type === 'response.output_audio.delta' ||
    type === 'response.audio.delta'
  )
    return 'speaking';
  return null;
};

/**
 * Create a realtime session controller.
 * @param {object} opts
 * @param {string} opts.clientSecret  ephemeral key from the backend
 * @param {string} opts.model
 * @param {(state:'connecting'|'listening'|'speaking'|'idle')=>void} opts.onState
 * @param {(err:{code:string,message?:string})=>void} opts.onError
 * @param {(streams:{local:MediaStream,remote:MediaStream})=>void} opts.onStream
 * @returns {{ start, stop, toggleMute, getLocalStream, getRemoteStream, getTranscript }}
 */
export function createRealtimeSession({
  clientSecret,
  model,
  onState,
  onError,
  onStream,
  onCaption,
}) {
  let pc = null;
  let localStream = null;
  let remoteStream = null;
  let micTrack = null;
  let audioEl = null;
  let dc = null;
  let stopped = false;
  // Ordered transcript collected from the data channel, for end-of-interview
  // grading. Both sides are transcribed by OpenAI (input transcription is enabled
  // server-side in the session config).
  const transcript = [];
  // The mic stays OFF until the interviewer has actually spoken AND then stopped
  // (the UI state goes speaking → listening), so the candidate's voice (or room
  // noise) isn't captured — and the AI isn't interrupted — while it's still
  // talking. `hasSpoken` guards against unlocking before the AI has said anything.
  let micUnlocked = false;
  let userMuted = false;
  let hasSpoken = false;
  // Whether the candidate is currently speaking (server VAD). Used by the
  // time-up wind-down so a silent-room fallback prompt never cuts off a talker.
  let userSpeaking = false;
  let speakBackstopTimer = null;
  let connectTimer = null;

  const fail = (code, message) => onError && onError({ code, message });

  // The mic is live only once the greeting is done AND the user hasn't muted.
  const applyMic = () => {
    if (micTrack) micTrack.enabled = micUnlocked && !userMuted;
  };

  const clearMicTimers = () => {
    if (speakBackstopTimer) {
      clearTimeout(speakBackstopTimer);
      speakBackstopTimer = null;
    }
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
  };

  const unlockMic = () => {
    if (micUnlocked) return;
    micUnlocked = true;
    clearMicTimers();
    applyMic();
  };

  const start = async () => {
    onState && onState('connecting');

    // 1. Microphone.
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      fail('MIC_DENIED');
      return;
    }
    if (stopped) return;

    // 2. Peer connection + remote audio playback.
    pc = new RTCPeerConnection();
    audioEl = new Audio();
    audioEl.autoplay = true;
    pc.ontrack = (e) => {
      remoteStream = e.streams[0];
      audioEl.srcObject = remoteStream;
      onStream && onStream({ local: localStream, remote: remoteStream });
    };

    micTrack = localStream.getAudioTracks()[0];
    applyMic(); // start muted (micUnlocked is false) until the greeting finishes
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    // 3. Data channel for realtime server events (turn state).
    dc = pc.createDataChannel('oai-events');
    // Ask the interviewer to speak first — the session instructions tell it to
    // greet warmly and ask the opening question.
    dc.onopen = () => {
      try {
        dc.send(JSON.stringify({ type: 'response.create' }));
      } catch {
        /* if this fails the model still responds once the user speaks */
      }
    };
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'error') {
          fail('REALTIME_EVENT', msg.error?.message || 'realtime error');
          return;
        }
        // Track whether the candidate is mid-speech (server VAD), so the
        // time-up fallback prompt only fires in a genuinely silent room.
        if (msg.type === 'input_audio_buffer.speech_started') userSpeaking = true;
        if (msg.type === 'input_audio_buffer.speech_stopped') userSpeaking = false;
        const turn = collectTranscript(msg, transcript);
        if (turn && onCaption) onCaption(turn);
        const s = eventToState(msg.type);
        if (s) {
          // First real state means the AI is engaging — cancel the connect guard.
          if (connectTimer) {
            clearTimeout(connectTimer);
            connectTimer = null;
          }
          if (s === 'speaking' && !hasSpoken) {
            hasSpoken = true;
            // Insurance only: if the "stopped"/listening event never arrives,
            // don't strand the mic muted forever (well longer than any greeting).
            speakBackstopTimer = setTimeout(unlockMic, 30000);
          }
          // Unlock the mic the instant the AI stops speaking — i.e. the state
          // goes speaking → listening, and only AFTER it has actually spoken.
          // Never unlock while it's still talking.
          if (s === 'listening' && hasSpoken && !micUnlocked) {
            unlockMic();
          }
          onState && onState(s);
        }
      } catch {
        /* ignore non-JSON / unknown events */
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc && pc.connectionState === 'connected') {
        // Stay on the "connecting" screen until the AI actually speaks (it goes
        // first). Safety: if no greeting audio arrives, advance AND unlock the
        // mic so the user isn't stranded muted.
        connectTimer = setTimeout(() => {
          if (onState) onState('listening');
          unlockMic();
        }, 12000);
      }
      if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
        fail('CONNECTION_LOST');
      }
    };

    // 4. SDP offer → OpenAI (with the ephemeral key) → SDP answer.
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (stopped) return;

      const answerSdp = await exchangeSdp(offer.sdp, clientSecret, model);
      if (stopped) return;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (err) {
      fail('HANDSHAKE_FAILED', err?.message);
    }
  };

  const stop = () => {
    stopped = true;
    clearMicTimers();
    try {
      dc && dc.close();
    } catch {
      /* noop */
    }
    try {
      localStream && localStream.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
    try {
      pc && pc.getSenders().forEach((s) => s.track && s.track.stop());
      pc && pc.close();
    } catch {
      /* noop */
    }
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl = null;
    }
    pc = null;
    onState && onState('idle');
  };

  // Toggle the user mute without renegotiating. Returns the new muted state.
  // Respects the greeting gate — won't open the mic before the AI has greeted.
  const toggleMute = () => {
    userMuted = !userMuted;
    applyMic();
    return userMuted;
  };

  // Inject a steering note (e.g. "time's almost up — wrap up") as a SYSTEM
  // conversation item. The model picks it up on its next turn WITHOUT being
  // forced to respond now, so it doesn't interrupt whoever is speaking. Not a
  // user/assistant turn, so it never pollutes the graded transcript.
  const sendInstruction = (text, respond = false) => {
    if (!dc || dc.readyState !== 'open') return;
    try {
      if (text) {
        dc.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'system',
              content: [{ type: 'input_text', text }],
            },
          })
        );
      }
      // When asked, prompt the model to speak NOW (don't wait for the next user
      // turn). Used by the silent-room time-up fallback. Harmless no-op/error if
      // a response is already active.
      if (respond) dc.send(JSON.stringify({ type: 'response.create' }));
    } catch {
      /* best-effort steering */
    }
  };

  return {
    start,
    stop,
    toggleMute,
    sendInstruction,
    isUserSpeaking: () => userSpeaking,
    getLocalStream: () => localStream,
    getRemoteStream: () => remoteStream,
    getTranscript: () => transcript.slice(),
  };
}

// POST the SDP offer to OpenAI and return the SDP answer. Uses fetch (NOT the
// app axios instance, which targets our backend + attaches our JWT). On a 404
// from the GA `/calls` endpoint, retry once against the legacy endpoint.
async function exchangeSdp(offerSdp, clientSecret, model) {
  const headers = {
    Authorization: `Bearer ${clientSecret}`,
    'Content-Type': 'application/sdp',
  };
  const q = `?model=${encodeURIComponent(model)}`;

  let res = await fetch(`${REALTIME_CALLS_URL}${q}`, {
    method: 'POST',
    headers,
    body: offerSdp,
  });
  if (res.status === 404) {
    res = await fetch(`${REALTIME_LEGACY_URL}${q}`, {
      method: 'POST',
      headers,
      body: offerSdp,
    });
  }
  if (!res.ok) throw new Error(`Realtime handshake failed (${res.status})`);
  return res.text();
}
