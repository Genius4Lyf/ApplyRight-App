// Single source of truth for what counts as a "complete" CV draft. Used by the
// dashboard widget and the workspace sidebar so both surfaces show the same
// progress state and missing-section labels.

export const CV_SECTIONS = [
  { key: 'name', label: 'Name', check: (cv) => !!cv?.personalInfo?.fullName },
  { key: 'summary', label: 'Summary', check: (cv) => !!cv?.professionalSummary },
  { key: 'experience', label: 'Experience', check: (cv) => (cv?.experience?.length || 0) > 0 },
  { key: 'education', label: 'Education', check: (cv) => (cv?.education?.length || 0) > 0 },
  { key: 'skills', label: 'Skills', check: (cv) => (cv?.skills?.length || 0) > 0 },
  {
    key: 'projects',
    label: 'Projects',
    optional: true,
    check: (cv) => (cv?.projects?.length || 0) > 0,
  },
];

export function getCompletionStatus(cv) {
  const required = CV_SECTIONS.filter((s) => !s.optional);
  const completed = required.filter((s) => s.check(cv));
  const missing = required.filter((s) => !s.check(cv));
  const total = required.length;
  return {
    completedCount: completed.length,
    totalCount: total,
    percent: Math.round((completed.length / total) * 100),
    missing: missing.map((s) => s.label),
    isComplete: missing.length === 0,
  };
}

/**
 * Map a CV's completion to the editorial band vocabulary used by the note/row
 * accents. Complete CVs are always 'ok'; otherwise the percent decides.
 * @returns {'ok'|'warn'|'bad'}
 */
export function cvBand(percent, isComplete) {
  if (isComplete) return 'ok';
  if (percent >= 50) return 'warn';
  return 'bad';
}
