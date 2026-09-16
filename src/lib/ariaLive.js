import api from '../services/api';

// Aria Live — the browser half of a spoken CV build, over WebRTC.
//
// ── WHY THIS IS NOT lib/realtime.js ──
//
// Same transport, opposite conversation. Three differences make sharing the file a worse
// idea than the duplication it would save:
//
//   1. THE HANDSHAKE. realtime.js fetches an ephemeral secret and POSTs its own SDP to
//      OpenAI. GPT-Live has no ephemeral secret: the offer goes to OUR server, which calls
//      OpenAI with the project key and hands back the answer. That is what lets the backend
//      hold a sideband and hang up when the minutes run out.
//
//   2. DELEGATION. GPT-Live does no reasoning. When it wants to know what to say next it
//      raises a delegation event and waits, and we answer it with coachChatTurn — the exact
//      same backend turn a typed build uses. That loop has no equivalent in realtime.js.
//
//   3. BARGE-IN. The interview actively SUPPRESSES interruption: it keeps the mic disabled
//      until Aria has finished speaking, because talking over a candidate is worse than a
//      beat of silence. Here interruption is the point — people correct themselves halfway
//      through a sentence — and GPT-Live handles it in-model, so the mic is simply live.
//
// ── DELTAS, NOT JUST FINAL TURNS ──
//
// realtime.js deliberately ignores transcript deltas and keeps only finalised events,
// because a mock interview has no live captions. Here the growing text IS the feature: the
// user watches what they said appear as they say it. So deltas drive a transient bubble,
// and the finalised turn replaces it.
//
// Not unit-testable under jsdom — there is no RTCPeerConnection and no getUserMedia. Keep
// anything worth asserting out of this file; verify the transport by hand in desktop
// Chrome. (Same constraint, and same reason, as lib/realtime.js.)

// Capacitor's Android WebView has no RECORD_AUDIO permission wired up, so a call can never
// start there. Callers MUST check this and keep the textarea reachable rather than
// rendering a button that fails when pressed.
export const isAriaLiveSupported = () =>
  typeof window !== 'undefined' &&
  typeof window.RTCPeerConnection === 'function' &&
  !!navigator?.mediaDevices?.getUserMedia &&
  !window.Capacitor?.isNativePlatform?.();

// session.commentary.append accepts at most 500 tokens. Aria's replies are short by design
// (one question at a time), but a generated wrap-up can run long, and an over-length append
// is rejected outright — which would leave the call silent at exactly the wrong moment.
const MAX_SPOKEN_CHARS = 1500;

const clip = (text) => {
  const s = String(text || '').trim();
  return s.length > MAX_SPOKEN_CHARS ? `${s.slice(0, MAX_SPOKEN_CHARS - 1)}…` : s;
};

/**
 * Open a build call.
 *
 * @param {object}   opts
 * @param {string}   opts.draftId
 * @param {string}   opts.section          'experience' | 'project'
 * @param {string}   opts.lang
 * @param {Function} opts.onDelegate       async (userText) => ariaReplyText — the BACKEND TURN
 * @param {Function} [opts.onState]        (state) => void  'connecting'|'listening'|'speaking'|'ended'
 * @param {Function} [opts.onUserDelta]    (partialText) => void
 * @param {Function} [opts.onUserFinal]    (text) => void
 * @param {Function} [opts.onAriaDelta]    (partialText) => void
 * @param {Function} [opts.onAriaFinal]    (text) => void
 * @param {Function} [opts.onEnded]        ({ reason }) => void
 * @param {Function} [opts.onError]        (error) => void
 */
