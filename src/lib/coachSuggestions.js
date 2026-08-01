// Ready-made questions per step — most students don't know what to ask, so hand them good ones.
const KEYS = {
  target_job: ['cvBuilder.suggestions.target_job.0', 'cvBuilder.suggestions.target_job.1'],
  heading: ['cvBuilder.suggestions.heading.0', 'cvBuilder.suggestions.heading.1'],
  history: [
    'cvBuilder.suggestions.history.0',
    'cvBuilder.suggestions.history.1',
    'cvBuilder.suggestions.history.2',
  ],
  projects: ['cvBuilder.suggestions.projects.0', 'cvBuilder.suggestions.projects.1'],
  education: ['cvBuilder.suggestions.education.0', 'cvBuilder.suggestions.education.1'],
  skills: ['cvBuilder.suggestions.skills.0', 'cvBuilder.suggestions.skills.1'],
  summary: ['cvBuilder.suggestions.summary.0', 'cvBuilder.suggestions.summary.1'],
  finalize: ['cvBuilder.suggestions.finalize.0', 'cvBuilder.suggestions.finalize.1'],
};

const DEFAULT_KEYS = [
  'cvBuilder.suggestions.default.0',
  'cvBuilder.suggestions.default.1',
  'cvBuilder.suggestions.default.2',
];

export const suggestionsFor = (t, stepId) => (KEYS[stepId] || DEFAULT_KEYS).map((key) => t(key));
