import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { shouldShowBottomNav, isMobile } from '../utils/platform';
import AriaOrbit from './cv/AriaOrbit';

// Two labeled tabs (icon + text below): Home / Aria.
//
// It was four. My CVs and Interview both pointed at LIST pages, and those pages are gone:
// each list now lives in its own workspace's sidebar, reachable from the toggle in that
// page's header. A tab that opened a list we no longer have would be a tab to nowhere,
// and re-pointing them at the workspaces would duplicate what the sidebar already offers.
//
// The bar is suppressed entirely on those workspace surfaces (see WORKSPACE_PREFIXES) —
// this is chrome for the pages you pass through, not the ones you settle into. Account
// (profile, credits, billing) lives in the avatar dropdown in the top bar.
const TABS = [
  {
    to: '/dashboard',
    labelKey: 'nav.mobile.home',
    icon: <Home className="w-5 h-5" strokeWidth={2} />,
    matches: ['/dashboard'],
  },
  {
    to: '/aria-studio',
    labelKey: 'nav.mobile.ariaStudio',
    icon: <AriaOrbit size={20} />,
    matches: ['/aria-studio'],
  },
];

const MobileBottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  if (!shouldShowBottomNav(location.pathname)) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-1px_3px_rgba(0,0,0,0.04)] ${
        isMobile() ? '' : 'md:hidden'
      }`}
    >
      <div className="flex items-stretch h-14">
        {TABS.map(({ to, labelKey, icon, matches }) => {
          const active = matches.some(
            (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
          );
          const label = t(labelKey);

          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-semibold transition-colors ${
                active
                  ? 'text-slate-900 dark:text-white'
                  : 'text-gray-500 active:text-gray-700 dark:text-slate-400 dark:active:text-slate-200'
              }`}
            >
              {/* Same ink marker as the desktop masthead, flipped to the top edge
                  — an underline on a bottom bar would sit in the safe-area gutter. */}
              {active && (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-slate-900 dark:bg-white" />
              )}
              {icon}
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
