// Aria Studio's flow machine — pure, JSX-free, no React. The Studio has no wizard and
// no URL state: the persisted MARKER MESSAGES in the transcript are the only source of
// truth for where the user is. These helpers derive position from that transcript, so a
// refresh restores the flow exactly, and the rules can be reasoned about (and tested)
// without mounting a chat.

import { CV_SECTIONS, getCompletionStatus } from './cvCompleteness';

/**
 * The six sections a build session walks, in CV-builder order.
 *
 * `check` maps each one onto the CANONICAL completeness rules in cvCompleteness — the
 * same source /my-cvs and the Dashboard use. Nothing here stores "step 3 done": a
 * separate progress flag is free to drift from the document it claims to describe, and
 * the moment it does, the user is told they've finished a section that's actually empty.
 * Deriving is slightly more work and cannot lie.
 */
export const BUILD_SECTIONS = [
  { key: 'contact', label: 'Contact', cvKey: 'name' },
  { key: 'experience', label: 'Work history', cvKey: 'experience' },
  { key: 'projects', label: 'Projects', cvKey: 'projects' },
  { key: 'education', label: 'Education & certifications', cvKey: 'education' },
  { key: 'skills', label: 'Skills', cvKey: 'skills' },
  { key: 'summary', label: 'Summary', cvKey: 'summary' },
];

// An entry counts as REAL once it carries anything a reader would see. A row that exists
// only because the Studio needed a _sortId to write into is a placeholder, not content.
const hasSubstance = (e) =>
  !!(e && (e.title || e.company || e.degree || e.school || e.name || e.description || '').trim?.());

/**
 * The CV with placeholder rows removed, for completeness purposes only. Never persisted —
 * this is a read-time view, so the real entries (and their _sortIds) are untouched.
 */
export function withoutBlankEntries(cv) {
  if (!cv) return {};
  return {
    ...cv,
    experience: (cv.experience || []).filter(hasSubstance),
    projects: (cv.projects || []).filter(hasSubstance),
    education: (cv.education || []).filter(hasSubstance),
  };
}

/**
 * Per-section done/not-done for a build session, plus the overall CV health.
 *
 * @param {object} cv a DraftCV
 * @returns {{ status: Record<string,boolean>, percent: number, isComplete: boolean,
 *             nextKey: string|null, done: number, total: number }}
 */
export function buildProgress(cv) {
  // Apply the canonical rules to a CLEANED view of the document.
  //
  // getCompletionStatus asks only "is this list non-empty?", which is fine on /my-cvs
  // where rows arrive filled. The Studio CREATES a blank row up front — addRole() has to
  // persist an entry before /coach can write bullets into it by _sortId — so the raw
  // document would read as 100% complete the instant work history begins, ticking every
  // section before a single question is answered.
  //
  // Stripping blank entries first keeps ONE set of rules (no forked definition of
  // "complete") while refusing to count a placeholder as work.
  const cleaned = withoutBlankEntries(cv);
  const completion = getCompletionStatus(cleaned);
  const passed = new Set(CV_SECTIONS.filter((s) => s.check(cleaned)).map((s) => s.key));

  const status = {};
  BUILD_SECTIONS.forEach((s) => {
    status[s.key] = passed.has(s.cvKey);
  });

  // The first unfinished section, in builder order — what Aria should tackle next.
  const next = BUILD_SECTIONS.find((s) => !status[s.key]);

  return {
    status,
    percent: completion.percent,
    isComplete: completion.isComplete,
    nextKey: next ? next.key : null,
    done: BUILD_SECTIONS.filter((s) => status[s.key]).length,
    total: BUILD_SECTIONS.length,
  };
}

/**
 * The three project types the backend's coachChatTurn already knows how to frame.
 * `message` is sent as an ordinary user turn — that IS how the model learns the type
 * (its prompt says "the user states the type early in the thread"), so this stays a
 * conversational answer rather than a hidden parameter.
 */
export const PROJECT_TYPES = [
  {
    key: 'course',
    label: 'Course / academic',
    hint: 'Coursework, capstone, dissertation',
    message: 'This is a course / academic project.',
  },
  {
    key: 'personal',
    label: 'Personal / side',
    hint: 'Something you chose to build',
    message: 'This is a personal / side project.',
  },
  {
    key: 'work',
    label: 'Work / client',
    hint: 'Built for an employer or client',
    message: 'This was a work / client project.',
  },
];

// Non-empty bullet lines in an entry's description. Bullets are stored as newline-
// separated text, so "has achievements" is a line count, not a truthy check on a string
// that might hold nothing but a stray "•".
export const bulletCount = (entry) =>
  (entry?.description || '').split('\n').filter((l) => l.replace(/•/g, '').trim().length > 0)
    .length;

