import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Briefcase,
  Sparkles,
  BookOpen,
  ChevronRight,
  Mic,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '../components/Navbar';
import InterviewPrepService from '../services/interviewPrep.service';
import { useMinVisible } from '../hooks/useMinVisible';
import { computeReadiness, getPrepSummary } from '../utils/interviewPrep';

const MotionDiv = motion.div;

const InterviewPrepList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const showLoader = useMinVisible(loading, 800);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: list } = await InterviewPrepService.list();
        if (!cancelled) setItems(list || []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load interview prep');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-8 pb-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Interview Prep
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {items.length > 0
                ? `${items.length} prep${items.length === 1 ? '' : 's'} ready`
                : 'Rehearse before the call'}
            </p>
          </div>
          <Link
            to="/interview/start"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shrink-0"
          >
            <Mic className="w-4 h-4" /> Start a direct interview
          </Link>
        </div>
        {showLoader ? (
          <SkeletonList />
        ) : error ? (
          <div className="text-center py-12 text-rose-600 dark:text-rose-300">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {items.map((app, i) => (
              <MotionDiv
                key={app._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
              >
                <PrepRow app={app} />
              </MotionDiv>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// Score → colour tone for the readiness ring + status line. Unprepped items
// (no rated questions/stories) read as neutral slate rather than alarming red.
const toneForScore = (score, total) => {
  if (!total) return 'slate';
  if (score >= 70) return 'emerald';
  if (score >= 40) return 'amber';
  return 'rose';
};

const RING_COLORS = {
  emerald: 'text-emerald-500',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
  slate: 'text-slate-300 dark:text-slate-600',
};

const STATUS_META = {
  emerald: { Icon: CheckCircle2, classes: 'text-emerald-600 dark:text-emerald-300' },
  amber: { Icon: Clock, classes: 'text-amber-600 dark:text-amber-300' },
  rose: { Icon: AlertCircle, classes: 'text-rose-600 dark:text-rose-300' },
  slate: { Icon: Sparkles, classes: 'text-slate-500 dark:text-slate-400' },
};

const ReadinessRing = ({ score, tone }) => {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          stroke="currentColor"
          className="text-slate-100 dark:text-slate-800"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="currentColor"
          className={`${RING_COLORS[tone]} transition-all`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">
          {score}%
        </span>
      </div>
    </div>
  );
};

const PrepRow = ({ app }) => {
  const navigate = useNavigate();
  const prep = app.interviewPrep || {};
  const job = app.jobId || {};
  const isCvOnly = app.source === 'draft';
  const title = job.title || app.jobTitle || (isCvOnly ? 'CV draft' : 'Untitled role');
  const company = job.company || app.jobCompany || '';

  const { score, total, nextAction } = computeReadiness(app);
  const tone = toneForScore(score, total);
  const summary = getPrepSummary(app);
  const status = STATUS_META[tone];
  const StatusIcon = status.Icon;

  const practicedAt = prep.lastInterviewSession?.completedAt;
  const dateRef = practicedAt || prep.savedAt || app.updatedAt;

  return (
    <Link
      to={`/interview-prep/${app._id}`}
      className="group flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:shadow-md transition-all"
    >
      <ReadinessRing score={score} tone={tone} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h3>
          {isCvOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <BookOpen className="w-3 h-3" /> From CV
            </span>
          )}
        </div>

        {company && (
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mb-1.5">
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            {company}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
          <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${status.classes}`} />
          <span className={`truncate ${status.classes}`}>{nextAction.label}</span>
        </div>

        {(summary || dateRef) && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {summary && <span className="truncate">{summary}</span>}
            {summary && dateRef && <span className="text-slate-300 dark:text-slate-600">·</span>}
            {dateRef && (
              <span className="whitespace-nowrap">
                {practicedAt ? 'practiced ' : 'updated '}
                {formatDistanceToNow(new Date(dateRef), { addSuffix: true })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-300 group-hover:gap-2 transition-all">
          Continue prep
          <ChevronRight className="w-4 h-4" />
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            navigate(`/interview-prep/${app._id}/mock`);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Play className="w-3.5 h-3.5" /> Mock interview
        </button>
      </div>

      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors shrink-0 sm:hidden" />
    </Link>
  );
};

const SkeletonList = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="flex items-center gap-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 animate-pulse"
      >
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/2 bg-slate-100 dark:bg-slate-700 rounded" />
          <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-700 rounded" />
          <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 mb-5">
      <MessageSquare className="w-8 h-8" />
    </div>
    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
      No interview prep yet
    </h2>
    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
      Run a job analysis to auto-generate prep, or save skills with talking points from your CV
      builder.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <Link
        to="/interview/start"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm text-center transition-colors"
      >
        <Mic className="w-4 h-4" /> Start a direct interview
      </Link>
      <Link
        to="/dashboard"
        className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm text-center transition-colors"
      >
        Run a job analysis
      </Link>
    </div>
  </div>
);

export default InterviewPrepList;
