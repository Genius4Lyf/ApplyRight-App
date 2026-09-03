import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceSidebar } from '../hooks/useWorkspaceSidebar';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import SidebarToggle from '../components/workspace/SidebarToggle';
import NewCvMenu from '../components/workspace/NewCvMenu';

// The CV Studio with no CV open — the address the studio needs in order to be LINKABLE,
// and the third of the same shape as /cv-builder and /interview-prep.
//
// The studio itself is /resume/:id: it is a document surface, so until now it had no
// address that did not already name a document. That is why nothing on the dashboard
// could point at it — there was nowhere to point. This is that nowhere.
//
// Not a list page returning. There is no deck and no search: the list is the sidebar, the
// same Completed CVs sidebar every other surface carries, and this is only the frame that
// holds it when no document is loaded.
const CvStudioIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openSidebar, sidebar, inlineSidebar, railInline } = useWorkspaceSidebar({
    scope: 'cvStudio',
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
        {t('workspace.cvStudio.title')}
      </span>
    </div>
  );

  return (
    <WorkspaceShell sidebar={sidebar} inlineSidebar={inlineSidebar} header={header}>
      {/* Behind the list, the ways to MAKE one. This surface only ever lists finished CVs,
          so arriving with none is the likeliest first visit — and an empty room with no
          door out is the worst thing to hand someone who followed a link here. */}
      <div className="flex h-full items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
            {t('workspace.cvStudio.indexTitle')}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('workspace.cvStudio.indexBlurb')}
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

export default CvStudioIndex;
