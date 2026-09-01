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

// The four workspace surfaces — each carries the app sidebar, which holds its own
// destinations, wallet and account block.
//
// This list used to double as the "immersive" set: the pages where a bottom tab bar would
// have fought with a page that already owned the bottom of the screen. There is no tab bar
// on either platform any more, so it answers only the one question now.
export const WORKSPACE_PREFIXES = ['/cv-builder', '/aria-studio', '/resume', '/interview-prep'];

const matchesPrefix = (pathname, prefixes) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const hasWorkspaceSidebar = (pathname) => matchesPrefix(pathname, WORKSPACE_PREFIXES);
