import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CVService from '../services/cv.service';
import InterviewPrepService from '../services/interviewPrep.service';
import { getCompletionStatus } from '../lib/cvCompleteness';
import { toCvRow, toPrepRow } from '../lib/workspaceRows';
import StudioOverlay from '../components/ariaStudio/StudioOverlay';
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar';
import { useWorkspaceLayout } from './useWorkspaceLayout';

// Everything a page needs to carry the workspace sidebar, so hosting it costs three lines:
// a toggle in the header, `{sidebar}` anywhere in the tree, and this call.
//
// Owning it here rather than in each page is what keeps the three surfaces honest with
// each other — one fetch policy, one filter, one set of destinations. A page that rolled
// its own would drift the moment one of those changed.
//
//   scope 'builder'  — CVs not born in Aria; a row resumes in the wizard
//   scope 'cvStudio' — every CV; a row opens in the document studio
//   scope 'prep'     — applications with interview prep; a row opens its dashboard
//
// `persistent` opts a surface into the app-shell presentation: on a wide screen the
// sidebar stops being a drawer and becomes a 248px column the page lays out around
// (`inlineSidebar`), the way Aria Studio carries its session rail. Off by default, so a
// surface that hasn't been restructured to make room for a column is unaffected.
export function useWorkspaceSidebar({ scope, activeId, persistent = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const isPrep = scope === 'prep';

  const { railInline } = useWorkspaceLayout({ enabled: persistent });

  // DERIVED, not synced — the rule useStudioLayout applies to its own overlays. The
  // drawer is showing only when it was asked for AND this width still presents the list
  // that way, so widening past the threshold dismisses it for free: no effect to write,
  // and no frame where a scrim sits over a panel that is also inline.
  const drawerOpen = open && !railInline;

  const openSidebar = useCallback(() => setOpen(true), []);
  const closeSidebar = useCallback(() => setOpen(false), []);

  // The list is "live" whenever it is on screen: an inline panel always, a drawer only
  // while open. The fetch keys off THAT rather than off `open`, or a persistent panel
  // would sit empty until someone toggled it closed and back.
  //
  // Still lazy for the drawer case, because the sidebar is optional chrome on a page
  // someone came to for something else and most visits never open it. Reopening refetches
  // in the background — the previous rows stay on screen, so a list that is merely stale
  // never flashes a loader at you.
  const listVisible = drawerOpen || railInline;

  useEffect(() => {
    if (!listVisible) return undefined;
    let alive = true;

    (async () => {
      if (rows === null) setLoading(true);
      try {
        const data = isPrep
          ? (await InterviewPrepService.list()).items || []
          : await CVService.listCvs(scope === 'cvStudio' ? 'all' : 'builder');
        if (alive) setRows(data);
      } catch {
        // A sidebar that cannot load its list still has to offer the way OUT of the page,
        // so this degrades to an empty list rather than an error state.
        if (alive && rows === null) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // `activeId` is a dep so an inline panel refreshes when you switch rows from it: the
    // row you just left is stale the moment you leave it (a prep row carries a readiness
    // score that the visit itself can move). `rows` is read to decide whether to show a
    // loader, but must not retrigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listVisible, scope, isPrep, activeId]);

  const visible = useMemo(() => {
    const list = rows || [];
    if (isPrep) return list.map((app) => toPrepRow(app, t));

    const filtered =
      filter === 'all'
        ? list
        : list.filter((cv) => getCompletionStatus(cv).isComplete === (filter === 'complete'));
    return filtered.map((cv) => toCvRow(cv, t));
  }, [rows, filter, isPrep, t]);

  const openRow = useCallback(
    (row) => {
      closeSidebar();
      if (isPrep) return navigate(`/interview-prep/${row.id}`);
      // Each surface keeps you where you are: the builder resumes in the wizard, the
      // studio opens the document. Same CV, different question being asked of it.
      return navigate(scope === 'cvStudio' ? `/resume/${row.id}` : `/cv-builder/${row.id}`);
    },
    [closeSidebar, isPrep, navigate, scope]
  );

  const deleteRow = useCallback(
    async (row) => {
      // The sidebar has already asked — see its in-row confirmation.
      try {
        await CVService.deleteDraft(row.id);
        setRows((current) => (current || []).filter((cv) => cv._id !== row.id));
        toast.success(t('myCvs.toasts.deleted'));
      } catch {
        toast.error(t('myCvs.toasts.deleteFailed'));
      }
    },
    [t]
  );

  const copy = isPrep ? 'prep' : scope === 'cvStudio' ? 'cvStudio' : 'builder';

  // One definition for both presentations, so the inline panel and the drawer cannot
  // drift into being two different lists. Only `onClose` differs: inline it collapses the
  // column, in the drawer it dismisses the overlay.
  const railProps = {
    rows: visible,
    loading,
    activeId,
    filter,
    onFilterChange: setFilter,
    filterOptions: isPrep
      ? null
      : [
          { key: 'all', label: t('workspace.builder.filters.all') },
          { key: 'inProgress', label: t('workspace.builder.filters.inProgress') },
          { key: 'complete', label: t('workspace.builder.filters.complete') },
        ],
    title: t(`workspace.${copy}.title`),
    listLabel: t(`workspace.${copy}.listLabel`),
    emptyLabel: isPrep
      ? t('workspace.prep.empty')
      : filter === 'all'
        ? t('workspace.builder.empty')
        : t('workspace.builder.emptyFiltered'),
    onSelect: openRow,
    onDelete: isPrep ? undefined : deleteRow,
    onBuildWithAria: () => navigate('/aria-studio', { state: { start: 'build' } }),
    onBuildWithBuilder: () => navigate('/cv-builder/new'),
    onInterview: () => navigate('/aria-studio', { state: { start: 'prep' } }),
  };

  const sidebar = (
    <StudioOverlay
      open={drawerOpen}
      onClose={closeSidebar}
      side="left"
      label={t(`workspace.${copy}.title`)}
    >
      <WorkspaceSidebar {...railProps} onClose={closeSidebar} />
    </StudioOverlay>
  );

  // Mounted bare — NOT inside StudioOverlay. That shell owns a focus trap, a body scroll
  // lock and a pushed history entry, all of which are right for a modal drawer and wrong
  // for a column: a persistent panel that trapped focus would put the rest of the page
  // out of keyboard reach, and its history entry would eat the back button.
  //
  // No onClose either: where the column fits, it stays. It is part of the page rather than
  // something laid over it, so there is nothing to dismiss.
  // `role="complementary"` rather than <aside>: the prep page already renders an <aside>
  // for its own rail, and two unlabelled complementary landmarks read worse than one
  // labelled pair. The label reuses the title copy — no new key.
  //
  // `overflow-hidden` is load-bearing: the list's full-bleed row dividers would otherwise
  // square off the rounded corners.
  const inlineSidebar = railInline ? (
    <div
      role="complementary"
      aria-label={t(`workspace.${copy}.title`)}
      className="w-[248px] shrink-0 min-h-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      <WorkspaceSidebar {...railProps} inline />
    </div>
  ) : null;

  return {
    open: drawerOpen,
    openSidebar,
    closeSidebar,
    sidebar,
    // Persistent-mode extras. `inlineSidebar` is null and `railInline` false whenever
    // `persistent` is off, so a surface that doesn't opt in is unaffected by any of it.
    inlineSidebar,
    railInline,
  };
}
