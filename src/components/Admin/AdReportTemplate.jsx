import React, { forwardRef } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  MousePointerClick,
  Search,
  Sparkles,
} from 'lucide-react';
import applyRightIcon from '../../assets/logo/applyright-icon.png';
import { AD_TEMPLATES } from './adReportTemplates';

const REPORT_SIZE = 1080;

const fmt = (value) => {
  const amount = Number(value) || 0;

  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  }

  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`;
  }

  return amount.toLocaleString();
};

const pct = (part, total) => {
  if (!total) return 0;
  return Math.round((part / total) * 100);
};

const sourceLabel = (value) => {
  if (!value) return 'Direct';

  if (value === 'adzuna') return 'Adzuna';
  if (value === 'jobberman') return 'Jobberman';

  return value
    .split(/[-_\s]+/)
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(' ');
};

const normalizeContext = (context = {}) => ({
  periodLabel: context.periodLabel || 'Live dashboard snapshot',
  scopeLabel: context.scopeLabel || 'Current reporting window',
  generatedOn:
    context.generatedOn ||
    new Intl.DateTimeFormat('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date()),
});

const getReportData = (stats = {}) => {
  // Job searches & tailors are not yet live — zero until production data exists
  const searches = 0;
  const clicks = stats.jobMetrics?.engagement?.totalClicks || 0;
  const saves = stats.jobMetrics?.engagement?.totalSaved || 0;
  const tailors = 0;
  const applications = stats.totalApplications || 0;
  const downloads = stats.featureUsage?.cvGeneration?.downloads || 0;
  const optimizations = stats.featureUsage?.cvGeneration?.optimizations || 0;
  const topKeyword = stats.jobMetrics?.topKeywords?.[0]?._id || 'career growth';
  const topLocation = stats.jobMetrics?.topLocations?.[0]?._id || 'Nigeria';
  const sources = (stats.jobMetrics?.searchesBySource || []).slice(0, 3).map((source) => ({
    label: sourceLabel(source._id),
    count: source.count || 0,
    share: pct(source.count || 0, searches),
  }));

  return {
    users: stats.totalUsers || 0,
    resumes: stats.totalResumes || 0,
    credits: stats.totalCredits || 0,
    applications,
    searches,
    clicks,
    saves,
    tailors,
    downloads,
    optimizations,
    newUsers: stats.newUsersLastMonth || 0,
    topKeyword,
    topLocation,
    searchToApplyRate: pct(applications, searches),
    clickToSaveRate: pct(saves, clicks),
    tailorRate: pct(tailors, searches),
    sources,
  };
};

const joinClasses = (...parts) => parts.filter(Boolean).join(' ');

const TemplateBadge = ({ label, tone = 'dark' }) => (
  <div
    className={joinClasses(
      'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold',
      tone === 'light'
        ? 'border-slate-200 bg-white text-slate-700'
        : 'border-white/10 bg-white/[0.08] text-white/75'
    )}
  >
    <Sparkles className="h-4 w-4" />
    {label}
  </div>
);

const DesignSocialProof = forwardRef(({ stats, context }, ref) => {
  const report = getReportData(stats);
  const meta = normalizeContext(context);

  return (
    <div
      ref={ref}
      className="relative h-[1080px] w-[1080px] overflow-hidden"
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        background:
          'radial-gradient(circle at 18% 18%, rgba(56,189,248,0.15), transparent 28%), linear-gradient(145deg, #020617 0%, #0f172a 48%, #312e81 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute -right-20 top-12 h-[420px] w-[420px] rounded-full bg-cyan-400/15 blur-[120px]" />
      <div className="absolute -bottom-20 left-8 h-[420px] w-[420px] rounded-full bg-indigo-500/25 blur-[120px]" />

      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/10">
            <img src={applyRightIcon} alt="" className="h-9 w-9 object-contain" />
          </div>
          <div className="flex-1">
            <div className="text-[30px] font-bold tracking-tight text-white">ApplyRight</div>
            <div className="text-xs font-medium uppercase tracking-[0.25em] text-cyan-200/70">
              AI-powered career platform
            </div>
          </div>
          <TemplateBadge label={meta.generatedOn} />
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-6">
          {/* Left */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/75">
                Trusted by professionals
              </div>
              <h1 className="text-[72px] font-extrabold leading-[0.95] tracking-[-0.03em] text-white">
                {fmt(report.users)}+ professionals building careers with AI.
              </h1>
              <p className="mt-4 max-w-[520px] text-[20px] leading-[1.4] text-slate-300">
                Smart resumes, ATS scoring, and job search — one faster workflow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: `${fmt(report.resumes)}+`, label: 'Resumes created', accent: true },
                { value: `${fmt(report.searches)}+`, label: 'Jobs searched' },
                { value: `${fmt(report.optimizations)}+`, label: 'Analyses run' },
                { value: `${fmt(report.tailors)}+`, label: 'CVs tailored' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={joinClasses(
                    'rounded-2xl border p-5',
                    item.accent
                      ? 'bg-white text-slate-950 border-transparent'
                      : 'bg-white/[0.07] text-white border-white/10'
                  )}
                >
                  <div className="text-[36px] font-bold tracking-tight leading-none">
                    {item.value}
                  </div>
                  <div className="mt-1.5 text-xs font-semibold uppercase tracking-wider opacity-70">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-3">
            {/* Community pulse card */}
            <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.07] p-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span>Community pulse</span>
                <BadgeCheck className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="mt-4 text-[52px] font-black leading-none text-white">
                +{fmt(report.newUsers)}
              </div>
              <div className="mt-1.5 text-base text-slate-300">new users this month</div>

              <div className="mt-4 space-y-2.5">
                {[
                  { icon: Search, label: 'Search to apply', value: `${report.searchToApplyRate}%` },
                  { icon: MousePointerClick, label: 'Click to save', value: `${report.clickToSaveRate}%` },
                  { icon: BriefcaseBusiness, label: 'Tailor rate', value: `${report.tailorRate}%` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-slate-950/30 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <item.icon className="h-4 w-4 text-cyan-300" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-[22px] font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel mix card */}
            <div className="flex-1 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Top search channels
              </div>
              <div className="mt-3 space-y-2.5">
                {(report.sources.length
                  ? report.sources
                  : [{ label: 'Organic', count: 0, share: 0 }]
                ).map((source, index) => (
                  <div key={source.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm text-slate-300">
                      <span>{source.label}</span>
                      <span>{source.share}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={joinClasses(
                          'h-full rounded-full',
                          index === 0 ? 'bg-cyan-300' : index === 1 ? 'bg-indigo-300' : 'bg-violet-300'
                        )}
                        style={{ width: `${Math.max(source.share, source.count ? 18 : 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/10 px-4 py-3 text-cyan-100">
                <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-200/80">
                  Top keyword
                </div>
                <div className="mt-1.5 text-[24px] font-bold tracking-tight">
                  {report.topKeyword}
                </div>
                <div className="mt-1 text-xs text-cyan-100/70">
                  Strongest interest from {report.topLocation}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2.5">
            {['AI Resume Builder', 'ATS Scoring', 'Job Tracking'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/70"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950">
            applyright.com.ng
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
});

const DesignGrowthStory = forwardRef(({ stats, context }, ref) => {
  const report = getReportData(stats);
  const meta = normalizeContext(context);

  return (
    <div
      ref={ref}
      className="relative h-[1080px] w-[1080px] overflow-hidden"
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 52%, #ffffff 100%)',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-r from-indigo-600 via-cyan-400 to-indigo-500" />
      <div className="absolute right-[-120px] top-28 h-[520px] w-[520px] rounded-full bg-indigo-200/45 blur-[90px]" />
      <div className="absolute bottom-[-120px] left-[-80px] h-[420px] w-[420px] rounded-full bg-cyan-100 blur-[80px]" />

      <div className="relative z-10 flex h-full flex-col justify-between p-12 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={applyRightIcon} alt="" className="h-12 w-12 object-contain" />
            <div>
              <div className="font-heading text-[30px] font-semibold tracking-tight text-slate-950">
                ApplyRight
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.26em] text-indigo-500/80">
                AI-powered career platform
              </div>
            </div>
          </div>

          <TemplateBadge label={meta.generatedOn} tone="light" />
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-[1.08fr_0.92fr] gap-7">
          {/* Left */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500/75">
                Community milestone
              </div>

              <h1 className="mt-3 font-heading text-[72px] font-semibold leading-[0.92] tracking-[-0.04em] text-slate-950">
                {fmt(report.users)}+ professionals building careers with AI.
              </h1>

              <p className="mt-4 max-w-[480px] text-[20px] leading-[1.4] text-slate-600">
                AI resume generation, job discovery, and application support — one clean workflow.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: `${fmt(report.resumes)}+`, label: 'Resumes built' },
                { value: `${fmt(report.searches)}+`, label: 'Jobs searched' },
                { value: `${fmt(report.applications)}+`, label: 'Applications' },
                { value: `${fmt(report.tailors)}+`, label: 'CVs tailored' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/80 border border-slate-200/60 px-4 py-4">
                  <div className="font-heading text-[32px] font-semibold tracking-tight text-slate-950">
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom stats */}
            <div className="flex items-end gap-6 border-t border-slate-200 pt-5">
              {[
                { value: `${fmt(report.searchToApplyRate)}%`, label: 'search to apply' },
                { value: `${fmt(report.tailorRate)}%`, label: 'search to tailor' },
                { value: `${fmt(report.credits)}+`, label: 'credits held' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="font-heading text-[34px] font-semibold tracking-tight text-slate-950">
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col rounded-[32px] border border-slate-200/80 bg-white/75 p-6 shadow-[0_24px_80px_-40px_rgba(79,70,229,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Platform highlights
                </div>
                <div className="mt-1.5 font-heading text-[22px] font-semibold text-slate-950">
                  What this month looks like
                </div>
              </div>
              <div className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
                {meta.periodLabel}
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {[
                {
                  label: 'AI resumes built',
                  value: `${fmt(report.resumes)}+`,
                  bar: 100,
                  tone: 'bg-slate-950',
                },
                {
                  label: 'Applications analyzed',
                  value: `${fmt(report.optimizations)}+`,
                  bar: report.resumes
                    ? Math.max(pct(report.optimizations, report.resumes), 24)
                    : 36,
                  tone: 'bg-indigo-500',
                },
                {
                  label: 'CVs tailored',
                  value: `${fmt(report.tailors)}+`,
                  bar: report.resumes ? Math.max(pct(report.tailors, report.resumes), 20) : 28,
                  tone: 'bg-cyan-500',
                },
                {
                  label: 'Job searches',
                  value: `${fmt(report.searches)}+`,
                  bar: report.resumes ? Math.max(pct(report.searches, report.resumes), 30) : 50,
                  tone: 'bg-violet-500',
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                    <span className="font-medium capitalize">{item.label}</span>
                    <span className="font-semibold text-slate-950">{item.value}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={joinClasses('h-full rounded-full', item.tone)}
                      style={{ width: `${item.bar}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-1 flex-col gap-3 border-t border-slate-200 pt-5">
              <div className="flex-1 rounded-[20px] bg-slate-950 px-5 py-5 text-white">
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Top keyword
                </div>
                <div className="mt-2 font-heading text-[28px] font-semibold tracking-tight">
                  {report.topKeyword}
                </div>
              </div>

              <div className="flex-1 rounded-[20px] bg-indigo-50 px-5 py-5 text-slate-950">
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-indigo-500/70">
                  Top location
                </div>
                <div className="mt-2 font-heading text-[28px] font-semibold tracking-tight">
                  {report.topLocation}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            {['AI Resume Builder', 'ATS Scoring', 'Job Tracking', 'CV Downloads'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
            applyright.com.ng
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
});

const DesignImpactReport = forwardRef(({ stats, context }, ref) => {
  const report = getReportData(stats);
  const meta = normalizeContext(context);
  const steps = [
    {
      label: 'Search',
      value: report.searches,
      width: 100,
      tone: 'linear-gradient(90deg, #818cf8 0%, #6366f1 100%)',
    },
    {
      label: 'Click',
      value: report.clicks,
      width: report.searches ? Math.max(pct(report.clicks, report.searches), 24) : 60,
      tone: 'linear-gradient(90deg, #67e8f9 0%, #06b6d4 100%)',
    },
    {
      label: 'Save',
      value: report.saves,
      width: report.searches ? Math.max(pct(report.saves, report.searches), 20) : 48,
      tone: 'linear-gradient(90deg, #c4b5fd 0%, #8b5cf6 100%)',
    },
    {
      label: 'Tailor',
      value: report.tailors,
      width: report.searches ? Math.max(pct(report.tailors, report.searches), 18) : 42,
      tone: 'linear-gradient(90deg, #f9a8d4 0%, #ec4899 100%)',
    },
    {
      label: 'Apply',
      value: report.applications,
      width: report.searches ? Math.max(pct(report.applications, report.searches), 16) : 36,
      tone: 'linear-gradient(90deg, #fde68a 0%, #f59e0b 100%)',
    },
  ];

  return (
    <div
      ref={ref}
      className="relative flex h-[1080px] w-[1080px] overflow-hidden"
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'linear-gradient(150deg, #020617 0%, #0f172a 55%, #111827 100%)',
      }}
    >
      <div className="absolute inset-y-0 left-0 w-[400px] bg-[linear-gradient(180deg,#312e81_0%,#1d4ed8_100%)]" />
      <div className="absolute left-[320px] top-24 h-[360px] w-[360px] rounded-full bg-indigo-400/15 blur-[120px]" />
      <div className="absolute right-[-80px] top-[-40px] h-[300px] w-[300px] rounded-full bg-cyan-400/10 blur-[110px]" />
      <div className="absolute bottom-[-80px] right-0 h-[280px] w-[280px] rounded-full bg-fuchsia-400/10 blur-[110px]" />

      {/* Left panel */}
      <div className="relative z-10 flex w-[400px] flex-col justify-between p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
            <img src={applyRightIcon} alt="" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <div className="font-heading text-[28px] font-semibold tracking-tight">ApplyRight</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-indigo-100/75">
              AI-powered careers
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100/75">
            The journey
          </div>
          <h1 className="mt-4 font-heading text-[56px] font-semibold leading-[0.94] tracking-[-0.04em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            How job seekers move from search to application.
          </h1>
          <p className="mt-4 max-w-[280px] text-[18px] leading-[1.45] text-indigo-100/80">
            Real data from real professionals using ApplyRight to land their next role.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: `${fmt(report.users)}+`, label: 'Users' },
            { value: `${fmt(report.resumes)}+`, label: 'Resumes' },
            { value: `${fmt(report.tailors)}+`, label: 'CVs tailored' },
            { value: `${fmt(report.optimizations)}+`, label: 'Analyses' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3.5">
              <div className="font-heading text-[26px] font-semibold leading-none tracking-tight">
                {item.value}
              </div>
              <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-100/60">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Snapshot card */}
        <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-100/70">
            Snapshot
          </div>
          <div className="mt-3 font-heading text-[40px] font-semibold leading-none">
            {report.searchToApplyRate}%
          </div>
          <div className="mt-1.5 text-sm text-indigo-100/80">search-to-apply conversion</div>

          <div className="mt-4 space-y-2">
            {[
              { label: 'New users', value: `+${fmt(report.newUsers)}` },
              { label: 'Top keyword', value: report.topKeyword },
              { label: 'Best market', value: report.topLocation },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/20 px-3 py-2.5"
              >
                <span className="text-xs text-indigo-100/70">{item.label}</span>
                <span className="text-xs font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative flex flex-1 flex-col gap-6 px-10 py-10 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Current view
            </div>
            <div className="mt-1.5 font-heading text-[28px] font-semibold tracking-tight">
              {meta.periodLabel}
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
            {meta.generatedOn}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total users', value: `${fmt(report.users)}+` },
            { label: 'Searches', value: `${fmt(report.searches)}+` },
            { label: 'Applications', value: `${fmt(report.applications)}+` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-5"
            >
              <div className="font-heading text-[32px] font-semibold tracking-tight text-white">
                {item.value}
              </div>
              <div className="mt-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                Funnel performance
              </div>
              <div className="mt-1.5 font-heading text-[24px] font-semibold tracking-tight text-white">
                From search to hired
              </div>
            </div>

            <div className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
              {meta.periodLabel}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {steps.map((step) => (
              <div key={step.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">{step.label}</span>
                  <span className="font-semibold text-white">{fmt(step.value)}</span>
                </div>
                <div className="h-10 overflow-hidden rounded-[14px] bg-white/[0.06]">
                  <div
                    className="flex h-full items-center justify-between rounded-[14px] px-4 text-xs font-semibold text-slate-950"
                    style={{
                      width: `${step.width}%`,
                      minWidth: '140px',
                      background: step.tone,
                    }}
                  >
                    <span>{step.label}</span>
                    <span>{fmt(step.value)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Get started guide */}
        <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              How to get started
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              applyright.com.ng
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            {[
              { num: '1', text: 'Create your free account' },
              { num: '2', text: 'Build a professional CV' },
              { num: '3', text: 'Tailor CV to any job' },
              { num: '4', text: 'Get ATS score & tips' },
              { num: '5', text: 'Search & apply to jobs' },
              { num: '6', text: 'Track all applications' },
            ].map((step) => (
              <div
                key={step.num}
                className="flex items-center gap-2.5 rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 text-xs font-bold text-white">
                  {step.num}
                </div>
                <span className="text-xs font-medium text-slate-300">{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

const TEMPLATE_COMPONENTS = {
  'social-proof': DesignSocialProof,
  'growth-story': DesignGrowthStory,
  'impact-report': DesignImpactReport,
};

const getTemplateById = (templateId) => {
  const template = AD_TEMPLATES.find((item) => item.id === templateId) || AD_TEMPLATES[0];

  return {
    ...template,
    Component: TEMPLATE_COMPONENTS[template.id] || DesignSocialProof,
  };
};

export const AdReportPreview = ({ stats, context, templateId = 'social-proof', size = 320 }) => {
  if (!stats) return null;

  const { Component } = getTemplateById(templateId);
  const scale = size / REPORT_SIZE;

  return (
    <div
      className="overflow-hidden rounded-[28px] border border-slate-200/10 bg-slate-950 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.95)]"
      style={{ height: size, width: size }}
    >
      <div
        className="origin-top-left"
        style={{
          height: REPORT_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: REPORT_SIZE,
        }}
      >
        <Component stats={stats} context={context} />
      </div>
    </div>
  );
};

const AdReportTemplate = forwardRef(({ stats, context, templateId = 'social-proof' }, ref) => {
  if (!stats) return null;

  const { Component } = getTemplateById(templateId);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[-1] opacity-0"
      aria-hidden="true"
    >
      <Component stats={stats} context={context} ref={ref} />
    </div>
  );
});

export default AdReportTemplate;
