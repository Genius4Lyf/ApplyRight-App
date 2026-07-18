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

// Bar visibility allowlist — the four bottom-tab destinations. Account routes
// (/profile, /credits, /upgrade) live behind the avatar dropdown now, so they're
// not tabs and don't keep the bar up.
const BOTTOM_NAV_PATHS = ['/dashboard', '/my-cvs', '/history', '/interview-prep'];

// Full-screen, immersive sub-routes (live voice interview + flash-card
// practice) pin their own control bar to the bottom of the screen. The fixed
// bottom nav would sit on top of those controls, so it's suppressed here.
const IMMERSIVE_PATH_RE = /\/(mock|practice)$/;

// Shown on BOTH web-mobile and native (MobileBottomNav applies md:hidden on web
// so it's mobile-only there). Platform is no longer a gate — the allowlist +
// immersive check decide visibility.
export const shouldShowBottomNav = (pathname) =>
  !IMMERSIVE_PATH_RE.test(pathname) &&
  BOTTOM_NAV_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
