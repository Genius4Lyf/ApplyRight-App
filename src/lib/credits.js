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
  // Paid "Find more keywords" in the CV builder — richer AI extraction of ATS
  // keywords from the pasted job description. Enforced in ai.controller.js
  // (JD_KEYWORDS_COST) and charged once per unique JD (cached on the draft).
  GENERATE_JD_KEYWORDS: 5,
  // Interview Mode (a full live run). Defined for the planned premium gate but
  // NOT enforced yet — Interview Mode is free during testing (first-free-then-
  // credits is wired behind a flag in MockInterviewPage).
  INTERVIEW_MODE: 5,
  // "What to wear" — tailored interview-attire guide. Web charges; Android ad-rewarded.
  GENERATE_DRESS_GUIDE: 2,
};
