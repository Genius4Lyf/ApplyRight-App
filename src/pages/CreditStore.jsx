import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Share2, X, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { billingService } from '../services';
import api from '../services/api'; // Import API for config
import AdPlayer from '../components/AdPlayer';

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const CreditStore = () => {
  const navigate = useNavigate();

  // Ad State
  const [showAdPlayer, setShowAdPlayer] = useState(false);
  const [adStats, setAdStats] = useState({
    watchCount: 0,
    maxDaily: 999,
    lastWatch: null,
    streak: 0,
  });
  const [showReward, setShowReward] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');

  // Referral State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [loadingCode, setLoadingCode] = useState(true);
  const [config, setConfig] = useState(null); // Store system config

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/auth/config');
        setConfig(res.data);
      } catch (error) {
        console.error('Failed to fetch config', error);
      }
    };
    fetchConfig();

    window.addEventListener('settings_updated', fetchConfig);

    const fetchAdStats = async () => {
      try {
        const stats = await billingService.getAdStats();
        setAdStats(stats);
      } catch (error) {
        console.error('Failed to fetch ad stats', error);
      }
    };
    fetchAdStats();

    // Fetch user profile to get referral code from backend
    const fetchReferralCode = async () => {
      try {
        setLoadingCode(true);
        // Get fresh user data from localStorage (updated on login)
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser.referralCode) {
          setReferralCode(storedUser.referralCode);
        }
        setLoadingCode(false);
      } catch (e) {
        console.error(e);
        setLoadingCode(false);
      }
    };
    fetchReferralCode();

    // Cleanup
    return () => {
      window.removeEventListener('settings_updated', fetchConfig);
    };
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopySuccess('Link Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const handleAdSuccess = async () => {
    try {
      // On Android the credit grant lands via AdMob SSV — no client-side
      // /watch-ad call. Pull the fresh balance and ad stats from the server.
      if (isAndroidNative()) {
        const [bal, stats] = await Promise.all([
          billingService.getBalance().catch(() => null),
          billingService.getAdStats().catch(() => null),
        ]);
        if (bal?.credits != null) {
          window.dispatchEvent(new CustomEvent('credit_updated', { detail: bal.credits }));
        }
        if (stats) setAdStats(stats);
        // The AdPlayer's own completion modal already shows the thank-you +
        // credits-awarded message, so we don't fire the extra celebration
        // overlay here (that produced a duplicate success modal).
        setRewardMessage('');
        setShowAdPlayer(false);
        return;
      }

      // Web (Monetag) — server awards on this call.
      const result = await billingService.watchAd();

      window.dispatchEvent(new CustomEvent('credit_updated', { detail: result.credits }));

      setAdStats((prev) => ({
        ...prev,
        watchCount: result.watchCount,
        streak: result.streak,
      }));

      setRewardMessage(result.streakMessage || '');
      setShowAdPlayer(false);
      setShowReward(true);
      setTimeout(() => {
        setShowReward(false);
        setRewardMessage('');
      }, 4000);
    } catch (error) {
      console.error('Ad reward failed:', error);
      const serverMsg = error.response?.data?.message || error.message || 'Unknown error';
      alert(`Failed to claim reward: ${serverMsg}`);
      setShowAdPlayer(false);
    }
  };

  const getStoredUserId = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const resolved = stored?._id || stored?.id || null;
      console.log(
        `[AdFlow] getStoredUserId resolved=${resolved} keys=${Object.keys(stored).join(',')}`
      );
      return resolved;
    } catch (e) {
      console.warn('[AdFlow] getStoredUserId failed to parse localStorage user', e);
      return null;
    }
  };

  const platformReward = isAndroidNative()
    ? config?.credits?.adRewardAndroid || 10
    : config?.credits?.adReward || 5;

  // Pre-check the per-user ad cooldown before opening the ad, so the user never
  // watches one the server would reject (web Monetag + Android AdMob alike).
  const handleWatchClick = async () => {
    try {
      const stats = await billingService.getAdStats();
      if (stats?.cooldownRemainingMs > 0) {
        alert(
          `Please wait ${Math.ceil(stats.cooldownRemainingMs / 1000)}s before watching another ad.`
        );
        return;
      }
    } catch {
      /* stats hiccup — don't block, let them try */
    }
    setShowAdPlayer(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors z-10"
        title="Go Back"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 rounded-2xl mb-4">
            <Zap className="w-8 h-8 fill-indigo-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Free A.I Credits Store
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ApplyRight is 100% free. Watch ads to earn A.I credits for premium templates and AI
            features.
          </p>
        </div>

        {/* Earn credits by watching an ad — Monetag on web, AdMob on Android. */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative transform transition-all hover:shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-500/15 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 dark:bg-purple-500/15 rounded-full blur-3xl -ml-16 -mb-16 opacity-50"></div>

          <div className="p-8 md:p-12 relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 text-xs font-bold uppercase tracking-wider mb-4">
                  Instant Reward
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {isAndroidNative()
                    ? 'Watch Video to Earn Credits'
                    : 'Watch an Ad to Earn Credits'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                  {isAndroidNative() ? 'Watch a short video ad' : 'View a quick sponsored offer'}{' '}
                  and earn{' '}
                  <span className="text-indigo-600 dark:text-indigo-300 font-bold">
                    {platformReward} A.I Credits
                  </span>
                  .
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Takes only 5 seconds</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Instant reward</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Unlimited daily views</span>
                </div>
              </div>
            </div>

            <div className="flex-none">
              <button
                onClick={handleWatchClick}
                className="group relative flex flex-col items-center justify-center w-64 h-64 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl shadow-lg hover:scale-105 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-10 h-10 text-indigo-600 ml-1" />
                </div>
                <span className="text-white font-bold text-2xl">
                  {isAndroidNative() ? 'Watch Video' : 'Watch Ad'}
                </span>
                <span className="text-indigo-200 font-medium mt-1">
                  +{platformReward} A.I Credits
                </span>

                {adStats.streak > 0 && (
                  <div className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                    🔥 {adStats.streak} Day Streak
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Actions Grid */}
        <div className="grid md:grid-cols-1 gap-6 max-w-md mx-auto">
          {/* Invite Friend */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Share2 className="w-32 h-32 text-slate-900 dark:text-slate-100" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/15 rounded-xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-300">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Invite Friends
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Get{' '}
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {config?.credits?.referralBonus || 10} A.I Credits
                </span>{' '}
                for every friend who joins using your link.
              </p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors"
              >
                Get Invite Link
              </button>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="text-center pt-8 border-t border-slate-200/50 dark:border-slate-700/50">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Need help? Contact support@applyright.com.ng
          </p>
        </div>
      </div>

      {/* Ad Player Modal */}
      {showAdPlayer && (
        <AdPlayer
          userId={getStoredUserId()}
          onComplete={handleAdSuccess}
          onClose={() => setShowAdPlayer(false)}
        />
      )}

      {/* Reward Celebration Overlay */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-yellow-400/50"
              >
                <Zap className="w-12 h-12 text-white fill-white" />
              </motion.div>
              <h2 className="text-4xl font-black text-white drop-shadow-lg mb-2">
                +{platformReward} A.I Credits!
              </h2>
              {rewardMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-orange-500 text-white px-3 py-1 rounded-full font-bold text-sm mb-2 shadow-lg"
                >
                  {rewardMessage}
                </motion.div>
              )}
              <p className="text-white/80 font-medium">Reward Claimed Successfully</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Friend Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </button>

              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center mx-auto">
                  <Share2 className="w-8 h-8 text-green-600 dark:text-green-300" />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Invite Friends & Earn
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mt-2">
                    Share your code with friends. When they sign up, <b>you get</b>{' '}
                    <span className="text-green-600 font-bold">
                      {config?.credits?.referralBonus || 10} A.I Credits
                    </span>
                    !
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Referral Code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      YOUR REFERRAL CODE
                    </label>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="font-mono text-xl font-bold text-slate-800 dark:text-slate-200 tracking-wider">
                        {loadingCode ? 'LOADING...' : referralCode || 'ERROR'}
                      </div>
                      <button
                        onClick={handleCopyCode}
                        disabled={loadingCode || !referralCode}
                        className={`${copySuccess === 'Copied!' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'} px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {copySuccess === 'Copied!' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Share Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      OR SHARE THIS LINK
                    </label>
                    <button
                      onClick={handleCopyLink}
                      disabled={loadingCode || !referralCode}
                      className="w-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-4 flex items-center justify-between gap-4 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-sm text-indigo-600 dark:text-indigo-300 font-medium truncate">
                        {loadingCode
                          ? 'Loading...'
                          : `${window.location.origin}/register?ref=${referralCode}`}
                      </div>
                      <div
                        className={`${copySuccess === 'Link Copied!' ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white'} px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap`}
                      >
                        {copySuccess === 'Link Copied!' ? '✓ Copied' : 'Copy Link'}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400 dark:text-slate-500">
                  A.I Credits are valid for CV analysis and optimizations.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreditStore;
