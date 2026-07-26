import { Check, X, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaLoader from '../ui/AriaLoader';
import { formatNgn, formatUsd } from '../../lib/plans';

/**
 * A single pricing-plan card, shared by the authenticated /upgrade page and the
 * public /pricing page. The CTA behaviour is injected via `onCta`/`ctaLabel`
 * (checkout vs. sign-up), so this component stays presentation-only.
 *
 * Layout follows the "Good / Better / Best" reference design: a clean white
 * card (the highlighted plan stays white but gains an indigo ring + pill, not a
 * dark background), the CTA sits above the feature checklist, and excluded
 * features render as greyed-out ✗ rows. `h-full` lets the parent grid/flex row
 * stretch every card to equal height.
 */
const TierCard = ({
  tier,
  currency,
  current = false,
  loading = false,
  disabled = false,
  ctaLabel,
  onCta,
}) => {
  const { t } = useTranslation();
  const priceLabel = currency === 'NGN' ? formatNgn(tier.priceNgn) : formatUsd(tier.priceUsd);
  const isFree = !tier.priceNgn;
  const label = t(tier.labelKey);
  const taglineKey = tier.taglineKey || tier.subtitleKey;
  const tagline = taglineKey ? t(taglineKey) : '';
  const paySubline = isFree
    ? t('billing.tierCard.paySublineFree')
    : t('billing.tierCard.paySublinePaid');
  // The featured plan can depend on currency: NGN spotlights the cheap 2-week
  // plan ("Best for Nigeria"), USD spotlights the better-value monthly plan
  // ("Best worldwide"). `featuredFor` makes a tier currency-conditional; tiers
  // with a plain `highlight`/`badge` (e.g. agent plans) stay the same either way.
  const highlight = tier.featuredFor ? tier.featuredFor === currency : !!tier.highlight;
  const badgeKey = tier.featuredFor ? (highlight ? tier.badgeKey : null) : tier.badgeKey;
  const badge = badgeKey ? t(badgeKey) : null;

  return (
    <div
      className={`relative h-full w-full rounded-2xl p-7 flex flex-col bg-white dark:bg-slate-900 border transition-all duration-300 ease-out hover:-translate-y-1 ${
        highlight
          ? 'border-indigo-500 ring-1 ring-indigo-500/40 shadow-md lg:scale-[1.03] z-10'
          : 'border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3.5 py-1 bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-md whitespace-nowrap">
          {badge}
        </span>
      )}

      {/* Header: plan name + "PLAN" label */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {label}
        </h3>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 pt-1">
          {t('billing.tierCard.plan')}
        </span>
      </div>

      {/* Tagline — fixed min-height keeps the price/CTA aligned across cards */}
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed min-h-[40px]">
        {tagline}
      </p>

      {/* Price */}
      <div className="mt-4 flex items-end gap-1.5">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {priceLabel}
        </span>
        {!isFree && (
          <span className="pb-1.5 text-sm text-slate-400 dark:text-slate-500">/ {t(tier.periodKey)}</span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 min-h-[16px]">
        {!isFree && (
          <span className="capitalize">
            {t('billing.tierCard.perPeriod', { period: t(tier.periodKey) })}{' '}
          </span>
        )}
        {paySubline}
      </p>

      {/* CTA — sits above the checklist, like the reference */}
      <button
        onClick={onCta}
        disabled={current || loading || disabled}
        className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
          highlight
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        {loading ? (
          <AriaLoader inline tone="mono" size={16} label={t('billing.tierCard.startingCheckout')} />
        ) : current ? (
          <>
            <Check className="w-5 h-5" /> {t('billing.tierCard.currentPlan')}
          </>
        ) : (
          <>
            {ctaLabel || t('billing.common.choosePlan', { plan: label })}{' '}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Divider */}
      <div className="my-6 border-t border-slate-100 dark:border-slate-800" />

      {/* Features — included (✓) then excluded (✗) */}
      <ul className="space-y-3 flex-1">
        {tier.featureKeys.map((k) => (
          <li key={k} className="flex items-start gap-2.5">
            <Check
              className="w-4 h-4 shrink-0 mt-0.5 text-green-600 dark:text-green-400"
              strokeWidth={3}
            />
            <span className="text-[13px] sm:text-sm leading-snug text-slate-700 dark:text-slate-300">
              {t(k)}
            </span>
          </li>
        ))}
        {(tier.excludedKeys || []).map((k) => (
          <li key={k} className="flex items-start gap-2.5">
            <X
              className="w-4 h-4 shrink-0 mt-0.5 text-slate-300 dark:text-slate-600"
              strokeWidth={3}
            />
            <span className="text-[13px] sm:text-sm leading-snug text-slate-400 dark:text-slate-500">
              {t(k)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TierCard;
