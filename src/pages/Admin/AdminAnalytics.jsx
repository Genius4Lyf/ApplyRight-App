import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import DashboardStats from '../../components/Admin/DashboardStats';
import { Users, Activity, Clock, TrendingUp, UserCheck, UserX } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import { toast } from 'sonner';

// Friendly labels for the AI operations logged in AICallLog.
//
// This maps HISTORICAL log rows, so an entry outliving the code that wrote it is normal
// and must not be "cleaned up" — deleting one only makes old charts render a raw
// operation key. generateBulletPoints/generateAtsSuggestions are the retired two-column
// work-history picker, replaced by the Ask Aria build-with; generateSummaries is the
// retired multi-tone summary picker, replaced by Aria's in-chat summary.
const OP_LABELS = {
  extractJobRequirements: 'Job keyword extraction',
  generateBulletPoints: 'AI bullet points',
  generateAtsSuggestions: 'ATS suggestions',
  generateSummaries: 'Professional summaries',
  generateInterviewQuestions: 'Interview questions',
  generateStories: 'STAR stories',
  conversationTurn: 'Interview chat (text)',
  gradeAnswer: 'Answer grading',
  generateCoverLetter: 'Cover letters',
  coachMessage: 'ATS coach chat',
  extractResumeProfile: 'Resume profile extraction',
  enhanceCVContent: 'CV content enhancement',
  assessInterview: 'Interview scorecard',
  extractCandidateData: 'Candidate data extraction',
  generateEssentialAnswer: 'Essential answers',
  categorizeSkillsList: 'Skill categorization',
  factCheckInterviewQuestions: 'Interview fact-check',
  generateAnalysisFeedback: 'CV analysis feedback',
};
const opLabel = (op) => OP_LABELS[op] || op;

// ₦ formatter for the estimated AI-spend view.
const fmtNgn = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;

// Date formatter for the Build Guard card — null (never hit) reads as "—".
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-NG') : '—');

