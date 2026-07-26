import React from 'react';
import { formatRelative } from '../../lib/relativeDate';
import { Plus, FilePlus2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT } from '../../lib/noteStyles';
import AriaOrbit from '../cv/AriaOrbit';

// The session list. A Studio session IS a DraftCV, so these rows are just drafts the
// user has worked on here — newest-touched first, because the one you were last in is
// almost always the one you want.
//
// Editorial, not pastel: rows carry no fill, separated by hairlines. The ACTIVE row is
// marked by a 2px indigo left rule and ink-weight type — state carried by a rule and
// typography rather than a lavender wash, matching the flat/hairline language used
// across the rest of the app.
//
// Presentational only: it takes rows and callbacks, so the same component serves both
// the inline rail (≥820px) and the mobile drawer without a second implementation.
const SessionRail = ({
  sessions = [],
  loading,
  activeId,
  onSelect,
  onDelete,
  onNewTailoring,
  onNewCv,
  onClose, // drawer only — absent inline
}) => {
  const { t } = useTranslation();
  return (
  <div className="h-full min-h-0 flex flex-col">
    <div className="shrink-0 p-3 space-y-2">
      {onClose && (
        <div className="flex items-center justify-between pb-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.sessionRail.sessions')}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('ariaStudio.sessionRail.closeSessions')}
            className="w-8 h-8 -mr-1 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* The system's primary and secondary. Sizing is COMPOSED on top (w-full, compact
          padding, rail-scale text) rather than re-implementing the colours, so these
          stay in step with every other button in the app. */}
      <button
        type="button"
        onClick={onNewTailoring}
        className="btn-primary w-full gap-2 px-3 py-2 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <Plus className="w-4 h-4" /> {t('ariaStudio.sessionRail.newTailoring')}
      </button>
      <button
        type="button"
        onClick={onNewCv}
        className="btn-secondary w-full gap-2 px-3 py-2 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <FilePlus2 className="w-4 h-4" /> {t('ariaStudio.sessionRail.newCv')}
      </button>
    </div>

    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pb-3">
      {loading && (
        <p className="px-4 py-3 text-[12px] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.sessionRail.loading')}
        </p>
      )}

      {/* First run — an invitation, not an empty box. */}
      {!loading && sessions.length === 0 && (
        <div className="px-4 py-6 text-center">
          <AriaOrbit size={22} className="mx-auto" />
          <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('ariaStudio.sessionRail.noSessionsYet')}
          </p>
        </div>
      )}

      <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
        {sessions.map((s) => {
          const active = s._id === activeId;
          const isBuild = s.kind === 'build';
          const band = bandOf(s.fitScore);
          const when = s.updatedAt
            ? formatRelative(new Date(s.updatedAt))
            : '';
          const heading = s.jobTitle || s.title || t('ariaStudio.deleteSession.untitledSession');
          const meta = [
            s.company,
            s.sourceTitle && t('ariaStudio.sessionRail.fromSource', { source: s.sourceTitle }),
            when,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <li key={s._id} className="group relative">
              {/* Active marker — a rule, not a fill. */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 inset-y-0 w-0.5 bg-indigo-500"
                />
              )}
              <button
                type="button"
                onClick={() => onSelect?.(s._id)}
                aria-current={active ? 'true' : undefined}
                className={`w-full text-left pl-4 pr-10 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 ${
                  active ? 'bg-transparent' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="flex items-baseline gap-2">
                  <span
                    className={`min-w-0 flex-1 truncate text-[13px] ${
                      active
                        ? 'font-semibold text-slate-900 dark:text-slate-50'
                        : 'font-medium text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {heading}
                  </span>

                  {/* A build session has no fit score to show — it isn't aimed at a job
                      yet. The tag is a CATEGORY label, so it's neutral; the score pill
                      keeps its band colour because that encodes meaning. */}
                  {isBuild ? (
                    <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('ariaStudio.sessionRail.newCv')}
                    </span>
                  ) : (
                    s.fitScore != null && (
                      <span
                        className={`shrink-0 font-mono text-[11px] font-bold tabular-nums ${BAND_TEXT[band]}`}
                      >
                        {s.fitScore}
                      </span>
                    )
                  )}
                </span>
                {meta && (
                  <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    {meta}
                  </span>
                )}
              </button>

              {/* Delete — always reachable on touch (no hover there), revealed on hover
                  or keyboard focus at md+ so the list stays quiet at rest. */}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(s)}
                  title={
                    isBuild
                      ? t('ariaStudio.sessionRail.removeOrDeleteCv')
                      : t('ariaStudio.sessionRail.deleteTailoring')
                  }
                  aria-label={t('ariaStudio.sessionRail.deleteAria', { heading })}
                  className="absolute right-1 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-all md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  </div>
  );
};

export default SessionRail;
