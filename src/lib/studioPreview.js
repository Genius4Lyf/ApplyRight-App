// Pure helpers behind the Studio Live Preview — the band lookup + "what just improved"
// detection, kept out of the component so they're unit-testable without a DOM.

// The CV's real top-to-bottom order in the preview (contact header, then the body
// sections). Keys match studioScan.sections[].key AND the cvData fields.
export const PREVIEW_ORDER = [
  'contact',
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
];

// Band strength, worst → best. Used to decide whether a re-band was an IMPROVEMENT
// (so only genuine gains pulse — a drop or a lateral move never does).
export const BAND_RANK = { neutral: 0, bad: 1, warn: 2, ok: 3 };

// Human verdict per band for the section chip. Neutral (unscored) shows no chip.
// Keys, not text — this is plain JS with no react-i18next context, so the caller
// (a React component with useTranslation) resolves via t().
export const VERDICT_LABEL_KEY = {
  ok: 'ariaStudio.livePreview.verdict.ok',
  warn: 'ariaStudio.livePreview.verdict.warn',
  bad: 'ariaStudio.livePreview.verdict.bad',
  neutral: '',
};

// scan.sections → { key: band }. A missing/absent scan yields an empty map, so every
// section reads as 'neutral' downstream.
export const bandsByKey = (scan) =>
  Object.fromEntries((scan?.sections || []).map((s) => [s.key, s.band || 'neutral']));

// The band for one section key, defaulting to 'neutral' when there's no scan yet or the
// scan didn't score it.
export const bandForKey = (scan, key) => bandsByKey(scan)[key] || 'neutral';

// Keys whose band strictly IMPROVED from prev → next (rank went up). Both args are
// { key: band } maps. A key only counts if it existed before, so first-ever bands (the
// initial scan) don't all pulse at once.
export const improvedKeys = (prev = {}, next = {}) =>
  Object.keys(next).filter(
    (k) => k in prev && (BAND_RANK[next[k]] ?? 0) > (BAND_RANK[prev[k]] ?? 0)
  );

// Split a role/project description into clean bullet lines (handles '•' and '-' markers,
// and inline '•' runs). Empty → []. Mirrors the markdown util's normalisation so the
// preview shows the same bullets the download will.
export const parseBullets = (description) =>
  String(description || '')
    .replace(/•/g, '\n')
    .split('\n')
    .map((l) => l.replace(/^[-*\s]+/, '').trim())
    .filter(Boolean);
