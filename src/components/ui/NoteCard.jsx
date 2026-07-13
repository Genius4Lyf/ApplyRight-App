import React, { useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { BAND_TEXT, BAND_RULEBG, NEXT_TONE, RULED_PAPER } from '../../lib/noteStyles';

// Small colored tag styles keyed by tone, for the optional title chip.
const CHIP_TONE = {
  accent: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  ok: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  warn: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
  bad: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300',
  neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

/**
 * Reusable paper-note content — the inner markup that sits inside CardDeck's
 * PAPER_CARD wrapper (spiral binding, band margin rule, score stamp, header,
 * ruled verdict, band rail, dashed footer). It does NOT set the card
 * background/border/shadow — that stays on CardDeck's cardClassName.
 *
 * Owns the tap-vs-drag guard: because it lives on a swipeable deck front card, a
 * click can fire after a drag, so a near-stationary release (≤8px) is treated as
 * an "open" tap and anything larger is ignored.
 *
 * @param {{
 *   band: 'ok'|'warn'|'bad'|'neutral',
 *   stamp: { value: number|string, label: string, sub?: string },
 *   eyebrow: string,
 *   title: string,
 *   chip?: { label: string, tone: 'accent'|'ok'|'warn'|'bad'|'neutral' },
 *   verdict?: string,
 *   nextMove: { label: string, tone: 'accent'|'ok'|'warn'|'bad'|'neutral', Icon: React.ComponentType<any> },
 *   openLabel?: string,
 *   onOpen: () => void,
 * }} props
 */
export default function NoteCard({
  band = 'neutral',
  stamp,
  eyebrow,
  title,
  chip,
  verdict,
  nextMove,
  openLabel = 'Open',
  onOpen,
}) {
  const pressRef = useRef({ x: 0, y: 0 });
  const handlePointerDown = (e) => {
    pressRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleClick = (e) => {
    const dx = Math.abs(e.clientX - pressRef.current.x);
    const dy = Math.abs(e.clientY - pressRef.current.y);
    if (dx > 8 || dy > 8) return; // was a swipe/drag, not a tap
    onOpen?.();
  };

  const NextIcon = nextMove?.Icon;

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label={`Open ${title}`}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className="cursor-pointer select-none"
    >
      {/* a. Spiral binding */}
      <div
        aria-hidden="true"
        className="flex items-center gap-4 px-6 h-[26px] border-b border-slate-100 dark:border-slate-700 bg-gradient-to-b from-slate-100/70 dark:from-slate-900/40 to-transparent"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="h-[9px] w-[9px] rounded-full bg-slate-50 dark:bg-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,.25)]"
          />
        ))}
      </div>

      {/* b. Body */}
      <div className="relative px-6 pl-10 py-5">
        {/* Margin rule */}
        <div
          aria-hidden="true"
          className={`absolute top-3.5 bottom-4 left-6 w-0.5 rounded opacity-40 ${BAND_RULEBG[band]}`}
        />

        {/* Score stamp */}
        <div className="absolute top-4 right-6 text-right">
          <div
            className={`font-heading text-[40px] leading-[.86] font-bold tabular-nums ${BAND_TEXT[band]}`}
          >
            {typeof stamp?.value === 'number' ? (
              <>
                {stamp.value}
                <span className="text-[22px]">%</span>
              </>
            ) : (
              stamp?.value
            )}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {stamp?.label}
          </div>
          {stamp?.sub && (
            <div className="mt-1 text-[11px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {stamp.sub}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="pr-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 truncate">
            {eyebrow}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-[22px] font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {title}
            </h3>
            {chip && (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  CHIP_TONE[chip.tone] || CHIP_TONE.neutral
                }`}
              >
                {chip.label}
              </span>
            )}
          </div>
        </div>

        {/* Verdict on ruled paper */}
        {verdict && (
          <p
            className="mt-4 font-heading text-[16px] leading-[28px] text-slate-800 dark:text-slate-200 line-clamp-3"
            style={RULED_PAPER}
          >
            {verdict}
          </p>
        )}

        {/* Band rail */}
        <div aria-hidden="true" className="mt-4 grid h-1.5 grid-cols-[45fr_30fr_25fr] gap-0.5">
          <span className="rounded-sm bg-rose-500/50" />
          <span className="rounded-sm bg-amber-500/50" />
          <span className="rounded-sm bg-emerald-500/50" />
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 dark:border-slate-700 pt-4">
          <span
            className={`inline-flex items-center gap-2 text-sm font-semibold min-w-0 ${NEXT_TONE[nextMove?.tone] || NEXT_TONE.neutral}`}
          >
            {NextIcon && <NextIcon className="h-4 w-4 shrink-0" />}
            <span className="truncate">{nextMove?.label}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            {openLabel}
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
