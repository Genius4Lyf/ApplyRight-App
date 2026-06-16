import { Link, useLocation } from 'react-router-dom';
import { Home, Clock, User, FileText, MessageSquare } from 'lucide-react';
import { shouldShowBottomNav } from '../utils/platform';

// Five-tab bottom nav: Home / My CVs / Prep / History / Profile.
// Labels are intentionally omitted — icons-only keeps the bar compact and
// matches modern mobile patterns (Apple HIG / Material 3 "label below" is
// optional for primary destinations). `aria-label` on each Link keeps the
// nav announceable for screen readers.
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
    to: '/interview-prep',
    label: 'Prep',
    icon: <MessageSquare className="w-5 h-5" strokeWidth={2} />,
    matches: ['/interview-prep'],
  },
  {
    to: '/history',
    label: 'History',
    icon: <Clock className="w-5 h-5" strokeWidth={2} />,
    matches: ['/history'],
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: <User className="w-5 h-5" strokeWidth={2} />,
    matches: ['/profile', '/credits', '/upgrade'],
  },
];

const MobileBottomNav = () => {
  const location = useLocation();
  if (!shouldShowBottomNav(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
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
              className={`flex items-center justify-center flex-1 transition-colors ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 active:text-gray-700 dark:text-slate-400 dark:active:text-slate-200'
              }`}
            >
              {icon}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
