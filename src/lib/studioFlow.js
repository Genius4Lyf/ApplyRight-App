// Aria Studio's flow machine — pure, JSX-free, no React. The Studio has no wizard and
// no URL state: the persisted MARKER MESSAGES in the transcript are the only source of
// truth for where the user is. These helpers derive position from that transcript, so a
// refresh restores the flow exactly, and the rules can be reasoned about (and tested)
// without mounting a chat.

import { CV_SECTIONS, getCompletionStatus } from './cvCompleteness';
import { STUDIO_PROJECT_IDEAS_ENABLED } from './studioFeatures';

/**
 * The six sections a build session walks, in CV-builder order.
 *
 * `check` maps each one onto the CANONICAL completeness rules in cvCompleteness — the
 * same source /my-cvs and the Dashboard use. Nothing here stores "step 3 done": a
 * separate progress flag is free to drift from the document it claims to describe, and
 * the moment it does, the user is told they've finished a section that's actually empty.
 * Deriving is slightly more work and cannot lie.
 */
// `labelKey` is an i18n key, not text — this file is plain JS with no react-i18next
// context, so every caller (a React component with useTranslation) resolves it via t().
export const BUILD_SECTIONS = [
  { key: 'contact', labelKey: 'ariaStudio.studioFlow.sections.contact', cvKey: 'name', icon: '📇' },
  {
    key: 'experience',
    labelKey: 'ariaStudio.studioFlow.sections.experience',
    cvKey: 'experience',
    icon: '💼',
  },
  {
    key: 'projects',
    labelKey: 'ariaStudio.studioFlow.sections.projects',
    cvKey: 'projects',
    icon: '🚀',
  },
  {
    key: 'education',
    labelKey: 'ariaStudio.studioFlow.sections.education',
    cvKey: 'education',
    icon: '🎓',
  },
  { key: 'skills', labelKey: 'ariaStudio.studioFlow.sections.skills', cvKey: 'skills', icon: '🛠️' },
  { key: 'summary', labelKey: 'ariaStudio.studioFlow.sections.summary', cvKey: 'summary', icon: '📝' },
];

// Per-section emoji, keyed the same way as BUILD_SECTIONS plus the two sub-steps that
// don't have their own BUILD_SECTIONS row (certifications rides on education; project is
// the singular form StudioChat's pinned-entry flow uses).
export const SECTION_ICON = {
  contact: '📇',
  experience: '💼',
  projects: '🚀',
  project: '🚀',
  education: '🎓',
  certs: '🎓',
  skills: '🛠️',
  summary: '📝',
};

/** The emoji for a section key, or '' if none is registered. */
export const sectionIcon = (key) => SECTION_ICON[key] || '';

/**
 * The DISPLAY NAME of a scan section, in the user's language.
 *
 * `ariaStudio.studioFlow.sections.<key>` is the ONE source of truth for these six names —
 * the same block BUILD_SECTIONS points at. The scan also ships a `label`, but it is
 * hard-coded English on the server and is never rendered; it survives here only as the
 * fallback for a section whose key we don't recognise.
 *
 * The locale text differs slightly from the server's ('education' is "Education &
 * certifications" here, "Education" there). The locale wins: it is the string users
 * already see everywhere else in the Studio, and internal consistency matters more than
 * matching the wire.
 *
 * @param {Function} t react-i18next's t
 * @param {{ key?: string, label?: string }} section
 * @returns {string}
 */
export function sectionLabel(t, section = {}) {
  const key = section?.key;
  const fallback = section?.label || key || '';
  if (!t || !key) return fallback;
  const path = `ariaStudio.studioFlow.sections.${key}`;
  const label = t(path);
  // i18next hands back the key itself when nothing is registered under it.
  return label && label !== path ? label : fallback;
}

/**
 * The section's verdict line, in the user's language.
 *
 * The scan sends a KEY plus its params rather than a finished sentence, so the note is
 * composed HERE — which is the whole point: a server-written English verdict cannot be
 * translated after the fact, and it used to be rendered verbatim onto an otherwise
 * fully French card.
 *
 * The `note` fallback is for scans persisted BEFORE that split: they carry prose and no
 * noteKey. Showing that old line until the session's next free recompute is better than
 * showing a blank verdict.
 *
 * @param {Function} t react-i18next's t
 * @param {{ noteKey?: string, noteParams?: object, note?: string }} section
 * @returns {string}
 */
export function sectionNote(t, section = {}) {
  const noteKey = section?.noteKey;
  if (noteKey) return t(`ariaStudio.sectionNote.${noteKey}`, section.noteParams);
  return section?.note || '';
}

