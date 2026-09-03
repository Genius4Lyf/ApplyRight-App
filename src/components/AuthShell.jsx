import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Gauge, ShieldCheck, Zap, Check } from 'lucide-react';
import logoBlack from '../assets/logo/applyright-icon-black.png';
import logoWhite from '../assets/logo/applyright-icon-white.png';

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
 *                  'agent' (the CV-agent signup path)
 *   badge        - optional { icon, label } pill shown above the headings to
 *                  signal a special signup context (e.g. "CV Agent sign-up")
 *   children     - the actual form
 */
// Full, static class strings per accent so Tailwind keeps them at build time.
// The seeker path is INK/neutral. The agent path uses a brighter ink treatment
// as its distinct accent (app-wide amber stays the paid-tier accent, untouched).
// On the dark left panel the touches are a right-edge hairline + a value-prop
// icon tint; never a glow.

// The page ground is the HOME PAGE's warm off-white, so arriving at the login from the
// landing page is one continuous surface rather than a step down onto a grey app screen.
const PAGE_GROUND = '#f7f6f2';

const ACCENTS = {
  ink: {
    hairline: 'via-white/15',
    icon: 'text-white/80',
    badgeDark: 'bg-white/10 border border-white/20 text-white',
    badgeLight: 'bg-transparent border border-slate-300 text-slate-900',
  },
  agent: {
    hairline: 'via-white/25',
    icon: 'text-slate-400',
    badgeDark: 'bg-white/20 border border-white/30 text-white',
    // Same outline treatment as `ink` — the badge marks which sign-up page this is,
    // not the account type's brand, so it shouldn't carry its own accent weight.
    badgeLight: 'bg-transparent border border-slate-300 text-slate-900',
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
      className="auth-surface min-h-screen flex flex-col lg:flex-row"
      style={{ backgroundColor: PAGE_GROUND }}
    >
      {/* Mobile brand bar — the mark sits in its OWN bar at the top of the page,
          held there while the form scrolls under it, with a hairline and a faint
          shadow to seat it. Above lg the left panel carries the brand, so this is
          hidden and takes no part in the two-column row. */}
      <header
        className="lg:hidden sticky top-0 z-20 flex items-center justify-center px-5 py-3.5 border-b border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.05)]"
        style={{ backgroundColor: PAGE_GROUND }}
      >
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img src={logoBlack} alt="ApplyRight" className="h-7 w-auto" />
          <span className="text-lg font-brand font-semibold tracking-tight text-slate-900">
            ApplyRight
          </span>
        </Link>
      </header>

      {/* Left brand panel — sticky on desktop so it stays put while the form
          column scrolls, carrying the app's editorial diagonal-hairline texture for
          depth — no gradient hero light, no brand glow.

          NEUTRAL black, not slate-950. Every other dark surface in the app is the
          slate family, which is deliberately blue-cast (#020617) — next to the warm
          off-white ground on the right that cast reads as navy rather than as black.
          neutral-950 is the same weight with the blue taken out. */}
      <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-1/2 xl:w-2/5 bg-neutral-950 text-white relative overflow-hidden">
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
            <img src={logoWhite} alt="ApplyRight" className="h-8 w-auto" />
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

      {/* Right form panel — full width on mobile, half on desktop. Centred
          vertically only from lg: on a phone the brand bar already holds the top of
          the screen, and centring the short login form under it opened a dead band
          between the two. */}
      <main className="flex-1 flex flex-col items-center justify-start lg:justify-center px-5 pt-12 pb-12 sm:px-8 sm:pt-14 lg:p-12">
        <div className="w-full max-w-md">
          {/* No card. The form sits directly on the page ground: the calm here comes
              from space and a single centred column, not from a panel drawn around it.
              The CONTROLS carry the weight the border used to — see `.auth-surface` in
              index.css, which is scoped to this shell precisely because every other form
              in the app still lives inside a card, where the tighter density is right. */}
          <div>
            <div className="mb-8 text-center">
              {badge && (
                <span
                  className={`inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${a.badgeLight}`}
                >
                  {badge.icon}
                  {badge.label}
                </span>
              )}
              {/* Headings are Gelasio app-wide (index.css), so this is the editorial
                  serif at display size rather than a boxed form label. */}
              <h2 className="text-[1.75rem] sm:text-[2rem] font-bold leading-[1.15] text-slate-900 text-balance">
                {formTitle}
              </h2>
              {formSubtitle && (
                <p className="mt-2.5 text-[15px] leading-relaxed text-slate-500 text-balance">
                  {formSubtitle}
                </p>
              )}
            </div>
            {children}
          </div>

          {trustSignals.length > 0 && (
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
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
