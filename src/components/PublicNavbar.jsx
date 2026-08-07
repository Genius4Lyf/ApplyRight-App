import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import logo from '../assets/logo/applyright-icon-black.png';
import { useTranslation } from 'react-i18next';

const Motion = motion;

/**
 * PublicNavbar — the floating pill navbar for logged-out marketing pages
 * (landing, pricing, guides). Transparent full-width at the top; animates into
 * a rounded, blurred pill once the page is scrolled past 50px.
 */
const PublicNavbar = ({ hidden = false }) => {
  const { t } = useTranslation();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <nav className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4">
      <Motion.div
        initial={false}
        animate={
          hidden
            ? {
                y: -96,
                opacity: 0,
                borderRadius: 100,
                borderColor: 'rgba(226, 232, 240, 0)',
                backgroundColor: 'rgba(255, 255, 255, 0)',
                boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
              }
            : scrolled
              ? {
                  y: 20,
                  opacity: 1,
                  borderRadius: 100,
                  borderColor: 'rgba(226, 232, 240, 1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                  boxShadow:
                    '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
                }
              : {
                  y: 0,
                  opacity: 1,
                  borderRadius: 0,
                  borderColor: 'rgba(226, 232, 240, 0)',
                  backgroundColor: 'rgba(255, 255, 255, 0)',
                  boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
                }
        }
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
        className={`${hidden ? 'pointer-events-none' : 'pointer-events-auto'} mx-auto h-16 w-full max-w-[1080px] overflow-hidden border`}
      >
        <div className="mx-auto flex h-full items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logo} alt={t('common.logoAlt')} className="h-8 w-auto" />
            <span className="font-brand text-xl font-semibold tracking-tight text-black dark:text-white">
              ApplyRight
            </span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              to="/pricing"
              className="hidden text-sm text-slate-600 transition-colors hover:text-slate-900 sm:block"
            >
              {t('nav.pricing')}
            </Link>
            <Link to="/login" className="btn-primary text-sm">
              {t('common.signIn')}
            </Link>
          </div>
        </div>
      </Motion.div>
    </nav>
  );
};

export default PublicNavbar;
