// Display mirror of the backend catalog (applyright-backend/src/config/catalog.js).
// The server is always the source of truth for price/grant; this is only for
// rendering the pricing page. Keep prices/minutes in sync with the backend.
//
// i18n note: these are MODULE-LEVEL CONSTANTS, evaluated once at import time, so
// they must NOT hold translated (or literal English) copy — that would freeze at
// import-time language and never update on toggle. Every user-facing string is an
// i18n KEY (`*Key` fields); the components that render a tier (TierCard, and the
// inline reads in CreditStore/Upgrade/Pricing) call `t(key)` at render time.
// See src/i18n/locales/en.json → `billing.*`.

export const FREE_TASTE_MIN = 5;

// The Free plan card (job seekers only). ₦0; shown alongside the three paid
// tiers so visitors can see exactly what's gated. `id: 'free'` has no checkout —
// the pricing pages render its CTA as sign-up / "current plan".
export const FREE_TIER = {
  id: 'free',
  labelKey: 'billing.plans.free.label',
  taglineKey: 'billing.plans.free.tagline',
  priceNgn: 0,
  priceUsd: 0,
  period: 'forever',
  periodKey: 'billing.common.periods.forever',
  minutes: 5,
  model: 'free taste',
  featureKeys: [
    'billing.plans.free.features.0',
    'billing.plans.free.features.1',
    'billing.plans.free.features.2',
    'billing.plans.free.features.3',
    'billing.plans.free.features.4',
    'billing.plans.free.features.5',
    'billing.plans.free.features.6',
    'billing.plans.free.features.7',
    'billing.plans.free.features.8',
  ],
  // What the free plan does NOT include — rendered as greyed-out ✗ rows so
  // visitors can see exactly what upgrading unlocks.
  excludedKeys: [
    'billing.plans.free.excluded.0',
    'billing.plans.free.excluded.1',
    'billing.plans.free.excluded.2',
  ],
};

// Paid CV feature set shared by every paid tier (job seeker + agent). These all
// gate on isPaidActive in the backend, so they're identical across paid plans.
const PAID_CV_FEATURE_KEYS = [
  'billing.plans.paidCvFeatures.0',
  'billing.plans.paidCvFeatures.1',
  'billing.plans.paidCvFeatures.2',
  'billing.plans.paidCvFeatures.3',
  'billing.plans.paidCvFeatures.4',
  'billing.plans.paidCvFeatures.5',
  'billing.plans.paidCvFeatures.6',
];

export const TIERS = [
  {
    id: 'weekly_pro',
    labelKey: 'billing.plans.weeklyPro.label',
    taglineKey: 'billing.plans.weeklyPro.tagline',
    priceNgn: 3500,
    priceUsd: 4,
    period: '14 days',
    periodKey: 'billing.common.periods.day14',
    minutes: 15,
    credits: 150,
    model: 'Standard interviewer',
    // Spotlighted only in NGN — the cheap 2-week plan is the local sweet spot.
    featuredFor: 'NGN',
    badgeKey: 'billing.plans.weeklyPro.badge',
    featureKeys: [
      'billing.plans.weeklyPro.features.0',
      'billing.plans.weeklyPro.features.1',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.weeklyPro.features.2',
    ],
  },
  {
    id: 'monthly_pro',
    labelKey: 'billing.plans.monthlyPro.label',
    taglineKey: 'billing.plans.monthlyPro.tagline',
    priceNgn: 9500,
    priceUsd: 12,
    period: 'month',
    periodKey: 'billing.common.periods.month',
    minutes: 50,
    credits: 500,
    model: 'Standard interviewer',
    // Spotlighted only in USD — monthly is the better value for global users.
    featuredFor: 'USD',
    badgeKey: 'billing.plans.monthlyPro.badge',
    featureKeys: [
      'billing.plans.monthlyPro.features.0',
      'billing.plans.monthlyPro.features.1',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.monthlyPro.features.2',
    ],
  },
  {
    id: 'monthly_premium',
    labelKey: 'billing.plans.monthlyPremium.label',
    taglineKey: 'billing.plans.monthlyPremium.tagline',
    priceNgn: 15000,
    priceUsd: 20,
    period: 'month',
    periodKey: 'billing.common.periods.month',
    minutes: 45,
    credits: 1000,
    model: 'Sharpest interviewer (premium AI)',
    featureKeys: [
      'billing.plans.monthlyPremium.features.0',
      'billing.plans.monthlyPremium.features.1',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.monthlyPremium.features.2',
      'billing.plans.monthlyPremium.features.3',
    ],
  },
];

