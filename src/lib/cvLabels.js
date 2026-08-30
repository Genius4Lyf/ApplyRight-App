/**
 * CV section labels, per DOCUMENT language.
 *
 * ── THE INVARIANT ────────────────────────────────────────────────────────────
 * The markdown a CV is stored as ALWAYS uses the canonical ENGLISH headings that
 * markdownUtils.generateMarkdownFromDraft emits (`## Work History`, `## Skills`,
 * …). That English text is the machine-readable layer: markdownParser reads CVs
 * back by matching it, so translating the markdown would break parsing, section
 * assignment and round-tripping for every existing CV.
 *
 * Translation therefore happens at the RENDER layer only — the on-screen/PDF
 * template renderer and the DOCX builder map the canonical English name to a
 * display label right before it is drawn. The PDF is a serialization of the
 * rendered DOM, so it inherits this for free.
 *
 * (The backend keeps a mirror of this table in services/docx.service.js. Keep
 * the two in sync when adding a language or a section.)
 */

// Canonical English name → per-language display label.
// Keys are lowercased at lookup time, so "WORK HISTORY" and "Work history"
// both resolve.
export const CV_LABELS = {
  // Section headings emitted by markdownUtils.
  'professional summary': { en: 'Professional Summary', fr: 'Résumé professionnel' },
  'work history': { en: 'Work History', fr: 'Expérience professionnelle' },
  skills: { en: 'Skills', fr: 'Compétences' },
  education: { en: 'Education', fr: 'Formation' },
  certifications: { en: 'Certifications', fr: 'Certifications' },
  languages: { en: 'Languages', fr: 'Langues' },

  // Language proficiency, as stored on DraftCV.languages[].level. Canonical English in,
  // document language out — the same contract every other label here has.
  native: { en: 'Native', fr: 'Langue maternelle' },
  fluent: { en: 'Fluent', fr: 'Courant' },
  'professional working': { en: 'Professional working', fr: 'Professionnel' },
  conversational: { en: 'Conversational', fr: 'Conversationnel' },
  basic: { en: 'Basic', fr: 'Notions' },
  projects: { en: 'Projects', fr: 'Projets' },

  // Skill-category fallbacks markdownUtils uses inside the Skills section.
  // (AI-generated categories are free-form and simply pass through.)
  'additional skills': { en: 'Additional Skills', fr: 'Compétences supplémentaires' },
  'technical skills': { en: 'Technical Skills', fr: 'Compétences techniques' },
  'soft skills': { en: 'Soft Skills', fr: 'Compétences comportementales' },
  'professional skills': { en: 'Professional Skills', fr: 'Compétences professionnelles' },

  // Placeholders markdownUtils emits for an incomplete education entry.
  degree: { en: 'Degree', fr: 'Diplôme' },
  school: { en: 'School', fr: 'École' },

  // Compact panel labels used by the Aria Studio live preview, which builds its
  // sections structurally from cvData (not from the markdown headings). It uses
  // SHORT forms — "Summary"/"Experience"/"Contact" rather than the document's
  // "Professional Summary"/"Work History" — so their French forms are short too.
  // Distinct keys from the canonical heading keys above; both are kept in sync
  // with the backend's docx.service.js table per the invariant note above.
  contact: { en: 'Contact', fr: 'Contact' },
  summary: { en: 'Summary', fr: 'Résumé' },
  experience: { en: 'Experience', fr: 'Expérience' },
};

/**
 * Map a canonical English CV label to its display form.
 *
 * Unmapped input returns the ORIGINAL string, so a custom section, an
 * AI-invented skill category, or a heading added later degrades to English
 * instead of rendering blank.
 *
 * @param {string} name  canonical English name, as it appears in the markdown
 * @param {'en'|'fr'} [lang]
 * @returns {string}
 */
export function cvLabel(name, lang = 'en') {
  if (typeof name !== 'string' || !name.trim()) return name;
  const entry = CV_LABELS[name.trim().toLowerCase()];
  if (!entry) return name;
  return entry[lang] || entry.en || name;
}

/**
 * Translate the DISPLAY labels inside a CV markdown string, leaving every other
 * line — and all user content — byte-identical.
 *
 * This is the single render-layer chokepoint: hand a template the localized
 * markdown and all 29 templates (and therefore the PDF) show translated section
 * headings without any of them needing to know about languages. What is stored,
 * saved and re-parsed is always the untouched English-headed markdown.
 *
 * Rewrites exactly three things:
 *   `## Section`            → `## Label`
 *   `### Degree`            → `### Diplôme`   (placeholder only; real titles pass through)
 *   `- **Category:** a, b`  → `- **Catégorie :** a, b`  (label only, never the skills)
 *   `- **French** — Native`  → `- **French** — Langue maternelle`  (the LEVEL only)
 *
 * English is a no-op and returns the input unchanged (same reference), so the
 * default path costs nothing.
 *
 * @param {string} markdown
 * @param {'en'|'fr'} [lang]
 * @returns {string}
 */
export function localizeCvMarkdown(markdown, lang = 'en') {
  if (lang === 'en' || !lang || typeof markdown !== 'string' || !markdown) return markdown;

  return markdown
    .split('\n')
    .map((line) => {
      // `## Section heading`
      const h2 = line.match(/^(\s*##\s+)(.+?)(\s*)$/);
      if (h2) return `${h2[1]}${cvLabel(h2[2], lang)}${h2[3]}`;

      // `### Degree` — only the literal placeholder maps; user titles fall through.
      const h3 = line.match(/^(\s*###\s+)(.+?)(\s*)$/);
      if (h3) return `${h3[1]}${cvLabel(h3[2], lang)}${h3[3]}`;

      // `- **Skill Category:** a, b, c`
      const cat = line.match(/^(\s*[-*]\s+)\*\*([^*:]+):\*\*(.*)$/);
      if (cat) return `${cat[1]}**${cvLabel(cat[2], lang)}:**${cat[3]}`;

      // `- **French** — Professional working` → translate the LEVEL, never the language.
      //
      // Certifications share this exact line shape ("- **H2S Awareness** — OPITO, 2023"),
      // which is why the meta goes through cvLabel rather than being translated outright:
      // an unmapped string comes back byte-identical, so an issuer and a date pass through
      // untouched while a known proficiency is rewritten.
      const meta = line.match(/^(\s*[-*]\s+\*\*[^*]+\*\*\s+—\s+)(.+?)(\s*)$/);
      if (meta) return `${meta[1]}${cvLabel(meta[2], lang)}${meta[3]}`;

      return line;
    })
    .join('\n');
}

export default { cvLabel, localizeCvMarkdown, CV_LABELS };
