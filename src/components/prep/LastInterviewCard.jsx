import React from 'react';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import ScoringInfo from './ScoringInfo';

// How an interview went + a short, plain-English meaning. Works for both
// self-rated (guided) and AI-graded (conversational) sessions.
const STATUS = {
  needs_work: {
    label: 'Shaky',
    blurb: 'Below the bar — keep practising the fundamentals.',
    score: 'text-rose-600',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    box: 'border-rose-100 bg-rose-50/60',
  },
  almost: {
    label: 'Okay',
    blurb: 'Getting there — a few rough edges to sharpen.',
    score: 'text-amber-600',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    box: 'border-amber-100 bg-amber-50/60',
  },
  ready: {
    label: 'Strong',
    blurb: 'Sharp and specific — you sound interview-ready.',
    score: 'text-emerald-600',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    box: 'border-emerald-100 bg-emerald-50/60',
  },
};
const FALLBACK = {
  label: 'Done',
  blurb: 'Interview completed.',
  score: 'text-slate-600',
  text: 'text-slate-600',
  dot: 'bg-slate-400',
  box: 'border-slate-200 bg-slate-50',
};

const fmtWhen = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Recent interviews + how each went, so users can see their progress. The most
// recent is shown prominently with a plain-English read on the status; earlier
// ones are a compact list below. Driven by interviewHistory.
const LastInterviewCard = ({ session, history, trend, onStart }) => {
  const hist = Array.isArray(history) ? history : [];
  const rows = (
    hist.length
      ? hist
      : session && session.completedAt
        ? [
            {
              completedAt: session.completedAt,
              confidence: session.confidence,
              score: session.score,
            },
          ]
        : []
  )
    .slice()
    .reverse()
    .slice(0, 5);

  if (rows.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-xl border border-indigo-100/80 dark:border-indigo-500/30 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between h-full shadow-[0_8px_30px_-12px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_36px_-10px_rgba(79,70,229,0.45)] transition-all duration-300">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 w-44 h-44 rounded-full bg-gradient-to-br from-indigo-300/40 to-purple-300/30 blur-3xl"
        />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mt-1 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 ring-2 ring-indigo-100/70 flex items-center justify-center shadow-sm p-2">
              <img
                src="/applyright-icon.png"
                alt="ApplyRight AI"
                className="w-full h-full object-contain"
              />
            </div>
            <Sparkles className="w-4 h-4 text-indigo-500 absolute -top-1 -right-1 drop-shadow" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Interview with ApplyRight AI
          </h2>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-[17rem]">
            Get interview-ready before the real thing. Our AI runs a live mock for this role, asks
            the questions out loud, then grades how you did.
          </p>
        </div>
        <div className="relative z-10 mt-4 pt-3 border-t border-indigo-100/60 dark:border-indigo-500/30 flex justify-center">
          {/* NOTE: "Start your first interview" is planned to become a paid/premium
              service later — keep this entry point but gate it when that lands. */}
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer select-none"
          >
            Start your first interview <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    );
  }

  const latest = rows[0];
  const earlier = rows.slice(1);
  const st = STATUS[latest.confidence] || FALLBACK;
  const count = trend?.count || hist.length || rows.length;
  const nervesEasing = trend?.trend === 'up' && count >= 2;

  return (
    <section className="relative overflow-hidden rounded-xl border border-indigo-100/80 bg-white/70 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between h-full shadow-[0_8px_30px_-12px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_36px_-10px_rgba(79,70,229,0.45)] transition-all duration-300">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 w-44 h-44 rounded-full bg-gradient-to-br from-indigo-300/40 to-purple-300/30 blur-3xl"
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/30 ring-2 ring-indigo-100/70 flex items-center justify-center shrink-0 p-1.5">
            <img
              src="/applyright-icon.png"
              alt="ApplyRight AI"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Your interviews
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {count} {count === 1 ? 'session' : 'sessions'} · your progress
            </p>
          </div>
          {nervesEasing && (
            <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" /> Improving
            </span>
          )}
        </div>

        {/* Most recent — prominent, with a plain-English read on the status */}
        <div className={`mt-3 rounded-xl border p-3.5 ${st.box}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              {typeof latest.score === 'number' && (
                <span className={`text-2xl font-extrabold leading-none ${st.score}`}>
                  {latest.score}%
                </span>
              )}
              <span className={`text-sm font-bold ${st.text}`}>{st.label}</span>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
              Latest · {fmtWhen(latest.completedAt)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {st.blurb}
          </p>
          <div className="mt-2">
            <ScoringInfo />
          </div>
        </div>

        {/* Earlier interviews — compact progress trail */}
        {earlier.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">
              Earlier
            </p>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {earlier.map((r, i) => {
                const e = STATUS[r.confidence] || FALLBACK;
                return (
                  <li key={i} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.dot}`} />
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {fmtWhen(r.completedAt)}
                      </span>
                    </span>
                    <span className={`shrink-0 text-[11px] font-bold ${e.text}`}>
                      {typeof r.score === 'number' ? `${r.score}% · ` : ''}
                      {e.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-4 pt-3 border-t border-indigo-100/60 dark:border-indigo-500/30">
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer select-none"
        >
          Start a new interview <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};

export default LastInterviewCard;
