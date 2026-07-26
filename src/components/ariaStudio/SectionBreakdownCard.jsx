import React from 'react';
import { useTranslation } from 'react-i18next';
import { BAND_RULEBG } from '../../lib/noteStyles';
import AriaCard from './AriaCard';

// Section-by-section verdict — one row per part of the CV, each with a band dot and a
// plain-English note about what's actually wrong. Non-green rows get a Fix action.
//
// The rows come from the FREE deterministic scan, so they refresh on every recompute
// without costing anything — which is what makes the fix loop viable.
const SectionBreakdownCard = ({
  sections = [],
  onFix,
  onRecompute,
  recomputing,
  onRescan,
  rescanning,
  rescanCost = 10,
}) => {
  const { t } = useTranslation();
  if (!sections.length) return null;

  const needsWork = sections.filter((s) => s.band !== 'ok').length;

  return (
    <AriaCard cardKey="sections">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.sectionBreakdown.heading')}
          </p>
          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
            {needsWork === 0
              ? t('ariaStudio.sectionBreakdown.allClear')
              : t('ariaStudio.sectionBreakdown.toFix', { n: needsWork })}
          </span>
        </div>

        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {sections.map((s) => (
            <li key={s.key} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <span
                className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${BAND_RULEBG[s.band] || 'bg-slate-400'}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {s.label}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                    {s.score}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {s.note}
                </p>
              </div>
              {s.band !== 'ok' && (
                <button
                  type="button"
                  onClick={() => onFix?.(s)}
                  className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {t('ariaStudio.sectionBreakdown.fix')}
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* The two ways forward after a fix. Re-scoring is FREE and deterministic, so
            it's offered plainly; a full re-scan costs, so it's priced on the button.
            Keeping them side by side makes the cheap option the obvious one. */}
        {(onRecompute || onRescan) && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            {onRecompute && (
              <button
                type="button"
                onClick={() => onRecompute()}
                disabled={recomputing || rescanning}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {recomputing
                  ? t('ariaStudio.sectionBreakdown.rescoring')
                  : t('ariaStudio.sectionBreakdown.rescoreFree')}
              </button>
            )}
            {onRescan && (
              <button
                type="button"
                onClick={() => onRescan()}
                disabled={recomputing || rescanning}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
              >
                {rescanning
                  ? t('ariaStudio.sectionBreakdown.rechecking')
                  : t('ariaStudio.sectionBreakdown.recheckScore', { cost: rescanCost })}
              </button>
            )}
          </div>
        )}

        {/* Screen-reader parity for the colour-coded dots — the band is meaning, not
            decoration, so it can't live in colour alone. */}
        <p className="sr-only">
          {sections
            .map((s) =>
              t('ariaStudio.studioArtifactPanel.srSectionLine', {
                label: s.label,
                status:
                  s.band === 'ok'
                    ? t('ariaStudio.studioArtifactPanel.srGood')
                    : s.band === 'warn'
                      ? t('ariaStudio.studioArtifactPanel.srNeedsWork')
                      : t('ariaStudio.studioArtifactPanel.srPoor'),
              })
            )
            .join(' ')}
        </p>
      </div>
    </AriaCard>
  );
};

export default SectionBreakdownCard;
