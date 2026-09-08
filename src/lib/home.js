// Where "home" is, for each kind of account.
//
// There used to be a dashboard: a page of cards whose entire job was pointing at the
// four places you might actually want to be. Every one of those destinations is now a
// row in the sidebar that every signed-in surface carries, which left the dashboard
// pointing at doors already standing open beside it — an extra stop on the way to
// somewhere, on the one screen a returning user sees first.
//
// So Aria Studio IS home now. It is where a CV gets built, tailored and prepped, and
// landing there means the first thing after sign-in is the work rather than a menu.
//
// This lives in one module because the derivation was already duplicated in Navbar and
// StudioSidebarNav, with a comment in the second saying it was copied from the first.
// Two copies of a route constant is how a redirect ends up pointing at a page that no
// longer exists.
export const SEEKER_HOME = '/aria-studio';

// CV agents keep their own workspace. They are held out of Aria Studio entirely (see
// StudioSidebarNav), so their home cannot be the seeker's.
export const AGENT_HOME = '/agent';

/**
 * The home path for a user blob (the shape stored in localStorage under `user`).
 * A missing or unparsed user is treated as a job seeker, which is what an anonymous
 * or half-loaded session should fall back to.
 *
 * @param {{ role?: string } | null | undefined} user
 * @returns {string}
 */
export const homePathFor = (user) => (user?.role === 'agent' ? AGENT_HOME : SEEKER_HOME);
