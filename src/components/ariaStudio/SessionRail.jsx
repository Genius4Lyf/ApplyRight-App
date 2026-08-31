import React, { useEffect, useRef, useState } from 'react';
import { formatRelative } from '../../lib/relativeDate';
import { Plus, Trash2, Pencil, MoreHorizontal, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT, TAG_TONE } from '../../lib/noteStyles';
import { STUDIO_TAILORING_ENABLED } from '../../lib/studioFeatures';
import AriaOrbit from '../cv/AriaOrbit';
import StudioSidebarNav from './StudioSidebarNav';
import StudioSidebarProfile from './StudioSidebarProfile';
import RailFilter from '../workspace/RailFilter';
import NewCvMenu from '../workspace/NewCvMenu';

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
// The tag's SHAPE, shared by both kinds; only the colour differs (TAG_TONE). Type alone —
// no fill, no padding, no radius. See TAG_TONE for why.
const TAG = 'shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider';

const SessionRail = ({
  sessions = [],
  loading,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onNewTailoring,
  onNewCv,
  onNewBuilderCv,
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
  // Which kinds of work Recents is showing.
  //
  // NOT persisted, deliberately: this rail is the only place a session can be found
  // again, so a filter that survived a reload would hide work behind a choice nobody
  // remembers making.
  const [filter, setFilter] = useState('all');

  const filterOptions = [
    { key: 'all', label: t('ariaStudio.sessionRail.filters.all') },
    { key: 'cv', label: t('ariaStudio.sessionRail.filters.cvs') },
    { key: 'application', label: t('ariaStudio.sessionRail.filters.applications') },
  ];

  // 'cv' is everything that ISN'T an analysis rather than an allow-list of CV kinds, so a
  // future session kind lands with the CVs instead of falling out of both slices.
  const matchesFilter = (s) =>
    filter === 'all' ||
    (filter === 'application' ? s.kind === 'application' : s.kind !== 'application');

  const visible = sessions.filter(matchesFilter);

  // Creating or opening a session while a narrower filter is on would make it vanish at
  // the moment it appeared. The list follows what you just did, not what you last picked.
  useEffect(() => {
    if (filter === 'all' || !activeId) return;
    const active = sessions.find((s) => s._id === activeId);
    if (active && !matchesFilter(active)) setFilter('all');
    // matchesFilter is derived from `filter`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, sessions, filter]);

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

      {/* The ways to start something. New CV is a MENU — there are genuinely two ways
        to build one, and which you want is a real choice; see NewCvMenu. */}
      <div className="shrink-0 px-3 pt-2.5 pb-2 space-y-2">
        {STUDIO_TAILORING_ENABLED && (
          <button
            type="button"
            onClick={onNewTailoring}
            className="btn-primary w-full gap-2 px-3 py-2 text-[15px] sm:text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100"
          >
            <Plus className="w-4 h-4 shrink-0" /> {t('ariaStudio.sessionRail.newTailoring')}
          </button>
        )}
        {/* With tailoring hidden, New CV is the rail's primary — the region would
          otherwise have none. */}
        <NewCvMenu
          onBuildWithAria={onNewCv}
          onBuildWithBuilder={onNewBuilderCv}
          onInterview={onNewPrep}
          newCvPrimary={!STUDIO_TAILORING_ENABLED}
        />
      </div>

      <StudioSidebarNav onBeforeNavigate={onBeforeCreditStore} />

      {/* The list header: what this region holds, and which slice of it you're reading.
        The icon takes over from the word "Recents" once there is something to filter —
        a label AND a picker is one more thing than a 248px row can carry. */}
      <div className="shrink-0 flex items-center gap-2 px-3 pb-1.5">
        <FileText
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
        />
        {sessions.length > 0 ? (
          <RailFilter
            value={filter}
            onChange={setFilter}
            options={filterOptions}
            ariaLabel={t('ariaStudio.sessionRail.filterAria')}
          />
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.sessionRail.recents')}
          </span>
        )}
      </div>

      {/* Recents — the ONLY scrolling region. `chat-scroll` contains overscroll so
        exhausting this list can't chain-scroll the page behind it. */}
      <div
        className={`flex-1 min-h-0 chat-scroll pb-3 ${
          loading || visible.length === 0 ? 'flex items-center justify-center' : ''
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

        {/* Empty because of the FILTER, not because there's nothing here. Saying which
          slice is empty beats showing the first-run invitation to someone who plainly
          isn't on their first run. */}
        {!loading && sessions.length > 0 && visible.length === 0 && (
          <p className="px-4 text-center text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {filter === 'application'
              ? t('ariaStudio.sessionRail.noApplicationsYet')
              : t('ariaStudio.sessionRail.noCvsYet')}
          </p>
        )}

        {visible.length > 0 && (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
            {visible.map((s) => {
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
                      {/* gap-1.5, not 2: the tag, the dash and the score read as one
                        phrase — "Analysis – 63" — and 8px between each turns a phrase
                        into three separate marks. */}
                      <span className="flex items-baseline gap-1.5">
                        <span
                          className={`min-w-0 flex-1 truncate text-[17px] sm:text-[13px] ${
                            active
                              ? 'font-semibold text-slate-900 dark:text-slate-50'
                              : 'font-medium text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {heading}
                        </span>

                        {/* A build session has no fit score to show — it isn't aimed at a
                        job yet. An analysis gets BOTH: the tag says what kind of thing it
                        is, and the score is the number people come back for.

                        The tags carry a SOLID colour of their own now (see TAG_TONE).
                        They used
                        to be identical grey, which meant telling two kinds of row apart
                        required READING them — and the whole job of a tag in a list this
                        dense is to be recognised before it is read. The hues stay clear of
                        the band palette so the tag never looks like it is grading the row
                        the score is grading. */}
                        {isApplication && (
                          <span className={`${TAG} ${TAG_TONE.analysis}`}>
                            {t('ariaStudio.sessionRail.applicationTag')}
                          </span>
                        )}
                        {isBuild ? (
                          <span className={`${TAG} ${TAG_TONE.cv}`}>
                            {t('ariaStudio.sessionRail.newCv')}
                          </span>
                        ) : (
                          s.fitScore != null && (
                            <>
                              {/* Separator, not decoration — and aria-hidden, so a screen
                                reader hears "Analysis 63" as one phrase rather than
                                spelling out a dash between them. Only when there IS a tag
                                in front of it to separate from. */}
                              {isApplication && (
                                <span
                                  aria-hidden="true"
                                  className="shrink-0 text-slate-300 dark:text-slate-600"
                                >
                                  –
                                </span>
                              )}
                              <span
                                className={`shrink-0 font-mono text-[11px] font-bold tabular-nums ${BAND_TEXT[band]}`}
                              >
                                {s.fitScore}
                              </span>
                            </>
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
