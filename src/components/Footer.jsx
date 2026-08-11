import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo/applyright-icon-black.png';
import { useTranslation } from 'react-i18next';

/**
 * Footer — shared site footer in the landing design language: flat, serif
 * wordmark, mono uppercase column headers, slate neutrals, hairline borders,
 * ink hover. Reusable across the landing page, Pricing, and the guide pages.
 */

// Translation KEYS, not literals — a module constant would otherwise freeze in
// whatever language was active at import and ignore a live language switch.
const COLUMNS = [
  {
    headerKey: 'footer.colProduct',
    links: [
      { key: 'nav.pricing', to: '/pricing' },
      { key: 'common.startFreeShort', to: '/register' },
      { key: 'common.signIn', to: '/login' },
    ],
  },
  {
    headerKey: 'footer.colGuides',
    links: [
      { key: 'footer.atsGuide', to: '/ats-guide' },
      { key: 'footer.cvBuilderGuide', to: '/cv-builder-guide' },
      { key: 'footer.ariaStudioGuide', to: '/aria-studio-guide' },
      { key: 'footer.cvHealth', to: '/cv-health' },
      { key: 'footer.cvTips', to: '/cv-tips' },
      { key: 'footer.howAtsWorks', to: '/how-ats-recruiters-work' },
      { key: 'footer.howToAce', to: '/how-to-ace-your-interview' },
    ],
  },
  {
    headerKey: 'footer.colCompany',
    links: [
      { key: 'footer.contact', to: '/contact' },
      { key: 'footer.giveFeedback', to: '/feedback' },
    ],
  },
  {
    headerKey: 'footer.colLegal',
    links: [
      { key: 'common.legal.privacyPolicy', to: '/privacy' },
      { key: 'common.legal.termsOfService', to: '/terms' },
    ],
  },
];

const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1160px] px-5 py-14 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_2fr] lg:gap-14">
          {/* Brand block */}
          <div className="flex flex-col items-start gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt={t('common.logoAlt')} className="h-7 w-auto" />
              <span className="font-brand text-xl font-bold tracking-tight text-slate-900">
                Apply<span className="text-slate-900">Right</span>
              </span>
            </Link>
            <p className="font-heading text-base italic text-slate-600">{t('footer.tagline')}</p>
            <Link to="/register" className="mt-1 btn-primary text-sm">
              {t('common.startFreeShort')}
            </Link>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.headerKey} className="flex flex-col gap-3">
                <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
                  {t(col.headerKey)}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.to + link.key}>
                      <Link
                        to={link.to}
                        className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                      >
                        {t(link.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center dark:border-slate-800">
          <p className="text-sm text-slate-500">{t('common.copyright', { year })}</p>
          <p className="font-mono text-[0.72rem] tracking-[0.04em] text-slate-500">
            {t('footer.builtFor')}
          </p>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-slate-400">
          <strong>{t('footer.disclaimerLabel')}</strong> {t('footer.disclaimerBody')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
