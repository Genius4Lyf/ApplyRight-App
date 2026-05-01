import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Briefcase, Sparkles, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '../components/Navbar';
import InterviewPrepService from '../services/interviewPrep.service';
import { useMinVisible } from '../hooks/useMinVisible';

const InterviewPrepList = () => {
  const navigate = useNavigate();
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
        if (!cancelled)
          setError(e.response?.data?.message || 'Failed to load interview prep');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-8 pb-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Interview Prep</h1>
          <p className="text-slate-500">
            {items.length > 0
              ? `${items.length} prep${items.length === 1 ? '' : 's'} ready`
              : 'Rehearse before the call'}
          </p>
        </div>
        {showLoader ? (
          <SkeletonGrid />
        ) : error ? (
          <div className="text-center py-12 text-rose-600">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((app, i) => (
              <motion.div
                key={app._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
              >
                <PrepCard app={app} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const PrepCard = ({ app }) => {
  const prep = app.interviewPrep || {};
  const skillsCount = prep.skillsWithEvidence?.length || 0;
  const questionsCount = prep.jobQuestions?.length || 0;
  const job = app.jobId || {};
  const isCvOnly = app.source === 'draft';
  const title = job.title || app.jobTitle || (isCvOnly ? 'CV draft' : 'Untitled role');
  const company = job.company || app.jobCompany || '';
  const dateRef = prep.savedAt || app.updatedAt;
  const isSaved = !!prep.isSaved;

  // Distinct badge for CV-only items so users know it's not yet attached
  // to a job role.
  const badge = isCvOnly
    ? { label: 'From CV', icon: BookOpen, classes: 'bg-amber-50 text-amber-700' }
    : isSaved
      ? { label: 'Saved', icon: BookOpen, classes: 'bg-indigo-50 text-indigo-700' }
      : { label: 'Auto-generated', icon: Sparkles, classes: 'bg-slate-100 text-slate-600' };
  const BadgeIcon = badge.icon;

  return (
    <Link
      to={`/interview-prep/${app._id}`}
      className="flex flex-col h-full bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${badge.classes}`}
        >
          <BadgeIcon className="w-3 h-3" />
          {badge.label}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
      </div>

      <h3 className="text-base font-semibold text-slate-900 leading-tight mb-1 line-clamp-2">
        {title}
      </h3>
      {company && (
        <p className="text-sm text-slate-500 mb-3 line-clamp-1 flex items-center gap-1">
          <Briefcase className="w-3.5 h-3.5 shrink-0" />
          {company}
        </p>
      )}
      {isCvOnly && (
        <p className="text-xs text-slate-500 mb-3 italic">
          Not attached to a job yet — run an analysis to add tailored questions.
        </p>
      )}

      <div className="flex items-center gap-3 mt-auto pt-3 border-t border-slate-100 text-xs text-slate-600">
        {questionsCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
            {questionsCount} question{questionsCount === 1 ? '' : 's'}
          </span>
        )}
        {skillsCount > 0 && (
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            {skillsCount} skill{skillsCount === 1 ? '' : 's'}
          </span>
        )}
        {dateRef && (
          <span className="ml-auto text-slate-400">
            {formatDistanceToNow(new Date(dateRef), { addSuffix: true })}
          </span>
        )}
      </div>
    </Link>
  );
};

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse"
      >
        <div className="h-5 w-20 bg-slate-100 rounded mb-3" />
        <div className="h-5 bg-slate-100 rounded mb-2" />
        <div className="h-4 w-2/3 bg-slate-100 rounded mb-4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-5">
      <MessageSquare className="w-8 h-8" />
    </div>
    <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
      No interview prep yet
    </h2>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      Run a job analysis to auto-generate prep, or save skills with talking points
      from your CV builder.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <Link
        to="/dashboard"
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm text-center transition-colors"
      >
        Run a job analysis
      </Link>
      <Link
        to="/history"
        className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm text-center transition-colors"
      >
        View applications
      </Link>
    </div>
  </div>
);

export default InterviewPrepList;
