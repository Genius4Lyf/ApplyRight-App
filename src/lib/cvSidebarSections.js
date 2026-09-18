import { CV_LABELS } from './cvLabels';

/**
 * ── SECTION EXTRACTION FOR SIDEBAR TEMPLATES ─────────────────────────────────
 *
 * Pulling a `## Section` out of a CV's markdown so a template can render it somewhere
 * other than the main flow — the whole basis of every two-column template.
 *
 * This used to be four verbatim copies of `headingForms` (ApplyRightMono, ApplyRightNavy,
 * ApplyRightBand, SignatureCollection) plus one unexported copy of the pattern helpers.
 * Five copies of a regex that has to agree with cvLabels about what a heading can look
 * like is five chances for one of them to miss a language form.
 */

/**
 * Every language form of one canonical section name, regex-escaped and alternated.
 *
 * Stored markdown is ALWAYS canonical English (see cvLabels' invariant) — French only
 * appears once localizeCvMarkdown has rewritten the headings at the render layer. A
 * template renders whichever it is handed, so the pattern has to accept both.
 */
export const headingForms = (canonicalKey) => {
  const entry = CV_LABELS[canonicalKey];
  const forms = entry ? Array.from(new Set(Object.values(entry).filter(Boolean))) : [canonicalKey];
  return forms.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
};

/**
 * `## <Section>` through to the next `##` (or the end).
 *
 * Group 1 is the heading AS WRITTEN, group 2 the body. The heading is captured because a
 * rail needs to title the block it is given, and the document already knows the right
 * word: a French CV says "Formation", and a hardcoded "Education" above it would be the
 * one English word on the page.
 */
export const sectionPattern = (canonicalKey) =>
  new RegExp(
    `^##\\s+(${headingForms(canonicalKey)})\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|(?![\\s\\S]))`,
    'm'
  );

/** The body of one section, or '' when the CV has no such section. */
export const extractSection = (markdown, key) =>
  markdown.match(sectionPattern(key))?.[2]?.trim() || '';

/** That section's heading exactly as the document writes it, or '' — see sectionPattern. */
export const extractHeading = (markdown, key) =>
  markdown.match(sectionPattern(key))?.[1]?.trim() || '';

/** The markdown with the named sections taken out — what the main column renders. */
export const removeSections = (markdown, keys) =>
  keys.reduce((current, key) => current.replace(sectionPattern(key), ''), markdown).trim();

/**
 * ── WHAT FITS IN THE RAIL ────────────────────────────────────────────────────
 *
 * Sidebar templates carry Skills, Languages, Certifications and Education in the rail —
 * but a rail cannot paginate. `buildPrintHtml` (lib/cvDownload) pins it with
 * `position: fixed` so Chrome repeats it on every page, so anything past one page's height
 * is CLIPPED, and `flowElementFor` (lib/cvDesignVars) deliberately measures the main column
 * only, so nothing downstream would ever report the loss. Overfilling the rail silently
 * deletes sections from a CV somebody paid to download.
 *
 * So the split is decided HERE, before anything renders, by estimate rather than by
 * measurement. Five surfaces render these templates — the Studio preview, the picker
 * thumbnails (drawn at A4 then CSS-scaled), Aria Studio's preview, the print surface and
 * the detached PDF clone — and a pure function of (markdown, templateId) is the only way
 * they all reach the same answer. Measure-then-move cannot: two of those surfaces have no
 * usable layout to measure, and the loop has no fixed point (drop a section, the rail
 * fits, which invites the section back).
 *
 * The estimate is approximate and that is survivable, because the error is ASYMMETRIC.
 * Over-estimating spills a section into the main column — where it renders today, so the
 * worst case is the layout we already ship. Under-estimating is the one that clips, and
 * the safety factor below is sized against it.
 */

/**
 * Admission order — first admitted stays longest. The reverse is the spill order:
 * Education leaves the rail first, then Certifications, then Languages.
 *
 * Skills is pinned last deliberately. It already lives in the rail in six of the seven
 * templates, so "nothing else fits" degrades to exactly today's shipped layout.
 */
export const SIDEBAR_KEYS = Object.freeze(['skills', 'languages', 'certifications', 'education']);

// Letter (1056px at 96dpi) rather than A4's 1122: a template is not told which paper is
// set, so the rail is budgeted against the SHORTER page and is safe on both.
const PAGE_HEIGHT_PX = 1056;

// The estimate is a guess about wrapped text, so it does not get the whole page.
const SAFETY = 0.9;

const PT_TO_PX = 4 / 3;

/**
 * Per-template rail geometry, measured from each template's own classes.
 *
 * `textWidthPx` is the column width at A4 (794px) minus its horizontal padding; `padY` is
 * the vertical padding; `headerPx` covers whatever sits above the markdown sections (a
 * photo or initials disc, a name, a role line); `contactRowPx` is one contact line.
 */
