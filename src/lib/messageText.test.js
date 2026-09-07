import { describe, it, expect } from 'vitest';
import { toPlainText } from './messageText';

// What lands on a user's clipboard when they copy one of Aria's replies.
describe('toPlainText', () => {
  it('strips emphasis but keeps the words', () => {
    expect(toPlainText('You should **quantify** this and *name the tool*.')).toBe(
      'You should quantify this and name the tool.'
    );
  });

  it('keeps a copied set of bullets recognisable as bullets', () => {
    const md = 'Two things:\n\n- Ran the logging tool\n- Wrote the client report';
    expect(toPlainText(md)).toBe(
      'Two things:\n\n- Ran the logging tool\n- Wrote the client report'
    );
  });

  it('never eats the "___" blank in an answer starter', () => {
    // The italic rule is the danger here: a naive /_(.+)_/ turns "I cut ___ by ___" into
    // something the user cannot fill in, on the one kind of line they most want to copy.
    expect(toPlainText('I identified ___ that led to ___')).toBe(
      'I identified ___ that led to ___'
    );
  });

  it('keeps a real italic pair while leaving the blank alone', () => {
    expect(toPlainText('Say _what_ you did in ___ terms')).toBe('Say what you did in ___ terms');
  });

  it('unwraps links to label + url, so the address survives a paste', () => {
    expect(toPlainText('See [the guide](https://x.test/g) for more.')).toBe(
      'See the guide (https://x.test/g) for more.'
    );
  });

  it('drops line-start block markers only', () => {
    expect(toPlainText('## Heading\n> quoted line\ncall #2 stays')).toBe(
      'Heading\nquoted line\ncall #2 stays'
    );
  });

  it('unwraps inline code', () => {
    expect(toPlainText('Use the `Ask Aria` button.')).toBe('Use the Ask Aria button.');
  });

  it('collapses runaway blank lines and trims', () => {
    expect(toPlainText('\n\nfirst\n\n\n\nsecond\n\n')).toBe('first\n\nsecond');
  });

  it('returns an empty string for nothing at all', () => {
    expect(toPlainText('')).toBe('');
    expect(toPlainText(null)).toBe('');
    expect(toPlainText(undefined)).toBe('');
  });
});
