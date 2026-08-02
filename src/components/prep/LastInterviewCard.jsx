import React from 'react';
import { ArrowRight, Sparkles, TrendingUp, Sparkle, GraduationCap, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScoringInfo from './ScoringInfo';

// The interview start CTA. While the readiness gate is locked, show a disabled
// "locked" button that points to the readiness checklist (hosted in the Interview
// readiness card beside this one); once every prep task is done, swap in the live
// start button. `gate` is omitted (=> always unlocked) by callers that don't gate.
const StartCTA = ({ gate, onStart, label }) => {
  const { t } = useTranslation();
  if (gate && !gate.unlocked) {
    const remaining = gate.requiredCount - gate.doneCount;
    return (
      <div className="w-full">
        <button
          type="button"
          disabled
          title={t('interviewPrep.lastInterview.completeToUnlockTitle')}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold cursor-not-allowed select-none"
        >
          <Lock className="w-3.5 h-3.5" /> {t('interviewPrep.lastInterview.completeToUnlock')}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-slate-500 dark:text-slate-400">
          {t('interviewPrep.lastInterview.tasksLeft', { count: remaining })}
        </p>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onStart}
      className="btn-primary gap-1.5 px-4 py-2.5 rounded-lg text-xs cursor-pointer select-none"
    >
      {label} <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
};

// How an interview went + a short, plain-English meaning. Works for both
// self-rated (guided) and AI-graded (conversational) sessions.
// Figures and labels are ink — the band shows only as a 6px semantic dot.
const STATUS = {
  needs_work: {
    labelKey: 'interviewPrep.lastInterview.status.needs_work.label',
    blurbKey: 'interviewPrep.lastInterview.status.needs_work.blurb',
    dot: 'bg-rose-500',
  },
  almost: {
    labelKey: 'interviewPrep.lastInterview.status.almost.label',
    blurbKey: 'interviewPrep.lastInterview.status.almost.blurb',
    dot: 'bg-amber-500',
  },
  ready: {
    labelKey: 'interviewPrep.lastInterview.status.ready.label',
    blurbKey: 'interviewPrep.lastInterview.status.ready.blurb',
    dot: 'bg-emerald-500',
  },
};
const FALLBACK = {
  labelKey: 'interviewPrep.lastInterview.fallback.label',
  blurbKey: 'interviewPrep.lastInterview.fallback.blurb',
  dot: 'bg-slate-400 dark:bg-slate-500',
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
const LastInterviewCard = ({ session, history, trend, onStart, gate }) => {
  const { t } = useTranslation();
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
      <section className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-4 sm:p-5 flex flex-col justify-between h-full hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
        {/* Top-accent gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-200 dark:bg-slate-700" />

        {/* Tiny stars for dark mode */}
        <Sparkles className="hidden dark:block absolute top-4 right-5 w-4 h-4 text-slate-500/30 pointer-events-none" />
        <Sparkle className="hidden dark:block absolute bottom-12 left-6 w-3 h-3 text-slate-500/30 pointer-events-none" />

        {/* Education icon for light mode */}
        <GraduationCap className="block dark:hidden absolute top-4 right-5 w-10 h-10 text-slate-900/[0.06] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mt-2 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ring-2 ring-slate-100 dark:ring-slate-800 flex items-center justify-center shadow-sm p-2">
              <img
                src="/applyright-icon-black.png"
                alt="ApplyRight AI"
                className="h-full w-full object-contain dark:hidden"
              />
              <img
                src="/applyright-icon-white.png"
                alt=""
                aria-hidden="true"
                className="hidden h-full w-full object-contain dark:block"
              />
            </div>
            <Sparkles className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute -top-1 -right-1 drop-shadow" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('interviewPrep.lastInterview.aiTitle')}
          </h2>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-[17rem]">
            {t('interviewPrep.lastInterview.aiDesc')}
          </p>
        </div>
        <div className="relative z-10 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-center">
          {/* NOTE: "Start your first interview" is planned to become a paid/premium
              service later — keep this entry point but gate it when that lands. */}
          <StartCTA
            gate={gate}
            onStart={onStart}
            label={t('interviewPrep.lastInterview.startFirst')}
          />
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
    <section className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-4 sm:p-5 flex flex-col justify-between h-full hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
      {/* Top-accent gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-200 dark:bg-slate-700" />

      {/* Tiny stars for dark mode */}
      <Sparkles className="hidden dark:block absolute top-4 right-5 w-4 h-4 text-slate-500/30 pointer-events-none" />
      <Sparkle className="hidden dark:block absolute bottom-12 left-6 w-3 h-3 text-slate-500/30 pointer-events-none" />

      {/* Education icon for light mode */}
      <GraduationCap className="block dark:hidden absolute top-4 right-5 w-10 h-10 text-slate-900/[0.06] pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ring-2 ring-slate-100 dark:ring-slate-800 flex items-center justify-center shrink-0 p-1.5">
            <img
              src="/applyright-icon-black.png"
              alt="ApplyRight AI"
              className="h-full w-full object-contain dark:hidden"
            />
            <img
              src="/applyright-icon-white.png"
              alt=""
              aria-hidden="true"
              className="hidden h-full w-full object-contain dark:block"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('interviewPrep.lastInterview.yourInterviews')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('interviewPrep.lastInterview.sessions', { count })}
            </p>
          </div>

          {nervesEasing && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-slate-900 dark:text-slate-100">
              <TrendingUp className="w-3.5 h-3.5" /> {t('interviewPrep.lastInterview.improving')}
            </span>
          )}
        </div>

        {/* Most recent — prominent, with a plain-English read on the status */}
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              {typeof latest.score === 'number' && (
                <span className="font-heading text-2xl font-extrabold leading-none tabular-nums text-slate-900 dark:text-slate-100">
                  {latest.score}%
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                {t(st.labelKey)}
              </span>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
              {t('interviewPrep.lastInterview.latestWhen', { when: fmtWhen(latest.completedAt) })}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t(st.blurbKey)}
          </p>
          <div className="mt-2">
            <ScoringInfo />
          </div>
        </div>

        {/* Earlier interviews — compact progress trail */}
        {earlier.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">
              {t('interviewPrep.lastInterview.earlier')}
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
                    <span className="shrink-0 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {typeof r.score === 'number' ? (
                        <span className="font-heading tabular-nums text-slate-900 dark:text-slate-100">
                          {r.score}%{' · '}
                        </span>
                      ) : null}
                      {t(e.labelKey)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <StartCTA gate={gate} onStart={onStart} label={t('interviewPrep.lastInterview.startNew')} />
      </div>
    </section>
  );
};

export default LastInterviewCard;
