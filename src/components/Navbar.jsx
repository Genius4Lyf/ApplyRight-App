import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Coins,
  LogOut,
  History,
  LayoutDashboard,
  User,
  Menu,
  X,
  Settings,
  ChevronDown,
  MessageSquare,
  FileText,
  Crown,
  Clock,
  Mic,
  Wallet,
} from 'lucide-react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { billingService } from '../services';
import UserService from '../services/user.service';
import { isMobile } from '../utils/platform';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

import logo from '../assets/logo/applyright-icon.png';

const PLAN_LABELS = {
  weekly_pro: '2-Week Pro',
  monthly_pro: 'Monthly Pro',
  monthly_premium: 'Premium',
};
const planLabelFor = (ent) =>
  ent?.planId ? PLAN_LABELS[ent.planId] || ent.planId : ent?.tier === 'pro' ? 'Premium' : 'Pro';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Pin the page while the slide-out drawer is open so the content behind it
  // can't scroll or jump.
  useBodyScrollLock(isMobileMenuOpen);

  // Shared styling for drawer nav links — flat editorial rows; the left rule +
  // subtle bg is the active signal (icons keep inheriting text color).
  const navLinkClass = (active) =>
    `relative flex items-center gap-3 py-3 pl-4 pr-3 rounded-lg font-medium transition-colors ${
      active
        ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
    }`;
  const activeBar = (show) =>
    show ? (
      <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-indigo-500" />
    ) : null;

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

  const [credits, setCredits] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  // Activity snapshot shown inside the drawer. Fetched lazily the first time the
  // menu opens so we don't add an API call to every page load.
  const [activity, setActivity] = useState(null);
  const [showCreditPopover, setShowCreditPopover] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const popoverRef = React.useRef(null);
  const accountMenuRef = React.useRef(null);

  // Derived wallet view (plan tier + live-interview minutes). Free users see
  // credits; paid users see their plan + remaining minutes.
  const tier = entitlement?.tier || 'free';
  const isPaid = tier !== 'free';
  // Combined spendable credits (plan allowance + wallet). Paid users now have a
  // finite balance instead of "unlimited", so show the real number.
  const displayCredits = entitlement?.availableCredits ?? credits;
  const minutesLeft = entitlement?.minutesRemaining ?? null;
  const freeTasteMin = entitlement
    ? Math.ceil((entitlement.freeTasteRemainingSec || 0) / 60)
    : null;

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowCreditPopover(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setShowCreditPopover(false);
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCredits = async () => {
      try {
        const data = await billingService.getBalance();
        setCredits(data.credits);
        // Mirror the authoritative balance into localStorage and broadcast it
        // so every <CreditGate> (which reads from localStorage via useCredits)
        // sees the same value as the navbar. Without this, out-of-band grants
        // (referrals, admin top-ups, AdMob SSV callbacks, other tabs) would
        // show the right number in the navbar but still trip the credit gates.
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (typeof data?.credits === 'number') {
            user.credits = data.credits;
            localStorage.setItem('user', JSON.stringify(user));
            window.dispatchEvent(new CustomEvent('credit_updated', { detail: data.credits }));
          }
        } catch {
          // localStorage unavailable — non-fatal, navbar state still updates.
        }
      } catch (error) {
        console.error('Failed to fetch credits', error);
      }
    };

    fetchCredits();

    // Listen for real-time updates from other components
    const handleCreditUpdate = (event) => {
      // console.log('📥 Navbar: Received credit_updated event:', event.detail);
      if (typeof event.detail === 'number') {
        // console.log('✅ Navbar: Updating credits display to:', event.detail);
        setCredits(event.detail);
      } else {
        console.warn('⚠️ Navbar: Invalid credit value received:', event.detail);
      }
    };

    // console.log('👂 Navbar: Listening for credit_updated events');
    window.addEventListener('credit_updated', handleCreditUpdate);
    return () => {
      // console.log('🔇 Navbar: Removing credit_updated listener');
      window.removeEventListener('credit_updated', handleCreditUpdate);
    };
  }, [isAuthenticated]);

  // Subscription/minute entitlement. Fetched on mount and refreshed whenever a
  // purchase or interview fires 'entitlement_updated' (see BillingReturn /
  // MockInterviewPage), so the wallet pill stays current without polling.
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const fetchEntitlement = () =>
      billingService
        .getEntitlement()
        .then(setEntitlement)
        .catch(() => {});
    fetchEntitlement();
    window.addEventListener('entitlement_updated', fetchEntitlement);
    return () => window.removeEventListener('entitlement_updated', fetchEntitlement);
  }, [isAuthenticated]);

  // Load the activity snapshot the first time the drawer opens (agents don't have
  // interview/job stats, so skip them). Refetched if the drawer reopens after an
  // 'entitlement_updated' cleared it — otherwise cached for the session.
  React.useEffect(() => {
    if (!isMobileMenuOpen || !isAuthenticated || isAgent || activity !== null) return;
    let alive = true;
    UserService.getActivityStats()
      .then((data) => {
        if (alive) setActivity(data || {});
      })
      .catch(() => {
        if (alive) setActivity({});
      });
    return () => {
      alive = false;
    };
  }, [isMobileMenuOpen, isAuthenticated, isAgent, activity]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Desktop masthead tab: full-height, underline active state (no filled pill).
  const deskTab = (active) =>
    `relative flex items-center gap-2 h-16 px-3 text-sm transition-colors ${
      active
        ? 'font-semibold text-slate-900 dark:text-slate-100'
        : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
    }`;
  const deskUnderline = (active) =>
    active ? (
      <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-indigo-500" />
    ) : null;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={isAuthenticated ? homePath : '/'} className="flex items-center gap-2.5 z-50">
          <img src={logo} alt="ApplyRight" className="h-7 w-auto" />
          <span className="font-heading text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Apply<span className="text-indigo-600 dark:text-indigo-400">Right</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-1">
            {isAuthenticated && (
              <>
                <Link to={homePath} className={deskTab(isActive(homePath))}>
                  {deskUnderline(isActive(homePath))}
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                {isAgent && (
                  <Link
                    to="/agent/earnings"
                    className={deskTab(location.pathname.startsWith('/agent/earnings'))}
                  >
                    {deskUnderline(location.pathname.startsWith('/agent/earnings'))}
                    <Wallet className="w-4 h-4" />
                    Earnings
                  </Link>
                )}
                <Link to="/my-cvs" className={deskTab(location.pathname.startsWith('/my-cvs'))}>
                  {deskUnderline(location.pathname.startsWith('/my-cvs'))}
                  <FileText className="w-4 h-4" />
                  My CVs
                </Link>
                {!isAgent && (
                  <>
                    <Link to="/history" className={deskTab(isActive('/history'))}>
                      {deskUnderline(isActive('/history'))}
                      <History className="w-4 h-4" />
                      My Applications
                    </Link>
                    <Link
                      to="/interview-prep"
                      className={deskTab(location.pathname.startsWith('/interview-prep'))}
                    >
                      {deskUnderline(location.pathname.startsWith('/interview-prep'))}
                      <MessageSquare className="w-4 h-4" />
                      Interview Prep
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {!isAuthenticated && (
            <div className="flex items-center gap-3">
              <Link
                to="/pricing"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}

          {isAuthenticated && (
            <div className="flex items-center gap-4">
              {/* Agents have no interview minutes. With a plan, the scarce
                  resource is CV credits (for tailoring) — show the balance and
                  link to top up. Without a plan, prompt them to subscribe. */}
              {isAgent ? (
                <Link
                  to={isPaid ? '/credits' : '/upgrade'}
                  aria-label={isPaid ? 'CV credits — tap to top up' : 'Choose an agent plan'}
                  className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {isPaid ? (
                    <>
                      <Coins className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
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
                        Get a plan
                      </span>
                    </>
                  )}
                </Link>
              ) : (
                /* Unified wallet pill: shows the scarce resource for the user's
                  plan — minutes for paid, credits for free — and opens a popover
                  with the full picture (plan, live minutes, credits). */
                <div className="relative" ref={popoverRef}>
                  <button
                    onClick={() => setShowCreditPopover(!showCreditPopover)}
                    aria-label="Wallet: plan, minutes and credits"
                    className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {isPaid ? (
                      <>
                        <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-heading text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                          {minutesLeft !== null ? minutesLeft : planLabelFor(entitlement)}
                        </span>
                        {minutesLeft !== null && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                            min
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        <span className="font-heading text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {credits !== null ? credits : '...'}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                          cr
                        </span>
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {showCreditPopover && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                      >
                        {/* Plan + live minutes */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                              Plan
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                isPaid
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {isPaid && <Crown className="w-3 h-3" />}
                              {isPaid ? planLabelFor(entitlement) : 'Free'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Mic className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Live
                              interview
                            </span>
                            <span className="font-heading font-bold tabular-nums text-slate-900 dark:text-slate-100">
                              {isPaid
                                ? `${minutesLeft ?? 0} min left`
                                : `${freeTasteMin ?? 0} free min left`}
                            </span>
                          </div>
                          {isPaid && entitlement?.expiresAt && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Expires{' '}
                              {new Date(entitlement.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                          <button
                            onClick={() => {
                              navigate('/upgrade');
                              setShowCreditPopover(false);
                            }}
                            className="mt-3 w-full py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                          >
                            {isPaid ? 'Add minutes' : 'See plans & minutes'}
                          </button>
                        </div>

                        {/* Credits (text prep) */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                              Text prep
                            </span>
                            <span className="font-heading text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                              {displayCredits ?? '...'} credits
                            </span>
                          </div>
                          {isPaid ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              CVs, cover letters & written prep use your plan credits first, then
                              your wallet.
                            </p>
                          ) : (
                            <>
                              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mb-2 border-t border-dashed border-slate-200 dark:border-slate-700 pt-2">
                                <li className="flex items-center justify-between">
                                  <span>Full application kit</span>
                                  <span className="font-heading font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                    ≈{Math.floor((credits || 0) / 18)}
                                  </span>
                                </li>
                                <li className="flex items-center justify-between">
                                  <span>Optimized CV</span>
                                  <span className="font-heading font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                    ≈{Math.floor((credits || 0) / 10)}
                                  </span>
                                </li>
                              </ul>
                              <button
                                onClick={() => {
                                  navigate('/credits');
                                  setShowCreditPopover(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Coins className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                Get more A.I credits
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Account avatar + dropdown menu — single trigger replaces the
                old "ACCOUNT" label + name + avatar + standalone logout cluster.
                Logout sits inside the menu (one extra click), not as a top-level
                icon, because it's a destructive action. */}
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAccountMenu((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={showAccountMenu}
                  className="flex items-center gap-1.5 p-1 pl-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                    {user && user.firstName && user.firstName.length > 0 ? (
                      user.firstName[0].toUpperCase()
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${
                      showAccountMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {showAccountMenu && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                    >
                      {/* Identity block */}
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {user && user.firstName
                              ? `${user.firstName} ${user.lastName || ''}`.trim()
                              : user?.email?.split('@')[0] || 'User'}
                          </p>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono text-[10px] uppercase tracking-[0.14em] ${
                              isPaid
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isPaid && <Crown className="w-2.5 h-2.5" />}
                            {isPaid ? planLabelFor(entitlement) : 'Free'}
                          </span>
                        </div>
                        {user?.email && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {user.email}
                          </p>
                        )}
                      </div>

                      {/* Menu items */}
                      <div className="py-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowAccountMenu(false);
                            navigate('/profile');
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          Profile settings
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowAccountMenu(false);
                            navigate('/upgrade');
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          {isAgent ? 'Agent plans' : isPaid ? 'Plans & minutes' : 'Upgrade plan'}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowAccountMenu(false);
                            navigate('/credits');
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Coins className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          {isAgent ? 'CV credits' : isPaid ? 'A.I credits' : 'Buy credits'}
                        </button>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowAccountMenu(false);
                            setShowLogoutConfirm(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Mobile chrome:
            - Capacitor (isMobile): no top-right control. Sign out lives in
              the Profile tab now, and primary nav happens via the bottom bar.
            - Mobile-web browser: hamburger opens the slide-out drawer.
            - Both mobile contexts show a compact credit pill so users know
              their balance before scrolling — was previously desktop-only,
              which hid the most relevant info on the smallest screens. */}
        <div className="md:hidden flex items-center gap-2">
          {isAuthenticated && isAgent ? (
            <button
              type="button"
              onClick={() => navigate('/upgrade')}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Agent plan — tap for plans"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {isPaid ? planLabelFor(entitlement) : 'Plans'}
              </span>
            </button>
          ) : (
            isAuthenticated &&
            (isPaid ? (
              <button
                type="button"
                onClick={() => navigate('/upgrade')}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                aria-label={`${minutesLeft ?? 0} interview minutes left — tap for plans`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {minutesLeft !== null ? `${minutesLeft}m` : planLabelFor(entitlement)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/credits')}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                aria-label={`${credits ?? '...'} credits — tap to top up`}
              >
                <Coins className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {credits !== null ? credits : '...'}
                </span>
              </button>
            ))
          )}
          {!isMobile() && (
            <button
              className="z-50 p-2 text-slate-600 dark:text-slate-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                {/* Backdrop Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                />

                {/* Slide-out Drawer */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                  className="md:hidden fixed top-0 right-0 bottom-0 w-[86%] max-w-sm bg-white dark:bg-slate-900 z-[110] shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
                >
                  {/* Drawer Header — flat editorial bar */}
                  <div className="relative shrink-0 flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2.5">
                      <img src={logo} alt="ApplyRight" className="h-7 w-auto" />
                      <div className="leading-tight">
                        <span className="block font-heading text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                          Apply<span className="text-indigo-600 dark:text-indigo-400">Right</span>
                        </span>
                        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                          {isAuthenticated && user?.firstName ? `Hi, ${user.firstName}` : 'Menu'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      aria-label="Close menu"
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Primary Nav Links */}
                  <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {isAuthenticated && (
                      <>
                        <Link
                          to={homePath}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={navLinkClass(isActive(homePath))}
                        >
                          {activeBar(isActive(homePath))}
                          <LayoutDashboard className="w-5 h-5" />
                          <span>Dashboard</span>
                        </Link>
                        {isAgent && (
                          <Link
                            to="/agent/earnings"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={navLinkClass(
                              location.pathname.startsWith('/agent/earnings')
                            )}
                          >
                            {activeBar(location.pathname.startsWith('/agent/earnings'))}
                            <Wallet className="w-5 h-5" />
                            <span>Earnings</span>
                          </Link>
                        )}
                        <Link
                          to="/my-cvs"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={navLinkClass(location.pathname.startsWith('/my-cvs'))}
                        >
                          {activeBar(location.pathname.startsWith('/my-cvs'))}
                          <FileText className="w-5 h-5" />
                          <span>My CVs</span>
                        </Link>
                        {!isAgent && (
                          <>
                            <Link
                              to="/history"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={navLinkClass(isActive('/history'))}
                            >
                              {activeBar(isActive('/history'))}
                              <History className="w-5 h-5" />
                              <span>My Applications</span>
                            </Link>
                            <Link
                              to="/interview-prep"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={navLinkClass(isActive('/interview-prep'))}
                            >
                              {activeBar(isActive('/interview-prep'))}
                              <MessageSquare className="w-5 h-5" />
                              <span>Interview Prep</span>
                            </Link>
                          </>
                        )}
                      </>
                    )}

                    {isAuthenticated && (
                      <>
                        <div className="flex items-center gap-3 mt-6 mb-3 px-1">
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                            Your account
                          </span>
                          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                        </div>

                        {/* Wallet ledger — plan, credits, minutes in one hairline block */}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <Link
                            to="/upgrade"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <span className="flex items-center gap-3 min-w-0">
                              <Crown
                                className={`w-4 h-4 shrink-0 ${isPaid ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}
                              />
                              <span className="leading-tight min-w-0">
                                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {isPaid
                                    ? planLabelFor(entitlement)
                                    : isAgent
                                      ? 'No plan yet'
                                      : 'Free plan'}
                                </span>
                                <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                                  {isAgent
                                    ? isPaid
                                      ? `${displayCredits ?? 0} CV credits`
                                      : 'Get an agent plan'
                                    : isPaid
                                      ? 'Active plan'
                                      : 'Tap to upgrade'}
                                </span>
                              </span>
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-indigo-600 dark:text-indigo-400 shrink-0">
                              {isAgent ? 'Plans →' : isPaid ? 'Manage →' : 'Upgrade →'}
                            </span>
                          </Link>
                          {!isAgent && (
                            <Link
                              to="/credits"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center justify-between px-4 py-3.5 border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <span className="flex items-center gap-3">
                                <Coins className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                <span className="leading-tight">
                                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    A.I credits
                                  </span>
                                  <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                                    Text prep
                                  </span>
                                </span>
                              </span>
                              <span className="font-heading text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                {displayCredits !== null && displayCredits !== undefined
                                  ? displayCredits
                                  : '…'}
                              </span>
                            </Link>
                          )}
                          {!isAgent && (
                            <Link
                              to="/upgrade"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center justify-between px-4 py-3.5 border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <span className="flex items-center gap-3">
                                <Mic className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                <span className="leading-tight">
                                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    Interview minutes
                                  </span>
                                  <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                                    {isPaid ? 'Live voice mock' : 'Free taste'}
                                  </span>
                                </span>
                              </span>
                              <span
                                className={`font-heading text-lg font-bold tabular-nums whitespace-nowrap ${isPaid ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}
                              >
                                {(isPaid ? minutesLeft : freeTasteMin) ?? 0}
                                <span className="font-mono text-[10px] uppercase text-slate-400 dark:text-slate-500 ml-1">
                                  min
                                </span>
                              </span>
                            </Link>
                          )}
                        </div>

                        {/* Activity snapshot — fills the drawer with the user's momentum */}
                        {!isAgent && (
                          <div className="mt-6">
                            <div className="flex items-center gap-3 mb-3 px-1">
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                Your activity
                              </span>
                              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                            </div>

                            {activity === null ? (
                              <div className="grid grid-cols-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                {[0, 1, 2].map((i) => (
                                  <div
                                    key={i}
                                    className="h-[64px] border-r last:border-r-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 animate-pulse"
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="grid grid-cols-3">
                                  {[
                                    { value: activity.cvsCreated ?? 0, label: 'CVs' },
                                    { value: activity.applicationsAnalyzed ?? 0, label: 'Jobs' },
                                    { value: activity.interviewsPracticed ?? 0, label: 'Mocks' },
                                  ].map(({ value, label }) => (
                                    <div
                                      key={label}
                                      className="py-3.5 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-700"
                                    >
                                      <div className="font-heading text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100 leading-none">
                                        {value}
                                      </div>
                                      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                        {label}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {typeof activity.bestInterviewScore === 'number' && (
                                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                      <Mic className="w-3.5 h-3.5 text-amber-500" /> Best interview
                                      score
                                    </span>
                                    <span className="font-heading text-base font-bold tabular-nums text-amber-600 dark:text-amber-400">
                                      {activity.bestInterviewScore}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Bottom Footer Area */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                    {isAuthenticated ? (
                      <>
                        <Link
                          to="/profile"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-3 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold group-hover:scale-105 transition-transform">
                            {user && user.firstName ? (
                              user.firstName[0].toUpperCase()
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {user && user.firstName
                                ? `${user.firstName} ${user.lastName || ''}`
                                : 'User'}
                            </p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {user?.email || 'View Profile Settings'}
                            </p>
                          </div>
                          {/* Explicit gear so users know tapping the profile opens settings */}
                          <div className="flex items-center gap-1 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                          </div>
                        </Link>

                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setShowLogoutConfirm(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-semibold"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Sign Out</span>
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Link
                          to="/pricing"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors font-semibold"
                        >
                          Pricing
                        </Link>
                        <Link
                          to="/login"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors font-semibold"
                        >
                          Sign In
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold shadow-sm"
                        >
                          Sign Up
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      {/* Logout Confirmation Modal — portaled to body to escape header's stacking context */}
      {showLogoutConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-6 transform transition-all scale-100">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                  <LogOut className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Sign Out?
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Are you sure you want to sign out?
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      handleLogout();
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-red-200"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};

export default Navbar;
