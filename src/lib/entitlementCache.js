// THE LAST ENTITLEMENT ANYONE FETCHED, kept so a second reader does not pay for it again.
//
// `/billing/entitlement` is already fetched on every authenticated page load by
// useAccountWallet, which the Studio sidebar mounts. Anything else that needs to know a
// balance was, until now, issuing its own request and awaiting it — and on a sleeping Render
// dyno that is not a few hundred milliseconds, it is seconds. The Aria call button did exactly
// that before opening its brief, so a deliberate tap sat there doing nothing while two round
// trips finished. That is what this exists to stop.
//
// Deliberately NOT localStorage. A balance is spendable, it changes on the server, and a copy
// that survives a reload is a copy that outlives its truth. This lives for one page.
//
// STALENESS IS SAFE HERE, because nothing spends money on the strength of it: every real
// gate is the server's own (the session endpoint 402s with NO_ARIA_MINUTES). A cache that is
// wrong in the user's favour costs one 402 they would have got anyway; wrong the other way, it
// is re-primed the moment the wallet refetches on `entitlement_updated` — which is fired after
// every purchase and every call.
let cached = null;

/** Record an entitlement that has just been fetched. */
export const primeEntitlement = (entitlement) => {
  if (entitlement && typeof entitlement === 'object') cached = entitlement;
};

/** The last entitlement seen this page load, or null if nobody has fetched one yet. */
export const readCachedEntitlement = () => cached;

/** Forget it — used by tests, and by anything that knows the balance just moved. */
export const clearCachedEntitlement = () => {
  cached = null;
};
