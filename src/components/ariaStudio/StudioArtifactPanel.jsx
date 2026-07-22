import React from 'react';
import { useAriaStudio } from '../../context/AriaStudioContext';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT, BAND_RULEBG } from '../../lib/noteStyles';
import { buildProgress, BUILD_SECTIONS } from '../../lib/studioFlow';
import AriaOrbit from '../cv/AriaOrbit';

// The right rail — a standing summary of where the tailored CV is right now: the role
// it's aimed at, the fit score, the per-section dots, and what the job keeps asking for
// that the CV still doesn't say.
//
// Reads entirely from the persisted `studioScan` snapshot on the draft, so it survives a
// refresh without re-scanning (and without re-charging).
const StudioArtifactPanel = ({ onClose, bare = false }) => {
  const { cvData } = useAriaStudio();

  const scan = cvData?.studioScan;
  const targetJob = cvData?.targetJob;
  const brief = targetJob?.brief;
  const sections = scan?.sections || [];
  const score = scan?.fitScore;
  const band = bandOf(score);

  // Missing keywords across the JD-relevant sections, deduped and must-haves first.
  // The panel answers "what am I still not saying?" — one list, not six.
  const missingKeywords = [...new Set(sections.flatMap((s) => s.missingKeywords || []))].slice(
    0,
    10
  );

  // A build session has no job to match against yet, so the job-match block would be
  // six empty rows. It shows the document's own health instead — the same
  // getCompletionStatus figure /my-cvs and the Dashboard use, derived live.
  const isBuild = cvData?.studioKind === 'build';
  const progress = buildProgress(cvData);
  const roles = cvData?.experience || [];
  const projects = cvData?.projects || [];

  return (
    <aside
      className={`h-full min-h-0 flex flex-col ${
        bare
          ? ''
          : 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
      }`}
    >
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Tailored copy
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {cvData?.title || 'No CV yet'}
          </p>
          {(brief?.role || targetJob?.title) && (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {[brief?.role || targetJob?.title, brief?.company].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 -mr-1 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {isBuild ? (
        /* BUILD MODE — the document's own progress, not a job match. */
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-4 space-y-5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              CV health
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span
                className={`font-heading text-3xl font-bold tabular-nums ${
                  BAND_TEXT[bandOf(progress.percent)]
                }`}
              >
                {progress.percent}
              </span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">%</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {progress.done} of {progress.total} sections done
            </p>
          </div>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Sections
            </p>
            <ul className="space-y-1.5">
              {BUILD_SECTIONS.map((s) => {
                const done = progress.status[s.key];
                return (
                  <li key={s.key} className="flex items-center gap-2.5">
                    <span
                      className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                        done ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      aria-hidden="true"
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-[12px] ${
                        done
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {s.label}
                    </span>
                    {done && (
                      <span className="shrink-0 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        ✓
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="sr-only">
              {BUILD_SECTIONS.map(
                (s) => `${s.label}: ${progress.status[s.key] ? 'done' : 'not started'}.`
              ).join(' ')}
            </p>
          </div>

          {(roles.length > 0 || projects.length > 0) && (
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                In your CV
              </p>
              <ul className="space-y-1">
                {roles.map((r) => (
                  <li
                    key={r._sortId}
                    className="truncate text-[12px] text-slate-600 dark:text-slate-300"
                  >
                    {r.title || 'Untitled role'}
                    {r.company ? ` · ${r.company}` : ''}
                  </li>
                ))}
                {projects.map((p) => (
                  <li
                    key={p._sortId}
                    className="truncate text-[12px] text-slate-500 dark:text-slate-400"
                  >
                    {p.title || 'Untitled project'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : !scan ? (
        /* IDLE — Aria's orbit, larger and slowly turning. Reuses the shared AriaOrbit
           and the global .aria-orbit keyframes; `working` is what drives the rotation,
           so there's no second animation to maintain. */
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div className="max-w-[230px] text-center">
            <span className="aria-orbit-slow inline-block">
              <AriaOrbit size={44} working />
            </span>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Standing by
            </p>
            <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {cvData?._id
                ? 'Run a scan and your section-by-section verdict lands here.'
                : 'Bring me a job and your tailored CV takes shape here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-4 space-y-5">
          {/* Overall */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Fit
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className={`font-heading text-3xl font-bold tabular-nums ${BAND_TEXT[band]}`}>
                {score ?? '—'}
              </span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                / 100
              </span>
            </div>
          </div>

          {/* Section dots */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Sections
            </p>
            <ul className="space-y-1.5">
              {sections.map((s) => (
                <li key={s.key} className="flex items-center gap-2.5">
                  <span
                    className={`shrink-0 w-1.5 h-1.5 rounded-full ${BAND_RULEBG[s.band] || 'bg-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-slate-600 dark:text-slate-300">
                    {s.label}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                    {s.score}
                  </span>
                </li>
              ))}
            </ul>
            <p className="sr-only">
              {sections
                .map(
                  (s) =>
                    `${s.label}: ${s.band === 'ok' ? 'good' : s.band === 'warn' ? 'needs work' : 'poor'}.`
                )
                .join(' ')}
            </p>
          </div>

          {/* Still missing */}
          {missingKeywords.length > 0 && (
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Still not mentioned
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.map((k) => (
                  <span
                    key={k}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default StudioArtifactPanel;
