import { useCallback, useEffect, useRef, useState } from 'react';
import { isAndroidAdMob, prepareInterstitial, showInterstitial } from '../services/admob.service';
import api from '../services/api';

const LAST_AT_KEY = 'admob.interstitial.lastAt';
const APP_LAUNCH_AT = Date.now();
const MIN_GAP_MS = 90 * 1000; // 90s between any two interstitials
const LAUNCH_GRACE_MS = 60 * 1000; // 60s grace from app launch
const MAX_PER_SESSION = 4;

let sessionShownCount = 0;

// One-time per app session: cached `features.admobEnabled` flag from
// /auth/config. We share it across hook instances so the page-load fetch
// doesn't repeat on every component that uses an interstitial.
let configFlagPromise = null;
const getAdmobEnabled = () => {
  if (!configFlagPromise) {
    configFlagPromise = api
      .get('/auth/config')
      .then((res) => res.data?.features?.admobEnabled === true)
      .catch(() => false);
  }
  return configFlagPromise;
};

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const getLastAt = () => {
  try {
    const v = Number(localStorage.getItem(LAST_AT_KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
};

const setLastAt = (ts) => {
  try {
    localStorage.setItem(LAST_AT_KEY, String(ts));
  } catch {
    /* ignore */
  }
};

/**
 * Hook for AdMob Interstitial ads on native Android.
 *
 * Self-contained eligibility: returns a no-op `triggerInterstitial` on web,
 * for paid users (`hasEverPurchased`), or when the `features.admobEnabled`
 * flag is off. Frequency caps (min gap, launch grace, session count) are
 * enforced internally — call sites can fire-and-forget.
 *
 * Use at task-completion moments: CV finalize, PDF download, ATS score
 * render, cover letter generation, application save. Do NOT use during
 * onboarding, login, payment flows, or the CV wizard middle steps.
 */
export default function useInterstitial() {
  const [admobEnabled, setAdmobEnabled] = useState(false);
  const [isFreeForAds, setIsFreeForAds] = useState(() => {
    const u = readStoredUser();
    return u.isFreeForAds === true;
  });
  const preparedOnceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getAdmobEnabled().then((on) => {
      if (!cancelled) setAdmobEnabled(on);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      const u = readStoredUser();
      setIsFreeForAds(u.isFreeForAds === true);
    };
    window.addEventListener('userDataUpdated', refresh);
    return () => window.removeEventListener('userDataUpdated', refresh);
  }, []);

  const enabled = isAndroidAdMob() && admobEnabled && isFreeForAds;

  useEffect(() => {
    if (!enabled) return;
    if (preparedOnceRef.current) return;
    preparedOnceRef.current = true;
    prepareInterstitial();
  }, [enabled]);

  const canShow = useCallback(() => {
    if (!enabled) return false;
    if (sessionShownCount >= MAX_PER_SESSION) return false;
    if (Date.now() - APP_LAUNCH_AT < LAUNCH_GRACE_MS) return false;
    if (Date.now() - getLastAt() < MIN_GAP_MS) return false;
    return true;
  }, [enabled]);

  const triggerInterstitial = useCallback(
    async (placement = 'unknown') => {
      if (!canShow()) return { shown: false, reason: 'not_eligible' };
      const ok = await showInterstitial();
      if (ok) {
        sessionShownCount += 1;
        setLastAt(Date.now());
        return { shown: true, placement };
      }
      return { shown: false, reason: 'show_failed', placement };
    },
    [canShow]
  );

  return { enabled, canShow, triggerInterstitial };
}