// CV Agent plans — shown when the pricing page is toggled to "CV agents". No
// interview minutes; built around a big CV-credit pool + unlimited downloads.
// (Dedicated agent signup/dashboard is a future build; see CV-AGENT-PLAN.md.)
export const AGENT_TIERS = [
  {
    id: 'agent_weekly',
    labelKey: 'billing.plans.agentWeekly.label',
    taglineKey: 'billing.plans.agentWeekly.tagline',
    priceNgn: 3500,
    priceUsd: 5,
    period: 'week',
    periodKey: 'billing.common.periods.week',
    noMinutes: true,
    credits: 250,
    subtitleKey: 'billing.plans.agentWeekly.subtitle',
    featureKeys: [
      'billing.plans.agentWeekly.features.0',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.agentWeekly.features.1',
    ],
  },
  {
    id: 'agent_monthly',
    labelKey: 'billing.plans.agentMonthly.label',
    taglineKey: 'billing.plans.agentMonthly.tagline',
    priceNgn: 10000,
    priceUsd: 14,
    period: 'month',
    periodKey: 'billing.common.periods.month',
    noMinutes: true,
    highlight: true,
    badgeKey: 'billing.plans.agentMonthly.badge',
    credits: 1200,
    subtitleKey: 'billing.plans.agentMonthly.subtitle',
    featureKeys: [
      'billing.plans.agentMonthly.features.0',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.agentMonthly.features.1',
    ],
  },
  {
    id: 'agent_yearly',
    labelKey: 'billing.plans.agentYearly.label',
    taglineKey: 'billing.plans.agentYearly.tagline',
    priceNgn: 100000,
    priceUsd: 140,
    period: 'year',
    periodKey: 'billing.common.periods.year',
    noMinutes: true,
    badgeKey: 'billing.plans.agentYearly.badge',
    credits: 18000,
    subtitleKey: 'billing.plans.agentYearly.subtitle',
    featureKeys: [
      'billing.plans.agentYearly.features.0',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.agentYearly.features.1',
    ],
  },
];

export const TOPUPS = [
  { id: 'topup_5', label: '5 min top-up', priceNgn: 1000, priceUsd: 1.5, minutes: 5 },
  { id: 'topup_15', label: '15 min top-up', priceNgn: 2500, priceUsd: 3.5, minutes: 15 },
  { id: 'topup_30', label: '30 min top-up', priceNgn: 4500, priceUsd: 6, minutes: 30 },
  { id: 'topup_60', label: '1 hr top-up', priceNgn: 8000, priceUsd: 10, minutes: 60 },
  { id: 'topup_120', label: '2 hr top-up', priceNgn: 15000, priceUsd: 19, minutes: 120 },
  { id: 'topup_300', label: '5 hr top-up', priceNgn: 34000, priceUsd: 42, minutes: 300, best: true },
];

// Credit packs — buyable any time; added to the persistent wallet (never reset).
// Must match the backend catalog (credits_500 / credits_1000).
export const CREDIT_PACKS = [
  { id: 'credits_500', label: '75 credits', priceNgn: 500, priceUsd: 0.75, credits: 75 },
  { id: 'credits_1000', label: '150 credits', priceNgn: 1000, priceUsd: 1.5, credits: 150 },
];

export const formatNgn = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
export const formatUsd = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Friendly duration label for a top-up card — plain minutes under an hour,
// "hr"/"hrs" at and above it. Takes `t` so it's a translated string like every
// other user-facing label in this file (see the i18n note at the top of the file).
export const formatMinutesLabel = (minutes, t) => {
  if (minutes < 60) return { value: minutes, unit: t('billing.upgrade.minUnit') };
  const hrs = minutes / 60;
  return {
    value: hrs,
    unit: t(hrs === 1 ? 'billing.upgrade.hourUnit' : 'billing.upgrade.hoursUnit'),
  };
};