// Margin color bands for the Flagship Cost Check card — thin/negative margin should
// jump out, not require reading the number.
const marginColor = (pct) => {
  if (pct === null || pct === undefined) return 'text-slate-400';
  if (pct < 20) return 'text-rose-600';
  if (pct < 50) return 'text-amber-600';
  return 'text-emerald-600';
};

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await api.get('/admin/engagement', config);
        setData(data.data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <p className="text-center text-slate-500 py-12">No analytics data available.</p>
      </AdminLayout>
    );
  }

  const {
    activeUsers,
    activeOverTime,
    featureAdoption,
    liveUsage,
    funnel,
    subscriptions,
    aiTextCost,
    totalAiSpendNgn,
    flagshipCostCheck,
    retailNgnPerCredit,
    buildGuard,
  } = data;
  const maxCalls = Math.max(1, ...(featureAdoption || []).map((f) => f.calls));

  // Top ~8 operations by estimated cost, for the AI-spend bar chart.
  const aiSpendRows = aiTextCost?.byOperation || [];
  const aiSpendChart = aiSpendRows
    .slice(0, 8)
    .map((r) => ({ name: opLabel(r.operation), costNgn: r.costNgn }));
  const funnelSteps = [
    { label: 'Signed up', value: funnel.signups },
    { label: 'Created a CV', value: funnel.createdCv },
    { label: 'Created an application', value: funnel.createdApplication },
    { label: 'Paid (ever)', value: funnel.paid },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Engagement & Adoption</h1>
        <p className="text-slate-500">
          Active users, AI feature usage, live interviews and conversion.
        </p>
      </div>

      {/* Active users */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Active Users</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <DashboardStats
            title="Daily Active (24h)"
            value={activeUsers.dau}
            change="DAU"
            trend="up"
            icon={Activity}
          />
          <DashboardStats
            title="Weekly Active (7d)"
            value={activeUsers.wau}
            change="WAU"
            trend="up"
            icon={Users}
          />
          <DashboardStats
            title="Monthly Active (30d)"
            value={activeUsers.mau}
            change="MAU"
            trend="up"
            icon={UserCheck}
          />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Active users / day (last 14 days)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={activeOverTime}>
              <defs>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" fontSize={11} tickFormatter={(v) => v.slice(5)} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#6366f1"
                fill="url(#colorActive)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          {activeOverTime.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">
              No logins recorded yet — data builds up as users sign in.
            </p>
          )}
        </div>
      </section>

      {/* Live interview usage */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Live Interview Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <DashboardStats
            title="Sessions (all-time)"
            value={liveUsage.sessions}
            change={`${liveUsage.distinctUsers} users`}
            trend="up"
            icon={Clock}
          />
          <DashboardStats
            title="Total Minutes"
            value={liveUsage.totalMinutes}
            change={`avg ${liveUsage.avgMinutes}m/session`}
            trend="up"
            icon={Activity}
          />
          <DashboardStats
            title="Pro Minutes"
            value={liveUsage.proMinutes}
            change="full model"
            trend="up"
            icon={TrendingUp}
          />
          <DashboardStats
            title="Plus/Mini Minutes"
            value={liveUsage.miniMinutes}
            change="mini model"
            trend="up"
            icon={TrendingUp}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Feature adoption */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-1">AI Feature Adoption</h3>
          <p className="text-xs text-slate-500 mb-5">Calls & distinct users in the last 30 days.</p>
          <div className="space-y-4">
            {featureAdoption && featureAdoption.length > 0 ? (
              featureAdoption.map((f) => (
                <div key={f.operation}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{opLabel(f.operation)}</span>
                    <span className="text-slate-500">
                      {f.calls} calls · {f.users} users
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(f.calls / maxCalls) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 text-sm py-4">
                No AI usage in the last 30 days.
              </p>
            )}
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Conversion Funnel</h3>
          <p className="text-xs text-slate-500 mb-5">Share of all users reaching each step.</p>
          <div className="space-y-4">
            {funnelSteps.map((step) => {
              const pct = funnel.signups ? Math.round((step.value / funnel.signups) * 100) : 0;
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{step.label}</span>
                    <span className="text-slate-500">
                      {step.value} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{subscriptions.activePaid}</p>
                <p className="text-xs text-slate-500">Active paid now</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{subscriptions.churned}</p>
                <p className="text-xs text-slate-500">Lapsed (ever paid)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Spend (estimated) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-1">
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI Spend (estimated, last 30 days)</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Estimate only — OpenAI list prices × tokens we logged per call (
              {aiTextCost?.windowDays || 30}-day window), <strong>not</strong> the OpenAI invoice.
              Covers text AI (CV, analysis, cover letters, interview prep). Live-interview minutes
              are estimated separately.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-slate-900">
              ~{fmtNgn(aiTextCost?.totalNgn)}
            </p>
            <p className="text-xs text-slate-500">
              text AI · ~${aiTextCost?.totalUsd ?? 0}
              {typeof totalAiSpendNgn === 'number' && <> · all AI ~{fmtNgn(totalAiSpendNgn)}</>}
            </p>
          </div>
        </div>

        {aiSpendChart.length > 0 && (
          <div className="h-64 mt-5 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aiSpendChart} layout="vertical" margin={{ left: 20, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${v}`} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [fmtNgn(v), 'Est. cost']} />
                <Bar dataKey="costNgn" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="overflow-x-auto">
          {aiSpendRows.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4 font-medium">Operation</th>
                  <th className="py-2 pr-4 font-medium">Model</th>
                  <th className="py-2 pr-4 font-medium text-right">Calls</th>
                  <th className="py-2 pr-4 font-medium text-right">Avg tokens (in/out)</th>
                  <th className="py-2 font-medium text-right">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {aiSpendRows.map((r) => (
                  <tr
                    key={`${r.operation}-${r.model}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-2 pr-4 font-medium text-slate-700">{opLabel(r.operation)}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.model}</td>
                    <td className="py-2 pr-4 text-right text-slate-600">{r.calls}</td>
                    <td className="py-2 pr-4 text-right text-slate-500">
                      {r.avgIn}/{r.avgOut}
                    </td>
                    <td className="py-2 text-right font-semibold text-slate-800">
                      ~{fmtNgn(r.costNgn)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-2 pr-4 font-bold text-slate-900" colSpan={4}>
                    Total (text AI)
                  </td>
                  <td className="py-2 text-right font-bold text-slate-900">
                    ~{fmtNgn(aiTextCost?.totalNgn)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-center text-slate-400 text-sm py-4">
              No text-AI usage with logged tokens in the last 30 days.
            </p>
          )}
        </div>
      </div>

      {/* Flagship Cost Check — is the 10cr/turn flagship price backed by real usage? */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="mb-1">
          <h3 className="text-lg font-bold text-slate-900">Flagship Cost Check</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Self-updating evidence for whether flagship (Pro model) pricing is actually profitable,
            built from real {flagshipCostCheck?.windowDays || 30}-day usage — list prices × tokens
            we logged per call, same estimate basis as AI Spend above.
          </p>
        </div>

        {flagshipCostCheck?.hasData ? (
          <>
            <div className="overflow-x-auto mt-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4 font-medium">Operation</th>
                    <th className="py-2 pr-4 font-medium">Model</th>
                    <th className="py-2 pr-4 font-medium text-right">Calls</th>
                    <th className="py-2 pr-4 font-medium text-right">Avg tokens (in/out)</th>
                    <th className="py-2 pr-4 font-medium text-right">Cached in</th>
                    <th className="py-2 pr-4 font-medium text-right">Est. cost/call</th>
                    <th className="py-2 pr-4 font-medium text-right">Credits charged</th>
                    <th className="py-2 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {flagshipCostCheck.rows.map((r) => (
                    <tr
                      key={`${r.operation}-${r.model}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-2 pr-4 font-medium text-slate-700">
                        {opLabel(r.operation)}
                      </td>
                      <td className="py-2 pr-4 text-slate-500">{r.model}</td>
                      <td className="py-2 pr-4 text-right text-slate-600">{r.calls}</td>
                      <td className="py-2 pr-4 text-right text-slate-500">
                        {r.avgTokensIn}/{r.avgTokensOut}
                      </td>
                      <td
                        className={`py-2 pr-4 text-right ${
                          r.avgTokensCacheRead ? 'text-slate-500' : 'text-amber-600'
                        }`}
                        title={
                          r.avgTokensCacheRead
                            ? 'Avg cached input tokens read per call (billed at ~0.1x)'
                            : 'No cache reads on this operation — every call pays full input price'
                        }
                      >
                        {r.avgTokensCacheRead || '0'}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold text-slate-800">
                        {r.estCostNgn != null ? `~${fmtNgn(r.estCostNgn)}` : '—'}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-600">
                        {r.creditsCharged ?? '—'}
                      </td>
                      <td className={`py-2 text-right font-bold ${marginColor(r.marginPct)}`}>
                        {r.marginPct != null ? `${r.marginPct}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Estimated from list prices and logged tokens — not your actual invoice. Reference
              retail is ₦{Number(retailNgnPerCredit || 0).toFixed(2)}/credit.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500 mt-4">
            No flagship (Pro model) usage in the last 30 days. Chat and build-with pricing (10
            credits/turn) is currently based on an estimated token count, not measured ones — this
            card will fill in automatically the first time someone actually uses Sonnet or another
            Pro model.
          </p>
        )}
      </div>

      {/* Build Guard — free build-with anti-abuse ceiling */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">Build Guard</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Aria's free build-with chat is never charged, but it's capped at {buildGuard?.cap ?? 60}{' '}
            turns/user/day so a stuck or looping client can't run unlimited AI calls. This only
            shows the ceiling firing — it's not a usage or revenue metric. Read it carefully: 1-2
            hits spread across many different users usually means the cap is too tight for real use
            and should be raised (
            <code className="bg-slate-100 px-1 rounded">ARIA_BUILD_DAILY_CAP</code>); dozens of hits
            piled on one account is the guard doing its job.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-lg font-bold text-slate-900">{buildGuard?.usersHit || 0}</p>
            <p className="text-xs text-slate-500">Users who hit the ceiling</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{buildGuard?.totalHits || 0}</p>
            <p className="text-xs text-slate-500">Total cap hits (lifetime)</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{fmtDate(buildGuard?.lastHitAt)}</p>
            <p className="text-xs text-slate-500">Last hit</p>
          </div>
        </div>

        {buildGuard?.usersHit > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4 font-medium">User</th>
                  <th className="py-2 pr-4 font-medium text-right">Hits</th>
                  <th className="py-2 font-medium text-right">Last hit</th>
                </tr>
              </thead>
              <tbody>
                {(buildGuard.top || []).map((u) => (
                  <tr key={u.email} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-700">
                      {u.name ? `${u.name} · ${u.email}` : u.email}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-600">{u.hits}</td>
                    <td className="py-2 text-right text-slate-500">{fmtDate(u.lastAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-400 text-sm py-4">
            No one has hit the ceiling. Nothing to look at, which is the good outcome.
          </p>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
