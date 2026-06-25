import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import TierCard from '../components/pricing/TierCard';
import { TIERS, AGENT_TIERS, FREE_TIER } from '../lib/plans';

// Public, logged-out pricing page. This is the ONE place that keeps the
// seeker/agent toggle — a visitor has no account yet, so they choose which
// pricing to view. Once signed in, /upgrade locks pricing to the account type.
const Pricing = () => {
  const navigate = useNavigate();
  const [audience, setAudience] = useState('seeker'); // 'seeker' | 'agent'
  const [currency, setCurrency] = useState('NGN');

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
      <Navbar />

      <main className="flex-grow py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {audience === 'agent'
                ? 'Create CVs for clients at scale'
                : 'Land more interviews, for less'}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
              {audience === 'agent' ? (
                <>
                  A generous pool of <strong>AI credits</strong> for CV tailoring and cover letters,
                  plus <strong>unlimited downloads</strong> — built for CV writers and agencies. No
                  interview minutes.
                </>
              ) : (
                <>
                  Every plan includes <strong>AI credits</strong> for CV tailoring, cover letters
                  and written prep, plus the live voice interview minutes that make you ready.
                </>
              )}
            </p>
          </div>

          {/* Audience toggle — public page only */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 p-1 rounded-full flex gap-1 border border-slate-200/50 shadow-inner">
              <button
                type="button"
                onClick={() => setAudience('seeker')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 ${
                  audience === 'seeker'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                For job seekers
              </button>
              <button
                type="button"
                onClick={() => setAudience('agent')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 inline-flex items-center gap-1.5 ${
                  audience === 'agent'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileDown className="w-3.5 h-3.5" /> For CV agents
              </button>
            </div>
          </div>

          {/* Currency toggle */}
          <div className="flex justify-center mb-10">
            <div className="bg-slate-100 p-1 rounded-full flex gap-1 border border-slate-200/50 shadow-inner">
              <button
                type="button"
                onClick={() => setCurrency('NGN')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 flex items-center gap-1.5 ${
                  currency === 'NGN'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
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
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>$ USD</span>
                <span className="opacity-60 font-normal">· Worldwide</span>
              </button>
            </div>
          </div>

          {/* Tiers — agents fit a 3-up grid; job seekers (4 cards) become a
              horizontal "peek" carousel so the next card hints you can scroll. */}
          {audience === 'agent' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch pt-3">
              {tiers.map((t) => (
                <TierCard
                  key={t.id}
                  tier={t}
                  currency={currency}
                  ctaLabel="Get started"
                  onCta={choose}
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-6 items-stretch overflow-x-auto snap-x snap-mandatory pt-5 pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tiers.map((t) => (
                <div key={t.id} className="snap-start shrink-0 w-[80%] sm:w-[46%] lg:w-[30%] flex">
                  <TierCard
                    tier={t}
                    currency={currency}
                    ctaLabel={t.id === 'free' ? 'Start free' : 'Get started'}
                    onCta={choose}
                  />
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-slate-400 mt-10">
            {audience === 'agent'
              ? 'Plus pay-as-you-go credit top-ups. One-time payment via Flutterwave — no auto-renewal.'
              : 'Plus credit top-ups and minute add-ons any time. One-time payment via Flutterwave — no auto-renewal.'}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
