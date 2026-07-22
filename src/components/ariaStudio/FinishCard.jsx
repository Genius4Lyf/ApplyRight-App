import React from 'react';
import { FileDown, FileText, ArrowRight } from 'lucide-react';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT } from '../../lib/noteStyles';
import { finishSummary } from '../../lib/studioFlow';
import { resolveDownloadTemplate } from '../../lib/cvDownload';
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
  templateId,
  onDownloadPdf,
  onDownloadDocx,
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
  const isBuild = mode === 'build';
  const summary = finishSummary(scan);
  const score = scan?.fitScore;
  const band = bandOf(score);
  // Resolved through the SAME helper the download uses, so the name shown is never a
  // guess about what the file will contain.
  const template = resolveDownloadTemplate(templateId);

  return (
    <AriaCard cardKey="finish">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 border-l-2 border-l-emerald-400 dark:border-l-emerald-500 bg-white dark:bg-slate-900 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
          Ready to send
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
                % complete
              </span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
              {[
                contents?.roles ? `${contents.roles} role${contents.roles === 1 ? '' : 's'}` : null,
                contents?.projects
                  ? `${contents.projects} project${contents.projects === 1 ? '' : 's'}`
                  : null,
                contents?.skills ? `${contents.skills} skills` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Your CV is saved.'}
            </p>
            {progress && progress.done < progress.total && (
              <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                {progress.total - progress.done} section
                {progress.total - progress.done === 1 ? '' : 's'} still empty — you can come back to
                those any time.
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
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">/ 100</span>
          </div>
        )}

        {!isBuild && summary?.newlyGreen?.length > 0 && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {summary.newlyGreen.join(', ')}
            </span>{' '}
            moved into the green.
          </p>
        )}

        {!isBuild && summary && summary.moved === 0 && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            The score hasn&rsquo;t moved yet — your copy is saved either way, and you can keep
            fixing sections whenever you like.
          </p>
        )}

        {!isBuild && summary?.stillWeak?.length > 0 && (
          <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
            Still worth a look: {summary.stillWeak.join(', ')}.
          </p>
        )}

        {/* Where the file lives — said plainly, because "where did it go?" is the most
            common thing to wonder after a download. */}
        <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          Saved in <span className="font-semibold text-slate-700 dark:text-slate-200">My CVs</span>{' '}
          as “{scan?.title || (isBuild ? 'your new CV' : 'your tailored copy')}”.{' '}
          {isBuild
            ? 'This one is your master — tailored copies are made from it and never overwrite it.'
            : 'Your original is untouched.'}
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
              // it loses no weight by dropping the indigo fill.
              className="btn-primary w-full gap-2 px-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              Open in CV Studio <ArrowRight className="w-4 h-4" />
            </button>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
              {isBuild
                ? // They have literally never seen this document — it only ever existed as a
                  // conversation. Looking at it as pages matters more here than anywhere.
                  'You’ve built this whole CV without seeing it yet — open it up and look at it as real pages, pick a template, and check nothing spills onto page 2.'
                : 'See it as real pages before you send it — that’s where you’ll spot anything spilling onto page 2, try the 8 templates, and adjust the accent, margins and spacing.'}
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
              >
                Now tailor it to a job <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Only when a job WAS given at the start — otherwise there is nothing to
                match against and offering a scan would be selling an empty answer. */}
            {onScan && (
              <button
                type="button"
                onClick={onScan}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
              >
                See how it matches · {scanCost ?? 10} cr
              </button>
            )}
          </div>
        )}

        {/* SECONDARY — the direct download stays, deliberately quieter. Naming the
            template turns a blind download into an informed one without putting a
            picker in the chat; choosing one is the CV Studio's job. */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Or grab it now
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={onDownloadDocx}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              {busy === 'docx' ? 'Preparing…' : 'Download Word'}
            </button>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            Uses{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {template.name}
            </span>
            {template.isDefault ? ' — ATS-safe by default.' : '.'}{' '}
            {draftId && (
              <>
                Want a different look?{' '}
                <button
                  type="button"
                  onClick={onOpenEditor}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Open in editor
                </button>
                .
              </>
            )}
          </p>
        </div>
      </div>
    </AriaCard>
  );
};

export default FinishCard;
