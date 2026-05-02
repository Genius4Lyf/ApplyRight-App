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

// Bar visibility allowlist. Includes routes the user reaches via secondary
// navigation (Credits/Upgrade now live behind the Profile tab) so the bar
// stays consistent during those flows.
const BOTTOM_NAV_PATHS = [
  '/dashboard',
  '/jobs',
  '/history',
  '/profile',
  '/credits',
  '/upgrade',
  '/interview-prep',
];

export const shouldShowBottomNav = (pathname) =>
  isMobile() &&
  BOTTOM_NAV_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
