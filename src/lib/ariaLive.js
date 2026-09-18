import api from '../services/api';
import { createRealtimeSession, isRealtimeSupported } from './realtime';

// Aria Live — the browser half of a spoken CV build.
//
// ── A THIN ADAPTER, NOT A SECOND TRANSPORT ──
//
// This began as its own WebRTC stack for `gpt-live-1`. It now runs on the SAME engine as the
// mock interview (`gpt-realtime-2.1-mini`), because that is measured at ~₦45/min against
// GPT-Live's flat $0.05/min (~₦78) and a build call is even more listening-heavy than an
// interview — Aria asks one short question, the user talks. For the students this feature
// exists for, ~40% off the voice bill mattered more than the architecture did.
//
// So `lib/realtime.js` does all the hard work — SDP exchange, transcript collection, the
// speaking/listening state machine, mic handling — and this file is:
//
//   1. our session endpoint (reserve the minutes, mint through the server), and
//   2. an adapter that presents the SIX-METHOD interface SectionCoach already talks to:
//      { start, stop, secondsLeft, getRemoteStream, getLocalStream, isClosed }.
//
// Nothing above this file changed when the engine did, which is the whole point of that
// boundary existing.
//
// ── WHY THERE IS NO DELEGATION HERE ANY MORE ──
//
// GPT-Live let the voice model hand each turn to `coachChatTurn` and wait. Realtime tool
// calling is SYNCHRONOUS — the model cannot say another word until `function_call_output`
// lands — and a `coachChatTurn` round trip is 1.5-3s, which reads as a dropped call. So Aria
// conducts the interview herself from the prompt (see backend `buildAriaLiveInstructions`),
// and the transcript is handed to `coachChatTurn` ONCE at the end, off the latency path.
//
// Not unit-testable under jsdom — no RTCPeerConnection, no getUserMedia. Same constraint, and
// the same reason, as lib/realtime.js: verify a real call by hand in desktop Chrome.

// Web only. The Capacitor Android WebView has no RECORD_AUDIO wired up, so callers MUST check
// this and keep the textarea reachable rather than rendering a button that fails when pressed.
export const isAriaLiveSupported = () => isRealtimeSupported();

// How the call can end, so the caller can tell a DECISION from an interruption.
//
//   aria_finished — Aria recapped, asked if there was anything else, the user said that's
//                   everything, and she called finish_interview. The interview is done.
//   user_ended    — the End button. Could be done, could be mid-sentence.
//   time_up       — the reservation ran out.
//
// Only the first means "go and write the bullets". The other two ask the user what they want.
export const END_REASONS = {
  ARIA_FINISHED: 'aria_finished',
  USER_ENDED: 'user_ended',
  TIME_UP: 'time_up',
  // The connection went, rather than the call being finished by anyone. Treated like a hang-up
  // from here on — what was said still counts — but named separately so the user is told the
  // truth about why their call stopped.
  DROPPED: 'dropped',
};

// Transport errors there is no coming back from. A call that hits one of these is over,
// whatever the UI still shows.
const FATAL_ERRORS = new Set(['CONNECTION_LOST', 'HANDSHAKE_FAILED', 'MIC_DENIED']);

// When to warn Aria that the clock is running out. Long enough for her to recap, ask if there
// is anything else, hear the answer and say goodbye — roughly four short turns.
const WRAP_UP_WARNING_SEC = 75;

/**
 * Open a build call.
 *
 * @param {object}   opts
 * @param {string}   opts.draftId
 * @param {string}   opts.section       'experience' | 'project'
 * @param {string}   opts.lang
 * @param {object}   [opts.callSettings] { depth, style, voice, pace } — normalised again server-side
 * @param {Function} [opts.onTurn]      ({ who, text }) => void — a finalised turn, for the chat
 * @param {Function} [opts.onState]     (state) => void  'connecting'|'listening'|'speaking'|'ended'
 * @param {Function} [opts.onEnded]     ({ reason, durationSec }) => void
 * @param {Function} [opts.onError]     (error) => void
 */
