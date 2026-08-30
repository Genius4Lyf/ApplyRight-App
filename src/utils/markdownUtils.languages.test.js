import { describe, it, expect } from 'vitest';
import { generateMarkdownFromDraft } from './markdownUtils';
import { CV_LABELS } from '../lib/cvLabels';

// Languages had no markdown at all before this. Three of the ~19 templates scraped a
// "- **Languages:** …" line out of the SKILLS section in case the AI happened to write one
// there; the other sixteen ignored it. A real `## Languages` section is what makes them
// render everywhere — every template passes body markdown through ReactMarkdown.
const md = (draft) => generateMarkdownFromDraft(draft).optimizedCV;

describe('the Languages section', () => {
  it('renders a heading and one line per language', () => {
    const out = md({
      languages: [
        { name: 'English', level: 'Native' },
        { name: 'French', level: 'Professional' },
      ],
    });

    expect(out).toContain('## Languages');
    expect(out).toContain('- **English** — Native');
    expect(out).toContain('- **French** — Professional');
  });

  it('renders a bare name when there is no level', () => {
    // Optional means optional: "Yoruba" on its own is a real entry.
    expect(md({ languages: [{ name: 'Yoruba' }] })).toContain('- **Yoruba**\n');
  });

  it('says nothing when there are no languages', () => {
    // An empty heading on a CV is worse than a missing section.
    expect(md({ languages: [] })).not.toContain('## Languages');
    expect(md({})).not.toContain('## Languages');
  });

  it('drops a nameless row rather than emitting an empty bullet', () => {
    expect(md({ languages: [{ name: '   ', level: 'Native' }] })).not.toContain('## Languages');
  });

  it('uses the same line shape as certifications', () => {
    // Deliberate: "- **Name** — meta" is already proven to render cleanly across every
    // markdown template, so languages inherits that rather than inventing a shape.
    const out = md({
      certifications: [{ name: 'H2S Awareness', issuer: 'OPITO', date: '2023' }],
      languages: [{ name: 'French', level: 'Professional' }],
    });

    expect(out).toContain('- **H2S Awareness** — OPITO, 2023');
    expect(out).toContain('- **French** — Professional');
  });

  it('is NOT the skills-category shape, which translation rewrites', () => {
    // "- **Label:** value" is the pattern cvLabels rewrites when translating a CV. A
    // language name is not a label to translate, so it must not look like one.
    expect(md({ languages: [{ name: 'French', level: 'Native' }] })).not.toContain('- **French:**');
  });

  it('has a localized heading, like every other section', () => {
    // The templates match headings through CV_LABELS, so a French CV renders "Langues"
    // without any template knowing about languages specifically.
    expect(CV_LABELS.languages).toEqual({ en: 'Languages', fr: 'Langues' });
  });
});
