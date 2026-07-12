import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bot, Check, FileText } from 'lucide-react';

/**
 * FeatureVignettes — small, flat, representative product UIs for the Advanced
 * Features rows. They reuse motifs already established in the hero + ledger
 * (waveform, diff bars, chips, a document) and stay deliberately lightweight —
 * indigo accent, slate neutrals, hairline borders, semantic colour sparingly.
 */

const CARD = 'rounded-lg border border-slate-200 bg-white p-5 shadow-clean';

/* 1 — Grounded STAR Story Bank */
const STAR = [
  { k: 'S', t: 'Team missed Q3 targets after two key exits.' },
  { k: 'T', t: 'Own the regional turnaround plan.' },
  { k: 'A', t: 'Rebuilt the pipeline and re-trained the team.' },
  { k: 'R', t: 'Beat target by 42% the next quarter.' },
];

export const StarStoryVignette = () => (
  <div className={CARD}>
    <div className="mb-4 flex items-center justify-between">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">
        STAR story
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[0.56rem] font-medium uppercase tracking-wider text-emerald-600">
        <Check size={11} /> Verified
      </span>
    </div>
    <div className="flex flex-col gap-2.5">
      {STAR.map((row) => (
        <div key={row.k} className="flex items-start gap-2.5">
          <span className="grid h-5 w-5 flex-none place-items-center rounded bg-indigo-600 font-mono text-[0.6rem] font-bold text-white">
            {row.k}
          </span>
          <p className="text-[0.8rem] leading-snug text-slate-700">{row.t}</p>
        </div>
      ))}
    </div>
  </div>
);

/* 2 — Interactive Voice Interview Mode (reuses the hero interview motif) */
const WAVE = [0.4, 0.7, 0.9, 0.5, 0.85, 0.35, 0.75, 0.55, 0.9, 0.45, 0.7, 0.3];

export const VoiceInterviewVignette = () => {
  const reduce = useReducedMotion();
  return (
    <div className={`${CARD} flex flex-col gap-4`}>
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-indigo-600 text-white">
          <Bot size={16} />
        </span>
        <div>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-slate-400">
            Interviewer · ApplyRight AI
          </p>
          <p className="text-[0.85rem] leading-snug text-slate-800">
            &ldquo;Walk me through a decision you got wrong.&rdquo;
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="flex h-8 items-end gap-1">
        {WAVE.map((h, i) => (
          <motion.i
            key={i}
            className="flex-1 rounded-[2px] bg-indigo-600"
            style={{ transformOrigin: 'bottom', height: `${h * 100}%` }}
            initial={false}
            animate={reduce ? { scaleY: 1 } : { scaleY: [0.3, 1, 0.3] }}
            transition={
              reduce
                ? undefined
                : { duration: 1.1, ease: 'easeInOut', repeat: Infinity, delay: i * 0.07 }
            }
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-slate-400">
          Confidence
        </span>
        <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-indigo-800">
          High
        </span>
      </div>
    </div>
  );
};

/* 3 — The 10-Minute Pre-Call Brief (mini print cram sheet) */
const BRIEF = [
  'Top 3 STAR stories ready',
  'Weakest 2 questions to review',
  'Skills to highlight & questions to ask',
];

export const PreCallBriefVignette = () => (
  <div className={CARD}>
    <div className="mb-4 flex items-center justify-between">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">
        Pre-call brief
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-slate-600">
        <FileText size={11} /> Save PDF
      </span>
    </div>
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <span className="font-heading text-3xl font-bold tabular-nums text-indigo-800">82</span>
      <span className="font-mono text-[0.55rem] uppercase tracking-wide text-slate-400">/100</span>
      <span className="ml-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-slate-400">
        Readiness
      </span>
    </div>
    <ul className="mt-4 flex flex-col gap-2">
      {BRIEF.map((item) => (
        <li key={item} className="flex items-start gap-2 text-[0.8rem] leading-snug text-slate-600">
          <span className="mt-1 h-1.5 w-1.5 flex-none rounded-[1px] bg-indigo-600" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

/* 4 — CV Comparison Studio (mini side-by-side diff, reuses the ATS-bar motif) */
const DIMS = [
  { label: 'Keyword match', b: 94 },
  { label: 'Impact & metrics', b: 88 },
  { label: 'Skills coverage', b: 90 },
];

export const CvCompareVignette = () => (
  <div className={CARD}>
    <p className="mb-4 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">
      CV A vs CV B
    </p>
    <div className="mb-4 grid grid-cols-2 gap-3">
      <div className="rounded border border-slate-200 bg-slate-50 p-3 text-center">
        <p className="font-mono text-[0.55rem] uppercase tracking-wider text-slate-400">CV A</p>
        <p className="font-heading text-2xl font-bold tabular-nums text-slate-500">78</p>
      </div>
      <div className="rounded border border-indigo-200 bg-indigo-50 p-3 text-center">
        <p className="font-mono text-[0.55rem] uppercase tracking-wider text-indigo-800">CV B</p>
        <p className="font-heading text-2xl font-bold tabular-nums text-indigo-800">91</p>
      </div>
    </div>
    <div className="flex flex-col gap-2.5">
      {DIMS.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between font-mono text-[0.56rem] uppercase tracking-wide text-slate-400">
            <span>{d.label}</span>
            <span className="text-indigo-800">{d.b}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-indigo-600"
              style={{ width: `${d.b}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);
