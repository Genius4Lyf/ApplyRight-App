import React, { useState } from 'react';
import { X, FileText, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BAND_TEXT } from '../../lib/noteStyles';
import AriaOrbit from '../cv/AriaOrbit';
import StudioSidebarNav from '../ariaStudio/StudioSidebarNav';
import StudioSidebarProfile from '../ariaStudio/StudioSidebarProfile';
import NewCvMenu from './NewCvMenu';
import RailFilter from './RailFilter';

// The app sidebar for every surface OUTSIDE Aria Studio: the CV builder, the CV Studio,
// and an interview prep dashboard.
//
// It lists what belongs to the surface you are on — the builder shows the CVs it can
// open, the CV Studio shows every CV, a prep dashboard shows your applications — so the
// list is always about the thing in front of you, rather than one global index shown in
// three places.
//
// Presentational: rows and callbacks in, nothing fetched. Rows arrive already flattened
// by lib/workspaceRows, so this draws ONE row shape and never has to know whether it is
// holding a draft or an application.
//
// Two presentations, one component (see useWorkspaceSidebar): a drawer drawn OVER the
// page, or — where a surface has been restructured to make room — an `inline` 248px
// column the page lays out around. Only the meaning of the header control differs, so
// that is all `inline` changes.
//
// Deliberately NOT merged with SessionRail. That rail switches sessions in place inside a
// chat, holds two row kinds at once, and owns rename; this one navigates. They share the
// parts that would otherwise be duplicated — NewCvMenu, RailFilter, the nav and profile
// blocks — which is where the real cost of having two components would have been.
const WorkspaceSidebar = ({
  rows = [],
  loading,
  activeId,
  filter,
  filterOptions,
  onFilterChange,
  title,
  listLabel,
  emptyLabel,
  onSelect,
  onDelete,
  onClose,
  onBuildWithAria,
  onBuildWithBuilder,
  onInterview,
  inline = false,
}) => {
  const { t } = useTranslation();
  // Which row is asking "are you sure?". The confirmation happens IN the row rather than
  // in a modal: this panel is itself an overlay with a focus trap, and stacking a second
  // trap on top of it is how dialogs end up unclosable on a phone.
  const [confirmingId, setConfirmingId] = useState(null);

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Which workspace you are in, and — as a drawer — the way out. The scrim
        dismisses it too, but a control you can aim at matters on touch, where the page
        behind is a narrow strip.
        As an inline COLUMN there is no control, because there is nothing to dismiss: at
        that width the panel is part of the page rather than something laid over it. */}
      <div className="shrink-0 flex items-center gap-2 px-3 pt-3">
        <AriaOrbit size={18} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate font-mono text-[17px] sm:text-[13px] font-semibold tracking-[0.08em] text-slate-700 dark:text-slate-200">
          {title}
        </span>
        {!inline && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:text-slate-500 dark:hover:text-slate-200 dark:focus-visible:ring-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-3 pt-2.5 pb-2">
        <NewCvMenu
          onBuildWithAria={onBuildWithAria}
          onBuildWithBuilder={onBuildWithBuilder}
          onInterview={onInterview}
        />
      </div>

      <StudioSidebarNav />

      {/* The list header: what this region holds, and which slice you are reading. The
        filter appears only when there is something to filter, and never on a surface
        whose list holds only one kind of thing. */}
      <div className="shrink-0 flex items-center gap-2 px-3 pb-1.5">
        <FileText
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
        />
        {filterOptions?.length && rows.length > 0 ? (
          <RailFilter
            value={filter}
            onChange={onFilterChange}
            options={filterOptions}
            ariaLabel={t('workspace.list.filterAria')}
          />
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {listLabel}
          </span>
        )}
      </div>

      {/* The ONLY scrolling region. `chat-scroll` contains overscroll, so exhausting this
        list cannot chain-scroll the page behind the scrim. */}
      <div
        className={`flex-1 min-h-0 chat-scroll pb-3 ${
          loading || rows.length === 0 ? 'flex items-center justify-center' : ''
        }`}
      >
        {loading && (
          <div role="status" aria-label={t('ariaStudio.sessionRail.loading')}>
            <span className="aria-orbit-slow inline-block">
              <AriaOrbit size={44} working />
            </span>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <p className="px-4 text-center text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {emptyLabel}
          </p>
        )}

        {rows.length > 0 && (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
            {rows.map((row) => {
              const active = row.id === activeId;
              return (
                <li key={row.id} className="group relative">
                  {/* Active marker — a rule, not a fill. */}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 inset-y-0 w-0.5 bg-slate-900 dark:bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect?.(row)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full text-left pl-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 ${
                      onDelete ? 'pr-10' : 'pr-4'
                    } ${active ? 'bg-transparent' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <span className="flex items-baseline gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-[17px] sm:text-[13px] ${
                          active
                            ? 'font-semibold text-slate-900 dark:text-slate-50'
                            : 'font-medium text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {row.heading}
                      </span>
                      {row.value && (
                        <span
                          className={`shrink-0 font-mono text-[11px] font-bold tabular-nums ${
                            BAND_TEXT[row.band] || BAND_TEXT.neutral
                          }`}
                        >
                          {row.value}
                        </span>
                      )}
                    </span>
                    {row.meta && (
                      <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        {row.meta}
                      </span>
                    )}
                  </button>

                  {/* Delete is the only row action here — there is no rename, because a
                    CV's title is editable in the workspace this sidebar sits over. One
                    action does not earn an overflow menu. */}
                  {onDelete && confirmingId !== row.id && (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(row.id)}
                      aria-label={t('ariaStudio.sessionRail.deleteAria', { heading: row.heading })}
                      className="absolute right-1 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-all hover:text-rose-600 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 group-hover:opacity-100 dark:text-slate-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {onDelete && confirmingId === row.id && (
                    <div className="flex items-center gap-3 border-t border-slate-100 bg-rose-50/50 px-4 py-2 dark:border-slate-800 dark:bg-rose-500/5">
                      <span className="min-w-0 flex-1 truncate text-[12px] text-slate-600 dark:text-slate-300">
                        {t('workspace.delete.ask')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingId(null);
                          onDelete(row);
                        }}
                        className="shrink-0 text-[12px] font-semibold text-rose-600 hover:underline dark:text-rose-400"
                      >
                        {t('common.delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="shrink-0 text-[12px] font-medium text-slate-500 hover:underline dark:text-slate-400"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <StudioSidebarProfile />
    </div>
  );
};

export default WorkspaceSidebar;
