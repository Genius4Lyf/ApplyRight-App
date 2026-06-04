// Credit cost table. Costs are *enforced* on the backend
// (applyright-backend/src/controllers/analysis.controller.js:11-22,
//  ai.controller.js:114, resume.controller.js:8). This table mirrors them so
// the UI can do preflight checks and show "you need N more credits" before
// the user clicks. Keep both sides in sync if either changes.

export const CREDIT_COSTS = {
  FIT_ANALYSIS: 10,
  GENERATE_CV: 10,
  GENERATE_COVER_LETTER: 5,
  GENERATE_INTERVIEW: 10,
  GENERATE_INTERVIEW_MORE: 5,
  GENERATE_ESSENTIAL: 2,
  GENERATE_BUNDLE: 18,
  CREATE_FROM_UPLOAD: 15,
  GENERATE_SKILLS: 10,
};
