import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Sparkles, ArrowLeft, Clock, Zap, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import billingService from '../services/billing.service';
import { TIERS, AGENT_TIERS, TOPUPS, FREE_TASTE_MIN, formatNgn, formatUsd } from '../lib/plans';
import { toast } from 'sonner';

const Upgrade = () => {
  const navigate = useNavigate();
  const [entitlement, setEntitlement] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [currency, setCurrency] = useState('NGN');
  // Default the pricing audience to the user's account type: CV agents see the
  // agent plans first; everyone else sees the interview/job-seeker tiers.
  const isAgentAccount = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').role === 'agent';
    } catch {
      return false;
    }
  })();
  const [audience, setAudience] = useState(isAgentAccount ? 'agent' : 'seeker'); // 'seeker' | 'agent'

  const activeTiers = audience === 'agent' ? AGENT_TIERS : TIERS;

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
                ? 'Create CVs for clients — unlimited'
                : 'Practice with a real AI interviewer'}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              {audience === 'agent' ? (
                <>
                  Unlimited CV tailoring, cover letters and <strong>unlimited downloads</strong> —
                  built for CV writers and agencies. No interview minutes.
                </>
              ) : (
                <>
                  Every plan includes <strong>unlimited</strong> CV tailoring, cover letters and
                  written prep. The live voice interview minutes are what make you ready.
                </>
              )}
            </p>
          </div>

          {/* Audience toggle: job seekers vs CV agents */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full flex gap-1 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
              <button
                type="button"
                onClick={() => setAudience('seeker')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 ${
                  audience === 'seeker'
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                For job seekers
              </button>
              <button
                type="button"
                onClick={() => setAudience('agent')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 inline-flex items-center gap-1.5 ${
                  audience === 'agent'
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <FileDown className="w-3.5 h-3.5" /> For CV agents
              </button>
            </div>
          </div>

          {entitlement && (
            <div className="text-center mb-8 text-xs sm:text-sm text-slate-400 dark:text-slate-500 tracking-wide">
              {entitlement.tier === 'free' ? (
                <span>
                  You’re on the Free plan —{' '}
                  {Math.ceil((entitlement.freeTasteRemainingSec || 0) / 60)} of your{' '}
                  {FREE_TASTE_MIN} free interview minutes left.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Crown className="w-4 h-4" /> Active: {entitlement.planId} ·{' '}
                  {entitlement.minutesRemaining} min left
                  {entitlement.expiresAt
                    ? ` · renews/expires ${new Date(entitlement.expiresAt).toLocaleDateString()}`
                    : ''}
                </span>
              )}
            </div>
          )}

          {/* Currency Switcher Tab */}
          <div className="flex justify-center mb-10">
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full flex gap-1 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
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

          {/* Tiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTiers.map((t) => {
              const isCurrent = currentPlanId === t.id;
              const priceLabel = currency === 'NGN' ? formatNgn(t.priceNgn) : formatUsd(t.priceUsd);
              return (
                <motion.div
                  key={t.id}
                  whileHover={{ y: -4 }}
                  className={`relative rounded-3xl p-8 flex flex-col border ${
                    t.highlight
                      ? 'bg-slate-900 text-white border-indigo-500/40 shadow-2xl'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                      <Sparkles className="w-3 h-3" /> {t.badge}
                    </span>
                  )}
                  <h3
                    className={`text-xl font-bold tracking-tight mb-1 ${
                      t.highlight ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {t.label}
                  </h3>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-extrabold">{priceLabel}</span>
                    <span
                      className={`pb-1 text-sm ${
                        t.highlight ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      /{t.period}
                    </span>
                  </div>
                  <p
                    className={`text-xs sm:text-sm mb-6 flex items-start gap-1.5 min-h-[40px] leading-relaxed ${
                      t.highlight ? 'text-indigo-200/90' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t.noMinutes ? (
                      <>
                        <FileDown className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{t.subtitle}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          {t.minutes} live min · {t.model}
                        </span>
                      </>
                    )}
                  </p>

                  <ul className="space-y-2.5 flex-1 mb-8">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            t.highlight ? 'text-indigo-300' : 'text-green-600 dark:text-green-400'
                          }`}
                          strokeWidth={3}
                        />
                        <span
                          className={`text-[13px] sm:text-sm leading-snug ${
                            t.highlight ? 'text-white/90' : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => startCheckout(t.id)}
                    disabled={isCurrent || loadingId === t.id}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                      t.highlight
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-slate-900 dark:bg-indigo-600 text-white hover:opacity-90'
                    }`}
                  >
                    {loadingId === t.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isCurrent ? (
                      <>
                        <Check className="w-5 h-5" /> Current plan
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 fill-white" /> Choose {t.label}
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>

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
                      className="rounded-xl p-4 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center shadow-sm"
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

          <p className="text-center text-xs text-slate-400 mt-10">
            One-time payment via Flutterwave. No auto-renewal — buy again when you need it.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Upgrade;
