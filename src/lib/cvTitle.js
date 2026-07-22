// A CV title counts as UNNAMED if it's blank or still the backend's creation default
// ("Untitled CV" — set by studio.controller buildStart when a build starts with no job).
// The Studio's auto-naming only fires while a title is unnamed, so it NEVER overwrites a
// name the user has typed. Keep the "Untitled CV" literal in sync with the backend default.
export const UNTITLED_CV = 'Untitled CV';

export const isUnnamedCv = (title) => {
  const t = (title || '').trim();
  return t === '' || t === UNTITLED_CV;
};

// The user's first name, for naming a build that skipped the job (`${first}'s CV`).
// Prefers an explicit firstName, else the first token of the full name. Returns '' when
// nothing is available — callers leave the title untouched rather than fabricate one.
export const firstNameFrom = (info = {}) => {
  const explicit = (info.firstName || '').trim();
  if (explicit) return explicit;
  const full = (info.fullName || info.name || '').trim();
  return full ? full.split(/\s+/)[0] : '';
};
