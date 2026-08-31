import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardCheck, Plus } from 'lucide-react';
import AriaOrbit from '../cv/AriaOrbit';
import { useTranslation } from 'react-i18next';
import { useAccountWallet } from '../../hooks/useAccountWallet';

// A sidebar's destination rows + wallet block — Home, and whichever of the two studios
// you are not currently in. Shared by Aria Studio's rail and the workspace sidebar, so
// the way OUT of wherever you are is the same set of doors in the same order.
//
// ONE RULE decides which rows appear: a workspace's row is hidden when you are already
// standing in that workspace. A row that reloads the page you are on reads as broken, and
// the list it would take you to is the one already open beside it.
//
// "My CVs" is gone from all of them. It was hidden in the CV workspace by that rule, and
// removed from Aria Studio and interview prep by hand — in each, the sidebar you would be
// clicking it from already lists work of its own, and a second list is a door out of a
// room you only just walked into. NOTE the consequence: /cv-builder is now reached from
// the Dashboard, from leaving the wizard, or from an old /my-cvs link — not from here.
//
// Dark mode moved into the profile drop-up. It is a setting, and these are destinations;
// sitting among them it read as a fourth place to go. Account-management links (view profile, manage account, credits & billing)
// live in StudioSidebarProfile's drop-up popover instead, alongside sign-out and
// language — everything you'd go looking for by clicking your own name at the bottom,
// rather than mixed in with the primary destinations up here. Reuses the SAME
// useAccountWallet hook the navbar uses so there is only ever one wallet fetch/
// localStorage-writer active on a page, and the SAME isAgent/homePath derivation the
// navbar uses (Navbar.jsx) rather than re-deriving it.
const StudioSidebarNav = ({ onBeforeNavigate }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

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

  const inAriaStudio = location.pathname.startsWith('/aria-studio');
  const inPrep = location.pathname.startsWith('/interview-prep');

  const rowClass =
    'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[17px] sm:text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-left';

  const openCredits = async () => {
    try {
      await onBeforeNavigate?.();
    } catch {
      // Checkout navigation remains available if a best-effort chat flush fails.
    }
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    try {
      localStorage.setItem('arPostCheckout', returnTo);
      localStorage.setItem('arCheckoutIntent', 'credits');
    } catch {
      /* Router state still carries the return destination for this visit. */
    }
    navigate('/credits', { state: { returnTo } });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="shrink-0 px-2 pb-3 space-y-3">
      <nav>
        <button type="button" onClick={() => navigate(homePath)} className={rowClass}>
          <Home className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {t('nav.mobile.home')}
        </button>
        {/* Agents are held out of the Studio entirely. */}
        {!isAgent && !inAriaStudio && (
          <button type="button" onClick={() => navigate('/aria-studio')} className={rowClass}>
            <AriaOrbit size={16} className="shrink-0" />
            {t('nav.ariaStudio')}
          </button>
        )}
        {!isAgent && !inPrep && (
          <button type="button" onClick={() => navigate('/interview-prep')} className={rowClass}>
            <ClipboardCheck className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            {t('nav.interviewPrep')}
          </button>
        )}
      </nav>

      {/* Wallet — a subtle grouped surface, not a bordered card, sitting one shade
          deeper than the rail's own background. */}
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 space-y-1.5">
        <div className="flex items-center justify-between text-[17px] sm:text-[12.5px]">
          <span className="text-slate-500 dark:text-slate-400">{t('nav.account.credits')}</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {t('nav.account.creditsLeft', { count: displayCredits ?? 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-[17px] sm:text-[12.5px]">
          <span className="text-slate-500 dark:text-slate-400">
            {t('nav.account.interviewMinutes')}
          </span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {t('nav.account.minutesShort', { n: minutesLeft ?? freeTasteMin ?? 0 })}
          </span>
        </div>
        <button
          type="button"
          onClick={openCredits}
          className="w-full flex items-center justify-between pt-1.5 mt-0.5 border-t border-slate-200 dark:border-slate-700 text-[17px] sm:text-[12.5px] text-slate-600 dark:text-slate-300"
        >
          <span className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {t('nav.account.topUpCredits')}
          </span>
          <span className="text-[15px] sm:text-[11px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full px-2.5 py-0.5">
            {t('nav.account.topUpAction')}
          </span>
        </button>
      </div>
    </div>
  );
};

export default StudioSidebarNav;
