import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Briefcase, Mic, TrendingUp, Sparkles } from 'lucide-react';
import UserService from '../services/user.service';

/**
 * Activity & progress snapshot (Phase 3 of the Profile → Account Hub).
 *
 * Turns one-off actions into a sense of momentum: CVs built, jobs analyzed,
 * interviews practiced, plus a fit-score trend sparkline. All read-only, fed by
 * GET /users/me/stats (aggregated server-side from DraftCV + Application).
 */

// Inline SVG sparkline from [{ date, score }] points. No deps; scales scores to
// a fixed 0-100 domain so the line height reads as "fit %", not relative noise.
const Sparkline = ({ points }) => {
  const W = 240;
  const H = 48;
  const P = 4; // padding so end dots aren't clipped
  if (!points || points.length < 2) return null;

  const xs = points.map((_, i) => P + (i * (W - 2 * P)) / (points.length - 1));
  const ys = points.map((p) => {
    const v = Math.max(0, Math.min(100, p.score));
    return H - P - (v / 100) * (H - 2 * P);
  });
  const d = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(' ');
  const last = points.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-indigo-500 dark:text-indigo-400"
      />
      <circle cx={xs[last]} cy={ys[last]} r="3" className="fill-indigo-500 dark:fill-indigo-400" />
    </svg>
  );
};

const StatTile = ({ icon, value, label, accent }) => {
  const Icon = icon; // capitalized local so JSX/lint recognize it as a component
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 p-3">
      <div className={`flex items-center gap-1.5 ${accent || 'text-slate-400'}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{value}</span>
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
};

const ActivityCard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await UserService.getActivityStats();
        if (alive) setStats(data);
      } catch (err) {
        console.error('Failed to load activity stats', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm animate-pulse">
        <div className="h-5 w-32 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const {
    cvsCreated = 0,
    applicationsAnalyzed = 0,
    interviewsPracticed = 0,
    avgFitScore,
    bestFitScore,
    bestInterviewScore,
    fitTrend = [],
  } = stats;

  const nothingYet = cvsCreated === 0 && applicationsAnalyzed === 0 && interviewsPracticed === 0;

  if (nothingYet) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm text-center">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
          <TrendingUp className="w-5 h-5" />
        </div>
        <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-1">
          Your progress starts here
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Build a CV or run a job match to start tracking your momentum.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Get started
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
        <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">Your activity</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={FileText}
          value={cvsCreated}
          label="CVs created"
          accent="text-emerald-500"
        />
        <StatTile
          icon={Briefcase}
          value={applicationsAnalyzed}
          label="Jobs analyzed"
          accent="text-indigo-500"
        />
        <StatTile
          icon={Mic}
          value={interviewsPracticed}
          label="Interviews"
          accent="text-amber-500"
        />
      </div>

      {/* Fit-score trend — only meaningful with 2+ analyzed jobs. */}
      {fitTrend.length >= 2 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Match score trend
            </span>
            {typeof bestFitScore === 'number' && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Best {bestFitScore}%
              </span>
            )}
          </div>
          <Sparkline points={fitTrend} />
          {typeof avgFitScore === 'number' && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Average match {avgFitScore}% across {applicationsAnalyzed} jobs
            </div>
          )}
        </div>
      )}

      {/* Best interview score, when they've practiced. */}
      {typeof bestInterviewScore === 'number' && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-3 py-2.5">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            Best interview score
          </span>
          <span className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
            {bestInterviewScore}%
          </span>
        </div>
      )}
    </div>
  );
};

export default ActivityCard;