/**
 * What each kind of entry needs, in the order Aria asks for it.
 *
 * `optional: true` fields are shown on the card but EXCLUDED FROM THE COUNTER. A project
 * link is the case that matters: counting it would make 3/4 the best a link-less project
 * could ever score, so the card would permanently claim to be unfinished — and a counter
 * that can't reach full teaches people to ignore it.
 */
export const SECTION_FIELDS = {
  experience: [
    { key: 'title', label: 'Role', done: (e) => !!(e?.title || '').trim() },
    { key: 'company', label: 'Company', done: (e) => !!(e?.company || '').trim() },
    {
      key: 'dates',
      label: 'Dates',
      // A start date is the floor; "present" is a valid end, so isCurrent counts.
      done: (e) => !!(e?.startDate || '').trim(),
    },
    { key: 'achievements', label: 'Achievements', done: (e) => bulletCount(e) > 0 },
  ],
  project: [
    // The type isn't a DraftCV field — it's stated in the thread, which is what the
    // backend's project prompt reads. `done` is supplied by the caller via opts.
    { key: 'type', label: 'Kind', fromContext: true },
    { key: 'title', label: 'Project', done: (e) => !!(e?.title || '').trim() },
    { key: 'achievements', label: 'What you did', done: (e) => bulletCount(e) > 0 },
    { key: 'link', label: 'Link', optional: true, done: (e) => !!(e?.link || '').trim() },
  ],
  education: [
    { key: 'degree', label: 'Qualification', done: (e) => !!(e?.degree || '').trim() },
    { key: 'school', label: 'School', done: (e) => !!(e?.school || '').trim() },
    { key: 'graduationDate', label: 'Finished', done: (e) => !!(e?.graduationDate || '').trim() },
    {
      key: 'description',
      label: 'Notes',
      optional: true,
      done: (e) => !!(e?.description || '').trim(),
    },
  ],
};

// Back-compat alias — work history was the only section when this was written.
export const ROLE_FIELDS = SECTION_FIELDS.experience;

/**
 * Per-field completeness for one entry — derived from the ENTRY, never stored.
 *
 * The pinned card reads this on every render, so the counter and the document can't
 * disagree: edit the entry anywhere and the card follows.
 *
 * @param {object} entry
 * @param {'experience'|'project'|'education'} [section]
 * @param {{ typePicked?: boolean }} [opts] context the entry itself can't carry
 * @returns {{ fields: Array<{key,label,done,optional}>, done: number, total: number }}
 */
export function entryProgress(entry, section = 'experience', opts = {}) {
  const spec = SECTION_FIELDS[section] || SECTION_FIELDS.experience;
  const fields = spec.map((f) => ({
    key: f.key,
    label: f.label,
    optional: !!f.optional,
    done: f.fromContext ? !!opts.typePicked : f.done(entry),
  }));
  // Only REQUIRED fields count toward n/total.
  const required = fields.filter((f) => !f.optional);
  return {
    fields,
    done: required.filter((f) => f.done).length,
    total: required.length,
  };
}

/**
 * Where Aria is in building ONE entry — the first REQUIRED thing still missing.
 *
 * Derived rather than tracked, so a refresh mid-entry resumes at exactly the right
 * question, and a user who fills something in elsewhere isn't asked for it again.
 * Optional fields are never a stage: Aria offers them, she doesn't block on them.
 *
 * @returns {string|'complete'|null}
 */
export function roleStage(entry, section = 'experience', opts = {}) {
  if (!entry) return null;
  const spec = SECTION_FIELDS[section] || SECTION_FIELDS.experience;
  const next = spec
    .filter((f) => !f.optional)
    .find((f) => (f.fromContext ? !opts.typePicked : !f.done(entry)));
  return next ? next.key : 'complete';
}

/**
 * The project type stated for one entry, or null. Lives in the transcript rather than on
 * the document because that's where the backend's project prompt reads it from — the user
 * says it as an ordinary turn, and coachChatTurn tailors its framing to it.
 */
export function projectTypeFor(msgs = [], sortId) {
  const m = [...msgs].reverse().find((x) => x?.who === 'projecttype' && x.sortId === sortId);
  return m?.type || null;
}

/**
 * The _sortId of the role currently pinned, or null.
 *
 * The transcript records WHICH entry is open (a `pinrole` marker, closed by `unpinrole`);
 * the entry's CONTENTS live on the draft. Same split as the scan marker — the event is
 * history, the state is the document — which is what lets a refresh restore both the
 * card and everything captured into it.
 */
export function pinnedSortId(msgs = []) {
  const last = [...msgs].reverse().find((m) => m?.who === 'pinrole' || m?.who === 'unpinrole');
  return last?.who === 'pinrole' ? last.sortId || null : null;
}

