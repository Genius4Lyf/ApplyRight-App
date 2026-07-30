import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { FileDown } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import TierCard from '../components/pricing/TierCard';
import { TIERS, AGENT_TIERS, FREE_TIER, detectDefaultCurrency } from '../lib/plans';

// Public, logged-out pricing page. This is the ONE place that keeps the
// seeker/agent toggle — a visitor has no account yet, so they choose which
// pricing to view. Once signed in, /upgrade locks pricing to the account type.
const Pricing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [audience, setAudience] = useState('seeker'); // 'seeker' | 'agent'
  const [currency, setCurrency] = useState(() => detectDefaultCurrency());

  const isAuthed = !!localStorage.getItem('token');
  // Job seekers get a Free card alongside the paid tiers; agents must subscribe.
  const tiers = audience === 'agent' ? AGENT_TIERS : [FREE_TIER, ...TIERS];

  // Logged-out → sign up (agent flag carries the audience). Logged-in visitors
  // are sent to the in-app upgrade page, which picks pricing by their role.
  const choose = () => {
    if (isAuthed) {
      navigate('/upgrade');
    } else {
      navigate(audience === 'agent' ? '/register?as=agent' : '/register');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar />

      <main className="flex-grow pt-24 pb-12 sm:pt-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-6">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-500 mb-3">
              {t('billing.pricing.eyebrow')}
            </p>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-slate-900 leading-tight">
              {audience === 'agent'
                ? t('billing.common.agentHeading')
                : t('billing.pricing.headingSeeker')}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
              {audience === 'agent' ? (
                <Trans i18nKey="billing.common.agentSubcopy" components={{ strong: <strong /> }} />
              ) : (
                <Trans
                  i18nKey="billing.pricing.subcopySeeker"
                  components={{ strong: <strong /> }}
                />
              )}
            </p>
          </div>

          {/* Audience toggle — public page only */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 p-1 rounded-full flex gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setAudience('seeker')}
                className={`px-5 py-2.5 text-sm min-h-[40px] font-semibold rounded-full transition-all duration-300 ${
                  audience === 'seeker'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('billing.pricing.forJobSeekers')}
              </button>
              <button
                type="button"
                onClick={() => setAudience('agent')}
                className={`px-5 py-2.5 text-sm min-h-[40px] font-semibold rounded-full transition-all duration-300 inline-flex items-center gap-1.5 ${
                  audience === 'agent'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileDown className="w-3.5 h-3.5" /> {t('billing.pricing.forCvAgents')}
              </button>
            </div>
          </div>

          {/* Currency toggle */}
          <div className="flex justify-center mb-10">
            <div className="bg-slate-100 p-1 rounded-full flex gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrency('NGN')}
                className={`px-5 py-2.5 text-sm min-h-[40px] font-semibold rounded-full transition-all duration-300 flex items-center gap-1.5 ${
                  currency === 'NGN'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700'
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
                className={`px-5 py-2.5 text-sm min-h-[40px] font-semibold rounded-full transition-all duration-300 flex items-center gap-1.5 ${
                  currency === 'USD'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{t('billing.common.currencyUsd')}</span>
                <span className="opacity-60 font-normal">
                  {t('billing.common.currencyUsdRegion')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Tiers — agents fit a 3-up grid (centered); job seekers (4 cards) become
            a full-width horizontal "peek" carousel so the next card hints you can
            scroll and slides off the true screen edge. */}
        {audience === 'agent' ? (
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch pt-3">
              {tiers.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  currency={currency}
                  ctaLabel={t('billing.pricing.getStarted')}
                  onCta={choose}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="flex gap-6 items-stretch overflow-x-auto snap-x snap-mandatory pt-5 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              paddingInline: 'max(1rem, calc((100% - 72rem) / 2 + 1rem))',
              scrollPaddingInline: 'max(1rem, calc((100% - 72rem) / 2 + 1rem))',
            }}
          >
            {tiers.map((tier) => (
              <div key={tier.id} className="snap-start shrink-0 w-[80%] sm:w-[46%] lg:w-[30%] flex">
                <TierCard
                  tier={tier}
                  currency={currency}
                  ctaLabel={
                    tier.id === 'free' ? t('common.startFree') : t('billing.pricing.getStarted')
                  }
                  onCta={choose}
                />
              </div>
            ))}
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-xs text-slate-400 mt-10">
            {audience === 'agent'
              ? t('billing.pricing.footerNoteAgent')
              : t('billing.pricing.footerNoteSeeker')}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
