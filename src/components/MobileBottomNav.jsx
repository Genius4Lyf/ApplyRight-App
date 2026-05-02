import { NavLink, useLocation } from 'react-router-dom';
import { Home, Clock, User, MessageSquare } from 'lucide-react';
import { shouldShowBottomNav } from '../utils/platform';

const TABS = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/interview-prep', label: 'Prep', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: User },
];

const MobileBottomNav = () => {
  const location = useLocation();
  if (!shouldShowBottomNav(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-stretch h-16">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-500 active:text-gray-700'
              }`
            }
          >
            <Icon className="w-5 h-5" strokeWidth={2} />
            <span className="text-[11px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
