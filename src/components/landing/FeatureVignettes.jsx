import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bot, Check, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * FeatureVignettes — small, flat, representative product UIs for the Advanced
 * Features rows. They reuse motifs already established in the hero + ledger
 * (waveform, diff bars, chips, a document) and stay deliberately lightweight —
 * indigo accent, slate neutrals, hairline borders, semantic colour sparingly.
 *
 * StarStory / PreCallBrief / CvCompare are currently unmounted: the landing page
 * leads with Aria Studio, the live interview, the builder panel and CV Studio.
 * Those three features still exist in the product, so the vignettes stay here
 * ready to rotate back into FEATURES rather than being deleted.
 */

const CARD = 'rounded-lg border border-slate-200 bg-white p-5 shadow-clean';

/* 1 — Grounded STAR Story Bank */
// Keys, not literals — a module constant would freeze at import language.
const STAR = [
  { k: 'S', key: 'landing.vignettes.starS' },
  { k: 'T', key: 'landing.vignettes.starT' },
  { k: 'A', key: 'landing.vignettes.starA' },
  { k: 'R', key: 'landing.vignettes.starR' },
];

export const StarStoryVignette = () => {
  const { t } = useTranslation();
  return (
    <div className={CARD}>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">
          {t('landing.vignettes.starLabel')}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[0.56rem] font-medium uppercase tracking-wider text-emerald-600">
          <Check size={11} /> {t('landing.vignettes.verified')}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {STAR.map((row) => (
          <div key={row.k} className="flex items-start gap-2.5">
            <span className="grid h-5 w-5 flex-none place-items-center rounded bg-indigo-600 font-mono text-[0.6rem] font-bold text-white">
              {row.k}
            </span>
            <p className="text-[0.8rem] leading-snug text-slate-700">{t(row.key)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 2 — Interactive Voice Interview Mode (reuses the hero interview motif) */
const WAVE = [0.4, 0.7, 0.9, 0.5, 0.85, 0.35, 0.75, 0.55, 0.9, 0.45, 0.7, 0.3];

export const VoiceInterviewVignette = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  return (
    <div className={`${CARD} flex flex-col gap-4`}>
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-indigo-600 text-white">
          <Bot size={16} />
        </span>
        <div>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-slate-400">
            {t('landing.interviewCard.interviewer')}
          </p>
          <p className="text-[0.85rem] leading-snug text-slate-800">
            {t('landing.vignettes.voiceQuestion')}
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
          {t('landing.vignettes.confidence')}
        </span>
        <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-indigo-800">
          {t('landing.vignettes.confidenceHigh')}
        </span>
      </div>
    </div>
  );
};

/* 3 — The 10-Minute Pre-Call Brief (mini print cram sheet) */
const BRIEF = ['landing.vignettes.brief1', 'landing.vignettes.brief2', 'landing.vignettes.brief3'];

export const PreCallBriefVignette = () => {
  const { t } = useTranslation();
  return (
    <div className={CARD}>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">
          {t('landing.vignettes.briefLabel')}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-slate-600">
          <FileText size={11} /> {t('landing.vignettes.savePdf')}
        </span>
      </div>
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="font-heading text-3xl font-bold tabular-nums text-indigo-800">82</span>
        <span className="font-mono text-[0.55rem] uppercase tracking-wide text-slate-400">
          /100
        </span>
        <span className="ml-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-slate-400">
          {t('landing.interviewCard.readiness')}
        </span>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {BRIEF.map((key) => (
          <li
            key={key}
            className="flex items-start gap-2 text-[0.8rem] leading-snug text-slate-600"
          >
            <span className="mt-1 h-1.5 w-1.5 flex-none rounded-[1px] bg-indigo-600" />
            {t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
};

/* 5 — Aria Studio (per-section verdict bands + the overall fit number) */
// Band colour carries the verdict, matching the studio's red/amber/green rail.
const STUDIO_SECTIONS = [
  {
    key: 'landing.vignettes.studioSecSummary',
    verdict: 'landing.vignettes.verdictStrong',
    tone: 'ok',
    w: 92,
  },
  {
    key: 'landing.vignettes.studioSecExperience',
    verdict: 'landing.vignettes.verdictStrong',
    tone: 'ok',
    w: 86,
  },
  {
    key: 'landing.vignettes.studioSecSkills',
    verdict: 'landing.vignettes.verdictFix',
    tone: 'warn',
    w: 58,
  },
  {
    key: 'landing.vignettes.studioSecProjects',
    verdict: 'landing.vignettes.verdictGap',
    tone: 'bad',
    w: 24,
  },
];

const BAND = {
  ok: { bar: 'bg-emerald-500', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  warn: { bar: 'bg-amber-500', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
  bad: { bar: 'bg-rose-500', chip: 'border-rose-200 bg-rose-50 text-rose-700' },
};

export const AriaStudioVignette = () => {
  const { t } = useTranslation();
  return (
    <div className={CARD}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">
          {t('landing.vignettes.studioLabel')}
        </span>
        <span className="truncate rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-slate-600">
          {t('landing.vignettes.studioJob')}
        </span>
      </div>
      <div className="mb-4 flex items-baseline gap-2 border-b border-slate-100 pb-4">
        <span className="font-heading text-3xl font-bold tabular-nums text-indigo-800">87</span>
        <span className="font-mono text-[0.55rem] uppercase tracking-wide text-slate-400">
          /100
        </span>
        <span className="ml-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-slate-400">
          {t('landing.vignettes.studioFit')}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {STUDIO_SECTIONS.map((s) => (
          <div key={s.key} className="flex items-center gap-3">
            <span className="w-20 flex-none font-mono text-[0.58rem] uppercase tracking-wide text-slate-500">
              {t(s.key)}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span
                className={`block h-full rounded-full ${BAND[s.tone].bar}`}
                style={{ width: `${s.w}%` }}
              />
            </div>
            <span
              className={`w-16 flex-none rounded border px-1.5 py-0.5 text-center font-mono text-[0.52rem] uppercase tracking-wider ${BAND[s.tone].chip}`}
            >
              {t(s.verdict)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 6 — Ask Aria in the CV Builder (the three-tab coach panel) */
const ASK_TABS = [
  'landing.vignettes.askTabAria',
  'landing.vignettes.askTabHealth',
  'landing.vignettes.askTabMatch',
];

export const AskAriaVignette = () => {
  const { t } = useTranslation();
  return (
    <div className={CARD}>
      <div className="-mx-1 mb-4 flex gap-1 border-b border-slate-100 pb-3">
        {ASK_TABS.map((key, i) => (
          <span
            key={key}
            className={`rounded px-2 py-1 font-mono text-[0.58rem] uppercase tracking-wide ${
              i === 0 ? 'bg-slate-900 text-white' : 'text-slate-400'
            }`}
          >
            {t(key)}
          </span>
        ))}
      </div>
      <div className="mb-4 flex items-start gap-2.5">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-indigo-600 text-white">
          <Bot size={14} />
        </span>
        <p className="text-[0.8rem] leading-snug text-slate-700">
          {t('landing.vignettes.askAriaMsg')}
        </p>
      </div>
      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <span className="font-heading text-2xl font-bold tabular-nums text-slate-900">74</span>
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-slate-400">
          {t('landing.vignettes.askHealthLabel')}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-emerald-600">
          <Check size={11} /> {t('landing.vignettes.askFreeChip')}
        </span>
      </div>
    </div>
  );
};

/* 7 — CV Studio (template + the live design controls) */
const SWATCHES = ['bg-slate-900', 'bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-500'];

export const CvStudioVignette = () => {
  const { t } = useTranslation();
  return (
    <div className={CARD}>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">
          {t('landing.vignettes.designLabel')}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-slate-600">
          <FileText size={11} /> {t('landing.vignettes.designLength')}
        </span>
      </div>
      {/* Miniature page — the accent bar is what the swatches below drive. */}
      <div aria-hidden="true" className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
        <span className="mb-2 block h-1.5 w-16 rounded-full bg-indigo-600" />
        <span className="mb-1.5 block h-1 w-full rounded-full bg-slate-200" />
        <span className="mb-1.5 block h-1 w-11/12 rounded-full bg-slate-200" />
        <span className="mb-3 block h-1 w-3/5 rounded-full bg-slate-200" />
        <span className="mb-2 block h-1.5 w-12 rounded-full bg-indigo-600" />
        <span className="mb-1.5 block h-1 w-full rounded-full bg-slate-200" />
        <span className="block h-1 w-4/5 rounded-full bg-slate-200" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.56rem] uppercase tracking-wide text-slate-400">
          {t('landing.vignettes.designAccent')}
        </span>
        <div aria-hidden="true" className="flex gap-1.5">
          {SWATCHES.map((c, i) => (
            <span
              key={c}
              className={`h-4 w-4 rounded-full ${c} ${i === 1 ? 'ring-2 ring-indigo-300 ring-offset-1' : ''}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded border border-slate-200 px-2 py-0.5 font-mono text-[0.56rem] uppercase tracking-wide text-slate-500">
          {t('landing.vignettes.designDensity')} · {t('landing.vignettes.designDensityValue')}
        </span>
        <span className="rounded border border-slate-200 px-2 py-0.5 font-mono text-[0.56rem] uppercase tracking-wide text-slate-500">
          {t('landing.vignettes.designMargins')} · {t('landing.vignettes.designMarginsValue')}
        </span>
      </div>
    </div>
  );
};

/* 4 — CV comparison (mini side-by-side diff, reuses the ATS-bar motif) */
const DIMS = [
  { key: 'landing.vignettes.dimSkills', b: 94 },
  { key: 'landing.vignettes.dimExperience', b: 88 },
  { key: 'landing.vignettes.dimEducation', b: 90 },
];

export const CvCompareVignette = () => {
  const { t } = useTranslation();
  return (
    <div className={CARD}>
      <p className="mb-4 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">
        {t('landing.vignettes.compareLabel')}
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
          <div key={d.key}>
            <div className="mb-1 flex justify-between font-mono text-[0.56rem] uppercase tracking-wide text-slate-400">
              <span>{t(d.key)}</span>
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
};
