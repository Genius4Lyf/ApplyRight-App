import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, X } from 'lucide-react';
import { isUpdateAvailable, canAutoReload, autoReloadBlockers } from '../lib/appUpdate';
import { isMobile } from '../utils/platform';

// KEEPS A LONG-OPEN TAB FROM RUNNING LAST WEEK'S CODE.
//
// Deploys do not reach tabs that are already open. lib/lazyWithRetry stops such a tab
// BREAKING when it navigates to a chunk that no longer exists; this stops it silently
// running stale code in the first place — the failure mode with no symptom, where a user
// sits on a bug that was fixed days ago and neither of you knows why.
//
// The policy, chosen deliberately:
//
//   RELOAD SILENTLY when the user changes route AND nothing would be lost. A route change
//   is the safest instant there is: they have already decided to leave what is on screen,
//   and the destination is in the URL, so a fresh document lands exactly where they asked
//   to go. They see one extra beat of loading, which is indistinguishable from a slow
//   page — and never a banner they have to understand.
//
//   OTHERWISE ASK. Unsaved typing, or a live interview in progress, and the reload waits
//   behind a dismissible bar. Silently reloading a half-written CV out from under someone
//   is a worse bug than the one being shipped. See canAutoReload().
//
// Never on native: the Android build ships its assets inside the APK, so there is no
// deploy for a running app to be behind. Updates arrive through the Play Store.
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
// A new tab has just fetched everything it needs; asking again immediately would be
// asking whether the thing we just downloaded is the thing we just downloaded.
const FIRST_CHECK_DELAY_MS = 60 * 1000;

const AppUpdateGate = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Read inside the route effect without making it a dependency — the effect must fire on
  // a PATH change and nothing else, or discovering the update would itself trigger a
  // reload mid-page rather than at the next navigation.
  //
  // Synced in an effect, not assigned during render: a ref written while rendering is a
  // render with a side effect, and under StrictMode/concurrent rendering that render can
  // be thrown away — leaving the ref reflecting work React discarded. Declared ABOVE the
  // route effect so it has already run by the time that one reads it.
  const readyRef = useRef(false);
  useEffect(() => {
    readyRef.current = updateReady;
  }, [updateReady]);

  const check = useCallback(async () => {
    if (readyRef.current) return; // already known; nothing to learn
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (await isUpdateAvailable()) setUpdateReady(true);
  }, []);

  useEffect(() => {
    if (isMobile()) return undefined;

    const first = window.setTimeout(check, FIRST_CHECK_DELAY_MS);
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    // The highest-value moment: someone returning to a tab left open since yesterday.
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  // The auto-reload, at a route change and nowhere else.
  useEffect(() => {
    if (!readyRef.current) return;
    if (!canAutoReload()) {
      // Held back on purpose. Logged because "why did it not update" is otherwise
      // unanswerable from a bug report.
      console.info('Update held:', autoReloadBlockers().join(', ') || 'unsaved work');
      return;
    }
    // React Router has already put the destination in the URL, so replacing with the
    // current href loads the page the user just asked for, with the new code. `replace`
    // rather than `reload` so no extra history entry is left to trap the back button.
    window.location.replace(window.location.href);
  }, [location.pathname]);

  if (!updateReady || dismissed) return null;

  // Only reached when the reload was NOT safe to take automatically.
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[300] flex justify-center p-4">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
      >
        <RefreshCw
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
        />
        <span className="text-[13px] text-slate-700 dark:text-slate-200">
          {t('appUpdate.available')}
        </span>
        <button
          type="button"
          onClick={() => window.location.replace(window.location.href)}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {t('appUpdate.reload')}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('common.close')}
          className="-mr-1 shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AppUpdateGate;
