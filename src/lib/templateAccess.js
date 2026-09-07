// Who may use a premium CV template, in one place.
//
// This rule used to be written twice — once in TemplateSelector, once in ResumeReview —
// and the two copies drifted into disagreeing about two different things:
//
//  1. THE LAUNCH PROMO. Only the selector checked it. So turning "every template free"
//     on in admin lifted the padlocks in the picker and left them on the design page,
//     where the same check also guards both download buttons: the template looked free
//     everywhere the user browsed and still demanded 30 credits at the download.
//  2. AN EXPIRED SUBSCRIPTION. The selector treated an expired `expiresAt` as
//     definitive (locked). The design page let it fall through to `tier`, which is not
//     cleared on expiry — so an expired subscriber kept every premium template, free,
//     on the one page that downloads them.
//
// Both surfaces now import from here, so the next divergence has to be deliberate.
//
// NOTE ON AUTHORITY: none of this decides what anyone is charged. The server owns the
// price and re-checks every rule below on POST /billing/unlock-template. This decides
// only what the UI SHOWS — but showing a padlock the server would not enforce (or
// hiding one it would) is exactly how a user ends up surprised at the moment they pay.

/**
 * Entitled to paid perks right now.
 *
 * Mirrors the backend `subscription.hasPaidAccess` deliberately and exactly: honour a
 * subscription's expiry WHEN ONE EXISTS, and otherwise fall back to the manually-set
 * `plan` flag, because admin grants carry no subscription subdoc.
 *
 * `tier` is intentionally NOT consulted. It is not cleared when a subscription lapses,
 * so reading it grants an expired subscriber everything a current one gets — which is
 * the second bug described above. If this ever needs to change, change the backend
 * first; this function's whole job is to agree with it.
 *
 * @param {object} [user]
 * @returns {boolean}
 */
export const hasPaidAccess = (user = {}) => {
  const expiresAt = user?.subscription?.expiresAt;
  if (expiresAt) return new Date(expiresAt).getTime() > Date.now();
  return user?.plan === 'paid';
};

/**
 * Whether this template is usable by this user right now.
 *
 * @param {{isPro?: boolean, id: string}} [template] the entry from data/templates
 * @param {object} [user] the current profile
 * @param {boolean} [promoActive] from useTemplatePromo().active
 * @returns {boolean}
 */
export const isTemplateUnlocked = (template, user = {}, promoActive = false) => {
  // An id the catalog no longer knows renders as ATS Clean, which is free — so treating
  // it as unlocked matches what the user will actually get.
  if (!template) return true;
  if (!template.isPro) return true;
  if (promoActive) return true;
  if (hasPaidAccess(user)) return true;
  return Boolean(user?.unlockedTemplates?.includes(template.id));
};
