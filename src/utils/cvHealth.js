// Live "CV Health" score for the ATS Coach panel — runs in the browser on every
// cvData change so the score moves as the user types. No network, no AI, free.
//
// Grouped BY SECTION: each section carries its title, the requirements a complete
// version needs (with met/unmet flags), and its own earned/total progress — so the
// panel reads like a complete-CV checklist, not a flat dump of sub-checks.
//
// Mirrors the rubric of the backend `computeATSReadiness`
// (applyright-backend/src/services/atsCoach.service.js) but intentionally differs
// in shape: this is the builder's section-grouped CV Health; the backend copy is
// the (flat) upload-readiness score. Projects is RECOMMENDED, not scored — a CV
// reaches 100% from the required sections alone.

const skillName = (s) => (typeof s === 'string' ? s : s?.name);

const statusFor = (earned, total) =>
  earned >= total ? 'complete' : earned > 0 ? 'partial' : 'missing';

/**
 * @param {object} cvData - The CV Builder's live state (CVContext).
 * @returns {{ score:number, sections:Array, recommended:Array }}
 */
export function computeCvHealth(cvData = {}) {
  const info = cvData.personalInfo || {};
  const exp = cvData.experience || [];
  const skills = (cvData.skills || []).map(skillName).filter(Boolean);
  const edu = cvData.education || [];
  const projects = cvData.projects || [];
  const summaryText = (cvData.professionalSummary || '').trim();

  // Contact Information (15) — full name · email · phone · LinkedIn  (builder: Heading)
  const hasName = !!info.fullName && info.fullName !== 'Candidate';
  const contactReqs = [
    { label: 'Full name', met: hasName },
    { label: 'Email address', met: !!info.email },
    { label: 'Phone number', met: !!info.phone },
    { label: 'LinkedIn URL', met: !!info.linkedin },
  ];
  const contactMet = contactReqs.filter((r) => r.met).length;
  const contactEarned = Math.round((15 * contactMet) / 4);
  const contact = {
    id: 'contact',
    title: 'Contact Information',
    total: 15,
    earned: contactEarned,
    status: statusFor(contactEarned, 15),
    detail: `${contactMet}/4 details added`,
    requirements: contactReqs,
  };

  // Work History (30): roles (12) + bullets per role (8) + quantified (10)
  const allBullets = exp.flatMap((e) => (e.description || '').split('\n').filter((b) => b.trim()));
  const quantified = allBullets.filter((b) => /\d/.test(b)).length;
  const ratio = allBullets.length ? quantified / allBullets.length : 0;
  const rolesEnoughBullets = exp.filter(
    (e) => (e.description || '').split('\n').filter((b) => b.trim()).length >= 2
  ).length;
  const rolesEarned = exp.length >= 2 ? 12 : exp.length === 1 ? 6 : 0;
  const bulletsEarned =
    exp.length === 0 ? 0 : rolesEnoughBullets === exp.length ? 8 : rolesEnoughBullets > 0 ? 4 : 0;
  const quantEarned = ratio >= 0.3 ? 10 : ratio > 0 ? 5 : 0;
  const workEarned = rolesEarned + bulletsEarned + quantEarned;
  const history = {
    id: 'history',
    title: 'Work History',
    total: 30,
    earned: workEarned,
    status: statusFor(workEarned, 30),
    detail: exp.length
      ? `${exp.length} role${exp.length > 1 ? 's' : ''} · ${quantified}/${allBullets.length} bullets quantified`
      : 'Not started',
    requirements: [
      { label: 'Add at least 2 roles', met: exp.length >= 2 },
      {
        label: '2–3 bullet points per role',
        met: exp.length > 0 && rolesEnoughBullets === exp.length,
      },
      { label: 'Quantify achievements with numbers', met: ratio >= 0.3 },
    ],
  };

  // Projects — recommended, NOT scored (a CV can hit 100% without it).
  const projectsSection = {
    id: 'projects',
    title: 'Projects',
    recommended: true,
    status: projects.length >= 1 ? 'complete' : 'missing',
    detail: projects.length ? `${projects.length} added` : 'None yet',
    requirements: [{ label: 'Add a project to showcase hands-on work', met: projects.length >= 1 }],
  };

  // Certifications — recommended, NOT scored (like Projects). High value for
  // licence-gated roles, but a CV can still hit 100% without it.
  const certs = (cvData.certifications || []).filter((c) =>
    typeof c === 'string' ? c.trim() : (c?.name || '').trim()
  );
  const certificationsSection = {
    id: 'certifications',
    title: 'Certifications',
    recommended: true,
    status: certs.length >= 1 ? 'complete' : 'missing',
    detail: certs.length ? `${certs.length} added` : 'None yet',
    requirements: [
      { label: 'Add any licences, certificates, or training', met: certs.length >= 1 },
    ],
  };

  // Education (15)
  const eduEarned = edu.length >= 1 ? 15 : 0;
  const education = {
    id: 'education',
    title: 'Education',
    total: 15,
    earned: eduEarned,
    status: statusFor(eduEarned, 15),
    detail: edu.length ? `${edu.length} ${edu.length > 1 ? 'entries' : 'entry'}` : 'Not started',
    requirements: [{ label: 'Add at least one qualification', met: edu.length >= 1 }],
  };

  // Skills (25)
  const skillsEarned =
    skills.length >= 8 ? 25 : skills.length >= 4 ? 15 : skills.length >= 1 ? 6 : 0;
  const skillsSection = {
    id: 'skills',
    title: 'Skills',
    total: 25,
    earned: skillsEarned,
    status: statusFor(skillsEarned, 25),
    detail: skills.length ? `${skills.length} listed` : 'Not started',
    requirements: [{ label: 'List at least 8 relevant skills', met: skills.length >= 8 }],
  };

  // Professional Summary (15)
  const summaryMet = summaryText.length >= 100;
  const summaryEarned = summaryMet ? 15 : summaryText.length > 0 ? 8 : 0;
  const summary = {
    id: 'summary',
    title: 'Professional Summary',
    total: 15,
    earned: summaryEarned,
    status: statusFor(summaryEarned, 15),
    detail: summaryText.length ? `${summaryText.length} characters` : 'Not started',
    requirements: [{ label: 'A 3–4 sentence summary (100+ characters)', met: summaryMet }],
  };

  // Listed in the SAME order as the CV Builder steps so the coach can nudge the
  // user not to skip a section. Projects is shown in place but flagged recommended.
  const sections = [
    contact,
    history,
    projectsSection,
    education,
    certificationsSection,
    skillsSection,
    summary,
  ];
  const score = sections.filter((s) => !s.recommended).reduce((sum, s) => sum + (s.earned || 0), 0); // scored sections sum to 100

  return { score, sections };
}

