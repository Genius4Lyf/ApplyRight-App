// One share banner for the whole site, and a description written for each page.
//
// The banner never varies: a per-page image would mean a per-page asset to draw and keep
// in sync, and the landing artwork is what the brand looks like anyway. The DESCRIPTION
// is what should differ — it is the line under the link in a search result, and one
// generic sentence repeated across every page is the thing search engines discount.

// Absolute, and it has to be. `og:image` is fetched by crawlers that have no page context
// to resolve a relative path against, so a leading-slash URL simply fails for them.
export const SITE_ORIGIN = 'https://applyright.com.ng';
export const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

// Route → the key under `seo.pages` holding that page's title and description.
//
// Deliberately EXCLUDES the four pages that already own their meta (the landing page and
// the two guides render their own <Seo>; How to Ace writes document.title in an effect).
// Two owners for one <title> is a race, so each page has exactly one.
const PAGE_KEYS = {
  '/pricing': 'pricing',
  '/how-it-works': 'howItWorks',
  '/ats-guide': 'atsGuide',
  '/cv-tips': 'cvTips',
  '/cv-health': 'cvHealth',
  '/how-ats-recruiters-work': 'atsRecruiters',
  '/contact': 'contact',
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/feedback': 'feedback',
  '/jobs': 'jobs',
  '/cv-studio': 'cvStudio',
  '/login': 'login',
  '/register': 'register',
  '/forgot-password': 'forgotPassword',
  '/pre-launch': 'preLaunch',
  '/welcome': 'welcome',
};

// Pages that manage their own <Seo>/<title>. Listed so the route-level tag steps aside
// rather than fighting them.
const SELF_MANAGED = new Set([
  '/',
  '/aria-studio-guide',
  '/cv-builder-guide',
  '/how-to-ace-your-interview',
]);

/**
 * The `seo.pages.*` key for a path, or null when the page owns its own meta.
 *
 * Unmapped paths fall back to `app`: everything behind the login is one product to a
 * search engine, and writing twenty descriptions for pages a crawler can never reach
 * would be effort spent on nobody.
 */
export function seoKeyForPath(pathname) {
  if (SELF_MANAGED.has(pathname)) return null;
  return PAGE_KEYS[pathname] || 'app';
}
