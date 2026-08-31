import React from 'react';
import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// One affordance, four headers. The workspace sidebar is drawn OVER the page rather than
// built into it, so nothing on screen hints that a list exists — this button is the only
// thing that does, and it has to look and sit the same everywhere or it stops reading as
// the same control.
//
// It uses the same glyph as Aria Studio's own rail toggle, for the same reason.
//
// It only ever OPENS. Where the sidebar is an inline column the host does not render this
// at all — the list is already on screen and stays there.
const SidebarToggle = ({ onClick, className = '' }) => {
  const { t } = useTranslation();
  const label = t('workspace.openSidebar');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-slate-100 ${className}`}
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
};

export default SidebarToggle;