// Tailwind colour band for a 0-100 score, shared by the ring and badges.
export function healthColor(score) {
  if (score >= 80)
    return { text: 'text-emerald-600 dark:text-emerald-400', ring: '#10b981', label: 'Strong' };
  if (score >= 60)
    return { text: 'text-amber-600 dark:text-amber-400', ring: '#f59e0b', label: 'Getting there' };
  return { text: 'text-rose-600 dark:text-rose-400', ring: '#f43f5e', label: 'Needs work' };
}

// ─── Role Match (JD relevance) ───
// Minimum CV content before a Role Match verdict is FAIR. Below this the match
// would read red purely because the CV is still being built (a software dev on an
// empty form would look like a 0% match) — the UX trap. So we withhold the verdict
// (reason: 'too_early') until there's enough to judge.
const ROLE_MATCH_MIN_SKILLS = 5;
const ROLE_MATCH_MIN_BULLETS = 3;

const countBullets = (exp) =>
  (exp || []).reduce(
    (n, e) => n + (e.description || '').split('\n').filter((b) => b.trim()).length,
    0
  );

/**
 * Role Match — a coarse honesty band that contextualizes the (completeness) CV
 * Health score against the TARGET JOB. Without it, a CV built for the wrong field
 * can reach a falsely-reassuring green 100%. Relevance is intentionally NOT folded
 * into the 0-100 completeness score (that stays about "is the CV finished"); this
 * is a SEPARATE signal so the two are never conflated.
 *
 * `coverage` is the backend keyword-coverage result ({ covered, total, mustHave* })
 * — the SAME synonym/fuzzy signal the JobKeywordPanel uses — so the verdict never
 * relies on naive substring matching. Pass `null` while it loads (→ 'pending').
 *
 * Callers can pass `coverage = null` first to read `.reason`: 'no_jd'/'too_early'
 * mean "don't bother fetching coverage", 'pending' means "fetch it".
 *
 * @returns {{ applicable: boolean, reason?: string, pct?, level?, covered?, total?, mustHaveCovered?, mustHaveTotal? }}
 */
export function computeRoleMatch(cvData = {}, coverage = null) {
  const hasJD = !!(cvData.targetJob?.description || '').trim();
  if (!hasJD) return { applicable: false, reason: 'no_jd' };

  const skills = (cvData.skills || []).map(skillName).filter(Boolean);
  const enoughContent =
    skills.length >= ROLE_MATCH_MIN_SKILLS ||
    countBullets(cvData.experience) >= ROLE_MATCH_MIN_BULLETS;
  if (!enoughContent) return { applicable: false, reason: 'too_early' };

  if (!coverage || !coverage.total) return { applicable: false, reason: 'pending' };

  const pct = Math.round((coverage.covered / coverage.total) * 100);
  const level = pct >= 60 ? 'high' : pct >= 30 ? 'medium' : 'low';
  return {
    applicable: true,
    pct,
    level,
    covered: coverage.covered,
    total: coverage.total,
    mustHaveCovered: coverage.mustHaveCovered || 0,
    mustHaveTotal: coverage.mustHaveTotal || 0,
  };
}

// Tailwind palette for a Role Match level, mirroring healthColor's bands.
export function roleMatchColor(level) {
  if (level === 'high')
    return { text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' };
  if (level === 'medium')
    return { text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' };
  return { text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-400' };
}
