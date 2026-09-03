// @vitest-environment jsdom
//
// Two rules, and they pull in opposite directions: ONE banner for the whole site, a
// DIFFERENT description on every page. The banner is shared so there is a single asset to
// keep in sync; the description is per-page because one generic sentence repeated site-wide
// is exactly what a search engine discounts.
//
// These also guard the failure that made all of this necessary: react-helmet-async sets
// document.title on React 19 and then emits no meta tags at all, silently, so for months
// every page shipped the shell's generic description while appearing to set its own.
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import '../i18n';
import i18n from '../i18n';
import Seo from './Seo';
import RouteSeo from './RouteSeo';
import { OG_IMAGE, seoKeyForPath } from '../lib/pageMeta';

const meta = (attr, key) => document.head.querySelector(`meta[${attr}="${key}"]`)?.content;
const countOf = (attr, key) => document.head.querySelectorAll(`meta[${attr}="${key}"]`).length;

const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <RouteSeo />
    </MemoryRouter>
  );

beforeEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});
afterEach(() => cleanup());

describe('Seo — writes tags the crawler will actually find', () => {
  it('sets the title and the description', () => {
    render(<Seo title="A title" description="A description" />);
    expect(document.title).toBe('A title');
    expect(meta('name', 'description')).toBe('A description');
  });

  it('publishes an ABSOLUTE banner url', () => {
    // A root-relative '/og-image.png' — the old default — is unresolvable for a crawler
    // fetching the image with no page context, so the preview came back blank.
    render(<Seo title="t" description="d" />);
    expect(meta('property', 'og:image')).toBe(OG_IMAGE);
    expect(OG_IMAGE.startsWith('https://')).toBe(true);
  });

  it('UPDATES the shell tags rather than adding a second of each', () => {
    // index.html ships its own description and og: set. Appending would leave two, with
    // the shell's copy still sitting first in the document.
    document.head.innerHTML =
      '<meta name="description" content="shell copy">' +
      '<meta property="og:image" content="shell image">';

    render(<Seo title="t" description="page copy" />);

    expect(countOf('name', 'description')).toBe(1);
    expect(countOf('property', 'og:image')).toBe(1);
    expect(meta('name', 'description')).toBe('page copy');
  });

  it('mirrors the description onto the social tags', () => {
    render(<Seo title="A title" description="A description" />);
    expect(meta('property', 'og:description')).toBe('A description');
    expect(meta('property', 'og:title')).toBe('A title');
    expect(meta('name', 'twitter:description')).toBe('A description');
    // index.html declares twitter:* as `property`; whichever spelling is left un-updated
    // is the stale one a scraper might read, so both are written.
    expect(meta('property', 'twitter:image')).toBe(OG_IMAGE);
  });
});

describe('RouteSeo — every page, one banner, its own description', () => {
  const PUBLIC_PATHS = [
    '/pricing',
    '/how-it-works',
    '/ats-guide',
    '/cv-tips',
    '/cv-health',
    '/how-ats-recruiters-work',
    '/contact',
    '/terms',
    '/privacy',
    '/feedback',
    '/jobs',
    '/login',
    '/register',
    '/forgot-password',
    '/pre-launch',
    '/welcome',
  ];

  it('gives every public page a description of its own', () => {
    const seen = new Map();
    for (const path of PUBLIC_PATHS) {
      document.head.innerHTML = '';
      at(path);
      const description = meta('name', 'description');
      expect(description, `${path} has no description`).toBeTruthy();
      // The point of the exercise: no two pages share a line.
      expect(seen.has(description), `${path} reuses ${seen.get(description)}'s copy`).toBe(false);
      seen.set(description, path);
      cleanup();
    }
    expect(seen.size).toBe(PUBLIC_PATHS.length);
  });

  it('puts the SAME banner on all of them', () => {
    for (const path of PUBLIC_PATHS) {
      document.head.innerHTML = '';
      at(path);
      expect(meta('property', 'og:image'), path).toBe(OG_IMAGE);
      cleanup();
    }
  });

  it('stands aside on pages that own their meta', () => {
    // Two owners for one <title> is a race. The landing page and the guides render their
    // own <Seo>, so the route-level tag must not also fire there.
    for (const path of [
      '/',
      '/aria-studio-guide',
      '/cv-builder-guide',
      '/how-to-ace-your-interview',
    ]) {
      expect(seoKeyForPath(path), path).toBeNull();
    }
  });

  it('falls back to one shared description behind the login', () => {
    // App pages a crawler can never reach do not each need their own line.
    expect(seoKeyForPath('/dashboard')).toBe('app');
    expect(seoKeyForPath('/cv-builder/abc123')).toBe('app');
  });

  it('has real copy for every key the map can return, in both languages', () => {
    const keys = [...PUBLIC_PATHS.map(seoKeyForPath), 'app'];
    for (const lng of ['en', 'fr']) {
      const t = i18n.getFixedT(lng);
      for (const key of keys) {
        for (const field of ['title', 'description']) {
          const value = t(`seo.pages.${key}.${field}`);
          // i18next echoes the key back when it is missing — the failure this catches.
          expect(value, `${lng} ${key}.${field}`).not.toContain('seo.pages.');
        }
      }
    }
  });
});
