import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, Settings, CreditCard, Moon, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAccountWallet } from '../../hooks/useAccountWallet';

// The Studio sidebar's destination rows + wallet block — everything the top navbar's
// account dropdown carried other than sign-out and language (those live in
// StudioSidebarProfile's popover instead). Reuses the SAME useAccountWallet hook the
// navbar uses so there is only ever one wallet fetch/localStorage-writer active on a
// page, and the SAME isAgent/homePath derivation the navbar uses (Navbar.jsx) rather
// than re-deriving it.
const StudioSidebarNav = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isAuthenticated = !!localStorage.getItem('token');
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    console.error('Failed to parse user from local storage', e);
  }
  const isAgent = user?.role === 'agent';
  const homePath = isAgent ? '/agent' : '/dashboard';

  const { displayCredits, minutesLeft, freeTasteMin } = useAccountWallet(isAuthenticated);

  const rowClass =
    'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-left';

  if (!isAuthenticated) return null;

  return (
    <div className="shrink-0 px-2 pb-3 space-y-3">
      <nav>
        <button type="button" onClick={() => navigate(homePath)} className={rowClass}>
          <Home className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {t('nav.mobile.home')}
        </button>
        <button type="button" onClick={() => navigate('/profile')} className={rowClass}>
          <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {t('nav.account.viewProfile')}
        </button>
        <button type="button" onClick={() => navigate('/profile')} className={rowClass}>
          <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {t('nav.account.manageAccount')}
        </button>
        <button type="button" onClick={() => navigate('/credits')} className={rowClass}>
          <CreditCard className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {t('nav.account.creditsAndBilling')}
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={theme === 'dark'}
          onClick={toggleTheme}
          className={rowClass}
        >
          <Moon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="flex-1">{t('nav.account.darkMode')}</span>
          <span
            className={`w-[34px] h-[19px] rounded-full relative transition-colors shrink-0 ${
              theme === 'dark' ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-[15px] h-[15px] rounded-full bg-white shadow transition-all ${
                theme === 'dark' ? 'left-[17px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Wallet — a subtle grouped surface, not a bordered card, sitting one shade
          deeper than the rail's own background. */}
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 space-y-1.5">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-slate-500 dark:text-slate-400">{t('nav.account.credits')}</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {t('nav.account.creditsLeft', { count: displayCredits ?? 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-slate-500 dark:text-slate-400">
            {t('nav.account.interviewMinutes')}
          </span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {t('nav.account.minutesShort', { n: minutesLeft ?? freeTasteMin ?? 0 })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/credits')}
          className="w-full flex items-center justify-between pt-1.5 mt-0.5 border-t border-slate-200 dark:border-slate-700 text-[12.5px] text-slate-600 dark:text-slate-300"
        >
          <span className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {t('nav.account.topUpCredits')}
          </span>
          <span className="text-[11px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full px-2.5 py-0.5">
            {t('nav.account.topUpAction')}
          </span>
        </button>
      </div>
    </div>
  );
};

export default StudioSidebarNav;
