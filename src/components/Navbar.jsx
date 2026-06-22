import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  LogOut,
  History,
  LayoutDashboard,
  User,
  Menu,
  X,
  PlayCircle,
  Settings,
  ChevronDown,
  MessageSquare,
  FileText,
  Crown,
  Clock,
  Mic,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { billingService } from '../services';
import { isMobile } from '../utils/platform';

import logo from '../assets/logo/applyright-icon.png';

const PLAN_LABELS = {
  weekly_pro: 'Weekly Pro',
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
  const [showCreditPopover, setShowCreditPopover] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const popoverRef = React.useRef(null);
  const accountMenuRef = React.useRef(null);

  // Derived wallet view (plan tier + live-interview minutes). Free users see
  // credits; paid users see their plan + remaining minutes.
  const tier = entitlement?.tier || 'free';
  const isPaid = tier !== 'free';
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={isAuthenticated ? homePath : '/'} className="flex items-center gap-2.5 z-50">
          <img src={logo} alt="ApplyRight" className="h-7 w-auto" />
          <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
            ApplyRight
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-1">
            {isAuthenticated && (
              <>
                <Link
                  to={homePath}
                  className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                    isActive(homePath)
                      ? 'text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/15'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/my-cvs"
                  className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                    location.pathname.startsWith('/my-cvs')
                      ? 'text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/15'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  My CVs
                </Link>
                {isAgent ? (
                  <Link
                    to="/agent/clients"
                    className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                      location.pathname.startsWith('/agent/clients')
                        ? 'text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/15'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Clients
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/history"
                      className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                        isActive('/history')
                          ? 'text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/15'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <History className="w-4 h-4" />
                      My Applications
                    </Link>
                    <Link
                      to="/interview-prep"
                      className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                        location.pathname.startsWith('/interview-prep')
                          ? 'text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/15'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
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
              {/* Agents have no interview minutes — show a simple plan chip that
                  links to the agent plans, never a "0m" minutes pill. */}
              {isAgent ? (
                <Link
                  to="/upgrade"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                    isPaid
                      ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/25'
                      : 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/25'
                  }`}
                >
                  {isPaid ? (
                    <>
                      <Crown className="w-4 h-4 text-amber-600 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                        {planLabelFor(entitlement)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                      isPaid
                        ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/25'
                        : 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/25'
                    }`}
                  >
                    {isPaid ? (
                      <>
                        <Crown className="w-4 h-4 text-amber-600 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                          {minutesLeft !== null ? `${minutesLeft}m` : planLabelFor(entitlement)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-indigo-600 fill-indigo-600 dark:text-indigo-400 dark:fill-indigo-400" />
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                          {credits !== null ? credits : '...'}
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
                        className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50"
                      >
                        {/* Plan + live minutes */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                              Plan
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold ${
                                isPaid
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {isPaid && <Crown className="w-3 h-3 fill-current" />}
                              {isPaid ? planLabelFor(entitlement) : 'Free'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Mic className="w-4 h-4 text-indigo-500" /> Live interview
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
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
                            className="mt-3 w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 transition-colors"
                          >
                            {isPaid ? 'Add minutes' : 'See plans & minutes'}
                          </button>
                        </div>

                        {/* Credits (text prep) */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                              Text prep
                            </span>
                            {isPaid ? (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                Unlimited
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                {credits ?? '...'} credits
                              </span>
                            )}
                          </div>
                          {isPaid ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              CVs, cover letters & written Q&A are unlimited on your plan.
                            </p>
                          ) : (
                            <>
                              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mb-2">
                                <li className="flex items-center justify-between">
                                  <span>Full application kit</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    ≈{Math.floor((credits || 0) / 18)}
                                  </span>
                                </li>
                                <li className="flex items-center justify-between">
                                  <span>Optimized CV</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    ≈{Math.floor((credits || 0) / 10)}
                                  </span>
                                </li>
                              </ul>
                              <button
                                onClick={() => {
                                  navigate('/credits');
                                  setShowCreditPopover(false);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-green-600 dark:hover:text-green-400 transition-colors flex items-center gap-2"
                              >
                                <PlayCircle className="w-4 h-4 text-green-500" />
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
                      className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50"
                    >
                      {/* Identity block */}
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {user && user.firstName
                              ? `${user.firstName} ${user.lastName || ''}`.trim()
                              : user?.email?.split('@')[0] || 'User'}
                          </p>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              isPaid
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isPaid && <Crown className="w-2.5 h-2.5 fill-current" />}
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
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Crown className="w-4 h-4 text-amber-500" />
                          {isAgent ? 'Agent plans' : isPaid ? 'Plans & minutes' : 'Upgrade plan'}
                        </button>
                        {!isAgent && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setShowAccountMenu(false);
                              navigate('/credits');
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                            {isPaid ? 'A.I credits' : 'Buy credits'}
                          </button>
                        )}
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-700">
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
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/15 rounded-full border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/25 transition-colors"
              aria-label="Agent plan — tap for plans"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                {isPaid ? planLabelFor(entitlement) : 'Plans'}
              </span>
            </button>
          ) : (
            isAuthenticated &&
            (isPaid ? (
              <button
                type="button"
                onClick={() => navigate('/upgrade')}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/15 rounded-full border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/25 transition-colors"
                aria-label={`${minutesLeft ?? 0} interview minutes left — tap for plans`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  {minutesLeft !== null ? `${minutesLeft}m` : planLabelFor(entitlement)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/credits')}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/15 rounded-full border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                aria-label={`${credits ?? '...'} credits — tap to top up`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600 dark:text-indigo-400 dark:fill-indigo-400" />
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
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
                  className="md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-slate-900 z-[110] shadow-2xl flex flex-col overflow-y-auto"
                >
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <img src={logo} alt="ApplyRight Logo" className="h-7 w-auto" />
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Menu
                      </span>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 text-slate-500 hover:text-slate-900 bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:bg-slate-900 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Primary Nav Links */}
                  <div className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
                    {isAuthenticated && (
                      <>
                        <Link
                          to={homePath}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 p-3.5 rounded-xl ${isActive(homePath) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        >
                          <LayoutDashboard className="w-5 h-5" />
                          <span className="font-semibold">Dashboard</span>
                        </Link>
                        <Link
                          to="/my-cvs"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 p-3.5 rounded-xl ${location.pathname.startsWith('/my-cvs') ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        >
                          <FileText className="w-5 h-5" />
                          <span className="font-semibold">My CVs</span>
                        </Link>
                        {isAgent ? (
                          <Link
                            to="/agent/clients"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl ${location.pathname.startsWith('/agent/clients') ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                          >
                            <Users className="w-5 h-5" />
                            <span className="font-semibold">Clients</span>
                          </Link>
                        ) : (
                          <>
                            <Link
                              to="/history"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center gap-3 p-3.5 rounded-xl ${isActive('/history') ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                            >
                              <History className="w-5 h-5" />
                              <span className="font-semibold">My Applications</span>
                            </Link>
                            <Link
                              to="/interview-prep"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center gap-3 p-3.5 rounded-xl ${isActive('/interview-prep') ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                            >
                              <MessageSquare className="w-5 h-5" />
                              <span className="font-semibold">Interview Prep</span>
                            </Link>
                          </>
                        )}
                      </>
                    )}

                    {isAuthenticated && (
                      <>
                        <div className="h-px bg-slate-100 dark:bg-slate-900 my-4" />

                        {/* Plan + live interview minutes */}
                        <Link
                          to="/upgrade"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-amber-100 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 mb-3"
                        >
                          <div className="flex items-center gap-3">
                            <Crown className="w-5 h-5 text-amber-600 fill-amber-500 dark:text-amber-400 dark:fill-amber-400" />
                            <div>
                              <span className="block font-bold text-amber-900 dark:text-amber-200 leading-tight">
                                {isPaid
                                  ? planLabelFor(entitlement)
                                  : isAgent
                                    ? 'No plan yet'
                                    : 'Free plan'}
                              </span>
                              <span className="block text-xs text-amber-700/80 dark:text-amber-300/80">
                                {isAgent
                                  ? isPaid
                                    ? 'Unlimited CVs & downloads'
                                    : 'Get an agent plan · tap to upgrade'
                                  : isPaid
                                    ? `${minutesLeft ?? 0} interview min left`
                                    : `${freeTasteMin ?? 0} free min · tap to upgrade`}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                            {isAgent ? 'Plans' : isPaid ? 'Add min' : 'Plans'}
                          </span>
                        </Link>

                        {/* A.I credits (text prep) — not shown for agents (unlimited on plan) */}
                        {!isAgent && (
                          <Link
                            to="/credits"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center justify-between p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 ${isActive('/credits') ? 'bg-indigo-50 dark:bg-indigo-500/15' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <Sparkles className="w-5 h-5 text-indigo-600 fill-indigo-600 dark:text-indigo-400 dark:fill-indigo-400" />
                              <span className="font-bold text-indigo-900 dark:text-indigo-200">
                                A.I Credits
                              </span>
                            </div>
                            <span className="font-black text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md">
                              {isPaid ? '∞' : credits !== null ? credits : '...'}
                            </span>
                          </Link>
                        )}
                      </>
                    )}
                  </div>

                  {/* Bottom Footer Area */}
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
                    {isAuthenticated ? (
                      <>
                        <Link
                          to="/profile"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-colors mb-3 group"
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
                        </Link>



                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setShowLogoutConfirm(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors font-bold shadow-sm"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Sign Out</span>
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
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
