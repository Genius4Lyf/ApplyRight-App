// The pre-call brief — what the room stopped saying.
//
// Phase 3 made the live interviewer neutral in content: it no longer explains what
// counts as evidence, no longer teaches a framework, no longer reassures. That was
// the right call for realism, but it only works if the candidate is told those
// things BEFORE the call. Said here, "a project counts" prevents a freeze. Said
// mid-answer, it was a rescue that broke character and taught them the real room
// would rescue them too.
//
// COST: this is entirely derived — career stage, panel seats, JD must-haves and
// static stage-aware copy. It makes NO AI call and costs no credits.

// Mirrors the backend stage enum ('grad' | 'experienced' | 'changer').
const STAGE_FALLBACK = 'grad';

// This module is plain JS (no react-i18next context), so every user-facing string
// is returned as an i18n KEY (+ params where interpolated) under `interviewPrep.brief.*`
// / `interviewPrep.gate.*`, and every caller (a React component with useTranslation)
// resolves it with t(). See src/i18n/locales/en.json for the actual copy.

// How many `sources` entries each stage's evidence block has in the locale files —
// drives the sourceKeys array below without duplicating the copy here.
const EVIDENCE_SOURCE_COUNT = { grad: 6, experienced: 5, changer: 4 };

// What counts as evidence, by career stage. The graduate copy is the important
// one: the freeze it prevents is "I've never had a job, so I have nothing to say".
export const evidenceForStage = (stage) => {
  const s = EVIDENCE_SOURCE_COUNT[stage] ? stage : STAGE_FALLBACK;
  const base = `interviewPrep.brief.evidence.${s}`;
  return {
    headlineKey: `${base}.headline`,
    bodyKey: `${base}.body`,
    sourceKeys: Array.from(
      { length: EVIDENCE_SOURCE_COUNT[s] },
      (_, i) => `${base}.sources.${i}`
    ),
    closerKey: `${base}.closer`,
  };
};

// What kind of room this is. Derived from the same inputs the interviewer prompt
// uses, so the brief cannot describe a different interview from the one that runs.
const STYLE_IDS = ['screening', 'technical', 'behavioral', 'balanced'];
const kindForStyle = (style) => {
  const s = STYLE_IDS.includes(style) ? style : 'balanced';
  return {
    labelKey: `interviewPrep.brief.kind.style.${s}.label`,
    aboutKey: `interviewPrep.brief.kind.style.${s}.about`,
  };
};

// Archetype labels + what the round is actually for. Mirrors the backend
// definitions in interviewArchetypes.service — when the API tells us which
// archetype will run, "what kind of interview this is" becomes accurate rather
// than inferred from the style picker.
const ARCHETYPE_IDS = ['screening', 'behavioural'];
const archForId = (archetype) => {
  if (!ARCHETYPE_IDS.includes(archetype)) return null;
  const base = `interviewPrep.brief.kind.archetype.${archetype}`;
  return {
    labelKey: `${base}.label`,
    aboutKey: `${base}.about`,
    caresKeys: [0, 1, 2].map((i) => `${base}.cares.${i}`),
  };
};

const CHALLENGE_IDS = ['gentle', 'realistic', 'tough'];
const challengeKeyFor = (challenge) =>
  `interviewPrep.brief.challenge.${CHALLENGE_IDS.includes(challenge) ? challenge : 'realistic'}`;

/**
 * Build the brief. Pure — every field comes from data already computed elsewhere.
 *
 * @param {object} o
 * @param {string} o.careerStage   'grad' | 'experienced' | 'changer' (from the API)
 * @param {object} [o.interviewer] pick-a-role: { name, role, focus }
 * @param {Array}  [o.panel]       panel seats: [{ name, role, focus }]
 * @param {string} [o.style]       screening | technical | behavioral | balanced
 * @param {string} [o.challenge]   gentle | realistic | tough
 * @param {number} [o.plannedSec]  session length, if known
 * @param {Array}  [o.mustHaves]   JD must-have skill names
 */
export const buildRoomBrief = ({
  careerStage,
  interviewer = null,
  panel = [],
  style = 'balanced',
  challenge = 'realistic',
  plannedSec = 0,
  mustHaves = [],
  archetype = '',
} = {}) => {
  const seats = Array.isArray(panel) ? panel.filter((p) => p && p.role) : [];
  const isPanel = seats.length >= 2;
  const arch = archForId(archetype);

  let kind;
  if (isPanel) {
    kind = {
      labelKey: 'interviewPrep.brief.kind.panel.label',
      labelParams: { n: seats.length },
      aboutKey: 'interviewPrep.brief.kind.panel.about',
    };
  } else if (interviewer && interviewer.role) {
    kind = {
      labelKey: 'interviewPrep.brief.kind.oneOnOne.label',
      labelParams: { name: interviewer.name, role: interviewer.role },
      // When we know the archetype, say what the round is actually for rather
      // than describing it only as "their lens".
      aboutKey: arch ? arch.aboutKey : 'interviewPrep.brief.kind.oneOnOne.about',
      aboutParams: arch ? undefined : { name: interviewer.name },
    };
  } else if (arch) {
    kind = { labelKey: arch.labelKey, aboutKey: arch.aboutKey };
  } else {
    kind = kindForStyle(style);
  }

  const minutes = plannedSec > 0 ? Math.round(plannedSec / 60) : 0;

  // What THIS interviewer cares about — from the panel/role data, else the JD.
  // (Names/roles/focus are data supplied by the caller, not copy — left as-is.)
  const caresAbout = isPanel
    ? seats.map((s) => ({ who: s.name, role: s.role, focus: s.focus }))
    : interviewer && interviewer.focus
      ? [{ who: interviewer.name, role: interviewer.role, focus: interviewer.focus }]
      : [];

  const topics = (Array.isArray(mustHaves) ? mustHaves : [])
    .map((m) => (typeof m === 'string' ? m : m?.name))
    .filter(Boolean)
    .slice(0, 6);

  return {
    kind,
    // What this round is weighing — from the archetype's arc when we have one.
    lookingForKeys: arch ? arch.caresKeys : [],
    minutes,
    challengeNoteKey: challengeKeyFor(challenge),
    caresAbout,
    topics,
    evidence: evidenceForStage(careerStage),
    // (d) — true, and worth setting up now that the room cross-checks claims.
    cvNoteKey: 'interviewPrep.brief.cvNote',
    // (e) — permission to be bad at it.
    permissionKey: 'interviewPrep.brief.permission',
  };
};

export default buildRoomBrief;
