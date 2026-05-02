import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, History, LayoutDashboard, User, Menu, X, PlayCircle, Settings, ChevronDown, MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { billingService } from '../services';
import { isMobile } from '../utils/platform';

import logo from '../assets/logo/applyright-icon.png';

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

  const [credits, setCredits] = useState(null);
  const [showCreditPopover, setShowCreditPopover] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const popoverRef = React.useRef(null);
  const accountMenuRef = React.useRef(null);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 z-50">
          <img src={logo} alt="ApplyRight" className="h-7 w-auto" />
          <span className="text-base sm:text-lg font-semibold text-slate-900">
            ApplyRight
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-1">
            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                    isActive('/dashboard')
                      ? 'text-indigo-700 bg-indigo-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/history"
                  className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                    isActive('/history')
                      ? 'text-indigo-700 bg-indigo-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <History className="w-4 h-4" />
                  My Applications
                </Link>
                <Link
                  to="/interview-prep"
                  className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                    location.pathname.startsWith('/interview-prep')
                      ? 'text-indigo-700 bg-indigo-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Interview Prep
                </Link>
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
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setShowCreditPopover(!showCreditPopover)}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-200 hover:bg-indigo-100 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                <span className="text-sm font-bold text-indigo-700">
                  {credits !== null ? credits : '...'}
                </span>
              </button>

              <AnimatePresence>
                {showCreditPopover && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                    exit={{ opacity: 0, y: 10, scale: 0.95, x: '-50%' }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-1/2 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 p-4"
                  >
                    <div className="space-y-3">
                      {/* Concrete framing: convert opaque credit count into the
                          number of actions the user can take right now. */}
                      {credits !== null && (
                        <div className="px-1">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                            With {credits} credits
                          </p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            <li className="flex items-center justify-between">
                              <span>Full application kit</span>
                              <span className="font-semibold text-slate-700">
                                ≈{Math.floor(credits / 18)}
                              </span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span>Optimized CV</span>
                              <span className="font-semibold text-slate-700">
                                ≈{Math.floor(credits / 10)}
                              </span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span>Cover letter</span>
                              <span className="font-semibold text-slate-700">
                                ≈{Math.floor(credits / 5)}
                              </span>
                            </li>
                          </ul>
                        </div>
                      )}
                      <div className="border-t border-slate-100 -mx-4" />
                      <button
                        onClick={() => {
                          navigate('/credits');
                          setShowCreditPopover(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-green-600 transition-colors flex items-center gap-2"
                      >
                        <PlayCircle className="w-4 h-4 text-green-500" />
                        Get more A.I credits
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
                className="flex items-center gap-1.5 p-1 pl-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                  {user && user.firstName && user.firstName.length > 0 ? (
                    user.firstName[0].toUpperCase()
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
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
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
                  >
                    {/* Identity block */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {user && user.firstName
                          ? `${user.firstName} ${user.lastName || ''}`.trim()
                          : user?.email?.split('@')[0] || 'User'}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
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
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        Profile settings
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowAccountMenu(false);
                          navigate('/interview-prep');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        Interview Prep
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowAccountMenu(false);
                          navigate('/credits');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        Buy credits
                      </button>
                    </div>

                    <div className="border-t border-slate-100">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowAccountMenu(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
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
            - Mobile-web browser: hamburger opens the slide-out drawer. */}
        {!isMobile() && (
          <button
            className="md:hidden z-50 p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {typeof document !== 'undefined' && createPortal(
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
                className="md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-[110] shadow-2xl flex flex-col overflow-y-auto"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <img src={logo} alt="ApplyRight Logo" className="h-7 w-auto" />
                    <span className="text-lg font-bold text-slate-900">Menu</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-slate-500 hover:text-slate-900 bg-slate-50 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Primary Nav Links */}
                <div className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
                  {isAuthenticated && (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl ${isActive('/dashboard') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-semibold">Dashboard</span>
                      </Link>
                      <Link
                        to="/history"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl ${isActive('/history') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <History className="w-5 h-5" />
                        <span className="font-semibold">My Applications</span>
                      </Link>
                      <Link
                        to="/interview-prep"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl ${isActive('/interview-prep') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span className="font-semibold">Interview Prep</span>
                      </Link>
                    </>
                  )}

                  {isAuthenticated && (
                    <>
                      <div className="h-px bg-slate-100 my-4" />

                      <Link
                        to="/credits"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 ${isActive('/credits') ? 'bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                          <span className="font-bold text-indigo-900">A.I Credits</span>
                        </div>
                        <span className="font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                          {credits !== null ? credits : '...'}
                        </span>
                      </Link>
                    </>
                  )}
                </div>

                {/* Bottom Footer Area */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 transition-colors mb-3 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold group-hover:scale-105 transition-transform">
                          {user && user.firstName ? (
                            user.firstName[0].toUpperCase()
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {user && user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User'}
                          </p>
                          <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                            {user?.email || 'View Profile Settings'}
                          </p>
                        </div>
                      </Link>

                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors font-bold shadow-sm"
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
      {showLogoutConfirm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 transform transition-all scale-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Sign Out?</h3>
              <p className="text-slate-500 mb-6">Are you sure you want to sign out?</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
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
