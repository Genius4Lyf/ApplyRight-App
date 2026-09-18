import { describe, expect, it } from 'vitest';
import { bankFailureReason, callRecapLines, callRecapMessage } from './callRecovery';

const err = (status, code) => ({ response: { status, data: code ? { code } : {} } });

describe('why the wrap-up was refused', () => {
  it('reads the CODE, not the status — 402 means two opposite things', () => {
    // "You have no credits" is fixable by buying some. "That is enough building for today"
    // is not, and offering to sell credits against it would be taking money for nothing.
    expect(bankFailureReason(err(402, 'BUILD_LIMIT_REACHED'))).toBe('limit');
    expect(bankFailureReason(err(402, 'CHAT_LIMIT_REACHED'))).toBe('limit');
    expect(bankFailureReason(err(403, 'INSUFFICIENT_CREDITS'))).toBe('credits');
  });

  it('knows the role was deleted mid-call', () => {
    expect(bankFailureReason(err(404))).toBe('gone');
  });

  it('treats anything else as worth trying again', () => {
    expect(bankFailureReason(err(500))).toBe('network');
    expect(bankFailureReason(err(503))).toBe('network');
    expect(bankFailureReason(new Error('Network Error'))).toBe('network');
    expect(bankFailureReason(undefined)).toBe('network');
  });
});

describe('reading their own words back', () => {
  const turns = [
    { role: 'aria', text: 'Tell me what you did day to day.' },
    { role: 'candidate', text: 'I ran the till and cashed up at the end of every shift.' },
    { role: 'aria', text: 'Anyone you trained?' },
    { role: 'candidate', text: 'Yes.' },
    { role: 'candidate', text: 'I trained two new starters on the till over about a week.' },
  ];

  it('quotes THEM and never her', () => {
    const lines = callRecapLines(turns);
    expect(lines).toEqual([
      'I ran the till and cashed up at the end of every shift.',
      'I trained two new starters on the till over about a week.',
    ]);
    // Her questions are not evidence of anything, and reading them back would claim she
    // heard things nobody said.
    expect(lines.join(' ')).not.toContain('Tell me what');
  });

  it('drops the noise a spoken interview is full of', () => {
    // "Yes", "mhm", "come again?" are turns, but they are not things they told her.
    expect(callRecapLines(turns).join(' ')).not.toMatch(/^Yes\.$/m);
  });

  it('keeps them in the order they were said', () => {
    const lines = callRecapLines([
      { who: 'user', text: 'The second thing I did was open up on Saturdays, every week.' },
      {
        who: 'user',
        text: 'The first thing, which is a much much longer sentence than the other one.',
      },
    ]);
    expect(lines[0]).toMatch(/second thing/);
  });

  it('accepts either turn shape, because the call and the chat name them differently', () => {
    expect(callRecapLines([{ who: 'user', text: 'Typed side uses who/user.' }])).toHaveLength(1);
    expect(
      callRecapLines([{ role: 'candidate', text: 'Call side uses role/candidate.' }])
    ).toHaveLength(1);
  });

  it('never runs long enough to bury the buttons underneath it', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      who: 'user',
      text: `Answer number ${i} — ` + 'and then I did quite a lot more besides. '.repeat(20),
    }));
    const lines = callRecapLines(many);
    expect(lines.length).toBeLessThanOrEqual(5);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(161);
  });

  it('survives junk without throwing', () => {
    expect(callRecapLines(null)).toEqual([]);
    expect(callRecapLines([{ who: 'user' }, null, { text: 'no speaker' }])).toEqual([]);
  });
});

describe('the message Aria says when the wrap-up could not happen', () => {
  const copy = {
    lead: 'No problem — we will keep going here.',
    heard: "Here's what I've got so far:",
    tail: 'Have I got that right?',
    nothing: 'Tell me what you actually did.',
  };

  it('is assembled from their words and translated copy — never from the model', () => {
    const text = callRecapMessage({ ...copy, lines: ['I ran the till.', 'I trained two people.'] });
    expect(text).toContain(copy.lead);
    expect(text).toContain(copy.heard);
    expect(text).toContain('- I ran the till.');
    expect(text).toContain('- I trained two people.');
    expect(text).toContain(copy.tail);
  });

  it('asks the question again when the call had nothing in it', () => {
    const text = callRecapMessage({ ...copy, lines: [] });
    expect(text).toContain(copy.nothing);
    // No empty "here's what I heard" followed by nothing at all.
    expect(text).not.toContain(copy.heard);
  });
});
