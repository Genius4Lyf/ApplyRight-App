/**
 * Decode HTML entities in text that came from a scraped job posting.
 *
 * The scraper decodes these at capture time now, but analyses captured BEFORE that fix
 * are stored with the entities intact — so a job saved last week still reads
 * "Full-Time &amp; Internship" on screen. This is the display-layer half of that fix:
 * cheap, safe on text that has none, and it stops old records looking broken without
 * rewriting anyone's data.
 *
 * Uses a detached <textarea>, whose innerHTML is parsed as text and never executed — the
 * standard way to do this in a browser without shipping an entity table.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const decodeEntities = (value) => {
  const str = String(value ?? '');
  // No ampersand, nothing to decode, and no DOM node to pay for.
  if (!str.includes('&')) return str;
  if (typeof document === 'undefined') return str;
  try {
    const el = document.createElement('textarea');
    el.innerHTML = str;
    return el.value;
  } catch {
    return str;
  }
};

export default decodeEntities;
