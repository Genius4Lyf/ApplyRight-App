// Display mirror of the backend catalog (applyright-backend/src/config/catalog.js).
// The server is always the source of truth for price/grant; this is only for
// rendering the pricing page. Keep prices/minutes in sync with the backend.

export const FREE_TASTE_MIN = 5;

// The Free plan card (job seekers only). ₦0; shown alongside the three paid
// tiers so visitors can see exactly what's gated. `id: 'free'` has no checkout —
// the pricing pages render its CTA as sign-up / "current plan".
export const FREE_TIER = {
  id: 'free',
  label: 'Free',
  tagline: 'Build, share and prep — free forever.',
  priceNgn: 0,
  priceUsd: 0,
  period: 'forever',
  minutes: 5,
  model: 'free taste',
  features: [
    '5 live interview minutes (free taste)',
    'Free AI credits to start (earn more via referrals)',
    'Standard AI model (GPT-4o-mini) for CV writing',
    'Professional summary — 1 tone',
    'Up to 3 bullets per role',
    'Apply up to 3 AI suggestions',
    'Standard CV-vs-job-description analysis (AI suggestions)',
    'Basic templates only',
    'Clean CV downloads at ₦750 each',
  ],
  // What the free plan does NOT include — rendered as greyed-out ✗ rows so
  // visitors can see exactly what upgrading unlocks.
  excluded: [
    'Premium AI model (GPT-4o) for sharper CV writing',
    'ApplyRight ATS — recruiter-grade CV-vs-job analysis on our premium AI',
    'ATS Coach — live CV health & keyword score',
    'Unlimited bullets & every summary tone',
    'All premium templates',
  ],
};

// Paid CV feature set shared by every paid tier (job seeker + agent). These all
// gate on isPaidActive in the backend, so they're identical across paid plans.
const PAID_CV_FEATURES = [
  'Premium AI model (GPT-4o) — sharper CVs, bullets, summaries & cover letters',
  'ApplyRight ATS — recruiter-grade CV-vs-job-description analysis on our premium AI',
  'ATS Coach — live CV health & keyword score',
  'Unlimited bullets + apply all AI suggestions',
  'Every summary tone & all premium templates',
  'Clean, watermark-free unlimited downloads',
];

export const TIERS = [
  {
    id: 'weekly_pro',
    label: 'Starter Pack',
    tagline: 'Pay only the 2 weeks you’re interviewing.',
    priceNgn: 3500,
    priceUsd: 4,
    period: '14 days',
    minutes: 15,
    credits: 150,
    model: 'Standard interviewer',
    // Spotlighted only in NGN — the cheap 2-week plan is the local sweet spot.
    featuredFor: 'NGN',
    badge: 'Best for Nigeria',
    features: [
      '15 live interview minutes over 2 weeks',
      '150 AI credits for CVs, cover letters & prep',
      ...PAID_CV_FEATURES,
      'Pay only the 2 weeks you’re interviewing',
    ],
  },
  {
    id: 'monthly_pro',
    label: 'Level Up',
    tagline: 'More minutes and credits, every month.',
    priceNgn: 9500,
    priceUsd: 12,
    period: 'month',
    minutes: 50,
    credits: 500,
    model: 'Standard interviewer',
    // Spotlighted only in USD — monthly is the better value for global users.
    featuredFor: 'USD',
    badge: 'Best worldwide',
    features: [
      '50 live interview minutes / month',
      '500 AI credits / month',
      'Everything in Starter Pack',
    ],
  },
  {
    id: 'monthly_premium',
    label: 'Boss Tier',
    tagline: 'Our sharpest AI, plus the full kit.',
    priceNgn: 15000,
    priceUsd: 20,
    period: 'month',
    minutes: 45,
    credits: 1000,
    model: 'Sharpest interviewer (premium AI)',
    features: [
      '45 live minutes with our sharpest AI',
      '1,000 AI credits / month',
      'Everything in Level Up',
      'Full recordings & AI reports',
      'Priority support',
    ],
  },
];

// CV Agent plans — shown when the pricing page is toggled to "CV agents". No
// interview minutes; built around a big CV-credit pool + unlimited downloads.
// (Dedicated agent signup/dashboard is a future build; see CV-AGENT-PLAN.md.)
export const AGENT_TIERS = [
  {
    id: 'agent_weekly',
    label: 'Small Wins',
    tagline: 'Build for clients, pay by the week.',
    priceNgn: 3500,
    priceUsd: 5,
    period: 'week',
    noMinutes: true,
    credits: 250,
    subtitle: '250 CV credits · build for clients',
    features: [
      '250 AI credits for CV tailoring & cover letters',
      ...PAID_CV_FEATURES,
      'Pay only the week you’re busy',
    ],
  },
  {
    id: 'agent_monthly',
    label: 'Big Taker',
    tagline: 'Steady client work, all month long.',
    priceNgn: 10000,
    priceUsd: 14,
    period: 'month',
    noMinutes: true,
    highlight: true,
    badge: 'Most popular',
    credits: 1200,
    subtitle: '1,200 CV credits · build for clients',
    features: ['1,200 AI credits all month', ...PAID_CV_FEATURES, 'Best for steady client work'],
  },
  {
    id: 'agent_yearly',
    label: 'Odogwu',
    tagline: 'For full-time CV businesses.',
    priceNgn: 100000,
    priceUsd: 140,
    period: 'year',
    noMinutes: true,
    badge: 'Save ~17%',
    credits: 18000,
    subtitle: '18,000 CV credits · build for clients',
    features: [
      '18,000 AI credits / year (~17% off monthly)',
      ...PAID_CV_FEATURES,
      'For full-time CV businesses',
    ],
  },
];

export const TOPUPS = [
  { id: 'topup_5', label: '5 min top-up', priceNgn: 1000, priceUsd: 1.5, minutes: 5 },
  { id: 'topup_15', label: '15 min top-up', priceNgn: 2500, priceUsd: 3.5, minutes: 15 },
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
