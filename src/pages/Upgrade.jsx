import React, { useState, useEffect } from 'react';
import { Crown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import Navbar from '../components/Navbar';
import TierCard from '../components/pricing/TierCard';
import billingService from '../services/billing.service';
import {
  TIERS,
  AGENT_TIERS,
  FREE_TIER,
  TOPUPS,
  CREDIT_PACKS,
  FREE_TASTE_MIN,
  formatNgn,
  formatUsd,
} from '../lib/plans';
import { toast } from 'sonner';

const Upgrade = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [entitlement, setEntitlement] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [currency, setCurrency] = useState('NGN');
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

  const startCheckout = async (planId) => {
    setLoadingId(planId);
    try {
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
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md'
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
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md'
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

          {/* Top-ups (interview minutes — job seekers only) */}
          {audience === 'seeker' && (
            <div className="mt-14 max-w-2xl mx-auto">
              <div className="text-center mb-5">
                <p className="text-xs uppercase tracking-wider font-bold text-indigo-500 dark:text-indigo-400">
                  {t('billing.upgrade.minutesEyebrow')}
                </p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {t('billing.upgrade.outOfMinutesTitle')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
                  {t('billing.upgrade.minutesSubtitle')}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {TOPUPS.map((p) => {
                  const best = p.id === 'topup_15';
                  const priceLabel =
                    currency === 'NGN' ? formatNgn(p.priceNgn) : formatUsd(p.priceUsd);
                  const perMin =
                    currency === 'NGN'
                      ? t('billing.upgrade.perMinNgn', {
                          n: Math.round(p.priceNgn / p.minutes).toLocaleString(),
                        })
                      : t('billing.upgrade.perMinUsd', { n: (p.priceUsd / p.minutes).toFixed(2) });
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => startCheckout(p.id)}
                      disabled={loadingId === p.id}
                      className={`relative flex items-center justify-between rounded-2xl border p-5 text-left transition-colors disabled:opacity-60 ${
                        best
                          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500'
                      }`}
                    >
                      {best && (
                        <span className="absolute -top-2.5 left-5 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
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
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          {perMin}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">
                        {loadingId === p.id ? t('billing.common.starting') : priceLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Credit packs — top up AI credits any time (added to your wallet). */}
          <div className="mt-14 max-w-2xl mx-auto">
            <div className="text-center mb-5">
              <p className="text-xs uppercase tracking-wider font-bold text-indigo-500 dark:text-indigo-400">
                {t('billing.common.oneTimePurchase')}
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {t('billing.upgrade.moreCreditsTitle')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
                {t('billing.upgrade.creditsSubtitle')}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {CREDIT_PACKS.map((p) => {
                const best = p.id === 'credits_1000';
                const priceLabel =
                  currency === 'NGN' ? formatNgn(p.priceNgn) : formatUsd(p.priceUsd);
                const perCredit =
                  currency === 'NGN'
                    ? t('billing.upgrade.perCreditNgn', { n: (p.priceNgn / p.credits).toFixed(1) })
                    : t('billing.upgrade.perCreditUsd', { n: (p.priceUsd / p.credits).toFixed(2) });
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => startCheckout(p.id)}
                    disabled={loadingId === p.id}
                    className={`relative flex items-center justify-between rounded-2xl border p-5 text-left transition-colors disabled:opacity-60 ${
                      best
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                  >
                    {best && (
                      <span className="absolute -top-2.5 left-5 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
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
                        {perCredit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">
                      {loadingId === p.id ? t('billing.common.starting') : priceLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-10">
            {t('billing.upgrade.footerNote')}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Upgrade;
