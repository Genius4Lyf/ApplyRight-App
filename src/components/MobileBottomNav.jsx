import { Link, useLocation } from 'react-router-dom';
import { Home, History, FileText, MessageSquare } from 'lucide-react';
import { shouldShowBottomNav, isMobile } from '../utils/platform';

// Four labeled tabs (icon + text below): Home / My CVs / Applications / Interview.
// The single primary nav on both platforms — always visible on native, mobile-only
// on the web (md:hidden). Account (profile, credits, billing) lives in the avatar
// dropdown in the top bar, so it's no longer a tab here.
const TABS = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: <Home className="w-5 h-5" strokeWidth={2} />,
    matches: ['/dashboard'],
  },
  {
    to: '/my-cvs',
    label: 'My CVs',
    icon: <FileText className="w-5 h-5" strokeWidth={2} />,
    matches: ['/my-cvs'],
  },
  {
    to: '/history',
    label: 'Applications',
    icon: <History className="w-5 h-5" strokeWidth={2} />,
    matches: ['/history'],
  },
  {
    to: '/interview-prep',
    label: 'Interview',
    icon: <MessageSquare className="w-5 h-5" strokeWidth={2} />,
    matches: ['/interview-prep'],
  },
];

const MobileBottomNav = () => {
  const location = useLocation();
  if (!shouldShowBottomNav(location.pathname)) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-1px_3px_rgba(0,0,0,0.04)] ${
        isMobile() ? '' : 'md:hidden'
      }`}
    >
      <div className="flex items-stretch h-14">
        {TABS.map(({ to, label, icon, matches }) => {
          const active = matches.some(
            (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
          );

          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-semibold transition-colors ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 active:text-gray-700 dark:text-slate-400 dark:active:text-slate-200'
              }`}
            >
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
