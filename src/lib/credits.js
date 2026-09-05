// Credit cost table for UI preflight checks ("you need N more credits" before
// the user clicks). The backend is authoritative — costs live in
// applyright-backend/src/config/creditCosts.js and are resolved (with any admin
// overrides) via GET /auth/config → `creditCosts`. On app load we hydrate this
// table from that response (see hydrateCreditCosts). The literals below are the
// OFFLINE FALLBACK used until the fetch resolves (or if it fails); they mirror
// the backend defaults.
//
// IMPORTANT: this is a live singleton. Consumers import `CREDIT_COSTS` once and
// read fields at render time, so hydrate MUTATES this same object in place rather
// than reassigning it — that way every importer sees updated values.
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
  // (GENERATE_JD_KEYWORDS) and charged once per unique JD (cached on the draft).
  GENERATE_JD_KEYWORDS: 5,
  // Interview Mode (a full live run). Defined for the planned premium gate but
  // NOT enforced yet — Interview Mode is free during testing (first-free-then-
  // credits is wired behind a flag in MockInterviewPage).
  INTERVIEW_MODE: 5,
  // "What to wear" — tailored interview-attire guide. Web charges; Android ad-rewarded.
  GENERATE_DRESS_GUIDE: 2,
  // Rewrite a professional summary into a tighter, shorter version (CV Studio).
  TIGHTEN_SUMMARY: 1,
  // Coach: AI-rewrite one role's weak bullets (paid unlimited).
  REWRITE_ROLE: 1,
  // Coach: AI-generate bullets from a described role/project (Aria build-with).
  // The count picker charges count × this.
  GENERATE_BULLET: 1,
  REWRITE_ROLE: 1,
  // Coach: AI-generate one career-stage-aware, JD-tailored summary (each re-roll charges).
  GENERATE_SUMMARY: 3,
  // Aria Studio — generate a typical role profile from just a job title. Always runs
  // on the Standard (light) model regardless of the user's gen-model pick (the backend
  // pins it), so this light cost is what's actually billed.
  DRAFT_JD: 1,
  // Aria Studio — suggest up to 3 project ideas grounded in the user's own CV. Also
  // server-pinned to the Standard (light) model, so this light cost is what's billed.
  PROJECT_IDEAS: 1,
  // Aria Studio — fork a finished session so the original can be left alone. No model
  // runs, so there is no flagship price for it: this is the only one. Priced above
  // GENERATE_CV (10) on purpose — see config/creditCosts.js on the backend — so
  // duplicating is never a cheaper shortcut to a second CV than generating one.
  DUPLICATE_CV: 20,
};

// The backend uses the canonical key ANALYSIS for what the frontend calls
// FIT_ANALYSIS. Every other key matches 1:1, so we only remap this one.
const BACKEND_TO_FRONTEND_KEY = {
  ANALYSIS: 'FIT_ANALYSIS',
};

// Merge server-resolved costs into the live CREDIT_COSTS singleton. Called once
// on app load with the `creditCosts` map from GET /auth/config. Missing/invalid
// input is ignored so the offline fallback stays intact.
export function hydrateCreditCosts(serverCosts) {
  if (!serverCosts || typeof serverCosts !== 'object') return;
  Object.entries(serverCosts).forEach(([key, value]) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return;
    const localKey = BACKEND_TO_FRONTEND_KEY[key] || key;
    CREDIT_COSTS[localKey] = value;
  });
}

// The signup bonus shown on the register page (Register.jsx's trust line and
// subtitle). Same live-singleton pattern as CREDIT_COSTS above and for the same
// reason: it is admin-editable (AdminSettings → Credits), resolved via
// GET /auth/config's `credits.signupBonus`, and a copy string that hardcodes
// the number silently goes stale the moment an admin changes it — which is
// exactly what happened (the live value moved from 10 to 20 while the page
// still read 10). The fallback below is today's real default; it is what
// renders until the fetch resolves, or if it fails.
export const SIGNUP_CREDITS = { value: 20 };

export function hydrateSignupCredits(credits) {
  const bonus = credits?.signupBonus;
  if (typeof bonus !== 'number' || Number.isNaN(bonus)) return;
  SIGNUP_CREDITS.value = bonus;
}
