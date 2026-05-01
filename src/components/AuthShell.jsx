import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Zap, Check } from 'lucide-react';
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
 *   children     - the actual form
 */
const AuthShell = ({
  formTitle,
  formSubtitle,
  leftHeading,
  leftSubcopy,
  valueProps = [],
  trustSignals = [],
  children,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-slate-50 flex flex-col lg:flex-row"
    >
      {/* Left brand panel — sticky on desktop so it stays put while the form
          column scrolls. Deep slate-950 base with a single soft indigo glow
          breaking up the flatness — Linear / Vercel "dark void with brand
          light" pattern, kept understated. */}
      <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-1/2 xl:w-2/5 bg-slate-950 text-white relative overflow-hidden">
        {/* Soft indigo glow in the top-right — gives the panel depth without
            the marketing-y gradient we had before. Heavy blur + low opacity. */}
        <div
          className="absolute -top-40 -right-32 w-[28rem] h-[28rem] bg-indigo-600/20 blur-3xl rounded-full pointer-events-none"
          aria-hidden="true"
        />
        {/* Smaller violet glow in the bottom-left for asymmetric balance */}
        <div
          className="absolute -bottom-32 -left-24 w-80 h-80 bg-violet-700/10 blur-3xl rounded-full pointer-events-none"
          aria-hidden="true"
        />
        {/* Very faint dot pattern for texture, on top of the glows */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Hairline accent on the right edge */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-indigo-500/30 to-transparent pointer-events-none" />

        {/* Layout: logo at top, content vertically centered in remaining
            space, copyright pinned at the bottom. The previous justify-between
            with three groups created a huge empty gap between the small logo
            line and the content block. */}
        <div className="relative z-10 flex flex-col h-full w-full px-12 py-12 max-w-xl mx-auto">
          {/* Brand mark */}
          <Link to="/" className="inline-flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img src={logo} alt="ApplyRight" className="h-8 w-auto" />
            <span className="text-lg font-semibold">ApplyRight</span>
          </Link>

          {/* Headline + value props — vertically centered in remaining space */}
          <div className="flex-1 flex items-center py-8">
            <div className="space-y-8 w-full">
              <div>
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
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-300">
                        {vp.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-50">{vp.title}</p>
                        <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                          {vp.body}
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
            &copy; {new Date().getFullYear()} ApplyRight. All rights reserved.
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
            <span className="text-lg font-semibold text-slate-900">ApplyRight</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{formTitle}</h2>
              {formSubtitle && (
                <p className="text-sm text-slate-500 mt-1.5">{formSubtitle}</p>
              )}
            </div>
            {children}
          </div>

          {trustSignals.length > 0 && (
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
              {trustSignals.map((signal, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-500" />
                  {signal}
                </li>
              ))}
            </ul>
          )}

          <p className="lg:hidden text-center mt-6 text-xs text-slate-400">
            &copy; {new Date().getFullYear()} ApplyRight. All rights reserved.
          </p>
        </div>
      </main>
    </motion.div>
  );
};

// Default value-prop set used by both pages (Register can override).
export const DEFAULT_VALUE_PROPS = [
  {
    icon: <Zap className="w-4 h-4" />,
    title: 'AI tailors every CV to a specific job',
    body: 'Optimized bullets and keywords in 30-60 seconds, not hours.',
  },
  {
    icon: <Sparkles className="w-4 h-4" />,
    title: 'Score your fit before you apply',
    body: "Get a clear match score and the gaps you'd want to address.",
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    title: 'You own your data',
    body: 'Your resume stays yours — encrypted, never sold.',
  },
];

export default AuthShell;
