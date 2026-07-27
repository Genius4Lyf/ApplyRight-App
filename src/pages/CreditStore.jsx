import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Share2, X, Check, Play, ArrowRight, Lock } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { billingService } from '../services';
import api from '../services/api'; // Import API for config
import { TOPUPS, FREE_TASTE_MIN, formatNgn } from '../lib/plans';
import AdPlayer from '../components/AdPlayer';
import AriaOrbit from '../components/cv/AriaOrbit';
import PaymentTrustModal from '../components/PaymentTrustModal';
import { hasSeenPaymentNotice, markPaymentNoticeSeen } from '../lib/paymentTrust';

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

// Small, reusable section heading so the three store zones (earn / top up /
// go unlimited) read with consistent hierarchy.
const SectionHeading = ({ eyebrow, title, subtitle }) => (
  <div className="mb-5">
    {eyebrow && (
      <p className="text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
        {eyebrow}
      </p>
    )}
    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{title}</h2>
    {subtitle && <p className="text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

const CreditStore = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Ad State
  const [showAdPlayer, setShowAdPlayer] = useState(false);
  const [adStats, setAdStats] = useState({
    watchCount: 0,
    maxDaily: 999,
    lastWatch: null,
    streak: 0,
  });

  // Referral State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [loadingCode, setLoadingCode] = useState(true);
  const [config, setConfig] = useState(null); // Store system config
  const [entitlement, setEntitlement] = useState(null); // subscription tier + live minutes
  const [buyingPack, setBuyingPack] = useState(null); // catalog id mid-checkout
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState(null);

  // Buyable credit packs (must match the backend catalog ids/amounts).
  const CREDIT_PACKS = [
    { id: 'credits_500', credits: 75, ngn: 500 },
    { id: 'credits_1000', credits: 150, ngn: 1000, best: true },
  ];

  // Start a Flutterwave checkout for a credit pack and redirect to the hosted link.
  const proceedToCheckout = async (planId) => {
    try {
      setBuyingPack(planId);
      localStorage.setItem('arCheckoutOrigin', window.location.pathname);
      const { link } = await billingService.checkout(planId, 'NGN');
      if (link) window.location.href = link;
      else setBuyingPack(null);
    } catch (error) {
      setBuyingPack(null);
      alert(error.response?.data?.message || t('billing.common.checkoutFailed'));
    }
  };

  const buyCredits = (planId) => {
    if (!hasSeenPaymentNotice()) {
      setPendingPlanId(planId);
      setShowTrustModal(true);
      return;
    }
    proceedToCheckout(planId);
  };

  const confirmTrustModal = () => {
    markPaymentNoticeSeen();
    setShowTrustModal(false);
    const planId = pendingPlanId;
    setPendingPlanId(null);
    if (planId) proceedToCheckout(planId);
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

  // NATIVE ANDROID ONLY. The credit grant lands via AdMob SSV — no client-side
  // /watch-ad call. Pull the fresh balance and ad stats from the server. Web has
  // no ads (the AdPlayer never mounts there), so this only runs on native.
  const handleAdSuccess = async () => {
    try {
      const [bal, stats] = await Promise.all([
        billingService.getBalance().catch(() => null),
        billingService.getAdStats().catch(() => null),
      ]);
      if (bal?.credits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: bal.credits }));
      }
      if (stats) setAdStats(stats);
      // The AdPlayer's own completion modal already shows the thank-you +
      // credits-awarded message, so we don't fire any extra celebration overlay.
      setShowAdPlayer(false);
    } catch (error) {
      console.error('Ad reward failed:', error);
      setShowAdPlayer(false);
    }
  };

  const getStoredUserId = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const resolved = stored?._id || stored?.id || null;
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

  // Pre-check the per-user AdMob cooldown before opening the ad, so the user
  // never watches one the server would reject (native Android only — web has no
  // ads and never reaches this card).
  const handleWatchClick = async () => {
    try {
      const stats = await billingService.getAdStats();
      if (stats?.cooldownRemainingMs > 0) {
        alert(
          t('billing.creditStore.adCooldown', { n: Math.ceil(stats.cooldownRemainingMs / 1000) })
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
        title={t('common.back')}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 pt-14 sm:pt-2">
          <div className="inline-flex items-center justify-center p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <AriaOrbit size={28} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('billing.creditStore.title')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('billing.creditStore.subtitle')}
          </p>
        </div>

        {/* ── Balance hero ──────────────────────────────────────────────
            Anchors the page: how many credits you have + your current plan
            and live-interview minutes, all in one glance. */}
        {entitlement && (
          <div className="rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl">
            {/* Top row: plan badge + manage/upgrade action, now separate from the stats */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur">
                {isPaid ? (
                  <>
                    <AriaOrbit size={16} tone="mono" />
                    <span className="capitalize">
                      {t('billing.creditStore.planLabel', {
                        plan: entitlement.planId || entitlement.tier,
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <AriaOrbit size={16} tone="mono" />
                    <span>{t('nav.account.freePlan')}</span>
                  </>
                )}
              </div>
              <button
                onClick={() => navigate('/upgrade')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100 transition-colors"
              >
                {isPaid
                  ? t('billing.creditStore.managePlan')
                  : t('billing.creditStore.seeAllPlans')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Two equal-weight stats: credits and interview minutes */}
            <div className="grid grid-cols-2 gap-6 sm:gap-10">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  {t('billing.creditStore.yourCredits')}
                </p>
                <p className="font-heading text-4xl sm:text-5xl font-black leading-tight tabular-nums mt-1">
                  {availableCredits}
                </p>
                {isPaid && (entitlement.planCredits ?? 0) >= 0 && (
                  <p className="text-sm text-slate-400 mt-1">
                    {t('billing.creditStore.fromPlanWallet', {
                      plan: entitlement.planCredits ?? 0,
                      wallet: entitlement.walletCredits ?? 0,
                    })}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  {t('billing.creditStore.minutesEyebrow')}
                </p>
                <p className="font-heading text-4xl sm:text-5xl font-black leading-tight tabular-nums mt-1">
                  {isPaid
                    ? entitlement.minutesRemaining
                    : Math.ceil((entitlement.freeTasteRemainingSec || 0) / 60)}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {isPaid && entitlement.expiresAt
                    ? t('billing.creditStore.untilDate', {
                        date: new Date(entitlement.expiresAt).toLocaleDateString(),
                      })
                    : !isPaid
                      ? t('billing.creditStore.freeTasteLabel')
                      : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ ZONE 2 — Top up instantly ═══════════════════════════════ */}
        <section>
          <SectionHeading
            eyebrow={t('billing.common.oneTimePurchase')}
            title={t('billing.creditStore.topUpTitle')}
            subtitle={t('billing.creditStore.topUpSubtitle')}
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
                    ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/50'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                {p.best && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    {t('billing.common.bestValue')}
                  </span>
                )}
                <div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {p.credits}{' '}
                    <span className="text-base font-semibold">
                      {t('billing.common.creditsUnit')}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('billing.creditStore.perCreditNgn', { n: (p.ngn / p.credits).toFixed(1) })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
                  {buyingPack === p.id
                    ? t('billing.common.starting')
                    : `₦${p.ngn.toLocaleString()}`}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ══ ZONE 2b — Top up interview minutes ═══════════════════════ */}
        <section>
          <SectionHeading
            eyebrow={t('billing.upgrade.minutesEyebrow')}
            title={t('billing.upgrade.outOfMinutesTitle')}
            subtitle={t('billing.upgrade.minutesSubtitle')}
          />
          {isPaid ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {TOPUPS.map((p) => {
                const best = p.id === 'topup_15';
                const perMin = t('billing.upgrade.perMinNgn', {
                  n: Math.round(p.priceNgn / p.minutes).toLocaleString(),
                });
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => buyCredits(p.id)}
                    disabled={!!buyingPack}
                    className={`relative flex items-center justify-between rounded-2xl border p-5 text-left transition-colors disabled:opacity-60 ${
                      best
                        ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/50'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    {best && (
                      <span className="absolute -top-2.5 left-5 rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                        {t('billing.common.bestValue')}
                      </span>
                    )}
                    <div>
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                        {p.minutes}{' '}
                        <span className="text-base font-semibold">
                          {t('billing.upgrade.minUnit')}
                        </span>
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{perMin}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
                      {buyingPack === p.id ? t('billing.common.starting') : formatNgn(p.priceNgn)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-slate-900 dark:text-slate-100" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('billing.creditStore.topUpMinutesLockedTitle')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t('billing.creditStore.topUpMinutesLockedBody', { n: FREE_TASTE_MIN })}
                </p>
              </div>
              <button
                onClick={() => navigate('/upgrade')}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                {t('billing.creditStore.topUpMinutesLockedCta')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 max-w-lg mx-auto leading-relaxed">
          <Trans
            i18nKey="billing.common.paymentTrustNote"
            components={{
              mail: (
                <a
                  href="mailto:careers@applyright.com.ng"
                  className="underline hover:no-underline"
                />
              ),
            }}
          />
        </p>

        {/* ══ ZONE 1 — Earn free credits ══════════════════════════════ */}
        <section>
          <SectionHeading
            eyebrow={t('billing.creditStore.earnEyebrow')}
            title={t('billing.creditStore.earnTitle')}
            subtitle={t('billing.creditStore.earnSubtitle')}
          />
          <div className="grid md:grid-cols-2 gap-6">
            {/* Watch ad — NATIVE ANDROID ONLY. Web has no ads; the earn-credits
                surface on web is "Invite friends" + the paid top-up zones below. */}
            {isAndroidNative() && (
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 dark:bg-slate-800/40 rounded-full blur-3xl -mr-12 -mt-12 opacity-60" />
                <div className="relative z-10 p-5 sm:p-7 flex flex-col flex-1">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md">
                      <Play className="w-6 h-6 ml-0.5 fill-white" />
                    </div>
                    {adStats.streak > 0 && (
                      <div className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                        🔥 {t('billing.creditStore.streakDays', { n: adStats.streak })}
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-5">
                    {t('billing.creditStore.watchTitle')}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    <Trans
                      i18nKey="billing.creditStore.watchBody"
                      values={{ n: platformReward }}
                      components={{
                        b: <span className="font-bold text-slate-900 dark:text-slate-100" />,
                      }}
                    />
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-green-500" />{' '}
                      {t('billing.creditStore.instantReward')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-green-500" />{' '}
                      {t('billing.creditStore.unlimitedDaily')}
                    </span>
                  </div>

                  <button onClick={handleWatchClick} className="mt-auto pt-6 w-full">
                    <span className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-md">
                      <Zap className="w-5 h-5 fill-white" />
                      {t('billing.creditStore.watchCta', { n: platformReward })}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Invite friends */}
            <div
              className={`relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow flex flex-col ${!isAndroidNative() ? 'md:col-span-2' : ''}`}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 dark:bg-slate-800/40 rounded-full blur-3xl -mr-12 -mt-12 opacity-60" />
              <div className="relative z-10 p-5 sm:p-7 flex flex-col flex-1">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100">
                  <Share2 className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-5">
                  {t('billing.creditStore.inviteTitle')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  <Trans
                    i18nKey="billing.creditStore.inviteBody"
                    values={{ n: referralBonus }}
                    components={{
                      b: <span className="font-bold text-slate-900 dark:text-slate-100" />,
                    }}
                  />
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-sm text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-500" />{' '}
                    {t('billing.creditStore.noLimitInvites')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-500" />{' '}
                    {t('billing.creditStore.creditsNeverExpire')}
                  </span>
                </div>

                <button onClick={() => setShowInviteModal(true)} className="mt-auto pt-6 w-full">
                  <span className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors">
                    <Share2 className="w-5 h-5" />
                    {t('billing.creditStore.getInviteLink')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Info Footer */}
        <div className="text-center pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            <Trans
              i18nKey="billing.creditStore.support"
              components={{
                mail: (
                  <a
                    href="mailto:careers@applyright.com.ng"
                    className="underline hover:no-underline"
                  />
                ),
              }}
            />
          </p>
        </div>
      </div>

      {/* Ad Player Modal — NATIVE ANDROID ONLY (web has no ads). */}
      {showAdPlayer && isAndroidNative() && (
        <AdPlayer
          userId={getStoredUserId()}
          onComplete={handleAdSuccess}
          onClose={() => setShowAdPlayer(false)}
        />
      )}

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
                    {t('billing.creditStore.inviteModalTitle')}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mt-2">
                    <Trans
                      i18nKey="billing.creditStore.inviteModalBody"
                      values={{ n: referralBonus }}
                      components={{ b: <b />, em: <span className="text-green-600 font-bold" /> }}
                    />
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Referral Code */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      {t('billing.creditStore.yourReferralCode')}
                    </label>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="font-mono text-xl font-bold text-slate-800 dark:text-slate-200 tracking-wider">
                        {loadingCode
                          ? t('billing.creditStore.codeLoadingUpper')
                          : referralCode || t('billing.creditStore.codeError')}
                      </div>
                      <button
                        onClick={handleCopyCode}
                        disabled={loadingCode || !referralCode}
                        className={`${copySuccess === 'Copied!' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'} px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {copySuccess === 'Copied!'
                          ? t('billing.creditStore.copied')
                          : t('billing.creditStore.copy')}
                      </button>
                    </div>
                  </div>

                  {/* Share Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      {t('billing.creditStore.orShareLink')}
                    </label>
                    <button
                      onClick={handleCopyLink}
                      disabled={loadingCode || !referralCode}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate">
                        {loadingCode
                          ? t('billing.creditStore.linkLoading')
                          : `${window.location.origin}/register?ref=${referralCode}`}
                      </div>
                      <div
                        className={`${copySuccess === 'Link Copied!' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white'} px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap`}
                      >
                        {copySuccess === 'Link Copied!'
                          ? t('billing.creditStore.linkCopied')
                          : t('billing.creditStore.copyLink')}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {t('billing.creditStore.creditsValidNote')}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentTrustModal
        open={showTrustModal}
        onConfirm={confirmTrustModal}
        onClose={() => setShowTrustModal(false)}
      />
    </div>
  );
};

export default CreditStore;