// An entry counts as REAL once it carries anything a reader would see. A row that exists
// only because the Studio needed a _sortId to write into is a placeholder, not content.
export const hasSubstance = (e) =>
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
 * @param {Array<object>} msgs persisted Studio transcript messages
 * @returns {{ status: Record<string,boolean>, percent: number, isComplete: boolean,
 *             nextKey: string|null, done: number, total: number }}
 */
export function buildProgress(cv, msgs = []) {
  // Apply the canonical rules to a CLEANED view of the document.
  //
  // The canonical list checks ask only "is this list non-empty?", which is fine on /my-cvs
  // where rows arrive filled. The Studio CREATES a blank row up front — addRole() has to
  // persist an entry before /coach can write bullets into it by _sortId — so the raw
  // document would read as 100% complete the instant work history begins, ticking every
  // section before a single question is answered.
  //
  // Stripping blank entries first keeps ONE set of rules (no forked definition of
  // "complete") while refusing to count a placeholder as work.
  const cleaned = withoutBlankEntries(cv);
  const passed = new Set(CV_SECTIONS.filter((s) => s.check(cleaned)).map((s) => s.key));
  // A profile name is copied into a new draft before the user reaches Contact. In Studio,
  // that section is complete only after ContactConfirmCard validates and saves the form.
  const contactConfirmed = msgs.some((m) => m?.who === 'contactdone');

  const status = {};
  BUILD_SECTIONS.forEach((s) => {
    status[s.key] = passed.has(s.cvKey) && (s.key !== 'contact' || contactConfirmed);
  });

  // The first unfinished section, in builder order — what Aria should tackle next.
  const next = BUILD_SECTIONS.find((s) => !status[s.key]);

  const done = BUILD_SECTIONS.filter((s) => status[s.key]).length;

  return {
    status,
    percent: Math.round((done / BUILD_SECTIONS.length) * 100),
    isComplete: done === BUILD_SECTIONS.length,
    nextKey: next ? next.key : null,
    done,
    total: BUILD_SECTIONS.length,
  };
}