// Which SECTION the open pin belongs to. Defaults to experience so Phase 2 transcripts,
// whose pinrole markers predate this field, still resolve correctly.
export function pinnedSection(msgs = []) {
  const last = [...msgs].reverse().find((m) => m?.who === 'pinrole' || m?.who === 'unpinrole');
  return last?.who === 'pinrole' ? last.section || 'experience' : null;
}

// The cvData list each pinned section reads from.
export const SECTION_LIST = {
  experience: 'experience',
  project: 'projects',
  education: 'education',
};

/**
 * Resolve the pinned entry against the live draft.
 *
 * Returns null when the marker points at an entry that no longer exists — deleted from
 * the builder, or from another tab. A card pinned to a dead _sortId would accept input
 * that lands nowhere, so callers treat null as "self-clear the pin".
 */
export function resolvePinnedEntry(msgs, cv) {
  const sortId = pinnedSortId(msgs);
  if (!sortId) return null;
  const list = SECTION_LIST[pinnedSection(msgs)] || 'experience';
  return (cv?.[list] || []).find((e) => e._sortId === sortId) || null;
}

/**
 * Which fix flow a weak section uses.
 *
 * Work history and projects are fixed per-ENTRY through the coach — "your experience is
 * weak" isn't actionable, "this role never mentions pressure testing" is. Summary is
 * regenerated whole. Skills needs no generation at all (the scan already named the gaps).
 * Education and contact are COMPLETENESS, not tailoring — a job description doesn't
 * keyword-match a phone number — so they get guidance, not a coach loop.
 */
export const FIX_MODE = {
  experience: 'pick',
  projects: 'pick',
  summary: 'summary',
  skills: 'skills',
  education: 'guide',
  contact: 'guide',
};

/**
 * Studio section key → the cvData list to read entries from, and the section name
 * /coach/chat's `focus` expects. The builder calls a project 'project' (singular);
 * mapping rather than renaming keeps the existing section-specific prompts firing.
 */
export const ENTRY_SOURCE = {
  experience: { list: 'experience', focusSection: 'experience' },
  projects: { list: 'projects', focusSection: 'project' },
};

/**
 * Studio section → the builder step id /coach/chat uses for its STEP_LABELS lookup.
 */
export const STEP_FOR_FOCUS = { experience: 'history', project: 'projects' };

/**
 * The currently OPEN fix session, or null.
 *
 * A session is open when the most recent fix marker is a `fixstart` with no `fixend`
 * after it. Reading the last marker (rather than counting starts and ends) is what lets
 * an entry pick push a second `fixstart` to narrow 'pick' → 'coach' without bookkeeping.
 *
 * @param {Array<object>} msgs the studio transcript
 * @returns {object|null} the open fixstart marker
 */
export function openFix(msgs = []) {
  const last = [...msgs].reverse().find((m) => m?.who === 'fixstart' || m?.who === 'fixend');
  return last?.who === 'fixstart' ? last : null;
}

/**
 * Rebuild the flow position from persisted markers alone.
 *
 * An open fix wins over everything: the user is mid-repair, and dumping them back to the
 * breakdown on refresh would lose the conversation. Otherwise the furthest milestone
 * reached decides, newest first.
 *
 * @param {Array<object>} msgs the studio transcript
 * @returns {string} one of: mode | job | brief | cv | scanoffer | results | fix:<mode>
 */
export function derivePhase(msgs = []) {
  const has = (who) => msgs.some((m) => m?.who === who);

  const fix = openFix(msgs);
  if (fix) return `fix:${fix.mode}`;

  // ── Build track. Checked before the tailor milestones because a build session's
  //    markers are its own sequence; the two tracks never interleave in one session.
  //
  // A pinned role outranks the section list: mid-role is where the user actually is, and
  // a refresh must put them back on that card rather than at the top of the section menu.
  if (pinnedSortId(msgs)) return `build:${pinnedSection(msgs)}`;
  if (has('summarydone')) return 'build:done'; // everything captured → the finish card
  if (has('skillsdone')) return 'build:sections';
  if (has('certsdone')) return 'build:sections';
  if (has('educationdone')) return 'build:sections';
  if (has('projectsdone')) return 'build:sections';
  if (has('experiencedone')) return 'build:sections'; // work history closed
  if (has('contactdone')) return 'build:sections'; // contact confirmed → start sectioning
  if (has('buildjobdone')) return 'build:contact'; // job answered → confirm details
  if (has('buildstart')) return 'build:job'; // draft created → ask about the job
  if (has('buildintro')) return 'build:roadmap'; // kind chosen → show the plan

  // ── Tailor track.
  if (has('scan')) return 'results'; // scanned → showing the verdict
  if (has('tailored')) return 'scanoffer'; // copy exists → offer the scan
  if (has('briefcard')) return 'cv'; // read confirmed → pick the CV to tailor
  if (has('jobcard')) return 'brief'; // job captured + read → confirm it
  // A mode pick of 'build' with no buildintro yet means they chose to build but haven't
  // accepted the roadmap — resume there, not on the tailor track.
  const mode = [...msgs].reverse().find((m) => m?.who === 'modepick');
  if (mode) return mode.mode === 'build' ? 'build:roadmap' : 'job';
  return 'mode';
}

