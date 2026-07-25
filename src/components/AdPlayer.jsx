import React, { useState, useRef } from 'react';
import { X, Loader, CheckCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import billingService from '../services/billing.service';
import useAdMobReward from '../hooks/useAdMobReward';
import AriaLoader from './ui/AriaLoader';

// AdMob Rewarded Video → SSV → credits. NATIVE ANDROID ONLY: web has no ads, so
// every render site mounts this component only on native. The former web
// (Monetag link-out) branch has been removed entirely.

const AdPlayer = (props) => {
  const {
    onComplete,
    onClose,
    userId, // required for AdMob SSV `user_id` field
    androidTitle = 'Watch a Quick Video',
    androidSubtitle = 'Watch a short video to unlock 10 A.I credits.',
    androidButtonText = 'Watch Video',
    androidSuccessTitle = '+10 A.I Credits Unlocked!',
    androidSuccessMessage = 'Thank you for supporting ApplyRight. We look forward to making it better for you.',
  } = props;

  const { showAd: showRewardedAd } = useAdMobReward(userId);

  // States: 'initial', 'verifying', 'allocating', 'completed', 'pending', 'tab-closed', 'failed'
  // ('allocating' is shown while the SSV reward is being verified)
  const [adState, setAdState] = useState('initial');
  const [verifyMessage, setVerifyMessage] = useState('');
  const completedRef = useRef(false);

  // ---------- Android (AdMob Rewarded) flow ----------
  //
  // After the ad plays, credit awarding happens server-side via Google's
  // SSV callback. The client just polls /balance to detect when SSV lands.

  const handleStartAd = async () => {
    completedRef.current = false;
    setAdState('verifying');
    setVerifyMessage('Loading ad…');

    let baseline = 0;
    try {
      const bal = await billingService.getBalance();
      baseline = bal?.credits ?? 0;
    } catch (e) {
      console.warn('[AdFlow] getBalance (baseline) failed', e?.message);
      /* continue with baseline=0; we'll still complete on credit arrival */
    }

    const result = await showRewardedAd();
    if (!result.rewarded) {
      if (result.reason === 'dismissed') {
        setAdState('tab-closed');
      } else {
        setAdState('failed');
      }
      return;
    }

    // Video finished — now wait for the server-side SSV reward to land. Show a
    // dedicated "allocating credits" loading modal during this verification.
    setAdState('allocating');
    const poll = await billingService.pollBalanceUntilIncrease(baseline, {
      intervalMs: 1500,
      timeoutMs: 12000,
    });

    completedRef.current = true;
    if (poll.increased) {
      setVerifyMessage('');
      setAdState('completed');
      setTimeout(() => onComplete(), 3000);
    } else {
      // Balance did NOT increase within the poll window. Do NOT claim the
      // credits were added — the SSV grant may have been rejected (cooldown/
      // cap), failed (user mismatch), or simply never fired. Show an honest
      // "pending" state instead of a green "+10 Unlocked".
      setAdState('pending');
      setVerifyMessage("Reward is being verified — if it doesn't appear shortly, try again later.");
      setTimeout(() => onComplete(), 3000);
    }
  };

  const handleRetry = () => {
    setAdState('initial');
    setVerifyMessage('');
  };

  const handleClose = () => {
    onClose();
  };

  // The native AdMob video fills the screen on its own, and the reward lands
  // server-side right after it ends. Hide our own modal while it's playing/
  // loading so the user goes straight from the tap to the video, then to the
  // success modal — no redundant "playing" spinner.
  if (adState === 'verifying') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10 text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            {adState === 'initial' && (
              <div className="w-full h-full bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                <PlayCircle className="w-10 h-10" />
              </div>
            )}
            {adState === 'allocating' && (
              <div className="w-full h-full bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <AriaLoader inline tone="mono" size={40} label="Verifying your reward…" />
              </div>
            )}
            {adState === 'completed' && (
              <div className="w-full h-full bg-green-100 text-green-600 rounded-full flex items-center justify-center scale-110 transition-transform">
                <CheckCircle className="w-12 h-12" />
              </div>
            )}
            {adState === 'pending' && (
              <div className="w-full h-full bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <Loader className="w-10 h-10" />
              </div>
            )}
          </div>

          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            {adState === 'initial' && androidTitle}
            {adState === 'allocating' && 'Allocating Credits'}
            {adState === 'completed' && androidSuccessTitle}
            {adState === 'pending' && 'Reward Pending'}
            {adState === 'tab-closed' && 'Ad Closed Early'}
            {adState === 'failed' && 'Ad Failed to Load'}
          </h3>

          <p className="text-slate-500 mb-8 min-h-[48px]">
            {adState === 'initial' && androidSubtitle}
            {adState === 'allocating' &&
              'Allocating credits to your account — please wait while we verify your reward…'}
            {adState === 'completed' && (verifyMessage || androidSuccessMessage)}
            {adState === 'pending' &&
              (verifyMessage ||
                'Your reward is being verified and will appear in your balance shortly.')}
            {adState === 'tab-closed' &&
              'You closed the ad before it finished. Watch the full video to earn the reward.'}
            {adState === 'failed' &&
              "We couldn't load an ad right now. Please try again in a moment."}
          </p>

          {adState === 'initial' && (
            <>
              <button
                onClick={handleStartAd}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                {androidButtonText} <ArrowRight className="w-5 h-5" />
              </button>
              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                ApplyRight uses ads to make it free for everyone.
              </p>
            </>
          )}

          {adState === 'completed' && (
            <div className="w-full py-4 bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2">
              Success!
            </div>
          )}

          {adState === 'allocating' && (
            <button
              disabled
              className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl font-bold text-lg cursor-wait flex items-center justify-center gap-2"
            >
              <AriaLoader inline tone="mono" size={16} label="" />
              Verifying…
            </button>
          )}

          {adState === 'pending' && (
            <button
              onClick={handleClose}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              Got it
            </button>
          )}

          {(adState === 'tab-closed' || adState === 'failed') && (
            <button
              onClick={handleRetry}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              Try Again
            </button>
          )}
        </div>

        <div className="bg-slate-50 p-4 text-xs text-center text-slate-400 border-t border-slate-100">
          AdMob — Google Mobile Ads
        </div>
      </motion.div>
    </div>
  );
};

export default AdPlayer;
