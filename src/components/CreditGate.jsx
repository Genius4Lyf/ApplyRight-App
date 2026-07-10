import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, PlayCircle, Sparkles } from 'lucide-react';
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
        toast.error(`Please wait ${Math.ceil(remMs / 1000)}s before watching another ad.`);
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
      toast.error('Could not refresh your balance. Please try again.');
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
      {!isLoading && (
        <div
          className={`flex ${
            isCard ? 'flex-col gap-3 p-3' : 'flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4'
          } bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-xl`}
        >
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-tight">
                You need {short} more credit{short === 1 ? '' : 's'} to run this
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                This action costs {cost} credits — you have {credits}.
              </p>
            </div>
          </div>
          <div className={`flex gap-2 ${isCard ? 'w-full' : 'shrink-0'}`}>
            {/* Watch-ad-for-credits is NATIVE ANDROID ONLY. Web has no ads — the
                sole web CTA is "Get credits" (→ /credits paid top-up store). */}
            {isAndroidNative() && (
              <button
                type="button"
                onClick={startAd}
                disabled={checking}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
                  isCard ? 'flex-1' : ''
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                {checking ? 'Checking…' : 'Watch ad'}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/credits')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                isCard ? 'flex-1' : ''
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Get credits
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
          title="Earn Free Credits"
          subtitle="View our sponsor's offer to instantly unlock free A.I credits for this action."
          buttonText="View Offer"
          successTitle="Credits Unlocked!"
          successMessage="Your credits have been added — you can generate now."
          androidTitle="Watch a Quick Video"
          androidSubtitle="Watch a short video to earn free A.I credits for this action."
          androidButtonText="Watch Video"
          androidSuccessTitle="Credits Unlocked!"
          androidSuccessMessage="Your credits have been added — you can generate now."
        />
      )}
    </div>
  );
};

export default CreditGate;
