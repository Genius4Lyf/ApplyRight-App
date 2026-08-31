import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, User, Settings, CreditCard, LogOut, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import AriaOrbit from '../cv/AriaOrbit';
import LanguageSwitcher from '../LanguageSwitcher';
import SignOutConfirm from '../SignOutConfirm';
import { useTheme } from '../../context/ThemeContext';
import { useAccountWallet } from '../../hooks/useAccountWallet';
import { planLabelFor } from '../../lib/planLabels';

// Pinned to the bottom of the sidebar, above nothing. Clicking your own name is where
// the top navbar's account dropdown lived, so everything it offered beyond the primary
// destinations (which live in StudioSidebarNav) lands here too: view profile, manage
// account, credits & billing, language, dark mode, the guide, and sign-out.
//
// Dark mode sits beside the language switcher rather than in the nav above, where it used
// to be: those are destinations, and among them a toggle read as a fourth place to go.
// Here it is what it is — one of two settings for how the app looks and speaks to you. Positioned via
// ordinary relative/absolute layout — not a portal — so the popover stays confined to
// the rail's own width and can't run off the side of a viewport the way a
// viewport-fixed dropdown would.
const StudioSidebarProfile = ({ onOpenGuide, onBeforeNavigate }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const isAuthenticated = !!localStorage.getItem('token');
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    console.error('Failed to parse user from local storage', e);
  }
  const { theme, toggleTheme } = useTheme();
  const { entitlement, isPaid } = useAccountWallet(isAuthenticated);
  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase();

  // Same credits-checkout handoff StudioSidebarNav's wallet "Top up" uses — flush any
  // pending chat, remember where to bounce back to, then hand off to /credits.
  const openCredits = async () => {
    setOpen(false);
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

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (btnRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative shrink-0 border-t border-slate-200 dark:border-slate-800 p-2">
      <button
        type="button"
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <div className="h-8 w-8 shrink-0 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-heading text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          {initials || <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] sm:text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {user && user.firstName
              ? `${user.firstName} ${user.lastName || ''}`.trim()
              : user?.email?.split('@')[0] || t('nav.account.defaultUser')}
          </p>
          {isPaid ? (
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              <AriaOrbit size={10} tone="mono" /> {planLabelFor(entitlement)}
            </span>
          ) : (
            <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
              {t('nav.account.freePlan')}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="menu"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-2 right-2 bottom-[calc(100%+6px)] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1.5 z-[60]"
          >
            <div className="px-2 py-1.5">
              <LanguageSwitcher />
            </div>
            {/* Stays open on click — flipping the theme is something you may want to see
                and undo, and closing the menu under you makes the second tap a hunt. */}
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={theme === 'dark'}
              onClick={toggleTheme}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[17px] sm:text-[13px] text-slate-600 dark:text-slate-300 text-left transition-colors"
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
            <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1.5 my-1" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenGuide?.();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[17px] sm:text-[13px] text-slate-600 dark:text-slate-300 text-left transition-colors"
            >
              <AriaOrbit size={16} />
              <span className="flex-1">{t('ariaStudio.welcomeGuide.howItWorks')}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.welcomeGuide.guide')}
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[17px] sm:text-[13px] text-slate-600 dark:text-slate-300 text-left transition-colors"
            >
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="flex-1">{t('nav.account.viewProfile')}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[17px] sm:text-[13px] text-slate-600 dark:text-slate-300 text-left transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="flex-1">{t('nav.account.manageAccount')}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={openCredits}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[17px] sm:text-[13px] text-slate-600 dark:text-slate-300 text-left transition-colors"
            >
              <CreditCard className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="flex-1">{t('nav.account.creditsAndBilling')}</span>
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1.5 my-1" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[17px] sm:text-[13px] text-slate-500 dark:text-slate-400 text-left transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="flex-1">{t('common.signOut')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <SignOutConfirm
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
      />
    </div>
  );
};

export default StudioSidebarProfile;
