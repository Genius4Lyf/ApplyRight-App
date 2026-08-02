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

// Paid CV feature set shared by every paid tier (job seeker + agent). Every line
// here must correspond to something the backend ACTUALLY gates on isPaidActive —
// premium templates (config/templates.js), downloads (consumeDownload), the
// scorecard gate, the three requireTier("plus") grading routes, and the free
// light-model chat in modelSelection.service. Model access itself is NOT a tier
// perk any more: every model is pickable by everyone and priced in credits.
const PAID_CV_FEATURE_KEYS = [
  'billing.plans.paidCvFeatures.0',
  'billing.plans.paidCvFeatures.1',
  'billing.plans.paidCvFeatures.2',
  'billing.plans.paidCvFeatures.3',
  'billing.plans.paidCvFeatures.4',
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
    minutes: 20,
    credits: 150,
    // Spotlighted only in NGN — the cheap 2-week plan is the local sweet spot.
    featuredFor: 'NGN',
    badgeKey: 'billing.plans.weeklyPro.badge',
    featureKeys: [
      'billing.plans.weeklyPro.features.0',
      'billing.plans.weeklyPro.features.1',
      'billing.plans.weeklyPro.features.2',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.weeklyPro.features.3',
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
    minutes: 60,
    credits: 500,
    // Spotlighted only in USD — monthly is the better value for global users.
    featuredFor: 'USD',
    badgeKey: 'billing.plans.monthlyPro.badge',
    featureKeys: [
      'billing.plans.monthlyPro.features.0',
      'billing.plans.monthlyPro.features.1',
      'billing.plans.monthlyPro.features.2',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.monthlyPro.features.3',
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
    minutes: 90,
    credits: 1000,
    featureKeys: [
      'billing.plans.monthlyPremium.features.0',
      'billing.plans.monthlyPremium.features.1',
      'billing.plans.monthlyPremium.features.2',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.monthlyPremium.features.3',
      'billing.plans.monthlyPremium.features.4',
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
    priceNgn: 15000,
    priceUsd: 20,
    period: 'month',
    periodKey: 'billing.common.periods.month',
    noMinutes: true,
    highlight: true,
    badgeKey: 'billing.plans.agentMonthly.badge',
    credits: 1500,
    subtitleKey: 'billing.plans.agentMonthly.subtitle',
    featureKeys: [
      'billing.plans.agentMonthly.features.0',
      ...PAID_CV_FEATURE_KEYS,
      'billing.plans.agentMonthly.features.1',
    ],
  },
];

// Live-interview minute packs. The ladder starts at 10 min because a real
// interview runs 10/20/30 minutes — anything shorter can't fund one. Price per
// minute descends strictly down the list (₦180 → ₦160 → ₦150 → ₦133 → ₦125 →
// ₦113), which is what makes `best` on the last row honest. CreditStore renders
// the duration via formatMinutesLabel and the price from these numbers, so no
// display label is needed (and a literal one would break the i18n rule above).
// Must match the backend catalog. topup_5/topup_15 are retired there.
export const TOPUPS = [
  { id: 'topup_10', priceNgn: 1800, priceUsd: 2.5, minutes: 10 },
  { id: 'topup_20', priceNgn: 3200, priceUsd: 4.5, minutes: 20 },
  { id: 'topup_30', priceNgn: 4500, priceUsd: 6, minutes: 30 },
  { id: 'topup_60', priceNgn: 8000, priceUsd: 10, minutes: 60 },
  { id: 'topup_120', priceNgn: 15000, priceUsd: 19, minutes: 120 },
  { id: 'topup_300', priceNgn: 34000, priceUsd: 42, minutes: 300, best: true },
];

// Credit packs — buyable any time; added to the persistent wallet (never reset).
// Must match the backend catalog (credits_500 / credits_1000).
export const CREDIT_PACKS = [
  { id: 'credits_500', priceNgn: 500, priceUsd: 0.75, credits: 75 },
  { id: 'credits_1000', priceNgn: 1000, priceUsd: 1.5, credits: 150 },
];

// One-off clean CV download (after the free first one). Must match the backend
// catalog (download_single).
export const DOWNLOAD_PASS = { id: 'download_single', priceNgn: 1000, priceUsd: 1.5 };

export const formatNgn = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
export const formatUsd = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Best-effort default currency for a first-time visitor: NGN only when the
// browser's timezone/locale looks Nigerian, USD for everyone else (worldwide
// pricing). This only seeds the toggle's initial state — the toggle itself is
// unchanged, so a wrong guess (e.g. Nigerian diaspora on a US timezone) is one
// tap to fix, never a dead end. Falls back to NGN on any detection failure,
// matching today's behavior.
export const detectDefaultCurrency = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Africa/Lagos') return 'NGN';
    const langs =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language].filter(Boolean);
    if (langs.some((l) => /-NG$/i.test(l))) return 'NGN';
    return 'USD';
  } catch {
    return 'NGN';
  }
};

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
