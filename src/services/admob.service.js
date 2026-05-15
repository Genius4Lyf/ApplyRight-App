// AdMob bridge. Only loaded on native Android — web bundles must never
// import the plugin directly. Public API stays the same on both platforms so
// callers can be platform-agnostic; on web every method is a safe no-op.
import { Capacitor } from '@capacitor/core';

// Google's public test IDs. Used in dev and as a fallback if the env vars
// aren't set. Replace `VITE_ADMOB_*` in .env.production with the real units.
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

const REWARDED_AD_ID = import.meta.env.VITE_ADMOB_REWARDED_UNIT_ID || TEST_REWARDED_ID;
const INTERSTITIAL_AD_ID = import.meta.env.VITE_ADMOB_INTERSTITIAL_UNIT_ID || TEST_INTERSTITIAL_ID;

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

let pluginPromise = null;
let initialized = false;
let rewardedPrepared = false;
let interstitialPrepared = false;

// Dynamic import so Vite never bundles the plugin code on web.
const loadPlugin = async () => {
  if (!isAndroidNative()) return null;
  if (!pluginPromise) {
    pluginPromise = import('@capacitor-community/admob').then((mod) => mod);
  }
  return pluginPromise;
};

export const initAdMob = async () => {
  if (!isAndroidNative()) return;
  if (initialized) return;
  try {
    const plugin = await loadPlugin();
    if (!plugin) return;
    await plugin.AdMob.initialize({
      initializeForTesting: import.meta.env.DEV,
      requestTrackingAuthorization: false,
    });
    initialized = true;
  } catch (err) {
    // Plugin missing / mis-wired — don't crash the splash screen.
    console.warn('[AdMob] init failed:', err?.message || err);
  }
};

export const prepareRewarded = async (userId) => {
  if (!isAndroidNative()) return false;
  try {
    const plugin = await loadPlugin();
    if (!plugin) return false;
    if (!initialized) await initAdMob();
    await plugin.AdMob.prepareRewardVideoAd({
      adId: REWARDED_AD_ID,
      // ssvInfo: Google forwards userId verbatim as `user_id` in the SSV
      // callback. customData is echoed back via `custom_data` — we set it to
      // userId too for redundancy if Google ever truncates user_id.
      ssvInfo: { userId: String(userId || ''), customData: String(userId || '') },
    });
    rewardedPrepared = true;
    return true;
  } catch (err) {
    console.warn('[AdMob] prepareRewarded failed:', err?.message || err);
    rewardedPrepared = false;
    return false;
  }
};

/**
 * Show a prepared rewarded ad. Resolves to:
 *   { rewarded: true } if the user earned the reward,
 *   { rewarded: false, reason: 'dismissed' | 'load_failed' | 'unsupported' } otherwise.
 *
 * Callers should not award credits here — the actual credit grant happens
 * server-side via the SSV callback. Use the result only to decide what UI
 * to show next.
 */
export const showRewarded = async () => {
  if (!isAndroidNative()) return { rewarded: false, reason: 'unsupported' };

  const plugin = await loadPlugin();
  if (!plugin) return { rewarded: false, reason: 'unsupported' };
  const { AdMob, RewardAdPluginEvents } = plugin;

  let earned = false;
  const subscriptions = [];

  const cleanup = async () => {
    for (const s of subscriptions) {
      try {
        await s.remove();
      } catch {
        /* ignore */
      }
    }
    rewardedPrepared = false;
  };

  // Wire listeners that resolve the outer promise so we can `await` the
  // SDK's lifecycle without the no-async-promise-executor anti-pattern.
  let resolveOuter;
  const outcome = new Promise((resolve) => {
    resolveOuter = resolve;
  });

  subscriptions.push(
    await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      earned = true;
    })
  );
  subscriptions.push(
    await AdMob.addListener(RewardAdPluginEvents.Dismissed, async () => {
      await cleanup();
      resolveOuter({ rewarded: earned, reason: earned ? undefined : 'dismissed' });
    })
  );
  subscriptions.push(
    await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, async (err) => {
      await cleanup();
      resolveOuter({ rewarded: false, reason: 'load_failed', error: err });
    })
  );

  try {
    await AdMob.showRewardVideoAd();
  } catch (err) {
    await cleanup();
    resolveOuter({ rewarded: false, reason: 'show_failed', error: err });
  }

  return outcome;
};

export const prepareInterstitial = async () => {
  if (!isAndroidNative()) return false;
  try {
    const plugin = await loadPlugin();
    if (!plugin) return false;
    if (!initialized) await initAdMob();
    await plugin.AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID });
    interstitialPrepared = true;
    return true;
  } catch (err) {
    console.warn('[AdMob] prepareInterstitial failed:', err?.message || err);
    interstitialPrepared = false;
    return false;
  }
};

export const showInterstitial = async () => {
  if (!isAndroidNative() || !interstitialPrepared) return false;
  try {
    const plugin = await loadPlugin();
    if (!plugin) return false;
    await plugin.AdMob.showInterstitial();
    interstitialPrepared = false;
    // Best-effort preload the next one
    prepareInterstitial();
    return true;
  } catch (err) {
    console.warn('[AdMob] showInterstitial failed:', err?.message || err);
    interstitialPrepared = false;
    return false;
  }
};

export const isReady = {
  rewarded: () => rewardedPrepared,
  interstitial: () => interstitialPrepared,
};

export const isAndroidAdMob = isAndroidNative;

export default {
  initAdMob,
  prepareRewarded,
  showRewarded,
  prepareInterstitial,
  showInterstitial,
  isReady,
  isAndroidAdMob,
};