// True when the CV is content-complete IGNORING blank placeholder rows — the signal that an
// entry interaction is an EDIT of a finished CV, not a build step. Reuses the one completeness
// definition (getCompletionStatus) the preview lock / dashboard / picker all use.
export function finishableNow(cv) {
  return getCompletionStatus(withoutBlankEntries(cv)).isComplete;
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
    labelKey: 'ariaStudio.studioFlow.projectTypes.course.label',
    hintKey: 'ariaStudio.studioFlow.projectTypes.course.hint',
    messageKey: 'ariaStudio.studioFlow.projectTypes.course.message',
  },
  {
    key: 'personal',
    labelKey: 'ariaStudio.studioFlow.projectTypes.personal.label',
    hintKey: 'ariaStudio.studioFlow.projectTypes.personal.hint',
    messageKey: 'ariaStudio.studioFlow.projectTypes.personal.message',
  },
  {
    key: 'work',
    labelKey: 'ariaStudio.studioFlow.projectTypes.work.label',
    hintKey: 'ariaStudio.studioFlow.projectTypes.work.hint',
    messageKey: 'ariaStudio.studioFlow.projectTypes.work.message',
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
    {
      key: 'entryType',
      labelKey: 'ariaStudio.studioFlow.fields.experience.entryType',
      done: (e) => !!e?.entryType,
    },
    {
      key: 'title',
      labelKey: 'ariaStudio.studioFlow.fields.experience.title',
      done: (e) => !!(e?.title || '').trim(),
    },
    {
      key: 'company',
      labelKey: 'ariaStudio.studioFlow.fields.experience.company',
      done: (e) => !!(e?.company || '').trim(),
    },
    {
      key: 'dates',
      labelKey: 'ariaStudio.studioFlow.fields.experience.dates',
      // A start date is the floor; "present" is a valid end, so isCurrent counts.
      done: (e) => !!(e?.startDate || '').trim(),
    },
    {
      key: 'achievements',
      labelKey: 'ariaStudio.studioFlow.fields.experience.achievements',
      done: (e) => bulletCount(e) > 0,
    },
  ],
  project: [
    // The type isn't a DraftCV field — it's stated in the thread, which is what the
    // backend's project prompt reads. `done` is supplied by the caller via opts.
    { key: 'type', labelKey: 'ariaStudio.studioFlow.fields.project.type', fromContext: true },
    {
      key: 'title',
      labelKey: 'ariaStudio.studioFlow.fields.project.title',
      done: (e) => !!(e?.title || '').trim(),
    },
    {
      key: 'achievements',
      labelKey: 'ariaStudio.studioFlow.fields.project.achievements',
      done: (e) => bulletCount(e) > 0,
    },
    {
      key: 'link',
      labelKey: 'ariaStudio.studioFlow.fields.project.link',
      optional: true,
      done: (e) => !!(e?.link || '').trim(),
    },
  ],
  education: [
    {
      key: 'degree',
      labelKey: 'ariaStudio.studioFlow.fields.education.degree',
      done: (e) => !!(e?.degree || '').trim(),
    },
    {
      key: 'school',
      labelKey: 'ariaStudio.studioFlow.fields.education.school',
      done: (e) => !!(e?.school || '').trim(),
    },
    {
      key: 'graduationDate',
      labelKey: 'ariaStudio.studioFlow.fields.education.graduationDate',
      done: (e) => !!(e?.graduationDate || '').trim(),
    },
    {
      key: 'cgpa',
      labelKey: 'ariaStudio.studioFlow.fields.education.cgpa',
      optional: true,
      done: (e) => !!(e?.cgpa || '').trim(),
    },
    {
      key: 'description',
      labelKey: 'ariaStudio.studioFlow.fields.education.description',
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
 * @returns {{ fields: Array<{key,labelKey,done,optional}>, done: number, total: number }}
 */
export function entryProgress(entry, section = 'experience', opts = {}) {
  const spec = SECTION_FIELDS[section] || SECTION_FIELDS.experience;
  const fields = spec.map((f) => ({
    key: f.key,
    labelKey: f.labelKey,
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
 * Where Aria is in building ONE entry.
 *
 * Derived rather than tracked, so a refresh mid-entry resumes at exactly the right
 * card, and a user who fills something in elsewhere isn't asked for it again. Optional
 * fields never gate a stage: Aria offers them, she doesn't block on them.
 *
 * Every required SCALAR field (title/company/dates, degree/school/graduationDate, etc.)
 * is captured together on one combined card — `'form'` — rather than one card per field.
 * The context-only field (entryType/type) stays its own stage, since it's a single tap
 * that decides what the form even asks, not a field to fill in; achievements stays its
 * own stage too, since it's an AI-mediated interview, not scalar capture.
 *
 * @returns {string|'form'|'achievements'|'complete'|null}
 */
export function roleStage(entry, section = 'experience', opts = {}) {
  if (!entry) return null;
  const spec = SECTION_FIELDS[section] || SECTION_FIELDS.experience;

  // The type-chip stage — project's `type` (transcript-only, read via opts.typePicked)
  // and experience's `entryType` (a real field, read off the entry like any other) are
  // both single-tap pickers, not "fields to fill in", so they still gate ahead of the
  // combined form exactly as they did when every field had its own stage.
  const chipField = spec.find((f) => f.fromContext || f.key === 'entryType');
  if (chipField) {
    const chipDone = chipField.fromContext ? !!opts.typePicked : chipField.done(entry);
    if (!chipDone) return chipField.key;
  }

  const scalarFields = spec.filter(
    (f) => !f.optional && f !== chipField && f.key !== 'achievements'
  );
  if (scalarFields.some((f) => !f.done(entry))) return 'form';

  const achievementsField = spec.find((f) => f.key === 'achievements');
  if (achievementsField && !achievementsField.done(entry)) return 'achievements';

  return 'complete';
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
 * The project type for one entry, resolved the way the coach sees it: the PERSISTED
 * entry field first, then the transcript marker.
 *
 * The entry wins because it is the only source that survives the things the marker can't:
 * a TAILORED project (cloned from the base CV, so it never had this thread's marker) and an
 * "Edit with Aria" interview opened long after the picking turn. The marker stays as the
 * fallback for sessions that only ever had one — a build flow mid-thread, or an entry saved
 * before the type was written to the document — so nothing regresses. Use this, not
 * projectTypeFor, wherever the question is "do we KNOW this project's type?".
 */
export function resolveProjectType(entry, msgs = [], sortId) {
  return entry?.entryType || projectTypeFor(msgs, sortId);
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
 * Studio section key → the CV builder STEP that edits it. The wizard's step ids don't
 * all match the scan's section keys ('experience' lives at 'history'), so the mapping
 * has to be explicit.
 */
export const BUILDER_STEP_FOR_SECTION = {
  experience: 'history',
  projects: 'projects',
};

/**
 * The URL of the builder step that edits a section. Named here rather than composed at
 * each call site so every "open the builder" link in the Studio points at the same place.
 *
 * @param {string} draftId
 * @param {string} section a scan section key
 * @returns {string|null} null when there's no draft or no step for that section
 */
export const builderStepUrl = (draftId, section) => {
  const step = BUILDER_STEP_FOR_SECTION[section];
  return draftId && step ? `/cv-builder/${draftId}/${step}` : null;
};

/**
 * Sections a user may mark NOT APPLICABLE — the ONE client-side source of truth, so
 * "which rows offer a dismiss action" is never a literal 'projects' scattered across
 * components.
 *
 * MIRRORS the server's whitelist (applyright-backend/src/config/sections.js), which is
 * the one that actually decides: this list only governs which affordances are OFFERED.
 * A key added here but not there would render a control whose save is silently ignored.
 *
 * Projects is the only genuinely optional section. A candidate with no side projects has
 * not made a mistake, but every other section (summary, experience, skills, education,
 * contact) is missing information a recruiter needs.
 */
export const DISMISSABLE_SECTIONS = ['projects'];

/** Can this section be marked not-applicable? */
export const isDismissable = (section) => DISMISSABLE_SECTIONS.includes(section);

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
export function derivePhase(msgs = [], cvData = {}) {
  const has = (who) => msgs.some((m) => m?.who === who);

  const fix = openFix(msgs);
  // A pending role rewrite outranks the entry PICKER it was launched from: those
  // before/after rows were PAID for, and dropping the user back on the picker after a
  // refresh would make them buy the same rewrite twice. It does NOT outrank an interview
  // already in progress ('coach') — that conversation is the newer, deliberate choice —
  // and it is cleared on apply / interview-instead / back like every other pending.
  if (fix?.mode === 'pick' && cvData?.studioPending?.kind === 'rewrite') return 'fix:rewrite';
  // Pending project IDEAS are ranked exactly like the rewrite above, and for the same
  // reason: they were PAID for, so a refresh must not drop the user back onto the empty
  // picker and make them buy the same three ideas again.
  // Flag-gated: with project ideas retired, a pending bought before it was switched off
  // must NOT resurrect the card on a refresh — that phase has nothing to render any more,
  // and it would strand the user on a blank step. The stale pending is inert data; the
  // next persistStudioPending overwrites it.
  if (
    STUDIO_PROJECT_IDEAS_ENABLED &&
    fix?.mode === 'pick' &&
    cvData?.studioPending?.kind === 'projectideas'
  )
    return 'fix:project-ideas';
  // Skills suggestions bought inside a FIX. Ranked here for the same reason as the two
  // above — the generation was PAID for — and `workflow` is what tells it apart from the
  // BUILD one further down: both write kind:'skills', and without the flag a fix pending
  // would re-derive as 'build:skills' and hand the user the wrong card (and the wrong
  // close-out) for suggestions they already own.
  if (cvData?.studioPending?.kind === 'skills' && cvData.studioPending.workflow === 'fix')
    return 'fix:skills';
  if (fix) return `fix:${fix.mode}`;

  // ── Build track. Checked before the tailor milestones because a build session's
  //    markers are its own sequence; the two tracks never interleave in one session.
  //
  // A pinned role outranks the section list: mid-role is where the user actually is, and
  // a refresh must put them back on that card rather than at the top of the section menu.
  if (has('buildstart')) {
    if (pinnedSortId(msgs)) return `build:${pinnedSection(msgs)}`;
    if (cvData?.studioPending?.kind === 'summary' && cvData.studioPending.workflow === 'build')
      return 'build:summary';
    // Bare (pre-`workflow`) and workflow:'build' pendings are build ones; a fix pending
    // was already routed to fix:skills above and must not be claimed here — a build
    // session that scanned and then opened a skills fix has BOTH buildstart and the fix.
    if (cvData?.studioPending?.kind === 'skills' && cvData.studioPending.workflow !== 'fix')
      return 'build:skills';

    // Ranked BELOW the live pin above, same as every other pending kind: once a project
    // is actually open, that interview is where the user is. But above the section hub,
    // because these ideas cost a credit and re-deriving 'build:sections' would throw them
    // away on a refresh.
    if (STUDIO_PROJECT_IDEAS_ENABLED && cvData?.studioPending?.kind === 'projectideas')
      return 'build:project-ideas';

    if (has('summarydone') || finishableNow(cvData)) return 'build:done';
    if (has('skillsdone')) return 'build:sections';
    if (has('certsdone')) return 'build:sections';
    if (has('educationdone')) return 'build:sections';
    if (has('projectsdone')) return 'build:sections';
    if (has('experiencedone')) return 'build:sections';
    if (has('contactdone')) return 'build:sections';
    if (has('buildjobdone')) return 'build:contact';
    if (has('jobcard')) return 'build:brief';
    // Older sessions can have the CV-wide value without the newer transcript marker.
    if (has('careerstage') || cvData?.careerStage) return 'build:job';
    return 'build:career-stage';
  }
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
 * Section names are resolved through sectionLabel, so the card reads in the user's
 * language rather than the server's. `t` is optional only so this stays callable from a
 * non-React context; without it the names fall back to the scan's English labels.
 *
 * @param {object} scan a studioScan snapshot
 * @param {Function} [t] react-i18next's t
 * @returns {{from:number,to:number,moved:number,improved:boolean,
 *            newlyGreen:string[],stillWeak:string[]}|null}
 */
export function finishSummary(scan, t) {
  if (!scan || scan.fitScore == null) return null;
  const base = scan.baseline;
  if (!base || base.fitScore == null) return null;

  const sections = scan.sections || [];
  const wasOk = new Set((base.sections || []).filter((s) => s.band === 'ok').map((s) => s.key));

  // Only sections that CROSSED into green count as newly green — one that was already
  // green isn't an achievement of this session.
  const newlyGreen = sections
    .filter((s) => s.band === 'ok' && !wasOk.has(s.key))
    .map((s) => sectionLabel(t, s));

  // NEUTRAL is not weak. A section the user marked not-applicable comes back from the
  // scan banded 'neutral' with a null score, and `band !== 'ok'` would sweep it in here —
  // telling someone their dismissed Projects section is still a problem, which is the
  // exact nag dismissing it was meant to end. Only warn/bad are genuinely still weak.
  const stillWeak = sections
    .filter((s) => s.band !== 'ok' && s.band !== 'neutral')
    .map((s) => sectionLabel(t, s));

  return {
    from: base.fitScore,
    to: scan.fitScore,
    moved: scan.fitScore - base.fitScore,
    improved: scan.fitScore > base.fitScore,
    newlyGreen,
    stillWeak,
  };
}

// Field separators for the signature below. Control characters, so they can never
// collide with anything a user could type into a CV field.
const FIELD_SEP = '\u001f';
const ENTRY_SEP = '\u001e';
const SECTION_SEP = '\u001d';

// One entry's scan-relevant text, in a fixed field order.
const entrySig = (entry, fields) => fields.map((f) => entry?.[f] || '').join(FIELD_SEP);

// A list's text with entries SORTED BY _sortId, so the signature is order-independent.
// _sortId is stable identity, never re-minted on reorder (or on an undo), which is what
// makes this the right sort key: the same set of entries always folds to the same string.
const listSig = (list, fields) =>
  [...(list || [])]
    .sort((a, b) => String(a?._sortId ?? '').localeCompare(String(b?._sortId ?? '')))
    .map((e) => entrySig(e, fields))
    .join(ENTRY_SEP);

/**
 * A fingerprint of everything the fit scan actually READS, and nothing else.
 *
 * This is what tells a CONTENT change apart from a REORDER. The scan joins each
 * section's entry text and measures keyword coverage over the result, so a reorder is
 * score-neutral by construction — and sorting by _sortId here reproduces that property
 * exactly: dragging a role produces the SAME signature, so nothing needs re-scoring,
 * while an edit, a delete or an add produces a different one.
 *
 * Mirrors sectionScan.service's sectionText field-for-field (title/company/description
 * for experience, title/description for projects, degree/field/school/description for
 * education, skill names, the summary). entryType rides along because it steers how an
 * entry is coached and is persisted on the entry itself.
 *
 * Deliberately NOT included: personalInfo and certifications. Neither is reachable from
 * the Live Preview's edit/delete controls (certifications carry no _sortId to address),
 * so watching them would only add noise.
 *
 * @param {object} cv a DraftCV
 * @returns {string}
 */
export function scoreSignature(cv = {}) {
  return [
    listSig(cv?.experience, ['entryType', 'title', 'company', 'description']),
    listSig(cv?.projects, ['entryType', 'title', 'description']),
    listSig(cv?.education, ['degree', 'field', 'school', 'description']),
    (cv?.skills || []).map((s) => (typeof s === 'string' ? s : s?.name || '')).join(','),
    cv?.professionalSummary || '',
  ].join(SECTION_SEP);
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
