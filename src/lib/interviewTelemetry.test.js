import { describe, it, expect } from 'vitest';
import { createInterviewTelemetry } from './interviewTelemetry';

// Drive a fake clock so the test measures logic, not wall time.
const scripted = () => {
  let t = 0;
  const tel = createInterviewTelemetry({ now: () => t });
  return {
    tel,
    at: (ms) => {
      t = ms;
      return tel;
    },
  };
};

// realtime.js maps these events to coarse UI states; mirror that mapping here.
const INTERVIEWER_DONE = ['output_audio_buffer.stopped', 'listening'];
const INTERVIEWER_TALKING = ['output_audio_buffer.started', 'speaking'];
// NOTE: realtime.js maps speech_started to the 'listening' UI state too — the
// collector must key off the raw type, so pass it exactly as realtime.js does.
const SPEECH_START = ['input_audio_buffer.speech_started', 'listening'];
const SPEECH_STOP = ['input_audio_buffer.speech_stopped', null];

const send = (tel, [type, state], extra = {}) => tel.onEvent({ type, ...extra }, state);

describe('interview telemetry', () => {
  it('measures hesitation from the interviewer finishing to the candidate starting', () => {
    const { tel, at } = scripted();
    send(at(1000), INTERVIEWER_DONE);
    send(at(6000), SPEECH_START); // sat silent for 5s
    send(at(26000), SPEECH_STOP);
    send(at(27000), INTERVIEWER_TALKING); // closes the answer

    const [a] = tel.snapshot();
    expect(a.timeToFirstWordMs).toBe(5000);
    expect(a.answerDurationMs).toBe(20000);
  });

  it('measures the longest silence WITHIN an answer, not between answers', () => {
    const { tel, at } = scripted();
    send(at(0), INTERVIEWER_DONE);
    send(at(1000), SPEECH_START);
    send(at(3000), SPEECH_STOP);
    send(at(10000), SPEECH_START); // 7s frozen mid-answer
    send(at(12000), SPEECH_STOP);
    send(at(13000), SPEECH_START); // 1s pause
    send(at(15000), SPEECH_STOP);
    send(at(16000), INTERVIEWER_TALKING);

    const [a] = tel.snapshot();
    expect(a.longestPauseMs).toBe(7000);
    expect(a.answerDurationMs).toBe(14000); // whole span, pauses included
    expect(tel.snapshot()).toHaveLength(1); // ONE answer, not three
  });

  it('does not read the candidate starting to speak as the interviewer yielding', () => {
    // Regression guard: speech_started carries the 'listening' UI state.
    const { tel, at } = scripted();
    send(at(0), INTERVIEWER_DONE);
    send(at(4000), SPEECH_START);
    send(at(9000), SPEECH_STOP);
    send(at(10000), INTERVIEWER_TALKING);
    expect(tel.snapshot()[0].timeToFirstWordMs).toBe(4000); // not 0
  });

  it('counts words from transcription, including when it lands after the answer closed', () => {
    const { tel, at } = scripted();
    send(at(0), INTERVIEWER_DONE);
    send(at(1000), SPEECH_START);
    send(at(5000), SPEECH_STOP);
    send(at(6000), INTERVIEWER_TALKING); // answer closes first
    send(at(6500), ['conversation.item.input_audio_transcription.completed', null], {
      transcript: 'one two three four five',
    });
    expect(tel.snapshot()[0].wordCount).toBe(5);
  });

  it('records several answers across a conversation', () => {
    const { tel, at } = scripted();
    send(at(0), INTERVIEWER_DONE);
    send(at(1000), SPEECH_START);
    send(at(20000), SPEECH_STOP);
    send(at(21000), INTERVIEWER_TALKING);
    send(at(30000), INTERVIEWER_DONE);
    send(at(31000), SPEECH_START);
    send(at(40000), SPEECH_STOP);
    send(at(41000), INTERVIEWER_TALKING);

    const rows = tel.snapshot();
    expect(rows).toHaveLength(2);
    expect(rows[1].answerDurationMs).toBe(9000);
  });

  it('includes an answer still in progress when the session ends mid-sentence', () => {
    const { tel, at } = scripted();
    send(at(0), INTERVIEWER_DONE);
    send(at(2000), SPEECH_START);
    send(at(12000), SPEECH_STOP);
    // No closing interviewer turn — the user hit "End".
    expect(tel.snapshot()).toHaveLength(1);
    expect(tel.snapshot()[0].answerDurationMs).toBe(10000);
  });

  it('leaves hesitation null rather than 0 when the interviewer never yielded first', () => {
    const { tel, at } = scripted();
    send(at(1000), SPEECH_START); // candidate speaks unprompted
    send(at(4000), SPEECH_STOP);
    expect(tel.snapshot()[0].timeToFirstWordMs).toBeNull();
  });

  it('emits numbers only — no text, no audio', () => {
    const { tel, at } = scripted();
    send(at(0), INTERVIEWER_DONE);
    send(at(1000), SPEECH_START);
    send(at(2000), ['conversation.item.input_audio_transcription.completed', null], {
      transcript: 'my name is Daniel Udofia',
    });
    send(at(5000), SPEECH_STOP);
    const [a] = tel.snapshot();
    expect(Object.keys(a).sort()).toEqual([
      'answerDurationMs',
      'longestPauseMs',
      'timeToFirstWordMs',
      'wordCount',
    ]);
    Object.values(a).forEach((v) => expect(v === null || typeof v === 'number').toBe(true));
  });
});
