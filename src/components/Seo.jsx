import { useEffect } from 'react';
import { OG_IMAGE, SITE_ORIGIN } from '../lib/pageMeta';

// Per-page <title> and meta tags, written straight to the document.
//
// NOT react-helmet-async, deliberately. On React 19 that library sets document.title and
// then silently emits NO meta tags at all — which is why every page in this app shipped
// the shell's one generic description no matter what it passed here. It fails quietly, so
// nothing ever surfaced it. Please do not "simplify" this back to <Helmet>.
//
// Tags are UPSERTED rather than appended: index.html already ships a description and a
// full og:/twitter: set, and adding a second <meta name="description"> does not mean "the
// newer one wins" — it means two, with the shell's copy sitting first in the document.
// Updating the existing tag in place leaves exactly one of each, which is what a crawler
// wants to find.
const upsert = (attr, key, content) => {
  if (!content) return;
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const Seo = ({
  title,
  description,
  type = 'website',
  name = 'ApplyRight',
  // Absolute, and it has to be: og:image is fetched by a crawler that has no page to
  // resolve a relative path against, so the old '/og-image.png' default simply failed.
  // One shared constant so no page can drift onto a different banner.
  image = OG_IMAGE,
  url,
}) => {
  useEffect(() => {
    if (title) document.title = title;

    upsert('name', 'description', description);

    upsert('property', 'og:type', type);
    upsert('property', 'og:title', title);
    upsert('property', 'og:description', description);
    upsert('property', 'og:image', image);
    upsert('property', 'og:url', url || SITE_ORIGIN + window.location.pathname);

    // index.html declares these as property="twitter:*" while the spec (and the previous
    // version of this file) uses name="*". Both are written, because whichever one is
    // left un-updated is the stale one a scraper might read.
    for (const attr of ['name', 'property']) {
      upsert(attr, 'twitter:title', title);
      upsert(attr, 'twitter:description', description);
      upsert(attr, 'twitter:image', image);
      upsert(attr, 'twitter:url', url || SITE_ORIGIN + window.location.pathname);
    }
    upsert('name', 'twitter:creator', name);
  }, [title, description, type, name, image, url]);

  return null;
};

export default Seo;
