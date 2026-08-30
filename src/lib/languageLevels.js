/**
 * How well someone speaks a language, as a CV says it.
 *
 * The ILR-derived wording LinkedIn uses, not CEFR: "Professional working" is read
 * correctly by any recruiter, while "B2" means nothing to one who doesn't know the scale —
 * and CEFR is uncommon on CVs outside Europe.
 *
 * The stored value is the CANONICAL ENGLISH string, exactly like a skill's 'Uncategorized'
 * category and every markdown section heading. Display is localized at the render layer:
 * the dropdown shows the INTERFACE language, and the CV shows the DOCUMENT language via
 * cvLabels.localizeCvMarkdown. Storing what the user saw would leave a French-authored CV
 * carrying a level no English render could translate back.
 *
 * Ordered strongest → weakest, which is the order a CV lists them in.
 */
export const LANGUAGE_LEVELS = [
  'Native',
  'Fluent',
  'Professional working',
  'Conversational',
  'Basic',
];

/**
 * The i18n key for a level's display label.
 *
 * Derived rather than mapped, so adding a level to LANGUAGE_LEVELS above cannot leave a
 * second list to update — the only follow-up is the locale entry itself.
 */
export const levelI18nKey = (level) =>
  `ariaStudio.livePreview.levels.${String(level || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')}`;

/**
 * A level's display label, in the interface language.
 *
 * Falls back to the raw stored string for anything not in the list — an imported CV or an
 * older draft can carry free text, and showing it verbatim is better than showing a
 * missing-key placeholder or nothing at all.
 */
export const levelLabel = (level, t) => {
  const raw = String(level || '').trim();
  if (!raw) return '';
  return t(levelI18nKey(raw), { defaultValue: raw });
};
