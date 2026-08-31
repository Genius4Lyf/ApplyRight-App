import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceSidebar } from '../../hooks/useWorkspaceSidebar';
import SidebarToggle from '../../components/workspace/SidebarToggle';
import NewCvMenu from '../../components/workspace/NewCvMenu';
import { useNavigate } from 'react-router-dom';

// The CV builder with no CV open — the address "my CVs" needs in order to exist.
//
// Everywhere else the sidebar is optional chrome over a page you came to for something
// else. Here it IS the page, so it opens on arrival. The pane behind it is not a
// placeholder waiting for content: it repeats the two ways to start, so someone who
// dismisses the sidebar still has every door in front of them rather than an empty room.
const CvBuilderIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openSidebar, sidebar } = useWorkspaceSidebar({ scope: 'builder' });

  useEffect(() => {
    openSidebar();
    // Once, on arrival. Reopening on every render would make the sidebar impossible to
    // close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-dvh overflow-hidden bg-white dark:bg-slate-950 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <SidebarToggle onClick={openSidebar} />
        <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-slate-700 dark:text-slate-200">
          {t('workspace.builder.title')}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
            {t('workspace.builder.indexTitle')}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('workspace.builder.indexBlurb')}
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

      {sidebar}
    </div>
  );
};

export default CvBuilderIndex;
