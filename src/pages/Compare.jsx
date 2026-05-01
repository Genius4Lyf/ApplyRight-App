import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Briefcase, AlertTriangle, CheckCircle, Trophy, Minus } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';

/**
 * Side-by-side comparison of two analyses for the same role. Lets the user
 * see which CV scored better and which dimensions drove the difference.
 *
 * URL: /compare/:idA/:idB. Both ids must be applications the user owns.
 * Refuses to render if the two apps point to different jobs (apples-to-
 * oranges) — the user should pick two analyses for the same role.
 */
const formatRelativeDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const scoreColor = (s) => {
  if (typeof s !== 'number') return 'text-slate-400';
  if (s >= 80) return 'text-emerald-500';
  if (s >= 60) return 'text-amber-500';
  return 'text-red-500';
};

const scoreBg = (s) => {
  if (typeof s !== 'number') return 'bg-slate-50';
  if (s >= 80) return 'bg-emerald-50';
  if (s >= 60) return 'bg-amber-50';
  return 'bg-red-50';
};

// Win/loss/tie badge for a numeric dimension. Higher is better.
const winnerOn = (a, b) => {
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  if (Math.abs(a - b) < 1) return 'tie';
  return a > b ? 'A' : 'B';
};

const DimensionRow = ({ label, valueA, valueB, weight }) => {
  const winner = winnerOn(valueA, valueB);
  return (
    <div className="grid grid-cols-12 items-center gap-2 py-2.5 border-b border-slate-100 last:border-b-0 text-sm">
      <div className="col-span-4 text-slate-600">
        {label}
        {weight && <span className="text-xs text-slate-400 ml-1">({weight})</span>}
      </div>
      <div className={`col-span-4 text-right font-semibold ${scoreColor(valueA)}`}>
        {typeof valueA === 'number' ? `${valueA}/100` : '—'}
        {winner === 'A' && <Trophy className="inline w-3 h-3 ml-1 text-amber-500" />}
      </div>
      <div className={`col-span-4 text-right font-semibold ${scoreColor(valueB)}`}>
        {typeof valueB === 'number' ? `${valueB}/100` : '—'}
        {winner === 'B' && <Trophy className="inline w-3 h-3 ml-1 text-amber-500" />}
      </div>
    </div>
  );
};

