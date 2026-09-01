// Ownership check for a Studio draft's saved conversation.
//
// A draft's thread lives at `coachChats.studio`. An ANALYSIS (prep) session never gets a
// draft — its conversation lives in the shared `ariaStudio:session` key for its whole
// life — so a prep transcript has no legitimate way onto a draft. The two handoffs that
// could look like one, prep→build and build→tailor, both go through `newSession`, which
// unbinds the draft and clears that key before the next session starts.
//
// A bug broke that invariant: opening a CV after an analysis seeded the chat from the
// shared key, then migrated it onto the draft and autosaved. The CV's real conversation
// was overwritten on the server. Closing the paths that did it stops new damage; it does
// nothing for the drafts already carrying someone else's analysis, which go on showing it
// forever because it is now genuinely their saved thread.
//
// So threads are checked on the way in. A prep marker means the whole thread is foreign —
// it was copied across wholesale, not mixed — and is dropped rather than filtered, so no
// orphaned analysis chatter is left sitting under a CV's name. The CV itself is untouched:
// content, scan and template all live elsewhere on the draft. Only the lost conversation
// is lost, and it was already lost when it was overwritten.

// The four kinds only a prep session emits. Each is rendered by StudioChat's prep branch
// and produced nowhere else.
export const PREP_ONLY_KINDS = new Set(['prepstart', 'prepcv', 'prepjob', 'prepresult']);

// True when this thread belongs to an analysis rather than to the draft holding it.
export const isForeignPrepThread = (thread) =>
  Array.isArray(thread) && thread.some((m) => PREP_ONLY_KINDS.has(m?.who));

// Returns the draft to bind, and whether anything was repaired. The caller uses the flag
// to let the autosave write the repair back — healing the record, not just the view.
// Returns the SAME object reference when there is nothing to do, so the common path costs
// nothing and identity checks downstream still hold.
export function repairStudioThread(draft) {
  if (!isForeignPrepThread(draft?.coachChats?.studio)) return { draft, repaired: false };
  return {
    draft: { ...draft, coachChats: { ...draft.coachChats, studio: [] } },
    repaired: true,
  };
}
