import { Capacitor } from '@capacitor/core';

export const isMobile = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'web' | 'android' | 'ios'

const ONBOARDING_KEY = 'mobile_onboarding_completed';

export const hasSeenOnboarding = () => {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
};

export const markOnboardingComplete = () => {
  localStorage.setItem(ONBOARDING_KEY, 'true');
};

// The authenticated job-seeker app — the only place the 4-tab bottom nav
// belongs. CV agents have their own workspace (/agent, no matching tabs) and
// public/auth/admin pages are out of scope, so this is the OUTER gate (which
// pages are even eligible for the bar at all) — see IMMERSIVE_* below for the
// inner one (which of those are too full-height/immersive to show it).
// /jobs is included even though it's not behind ProtectedRoute, matching the
// same product decision already made for it in utils/theme.js's dark-mode
// allow-list ("it is part of the user experience").
const APP_PREFIXES = [
  '/dashboard',
  '/my-cvs',
  '/history',
  '/interview-prep',
  '/interview',
  '/profile',
  '/upgrade',
  '/credits',
  '/compare',
  '/resume',
  '/cv-builder',
  '/aria-studio',
  '/onboarding',
  '/feedback/dashboard',
  '/jobs',
];

// Full-height, immersive sub-routes that already own the bottom of the screen —
// either their own persistent exit control (Aria Studio, the CV Builder wizard,
// both locked to h-dvh/100dvh at every breakpoint) or their own fixed action bar
// (CV Studio's mobile download/save bar, the live-interview + flash-card
// practice control bars). The bottom nav would sit on top of or fight with
// those, so it's suppressed on all of them.
const IMMERSIVE_PREFIXES = ['/cv-builder', '/aria-studio', '/resume'];
const IMMERSIVE_PATH_RE = /\/(mock|practice)$/;

const matchesPrefix = (pathname, prefixes) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// Shown on BOTH web-mobile and native (MobileBottomNav applies md:hidden on web
// so it's mobile-only there).
export const shouldShowBottomNav = (pathname) =>
  matchesPrefix(pathname, APP_PREFIXES) &&
  !matchesPrefix(pathname, IMMERSIVE_PREFIXES) &&
  !IMMERSIVE_PATH_RE.test(pathname);