const Compare = () => {
  const { idA, idB } = useParams();
  const navigate = useNavigate();
  const [appA, setAppA] = useState(null);
  const [appB, setAppB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const [resA, resB] = await Promise.all([
          api.get(`/applications/${idA}`),
          api.get(`/applications/${idB}`),
        ]);
        if (cancelled) return;
        setAppA(resA.data);
        setAppB(resB.data);
      } catch (e) {
        if (cancelled) return;
        setError(
          e.response?.status === 404
            ? "One of the applications wasn't found."
            : 'Failed to load comparison.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
  }, [idA, idB]);

  const sameJob =
    appA && appB && (appA.jobId?._id || appA.jobId) === (appB.jobId?._id || appB.jobId);

  const breakA = appA?.fitAnalysis?.scoreBreakdown || {};
  const breakB = appB?.fitAnalysis?.scoreBreakdown || {};
  const missingA = (appA?.fitAnalysis?.missingSkills || []).filter(
    (s) => s.importance === 'must_have'
  );
  const missingB = (appB?.fitAnalysis?.missingSkills || []).filter(
    (s) => s.importance === 'must_have'
  );

  const overallWinner = winnerOn(appA?.fitScore, appB?.fitScore);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 pt-8 pb-16">
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to applications
        </button>

        {loading && (
          <div className="text-center py-12 text-slate-400">Loading comparison…</div>
        )}

        {!loading && error && (
          <div className="bg-white border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-slate-700">{error}</p>
          </div>
        )}

        {!loading && !error && appA && appB && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Compare analyses</h1>
              {sameJob ? (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">
                    {appA.jobId?.title || appA.jobTitle || 'Role'}
                  </span>
                  <span className="text-slate-400">at</span>
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>{appA.jobId?.company || appA.jobCompany || 'Company'}</span>
                </p>
              ) : (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    These two applications are for different jobs. Comparison is most useful when both runs target the same role.
                  </span>
                </div>
              )}
            </div>

            {/* Headline winner banner */}
            {sameJob && overallWinner && overallWinner !== 'tie' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">
                    Resume {overallWinner === 'A' ? 'A' : 'B'} scored higher
                  </span>{' '}
                  ({overallWinner === 'A' ? appA.fitScore : appB.fitScore}% vs{' '}
                  {overallWinner === 'A' ? appB.fitScore : appA.fitScore}%) on this role.
                </p>
              </div>
            )}
            {sameJob && overallWinner === 'tie' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <Minus className="w-5 h-5 text-slate-400 shrink-0" />
                <p className="text-sm text-slate-700">
                  Both runs scored within 1 point of each other — effectively tied on overall fit.
                </p>
              </div>
            )}

            {/* Two-column compare grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { app: appA, label: 'A', other: appB },
                { app: appB, label: 'B', other: appA },
              ].map(({ app, label }) => (
                <div
                  key={label}
                  className={`bg-white rounded-xl border ${
                    overallWinner === label ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200'
                  } p-5 shadow-sm`}
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        Resume {label}
                      </span>
                      <p className="text-sm text-slate-700 mt-0.5">
                        Uploaded {formatRelativeDate(app.resumeId?.createdAt)}
                      </p>
                      <p className="text-xs text-slate-400">
                        Run {formatRelativeDate(app.createdAt)}
                      </p>
                    </div>
                    <div className={`text-3xl font-bold ${scoreColor(app.fitScore)} shrink-0`}>
                      {typeof app.fitScore === 'number' ? `${app.fitScore}%` : '—'}
                    </div>
                  </div>
                  {typeof app.optimizedFitScore === 'number' && app.optimizedFitScore > app.fitScore && (
                    <div className={`mt-2 px-3 py-1.5 rounded-lg ${scoreBg(app.optimizedFitScore)} text-xs flex items-center gap-2`}>
                      <CheckCircle className={`w-3.5 h-3.5 ${scoreColor(app.optimizedFitScore)}`} />
                      <span className="text-slate-600">
                        Optimized to{' '}
                        <span className={`font-semibold ${scoreColor(app.optimizedFitScore)}`}>
                          {app.optimizedFitScore}%
                        </span>
                      </span>
                    </div>
                  )}
                  <Link
                    to={`/history`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/history');
                      // Set a flag the JobHistory page could read to auto-open
                      // this app — left as future polish.
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Open this application <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>

            {/* Score breakdown side-by-side */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
              <h3 className="font-semibold text-slate-800 mb-3">Score breakdown</h3>
              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-slate-100 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                <div className="col-span-4">Dimension</div>
                <div className="col-span-4 text-right">Resume A</div>
                <div className="col-span-4 text-right">Resume B</div>
              </div>
              <DimensionRow label="Skills" weight="40%" valueA={breakA.skillsScore} valueB={breakB.skillsScore} />
              <DimensionRow label="Experience" weight="25%" valueA={breakA.experienceScore} valueB={breakB.experienceScore} />
              <DimensionRow label="Education" weight="15%" valueA={breakA.educationScore} valueB={breakB.educationScore} />
              <DimensionRow label="Seniority" weight="10%" valueA={breakA.seniorityScore} valueB={breakB.seniorityScore} />
              <DimensionRow label="Profile strength" weight="10%" valueA={breakA.overallScore} valueB={breakB.overallScore} />
            </div>

            {/* Missing must-have skills side-by-side */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
              <h3 className="font-semibold text-slate-800 mb-3">Critical gaps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                    Resume A — {missingA.length} missing
                  </p>
                  {missingA.length === 0 ? (
                    <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> All required skills matched.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {missingA.map((s, i) => (
                        <span
                          key={`a-${i}`}
                          className="text-xs px-2 py-1 rounded-md bg-red-50 border border-red-200 text-slate-700"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                    Resume B — {missingB.length} missing
                  </p>
                  {missingB.length === 0 ? (
                    <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> All required skills matched.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {missingB.map((s, i) => (
                        <span
                          key={`b-${i}`}
                          className="text-xs px-2 py-1 rounded-md bg-red-50 border border-red-200 text-slate-700"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Compare;
