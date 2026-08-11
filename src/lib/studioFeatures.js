// Master switch for the Aria Studio TAILORING feature (tailor-an-existing-CV entry
// points + the per-section Fix cards). Temporarily off — the fix machinery is left in
// place, just unreachable from the UI, so re-enabling is this one flip back to `true`.
// "Check your CV against the job description" (the scan, verdicts, re-score/re-check)
// is NOT part of this flag and stays available.
export const STUDIO_TAILORING_ENABLED = false;

// Master switch for the Aria Studio PROJECT IDEAS feature — the "Projects that would
// fit this role" card that proposes JD-aligned projects before the Projects interview.
// Temporarily off. With the flag off, the Projects section goes straight to the normal
// blank-project flow (type chip → interview); the generation code + card are left in
// place, so re-enabling is this one flip back to `true`.
export const STUDIO_PROJECT_IDEAS_ENABLED = false;
