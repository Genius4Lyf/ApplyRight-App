import React from 'react';
import { ArrowRight, Play, Sparkles } from 'lucide-react';

const CONF_LABEL = { needs_work: 'Felt shaky', almost: 'Felt okay', ready: 'Felt strong' };
const CONF_TONE = {
  needs_work: 'bg-rose-50 text-rose-700 border-rose-200',
  almost: 'bg-amber-50 text-amber-700 border-amber-200',
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const fmtWhen = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Compact summary of the user's most recent Interview Mode session, shown on the
// prep page so they can pick up where they left off.
const LastInterviewCard = ({ session, trend, onStart, onPracticeQuestion }) => {
  if (!session || !session.completedAt) {
    return (
      <section className="relative overflow-hidden rounded-xl border border-indigo-100/80 bg-white/70 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between h-full shadow-[0_8px_30px_-12px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_36px_-10px_rgba(79,70,229,0.45)] transition-all duration-300">
        {/* Ambient brand glow — bleeds through the frosted surface for a premium, lit-from-within feel */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 w-44 h-44 rounded-full bg-gradient-to-br from-indigo-300/40 to-purple-300/30 blur-3xl"
        />
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* ApplyRight AI mark — the empty state's focal point */}
          <div className="relative mt-1 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-indigo-100 ring-2 ring-indigo-100/70 flex items-center justify-center shadow-sm p-2">
              <img
                src="/applyright-icon.png"
                alt="ApplyRight AI"
                className="w-full h-full object-contain"
              />
            </div>
            <Sparkles className="w-4 h-4 text-indigo-500 absolute -top-1 -right-1 drop-shadow" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Interview with ApplyRight AI</h2>
          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-[17rem]">
            Get interview-ready before the real thing. Our AI runs a timed mock for this role, asks
            the questions out loud, then grades your answers and flags what to sharpen.
          </p>
        </div>
        <div className="relative z-10 mt-4 pt-3 border-t border-indigo-100/60 flex justify-center">
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

  const flagged = Array.isArray(session.flagged) ? session.flagged : [];
  const when = fmtWhen(session.completedAt);
  const mins = session.durationSec ? Math.max(1, Math.round(session.durationSec / 60)) : null;

  return (
    <section className="relative overflow-hidden rounded-xl border border-indigo-100/80 bg-white/70 backdrop-blur-md p-4 sm:p-5 flex flex-col justify-between h-full shadow-[0_8px_30px_-12px_rgba(79,70,229,0.35)] hover:shadow-[0_12px_36px_-10px_rgba(79,70,229,0.45)] transition-all duration-300">
      {/* Ambient brand glow — bleeds through the frosted surface for a premium, lit-from-within feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 w-44 h-44 rounded-full bg-gradient-to-br from-indigo-300/40 to-purple-300/30 blur-3xl"
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-indigo-100 ring-2 ring-indigo-100/70 flex items-center justify-center shrink-0 p-1.5">
              <img
                src="/applyright-icon.png"
                alt="ApplyRight AI"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">Last interview</h2>
              <p className="text-xs text-slate-500">
                {when}
                {mins ? ` · ${mins} min` : ''}
              </p>
              {trend && trend.count >= 2 && (
                <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                  {trend.count} interviews{trend.trend === 'up' ? ' · nerves easing' : ''}
                </p>
              )}
            </div>
          </div>
          {session.confidence && (
            <span
              className={`shrink-0 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${CONF_TONE[session.confidence] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
            >
              {CONF_LABEL[session.confidence] || session.confidence}
            </span>
          )}
        </div>

        {flagged.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
              You wanted to work on
            </p>
            <ul className="space-y-1.5">
              {flagged.map((f, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-slate-700 leading-relaxed">{f.question}</span>
                  {onPracticeQuestion && Number.isInteger(f.index) && (
                    <button
                      type="button"
                      onClick={() => onPracticeQuestion(f.index)}
                      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <Play className="w-3.5 h-3.5" /> Practice
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            No questions flagged — you felt good across the board.
          </p>
        )}
      </div>

      <div className="relative z-10 mt-4 pt-3 border-t border-indigo-100/60">
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
