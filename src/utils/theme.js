// Dark mode is scoped to the authenticated user-facing app only — NOT the
// landing/public pages, auth pages, or the admin area. This allow-list of route
// prefixes is the single source of truth for "is this page dark-eligible".
//
// It is an allow-list (not a deny-list) on purpose: any new public or admin page
// stays light by default unless explicitly added here.
//
// NOTE: `/jobs` is included even though it is not behind ProtectedRoute, because
// it is part of the user experience (product decision).
const DARK_ELIGIBLE_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/history',
  '/compare',
  '/profile',
  '/upgrade',
  '/credits',
  '/interview', // standalone "Interview Me" flow (/interview/start)
  '/interview-prep',
  '/resume',
  '/my-cvs',
  '/cv-builder',
  '/feedback/dashboard',
  '/jobs',
];

/**
 * Returns true if the given pathname belongs to the authenticated user UI that
 * supports dark mode. Used by RootLayout to decide whether to apply the `.dark`
 * class, and by the anti-flash guard in index.html.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function isDarkEligibleRoute(pathname) {
  if (!pathname) return false;
  return DARK_ELIGIBLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export const THEME_STORAGE_KEY = 'applyright-theme';
