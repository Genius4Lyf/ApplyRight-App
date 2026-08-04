const PLAN_LABELS = {
  weekly_pro: '2-Week Pro',
  monthly_pro: 'Monthly Pro',
  monthly_premium: 'Premium',
};

export const planLabelFor = (ent) =>
  ent?.planId ? PLAN_LABELS[ent.planId] || ent.planId : ent?.tier === 'pro' ? 'Premium' : 'Pro';
