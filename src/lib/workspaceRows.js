import { formatRelative } from './relativeDate';
import { getCompletionStatus, cvBand } from './cvCompleteness';
import { computeReadiness } from '../utils/interviewPrep';

// Two different records — a CV draft and a job application — flattened into the ONE row
// shape the workspace sidebar draws.
//
// The flattening lives here rather than in the sidebar so that component stays
// presentational (rows in, callbacks out) and can be tested without a server, and so the
// three surfaces that mount it can't quietly disagree about what a row means.
//
// Every row carries the same four things, because that is what a row in a 248px rail can
// actually say: what it is, when you touched it, one number, and the colour that number
// earns. For a CV the number is how complete it is; for an application it is how ready
// you are. Different questions, same shape — which is the point.

/** One CV draft → a sidebar row. `t` is passed in: this is a module, not a component. */
export const toCvRow = (draft, t) => {
  const { percent, isComplete } = getCompletionStatus(draft);
  const when = draft?.updatedAt ? formatRelative(new Date(draft.updatedAt)) : '';
  return {
    id: draft?._id,
    heading: draft?.title || t('workspace.untitledCv'),
    // The person's own name is the second-best identifier for a CV they never titled.
    meta: [draft?.personalInfo?.fullName, when].filter(Boolean).join(' · '),
    value: `${percent}%`,
    band: cvBand(percent, isComplete),
    // Which route opens it — the sidebar's host decides where that goes.
    isComplete,
  };
};

// Readiness → the editorial band vocabulary. Unprepped items read as neutral slate
// rather than alarming red: nothing has gone WRONG, there is simply nothing scored yet.
const readinessBand = (score, total) => {
  if (!total) return 'neutral';
  if (score >= 70) return 'ok';
  if (score >= 40) return 'warn';
  return 'bad';
};

/** One application (with its interview prep) → a sidebar row. */
export const toPrepRow = (app, t) => {
  const job = app?.jobId || {};
  const { score, total } = computeReadiness(app);
  // Practised beats saved beats updated — the most recent thing you actually did to it.
  const dateRef =
    app?.interviewPrep?.lastInterviewSession?.completedAt ||
    app?.interviewPrep?.savedAt ||
    app?.updatedAt;
  return {
    id: app?._id,
    heading: job.title || app?.jobTitle || t('ariaStudio.deleteSession.untitledSession'),
    meta: [job.company || app?.jobCompany, dateRef ? formatRelative(new Date(dateRef)) : '']
      .filter(Boolean)
      .join(' · '),
    // No rated questions yet means no readiness to report — a bare "0%" would read as a
    // bad score rather than an absent one.
    value: total ? `${score}%` : '',
    band: readinessBand(score, total),
  };
};
