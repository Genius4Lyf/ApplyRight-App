import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronDown, Check, ArrowRight } from 'lucide-react';

// The live page-length badge, upgraded into a tappable coach. On the resume tab it
// explains the current length and (for 2+ pages) offers one-tap LAYOUT trims that
// drive the shared `design` state — the preview re-flows and the badge re-counts
// live. On the cover-letter tab it degrades to a plain, non-interactive chip
// (page coaching is resume-only). Editorial styling: flat hairline card, font-mono
// eyebrow, font-heading verdict — no gradients/glows.

const CV_HEALTH_ROUTE = '/cv-health'; // the "healthy CV" guide
const CV_HEALTH_LENGTH_ROUTE = '/cv-health#length'; // deep-links to the length section
const POPOVER_WIDTH = 280;

// Emerald → amber → rose, keyed by page count (1 / 2 / 3+).
const TONE = {
  1: {
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  2: {
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-500',
  },
  3: {
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-500/30',
    dot: 'bg-rose-500',
  },
};

const chipLabel = (pageCount, paperLabel) => {
  if (pageCount === 1) return `${paperLabel} · Fits 1 page`;
  if (pageCount === 2) return `${paperLabel} · 2 pages`;
  return `${paperLabel} · ${pageCount} pages`;
};

// Compact label for small screens — drops the "{paperLabel} · " prefix.
const countLabel = (pageCount) => `${pageCount} page${pageCount === 1 ? '' : 's'}`;

// Muted eyebrow → editorial micro-label.
const Eyebrow = ({ children }) => (
  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
    {children}
  </p>
);

const GuideLink = ({ to, children }) => (
  <Link
    to={to}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
  >
    {children} <ArrowRight className="w-3 h-3" />
  </Link>
);

// One-tap layout toggle: active = filled indigo, inactive = hairline chip.
const FixButton = ({ active, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`inline-flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
      active
        ? 'border-transparent bg-indigo-600 text-white'
        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
    }`}
  >
    <span>{label}</span>
    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
  </button>
);

const LengthCoach = ({ pageCount, paperLabel, design, setDesign, activeTab }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: POPOVER_WIDTH });
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const isResume = activeTab === 'resume';

  // Position + clamp the popover into the viewport so it never causes horizontal
  // page scroll. Portaled to <body> with fixed positioning, so coords are pure
  // viewport space (no ancestor stacking context can cover/clip it). The toolbar is
  // sticky, so the chip moves as the preview scrolls — reposition on scroll too.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const btnRect = btn.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      // Full-bleed-ish on phones (8px gutters), fixed 280 on desktop.
      const w = vw < 640 ? vw - 16 : POPOVER_WIDTH;
      const left =
        vw < 640 ? 8 : Math.max(8, Math.min(btnRect.left + btnRect.width / 2 - w / 2, vw - w - 8));
      setPos({ top: btnRect.bottom + 8, left, width: w });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // Close on outside-click and Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e) => {
      // The popover is portaled outside wrapRef — treat clicks inside EITHER the
      // button wrapper or the popover as "inside" so it doesn't close on its own
      // fix buttons.
      if (wrapRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  // Cover-letter tab: a plain, non-interactive chip. No coaching, no popover.
  if (!isResume) {
    return (
      <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1 shrink-0">
        PDF · {paperLabel}
      </span>
    );
  }

  const tone = TONE[Math.min(pageCount, 3)] || TONE[1];
  const densityCompact = design.density === 'compact';
  const marginsNarrow = design.margins === 'narrow';

  const toggleDensity = () =>
    setDesign((d) => ({ ...d, density: d.density === 'compact' ? 'normal' : 'compact' }));
  const toggleMargins = () =>
    setDesign((d) => ({ ...d, margins: d.margins === 'narrow' ? 'normal' : 'narrow' }));

  const fixes = (
    <div className="mt-3 flex flex-col gap-2">
      <FixButton active={densityCompact} onClick={toggleDensity} label="Compact density" />
      <FixButton active={marginsNarrow} onClick={toggleMargins} label="Narrow margins" />
    </div>
  );

  return (
    <div ref={wrapRef} className="relative inline-flex shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] rounded-full border px-2.5 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${tone.text} ${tone.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
        {/* Compact "N page(s)" on phones; full "{paper} · verdict" from sm up. */}
        <span className="sm:hidden">{countLabel(pageCount)}</span>
        <span className="hidden sm:inline">{chipLabel(pageCount, paperLabel)}</span>
        {pageCount >= 2 && <ChevronDown className="w-3 h-3" />}
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Page length coach"
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-[200] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-lg text-left normal-case"
          >
            {pageCount === 1 ? (
              <>
                <Eyebrow>Page length</Eyebrow>
                <h3 className="mt-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                  Perfect length.
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Crisp and easy to scan — nothing to change.
                </p>
                <div className="mt-3">
                  <GuideLink to={CV_HEALTH_ROUTE}>What makes a great CV?</GuideLink>
                </div>
              </>
            ) : pageCount === 2 ? (
              <>
                <Eyebrow>Page length</Eyebrow>
                <h3 className="mt-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                  Two pages is fine.
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Standard for roles with 5+ years&rsquo; experience. Want one page? Optional trims:
                </p>
                {fixes}
                <div className="mt-3">
                  <GuideLink to={CV_HEALTH_LENGTH_ROUTE}>Why 1&ndash;2 pages?</GuideLink>
                </div>
              </>
            ) : (
              <>
                <Eyebrow>Page length</Eyebrow>
                <h3 className="mt-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                  Long for a CV.
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Most recruiters prefer 1&ndash;2 pages and skim in seconds.
                </p>
                <div className="mt-3">
                  <Eyebrow>Trim a page</Eyebrow>
                </div>
                {fixes}
                <div className="mt-3">
                  <GuideLink to={CV_HEALTH_LENGTH_ROUTE}>Why 1&ndash;2 pages?</GuideLink>
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default LengthCoach;
