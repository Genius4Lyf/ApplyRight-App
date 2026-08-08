import React from 'react';
import { useTranslation } from 'react-i18next';
import { BAND_RULEBG } from '../../lib/noteStyles';
import { sectionLabel, sectionNote, isDismissable } from '../../lib/studioFlow';
import AriaCard from './AriaCard';

// Section-by-section verdict — one row per part of the CV, each with a band dot and a
// plain note about what's actually wrong, in the user's language. Non-green rows get a
// Fix action.
//
// Both the name and the note are resolved from locale keys rather than the scan's own
// strings: the server ships a section KEY and a note KEY, and this is where they become
// words. See studioFlow.sectionLabel / sectionNote.
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
  onDismissSection,
  onRestoreSection,
  busy,
}) => {
  const { t } = useTranslation();
  if (!sections.length) return null;

  // A dismissed section comes back banded 'neutral' with a null score. It is not work
  // outstanding — counting it here would keep the "2 to fix" nag alive for a section the
  // user has explicitly opted out of, which is the whole thing dismissing it removes.
  const needsWork = sections.filter((s) => s.band !== 'ok' && s.band !== 'neutral').length;

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
          {sections.map((s) => {
            const dismissed = !!s.dismissed;
            // Nothing to fix on a section that isn't being scored, so no Fix button —
            // it would open a coach loop for a section the user just opted out of.
            const showFix = !dismissed && s.band !== 'ok' && s.band !== 'neutral';
            const canDismiss = !dismissed && !!onDismissSection && isDismissable(s.key);
            return (
              <li key={s.key} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${BAND_RULEBG[s.band] || 'bg-slate-400'}`}
                  aria-hidden="true"
                />
                <div className={`min-w-0 flex-1 ${dismissed ? 'opacity-60' : ''}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                      {sectionLabel(t, s)}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                      {s.score == null ? '—' : s.score}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {sectionNote(t, s)}
                  </p>
                  {/* The way BACK. Dismissing is a preference, not a deletion, so the
                      undo lives on the row it applies to rather than in a settings pane. */}
                  {dismissed && onRestoreSection && (
                    <button
                      type="button"
                      onClick={() => onRestoreSection(s.key)}
                      disabled={busy}
                      className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors disabled:opacity-50"
                    >
                      {t('ariaStudio.sectionBreakdown.includeAgain')}
                    </button>
                  )}
                </div>
                {(showFix || canDismiss) && (
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {showFix && (
                      <button
                        type="button"
                        onClick={() => onFix?.(s)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-900 hover:text-slate-950 dark:hover:border-white dark:hover:text-white transition-colors"
                      >
                        {t('ariaStudio.sectionBreakdown.fix')}
                      </button>
                    )}
                    {/* Deliberately quiet: opting out is the rarer, more considered
                        choice, and it must never outrank actually fixing the section. */}
                    {canDismiss && (
                      <button
                        type="button"
                        onClick={() => onDismissSection(s.key)}
                        disabled={busy}
                        className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                      >
                        {t('ariaStudio.sectionBreakdown.notApplicable')}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* The two ways forward after a fix. Re-scoring is FREE and deterministic, so
            it's offered plainly; a full re-scan costs, so it's priced on the button.
            Keeping them side by side makes the cheap option the obvious one.

            DISABLED and BUSY are deliberately different things here. Both buttons go
            disabled on `busy` — the caller's "either op is in flight" flag — because a
            re-score and a re-check must never run at once. But each reads its BUSY LABEL
            only from its OWN flag: keying the label off `recomputing || rescanning` meant
            starting the free re-score flipped the PAID button to "Re-checking…", telling
            the user a charged action was running when it wasn't. */}
        {(onRecompute || onRescan) && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            {onRecompute && (
              <button
                type="button"
                onClick={() => onRecompute()}
                disabled={busy}
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
                disabled={busy}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-900 hover:text-slate-950 dark:hover:border-white dark:hover:text-white transition-colors disabled:opacity-50"
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
                label: sectionLabel(t, s),
                // 'neutral' must be named, not defaulted: falling through to "poor"
                // would announce a dismissed section as the worst row on the card.
                status:
                  s.band === 'ok'
                    ? t('ariaStudio.studioArtifactPanel.srGood')
                    : s.band === 'warn'
                      ? t('ariaStudio.studioArtifactPanel.srNeedsWork')
                      : s.band === 'neutral'
                        ? sectionNote(t, s)
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
