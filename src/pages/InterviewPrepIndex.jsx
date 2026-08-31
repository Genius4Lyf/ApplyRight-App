import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceSidebar } from '../hooks/useWorkspaceSidebar';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import SidebarToggle from '../components/workspace/SidebarToggle';
import NewCvMenu from '../components/workspace/NewCvMenu';

// Interview prep with no interview open — the address the prep sidebar needs, and the
// exact counterpart of /cv-builder.
//
// It replaces the redirect that used to send this path to Aria Studio. That was right
// while nothing linked here; it stopped being right the moment the sidebar grew a row
// pointing at this workspace, because a row that bounces you back to the page you are
// standing on reads as broken.
//
// This is NOT the deleted list page returning. There is no deck, no search, no momentum
// stats — the list is the sidebar, the same one the dashboard carries, and this is only
// the frame that holds it when no prep is loaded.
const InterviewPrepIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openSidebar, sidebar, inlineSidebar, railInline } = useWorkspaceSidebar({
    scope: 'prep',
    persistent: true,
  });

  useEffect(() => {
    // Only where the list has no inline home. Wide, it is already a column on screen, and
    // opening a drawer over it would be showing the same list twice.
    if (!railInline) openSidebar();
    // Once, on arrival — reopening every render would make it impossible to close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const header = (
    <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
      {!railInline && <SidebarToggle onClick={openSidebar} className="-ml-1" />}
      <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-slate-700 dark:text-slate-200">
        {t('workspace.prep.title')}
      </span>
    </div>
  );

  return (
    <WorkspaceShell sidebar={sidebar} inlineSidebar={inlineSidebar} header={header}>
      {/* The pane behind the list is not a placeholder waiting for content: it repeats the
          two ways to start, so someone who collapses the sidebar still has every door in
          front of them rather than an empty room. */}
      <div className="flex h-full items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
            {t('workspace.prep.indexTitle')}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('workspace.prep.indexBlurb')}
          </p>
          <div className="mt-6">
            <NewCvMenu
              onBuildWithAria={() => navigate('/aria-studio', { state: { start: 'build' } })}
              onBuildWithBuilder={() => navigate('/cv-builder/new')}
              onInterview={() => navigate('/aria-studio', { state: { start: 'prep' } })}
            />
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default InterviewPrepIndex;
