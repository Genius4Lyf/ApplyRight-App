import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import useCredits from '../hooks/useCredits';
import billingService from '../services/billing.service';
import AdPlayer from './AdPlayer';

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const readStoredUserId = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u._id || u.id || null;
  } catch {
    return null;
  }
};

// Wrap a Generate / Analyze button. If the user has enough credits, renders
// the children unchanged. Otherwise renders an inline amber banner above a
// disabled clone of the children, so the user sees the action they wanted
// plus a clear "why it's blocked + how to unblock" explanation.
//
// Usage:
//   <CreditGate cost={CREDIT_COSTS.FIT_ANALYSIS}>
//     <button onClick={handleAnalyze} className="...">Analyze</button>
//   </CreditGate>
//
// The post-hoc "Insufficient Credits" modal in Dashboard.jsx remains as a
// safety net for cases where credits change between preflight and click
// (e.g. a parallel tab spent some).
const CreditGate = ({ cost, children, className = '', layout = 'wide' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { credits, hasEnough, shortBy } = useCredits();
  const [showAd, setShowAd] = useState(false);
  const [checking, setChecking] = useState(false);

  // Pre-check the per-user ad cooldown BEFORE playing an ad — on both web and
  // Android — so the user never watches an ad whose reward the server would
  // reject. Only open the ad if a watch is actually claimable right now.
  const startAd = async () => {
    setChecking(true);
    try {
      const stats = await billingService.getAdStats();
      const remMs = stats?.cooldownRemainingMs || 0;
      if (remMs > 0) {
        toast.error(t('creditGate.adWaitCooldown', { seconds: Math.ceil(remMs / 1000) }));
        return;
      }
      setShowAd(true);
    } catch {
      // A stats hiccup shouldn't block the user — let them try the ad.
      setShowAd(true);
    } finally {
      setChecking(false);
    }
  };

  // Reconcile credits after the ad. NATIVE ANDROID ONLY: AdPlayer already granted
  // via AdMob SSV and polled until it landed, so we only re-sync the balance
  // (re-polling here was double work and caused false "didn't land" errors). Then
  // broadcast so the gate unlocks automatically. Web has no ads — the AdPlayer
  // never mounts there, so this only runs on native.
  const handleAdComplete = async () => {
    setShowAd(false);
    try {
      const bal = await billingService.getBalance();
      if (typeof bal?.credits === 'number') {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: bal.credits }));
      }
    } catch {
      toast.error(t('creditGate.balanceRefreshFailed'));
    }
  };

  if (hasEnough(cost)) {
    return children;
  }

  const short = shortBy(cost);
  // While credits are still loading (null), don't render a misleading banner —
  // just disable the children and skip the warning copy. Users without a
  // signed-in user object would see this; rare in practice.
  const isLoading = credits == null;
  const isCard = layout === 'card';

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* INK, not amber. Running short of credits is an ordinary fact about the account,
          not a warning — a filled amber panel with a coloured icon and a solid orange
          button shouts at the user about something that is simply the price. The
          editorial language the rest of the app uses says it once, plainly: a mono
          eyebrow, the number in ink, and one solid ink button. */}
      {!isLoading && (
        <div
          className={`flex ${
            isCard ? 'flex-col gap-3 p-3.5' : 'flex-col sm:flex-row sm:items-center gap-3 p-3.5 sm:p-4'
          } rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50`}
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('creditGate.eyebrow')}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-snug text-slate-900 dark:text-slate-100">
              {t('creditGate.needMoreCredits', { count: short })}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              {t('creditGate.costVsBalance', { cost, credits })}
            </p>
          </div>
          <div className={`flex gap-2 ${isCard ? 'w-full' : 'shrink-0'}`}>
            {/* Watch-ad-for-credits is NATIVE ANDROID ONLY. Web has no ads — the
                sole web CTA is "Get credits" (→ /credits paid top-up store). */}
            {isAndroidNative() && (
              <button
                type="button"
                onClick={startAd}
                disabled={checking}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-100 dark:hover:text-white ${
                  isCard ? 'flex-1' : ''
                }`}
              >
                <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {checking ? t('creditGate.checking') : t('creditGate.watchAd')}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/credits')}
              className={`inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-4 text-[12px] font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:focus-visible:ring-white dark:focus-visible:ring-offset-slate-900 ${
                isCard ? 'flex-1' : ''
              }`}
            >
              {t('creditGate.getCredits')}
            </button>
          </div>
        </div>
      )}

      {/* Render the original button(s) but force-disable. Pointer events off so
          their existing onClick can't fire even if the disabled prop is
          ignored (e.g. a div pretending to be a button). */}
      <div className="opacity-50 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {showAd && isAndroidNative() && (
        <AdPlayer
          userId={readStoredUserId()}
          onComplete={handleAdComplete}
          onClose={() => setShowAd(false)}
          title={t('creditGate.ad.title')}
          subtitle={t('creditGate.ad.subtitle')}
          buttonText={t('creditGate.ad.buttonText')}
          successTitle={t('creditGate.ad.successTitle')}
          successMessage={t('creditGate.ad.successMessage')}
          androidTitle={t('creditGate.ad.androidTitle')}
          androidSubtitle={t('creditGate.ad.androidSubtitle')}
          androidButtonText={t('creditGate.ad.androidButtonText')}
          androidSuccessTitle={t('creditGate.ad.successTitle')}
          androidSuccessMessage={t('creditGate.ad.successMessage')}
        />
      )}
    </div>
  );
};

export default CreditGate;
