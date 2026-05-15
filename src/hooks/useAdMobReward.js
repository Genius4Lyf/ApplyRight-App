import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareRewarded, showRewarded, isAndroidAdMob } from '../services/admob.service';

/**
 * Hook for the AdMob Rewarded Video flow on native Android.
 *
 * The actual credit grant happens server-side via Google's SSV callback —
 * this hook does NOT call the watch-ad endpoint. After `showAd()` resolves
 * with `rewarded: true`, the caller should poll their credit balance (see
 * `billingService.pollBalanceUntilIncrease`) and update UI when SSV lands.
 *
 * On non-Android platforms `enabled` is false and `showAd()` rejects — the
 * caller should branch on platform and use the Monetag flow instead.
 */
export default function useAdMobReward(userId) {
  const enabled = isAndroidAdMob();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const userIdRef = useRef(userId);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const preload = useCallback(async () => {
    if (!enabled || !userIdRef.current) return;
    setLoading(true);
    setError(null);
    const ok = await prepareRewarded(userIdRef.current);
    setReady(ok);
    setLoading(false);
    if (!ok) setError(new Error('Failed to load ad'));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !userId) return;
    // External-system sync (AdMob SDK preload). State updates happen inside
    // the async preload callbacks — legitimate effect use, not a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    preload();
  }, [enabled, userId, preload]);

  const showAd = useCallback(async () => {
    if (!enabled) return { rewarded: false, reason: 'unsupported' };
    if (!ready) {
      const ok = await prepareRewarded(userIdRef.current);
      if (!ok) return { rewarded: false, reason: 'load_failed' };
    }
    setReady(false);
    const result = await showRewarded();
    // Preload the next ad for the next interaction.
    preload();
    return result;
  }, [enabled, ready, preload]);

  return { enabled, ready, loading, error, showAd, preload };
}
