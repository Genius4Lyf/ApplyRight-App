import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceSidebar } from '../../hooks/useWorkspaceSidebar';
import WorkspaceShell from './WorkspaceShell';
import SidebarToggle from './SidebarToggle';

// THE ACCOUNT SURFACES: your profile, plans, and the credit store.
//
// These three were the last signed-in pages still wearing the top navbar, after every
// workspace had moved to a sidebar. A page that carries different chrome from every
// other page reads as a page from a different app — and worse, the navbar's own idea of
// "home" had quietly become the only thing still pointing at a dashboard that no longer
// exists.
//
// They share this wrapper rather than each calling the hook, because three copies of the
// same four lines is three chances for one of them to drift — which is exactly how the
// prep index and the prep dashboard ended up needing WorkspaceShell in the first place.
//
// Scope 'account' means NO LIST: there is nothing here you pick from, so the panel is the
// nav, the wallet and the profile block, and it fetches nothing at all.
//
// Deliberately NOT auto-opening the drawer on arrival, unlike /cv-builder and /cv-studio.
// Those are index pages where the list IS the content; you came here to change a setting
// or buy something, and a nav panel over the top of that is in the way.
const AccountShell = ({ children, overlays }) => {
  const { t } = useTranslation();
  const { openSidebar, sidebar, inlineSidebar, railInline } = useWorkspaceSidebar({
    scope: 'account',
    persistent: true,
  });

  // One title for all three. Each page's own <h1> already says which of them you are on;
  // repeating that up here would be the same word twice, and the header's job is to say
  // which part of the app you are in.
  const header = (
    <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
      {!railInline && <SidebarToggle onClick={openSidebar} className="-ml-1" />}
      <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-slate-700 dark:text-slate-200">
        {t('workspace.account.title')}
      </span>
    </div>
  );

  return (
    <WorkspaceShell
      sidebar={sidebar}
      inlineSidebar={inlineSidebar}
      header={header}
      overlays={overlays}
    >
      {children}
    </WorkspaceShell>
  );
};

export default AccountShell;
