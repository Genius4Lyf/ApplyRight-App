// Display mirror of the backend catalog (applyright-backend/src/config/catalog.js).
// The server is always the source of truth for price/grant; this is only for
// rendering the pricing page. Keep prices/minutes in sync with the backend.

export const FREE_TASTE_MIN = 5;

export const TIERS = [
  {
    id: 'weekly_pro',
    label: 'Starter Pack',
    priceNgn: 3000,
    priceUsd: 4,
    period: 'week',
    minutes: 15,
    model: 'Standard interviewer',
    highlight: true,
    badge: 'Best for Nigeria',
    features: [
      '15 live interview minutes / week',
      'Unlimited CV tailoring & cover letters',
      'Unlimited written Q&A & STAR stories',
      'Pay only the week you’re interviewing',
    ],
  },
  {
    id: 'monthly_pro',
    label: 'Level Up',
    priceNgn: 9000,
    priceUsd: 12,
    period: 'month',
    minutes: 50,
    model: 'Standard interviewer',
    features: [
      '50 live interview minutes / month',
      'Everything in Starter Pack',
      'Unlimited text prep, all month',
    ],
  },
  {
    id: 'monthly_premium',
    label: 'Boss Tier',
    priceNgn: 15000,
    priceUsd: 20,
    period: 'month',
    minutes: 45,
    model: 'Sharpest interviewer (premium AI)',
    features: [
      '45 live minutes with our sharpest AI',
      'Everything in Level Up',
      'Full recordings & AI reports',
      'Priority support',
    ],
  },
];

// CV Agent plans — shown when the pricing page is toggled to "CV agents". No
// interview minutes; built around unlimited CV output + downloads. (Dedicated
// agent signup/dashboard is a future build; see CV-AGENT-PLAN.md.)
export const AGENT_TIERS = [
  {
    id: 'agent_weekly',
    label: 'Small Wins',
    priceNgn: 3500,
    priceUsd: 5,
    period: 'week',
    noMinutes: true,
    subtitle: 'Unlimited CVs · build for clients',
    features: [
      'Unlimited CV downloads',
      'Unlimited CV tailoring & cover letters',
      'Unlimited written prep',
      'Pay only the week you’re busy',
    ],
  },
  {
    id: 'agent_monthly',
    label: 'Big Taker',
    priceNgn: 10000,
    priceUsd: 14,
    period: 'month',
    noMinutes: true,
    highlight: true,
    badge: 'Most popular',
    subtitle: 'Unlimited CVs · build for clients',
    features: [
      'Everything in Small Wins',
      'Unlimited CVs all month',
      'Best for steady client work',
    ],
  },
  {
    id: 'agent_yearly',
    label: 'Odogwu',
    priceNgn: 100000,
    priceUsd: 140,
    period: 'year',
    noMinutes: true,
    badge: 'Save ~17%',
    subtitle: 'Unlimited CVs · build for clients',
    features: [
      'Everything in Big Taker',
      '~17% cheaper than monthly',
      'For full-time CV businesses',
    ],
  },
];

export const TOPUPS = [
  { id: 'topup_5', label: '5 min top-up', priceNgn: 1000, priceUsd: 1.5, minutes: 5 },
  { id: 'topup_15', label: '15 min top-up', priceNgn: 2500, priceUsd: 3.5, minutes: 15 },
];

export const formatNgn = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
export const formatUsd = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
