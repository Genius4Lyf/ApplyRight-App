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

// What counts as evidence, by career stage. The graduate copy is the important
// one: the freeze it prevents is "I've never had a job, so I have nothing to say".
const EVIDENCE_BY_STAGE = {
  grad: {
    headline: 'A job is not the only thing that counts as experience',
    body: 'You do not need a paid role to answer these questions well. Any of these is real, usable evidence, and interviewers accept them:',
    sources: [
      'Course projects, your final-year project, or a dissertation',
      'Volunteering, NYSC, or a church/community role',
      'Student societies, class rep, a club you helped run',
      'Side hustles, freelance work, anything you built or sold',
      'Internships, industrial training, or holiday work',
      'Something you taught yourself and then actually used',
    ],
    closer:
      'Pick the example with the most detail you can remember — what the situation was, what YOU did, and how it turned out.',
  },
  experienced: {
    headline: 'Bring specifics, not job descriptions',
    body: 'You have the material. What separates a strong answer from a flat one is detail:',
    sources: [
      'A situation you personally owned, not what your team generally did',
      'The decision you made and what you traded off',
      'Numbers where you have them — size, time, money, volume, percentage',
      'What actually happened afterwards, including when it went badly',
      'Work outside your job title: side projects, mentoring, things you fixed',
    ],
    closer:
      'If you cannot remember an exact number, say the scale honestly rather than inventing one — a made-up figure is the fastest way to lose a real interview.',
  },
  changer: {
    headline: 'Evidence from your old field still counts',
    body: 'You are not starting from zero. Draw on both sides:',
    sources: [
      'Transferable work from your previous field — the skill, not the job title',
      'Projects, courses or certifications from the switch itself',
      'Anything you have built, freelanced or volunteered in the new field',
      'Why you are moving — have a clear, honest answer ready',
    ],
    closer:
      'Connect each example explicitly to what this role needs; do not leave the interviewer to work out the link.',
  },
};

export const evidenceForStage = (stage) =>
  EVIDENCE_BY_STAGE[stage] || EVIDENCE_BY_STAGE[STAGE_FALLBACK];

// What kind of room this is. Derived from the same inputs the interviewer prompt
// uses, so the brief cannot describe a different interview from the one that runs.
const KIND_BY_STYLE = {
  screening: {
    label: 'First-round screening call',
    about:
      'Fit, motivation and a broad walk through your background. It stays high-level — this is not a technical test.',
  },
  technical: {
    label: 'Technical deep-dive',
    about:
      'The hard skills this role needs. Expect to be asked how and why, and to be pushed for specifics.',
  },
  behavioral: {
    label: 'Behavioural / competency interview',
    about:
      'Past situations — "tell me about a time…". Expect follow-ups on what you personally did.',
  },
  balanced: {
    label: 'General interview',
    about: 'A mix of background, motivation and role-relevant skill questions.',
  },
};

// Archetype labels + what the round is actually for. Mirrors the backend
// definitions in interviewArchetypes.service — when the API tells us which
// archetype will run, "what kind of interview this is" becomes accurate rather
// than inferred from the style picker.
const KIND_BY_ARCHETYPE = {
  screening: {
    label: 'Screening interview',
    about:
      'A recruiter-style first round: who you are, why this role and this employer, and a walk through your evidence at a high level. Not a technical test.',
    cares: [
      'Whether you can frame yourself clearly',
      'Motivation that is specific to this role and employer',
      'Concrete evidence, and what YOU personally did',
    ],
  },
  behavioural: {
    label: 'Behavioural interview',
    about:
      'A competency round built on real situations — working with others, setbacks, and things you started yourself. Expect follow-ups on what YOU did.',
    cares: [
      'Real situations, not general views',
      'Situation → what you did → what happened',
      'Honest self-awareness, including what went badly',
    ],
  },
};

const CHALLENGE_NOTE = {
  gentle: 'Set to low pressure: unhurried, and it will take a reasonable answer at face value.',
  realistic: 'Set to realistic: it will ask for specifics and follow up when an answer is thin.',
  tough: 'Set to tough: it will pressure-test your claims and push back on vague answers.',
};

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
  const arch = KIND_BY_ARCHETYPE[archetype] || null;

  const kind = isPanel
    ? {
        label: `Panel interview · ${seats.length} interviewers`,
        about:
          'Each interviewer covers their own area and hands over. Answer the person asking; they have all read your CV.',
      }
    : interviewer && interviewer.role
      ? {
          label: `One-on-one with ${interviewer.name}, ${interviewer.role}`,
          // When we know the archetype, say what the round is actually for rather
          // than describing it only as "their lens".
          about: arch
            ? arch.about
            : `This whole round is ${interviewer.name}'s lens — expect depth in their area rather than broad coverage.`,
        }
      : arch || KIND_BY_STYLE[style] || KIND_BY_STYLE.balanced;

  const minutes = plannedSec > 0 ? Math.round(plannedSec / 60) : 0;

  // What THIS interviewer cares about — from the panel/role data, else the JD.
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
    lookingFor: arch ? arch.cares : [],
    minutes,
    challengeNote: CHALLENGE_NOTE[challenge] || CHALLENGE_NOTE.realistic,
    caresAbout,
    topics,
    evidence: evidenceForStage(careerStage),
    // (d) — true, and worth setting up now that the room cross-checks claims.
    cvNote:
      'The interviewer has your CV open in front of them and may ask about anything on it. If you mention something that is not on there, expect to be asked to square the two — that is normal, and it usually means your CV is missing something.',
    // (e) — permission to be bad at it.
    permission:
      'This is practice. You are allowed to freeze, ramble, or give an answer you regret — that is what it is for, and none of it counts against you. You can run it again as many times as you like.',
  };
};

export default buildRoomBrief;
