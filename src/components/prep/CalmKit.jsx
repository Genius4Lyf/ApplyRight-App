import React, { useEffect, useState } from 'react';
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
  { key: 'inhale', label: 'Breathe in', secs: 4 },
  { key: 'hold', label: 'Hold', secs: 7 },
  { key: 'exhale', label: 'Breathe out', secs: 8 },
];

export const BreathingExercise = ({ compact = false }) => {
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
          className="rounded-full bg-gradient-to-br from-indigo-400/30 to-violet-400/30 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center"
          style={{
            width: compact ? 110 : 140,
            height: compact ? 110 : 140,
            transform: `scale(${running ? target : 0.7})`,
            transitionProperty: 'transform',
            transitionTimingFunction: 'ease-in-out',
            transitionDuration: `${running ? step.secs : 0.6}s`,
          }}
        >
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            {running ? step.label : 'Ready'}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
        {running ? `Cycle ${cycles + 1} · 4-7-8 breathing` : '4-7-8 breathing · aim for 3–4 rounds'}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => (running ? setRunning(false) : setRunning(true))}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
        >
          {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Pause' : cycles > 0 ? 'Resume' : 'Start breathing'}
        </button>
        {(running || cycles > 0) && (
          <button
            type="button"
            onClick={reset}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

const CHECKLIST = [
  'Outfit picked and ready (one step above the team)',
  'Route / link tested — know exactly how you’ll arrive or log in',
  'Two or three Stories fresh in your mind',
  'A few questions ready to ask them',
  'Good night’s sleep + water — you think clearer rested',
];

// Full game-day panel: breathing + reframe + visualization + night-before list.
const CalmKit = () => {
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
      <section className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-5 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl"
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Wind className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Settle your nerves
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Slow, paced breathing lowers your heart rate and steadies your voice. Do this in the
            lobby or just before you join.
          </p>
          <BreathingExercise />
        </div>
      </section>

      {/* Reframe + Visualization */}
      <div className="grid sm:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-amber-100 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/15 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Reframe the nerves
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Tell yourself{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">“I’m excited”</span>,
            not “I’m nervous.” It’s the same racing heart — but candidates who relabel it as
            excitement perform measurably better. The adrenaline is on your side.
          </p>
        </section>
        <section className="rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/15 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Picture it going well
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Take 20 seconds: see yourself walking in, a warm greeting, answering the first question
            calmly and clearly. Rehearsing success quiets the part of your brain that rehearses
            disaster.
          </p>
        </section>
      </div>

      {/* Night-before checklist */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">The night before</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Decide everything tonight so the morning has zero stress to add.
        </p>
        <ul className="space-y-2">
          {CHECKLIST.map((item, i) => {
            const on = checked.has(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="w-full flex items-start gap-2.5 text-left group"
                >
                  {on ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-xs leading-relaxed ${on ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    {item}
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
