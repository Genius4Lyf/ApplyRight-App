import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * LiveInterviewCard — the hero's right-hand product panel.
 * A crisp flat-white UI: hairline border, thin indigo top rule, the AI
 * interviewer avatar, the live question, an animated indigo waveform and a
 * Readiness meter. No gradients / glows — flat brand indigo only.
 */

// Bar heights (as a fraction of the 50px track) so the waveform reads organic,
// not a uniform equalizer. Delays stagger the wobble.
const WAVE_BARS = [
  { h: 0.35, d: 0 },
  { h: 0.6, d: 0.1 },
  { h: 0.85, d: 0.25 },
  { h: 0.5, d: 0.05 },
  { h: 0.95, d: 0.3 },
  { h: 0.4, d: 0.15 },
  { h: 0.7, d: 0.35 },
  { h: 0.55, d: 0.2 },
  { h: 0.9, d: 0.4 },
  { h: 0.45, d: 0.12 },
  { h: 0.75, d: 0.28 },
  { h: 0.35, d: 0.06 },
  { h: 0.65, d: 0.33 },
  { h: 0.5, d: 0.18 },
  { h: 0.8, d: 0.24 },
];

const LiveInterviewCard = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  return (
    <div
      aria-label={t('landing.interviewCard.aria')}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_12px_34px_-18px_rgba(15,23,42,0.28)]"
    >
      {/* Thin indigo top rule */}
      <div className="h-[3px] bg-indigo-600" />

      <div className="flex flex-col gap-5 p-6 sm:p-7">
        {/* Live · seat */}
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.13em] text-emerald-600">
            <span className="relative flex h-2 w-2">
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-600 opacity-60" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            {t('landing.interviewCard.live')}
          </span>
          <span className="font-mono text-[0.64rem] tracking-[0.06em] text-slate-400">
            {t('landing.interviewCard.seat')}
          </span>
        </div>

        {/* Question, led by the AI interviewer */}
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-[34px] w-[34px] flex-none place-items-center rounded-lg bg-indigo-600 text-white"
          >
            <Bot size={20} strokeWidth={2} />
          </span>
          <div>
            <p className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-slate-400">
              {t('landing.interviewCard.interviewer')}
            </p>
            <p className="text-[1.05rem] leading-snug text-slate-900">
              {t('landing.interviewCard.question')}
            </p>
          </div>
        </div>

        {/* Waveform */}
        <div aria-hidden="true" className="flex h-[50px] items-end gap-1">
          {WAVE_BARS.map((bar, i) => (
            <motion.i
              key={i}
              className="flex-1 rounded-[2px] bg-indigo-600"
              style={{ transformOrigin: 'bottom', height: `${bar.h * 100}%` }}
              initial={false}
              animate={reduce ? { scaleY: 1 } : { scaleY: [0.28, 1, 0.28] }}
              transition={
                reduce
                  ? undefined
                  : {
                      duration: 1.1,
                      ease: 'easeInOut',
                      repeat: Infinity,
                      delay: bar.d,
                    }
              }
            />
          ))}
        </div>

        {/* Readiness meter */}
        <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
          <span className="font-mono text-[0.64rem] uppercase tracking-[0.1em] text-slate-400">
            {t('landing.interviewCard.readiness')}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <motion.i
              className="block h-full rounded-full bg-indigo-600"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: '82%' }}
              transition={reduce ? undefined : { duration: 1, ease: 'easeOut', delay: 0.7 }}
            />
          </span>
          <span className="font-mono font-bold tabular-nums text-indigo-800">82%</span>
        </div>
      </div>
    </div>
  );
};

export default LiveInterviewCard;
