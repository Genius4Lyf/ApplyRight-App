// Delivery telemetry for the live voice interview.
//
// WHY THIS EXISTS: audio never reaches our backend — the browser holds the
// Realtime session and only ships a text transcript for grading. A transcript
// cannot show that someone sat in silence for eight seconds before answering, or
// gave a fifteen-second reply, or rambled for three minutes. So the numbers have
// to be measured HERE, from the session's own events, and sent alongside the
// transcript. Without them the debrief can only guess at delivery, and a guessing
// assessor invents "you sounded nervous" from word choice.
//
// This lives in its own module (not inside realtime.js) precisely so it CAN be
// unit-tested — realtime.js needs RTCPeerConnection and getUserMedia, which jsdom
// does not have.
//
// PRIVACY: numbers only. No audio, no text, nothing new about the person.

// Words in a chunk of transcript. Deliberately crude — this feeds a "did they
// say enough to carry evidence" signal, not a linguistic analysis.
const countWords = (text) =>
  String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

/**
 * Create a telemetry collector for ONE realtime session (i.e. one panel segment).
 * Feed it every server event; read `snapshot()` when the segment ends.
 *
 * `now` is injectable so tests can drive a clock instead of sleeping.
 */
export function createInterviewTelemetry({ now = () => Date.now() } = {}) {
  const answers = [];
  // When the interviewer stopped talking — the moment the floor passed to the
  // candidate. timeToFirstWord is measured from here.
  let floorOpenedAt = null;
  // The answer currently being spoken, if any.
  let open = null;
  // When the candidate last stopped making sound, used to size within-answer pauses.
  let lastSpeechStoppedAt = null;

  const closeOpenAnswer = () => {
    if (!open) return;
    const endedAt = open.lastStopAt || open.startedAt;
    answers.push({
      timeToFirstWordMs: open.timeToFirstWordMs,
      answerDurationMs: Math.max(0, endedAt - open.startedAt),
      longestPauseMs: open.longestPauseMs,
      wordCount: open.wordCount,
    });
    open = null;
    lastSpeechStoppedAt = null;
  };

  return {
    /**
     * @param {object} msg a raw OpenAI realtime server event
     * @param {'speaking'|'listening'|null} uiState the coarse state realtime.js
     *   already derives from this event — reused so the two never disagree about
     *   when the interviewer is talking.
     */
    onEvent(msg, uiState) {
      const t = msg && msg.type;
      const at = now();

      // ORDER MATTERS: realtime.js maps `input_audio_buffer.speech_started` to the
      // 'listening' UI state, so the raw event type must be handled BEFORE uiState
      // or the candidate starting to speak would be read as the interviewer
      // yielding the floor.
      if (t === 'input_audio_buffer.speech_started') {
        if (!open) {
          open = {
            startedAt: at,
            // Null rather than 0 when we never saw the interviewer yield — an
            // unmeasured value must not read as an instant answer.
            timeToFirstWordMs: floorOpenedAt == null ? null : Math.max(0, at - floorOpenedAt),
            longestPauseMs: 0,
            wordCount: 0,
            lastStopAt: null,
          };
        } else if (lastSpeechStoppedAt != null) {
          // Resuming after a pause INSIDE the same answer.
          open.longestPauseMs = Math.max(open.longestPauseMs, at - lastSpeechStoppedAt);
        }
        lastSpeechStoppedAt = null;
        return;
      }

      if (t === 'input_audio_buffer.speech_stopped') {
        if (open) open.lastStopAt = at;
        lastSpeechStoppedAt = at;
        return;
      }

      // Transcription of the candidate's speech. It finalises asynchronously, so
      // it can land after the answer has already been closed by the interviewer
      // speaking — in that case it belongs to the answer that just ended.
      if (t === 'conversation.item.input_audio_transcription.completed') {
        const words = countWords(msg.transcript);
        if (!words) return;
        if (open) open.wordCount += words;
        else if (answers.length) answers[answers.length - 1].wordCount += words;
        return;
      }

      // The interviewer has started talking: whatever the candidate was saying is
      // finished. (Also covers the interviewer cutting in.)
      if (uiState === 'speaking') {
        closeOpenAnswer();
        floorOpenedAt = null;
        return;
      }
      // The interviewer stopped talking — the floor is now the candidate's, and
      // the hesitation clock starts.
      if (uiState === 'listening' && !open) floorOpenedAt = at;
    },

    /** Per-answer records for this segment. Safe to call mid-session. */
    snapshot() {
      const out = answers.slice();
      if (open) {
        const endedAt = open.lastStopAt || open.startedAt;
        out.push({
          timeToFirstWordMs: open.timeToFirstWordMs,
          answerDurationMs: Math.max(0, endedAt - open.startedAt),
          longestPauseMs: open.longestPauseMs,
          wordCount: open.wordCount,
        });
      }
      return out;
    },
  };
}

export default createInterviewTelemetry;
