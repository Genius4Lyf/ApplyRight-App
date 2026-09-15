// PLACEHOLDER ROWS MUST NEVER REACH THE DOCUMENT.
//
// A user tapped "Add manually" a few times in Aria Studio and ended up with four blocks
// in their rendered CV reading literally:
//
//     Role
//     Company | -
//
// "Add manually" persists a real, blank entry so there is a row to write into. Aria
// Studio's own preview filters those out at read time, so they were invisible in the one
// place that can delete them — while this function turned each one into a heading via its
// `|| 'Role'` / `|| 'Company'` fallbacks. They then rode into the preview, the PDF and the
// Word file, because all three are downstream of this single markdown funnel.
import { describe, it, expect } from 'vitest';
import { generateMarkdownFromDraft } from './markdownUtils';

const REAL_ROLE = {
  title: 'Field Operator',
  company: 'Schlumberger',
  startDate: 'July 2023',
  isCurrent: true,
  description: 'Carried out routine preventive maintenance on equipment.',
};

// Exactly what appendEntry writes when someone taps "Add manually".
const blank = () => ({
  _sortId: Math.random().toString(36).slice(2),
  title: '',
  company: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
});

const md = (draft) => generateMarkdownFromDraft({ personalInfo: {}, ...draft }).optimizedCV;

describe('work history', () => {
  it('drops the four blanks and keeps the one real role', () => {
    const out = md({ experience: [REAL_ROLE, blank(), blank(), blank(), blank()] });
    expect(out).toContain('### Field Operator');
    expect(out).not.toContain('### Role');
    expect(out).not.toContain('#### Company');
    // One role in, one role heading out.
    expect(out.match(/^### /gm)).toHaveLength(1);
  });

  it('drops the heading too when every role is blank', () => {
    // Otherwise the CV shows a WORK HISTORY band with nothing under it, which reads as a
    // rendering failure rather than as an empty section.
    const out = md({ experience: [blank(), blank()] });
    expect(out).not.toContain('## Work History');
  });

  it('keeps a role that has a title but no company yet', () => {
    // Half-filled is not empty. This is someone mid-edit, and losing their heading while
    // they type would be worse than the placeholder.
    const out = md({ experience: [{ ...blank(), title: 'Warehouse Assistant' }] });
    expect(out).toContain('### Warehouse Assistant');
  });

  it('keeps a role that only has bullets', () => {
    const out = md({ experience: [{ ...blank(), description: 'Ran the weekly stock count.' }] });
    expect(out).toContain('Ran the weekly stock count.');
  });
});

describe('the same gap in education and projects', () => {
  it('drops a blank degree instead of writing "### Degree"', () => {
    const out = md({
      education: [{ degree: 'BSc Chemistry', school: 'University of Benin' }, {}, {}],
    });
    expect(out).toContain('### BSc Chemistry');
    expect(out).not.toContain('### Degree');
    expect(out).not.toContain('#### School');
  });

  it('drops a blank project instead of writing "### undefined"', () => {
    // projects had no fallback at all, so a blank row rendered the word `undefined`.
    const out = md({ projects: [{ title: 'Campus food app' }, {}] });
    expect(out).toContain('### Campus food app');
    expect(out).not.toContain('undefined');
  });
});

describe('a draft with nothing in it', () => {
  it('produces no sections rather than a skeleton of placeholders', () => {
    const out = md({ experience: [blank()], education: [{}], projects: [{}] });
    expect(out.trim()).toBe('');
  });
});
