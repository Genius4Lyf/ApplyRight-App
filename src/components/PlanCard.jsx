import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Sparkles,
  Mic,
  Download,
  CalendarClock,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { billingService } from '../services';

/**
 * "My Plan" entitlements card (Phase 1 of the Profile → Account Hub).
 *
 * Single place a user can see everything they've paid for: active plan + expiry,
 * live-interview minutes, CV download passes, and spendable AI credits. Reads the
 * existing GET /billing/entitlement (no new endpoint) which already returns the
 * effective tier with lazy expiry applied, so an expired subscription correctly
 * reads as Free here.
 */

const TIER_BADGE = {
  pro: {
    label: 'PREMIUM',
    icon: Crown,
    classes: 'bg-amber-400/20 text-amber-300 border-amber-300/30',
  },
  plus: { label: 'PRO', icon: Crown, classes: 'bg-white/15 text-amber-300 border-white/15' },
};

// "2026-06-29T..." -> "29 Jun 2026"
const formatDate = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

// Whole days from now until `iso` (>= 0). Used for the "expires in N days" hint.
const daysUntil = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
};

const EntitlementRow = ({ icon, iconClasses, label, value, sub, cta, onCta }) => {
  // Assign to a capitalized local so JSX renders it as a component (and so the
  // lint rule recognizes the usage — it doesn't mark renamed destructured params).
  const Icon = icon;
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClasses}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</div>
        {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</div>
        {cta && (
          <button
            type="button"
            onClick={onCta}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
          >
            {cta}
          </button>
        )}
      </div>
    </div>
  );
};

const PlanCard = () => {
  const navigate = useNavigate();
  const [ent, setEnt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyingPass, setBuyingPass] = useState(false);

  // One-off ₦750 single-download pass via the Flutterwave hosted checkout — same
  // flow as DownloadPaywallModal. Redirects out; returns to /billing/return.
  const buyDownloadPass = async () => {
    setBuyingPass(true);
    try {
      const { link } = await billingService.checkout('download_single');
      if (!link) throw new Error('No checkout link');
      window.location.href = link;
    } catch (err) {
      console.error('Pass checkout failed', err);
      toast.error('Could not start checkout. Please try again.');
      setBuyingPass(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await billingService.getEntitlement();
        if (alive) setEnt(data);
      } catch (err) {
        console.error('Failed to load entitlement', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm animate-pulse">
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
    );
  }

  // Defensive defaults so the card still renders if the request failed.
  const tier = ent?.tier || 'free';
  const isPaid = tier !== 'free';
  const badge = TIER_BADGE[tier];
  const BadgeIcon = badge?.icon;

  const planName = isPaid ? ent?.planLabel || 'Active plan' : 'Free plan';
  const expiresAt = formatDate(ent?.expiresAt);
  const daysLeft = daysUntil(ent?.expiresAt);
  const expiringSoon = isPaid && daysLeft !== null && daysLeft <= 5;

  // Live interview minutes: paid users see their balance; free users see the
  // remaining one-time taste (freeTasteRemainingSec).
  const minutes = isPaid
    ? ent?.minutesRemaining || 0
    : Math.floor((ent?.freeTasteRemainingSec || 0) / 60);
  const minutesLabel = isPaid ? `${minutes} min` : minutes > 0 ? `${minutes} min free` : '0 min';

  // Downloads: paid = unlimited; otherwise show purchased single-download passes.
  const downloadsUnlimited = ent?.downloads?.unlimited;
  const passes = ent?.downloads?.passRemaining || 0;
  const downloadsLabel = downloadsUnlimited
    ? 'Unlimited'
    : `${passes} pass${passes === 1 ? '' : 'es'}`;

  // Credits: total spendable = plan allowance + persistent wallet.
  const credits = ent?.availableCredits ?? ent?.walletCredits ?? 0;
  const planCredits = ent?.planCredits || 0;
  const walletCredits = ent?.walletCredits || 0;
  const creditsSub =
    isPaid && planCredits > 0 ? `${planCredits} plan + ${walletCredits} wallet` : 'Top up any time';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header — plan identity + expiry */}
      <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">
              Your plan
            </span>
            {badge && (
              <span
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${badge.classes}`}
              >
                <BadgeIcon className="w-3 h-3" /> {badge.label}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight">{planName}</span>
          </div>

          {isPaid ? (
            expiresAt && (
              <div
                className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${
                  expiringSoon ? 'text-amber-200' : 'text-indigo-200'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                {daysLeft === 0
                  ? 'Expires today'
                  : `Expires ${expiresAt}${expiringSoon ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}`}
              </div>
            )
          ) : (
            <p className="text-xs text-indigo-200 mt-2">
              Upgrade to unlock interview minutes, unlimited downloads & more credits.
            </p>
          )}
        </div>
      </div>

      {/* Entitlement rows */}
      <div className="px-5 divide-y divide-slate-100 dark:divide-slate-800">
        <EntitlementRow
          icon={Sparkles}
          iconClasses="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
          label="AI credits"
          sub={creditsSub}
          value={credits}
          cta="Buy credits"
          onCta={() => navigate('/credits')}
        />
        <EntitlementRow
          icon={Mic}
          iconClasses="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
          label="Interview minutes"
          sub={isPaid ? 'Live voice mock interviews' : 'One-time free taste'}
          value={minutesLabel}
          cta={isPaid ? 'Add minutes' : null}
          onCta={() => navigate('/upgrade')}
        />
        <EntitlementRow
          icon={downloadsUnlimited ? ShieldCheck : Download}
          iconClasses="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          label="CV downloads"
          sub={downloadsUnlimited ? 'Included with your plan' : 'Clean PDF, no watermark'}
          value={downloadsLabel}
          cta={downloadsUnlimited ? null : buyingPass ? 'Starting…' : 'Buy a pass'}
          onCta={buyDownloadPass}
        />
      </div>

      {/* Primary CTA */}
      <div className="p-5 pt-3">
        <button
          type="button"
          onClick={() => navigate('/upgrade')}
          className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          {isPaid ? 'Manage plan' : 'Upgrade your plan'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PlanCard;
