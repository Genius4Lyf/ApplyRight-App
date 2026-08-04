import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { bubbleAnim } from '../../lib/ariaMotion';
import { SECTION_RESEARCH } from '../../lib/sectionResearch';
import AriaOrbit from './AriaOrbit';

// A chip-triggered "what research says" lecture — rendered as a NORMAL Aria message
// (orbit slot + slate bubble), not a dropdown. Given a `section` id, it reads the curated
// entry from SECTION_RESEARCH and lays out the structured content inside the bubble:
// eyebrow → thesis → research-backed rule bullets → a before→after (or example) pull
// block → a source micro-line. Content is trusted static markup, so `points` render
// via dangerouslySetInnerHTML to show their <b> emphasis.
const ResearchCard = ({ section }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const shape = SECTION_RESEARCH[section];
  if (!shape) return null;

  const base = `cvBuilder.sectionResearch.${section}`;
  const eyebrow = t(`${base}.eyebrow`);
  const thesis = t(`${base}.thesis`);
  const points = Array.from({ length: shape.pointCount }, (_, i) => t(`${base}.points.${i}`));
  const before = shape.hasBeforeAfter ? t(`${base}.before`) : null;
  const after = shape.hasBeforeAfter ? t(`${base}.after`) : null;
  const example = shape.hasExample ? t(`${base}.example`) : null;
  const source = t(`${base}.source`);

  return (
    <motion.div
      className="aria-row self-start max-w-[92%] flex items-start gap-2"
      {...bubbleAnim('aria', reduce)}
    >
      <AriaOrbit size={16} className="aria-mark mt-2" />
      <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-tl-md px-3.5 py-3 flex flex-col gap-2.5">
        {/* Eyebrow. */}
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {shape.icon} {t('cvBuilder.researchCard.whatResearchSays')} · {eyebrow}
        </span>

        {/* Thesis — the one-line takeaway, in the editorial serif. */}
        <p className="font-serif text-[14px] leading-snug text-slate-800 dark:text-slate-100">
          {thesis}
        </p>

        {/* The research-backed rules. */}
        <ul className="flex flex-col gap-1.5">
          {points.map((pt, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-[7px] shrink-0 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500" />
              <span
                className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 [&_b]:font-semibold [&_b]:text-slate-800 dark:[&_b]:text-slate-100"
                // Trusted static content from the locale files — enables <b>.
                dangerouslySetInnerHTML={{ __html: pt }}
              />
            </li>
          ))}
        </ul>

        {/* Pull block — a before→after contrast, else a single positive example. */}
        {before || after ? (
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800/60 px-3 py-2.5 flex flex-col gap-1.5">
            {before && (
              <p className="flex items-start gap-2 text-[12px] leading-relaxed text-rose-600/90 dark:text-rose-400/90">
                <span className="mt-px shrink-0 font-semibold">✗</span>
                <span className="line-through decoration-rose-400/50">{before}</span>
              </p>
            )}
            {after && (
              <p className="flex items-start gap-2 text-[12px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                <span className="mt-px shrink-0 font-semibold">✓</span>
                <span>{after}</span>
              </p>
            )}
          </div>
        ) : example ? (
          <div className="rounded-xl bg-slate-900 dark:bg-white px-3.5 py-3">
            <p className="flex items-start gap-2 text-[12.5px] font-medium leading-relaxed text-white dark:text-slate-900">
              <span className="mt-px shrink-0 font-semibold">✓</span>
              <span>{example}</span>
            </p>
          </div>
        ) : null}

        {/* Source micro-line. */}
        <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {source}
        </p>
      </div>
    </motion.div>
  );
};

export default ResearchCard;
