// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import i18n from './index';
import en from './locales/en.json';
import fr from './locales/fr.json';

// framer-motion's whileInView needs IntersectionObserver in jsdom.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
vi.stubGlobal('IntersectionObserver', IO);
vi.stubGlobal('matchMedia', (q) => ({
  matches: false,
  media: q,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
}));

const setLang = async (lng) => {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
};

// LandingPage renders <Seo>, which needs a HelmetProvider.
const Shell = ({ children }) => (
  <HelmetProvider>
    <MemoryRouter>{children}</MemoryRouter>
  </HelmetProvider>
);
const wrap = (ui) => render(<Shell>{ui}</Shell>);

beforeEach(async () => {
  await setLang('en');
});
afterEach(cleanup);

// ── The round-1 regression this round had to avoid: module-level constants ──
// A constant holding t() output freezes at import. These three hold translation
// KEYS instead, so they must follow a LIVE language switch.
describe('module-level constants follow a live language switch', () => {
  // 20s: this renders the whole landing page TWICE (once per language) — four
  // feature rows with their vignettes, the hero interview card and the ledger.
  // It sits just over vitest's 5s default, and a timeout here leaves the page
  // mounted, which then breaks the vignette test below with duplicate matches.
  it('LandingPage FEATURES (kicker/title/body/tags)', async () => {
    const { default: LandingPage } = await import('../pages/LandingPage');
    const { rerender } = wrap(<LandingPage />);
    expect(screen.getByText(en.landing.features.studio.title)).toBeTruthy();

    await setLang('fr');
    rerender(
      <Shell>
        <LandingPage />
      </Shell>
    );
    expect(screen.getByText(fr.landing.features.studio.title)).toBeTruthy();
    expect(screen.getByText(fr.landing.features.design.title)).toBeTruthy();
    // A tag inside the same constant.
    expect(screen.getByText(fr.landing.features.studio.tag1)).toBeTruthy();
    expect(screen.queryByText(en.landing.features.studio.title)).toBeNull();
  }, 20000);

  it('RewriteLedger ROWS — including the bold span inside <Trans>', async () => {
    const { default: RewriteLedger } = await import('../components/landing/RewriteLedger');
    const { rerender } = wrap(<RewriteLedger />);
    expect(screen.getByText(en.landing.ledger.row1Before)).toBeTruthy();

    await setLang('fr');
    rerender(
      <Shell>
        <RewriteLedger />
      </Shell>
    );
    expect(screen.getByText(fr.landing.ledger.row1Before)).toBeTruthy();
    // <Trans> renders the bold as a real <b>, with the French number inside it.
    const bolds = [...document.querySelectorAll('b')].map((b) => b.textContent);
    expect(bolds).toContain('42 %');
    expect(bolds).toContain('9 comptes clés sur 10');
  });

  it('Footer COLUMNS (headers + link labels)', async () => {
    const { default: Footer } = await import('../components/Footer');
    const { rerender } = wrap(<Footer />);
    expect(screen.getByText(en.footer.colProduct)).toBeTruthy();

    await setLang('fr');
    rerender(
      <Shell>
        <Footer />
      </Shell>
    );
    expect(screen.getByText(fr.footer.colProduct)).toBeTruthy();
    expect(screen.getByText(fr.footer.howAtsWorks)).toBeTruthy();
    expect(screen.getByText(fr.common.legal.privacyPolicy)).toBeTruthy();
  });

  it('FeatureVignettes STAR / BRIEF / DIMS constants', async () => {
    const { StarStoryVignette, PreCallBriefVignette, CvCompareVignette } =
      await import('../components/landing/FeatureVignettes');
    await setLang('fr');
    wrap(
      <>
        <StarStoryVignette />
        <PreCallBriefVignette />
        <CvCompareVignette />
      </>
    );
    expect(screen.getByText(fr.landing.vignettes.starS)).toBeTruthy();
    expect(screen.getByText(fr.landing.vignettes.brief1)).toBeTruthy();
    expect(screen.getByText(fr.landing.vignettes.dimExperience)).toBeTruthy();
  });
});

// ── The mobile-only WAS/NOW labels used to live in Tailwind before:content-[],
// which t() cannot reach. They are real elements now, so they translate.
describe('the ledger mobile labels are translatable', () => {
  it('renders WAS/NOW from the locale, not from CSS content', async () => {
    const { default: RewriteLedger } = await import('../components/landing/RewriteLedger');
    await setLang('fr');
    const { container } = wrap(<RewriteLedger />);
    expect(container.innerHTML).toContain(fr.landing.ledger.wasLabel);
    expect(container.innerHTML).toContain(fr.landing.ledger.nowLabel);
    expect(container.innerHTML).not.toContain("content-['WAS_']");
  });
});

// ── Toast strings: assert the resolved French text, since a toast only renders
// on an action. This is the coverage check for all 18 of them.
describe('every dashboard toast resolves in French', () => {
  const KEYS = Object.keys(en.dashboard.toasts);

  it('covers every toast key declared in en.json', () => {
    // Plural pairs collapse to one logical message.
    const logical = new Set(KEYS.map((k) => k.replace(/_(one|other)$/, '')));
    expect(logical.size).toBeGreaterThanOrEqual(17);
  });

  it.each(KEYS.filter((k) => !/_(one|other)$/.test(k)))('%s is French', async (key) => {
    await setLang('fr');
    const out = i18n.t(`dashboard.toasts.${key}`, { before: 40, after: 80 });
    expect(out).toBe(
      fr.dashboard.toasts[key].replace('{{before}}', '40').replace('{{after}}', '80')
    );
    expect(out).not.toBe(en.dashboard.toasts[key]);
  });

  it('pluralizes the cover-letter warning correctly in French', async () => {
    await setLang('fr');
    expect(i18n.t('dashboard.toasts.coverLetterWarning', { count: 1 })).toContain('1 affirmation');
    expect(i18n.t('dashboard.toasts.coverLetterWarning', { count: 3 })).toContain('3 affirmations');
  });

  it('pluralizes the credits counter correctly in French', async () => {
    await setLang('fr');
    expect(i18n.t('dashboard.creditsCount', { count: 1 })).toBe('1 crédit');
    expect(i18n.t('dashboard.creditsCount', { count: 12 })).toBe('12 crédits');
  });
});

// ── Incremental shipping: untouched surfaces must still render English. ──
describe('other surfaces still fall back to English', () => {
  it('an out-of-scope key with no French translation stays English', async () => {
    i18n.addResource('en', 'translation', 'cvBuilder.notYetTranslated', 'Target job');
    await setLang('fr');
    expect(i18n.t('cvBuilder.notYetTranslated')).toBe('Target job');
  });
});