export const SIDEBAR_METRICS = Object.freeze({
  'applyright-mono': { textWidthPx: 198, ptSize: 8.7, headerPx: 120, contactRowPx: 20, padY: 32 },
  'applyright-navy': { textWidthPx: 214, ptSize: 8.7, headerPx: 120, contactRowPx: 20, padY: 32 },
  // Band's contact block lives in the masthead, not the rail, so the rail starts at zero.
  'applyright-band': { textWidthPx: 200, ptSize: 8.8, headerPx: 0, contactRowPx: 0, padY: 28 },
  'applyright-band-twin': {
    textWidthPx: 200,
    ptSize: 8.8,
    headerPx: 0,
    contactRowPx: 0,
    padY: 28,
  },
  'minimal-grid': { textWidthPx: 174, ptSize: 8.5, headerPx: 150, contactRowPx: 20, padY: 32 },
  'slate-timeline': { textWidthPx: 222, ptSize: 8.5, headerPx: 130, contactRowPx: 22, padY: 32 },
  'navy-portrait': { textWidthPx: 230, ptSize: 8.5, headerPx: 130, contactRowPx: 22, padY: 32 },
  'sales-sidebar': { textWidthPx: 246, ptSize: 8.5, headerPx: 40, contactRowPx: 22, padY: 32 },
});

/**
 * Roughly how tall a block of markdown renders in a rail that narrow.
 *
 * Wrapped lines from an average glyph width of half the type size — the standard
 * approximation for proportional faces, good to about ±15%, which whole-section
 * granularity and the safety factor absorb. Markdown syntax (`###`, `- `, `**`) is
 * stripped first so it is not counted as text that has to wrap.
 */
export const estimateBlockHeight = (body, { textWidthPx, ptSize }) => {
  if (!body) return 0;
  const fontPx = ptSize * PT_TO_PX;
  const charsPerLine = Math.max(8, Math.floor(textWidthPx / (fontPx * 0.5)));
  const lineHeight = fontPx * 1.45;

  const lines = body.split('\n').filter((line) => line.trim());
  const textHeight = lines.reduce((total, line) => {
    const text = line
      .replace(/^#{1,6}\s*/, '')
      .replace(/^[-*]\s*/, '')
      .replace(/\*\*/g, '');
    const isHeading = /^#{1,6}\s/.test(line);
    const wrapped = Math.max(1, Math.ceil(text.length / charsPerLine));
    // A heading carries its own space above and below; a wrapped body line does not.
    return total + wrapped * lineHeight + (isHeading ? lineHeight * 0.6 : 0);
  }, 0);

  // The section's own `## Heading` plus the margin under the block.
  return textHeight + lineHeight * 2.4;
};

/**
 * Decide what the rail carries and what the main column keeps.
 *
 * @param {string} markdown  the CV, headings in either language
 * @param {string} templateId
 * @param {{ hasPhoto?: boolean, contactCount?: number }} opts
 * @returns {{ sidebar: Record<string,string>, sidebarKeys: string[], mainMarkdown: string, estPx: number, budgetPx: number }}
 */
export function planSidebar(markdown, templateId, { hasPhoto = false, contactCount = 0 } = {}) {
  const safeMarkdown = typeof markdown === 'string' ? markdown : '';
  const body = safeMarkdown.replace(/^#\s+.+$/m, '').trim();
  const metrics = SIDEBAR_METRICS[templateId];

  // An unregistered template gets no rail sections rather than a guessed budget.
  if (!metrics) {
    return { sidebar: {}, sidebarKeys: [], mainMarkdown: body, estPx: 0, budgetPx: 0 };
  }

  const reserved =
    metrics.padY * 2 +
    (hasPhoto ? metrics.headerPx : metrics.headerPx * 0.5) +
    contactCount * metrics.contactRowPx;
  const budgetPx = Math.max(0, (PAGE_HEIGHT_PX - reserved) * SAFETY);

  const sidebar = {};
  const headings = {};
  const sidebarKeys = [];
  let estPx = 0;

  // STOPS at the first section that will not fit — it does not carry on looking for a
  // smaller one further down the list. Strict priority, not best-fit packing: admitting
  // Education because it happens to be short, while Certifications above it was turned
  // away, would invert the order and make the rail's contents depend on the length of a
  // section rather than on what matters most.
  for (const key of SIDEBAR_KEYS) {
    const section = extractSection(body, key);
    if (!section) continue;
    const height = estimateBlockHeight(section, metrics);
    if (estPx + height > budgetPx) break; // this one and everything after it spills
    sidebar[key] = section;
    headings[key] = extractHeading(body, key);
    sidebarKeys.push(key);
    estPx += height;
  }

  return {
    sidebar,
    headings,
    sidebarKeys,
    mainMarkdown: removeSections(body, sidebarKeys),
    estPx,
    budgetPx,
  };
}
