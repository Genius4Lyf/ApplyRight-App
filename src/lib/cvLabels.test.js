import { describe, it, expect } from 'vitest';
import { cvLabel, localizeCvMarkdown } from './cvLabels';
import { generateMarkdownFromDraft } from '../utils/markdownUtils';
import { parseResumeMarkdown } from '../utils/markdownParser';
import { extractSummary, replaceSummaryInMarkdown } from './summaryMarkdown';

const DRAFT = {
  personalInfo: { fullName: 'Amara Okafor' },
  professionalSummary: 'Ingénieure logicielle expérimentée en systèmes distribués.',
  experience: [
    {
      title: 'Ingénieure logicielle',
      company: 'Société Générale',
      startDate: '2021',
      isCurrent: true,
      description: 'Déployé une architecture à microservices, réduisant la latence de 40 %.',
    },
  ],
  education: [{ degree: '', school: '', graduationDate: '2020' }],
  certifications: [{ name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023' }],
  skills: [
    { name: 'JavaScript', category: 'Technical Skills' },
    { name: 'Python', category: 'Technical Skills' },
    { name: 'Leadership', category: 'Soft Skills' },
    { name: 'Spark', category: 'Ingénierie de données' },
  ],
  projects: [{ title: 'Système de recommandation', description: 'Filtrage collaboratif.' }],
};

describe('cvLabel', () => {
  it('translates the canonical section names', () => {
    expect(cvLabel('Work History', 'fr')).toBe('Expérience professionnelle');
    expect(cvLabel('Professional Summary', 'fr')).toBe('Résumé professionnel');
    expect(cvLabel('Skills', 'fr')).toBe('Compétences');
    expect(cvLabel('Education', 'fr')).toBe('Formation');
    expect(cvLabel('Certifications', 'fr')).toBe('Certifications');
    expect(cvLabel('Projects', 'fr')).toBe('Projets');
  });

  it('is case-insensitive on the canonical key', () => {
    expect(cvLabel('WORK HISTORY', 'fr')).toBe('Expérience professionnelle');
    expect(cvLabel('work history', 'fr')).toBe('Expérience professionnelle');
  });

  it('falls back to the English input when unmapped (never blank)', () => {
    expect(cvLabel('Volunteering', 'fr')).toBe('Volunteering');
    expect(cvLabel('Ingénierie de données', 'fr')).toBe('Ingénierie de données');
    expect(cvLabel('', 'fr')).toBe('');
    expect(cvLabel(undefined, 'fr')).toBe(undefined);
  });

  it('English returns the canonical name unchanged', () => {
    expect(cvLabel('Work History', 'en')).toBe('Work History');
  });

  // The Aria Studio live preview builds sections structurally and labels them with
  // SHORT forms, distinct from the document's canonical heading names.
  it('maps the studio-preview short labels to short French forms', () => {
    expect(cvLabel('Summary', 'fr')).toBe('Résumé');
    expect(cvLabel('Experience', 'fr')).toBe('Expérience');
    expect(cvLabel('Contact', 'fr')).toBe('Contact');
    expect(cvLabel('Projects', 'fr')).toBe('Projets');
    expect(cvLabel('Skills', 'fr')).toBe('Compétences');
    expect(cvLabel('Education', 'fr')).toBe('Formation');
  });

  it('the short forms stay distinct from the document heading forms', () => {
    // 'Summary' (panel) vs 'Professional Summary' (document heading) differ on purpose.
    expect(cvLabel('Summary', 'fr')).not.toBe(cvLabel('Professional Summary', 'fr'));
    expect(cvLabel('Experience', 'fr')).not.toBe(cvLabel('Work History', 'fr'));
  });

  it('English returns the short panel labels unchanged', () => {
    for (const n of ['Contact', 'Summary', 'Experience', 'Projects', 'Skills', 'Education']) {
      expect(cvLabel(n, 'en')).toBe(n);
    }
  });
});

describe('localizeCvMarkdown', () => {
  const { optimizedCV } = generateMarkdownFromDraft(DRAFT);

  it('leaves the stored markdown English (the machine-readable layer)', () => {
    expect(optimizedCV).toContain('## Work History');
    expect(optimizedCV).toContain('## Skills');
    expect(optimizedCV).toContain('## Education');
  });

  it('is a strict no-op for English', () => {
    expect(localizeCvMarkdown(optimizedCV, 'en')).toBe(optimizedCV);
  });

  it('translates the headings for French', () => {
    const fr = localizeCvMarkdown(optimizedCV, 'fr');
    expect(fr).toContain('## Expérience professionnelle');
    expect(fr).toContain('## Résumé professionnel');
    expect(fr).toContain('## Compétences');
    expect(fr).toContain('## Formation');
    expect(fr).toContain('## Projets');
    expect(fr).not.toContain('## Work History');
  });

  it('translates skill-category labels but never the skill names', () => {
    const fr = localizeCvMarkdown(optimizedCV, 'fr');
    expect(fr).toContain('**Compétences techniques:** JavaScript, Python');
    expect(fr).toContain('**Compétences comportementales:** Leadership');
    // An AI-invented category passes straight through.
    expect(fr).toContain('**Ingénierie de données:** Spark');
  });

  it('translates the Degree/School placeholders', () => {
    expect(optimizedCV).toContain('### Degree');
    expect(localizeCvMarkdown(optimizedCV, 'fr')).toContain('### Diplôme');
  });

  it('never touches user content', () => {
    const fr = localizeCvMarkdown(optimizedCV, 'fr');
    for (const s of [
      'Ingénieure logicielle',
      'Société Générale',
      'réduisant la latence de 40 %',
      'Système de recommandation',
      'AWS Solutions Architect',
    ]) {
      expect(fr).toContain(s);
    }
  });

  it('does not translate a real job title that is not a placeholder', () => {
    const fr = localizeCvMarkdown('### Skills Trainer\n', 'fr');
    // "Skills Trainer" is not a canonical key, so it survives verbatim.
    expect(fr).toBe('### Skills Trainer\n');
  });
});

describe('the round-trip invariant', () => {
  const { optimizedCV } = generateMarkdownFromDraft(DRAFT);

  // markdownParser is written for markdown opening with a `# Name` H1 (an uploaded
  // resume); generateMarkdownFromDraft omits the H1 because templates render the
  // header from the profile. NOTE: markdownParser currently has no callers in the
  // app — summaryMarkdown (below) is the live English-heading matcher. These two
  // cases pin the parser's ACTUAL behaviour so the invariant stays demonstrable if
  // it is ever wired back up.
  const UPLOADED = `# Amara Okafor\n\n${optimizedCV}`;

  it('recognises the STORED (English) markdown', () => {
    const parsed = parseResumeMarkdown(UPLOADED);
    expect(parsed.summary).toContain('Ingénieure logicielle expérimentée');
    expect(parsed.skills.length).toBeGreaterThan(0);
  });

  it('is why localization must NOT be persisted: French markdown stops matching', () => {
    // The failure mode the invariant exists to prevent. Everything the parser
    // recognised in English it no longer recognises once the headings are localized.
    const parsed = parseResumeMarkdown(localizeCvMarkdown(UPLOADED, 'fr'));
    expect(parsed.summary).toBe('');
    expect(parsed.skills.length).toBe(0);
  });

  // summaryMarkdown IS on the live edit path (ResumeReview.applySummary), and it
  // finds the section by matching the English word "summary". This is the concrete
  // bug that persisting a localized CV would cause.
  it('keeps summary editing working — and shows it would break if localized', () => {
    expect(extractSummary(optimizedCV)).toContain('Ingénieure logicielle expérimentée');
    const edited = replaceSummaryInMarkdown(optimizedCV, 'Nouveau résumé.');
    expect(extractSummary(edited)).toBe('Nouveau résumé.');

    // Against localized markdown the heading no longer contains "summary", so the
    // edit silently no-ops — which is why only the RENDER layer is translated.
    const fr = localizeCvMarkdown(optimizedCV, 'fr');
    expect(extractSummary(fr)).toBe('');
    expect(replaceSummaryInMarkdown(fr, 'Nouveau résumé.')).toBe(fr);
  });
});
