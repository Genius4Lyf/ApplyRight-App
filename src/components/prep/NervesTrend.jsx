import React from 'react';
import { TrendingUp } from 'lucide-react';
import { getInterviewTrend } from '../../utils/interviewPrep';
import ScoringInfo from './ScoringInfo';

// Visualises how the user's self-rated nerves move across recent Interview Mode
// runs — the exposure-therapy selling point made tangible ("each rep gets
// easier"). Reads interviewPrep.interviewHistory; renders nothing until there's
// at least one run.
const RANK = { needs_work: 1, almost: 2, ready: 3 };
const COLOR = { needs_work: 'bg-rose-400', almost: 'bg-amber-400', ready: 'bg-emerald-500' };
const LABEL = { needs_work: 'Shaky', almost: 'Okay', ready: 'Strong' };

const NervesTrend = ({ application }) => {
  const history = Array.isArray(application?.interviewPrep?.interviewHistory)
    ? application.interviewPrep.interviewHistory
    : [];
  if (history.length === 0) return null;

  const trend = getInterviewTrend(application);
  const recent = history.slice(-8); // last 8 runs for the mini chart

  return (
    <section className="rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Your nerves over time
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
        Each bar is one interview (oldest left, newest right) — the{' '}
        <span className="font-semibold text-slate-600 dark:text-slate-300">taller and greener</span>
        , the more confidently you handled it.{' '}
        {trend.trend === 'up'
          ? 'Yours are trending stronger — exactly how nerves ease with practice.'
          : 'Each rep makes the real room feel more familiar.'}
      </p>
      <div className="flex items-end gap-2 h-20">
        {recent.map((h, i) => {
          const conf = h.confidence || 'needs_work';
          const pct = ((RANK[conf] || 1) / 3) * 100;
          return (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all ${COLOR[conf] || 'bg-slate-300'}`}
              style={{ height: `${pct}%` }}
              title={LABEL[conf]}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
        <span>Earlier</span>
        <span>Latest</span>
      </div>

      {/* Legend so the colours are self-explanatory */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          {['needs_work', 'almost', 'ready'].map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"
            >
              <span className={`w-2 h-2 rounded-full ${COLOR[c]}`} />
              {LABEL[c]}
            </span>
          ))}
        </div>
        <ScoringInfo />
      </div>
    </section>
  );
};

export default NervesTrend;
