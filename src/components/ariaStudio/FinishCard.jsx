import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT } from '../../lib/noteStyles';
import { finishSummary } from '../../lib/studioFlow';
import AriaCard from './AriaCard';

// The end of a tailoring: what changed, and how to get the file out.
//
// The before → after is drawn from the baseline captured on the FIRST scan, so it's a
// real journey rather than a restatement of the current score. When there's no baseline
// (or nothing moved) the card says so plainly instead of manufacturing progress — a
// fake "+0 improvement" would undermine every honest number next to it.
const FinishCard = ({
  scan,
  draftId,
  onOpenEditor,
  busy,
  // ── Build mode ──
  // A CV built from scratch has no job to match against, so there is no fit score to
  // show. Inventing a match % here would be precisely the fabrication this codebase
  // refuses everywhere else — so build mode shows CV HEALTH and what's actually in the
  // document instead.
  mode = 'tailor',
  progress, // buildProgress(cvData)
  contents, // { roles, projects, skills }
  onTailor, // start a NEW tailoring session from this CV
  onScan, // only when a job WAS supplied at build-start
  scanCost,
}) => {
  const { t } = useTranslation();
  const isBuild = mode === 'build';
  // `t` is passed in so the newlyGreen / stillWeak section names come from the locale
  // rather than the scan's hard-coded English labels.
  const summary = finishSummary(scan, t);
  const score = scan?.fitScore;
  const band = bandOf(score);

  return (
    <AriaCard cardKey="finish">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 border-l-2 border-l-emerald-400 dark:border-l-emerald-500 bg-white dark:bg-slate-900 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
          {t('ariaStudio.finishCard.readyToSend')}
        </p>

        {/* Build mode — CV HEALTH, not a match score. There is no job here, so there is
            nothing to match against, and a percentage that looked like a fit would be a
            fabrication. What's shown instead is genuinely measured: completeness, and a
            count of what the document actually contains. */}
        {isBuild ? (
          <>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span
                className={`font-heading text-3xl font-bold tabular-nums ${
                  BAND_TEXT[bandOf(progress?.percent ?? 0)]
                }`}
              >
                {progress?.percent ?? 0}
              </span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.finishCard.percentComplete')}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
              {[
                contents?.roles
                  ? t('ariaStudio.finishCard.contentsRoles', { count: contents.roles })
                  : null,
                contents?.projects
                  ? t('ariaStudio.finishCard.contentsProjects', { count: contents.projects })
                  : null,
                contents?.skills
                  ? t('ariaStudio.finishCard.contentsSkills', { n: contents.skills })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || t('ariaStudio.finishCard.cvSaved')}
            </p>
            {progress && progress.done < progress.total && (
              <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                {t('ariaStudio.finishCard.sectionsEmpty', {
                  count: progress.total - progress.done,
                })}
              </p>
            )}
          </>
        ) : /* Before → after */
        summary ? (
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-heading text-2xl font-bold tabular-nums text-slate-400 dark:text-slate-500 line-through decoration-1">
              {summary.from}
            </span>
            <span className="text-slate-400 dark:text-slate-500">→</span>
            <span className={`font-heading text-3xl font-bold tabular-nums ${BAND_TEXT[band]}`}>
              {summary.to}
            </span>
            {summary.moved !== 0 && (
              <span
                className={`font-mono text-[11px] font-bold ${
                  summary.improved
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {summary.moved > 0 ? `+${summary.moved}` : summary.moved}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className={`font-heading text-3xl font-bold tabular-nums ${BAND_TEXT[band]}`}>
              {score ?? '—'}
            </span>
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.common.outOf100')}
            </span>
          </div>
        )}

        {!isBuild && summary?.newlyGreen?.length > 0 && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {summary.newlyGreen.join(', ')}
            </span>{' '}
            {t('ariaStudio.finishCard.movedIntoGreen')}
          </p>
        )}

        {!isBuild && summary && summary.moved === 0 && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('ariaStudio.finishCard.scoreNotMoved')}
          </p>
        )}

        {!isBuild && summary?.stillWeak?.length > 0 && (
          <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
            {t('ariaStudio.finishCard.stillWorthLook', { list: summary.stillWeak.join(', ') })}
          </p>
        )}

        {/* Where the file lives — said plainly, because "where did it go?" is the most
            common thing to wonder after a download. */}
        <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          <Trans
            i18nKey="ariaStudio.finishCard.savedAs"
            values={{
              title:
                scan?.title ||
                t(
                  isBuild
                    ? 'ariaStudio.finishCard.yourNewCv'
                    : 'ariaStudio.finishCard.yourTailoredCopy'
                ),
            }}
            components={{
              b: <span className="font-semibold text-slate-700 dark:text-slate-200" />,
            }}
          />{' '}
          {isBuild
            ? t('ariaStudio.finishCard.masterNote')
            : t('ariaStudio.finishCard.originalUntouched')}
        </p>

        {/* PRIMARY — the CV Studio. A tailored CV is a document before it's a file, and
            the things most likely to lose someone an interview (a bullet spilling onto
            page 2, a template that doesn't suit the role) are only visible as pages.
            The reason is named rather than implied, so this reads as advice, not an
            upsell. */}
        {draftId && (
          <div className="mt-3.5">
            <button
              type="button"
              onClick={onOpenEditor}
              // Still the dominant action on the card — ink IS the system's dominant, so
              // it loses no weight by dropping the accent fill.
              className="btn-primary w-full gap-2 px-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              {t('ariaStudio.finishCard.openInStudio')} <ArrowRight className="w-4 h-4" />
            </button>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
              {isBuild
                ? // They have literally never seen this document — it only ever existed as a
                  // conversation. Looking at it as pages matters more here than anywhere.
                  t('ariaStudio.finishCard.openInStudioBodyBuild')
                : t('ariaStudio.finishCard.openInStudioBodyTailor')}
            </p>
          </div>
        )}

        {/* Build mode — where to go next. Tailoring is the point of having a master CV,
            so it's offered directly rather than left for the user to rediscover. */}
        {isBuild && (onTailor || onScan) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onTailor && (
              <button
                type="button"
                onClick={onTailor}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-900 hover:text-slate-950 dark:hover:border-white dark:hover:text-white transition-colors disabled:opacity-50"
              >
                {t('ariaStudio.finishCard.tailorToJob')} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Only when a job WAS given at the start — otherwise there is nothing to
                match against and offering a scan would be selling an empty answer. */}
            {onScan && (
              <button
                type="button"
                onClick={onScan}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-900 hover:text-slate-950 dark:hover:border-white dark:hover:text-white transition-colors disabled:opacity-50"
              >
                {t('ariaStudio.finishCard.seeHowItMatches', { cost: scanCost ?? 10 })}
              </button>
            )}
          </div>
        )}
      </div>
    </AriaCard>
  );
};

export default FinishCard;
