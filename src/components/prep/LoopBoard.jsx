import React from 'react';
import { CheckCircle2, Play, RotateCcw, Trophy, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { initials } from '../../utils/avatar';
import { roundsBySeat, seatUnlocked } from '../../utils/interviewLoop';

// The interview LOOP board: the roster (HR + JD-derived roles) as rounds the user
// completes one by one, each a focused 1:1 with that interviewer. Shows per-round
// score + a combined readiness that builds as rounds are finished — the gamified
// "complete your interview loop" experience.

// Score figures read as ink; the band meaning rides on a single 6px semantic dot
// beside the muted label, so the board scans at a glance but stays black-and-white.
const READINESS = {
  needs_work: { labelKey: 'interviewPrep.loopBoard.readiness.needs_work', dot: 'bg-rose-500' },
  almost: { labelKey: 'interviewPrep.loopBoard.readiness.almost', dot: 'bg-amber-500' },
  ready: { labelKey: 'interviewPrep.loopBoard.readiness.ready', dot: 'bg-emerald-500' },
};

const Avatar = ({ name }) => (
  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-extrabold text-sm shrink-0 ring-2 ring-slate-200 dark:ring-slate-700">
    {initials(name)}
  </div>
);

const LoopBoard = ({ seats = [], rounds = [], onStart, locked = false, unlockAll = false }) => {
  const { t } = useTranslation();
  const valid = (Array.isArray(seats) ? seats : []).filter((s) => s && s.role);
  if (valid.length < 2) return null;

  const byIdx = roundsBySeat(rounds);
  const doneScores = valid
    .map((_, i) => byIdx[i])
    .filter((r) => r && typeof r.score === 'number')
    .map((r) => r.score);
  const doneCount = doneScores.length;
  const combined = doneCount ? Math.round(doneScores.reduce((a, b) => a + b, 0) / doneCount) : null;
  const allDone = doneCount >= valid.length;
  const pct = Math.round((doneCount / valid.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-slate-400 dark:text-slate-500" />{' '}
            {t('interviewPrep.loopBoard.heading')}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {allDone
              ? t('interviewPrep.loopBoard.loopComplete')
              : t('interviewPrep.loopBoard.roundsProgress', {
                  done: doneCount,
                  total: valid.length,
                })}
          </p>
        </div>
        {combined != null && (
          <div className="text-right shrink-0">
            <div className="font-heading text-xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100 leading-none">
              {combined}%
            </div>
            <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
              {t('interviewPrep.loopBoard.combined')}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {valid.map((seat, i) => {
          const r = byIdx[i];
          const done = r && typeof r.score === 'number';
          const band = done ? READINESS[r.readiness] : null;
          const unlocked = seatUnlocked(i, rounds, unlockAll);
          return (
            <div
              key={seat.seat ?? i}
              className={`flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-2.5 ${
                !unlocked ? 'opacity-60' : ''
              }`}
            >
              <div className="relative shrink-0">
                <Avatar name={seat.name} />
                {!unlocked && (
                  <div className="absolute inset-0 rounded-xl bg-slate-900/45 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {seat.name}
                  </p>
                  {done && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {seat.role}
                </p>
                {done ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                    <span className="font-heading font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {r.score}%
                    </span>
                    {band?.labelKey && (
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${band.dot}`} />
                        {t(band.labelKey)}
                      </span>
                    )}
                  </p>
                ) : null}
              </div>
              {!locked &&
                (unlocked ? (
                  <button
                    type="button"
                    onClick={() => onStart && onStart(i)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                      done
                        ? 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                    }`}
                  >
                    {done ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" /> {t('interviewPrep.loopBoard.redo')}
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> {t('interviewPrep.loopBoard.start')}
                      </>
                    )}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0">
                    <Lock className="w-3.5 h-3.5" /> {t('interviewPrep.loopBoard.locked')}
                  </span>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoopBoard;
