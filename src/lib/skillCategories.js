/**
 * Skill categories — one convention, shared by every surface that shows them.
 *
 * 'Uncategorized' is the STORED value: it is what the CV builder writes when a skill
 * arrives without a category, what the generated-skills picker falls back to, and what
 * the Live Preview writes for a blank category field. Only its DISPLAY is localized,
 * at the render layer — exactly the rule cvLabels.js follows for section headings.
 * Translating the stored value would leave a French-authored CV with a category no
 * English render could group by.
 */
export const UNCATEGORIZED = 'Uncategorized';

/**
 * The display label for a stored category. Free-form categories — AI-generated, or typed
 * by the user — pass straight through; there is nothing to translate them to.
 *
 * @param {string} category the STORED category
 * @param {(key: string) => string} t the i18n translator
 * @returns {string}
 */
export const skillCategoryLabel = (category, t) =>
  category === UNCATEGORIZED ? t('cvBuilder.skillsCard.uncategorized') : category;
