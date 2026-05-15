import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Loader, CheckCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import billingService from '../services/billing.service';
import useAdMobReward from '../hooks/useAdMobReward';

// True when running inside the Android Capacitor build. AdMob Rewarded Video
// replaces the Monetag link-out on this platform; web behavior is unchanged.
const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const AdPlayer = (props) => {
  const {
    onComplete,
    onClose,
    userId, // required on Android for AdMob SSV `user_id` field
    title = 'Sponsored Offer',
    subtitle = "View our sponsor's offer to unlock 5 free A.I credits instantly.",
    successMessage = '5 A.I credits have been added to your account.',
    buttonText = 'View Offer',
    successTitle = '+5 A.I Credits Unlocked!',
    androidTitle = 'Watch a Quick Video',
    androidSubtitle = 'Watch a short video to unlock 10 A.I credits.',
    androidButtonText = 'Watch Video',
    androidSuccessTitle = '+10 A.I Credits Unlocked!',
    androidSuccessMessage = '10 A.I credits have been added to your account.',
  } = props;

  const usingAdMob = isAndroidNative();
  const { showAd: showRewardedAd } = useAdMobReward(userId);

  // States: 'initial', 'verifying', 'completed', 'tab-closed', 'failed'
  const [adState, setAdState] = useState('initial');
  const [timeLeft, setTimeLeft] = useState(10);
  const [verifyMessage, setVerifyMessage] = useState('');
  const intervalRef = useRef(null);
  const adWindowRef = useRef(null);
  const windowCheckInterval = useRef(null);
  const completedRef = useRef(false);

  const DIRECT_LINK_URL = 'https://otieu.com/4/10562647';

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (windowCheckInterval.current) clearInterval(windowCheckInterval.current);
    };
  }, []);

  // ---------- Web (Monetag) flow ----------

  const handleStartWebAd = () => {
    const adWindow = window.open(DIRECT_LINK_URL, '_blank');
    adWindowRef.current = adWindow;

    setAdState('verifying');
    completedRef.current = false;
    startTimer();

    if (adWindow) {
      startWindowCheck();
    }
  };

  const startTimer = () => {
    setTimeLeft(10);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          handleAdComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startWindowCheck = () => {
    windowCheckInterval.current = setInterval(() => {
      if (adWindowRef.current && adWindowRef.current.closed && !completedRef.current) {
        clearInterval(intervalRef.current);
        clearInterval(windowCheckInterval.current);
        setAdState('tab-closed');
      }
    }, 500);
  };

  const handleAdComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    if (windowCheckInterval.current) clearInterval(windowCheckInterval.current);

    setAdState('completed');
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  // ---------- Android (AdMob Rewarded) flow ----------
  //
  // After the ad plays, credit awarding happens server-side via Google's
  // SSV callback. The client just polls /balance to detect when SSV lands.

  const handleStartAdMobAd = async () => {
    completedRef.current = false;
    setAdState('verifying');
    setVerifyMessage('Loading ad…');

    let baseline = 0;
    try {
      const bal = await billingService.getBalance();
      baseline = bal?.credits ?? 0;
    } catch {
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

    setVerifyMessage('Reward landing…');
    const poll = await billingService.pollBalanceUntilIncrease(baseline, {
      intervalMs: 1500,
      timeoutMs: 12000,
    });

    completedRef.current = true;
    if (poll.increased) {
      setAdState('completed');
      setTimeout(() => onComplete(), 1500);
    } else {
      // SSV is usually <2s but can lag. Show a soft success and let the
      // parent refresh — credits arrive eventually.
      setAdState('completed');
      setVerifyMessage("Reward is on its way — it'll appear shortly.");
      setTimeout(() => onComplete(), 1500);
    }
  };

  const handleStartAd = usingAdMob ? handleStartAdMobAd : handleStartWebAd;

  const handleRetry = () => {
    setAdState('initial');
    setTimeLeft(10);
    setVerifyMessage('');
  };

  const handleClose = () => {
    if (adState === 'completed') {
      onClose();
    } else if (adState === 'verifying') {
      if (window.confirm("Cancel verification? You won't receive the reward.")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const displayTitle = usingAdMob ? androidTitle : title;
  const displaySubtitle = usingAdMob ? androidSubtitle : subtitle;
  const displayButton = usingAdMob ? androidButtonText : buttonText;
  const displaySuccessTitle = usingAdMob ? androidSuccessTitle : successTitle;
  const displaySuccessMessage = usingAdMob ? androidSuccessMessage : successMessage;

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
                {usingAdMob ? (
                  <PlayCircle className="w-10 h-10" />
                ) : (
                  <ExternalLink className="w-10 h-10" />
                )}
              </div>
            )}
            {adState === 'verifying' && !usingAdMob && (
              <div className="relative w-full h-full flex items-center justify-center">
                <svg
                  className="absolute inset-0 w-full h-full rotate-[-90deg]"
                  viewBox="0 0 100 100"
                >
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={283 - 283 * ((10 - timeLeft) / 10)}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="text-2xl font-bold text-indigo-600 font-mono">{timeLeft}</span>
              </div>
            )}
            {adState === 'verifying' && usingAdMob && (
              <div className="w-full h-full bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <Loader className="w-10 h-10 animate-spin" />
              </div>
            )}
            {adState === 'completed' && (
              <div className="w-full h-full bg-green-100 text-green-600 rounded-full flex items-center justify-center scale-110 transition-transform">
                <CheckCircle className="w-12 h-12" />
              </div>
            )}
          </div>

          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            {adState === 'initial' && displayTitle}
            {adState === 'verifying' && (usingAdMob ? 'Playing…' : 'Verifying...')}
            {adState === 'completed' && displaySuccessTitle}
            {adState === 'tab-closed' && (usingAdMob ? 'Ad Closed Early' : 'Ad Tab Closed')}
            {adState === 'failed' && 'Ad Failed to Load'}
          </h3>

          <p className="text-slate-500 mb-8 min-h-[48px]">
            {adState === 'initial' && displaySubtitle}
            {adState === 'verifying' && !usingAdMob && (
              <>
                <strong className="text-orange-600">Keep the ad tab open!</strong> Don't close it
                until verification completes.
              </>
            )}
            {adState === 'verifying' &&
              usingAdMob &&
              (verifyMessage || 'Watch through to the end to earn your reward.')}
            {adState === 'completed' && (verifyMessage || displaySuccessMessage)}
            {adState === 'tab-closed' &&
              !usingAdMob &&
              'You closed the ad tab too early. Please try again and keep the tab open for the full duration.'}
            {adState === 'tab-closed' &&
              usingAdMob &&
              'You closed the ad before it finished. Watch the full video to earn the reward.'}
            {adState === 'failed' &&
              "We couldn't load an ad right now. Please try again in a moment."}
          </p>

          {adState === 'initial' && (
            <button
              onClick={handleStartAd}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {displayButton} <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {adState === 'completed' && (
            <div className="w-full py-4 bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2">
              Success!
            </div>
          )}

          {adState === 'verifying' && (
            <div className="space-y-4">
              <button
                disabled
                className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl font-bold text-lg cursor-wait flex items-center justify-center gap-2"
              >
                <Loader className="w-5 h-5 animate-spin" />
                {usingAdMob ? 'Playing video…' : 'Verifying...'}
              </button>

              <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg p-3">
                <span className="text-green-600 text-lg">💚</span>
                <p className="text-sm text-green-700 leading-relaxed">
                  We use ads to keep ApplyRight free for everyone. Thank you for your support!
                </p>
              </div>
            </div>
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
          {usingAdMob ? 'AdMob — Google Mobile Ads' : 'Trusted Partner Network'}
        </div>
      </motion.div>
    </div>
  );
};

export default AdPlayer;
