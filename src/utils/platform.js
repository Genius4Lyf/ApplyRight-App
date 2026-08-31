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

// The four workspace surfaces — each carries the app sidebar, which holds its own
// destinations, wallet and account block.
//
// This is ALSO the immersive set, and not by coincidence: a page earns the sidebar by
// being a workspace you settle into rather than a page you pass through, and that is the
// same property that makes a bottom tab bar wrong there. Each already owns the bottom of
// the screen — a persistent exit control (Aria Studio, the CV Builder wizard, both locked
// to h-dvh at every breakpoint) or a fixed action bar (CV Studio's mobile download/save
// bar, the prep dashboard's practice controls) — so a tab bar would sit on top of, or
// fight with, what is already there.
export const WORKSPACE_PREFIXES = ['/cv-builder', '/aria-studio', '/resume', '/interview-prep'];

const IMMERSIVE_PREFIXES = WORKSPACE_PREFIXES;
const IMMERSIVE_PATH_RE = /\/(mock|practice)$/;

const matchesPrefix = (pathname, prefixes) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// Shown on BOTH web-mobile and native (MobileBottomNav applies md:hidden on web
// so it's mobile-only there).
// Does this page carry the app sidebar? The top bar sheds its mobile account cluster
// there — language, credits and sign-out all live in the sidebar's own profile block, and
// showing them twice on a 390px bar means neither has room to be legible.
export const hasWorkspaceSidebar = (pathname) => matchesPrefix(pathname, WORKSPACE_PREFIXES);

export const shouldShowBottomNav = (pathname) =>
  matchesPrefix(pathname, APP_PREFIXES) &&
  !matchesPrefix(pathname, IMMERSIVE_PREFIXES) &&
  !IMMERSIVE_PATH_RE.test(pathname);
