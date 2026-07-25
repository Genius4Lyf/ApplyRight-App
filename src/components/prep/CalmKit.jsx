import React, { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Wind, Sparkles, Eye, CheckCircle2, Circle, Play, Pause } from 'lucide-react';

// Calm-the-nerves toolkit — evidence-based, frontend-only (no AI, no credits).
// Interview anxiety affects ~92% of candidates; the techniques here (paced
// breathing, reframing arousal as excitement, success visualization, and
// practical night-before prep) are the proven, lightweight remedies.

// ── 4-7-8 paced breathing ──
// Inhale 4s → hold 7s → exhale 8s. The circle grows on the inhale, holds, then
// shrinks on the exhale, so the user can breathe to the animation without
// watching a counter. Exported so Interview Mode can reuse it as a pre-interview
// centering step.
const BREATH_STEPS = [
  { key: 'inhale', labelKey: 'interviewPrep.calmKit.breath.inhale', secs: 4 },
  { key: 'hold', labelKey: 'interviewPrep.calmKit.breath.hold', secs: 7 },
  { key: 'exhale', labelKey: 'interviewPrep.calmKit.breath.exhale', secs: 8 },
];

export const BreathingExercise = ({ compact = false }) => {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [cycles, setCycles] = useState(0);

  // Advance through inhale → hold → exhale on each step's duration.
  useEffect(() => {
    if (!running) return undefined;
    const ms = BREATH_STEPS[stepIdx].secs * 1000;
    const id = setTimeout(() => {
      setStepIdx((i) => {
        const next = (i + 1) % BREATH_STEPS.length;
        if (next === 0) setCycles((c) => c + 1);
        return next;
      });
    }, ms);
    return () => clearTimeout(id);
  }, [running, stepIdx]);

  const step = BREATH_STEPS[stepIdx];
  // inhale/hold sit at full size; exhale shrinks. transitionDuration matches the
  // step length so the scale change paces the breath.
  const target = step.key === 'exhale' ? 0.55 : 1;

  const reset = () => {
    setRunning(false);
    setStepIdx(0);
    setCycles(0);
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className={`relative flex items-center justify-center ${compact ? 'h-36' : 'h-44'}`}>
        <div
          className="rounded-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-center"
          style={{
            width: compact ? 110 : 140,
            height: compact ? 110 : 140,
            transform: `scale(${running ? target : 0.7})`,
            transitionProperty: 'transform',
            transitionTimingFunction: 'ease-in-out',
            transitionDuration: `${running ? step.secs : 0.6}s`,
          }}
        >
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {running ? t(step.labelKey) : t('interviewPrep.calmKit.ready')}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
        {running
          ? t('interviewPrep.calmKit.cycle', { n: cycles + 1 })
          : t('interviewPrep.calmKit.breathHint')}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => (running ? setRunning(false) : setRunning(true))}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold transition-colors"
        >
          {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {running
            ? t('interviewPrep.calmKit.pause')
            : cycles > 0
              ? t('interviewPrep.calmKit.resume')
              : t('interviewPrep.calmKit.start')}
        </button>
        {(running || cycles > 0) && (
          <button
            type="button"
            onClick={reset}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            {t('interviewPrep.calmKit.reset')}
          </button>
        )}
      </div>
    </div>
  );
};

const CHECKLIST_KEYS = [
  'interviewPrep.calmKit.checklist.0',
  'interviewPrep.calmKit.checklist.1',
  'interviewPrep.calmKit.checklist.2',
  'interviewPrep.calmKit.checklist.3',
  'interviewPrep.calmKit.checklist.4',
];

// Full game-day panel: breathing + reframe + visualization + night-before list.
const CalmKit = () => {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(() => new Set());
  const toggle = (i) =>
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="space-y-4">
      {/* Breathing */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Wind className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('interviewPrep.calmKit.settleHeading')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {t('interviewPrep.calmKit.settleDesc')}
          </p>
          <BreathingExercise />
        </div>
      </section>

      {/* Reframe + Visualization */}
      <div className="grid sm:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('interviewPrep.calmKit.reframeHeading')}
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <Trans
              i18nKey="interviewPrep.calmKit.reframeBody"
              components={{ b: <span className="font-semibold text-slate-800 dark:text-slate-200" /> }}
            />
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Eye className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('interviewPrep.calmKit.pictureHeading')}
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('interviewPrep.calmKit.pictureBody')}
          </p>
        </section>
      </div>

      {/* Night-before checklist */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t('interviewPrep.calmKit.nightHeading')}
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {t('interviewPrep.calmKit.nightDesc')}
        </p>
        <ul className="space-y-2">
          {CHECKLIST_KEYS.map((itemKey, i) => {
            const on = checked.has(i);
            return (
              <li key={itemKey}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="w-full flex items-start gap-2.5 text-left group"
                >
                  {on ? (
                    <CheckCircle2 className="w-4 h-4 text-slate-900 dark:text-white shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-xs leading-relaxed ${on ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    {t(itemKey)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

export default CalmKit;