export function createAriaCall({
  draftId,
  section,
  lang = 'en',
  onDelegate,
  onState,
  onUserDelta,
  onUserFinal,
  onAriaDelta,
  onAriaFinal,
  onEnded,
  onError,
}) {
  let pc = null;
  let mic = null;
  let events = null;
  let audioEl = null;
  let reservationId = null;
  let reservedSec = 0;
  let startedAt = 0;
  let closed = false;

  // In-flight turn text. Rebuilt from deltas and cleared the moment the turn closes, so a
  // second turn can never inherit the tail of the first.
  let userBuf = '';
  let ariaBuf = '';

  const state = (s) => {
    try {
      onState?.(s);
    } catch {
      /* a listener must never take the call down */
    }
  };

  const send = (payload) => {
    if (events?.readyState === 'open') events.send(JSON.stringify(payload));
  };

  // Close the user's turn and hand it to the backend brain.
  //
  // Called from the delegation event rather than from a transcript event, because
  // delegation is GPT-Live's own signal that the user said something SUBSTANTIVE — an
  // "mm-hm" or a "sorry, what?" is handled by the voice model and never gets here. That
  // keeps spoken turns and typed turns counting the same way against the turn cap.
  const runDelegation = async (delegationId) => {
    const said = userBuf.trim();
    userBuf = '';
    if (said) onUserFinal?.(said);

    if (!said || typeof onDelegate !== 'function') return;
    try {
      const reply = await onDelegate(said);
      const spoken = clip(reply);
      if (!spoken || closed) return;
      // commentary = say this aloud (it may paraphrase, which is what keeps a scripted
      // line sounding like speech). thinking = know this but don't announce it.
      send({
        type: 'session.commentary.append',
        delegation_id: delegationId ?? null,
        content: spoken,
      });
    } catch (err) {
      onError?.(err);
      // Tell Aria the truth rather than letting her invent a next question while the
      // backend is down. She will put this in her own words.
      send({
        type: 'session.commentary.append',
        delegation_id: delegationId ?? null,
        content: 'Say that you lost your train of thought, and ask them to say that again.',
      });
    }
  };

  const onEvent = (raw) => {
    let event = null;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    switch (event.type) {
      case 'session.started':
        state('listening');
        break;

      case 'session.input_transcript.delta':
        userBuf += event.delta || '';
        onUserDelta?.(userBuf);
        break;

      case 'session.output_transcript.delta':
        ariaBuf += event.delta || '';
        state('speaking');
        onAriaDelta?.(ariaBuf);
        break;

      // The spoken turn is over. The event name is not the same across every transport
      // shape, so both spellings are accepted rather than betting on one — missing this
      // would leave Aria's words stuck as a transient bubble that never commits.
      case 'session.output_transcript.done':
      case 'session.output_transcript.completed': {
        const said = ariaBuf.trim();
        ariaBuf = '';
        if (said) onAriaFinal?.(said);
        state('listening');
        break;
      }

      case 'session.delegation.created':
        runDelegation(event.delegation?.id ?? event.delegation_id ?? null);
        break;

      case 'session.closed':
        finish(event.reason || 'closed');
        break;

      case 'error':
        onError?.(new Error(event.error?.message || 'Live session error'));
        break;

      default:
        break;
    }
  };

  // Tear-down, idempotent. Also settles the reservation server-side so the balance is
  // right before the user looks at it — the backend sideband would settle it anyway, and
  // both routes run through the same idempotent settle, so a double call is harmless.
  const finish = async (reason = 'ended') => {
    if (closed) return;
    closed = true;
    state('ended');

    try {
      mic?.getTracks().forEach((t) => t.stop());
    } catch {
      /* already stopped */
    }
    try {
      pc?.close();
    } catch {
      /* already closed */
    }
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl = null;
    }

    const durationSec = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    if (reservationId) {
      try {
        await api.post('/aria-live/end', { reservationId, durationSec });
      } catch {
        // The sideband settles it regardless; a failed courtesy call is not worth
        // surfacing to someone who has just hung up.
      }
    }
    try {
      onEnded?.({ reason, durationSec });
    } catch {
      /* ignore */
    }
  };

  const start = async () => {
    state('connecting');
    mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc = new RTCPeerConnection();

    // Aria's voice. Created rather than taken from the DOM so nothing in the page needs to
    // reserve an <audio> element for a feature that may never run.
    audioEl = new Audio();
    audioEl.autoplay = true;
    pc.addEventListener('track', (e) => {
      audioEl.srcObject = new MediaStream([e.track]);
      audioEl.play().catch(() => {
        /* autoplay policy — the user gesture that started the call covers this */
      });
    });

    mic.getAudioTracks().forEach((track) => pc.addTrack(track, mic));

    events = pc.createDataChannel('oai-events');
    events.onmessage = (e) => onEvent(e.data);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // OUR server, not OpenAI. It reserves the minutes, mints the session, and attaches the
    // sideband that can hang up — see controllers/ariaLive.controller.
    const { data } = await api.post('/aria-live/session', {
      sdp: offer.sdp,
      section,
      draftId,
      lang,
    });

    reservationId = data.reservationId;
    reservedSec = data.reservedSec || 0;
    startedAt = Date.now();
    await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });

    return { reservedSec, mode: data.mode };
  };

  return {
    start,
    stop: () => finish('user_ended'),
    /** Seconds left in this call, for the countdown chip. */
    secondsLeft: () =>
      startedAt
        ? Math.max(0, reservedSec - Math.round((Date.now() - startedAt) / 1000))
        : reservedSec,
    /** The live remote stream, for the orb's audio analyser. */
    getRemoteStream: () => audioEl?.srcObject || null,
    getLocalStream: () => mic,
    isClosed: () => closed,
  };
}

export default createAriaCall;
