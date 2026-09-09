// THE DESIGN CHECK — and, as much, the things it refuses to flag.
//
// A checker that lists six worries, three of them folklore, teaches people to ignore all
// six. So half of these tests assert SILENCE: that changing a typeface or a page colour
// produces no warning, because neither has ever stopped a parser reading a CV.
import { describe, it, expect } from 'vitest';
import { designAtsVerdict } from './cvDesignAts';
import { TEMPLATES, sidebarFill } from '../data/templates';

const ids = (v) => v.notes.map((n) => n.id);
const singleColumnNoPhoto = TEMPLATES.find((t) => !t.sidebar && !t.rendersPhoto).id;
const twoColumn = TEMPLATES.find((t) => t.sidebar).id;
const photoTemplate = TEMPLATES.find((t) => t.rendersPhoto).id;

describe('what it flags', () => {
  it('flags a two-column layout — the one real parse failure', () => {
    // Not garbled words: garbled ORDER. The output still looks like a CV, which is why
    // it goes unnoticed.
    const v = designAtsVerdict(twoColumn, {}, {});
    expect(ids(v)).toContain('columns');
    expect(v.level).toBe('caution');
  });

  it('flags a photo only when the template prints one AND the CV has one', () => {
    // Both halves, or it is a warning about something not on the page.
    expect(ids(designAtsVerdict(photoTemplate, {}, { photoUrl: 'x.png' }))).toContain('photo');
    expect(ids(designAtsVerdict(photoTemplate, {}, {}))).not.toContain('photo');
    expect(ids(designAtsVerdict(singleColumnNoPhoto, {}, { photoUrl: 'x.png' }))).not.toContain(
      'photo'
    );
  });

  it('treats the photo as a trade-off, not a fault', () => {
    // A photo is expected in Nigeria, Germany and France. A check that told a Lagos user
    // their own market's convention was an error would be the check being wrong.
    const note = designAtsVerdict(photoTemplate, {}, { photoUrl: 'x.png' }).notes.find(
      (n) => n.id === 'photo'
    );
    expect(note.detail).toMatch(/Nigeria/);
    // No one-tap "fix": there is nothing to correct, only something to know.
    expect(note.fix).toBeUndefined();
  });

  it('flags compact AND narrow together, but neither one alone', () => {
    // Both are offered for good reasons. Together they are the signature of a CV being
    // squeezed to fit rather than designed.
    const base = singleColumnNoPhoto;
    expect(ids(designAtsVerdict(base, { density: 'compact' }, {}))).not.toContain('squeezed');
    expect(ids(designAtsVerdict(base, { margins: 'narrow' }, {}))).not.toContain('squeezed');
    expect(ids(designAtsVerdict(base, { density: 'compact', margins: 'narrow' }, {}))).toContain(
      'squeezed'
    );
  });
});

describe('what it refuses to flag', () => {
  const clean = (design, profile) => designAtsVerdict(singleColumnNoPhoto, design, profile);

  it('says nothing about the typeface', () => {
    // "Serif is unparseable" is folklore. A parser reads the text layer, not the shapes,
    // and every face offered here is embedded in the PDF or a system font.
    expect(clean({ font: 'Georgia, serif' }, {}).level).toBe('clear');
    expect(clean({ font: 'Merriweather, serif' }, {}).notes).toEqual([]);
  });

  it('says nothing about narrow margins on their own', () => {
    // 1.5rem ≈ 6.4mm — inside any printer's imageable area, and irrelevant to a text
    // extractor.
    expect(clean({ margins: 'narrow' }, {}).level).toBe('clear');
  });

  it('says nothing about the page colour', () => {
    expect(clean({ ground: '#fcfbf7' }, {}).level).toBe('clear');
  });

  it('says nothing about length — that number belongs to LengthCoach', () => {
    // Two components with an opinion about the same number is how they come to disagree.
    // Asserted on the NOTES, not the whole verdict: "Page colour" is in `checked`, and it
    // is there precisely to say that the page's colour was looked at and found fine.
    const v = clean({}, {});
    expect(JSON.stringify(v.notes)).not.toMatch(/page|length/i);
    // And it stays silent even if a page count is handed to it — it takes a design, and
    // a stray field is not an invitation to have an opinion about the document's length.
    expect(clean({ pageCount: 4 }, {}).notes).toEqual([]);
  });

  it('is clear on a plain single-column CV with no photo', () => {
    const v = clean({ margins: 'normal', density: 'normal' }, {});
    expect(v.level).toBe('clear');
    expect(v.notes).toEqual([]);
  });
});

describe('the verdict names what it looked at', () => {
  it('lists its checks even when everything passes', () => {
    // "You're clear" with nothing behind it reads as shallow. Saying what was examined is
    // what makes the absence of warnings mean something.
    expect(designAtsVerdict(singleColumnNoPhoto, {}, {}).checked).toContain('Typeface');
    expect(designAtsVerdict(singleColumnNoPhoto, {}, {}).checked).toContain('Layout');
  });
});

describe('the data it rests on', () => {
  it('agrees with sidebarFill about which templates are two-column', () => {
    // The check reads `sidebar` through sidebarFill rather than keeping its own list, so
    // adding a sidebar template cannot leave the checker behind.
    TEMPLATES.forEach((t) => {
      const flagged = ids(designAtsVerdict(t.id, {}, {})).includes('columns');
      expect(flagged).toBe(Boolean(sidebarFill(t.id)));
    });
  });

  it('marks a photo template as one, in the registry rather than in code here', () => {
    const withPhoto = TEMPLATES.filter((t) => t.rendersPhoto);
    expect(withPhoto.length).toBeGreaterThan(0);
    withPhoto.forEach((t) => {
      expect(ids(designAtsVerdict(t.id, {}, { photoUrl: 'x.png' }))).toContain('photo');
    });
  });

  it('says nothing at all about a template id it has never heard of', () => {
    // templateId comes from persisted state and could be a template that has since been
    // retired. Guessing would be worse than staying quiet.
    const v = designAtsVerdict('a-template-that-was-deleted', {}, { photoUrl: 'x.png' });
    expect(v.notes).toEqual([]);
    expect(v.level).toBe('clear');
  });
});
