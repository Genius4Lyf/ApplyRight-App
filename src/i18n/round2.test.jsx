// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

// <Seo> writes to document.head directly now, so there is no provider to supply.
const Shell = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;
const wrap = (ui) => render(<Shell>{ui}</Shell>);

// The editorial landing markup splits copy across nested spans and renders
// several blocks twice (a desktop and a mobile variant), so getByText's
// single-text-node / single-match rules do not hold there. Normalise whitespace
// (incl. &nbsp;) and look for the phrase in the rendered text instead.
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const hasCopy = (container, copy) => norm(container.textContent).includes(norm(copy));

beforeEach(async () => {
  await setLang('en');
});
afterEach(cleanup);

// ── The round-1 regression this round had to avoid: module-level constants ──
// A constant holding t() output freezes at import. These three hold translation
// KEYS instead, so they must follow a LIVE language switch.
describe('module-level constants follow a live language switch', () => {
  // The old landing.features.* rows were retired by the editorial redesign —
  // ProductJourneyReveal took their place, so the page copy to check is
  // landing.journey.*. Its ROLE_CVS constant is the module-level constant this
  // round is about: it holds locale-key ids ('customerService', 'sales', …)
  // that roleCv() resolves through t() at render, so the sample CVs must
  // re-render in French too.
  //
  // Mounting the whole ProductJourneyReveal (or LandingPage) pulls in its
  // framer-motion scroll rig plus every sample CV rendered through
  // CVTemplateRenderer at once — slow for no extra guarantee, and even just
  // importing that module for its constant drags in the same weight. ROLE_CVS
  // and roleCv() live in their own roleCvData.js (imported by
  // ProductJourneyReveal, not the other way around) precisely so this test can
  // exercise the real, unmodified constant and function through
  // useTranslation() — same live-language-switch property — without paying
  // for the visual tree at all.
  it('ProductJourneyReveal journey copy + the ROLE_CVS constant', async () => {
    const { ROLE_CVS, roleCv } = await import('../components/landing/roleCvData');
    const customerService = ROLE_CVS.find((item) => item.id === 'customerService');
    const sales = ROLE_CVS.find((item) => item.id === 'sales');

    const RoleCvProbe = () => {
      const { t } = useTranslation();
      return (
        <div>
          <p>{t('landing.journey.kicker')}</p>
          <p>{t('landing.journey.title')}</p>
          <p>{t('landing.journey.studioTitle')}</p>
          <p>{t('landing.journey.studioBody')}</p>
          <p>{roleCv(t, customerService).profile.currentJobTitle}</p>
          <p>{roleCv(t, sales).profile.currentJobTitle}</p>
        </div>
      );
    };

    const { container, rerender } = wrap(<RoleCvProbe />);
    expect(hasCopy(container, en.landing.journey.kicker)).toBe(true);
    expect(hasCopy(container, en.landing.journey.studioTitle)).toBe(true);

    await setLang('fr');
    rerender(
      <Shell>
        <RoleCvProbe />
      </Shell>
    );
    expect(hasCopy(container, fr.landing.journey.title)).toBe(true);
    expect(hasCopy(container, fr.landing.journey.studioTitle)).toBe(true);
    expect(hasCopy(container, fr.landing.journey.studioBody)).toBe(true);
    // Resolved through ROLE_CVS ids, not hard-coded in the component.
    expect(hasCopy(container, fr.landing.journey.roleCvs.customerService.role)).toBe(true);
    expect(hasCopy(container, fr.landing.journey.roleCvs.sales.role)).toBe(true);
    expect(hasCopy(container, en.landing.journey.studioTitle)).toBe(false);
    expect(hasCopy(container, en.landing.journey.roleCvs.customerService.role)).toBe(false);
  });

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
