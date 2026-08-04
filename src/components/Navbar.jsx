import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  History,
  LayoutDashboard,
  User,
  Settings,
  ChevronDown,
  MessageSquare,
  FileText,
  Crown,
  Clock,
  Wallet,
  Moon,
  Plus,
  CreditCard,
} from 'lucide-react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import AriaOrbit from './cv/AriaOrbit';
import SignOutConfirm from './SignOutConfirm';
import { useAccountWallet } from '../hooks/useAccountWallet';
import { planLabelFor } from '../lib/planLabels';

import logoBlack from '../assets/logo/applyright-icon-black.png';
import logoWhite from '../assets/logo/applyright-icon-white.png';

// Account avatar + dropdown — self-contained (owns its open state, ref, and
// outside-click/Escape handling) so it can be rendered independently in BOTH the
// desktop and the mobile top bar without a shared-ref collision. Account (credits,
// minutes, profile, billing, dark mode, sign out) is reachable from the top on
// every platform.
const AccountMenu = ({
  user,
  isPaid,
  entitlement,
  displayCredits,
  minutesLeft,
  freeTasteMin,
  theme,
  toggleTheme,
  navigate,
  onSignOut,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase();
  const btnRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const closeTimer = React.useRef(null);

  // Position the portaled panel under the avatar, right-aligned to the viewport.
  const place = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
  };

  // Hover-open bridges the gap between the button and the (now portaled) panel via
  // a short close delay, so moving the cursor onto the panel doesn't close it.
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  // While open: keep the panel positioned (scroll/resize) and handle outside-click
  // + Escape. The panel lives outside the button's DOM subtree (portal), so a click
  // inside EITHER the button or the panel counts as "inside".
  React.useEffect(() => {
    if (!open) return undefined;
    place();
    const onReflow = () => place();
    const onDown = (event) => {
      if (btnRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  React.useEffect(() => () => cancelClose(), []);

  return (
    <div className="relative" onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <button
        type="button"
        ref={btnRef}
        onClick={() => {
          cancelClose();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 p-1 pl-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-heading text-[12px] font-semibold text-slate-700 dark:text-slate-200">
          {initials || <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              role="menu"
              ref={panelRef}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                top: pos.top,
                right: pos.right,
                minWidth: 290,
                maxWidth: 'calc(100vw - 16px)',
              }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1.5 z-[100]"
            >
              {/* Header (identity) */}
              <div className="flex items-center gap-3 px-2.5 pt-2.5 pb-3">
                <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 font-heading text-[14px] font-semibold text-slate-700 dark:text-slate-200">
                  {initials || <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-[15px] font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user && user.firstName
                      ? `${user.firstName} ${user.lastName || ''}`.trim()
                      : user?.email?.split('@')[0] || t('nav.account.defaultUser')}
                  </p>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                      <AriaOrbit size={12} tone="mono" /> {planLabelFor(entitlement)}
                    </span>
                  ) : (
                    <span className="block mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                      {t('nav.account.freePlan')}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1.5" />

              {/* Meters */}
              <div className="px-2.5 py-2">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
                    <AriaOrbit size={14} /> {t('nav.account.credits')}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {t('nav.account.creditsLeft', { count: displayCredits ?? 0 })}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                    style={{
                      width: `${Math.max(8, Math.min(100, Number(displayCredits) || 0))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="px-2.5 py-2">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
                    <Clock className="w-3.5 h-3.5" /> {t('nav.account.interviewMinutes')}
                  </span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {t('nav.account.minutesShort', { n: minutesLeft ?? freeTasteMin ?? 0 })}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-600 dark:bg-amber-400"
                    style={{
                      width: `${Math.max(8, Math.min(100, Number(minutesLeft ?? freeTasteMin) || 0))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1.5" />

              {/* Top-up + nav rows */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate('/credits');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-[13px] text-left transition-colors"
              >
                <Plus className="w-4 h-4 text-slate-500" />
                <span className="flex-1 text-slate-600 dark:text-slate-300">
                  {t('nav.account.topUpCredits')}
                </span>
                <span className="text-[11px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full px-3 py-1">
                  {t('nav.account.topUpAction')}
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[13px] text-slate-800 dark:text-slate-100 text-left transition-colors"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span className="flex-1">{t('nav.account.viewProfile')}</span>
                <span className="text-slate-300 dark:text-slate-600">›</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[13px] text-slate-800 dark:text-slate-100 text-left transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span className="flex-1">{t('nav.account.manageAccount')}</span>
                <span className="text-slate-300 dark:text-slate-600">›</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate('/credits');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[13px] text-slate-800 dark:text-slate-100 text-left transition-colors"
              >
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span className="flex-1">{t('nav.account.creditsAndBilling')}</span>
                <span className="text-slate-300 dark:text-slate-600">›</span>
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1.5" />

              {/* Dark-mode toggle — flips the whole app theme; leaves the menu
                open so the change is visible immediately. */}
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={theme === 'dark'}
                onClick={toggleTheme}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[13px] text-slate-800 dark:text-slate-100 text-left transition-colors"
              >
                <Moon className="w-4 h-4 text-slate-500" />
                <span className="flex-1">{t('nav.account.darkMode')}</span>
                <span
                  className={`w-[34px] h-[19px] rounded-full relative transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-900 dark:bg-white'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-[15px] h-[15px] rounded-full bg-white shadow transition-all ${
                      theme === 'dark' ? 'left-[17px]' : 'left-0.5'
                    }`}
                  />
                </span>
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1.5" />

              {/* Sign out — muted, not rose, per the mock. */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[13px] text-slate-500 dark:text-slate-400 text-left transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="flex-1">{t('common.signOut')}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

const Navbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isAuthenticated = !!localStorage.getItem('token');

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    console.error('Failed to parse user from local storage', e);
  }
  // CV agents get a CV-only workspace: no interview prep, no job applications,
  // and no interview-minute wallet. They see Clients instead.
  const isAgent = user?.role === 'agent';
  const homePath = isAgent ? '/agent' : '/dashboard';

  const { entitlement, isPaid, displayCredits, minutesLeft, freeTasteMin } =
    useAccountWallet(isAuthenticated);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Desktop masthead tab: full-height, underline active state (no filled pill).
  const deskTab = (active) =>
    `relative flex items-center gap-2 h-14 px-3 text-sm transition-colors ${
      active
        ? 'font-semibold text-slate-900 dark:text-slate-100'
        : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
    }`;
  const deskUnderline = (active) =>
    active ? (
      <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-slate-900 dark:bg-white" />
    ) : null;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* LEFT — logo pinned to the left edge; flex-1 pushes the nav to true center */}
        <div className="flex-1 flex items-center min-w-0">
          <Link
            to={isAuthenticated ? homePath : '/'}
            className="flex items-center gap-2.5 z-50 shrink-0"
          >
            <img src={logoBlack} alt="ApplyRight" className="h-7 w-auto dark:hidden" />
            <img src={logoWhite} alt="" aria-hidden="true" className="hidden h-7 w-auto dark:block" />
            <span className="font-brand text-lg font-semibold tracking-tight text-black dark:text-white">
              ApplyRight
            </span>
          </Link>
        </div>

        {/* CENTER — desktop nav tabs */}
        <nav className="hidden md:flex items-center gap-1 shrink-0">
          {isAuthenticated && (
            <>
              <Link to={homePath} className={deskTab(isActive(homePath))}>
                {deskUnderline(isActive(homePath))}
                <LayoutDashboard className="w-4 h-4" />
                {t('nav.dashboard')}
              </Link>
              {isAgent && (
                <Link
                  to="/agent/earnings"
                  className={deskTab(location.pathname.startsWith('/agent/earnings'))}
                >
                  {deskUnderline(location.pathname.startsWith('/agent/earnings'))}
                  <Wallet className="w-4 h-4" />
                  {t('nav.earnings')}
                </Link>
              )}
              <Link to="/my-cvs" className={deskTab(location.pathname.startsWith('/my-cvs'))}>
                {deskUnderline(location.pathname.startsWith('/my-cvs'))}
                <FileText className="w-4 h-4" />
                {t('nav.myCvs')}
              </Link>
              {!isAgent && (
                <>
                  <Link to="/history" className={deskTab(isActive('/history'))}>
                    {deskUnderline(isActive('/history'))}
                    <History className="w-4 h-4" />
                    {t('nav.myApplications')}
                  </Link>
                  <Link
                    to="/interview-prep"
                    className={deskTab(location.pathname.startsWith('/interview-prep'))}
                  >
                    {deskUnderline(location.pathname.startsWith('/interview-prep'))}
                    <MessageSquare className="w-4 h-4" />
                    {t('nav.interviewPrep')}
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* RIGHT — desktop cluster + mobile chrome (flex-1 + justify-end mirrors LEFT) */}
        <div className="flex-1 flex items-center justify-end gap-3">
          {/* desktop right cluster */}
          <div className="hidden md:flex items-center gap-4">
            {!isAuthenticated ? (
              <div className="flex items-center gap-3">
                <LanguageSwitcher />
                <Link
                  to="/pricing"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {t('nav.pricing')}
                </Link>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {t('common.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
                >
                  {t('common.signUp')}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {/* Agents have no interview minutes. With a plan, the scarce
                  resource is CV credits (for tailoring) — show the balance and
                  link to top up. Without a plan, prompt them to subscribe.
                  Non-agent wallet (minutes/credits pill) now lives in the avatar
                  dropdown, so only the agent credits link renders here. */}
                {isAgent && (
                  <Link
                    to={isPaid ? '/credits' : '/upgrade'}
                    aria-label={isPaid ? t('nav.creditsAria') : t('nav.getPlan')}
                    className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {isPaid ? (
                      <>
                        <AriaOrbit size={16} />
                        <span className="font-heading text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {displayCredits !== null && displayCredits !== undefined
                            ? displayCredits
                            : '…'}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                          cr
                        </span>
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
                          {t('nav.getPlan')}
                        </span>
                      </>
                    )}
                  </Link>
                )}

                <LanguageSwitcher />

                {/* Account avatar + dropdown — reachable from every top bar. */}
                <AccountMenu
                  user={user}
                  isPaid={isPaid}
                  entitlement={entitlement}
                  displayCredits={displayCredits}
                  minutesLeft={minutesLeft}
                  freeTasteMin={freeTasteMin}
                  theme={theme}
                  toggleTheme={toggleTheme}
                  navigate={navigate}
                  onSignOut={() => setShowLogoutConfirm(true)}
                />
              </div>
            )}
          </div>

          {/* Mobile chrome — the account avatar (authenticated) or auth CTAs
              (guests). Primary nav is the shared bottom tab bar (both platforms);
              the hamburger/drawer is retired. */}
          <div className="md:hidden flex items-center gap-2">
            {/* Primary nav is the bottom tab bar; account lives in the avatar
              dropdown (both platforms). Guests get compact auth CTAs. */}
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                {isAgent && (
                  <button
                    type="button"
                    onClick={() => navigate('/upgrade')}
                    className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    aria-label={t('nav.agentPlanAria')}
                  >
                    <AriaOrbit size={14} />
                    <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {isPaid ? planLabelFor(entitlement) : t('nav.agentPlans')}
                    </span>
                  </button>
                )}
                <AccountMenu
                  user={user}
                  isPaid={isPaid}
                  entitlement={entitlement}
                  displayCredits={displayCredits}
                  minutesLeft={minutesLeft}
                  freeTasteMin={freeTasteMin}
                  theme={theme}
                  toggleTheme={toggleTheme}
                  navigate={navigate}
                  onSignOut={() => setShowLogoutConfirm(true)}
                />
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-2 py-1"
                >
                  {t('common.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
                >
                  {t('common.signUp')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <SignOutConfirm
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
      />
    </header>
  );
};

export default Navbar;
