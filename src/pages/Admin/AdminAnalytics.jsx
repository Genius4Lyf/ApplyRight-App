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
              {typeof totalAiSpendNgn === 'number' && (
                <>
                  {' '}
                  · all AI ~{fmtNgn(totalAiSpendNgn)}
                </>
              )}
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
    </AdminLayout>
  );
};

export default AdminAnalytics;
