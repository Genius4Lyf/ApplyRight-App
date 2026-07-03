import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Share2, X, Check, Play, Crown, ArrowRight, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { billingService } from '../services';
import api from '../services/api'; // Import API for config
import { TIERS, formatNgn } from '../lib/plans';
import AdPlayer from '../components/AdPlayer';

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

// Small, reusable section heading so the three store zones (earn / top up /
// go unlimited) read with consistent hierarchy.
const SectionHeading = ({ eyebrow, title, subtitle }) => (
  <div className="mb-5">
    {eyebrow && (
      <p className="text-xs uppercase tracking-wider font-bold text-indigo-500 dark:text-indigo-400">
        {eyebrow}
      </p>
    )}
    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{title}</h2>
    {subtitle && <p className="text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

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
  const [entitlement, setEntitlement] = useState(null); // subscription tier + live minutes
  const [buyingPack, setBuyingPack] = useState(null); // catalog id mid-checkout

  // Buyable credit packs (must match the backend catalog ids/amounts).
  const CREDIT_PACKS = [
    { id: 'credits_500', credits: 75, ngn: 500 },
    { id: 'credits_1000', credits: 150, ngn: 1000, best: true },
  ];

  // Start a Flutterwave checkout for a credit pack and redirect to the hosted link.
  const buyCredits = async (planId) => {
    try {
      setBuyingPack(planId);
      const { link } = await billingService.checkout(planId, 'NGN');
      if (link) window.location.href = link;
      else setBuyingPack(null);
    } catch (error) {
      setBuyingPack(null);
      alert(error.response?.data?.message || 'Could not start checkout. Please try again.');
    }
  };

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

    billingService
      .getEntitlement()
      .then(setEntitlement)
      .catch(() => setEntitlement(null));

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

  const referralBonus = config?.credits?.referralBonus || 10;

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

  const isPaid = entitlement && entitlement.tier !== 'free';
  const availableCredits = entitlement?.availableCredits ?? entitlement?.walletCredits ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 p-2 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors z-10"
        title="Go Back"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 pt-14 sm:pt-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 rounded-2xl">
            <Zap className="w-7 h-7 fill-indigo-600 dark:fill-indigo-300" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Credits &amp; Plans
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Earn credits for free, top up instantly, or go unlimited with a plan. Credits power AI
            CV writing, cover letters, ATS scoring and premium templates.
          </p>
        </div>

        {/* ── Balance hero ──────────────────────────────────────────────
            Anchors the page: how many credits you have + your current plan
            and live-interview minutes, all in one glance. */}
        {entitlement && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 sm:p-8 text-white shadow-xl">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-indigo-200">
                  Your A.I credits
                </p>
                <p className="text-5xl font-black leading-tight mt-1">{availableCredits}</p>
                {isPaid && (entitlement.planCredits ?? 0) >= 0 && (
                  <p className="text-sm text-indigo-100/80 mt-1">
                    {entitlement.planCredits ?? 0} from plan · {entitlement.walletCredits ?? 0} in
                    wallet
                  </p>
                )}
              </div>

              {/* Plan + minutes status */}
              <div className="sm:text-right">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur">
                  {isPaid ? (
                    <>
                      <Crown className="w-4 h-4 text-amber-300" />
                      <span className="capitalize">
                        {entitlement.planId || entitlement.tier} plan
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Free plan</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-indigo-100/90 mt-2">
                  {isPaid
                    ? `${entitlement.minutesRemaining} live interview min left`
                    : `${Math.ceil((entitlement.freeTasteRemainingSec || 0) / 60)} free interview min left`}
                  {isPaid && entitlement.expiresAt
                    ? ` · until ${new Date(entitlement.expiresAt).toLocaleDateString()}`
                    : ''}
                </p>
                <button
                  onClick={() => navigate('/upgrade')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  {isPaid ? 'Manage plan' : 'See all plans'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ ZONE 1 — Earn free credits ══════════════════════════════ */}
        <section>
          <SectionHeading
            eyebrow="No payment needed"
            title="Earn free credits"
            subtitle="Top up your wallet without spending a naira. Earned credits never expire."
          />
          <div className="grid md:grid-cols-2 gap-6">
            {/* Watch ad */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 dark:bg-indigo-500/15 rounded-full blur-3xl -mr-12 -mt-12 opacity-60" />
              <div className="relative z-10 p-5 sm:p-7 flex flex-col flex-1">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md">
                    <Play className="w-6 h-6 ml-0.5 fill-white" />
                  </div>
                  {adStats.streak > 0 && (
                    <div className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                      🔥 {adStats.streak} day streak
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-5">
                  {isAndroidNative() ? 'Watch a video' : 'Watch a quick ad'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Earn{' '}
                  <span className="font-bold text-indigo-600 dark:text-indigo-300">
                    +{platformReward} credits
                  </span>{' '}
                  in about 5 seconds.
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-sm text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-500" /> Instant reward
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-500" /> Unlimited daily
                  </span>
                </div>

                <button onClick={handleWatchClick} className="mt-auto pt-6 w-full">
                  <span className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-bold hover:opacity-95 transition-opacity shadow-md">
                    <Zap className="w-5 h-5 fill-white" />
                    {isAndroidNative() ? 'Watch video' : 'Watch ad'} · +{platformReward}
                  </span>
                </button>
              </div>
            </div>

            {/* Invite friends */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 dark:bg-blue-500/15 rounded-full blur-3xl -mr-12 -mt-12 opacity-60" />
              <div className="relative z-10 p-5 sm:p-7 flex flex-col flex-1">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-300">
                  <Share2 className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-5">
                  Invite friends
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Get{' '}
                  <span className="font-bold text-blue-600 dark:text-blue-300">
                    +{referralBonus} credits
                  </span>{' '}
                  for every friend who joins with your link.
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-sm text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-500" /> No limit on invites
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-500" /> Credits never expire
                  </span>
                </div>

                <button onClick={() => setShowInviteModal(true)} className="mt-auto pt-6 w-full">
                  <span className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <Share2 className="w-5 h-5" />
                    Get invite link
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══ ZONE 2 — Top up instantly ═══════════════════════════════ */}
        <section>
          <SectionHeading
            eyebrow="One-time purchase"
            title="Top up instantly"
            subtitle="Buy a credit pack with card or transfer. Added to your wallet, never expires."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {CREDIT_PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => buyCredits(p.id)}
                disabled={!!buyingPack}
                className={`relative flex items-center justify-between rounded-2xl border p-5 text-left transition-colors disabled:opacity-60 ${
                  p.best
                    ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500'
                }`}
              >
                {p.best && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    Best value
                  </span>
                )}
                <div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {p.credits} <span className="text-base font-semibold">credits</span>
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {(p.ngn / p.credits).toFixed(1)} ₦ per credit
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">
                  {buyingPack === p.id ? 'Starting…' : `₦${p.ngn.toLocaleString()}`}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ══ ZONE 3 — Go unlimited (subscriptions) ═══════════════════ */}
        <section>
          <SectionHeading
            eyebrow="Best for active job hunts"
            title="Go unlimited with a plan"
            subtitle="Plans unlock unlimited AI writing, the sharper GPT-4o model, premium templates and live interview minutes."
          />
          <div className="grid md:grid-cols-3 gap-4">
            {TIERS.map((t) => {
              const featured = t.featuredFor === 'NGN' || t.highlight;
              return (
                <div
                  key={t.id}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-md ${
                    featured
                      ? 'border-indigo-400 dark:border-indigo-500 bg-white dark:bg-slate-900 ring-1 ring-indigo-200 dark:ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  {t.badge && (
                    <span className="absolute -top-2.5 left-6 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                      {t.badge}
                    </span>
                  )}
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {t.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                      {formatNgn(t.priceNgn)}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/ {t.period}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {t.credits.toLocaleString()} credits
                    </span>{' '}
                    + {t.minutes} live interview min
                  </p>
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="mt-auto pt-6 w-full text-sm font-bold"
                  >
                    <span
                      className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl transition-colors ${
                        featured
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                          : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Choose {t.label}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
            Need just a few more interview minutes?{' '}
            <button
              onClick={() => navigate('/upgrade')}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              See minute top-ups →
            </button>
          </p>
        </section>

        {/* Info Footer */}
        <div className="text-center pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
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
              className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl"
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
                    Invite Friends &amp; Earn
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mt-2">
                    Share your code with friends. When they sign up, <b>you get</b>{' '}
                    <span className="text-green-600 font-bold">{referralBonus} A.I Credits</span>!
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