export function createAriaCall({
  draftId,
  section,
  // Which entry this call is about. The server needs it for two things: to describe the right
  // role in the prompt, and to find what has already been said about it — a second call must
  // not open by asking someone to repeat an interview they have already given.
  sortId,
  lang = 'en',
  callSettings,
  onTurn,
  onState,
  onEnded,
  onError,
}) {
  let session = null;
  let reservationId = null;
  let reservedSec = 0;
  let startedAt = 0;
  let closed = false;
  let clock = null;
  let warned = false;

  const safely = (fn, arg) => {
    try {
      fn?.(arg);
    } catch {
      /* a listener must never take the call down */
    }
  };

  // Tear-down, idempotent. Settles the reservation so the balance is right before the user
  // looks at it. The server settles it anyway — on a timer, and by sweeping a stale one on
  // the next call — so a failed request here costs nothing but a moment's staleness.
  const finish = async (reason = END_REASONS.USER_ENDED) => {
    if (closed) return;
    closed = true;
    if (clock) clearInterval(clock);
    safely(onState, 'ended');

    try {
      session?.stop();
    } catch {
      /* already stopped */
    }

    const durationSec = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;

    // TELL THE UI FIRST, settle in the background.
    //
    // This used to await the settle request before reporting the end, which made the whole
    // ending hostage to one round trip. On a hang-up that is a barely-visible pause; on a
    // DROPPED call it is the worst possible moment to wait on the network, because the network
    // is the thing that just failed — the request sits there until it times out, and for all
    // that time the orb is still up over a call that is already dead.
    //
    // Nothing is lost by not waiting: the response is not read, and the server settles the
    // reservation on its own timer and sweeps a stale one on the next call, so this request is
    // an optimisation (the balance is right sooner) rather than the mechanism.
    safely(onEnded, { reason, durationSec });

    if (reservationId) {
      api.post('/aria-live/end', { reservationId, durationSec }).catch(() => {
        // The server's timer settles it regardless; not worth surfacing to someone who has
        // just hung up.
      });
    }
  };

  const start = async () => {
    safely(onState, 'connecting');

    // OUR server: it reserves the minutes, builds the interview prompt from the draft, and
    // mints the ephemeral secret. A 402 here is the out-of-minutes boundary SectionCoach
    // turns into a card.
    // The settings ride with the call rather than being read from the profile server-side,
    // so a change made seconds before pressing the button applies to THIS call even if the
    // profile save has not landed yet.
    const { data } = await api.post('/aria-live/session', {
      section,
      draftId,
      sortId,
      lang,
      callSettings,
    });
    reservationId = data.reservationId;
    reservedSec = data.reservedSec || 0;

    session = createRealtimeSession({
      clientSecret: data.clientSecret,
      model: data.model,
      onState: (s) => safely(onState, s),
      // AN ERROR THAT KILLS THE TRANSPORT IS THE END OF THE CALL, not a note about it.
      //
      // This used to only forward the error, and SectionCoach only logged it. So when a phone
      // lost its connection mid-interview, nothing ended: `finish` never ran, so the orb sat
      // there looking live, `/aria-live/end` was never posted (the reservation waited for the
      // server's own sweep), and — worst of it — everything that had been said was stranded.
      // The user had six minutes of paid conversation in the chat, no bullets, and no way to
      // ask for any. Observed on a real call: 379 seconds spent, zero bullets written.
      //
      // Ending here routes a drop down the same path as hanging up: the reservation settles on
      // the real duration, and the card comes up offering to write the bullets from what was
      // already said. REALTIME_EVENT is deliberately not in the list — the server sends those
      // for recoverable problems mid-session, and ending a good call over one would be worse
      // than the bug this fixes.
      onError: (err) => {
        safely(onError, err);
        if (FATAL_ERRORS.has(err?.code)) finish(END_REASONS.DROPPED);
      },
      // Finalised turns only — realtime emits no partial transcript, which is why the
      // in-flight bubble the GPT-Live version drew is gone. Both sides land in the chat.
      onCaption: (turn) => {
        if (!turn?.text) return;
        safely(onTurn, {
          who: turn.role === 'candidate' ? 'user' : 'aria',
          text: turn.text,
        });
      },
      // Aria speaks first: she has to open the interview, not wait to be prompted by someone
      // who does not yet know what the call is for.
      autoGreet: true,
      // She decided the interview is done AND the user agreed — and her goodbye has finished
      // playing. The one ending that means "write the bullets now".
      onFinish: () => finish(END_REASONS.ARIA_FINISHED),
    });

    await session.start();
    startedAt = Date.now();

    // THE CLOCK. Two jobs, and the second one was missing entirely.
    //
    // 1. A time check a little before the end, injected as a system note rather than forcing
    //    a response — so it never makes Aria talk over someone mid-answer; she acts on it at
    //    her next turn by going straight to the recap (see "IF YOU ARE TOLD TIME IS NEARLY UP"
    //    in the backend prompt).
    //
    // 2. A hard stop at the reservation. Realtime never tells our server the session id, so
    //    the server cannot hang up — and nothing in the browser did either. The countdown chip
    //    reached 0:00 and the call simply carried on, on our OpenAI bill, past the minutes the
    //    user had paid for. The clamp meant the USER was never overcharged; WE were.
    clock = setInterval(() => {
      const left = reservedSec - Math.round((Date.now() - startedAt) / 1000);
      if (!warned && left <= WRAP_UP_WARNING_SEC && reservedSec > WRAP_UP_WARNING_SEC) {
        warned = true;
        try {
          session?.sendInstruction(
            'TIME IS NEARLY UP: about a minute left on this call. Stop opening new topics. At your next turn, go straight to the recap and ask if there is anything else. Then say goodbye and call finish_interview.',
            false
          );
        } catch {
          /* best-effort: the hard stop below still ends the call */
        }
      }
      if (left <= 0) finish(END_REASONS.TIME_UP);
    }, 1000);

    return { reservedSec, mode: data.mode };
  };

  return {
    start,
    stop: () => finish(END_REASONS.USER_ENDED),
    /** Seconds left in this call, for the countdown chip. */
    secondsLeft: () =>
      startedAt
        ? Math.max(0, reservedSec - Math.round((Date.now() - startedAt) / 1000))
        : reservedSec,
    /** The live remote stream, for the orb's audio analyser. */
    getRemoteStream: () => session?.getRemoteStream() || null,
    getLocalStream: () => session?.getLocalStream() || null,
    /** Every finalised turn, in order — the material the bullets get built from. */
    getTranscript: () => session?.getTranscript() || [],
    isClosed: () => closed,
  };
}

export default createAriaCall;