/**
 * Entries for the picker, shaped from a cvData list and ranked worst-first by how many
 * of the section's missing keywords each one is silent on.
 *
 * The gap match is plain substring on purpose: authoritative coverage already ran
 * server-side during the scan, so this is ordering, not a second scoring system.
 *
 * @param {Array<object>} list       cvData.experience or cvData.projects
 * @param {Array<string>} missingKeywords
 * @returns {Array<{ entry: object, gaps: string[] }>}
 */
export function rankEntriesByGap(list = [], missingKeywords = []) {
  return (list || [])
    .map((e) => {
      const entry = {
        sortId: e._sortId ?? e.sortId,
        title: e.title,
        company: e.company,
        description: e.description,
      };
      const text = [entry.title, entry.company, entry.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const gaps = (missingKeywords || []).filter(
        (k) => k && !text.includes(String(k).toLowerCase())
      );
      return { entry, gaps };
    })
    .sort((a, b) => b.gaps.length - a.gaps.length);
}

/**
 * The phase a BRAND-NEW session opens on, given the kind the user picked in the rail.
 *
 * Picking "New Tailoring" or "New CV" has already answered the mode chooser's question,
 * so a new session lands on that kind's first step. A cold start with no declared kind
 * still gets the chooser.
 *
 * @param {'tailor'|'build'|null|undefined} kind
 * @param {Array<object>} msgs restored transcript, used only when no kind was declared
 */
export function phaseForNewSession(kind, msgs = []) {
  if (kind === 'tailor') return 'job';
  if (kind === 'build') return 'build:roadmap';
  return derivePhase(msgs);
}

/**
 * Shape one /studio/sessions row for the rail.
 *
 * A 'build' session has no fit score — it isn't aimed at a job yet — so it gets a tag
 * rather than a dash that would read as "scored zero".
 */
export function sessionRow(s = {}) {
  const isBuild = s.kind === 'build';
  return {
    id: s._id,
    isBuild,
    heading: s.jobTitle || s.title || 'Untitled session',
    sub: [s.company, s.sourceTitle && `from ${s.sourceTitle}`].filter(Boolean).join(' · '),
    // Only a tailoring can show a score, and only once it has actually been scanned.
    showScore: !isBuild && s.fitScore != null,
    fitScore: s.fitScore ?? null,
  };
}

/**
 * The before → after summary for the finish card.
 *
 * "Before" is the baseline captured on the FIRST scan; "after" is where the CV stands
 * now. Returns null when there's no baseline to compare against — a session that was
 * scanned once and never improved has no journey to report, and inventing one (or
 * comparing a number against itself and calling it progress) would be a lie.
 *
 * @param {object} scan a studioScan snapshot
 * @returns {{from:number,to:number,moved:number,improved:boolean,
 *            newlyGreen:string[],stillWeak:string[]}|null}
 */
export function finishSummary(scan) {
  if (!scan || scan.fitScore == null) return null;
  const base = scan.baseline;
  if (!base || base.fitScore == null) return null;

  const sections = scan.sections || [];
  const wasOk = new Set((base.sections || []).filter((s) => s.band === 'ok').map((s) => s.key));

  // Only sections that CROSSED into green count as newly green — one that was already
  // green isn't an achievement of this session.
  const newlyGreen = sections
    .filter((s) => s.band === 'ok' && !wasOk.has(s.key))
    .map((s) => s.label || s.key);

  const stillWeak = sections.filter((s) => s.band !== 'ok').map((s) => s.label || s.key);

  return {
    from: base.fitScore,
    to: scan.fitScore,
    moved: scan.fitScore - base.fitScore,
    improved: scan.fitScore > base.fitScore,
    newlyGreen,
    stillWeak,
  };
}

/**
 * The score movement to report after a fix. Returns null when there's nothing honest to
 * say — a missing before/after means we don't know, and inventing a delta would be worse
 * than staying quiet.
 *
 * @returns {{ from: number, to: number, moved: number, bandChanged: boolean }|null}
 */
export function scoreDelta(beforeSection, afterSection) {
  if (!beforeSection || !afterSection) return null;
  return {
    from: beforeSection.score,
    to: afterSection.score,
    moved: afterSection.score - beforeSection.score,
    bandChanged: afterSection.band !== beforeSection.band,
  };
}
