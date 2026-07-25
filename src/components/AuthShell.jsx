import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Gauge, ShieldCheck, Zap, Check } from 'lucide-react';
import logo from '../assets/logo/applyright-icon.png';

/**
 * AuthShell
 *
 * Two-column responsive layout shared by Login and Register. On desktop
 * (lg+), the left panel surfaces the brand and a small set of value props
 * — the pattern Stripe, Vercel, Linear, and Railway all use to make auth
 * pages feel more substantial than a generic centered card. On mobile we
 * collapse to a single column with just the form (the brand panel would
 * push the form below the fold on phones).
 *
 * Props:
 *   formTitle    - heading inside the form card (e.g., "Welcome back")
 *   formSubtitle - small line under the heading
 *   leftHeading  - h1 on the left brand panel (desktop only)
 *   leftSubcopy  - sentence under the h1 on the left panel
 *   valueProps   - array of { icon: ReactNode, title, body } for the left
 *                  panel bullet list (desktop only)
 *   trustSignals - array of strings rendered as small comma-separated
 *                  bullets under the form ("Free to start", etc.)
 *   accent       - brand accent for the page: 'ink' (default, neutral) or
 *                  'indigo' (the brand accent, for the CV-agent signup)
 *   badge        - optional { icon, label } pill shown above the headings to
 *                  signal a special signup context (e.g. "CV Agent sign-up")
 *   children     - the actual form
 */
// Full, static class strings per accent so Tailwind keeps them at build time.
// The seeker path is INK/neutral. The CV-agent path uses the brand INDIGO as
// its distinct accent (app-wide amber stays the paid-tier accent, untouched).
// On the dark left panel the touches are a right-edge hairline + a value-prop
// icon tint; never a glow.
const ACCENTS = {
  ink: {
    hairline: 'via-white/15',
    icon: 'text-white/80',
    badgeDark: 'bg-white/10 border border-white/20 text-white',
    badgeLight: 'bg-transparent border border-slate-300 text-slate-900',
  },
  indigo: {
    hairline: 'via-indigo-400/40',
    icon: 'text-indigo-300',
    badgeDark: 'bg-indigo-500/15 border border-indigo-400/30 text-indigo-200',
    badgeLight: 'bg-indigo-50 border border-indigo-200 text-indigo-700',
  },
};

const AuthShell = ({
  formTitle,
  formSubtitle,
  leftHeading,
  leftSubcopy,
  valueProps = [],
  trustSignals = [],
  accent = 'ink',
  badge = null,
  children,
}) => {
  const { t } = useTranslation();
  const a = ACCENTS[accent] || ACCENTS.ink;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-slate-50 flex flex-col lg:flex-row"
    >
      {/* Left brand panel — sticky on desktop so it stays put while the form
          column scrolls. Deep slate-950 base with the app's editorial
          diagonal-hairline texture for depth — no gradient hero light, no
          brand glow. */}
      <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-1/2 xl:w-2/5 bg-slate-950 text-white relative overflow-hidden">
        {/* Diagonal hairline field — flat, faint slate rules on the dark
            ground. The same understated device the app frame uses. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, rgba(148,163,184,0.05) 0px, rgba(148,163,184,0.05) 1px, transparent 1px, transparent 22px)',
          }}
          aria-hidden="true"
        />
        {/* Hairline accent on the right edge — the panel's single accent touch */}
        <div
          className={`absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent ${a.hairline} to-transparent pointer-events-none`}
        />

        {/* Layout: logo at top, content vertically centered in remaining
            space, copyright pinned at the bottom. The previous justify-between
            with three groups created a huge empty gap between the small logo
            line and the content block. */}
        <div className="relative z-10 flex flex-col h-full w-full px-12 py-12 max-w-xl mx-auto">
          {/* Brand mark */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <img src={logo} alt="ApplyRight" className="h-8 w-auto" />
            <span className="text-lg font-brand font-semibold tracking-tight">ApplyRight</span>
          </Link>

          {/* Headline + value props — vertically centered in remaining space */}
          <div className="flex-1 flex items-center py-8">
            <div className="space-y-8 w-full">
              <div>
                {badge && (
                  <span
                    className={`inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${a.badgeDark}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                )}
                <h1 className="text-[2rem] xl:text-[2.5rem] font-semibold leading-[1.15] tracking-tight text-slate-50 text-balance">
                  {leftHeading}
                </h1>
                {leftSubcopy && (
                  <p className="mt-4 text-slate-300/90 text-base leading-relaxed text-balance">
                    {leftSubcopy}
                  </p>
                )}
              </div>
              {valueProps.length > 0 && (
                <ul className="space-y-4 pt-2">
                  {valueProps.map((vp, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`mt-0.5 shrink-0 ${a.icon}`}>{vp.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-50">
                          {vp.titleKey ? t(vp.titleKey) : vp.title}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                          {vp.bodyKey ? t(vp.bodyKey) : vp.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Footer copyright */}
          <p className="text-xs text-slate-500 text-center">
            {t('common.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </aside>

      {/* Right form panel — full width on mobile, half on desktop */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Mobile-only brand mark — desktop has it in the left panel */}
          <Link
            to="/"
            className="lg:hidden flex items-center justify-center gap-2.5 mb-6 hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="ApplyRight" className="h-7 w-auto" />
            <span className="text-lg font-brand font-semibold tracking-tight text-slate-900">
              ApplyRight
            </span>
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              {badge && (
                <span
                  className={`inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${a.badgeLight}`}
                >
                  {badge.icon}
                  {badge.label}
                </span>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{formTitle}</h2>
              {formSubtitle && <p className="text-sm text-slate-500 mt-1.5">{formSubtitle}</p>}
            </div>
            {children}
          </div>

          {trustSignals.length > 0 && (
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
              {trustSignals.map((signal, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-500" />
                  {/* Callers pass translation keys. t() returns unknown input
                      unchanged, so a plain literal still renders as-is. */}
                  {t(signal)}
                </li>
              ))}
            </ul>
          )}

          <p className="lg:hidden text-center mt-6 text-xs text-slate-400">
            {t('common.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </main>
    </motion.div>
  );
};

// Default value-prop set used by both pages (Register can override).
// Carries translation KEYS rather than literals: this is a module constant, so
// literals would be frozen in whatever language was active at import time.
export const DEFAULT_VALUE_PROPS = [
  {
    icon: <Zap className="w-4 h-4" />,
    titleKey: 'auth.shell.valueProps.tailor.title',
    bodyKey: 'auth.shell.valueProps.tailor.body',
  },
  {
    icon: <Gauge className="w-4 h-4" />,
    titleKey: 'auth.shell.valueProps.score.title',
    bodyKey: 'auth.shell.valueProps.score.body',
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    titleKey: 'auth.shell.valueProps.ownData.title',
    bodyKey: 'auth.shell.valueProps.ownData.body',
  },
];

export default AuthShell;
