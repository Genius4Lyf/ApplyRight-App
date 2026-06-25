import React, { useState, useEffect } from 'react';
import { Crown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const cardProps = (t) => {
    const isFreeCard = t.id === 'free';
    const onFree = entitlement?.tier === 'free';
    return {
      tier: t,
      currency,
      current: isFreeCard ? onFree : currentPlanId === t.id,
      disabled: isFreeCard && !onFree,
      loading: !isFreeCard && loadingId === t.id,
      ctaLabel: isFreeCard ? 'Free plan' : `Choose ${t.label}`,
      onCta: isFreeCard ? () => {} : () => startCheckout(t.id),
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
          ? 'Payments are temporarily unavailable. Please try again shortly.'
          : 'Could not start checkout. Please try again.'
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
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              {audience === 'agent'
                ? 'Create CVs for clients at scale'
                : 'Practice with a real AI interviewer'}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              {audience === 'agent' ? (
                <>
                  A generous pool of <strong>AI credits</strong> for CV tailoring and cover letters,
                  plus <strong>unlimited downloads</strong> — built for CV writers and agencies. No
                  interview minutes.
                </>
              ) : (
                <>
                  Every plan includes <strong>AI credits</strong> for CV tailoring, cover letters
                  and written prep, plus the live voice interview minutes that make you ready. Top
                  up credits any time.
                </>
              )}
            </p>
          </div>

          {entitlement && (
            <div className="text-center mb-8 text-xs sm:text-sm text-slate-400 dark:text-slate-500 tracking-wide">
              {entitlement.tier === 'free' ? (
                audience === 'agent' ? (
                  <span>You don’t have an active agent plan yet — pick one below.</span>
                ) : (
                  <span>
                    You’re on the Free plan —{' '}
                    {Math.ceil((entitlement.freeTasteRemainingSec || 0) / 60)} of your{' '}
                    {FREE_TASTE_MIN} free interview minutes left.
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Crown className="w-4 h-4" /> Active: {entitlement.planId} ·{' '}
                  {entitlement.availableCredits ?? 0} credits
                  {audience === 'agent' ? '' : ` · ${entitlement.minutesRemaining} min left`}
                  {entitlement.expiresAt
                    ? ` · expires ${new Date(entitlement.expiresAt).toLocaleDateString()}`
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
                <span>₦ NGN</span>
                <span className="opacity-60 font-normal">· Nigeria</span>
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
                <span>$ USD</span>
                <span className="opacity-60 font-normal">· Worldwide</span>
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 -mt-8 mb-10 font-medium tracking-wide">
            {currency === 'NGN'
              ? 'Showing Nigerian Naira (₦) — optimized for local cards'
              : 'Showing US Dollars ($) — detected/selected for global checkout'}
          </p>

          {/* Tiers — agents fit a 3-up grid; job seekers (4 cards) become a
              horizontal "peek" carousel so the next card hints you can scroll. */}
          {audience === 'agent' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch pt-3">
              {activeTiers.map((t) => (
                <TierCard key={t.id} {...cardProps(t)} />
              ))}
            </div>
          ) : (
            <div className="flex gap-6 items-stretch overflow-x-auto snap-x snap-mandatory pt-5 pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {activeTiers.map((t) => (
                <div key={t.id} className="snap-start shrink-0 w-[80%] sm:w-[46%] lg:w-[30%] flex">
                  <TierCard {...cardProps(t)} />
                </div>
              ))}
            </div>
          )}

          {/* Top-ups (interview minutes — job seekers only) */}
          {audience === 'seeker' && (
            <div className="mt-12 max-w-2xl mx-auto">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 text-center">
                Out of minutes?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mb-5 text-center">
                Add more live interview minutes any time. They use your current plan’s interviewer.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {TOPUPS.map((p) => {
                  const priceLabel =
                    currency === 'NGN' ? formatNgn(p.priceNgn) : formatUsd(p.priceUsd);
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center shadow-sm"
                    >
                      <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                        {p.label}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 my-1">
                        {priceLabel}
                      </span>
                      <button
                        onClick={() => startCheckout(p.id)}
                        disabled={loadingId === p.id}
                        className="mt-3 w-full py-2 rounded-lg font-semibold text-xs sm:text-sm bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-70"
                      >
                        {loadingId === p.id ? 'Loading…' : `Buy ${p.minutes} min`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Credit packs — top up AI credits any time (added to your wallet). */}
          <div className="mt-12 max-w-2xl mx-auto">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 text-center">
              Need more AI credits?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mb-5 text-center">
              Top up credits for CV tailoring, cover letters and written prep. Added to your wallet
              — they never expire.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {CREDIT_PACKS.map((p) => {
                const priceLabel =
                  currency === 'NGN' ? formatNgn(p.priceNgn) : formatUsd(p.priceUsd);
                return (
                  <div
                    key={p.id}
                    className="rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center shadow-sm"
                  >
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 my-1">
                      {p.credits} credits
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                      {priceLabel}
                    </span>
                    <button
                      onClick={() => startCheckout(p.id)}
                      disabled={loadingId === p.id}
                      className="mt-3 w-full py-2 rounded-lg font-semibold text-xs sm:text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-70"
                    >
                      {loadingId === p.id ? 'Loading…' : `Buy ${p.credits} credits`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-10">
            One-time payment via Flutterwave. No auto-renewal — buy again when you need it.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Upgrade;
