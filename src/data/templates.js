// THE ORDER THE PICKER OFFERS THEM IN, and the set of filters it draws.
//
// It runs plainest → most designed, so the first thing anyone meets is the layout that
// is right for the most people and the hardest to get wrong. The picker shows ONE group
// at a time: nineteen templates in a stacked list meant scrolling past four families to
// reach the fifth, and the two free ATS layouts — the ones a first-time user should
// probably take — were at the top of a scroll nobody finished.
//
// Data, not a literal in the picker, so adding a group to TEMPLATES below and forgetting
// to list it here is visible in one place. Any group NOT named here simply is not
// offered, which is the safe direction: a new group is invisible until it is deliberately
// added, rather than appearing unannounced at the end.
export const TEMPLATE_GROUP_ORDER = [
  'Simple',
  'Editorial',
  'Professional',
  'Industry',
  'Sidebar',
  'ApplyRight',
];

export const TEMPLATES = [
  {
    id: 'applyright-navy',
    rendersPhoto: true,
    sidebar: { side: 'left', width: '34%', className: 'bg-[#0c1627]' },
    name: 'ApplyRight Navy',
    group: 'ApplyRight',
    isPro: true,
    cost: 30,
    description:
      'ApplyRight’s flagship navy layout with an orbital portrait, confident typography, and a focused sidebar.',
    thumbnail: 'bg-[#0c1627] border-2 border-slate-300',
  },
  {
    id: 'applyright-band',
    rendersPhoto: true,
    name: 'ApplyRight Band',
    group: 'ApplyRight',
    isPro: true,
    cost: 30,
    description:
      'A premium ink-band header with ApplyRight’s orbital mark and a clean skills column.',
    thumbnail: 'bg-white border-2 border-[#090d18] border-t-4 border-t-[#090d18]',
  },
  {
    id: 'applyright-band-twin',
    name: 'ApplyRight Band Twin',
    group: 'ApplyRight',
    isPro: true,
    cost: 30,
    description:
      'The warm-paper twin of ApplyRight Band, pairing a soft stone masthead with precise black editorial structure.',
    thumbnail: 'bg-[#f5f5f2] border-2 border-[#111318] border-t-4 border-t-[#111318]',
  },
  {
    id: 'applyright-mono',
    rendersPhoto: true,
    sidebar: { side: 'left', width: '32%', className: 'bg-[#f5f5f2] border-r-2 border-[#111318]' },
    name: 'ApplyRight Mono',
    group: 'ApplyRight',
    isPro: true,
    cost: 30,
    description:
      'A restrained black-and-white ApplyRight layout for conservative and highly formal applications.',
    thumbnail: 'bg-[#f5f5f2] border-2 border-[#111318]',
  },
  {
    id: 'ats-clean',
    name: 'ATS Clean',
    group: 'Simple',
    isPro: false,
    cost: 0,
    description:
      'A recruiter-standard, monochrome single-column layout built for maximum ATS clarity.',
    thumbnail: 'bg-white border-2 border-slate-200',
  },
  {
    id: 'student-ats',
    name: 'Student ATS',
    group: 'Simple',
    isPro: false,
    cost: 0,
    description:
      'A polished early-career layout with restrained navy details and clear academic hierarchy.',
    thumbnail: 'bg-slate-50 border-2 border-[#2C3E50]',
  },
  {
    id: 'modern-professional',
    rendersPhoto: true,
    paper: '#f7f6f2',
    name: 'Modern Professional',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'A polished consulting-style layout with warm neutrals and precise editorial rhythm.',
    thumbnail: 'bg-[#f7f6f2] border-l-4 border-[#9a6b3f]',
  },
  {
    id: 'slate-timeline',
    rendersPhoto: true,
    sidebar: { side: 'left', width: '35%', className: 'bg-[#343d4d]' },
    name: 'Slate Timeline',
    group: 'Sidebar',
    isPro: true,
    cost: 30,
    description:
      'Dark profile rail with a structured career timeline and generous editorial spacing.',
    thumbnail: 'bg-white border-l-4 border-l-[#343d4d]',
  },
  {
    id: 'navy-portrait',
    rendersPhoto: true,
    sidebar: { side: 'left', width: '36%', className: 'bg-[#193e57]' },
    name: 'Navy Portrait',
    group: 'Sidebar',
    isPro: true,
    cost: 30,
    description:
      'Confident navy sidebar with a bold nameplate for client-facing and commercial roles.',
    thumbnail: 'bg-white border-l-4 border-l-[#193e57]',
  },
  {
    id: 'angular-corporate',
    name: 'Angular Corporate',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'Full-width geometric header and a crisp single-column body for corporate applications.',
    thumbnail: 'bg-white border-t-4 border-t-[#314a60]',
  },
  {
    id: 'sales-sidebar',
    rendersPhoto: true,
    sidebar: { side: 'left', width: '38%', className: 'bg-[#d5dfe7]' },
    name: 'Sales Sidebar',
    group: 'Sidebar',
    isPro: true,
    cost: 30,
    description:
      'Soft blue profile banner and rounded sidebar designed for sales and service careers.',
    thumbnail: 'bg-white border-l-4 border-l-[#d5dfe7]',
  },
  {
    id: 'modern',
    rendersPhoto: true,
    name: 'Modern Clean',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'Crisp teal accents, a compact contact grid, and a contemporary corporate hierarchy.',
    thumbnail: 'bg-white border-teal-700',
    // In a real app, thumbnail would be an image URL. Using CSS classes for colorful placeholders.
  },
  {
    id: 'executive-corporate',
    name: 'Corporate Clean',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'A restrained boardroom layout with a strong masthead and disciplined section rules.',
    thumbnail: 'bg-gray-100 border-gray-400',
  },
  {
    id: 'the-ascent',
    name: 'The Ascent',
    group: 'Professional',
    isPro: true,
    cost: 30,
    description:
      'An achievement-led editorial design with copper milestones that signal steady progression.',
    thumbnail: 'bg-white border-l-4 border-[#9b5d30]',
  },
  {
    id: 'minimal-serif',
    rendersPhoto: true,
    paper: '#fcfbf7',
    name: 'The Author',
    group: 'Editorial',
    isPro: true,
    cost: 30,
    description:
      'A refined editorial résumé with an ink-and-paper palette and literary display type.',
    thumbnail: 'bg-[#fcfbf7] border-[#7b3f35]',
  },
  {
    id: 'minimal-grid',
    rendersPhoto: true,
    sidebar: { side: 'left', width: '30%', className: 'bg-[#f2f1ed] border-r border-[#d7d5cf]' },
    name: 'Nordic Grid',
    group: 'Sidebar',
    isPro: true,
    cost: 30,
    description: 'Structured 2-column layout with clean, swiss alignment.',
    thumbnail: 'bg-stone-50 border-stone-200',
  },
  {
    id: 'the-profile',
    rendersPhoto: true,
    paper: '#faf8f4',
    name: 'The Profile',
    group: 'Editorial',
    isPro: true,
    cost: 30,
    description:
      'A magazine masthead treatment for brand, comms and creative leadership — serif byline, credits-line contact, summary set as a pulled quote.',
    thumbnail: 'bg-[#faf8f4] border-2 border-[#6d3955]',
  },
  {
    id: 'executive-energy',
    rendersPhoto: true,
    name: 'Energy / Industrial',
    group: 'Industry',
    isPro: true,
    cost: 30,
    description:
      'A precise technical-report layout for engineering, operations, HSE, energy, manufacturing, construction, and logistics roles.',
    thumbnail: 'bg-white border-[#d68a00]',
  },
  {
    id: 'operations-blueprint',
    paper: '#fbfaf7',
    name: 'Operations Blueprint',
    group: 'Industry',
    isPro: true,
    cost: 30,
    description:
      'A technical operations layout with a graphite control-panel masthead, safety-orange register marks, and precise delivery-focused hierarchy.',
    thumbnail: 'bg-[#fbfaf7] border-t-4 border-t-[#18232d] border-l-2 border-l-[#ef8f22]',
  },
];

