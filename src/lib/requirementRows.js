// One answer to "where does this requirement stand?", for every surface that shows it.
//
// There are two now — the target panel on the page, and the bar inside the role interview —
// and there will be more. The backend already learned this lesson the hard way: three files
// once answered "is this covered?" differently, and two of them ran in the SAME response, so
// the same word could be reported found in one place and missing in another. Consolidating
// them was the fix. This is that fix held on the client side.
//
// Nothing here decides coverage. That verdict comes from the server's shared normalizer via
// useJobCoverage (POST /ai/keyword-coverage, free, no AI); this only JOINS it to the things
// the server sent us separately — the typed requirement ids, the interview's evidence
// ledger, and the refusals the user has already voiced.

/** A requirement's three possible standings. */
export const REQUIREMENT_STATE = {
  COVERED: 'covered',
  OPEN: 'open',
  DECLINED: 'declined',
};

const lower = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

/**
 * Join the coverage verdict, the typed requirement list, the evidence ledger and the
 * user's declines into one row per requirement.
 *
 * @param {object}   args
 * @param {object}   args.cvData    the draft (targetJob.brief, coachEvidence, skillDeclines)
 * @param {object}   args.coverage  useJobCoverage's coverage: { results: [{name, covered}] }
 * @param {object[]} args.keywords  useJobCoverage's keywords, in display order
 * @returns {{name, importance, state, covered, declined, qualification, behavioural, requirementId, provenAt}[]}
 */
export function buildRequirementRows({ cvData, coverage, keywords = [] }) {
  const brief = cvData?.targetJob?.brief;

  // The compact mustHaves/niceToHaves arrays carry no ids — those live on the typed
  // `requirements` list. Join by name so a row can address its requirement (asking Aria
  // about one needs the id) without changing the stored shape.
  const requirementByName = new Map();
  (brief?.requirements || []).forEach((r) => {
    if (r?.name) requirementByName.set(lower(r.name), r);
  });

  // requirementId → the entry its evidence was filed under. Only interview-verified
  // evidence reaches the ledger, so anything here was said by the user in their own words.
  const provenById = new Map();
  const titleOf = (sortId) => {
    const row = [...(cvData?.experience || []), ...(cvData?.projects || [])].find(
      (e) => String(e?._sortId) === String(sortId)
    );
    if (!row) return '';
    return [row.title, row.company].filter(Boolean).join(' · ');
  };
  Object.entries(cvData?.coachEvidence || {}).forEach(([sortId, bucket]) => {
    const label = titleOf(sortId);
    if (!label) return;
    (bucket?.evidence || []).forEach((item) => {
      (item?.requirementIds || []).forEach((id) => {
        if (id && !provenById.has(id)) provenById.set(id, label);
      });
    });
  });

  const coveredByName = new Map();
  (coverage?.results || []).forEach((r) => {
    if (r?.name) coveredByName.set(lower(r.name), !!r.covered);
  });

  // Matched on NAME, not id: the skills card writes a decline with no requirementId at all,
  // and every reader on the server already matches this way. One rule, not a fourth.
  const declinedNames = new Set(
    (cvData?.skillDeclines || []).map((row) => lower(row?.name)).filter(Boolean)
  );

  return keywords.map((k) => {
    const key = lower(k.name);
    const requirement = requirementByName.get(key);
    const covered = coveredByName.get(key) === true;
    const declined = !covered && declinedNames.has(key);
    return {
      name: k.name,
      importance: k.importance,
      covered,
      declined,
      // Something you HOLD (a degree field, a licence), not something you did in a role.
      // Shown for context, never asked about — see the brief's `qualification` flag.
      qualification: !!(requirement?.qualification || k.qualification),
      // A soft trait the posting really does ask for but that nobody can evidence by
      // describing work. "Tell me about your communication skills" can only produce the
      // vague answer this interview exists to avoid. Marked server-side; four of nine
      // real postings carried one as a must-have.
      behavioural: !!(requirement?.behavioural || k.behavioural),
      state: covered
        ? REQUIREMENT_STATE.COVERED
        : declined
          ? REQUIREMENT_STATE.DECLINED
          : REQUIREMENT_STATE.OPEN,
      requirementId: requirement?.id || null,
      // Named ONLY when the interview ledger has it. A text match says covered and stops
      // there rather than inventing a source — which would be the exact failure this whole
      // feature exists to prevent.
      provenAt: requirement?.id ? provenById.get(requirement.id) || '' : '',
    };
  });
}

/**
 * The rows a role interview should actually offer to steer toward: still open, addressable
 * by id, and neither a qualification nor a behavioural trait. Ordered must-haves first,
 * as the keywords arrive.
 */
export function askableRows(rows, cap = Infinity) {
  return rows
    .filter(
      (r) =>
        r.state === REQUIREMENT_STATE.OPEN && r.requirementId && !r.qualification && !r.behavioural
    )
    .slice(0, cap);
}
