import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardCheck, Plus, FileText, LayoutTemplate } from 'lucide-react';
import AriaOrbit from '../cv/AriaOrbit';
import { useTranslation } from 'react-i18next';
import { useAccountWallet } from '../../hooks/useAccountWallet';
import { homePathFor } from '../../lib/home';

// A sidebar's destination rows + wallet block — every place in the app you might go from
// wherever you are. Shared by Aria Studio's rail and the workspace sidebar, so the way
// OUT is the same set of doors in the same order on every surface.
//
// ONE RULE decides which rows appear: a workspace's row is hidden when you are already
// standing in that workspace. A row that reloads the page you are on reads as broken, and
// the list it would take you to is the one already open beside it.
//
// THIS IS THE WHOLE NAV NOW. It used to be three rows, because a dashboard sat behind
// Home holding cards for everywhere else. The dashboard is gone (see lib/home.js), which
// makes this list the only index of the app there is — so the two rows that were removed
// on the grounds that "the dashboard carries them" are back:
//
//   My CVs    — otherwise reachable only by leaving the wizard or an old /my-cvs link
//   CV Studio — otherwise reachable from NOTHING. Its own address is /resume/:id, a
//               document rather than a place, so /cv-studio had exactly one inbound
//               link in the app and it was on the page being deleted.
//
// For a job seeker there is no separate Home row: home IS Aria Studio, and two rows to
// one address is the thing the rule above exists to prevent. Agents keep Home, because
// theirs is a different workspace and they are held out of the Studio entirely.
//
// Dark mode moved into the profile drop-up. It is a setting, and these are destinations;
// sitting among them it read as a fourth place to go. Account-management links (view profile, manage account, credits & billing)
// live in StudioSidebarProfile's drop-up popover instead, alongside sign-out and
// language — everything you'd go looking for by clicking your own name at the bottom,
// rather than mixed in with the primary destinations up here. Reuses the SAME
// useAccountWallet hook the navbar uses so there is only ever one wallet fetch/
// localStorage-writer active on a page, and the shared homePathFor (lib/home.js) the
// navbar also uses, rather than re-deriving it.
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
  const homePath = homePathFor(user);

  const { displayCredits, minutesLeft, freeTasteMin } = useAccountWallet(isAuthenticated);

  const at = (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`);
  const inAriaStudio = at('/aria-studio');
  const inPrep = at('/interview-prep');
  const inBuilder = at('/cv-builder');
  // Two addresses, one workspace: /cv-studio is the list frame, /resume/:id is the studio
  // itself. Standing in either one, a row pointing at the other reads as a door back into
  // the room you are in.
  const inCvStudio = at('/cv-studio') || at('/resume');

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
        {/* Agents only. A seeker's home is Aria Studio, which has its own row below —
            and the rule says one workspace, one row. */}
        {isAgent && (
          <button type="button" onClick={() => navigate(homePath)} className={rowClass}>
            <Home className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            {t('nav.mobile.home')}
          </button>
        )}
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
        {!inBuilder && (
          <button type="button" onClick={() => navigate('/cv-builder')} className={rowClass}>
            <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            {t('nav.myCvs')}
          </button>
        )}
        {!inCvStudio && (
          <button type="button" onClick={() => navigate('/cv-studio')} className={rowClass}>
            <LayoutTemplate className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            {t('workspace.cvStudio.title')}
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