/** The colour of unprinted paper. Every template that doesn't say otherwise is white. */
// Which filter a template belongs under, defaulting to the first group rather than to
// nothing: a template whose group is missing or misspelt must still be REACHABLE. It
// would otherwise vanish from a UI that only ever shows one group at a time, and nothing
// on screen would say why.
export const templateGroupOf = (templateId) => {
  const found = TEMPLATES.find((t) => t.id === templateId);
  const group = found?.group;
  return TEMPLATE_GROUP_ORDER.includes(group) ? group : TEMPLATE_GROUP_ORDER[0];
};

export const DEFAULT_PAPER = '#ffffff';

/**
 * The paper colour behind a template, for the A4 "page" shell each rendering surface
 * draws around it.
 *
 * A template paints its own paper only as far as its CONTENT goes. The page it sits on is
 * taller than that — deliberately, since a CV is a sheet and seeing how much room is left
 * is useful — so unless the shell paints the SAME colour, a short CV on a tinted template
 * ends in a hard white block partway down the page. That happened on every surface: CV
 * Studio, Aria Studio's live preview, the view modal, and the downloaded PDF.
 *
 * This is the one answer all of them ask. `paper` lives on the template entry above
 * rather than in a second lookup keyed by id — a second list keyed by id is exactly the
 * shape that let the renderer's ids drift out of step with these in the first place.
 *
 * @param {string} templateId
 * @returns {string} a CSS colour, never undefined
 */
