import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import logo from '../assets/logo/applyright-icon.png';

/**
 * PublicNavbar — the floating pill navbar for logged-out marketing pages
 * (landing, pricing, guides). Transparent full-width at the top; animates into
 * a rounded, blurred pill once the page is scrolled past 50px.
 */
const PublicNavbar = () => {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <motion.nav
      initial={{
        width: '100%',
        top: 0,
        borderRadius: 0,
        borderBottomWidth: 0,
        borderBottomColor: 'rgba(241, 245, 249, 0)',
        backgroundColor: 'rgba(255, 255, 255, 0)',
        backdropFilter: 'blur(0px)',
      }}
      animate={
        scrolled
          ? {
              width: '90%',
              maxWidth: '1080px',
              top: 20,
              borderRadius: '100px',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(241, 245, 249, 1)', // visible border when floating
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            }
          : {
              width: '100%',
              maxWidth: '100%',
              top: 0,
              borderRadius: 0,
              borderBottomWidth: 0,
              borderBottomColor: 'rgba(241, 245, 249, 0)',
              backgroundColor: 'rgba(255, 255, 255, 0)',
              backdropFilter: 'blur(0px)',
              boxShadow: 'none',
            }
      }
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`fixed z-50 left-0 right-0 mx-auto overflow-hidden`}
    >
      <div
        className={`mx-auto h-16 flex items-center justify-between transition-all duration-300 ${scrolled ? 'px-4 md:px-6' : 'max-w-7xl px-6'}`}
      >
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logo} alt="ApplyRight Logo" className="h-8 w-auto" />
          <span className="font-heading text-xl font-bold tracking-tight text-slate-900">
            Apply<span className="text-indigo-600">Right</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/pricing"
            className="hidden text-sm text-slate-600 transition-colors hover:text-slate-900 sm:block"
          >
            Pricing
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-[44px] items-center text-sm text-slate-600 transition-colors hover:text-slate-900"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center rounded-md border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:border-indigo-800 hover:bg-indigo-800"
          >
            Start free
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

export default PublicNavbar;
