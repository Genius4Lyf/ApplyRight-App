// WHICH CONTACT DETAILS ARE WORTH OFFERING TO REMEMBER.
//
// A CV's contact block and the account profile store the same four facts under different
// names — the CV fields predate the profile ones, and renaming either would touch every
// template or every caller. The mapping is the whole of this module's job, plus the rule
// for when Aria should say anything at all.
//
// The rule is deliberately narrow: offer ONLY a value that is on the CV and NOT already
// the same on the profile. Anything else is noise — and an assistant that offers to save
// what it already saved reads as not paying attention.
export const CONTACT_FIELDS = [
  { key: 'phone', cv: 'phone', profile: 'phone' },
  { key: 'linkedin', cv: 'linkedin', profile: 'linkedinUrl' },
  { key: 'website', cv: 'website', profile: 'portfolioUrl' },
  // The one place the two names diverge in meaning as well as spelling: the CV calls it
  // an address because that is what prints, the profile calls it a location.
  { key: 'location', cv: 'address', profile: 'location' },
];

const clean = (value) => String(value ?? '').trim();

// Compared case- and whitespace-insensitively so re-typing "Lagos, Nigeria" as
// "lagos, nigeria" is not treated as a new value worth pestering someone about.
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

// What the CV has that the profile does not. Returns [{ key, cv, profile, value }].
export function unsavedContactDetails(personalInfo = {}, profile = {}) {
  return CONTACT_FIELDS.filter((f) => {
    const value = clean(personalInfo?.[f.cv]);
    if (!value) return false;
    return !same(value, profile?.[f.profile]);
  }).map((f) => ({ ...f, value: clean(personalInfo[f.cv]) }));
}

// The body of the PUT: profile field names, not CV ones. Only the keys the user left
// ticked, so declining one detail actually declines it rather than merely hiding a row.
export function contactSavePayload(rows = [], chosen = []) {
  const picked = new Set(chosen);
  return rows
    .filter((r) => picked.has(r.key))
    .reduce((body, r) => ({ ...body, [r.profile]: r.value }), {});
}

// Whether Aria may offer at all. The persisted opt-out is the user's explicit "don't show
// again"; dismissing a single card is the caller's business and is NOT this flag.
export const contactSaveAllowed = (profile) => !profile?.settings?.hideContactSavePrompt;
