import React, { useState, useEffect } from 'react';
import { Crown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import Navbar from '../components/Navbar';
import TierCard from '../components/pricing/TierCard';
import PaymentTrustModal from '../components/PaymentTrustModal';
import { hasSeenPaymentNotice, markPaymentNoticeSeen } from '../lib/paymentTrust';
import billingService from '../services/billing.service';
import { TIERS, AGENT_TIERS, FREE_TIER, FREE_TASTE_MIN } from '../lib/plans';
import { toast } from 'sonner';

const Upgrade = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [entitlement, setEntitlement] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [currency, setCurrency] = useState('NGN');
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState(null);
  // Pricing is locked to the user's account type — CV agents see only agent
  // plans, job seekers see only job-seeker plans (no toggle). The seeker/agent
  // toggle belongs on the public pricing page, where the visitor has no account.
  const role = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').role;
    } catch {
      return undefined;
    }
  })();
  const audience = role === 'agent' ? 'agent' : 'seeker';
  // Job seekers see the Free card too (so they can see what's gated); agents don't.
  const activeTiers = audience === 'agent' ? AGENT_TIERS : [FREE_TIER, ...TIERS];

  // One card's props — shared by the agent grid and the job-seeker carousel.
  const cardProps = (tier) => {
    const isFreeCard = tier.id === 'free';
    const onFree = entitlement?.tier === 'free';
    return {
      tier,
      currency,
      current: isFreeCard ? onFree : currentPlanId === tier.id,
      disabled: isFreeCard && !onFree,
      loading: !isFreeCard && loadingId === tier.id,
      ctaLabel: isFreeCard
        ? t('nav.account.freePlan')
        : t('billing.common.choosePlan', { plan: t(tier.labelKey) }),
      onCta: isFreeCard ? () => {} : () => startCheckout(tier.id),
    };
  };

  useEffect(() => {
    billingService
      .getEntitlement()
      .then(setEntitlement)
      .catch(() => setEntitlement(null));
  }, []);

  const proceedToCheckout = async (planId) => {
    setLoadingId(planId);
    try {
      localStorage.setItem('arCheckoutOrigin', window.location.pathname);
      const { link } = await billingService.checkout(planId, currency);
      if (!link) throw new Error('No payment link');
      // Hand off to Flutterwave's hosted checkout.
      window.location.href = link;
    } catch (error) {
      console.error(error);
      const code = error?.response?.data?.code;
      toast.error(
        code === 'FLW_UNAVAILABLE'
          ? t('billing.upgrade.paymentsUnavailable')
          : t('billing.common.checkoutFailed')
      );
      setLoadingId(null);
    }
  };

  const startCheckout = (planId) => {
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

  const currentPlanId = entitlement?.tier !== 'free' ? entitlement?.planId : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-grow py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{t('common.back')}</span>
          </button>

          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              {audience === 'agent'
                ? t('billing.common.agentHeading')
                : t('billing.upgrade.headingSeeker')}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              {audience === 'agent' ? (
                <Trans i18nKey="billing.common.agentSubcopy" components={{ strong: <strong /> }} />
              ) : (
                <Trans
                  i18nKey="billing.upgrade.subcopySeeker"
                  components={{ strong: <strong /> }}
                />
              )}
            </p>
          </div>

          {entitlement && (
            <div className="text-center mb-8 text-xs sm:text-sm text-slate-400 dark:text-slate-500 tracking-wide">
              {entitlement.tier === 'free' ? (
                audience === 'agent' ? (
                  <span>{t('billing.upgrade.statusAgentNone')}</span>
                ) : (
                  <span>
                    {t('billing.upgrade.statusFreeSeeker', {
                      n: Math.ceil((entitlement.freeTasteRemainingSec || 0) / 60),
                      total: FREE_TASTE_MIN,
                    })}
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Crown className="w-4 h-4" />{' '}
                  {t('billing.upgrade.statusActive', {
                    plan: entitlement.planId,
                    n: entitlement.availableCredits ?? 0,
                  })}
                  {audience === 'agent'
                    ? ''
                    : ` ${t('billing.upgrade.statusMinLeft', { n: entitlement.minutesRemaining })}`}
                  {entitlement.expiresAt
                    ? ` ${t('billing.upgrade.statusExpires', {
                        date: new Date(entitlement.expiresAt).toLocaleDateString(),
                      })}`
                    : ''}
                </span>
              )}
            </div>
          )}

          {/* Currency Switcher Tab */}
          <div className="flex justify-center mb-10">
            <div className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-full flex gap-1 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
              <button
                type="button"
                onClick={() => setCurrency('NGN')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 flex items-center gap-1.5 ${
                  currency === 'NGN'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <span>{t('billing.common.currencyNgn')}</span>
                <span className="opacity-60 font-normal">
                  {t('billing.common.currencyNgnRegion')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 flex items-center gap-1.5 ${
                  currency === 'USD'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <span>{t('billing.common.currencyUsd')}</span>
                <span className="opacity-60 font-normal">
                  {t('billing.common.currencyUsdRegion')}
                </span>
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 -mt-8 mb-10 font-medium tracking-wide">
            {currency === 'NGN'
              ? t('billing.upgrade.currencyNoteNgn')
              : t('billing.upgrade.currencyNoteUsd')}
          </p>

          {/* Tiers — agents fit a 3-up grid; job seekers (4 cards) become a
              horizontal "peek" carousel so the next card hints you can scroll. */}
          {audience === 'agent' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch pt-3">
              {activeTiers.map((tier) => (
                <TierCard key={tier.id} {...cardProps(tier)} />
              ))}
            </div>
          ) : (
            <div className="flex gap-6 items-stretch overflow-x-auto snap-x snap-mandatory pt-5 pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {activeTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="snap-start shrink-0 w-[80%] sm:w-[46%] lg:w-[30%] flex"
                >
                  <TierCard {...cardProps(tier)} />
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 max-w-lg mx-auto leading-relaxed mt-4">
            <Trans
              i18nKey="billing.common.paymentTrustNote"
              components={{
                mail: (
                  <a href="mailto:careers@applyright.com.ng" className="underline hover:no-underline" />
                ),
              }}
            />
          </p>

          <p className="text-center text-xs text-slate-400 mt-10">
            {t('billing.upgrade.footerNote')}
          </p>
        </div>
      </main>

      <PaymentTrustModal
        open={showTrustModal}
        onConfirm={confirmTrustModal}
        onClose={() => setShowTrustModal(false)}
      />
    </div>
  );
};

export default Upgrade;
