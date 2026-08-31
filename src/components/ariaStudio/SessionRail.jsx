import React, { useEffect, useRef, useState } from 'react';
import { formatRelative } from '../../lib/relativeDate';
import { Plus, FilePlus2, Trash2, Pencil, MoreHorizontal, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT } from '../../lib/noteStyles';
import { STUDIO_TAILORING_ENABLED } from '../../lib/studioFeatures';
import AriaOrbit from '../cv/AriaOrbit';
import StudioSidebarNav from './StudioSidebarNav';
import StudioSidebarProfile from './StudioSidebarProfile';

// The Studio sidebar, top to bottom: the ARIA mark, new-session actions, destinations +
// wallet, the scrolling session list, and the pinned profile row. Recents is the ONLY
// region that scrolls; everything else stays put.
//
// Recents holds TWO kinds of row — CV sessions and job analyses — because to the person
// looking at it they are two kinds of the same thing: work they did here, most recent
// first. They are told apart by their tag, not by being filed separately.
//
// Renaming a session lives HERE (per Recents row) now — the chat's own top bar dropped
// its editable title in favour of the model picker, so this is the only place a CV's
// name can be changed.
//
// Presentational only: it takes rows and callbacks (plus the stateful nav/profile
// sub-components), so the same component serves both the inline rail (≥820px) and the
// mobile drawer without a second implementation.
const SessionRail = ({
  sessions = [],
  loading,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onNewTailoring,
  onNewCv,
  onNewPrep,
  onOpenGuide,
  onBeforeCreditStore,
}) => {
  const { t } = useTranslation();
  // Which row is mid-rename, and its draft text.
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [openActionId, setOpenActionId] = useState(null);
  const renameInputRef = useRef(null);
  const actionMenuRef = useRef(null);
  const actionTriggerRefs = useRef(new Map());

  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  useEffect(() => {
    if (!openActionId) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!actionMenuRef.current?.contains(event.target)) setOpenActionId(null);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setOpenActionId(null);
      actionTriggerRefs.current.get(openActionId)?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openActionId]);

  const beginRename = (session, heading) => {
    setOpenActionId(null);
    setRenameDraft(heading);
    setRenamingId(session._id);
  };
  const commitRename = (session) => {
    const id = renamingId;
    setRenamingId(null);
    if (id !== session._id) return;
    onRename?.(session, renameDraft);
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* ARIA mark + wordmark, left-aligned — the rail's only branding now that the
        chat's own top bar dropped its editable title. */}
      <div className="shrink-0 flex items-center gap-2 px-3 pt-3">
        <AriaOrbit size={18} className="shrink-0" />
        <span className="font-mono text-[17px] sm:text-[13px] font-semibold tracking-[0.08em] text-slate-700 dark:text-slate-200">
          {t('ariaStudio.desk.title')}
        </span>
      </div>

      {/* The two ways to start something. Stacked at desk width where there is room for
        full labels; side by side on a phone, where this drawer is also carrying the
        destinations and the wallet and vertical space is the scarce thing. */}
      <div className="shrink-0 px-3 pt-2.5 pb-2 flex gap-2 sm:block sm:space-y-2">
        {/* The system's primary and secondary. Sizing is COMPOSED on top (w-full, compact
          padding, rail-scale text) rather than re-implementing the colours, so these
          stay in step with every other button in the app. */}
        {STUDIO_TAILORING_ENABLED && (
          <button
            type="button"
            onClick={onNewTailoring}
            className="btn-primary flex-1 gap-2 px-3 py-2 text-[15px] sm:w-full sm:text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100"
          >
            <Plus className="w-4 h-4 shrink-0" /> {t('ariaStudio.sessionRail.newTailoring')}
          </button>
        )}
        {/* With tailoring hidden, this is the rail's only new-session action — so it
          takes the primary weight, rather than leaving the region with no primary. */}
        <button
          type="button"
          onClick={onNewCv}
          className={`${STUDIO_TAILORING_ENABLED ? 'btn-secondary' : 'btn-primary'} flex-1 gap-2 px-3 py-2 text-[15px] sm:w-full sm:text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100`}
        >
          <FilePlus2 className="w-4 h-4 shrink-0" /> {t('ariaStudio.sessionRail.newCv')}
        </button>

        {/* Secondary to New CV on purpose: preparing for an interview needs a CV to
            analyse, so it is the second thing you do here, not the first. */}
        <button
          type="button"
          onClick={onNewPrep}
          className="btn-secondary flex-1 gap-2 px-3 py-2 text-[15px] sm:w-full sm:text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100"
        >
          <ClipboardCheck className="w-4 h-4 shrink-0" />
          {/* The full name at desk width; on a phone, beside an icon and sharing the row
              with New CV, the short form is what fits without truncating. */}
          <span className="sm:hidden">{t('ariaStudio.sessionRail.newPrepShort')}</span>
          <span className="hidden sm:inline">{t('ariaStudio.sessionRail.newPrep')}</span>
        </button>
      </div>

      <StudioSidebarNav onBeforeNavigate={onBeforeCreditStore} />

      <div className="shrink-0 px-3 pb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.sessionRail.recents')}
        </span>
      </div>

      {/* Recents — the ONLY scrolling region. `chat-scroll` contains overscroll so
        exhausting this list can't chain-scroll the page behind it. */}
      <div
        className={`flex-1 min-h-0 chat-scroll pb-3 ${
          loading || sessions.length === 0 ? 'flex items-center justify-center' : ''
        }`}
      >
        {loading && (
          <div role="status" aria-label={t('ariaStudio.sessionRail.loading')}>
            <span className="aria-orbit-slow inline-block">
              <AriaOrbit size={44} working />
            </span>
          </div>
        )}

        {/* First run — an invitation, not an empty box. */}
        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center px-4 text-center">
            <span className="aria-orbit-slow inline-block">
              <AriaOrbit size={44} working />
            </span>
            <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t('ariaStudio.sessionRail.noSessionsYet')}
            </p>
          </div>
        )}

        {sessions.length > 0 && (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
            {sessions.map((s) => {
              const active = s._id === activeId;
              const isBuild = s.kind === 'build';
              const isApplication = s.kind === 'application';
              const band = bandOf(s.fitScore);
              const when = s.updatedAt ? formatRelative(new Date(s.updatedAt)) : '';
              const heading =
                s.jobTitle || s.title || t('ariaStudio.deleteSession.untitledSession');
              const meta = [
                s.company,
                s.sourceTitle && t('ariaStudio.sessionRail.fromSource', { source: s.sourceTitle }),
                when,
              ]
                .filter(Boolean)
                .join(' · ');

              const isRenaming = renamingId === s._id;
              const canRename = isBuild && !!onRename;

              return (
                <li key={s._id} className="group relative">
                  {/* Active marker — a rule, not a fill. */}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 inset-y-0 w-0.5 bg-slate-900 dark:bg-white"
                    />
                  )}
                  {isRenaming ? (
                    <div className="pl-4 pr-4 py-2.5">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => commitRename(s)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          } else if (e.key === 'Escape') {
                            setRenamingId(null);
                          }
                        }}
                        aria-label={t('ariaStudio.desk.cvName')}
                        className="w-full text-[17px] sm:text-[13px] font-semibold text-slate-900 dark:text-slate-50 leading-tight bg-transparent border-0 outline-none p-0"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect?.(s)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full text-left pl-4 pr-10 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 ${
                        active ? 'bg-transparent' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="flex items-baseline gap-2">
                        <span
                          className={`min-w-0 flex-1 truncate text-[17px] sm:text-[13px] ${
                            active
                              ? 'font-semibold text-slate-900 dark:text-slate-50'
                              : 'font-medium text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {heading}
                        </span>

                        {/* A build session has no fit score to show — it isn't aimed at a job
                        yet. Tags are CATEGORY labels, so they're neutral; the score pill
                        keeps its band colour because that encodes meaning.

                        An analysis gets BOTH: the tag says what kind of thing it is, and
                        the score is the number people come back for. */}
                        {isApplication && (
                          <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('ariaStudio.sessionRail.applicationTag')}
                          </span>
                        )}
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
                  )}

                  {/* Secondary row actions live behind one predictable overflow control so
                  the list stays quiet and the actions remain available on touch. */}
                  {!isRenaming && (canRename || onDelete) && (
                    <div
                      ref={openActionId === s._id ? actionMenuRef : undefined}
                      className="absolute right-1 top-1.5 z-20"
                    >
                      <button
                        ref={(node) => {
                          if (node) actionTriggerRefs.current.set(s._id, node);
                          else actionTriggerRefs.current.delete(s._id);
                        }}
                        type="button"
                        onClick={() =>
                          setOpenActionId((current) => (current === s._id ? null : s._id))
                        }
                        aria-label={t('ariaStudio.sessionRail.actionsFor', { heading })}
                        aria-haspopup="menu"
                        aria-expanded={openActionId === s._id}
                        title={t('ariaStudio.sessionRail.actions')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {openActionId === s._id && (
                        <div
                          role="menu"
                          className="absolute right-0 top-9 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30"
                        >
                          {canRename && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => beginRename(s, heading)}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t('ariaStudio.sessionRail.rename')}
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenActionId(null);
                                onDelete(s);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50 focus:bg-rose-50 focus:outline-none dark:text-rose-400 dark:hover:bg-rose-500/10 dark:focus:bg-rose-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('common.delete')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <StudioSidebarProfile onOpenGuide={onOpenGuide} onBeforeNavigate={onBeforeCreditStore} />
    </div>
  );
};

export default SessionRail;