export const paperColor = (templateId) =>
  TEMPLATES.find((template) => template.id === templateId)?.paper || DEFAULT_PAPER;

/**
 * The full-height sidebar spec for templates whose coloured column is a design element
 * rather than a container for content — or `null`.
 *
 * A sidebar is laid out in flow, so it ends where its own content ends. On a page that is
 * deliberately taller than the CV (a short CV on a full A4 sheet) that leaves the column
 * stopping partway down with bare paper beneath it — the same break the page colour had,
 * one layer in.
 *
 * The fix each surface renders from this is an ABSOLUTELY POSITIONED band behind the
 * template, `inset-y-0` so it spans exactly the page and no more. Out of flow is the
 * whole point: it adds nothing to the measured content height, so it cannot push a
 * one-page CV onto a second page. Never make the sidebar itself stretch — that changes
 * layout, and page count with it.
 *
 * `width` and `className` MUST match the sidebar element inside the template file.
 *
 * The PDF does NOT use this. buildPrintHtml reads the width off the sidebar's own
 * `w-[…]` class and pins it with position:fixed, which Chrome's print engine repeats on
 * every page — a better mechanism that needs no registration, but one that only works
 * against a print page box, not on screen.
 *
 * @param {string} templateId
 * @returns {{side: string, width: string, className: string}|null}
 */
export const sidebarFill = (templateId) =>
  TEMPLATES.find((template) => template.id === templateId)?.sidebar || null;

/**
 * ── USER-CHOSEN PAGE GROUND ─────────────────────────────────────────────────────
 *
 * The Design tab lets the user set the colour of the page itself — but only on the
 * templates where that is a safe thing to do, which is a much shorter list than it
 * looks.
 *
 * The rule, and why it is an explicit allowlist rather than something derived:
 *
 *   A template qualifies only if the ground is the ONLY large colour it has — no
 *   sidebar, no masthead band, no colour blocks. Recolour the page under a navy
 *   masthead or a bronze rule and you get a document that fights itself, which is not
 *   a choice worth offering. Of the 19 live templates exactly 5 qualify: two that are
 *   already plain white, and three whose only other colour is a 1px section hairline.
 *
 * Deriving this from `sidebar`/`paper` would catch the sidebar templates but NOT the
 * eight that paint a band on a white page — `paper` is undefined for those, so they
 * would read as "plain white, safe to recolour" when they are the opposite. Hence a
 * list, checked by eye against each component, and pinned by a test.
 *
 * The mechanism is `--cv-ground`, set on #resume-content alongside --cv-accent and
 * friends. The five templates read it with their own colour as the fallback, so an
 * unset value is exactly today's behaviour. Because the PDF is built from a CLONE of
 * that same node, the variable travels into the download for free — but the page
 * BEHIND the CV does not, which is why groundColor() exists and buildPrintHtml takes
 * the choice as an argument.
 */
export const GROUND_EDITABLE_IDS = [
  'ats-clean',
  'student-ats',
  'modern-professional',
  'minimal-serif',
  'the-profile',
];

/**
 * The offered grounds. Every value here is a paper colour already used somewhere in the
 * template set, so each one is known to print and to sit under real CV text — this is
 * not a general colour picker, and deliberately so. A saturated page is the single
 * fastest way to make a CV look unserious, and recruiters print.
 */
export const GROUND_CHOICES = [
  { value: '#ffffff', name: 'White' },
  { value: '#fcfbf7', name: 'Ivory' },
  { value: '#faf8f4', name: 'Paper' },
  { value: '#f7f6f2', name: 'Sand' },
  { value: '#f4f7f7', name: 'Mist' },
];

/** Whether the Design tab should offer a ground choice for this template at all. */
export const supportsGround = (templateId) => GROUND_EDITABLE_IDS.includes(templateId);

/**
 * The page colour to paint, given what the user picked. Falls back to the template's own
 * paper for an unsupported template, an unset choice, or a value not on the palette —
 * so a stale localStorage entry from a template that once allowed it cannot leak a
 * colour onto one that does not.
 *
 * @param {string} templateId
 * @param {string} [ground] the user's choice from GROUND_CHOICES
 * @returns {string} a CSS colour, never undefined
 */
export const groundColor = (templateId, ground) =>
  ground && supportsGround(templateId) && GROUND_CHOICES.some((c) => c.value === ground)
    ? ground
    : paperColor(templateId);
