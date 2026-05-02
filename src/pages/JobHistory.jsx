import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import {
  Calendar,
  Briefcase,
  Building,
  Sparkles,
  ArrowLeft,
  Trash2,
  FileText,
  Mail,
  MessageSquare,
  CheckCircle,
  Eye,
  ChevronDown,
  Search,
  RefreshCw,
  GitCompare,
  ChevronRight,
} from 'lucide-react';

/**
 * Relative time for recent items, absolute for older ones. Tuned for a job-
 * history list where "2d ago" matters more than "April 15, 2026" for items
 * from this week, but full dates are clearer once items are months old.
 */
const formatRelativeDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'score_desc', label: 'Highest match' },
  { id: 'score_asc', label: 'Lowest match' },
];

import FitScoreCard from '../components/FitScoreCard';
import NextBestAction from '../components/NextBestAction';
import JobRequirementsCard from '../components/JobRequirementsCard';
import MetricCaptureModal from '../components/MetricCaptureModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { toast } from 'sonner';

// Status metadata: label, color tone, and filter group for the tabs above the list.
const STATUS_META = {
  analyzed: { label: 'Analyzed', tone: 'slate', group: 'active' },
  assets_generated: { label: 'Ready to apply', tone: 'indigo', group: 'active' },
  submitted: { label: 'Submitted', tone: 'amber', group: 'in_progress' },
  interviewing: { label: 'Interviewing', tone: 'blue', group: 'in_progress' },
  offer: { label: 'Offer', tone: 'emerald', group: 'closed' },
  rejected: { label: 'Rejected', tone: 'red', group: 'closed' },
  withdrawn: { label: 'Withdrawn', tone: 'gray', group: 'closed' },
};

const TONE_CLASSES = {
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_OPTIONS = [
  'analyzed',
  'assets_generated',
  'submitted',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
];

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'closed', label: 'Closed' },
];

const StatusPill = ({ status, onClick, className = '' }) => {
  const meta = STATUS_META[status] || STATUS_META.analyzed;
  const tone = TONE_CLASSES[meta.tone];
  const interactive = typeof onClick === 'function';
  return (
    <button
      type={interactive ? 'button' : undefined}
      onClick={interactive ? (e) => { e.stopPropagation(); onClick(e); } : undefined}
      disabled={!interactive}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone} ${interactive ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} ${className}`}
    >
      {meta.label}
      {interactive && <ChevronDown className="w-3 h-3 opacity-60" />}
    </button>
  );
};

const JobHistory = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [generatingCV, setGeneratingCV] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(false);
  const [generatingInterview, setGeneratingInterview] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [statusMenuOpen, setStatusMenuOpen] = useState(null); // application id, or 'detail'
  const [compareMenuOpen, setCompareMenuOpen] = useState(false);
  const [cvGenStatus, setCvGenStatus] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [metricCapture, setMetricCapture] = useState({
    isOpen: false,
    vagueBullets: [],
    mode: null, // 'cv' | 'bundle'
  });
  const cvPollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cvPollRef.current) clearInterval(cvPollRef.current);
    };
  }, []);

  // If the user opens an application that is mid-generation (e.g. they
  // refreshed the page during a 30-second pipeline), reattach the poll so the
  // progress bar resumes instead of pretending nothing is happening.
  useEffect(() => {
    if (!selectedApp) return;
    const inFlightStages = ['extracting', 'scoring', 'enhancing', 'categorizing', 'assembling'];
    if (inFlightStages.includes(selectedApp.generationStatus?.stage) && !cvPollRef.current) {
      setGeneratingCV(true);
      setCvGenStatus(selectedApp.generationStatus);
      startCVPoll(selectedApp._id);
    }
    // We intentionally don't depend on startCVPoll/etc. — the effect is
    // about *opening* an in-flight app, not reacting to handler changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApp?._id]);

  // Get user from local storage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Close status menu on outside click
  useEffect(() => {
    if (!statusMenuOpen) return;
    const close = () => setStatusMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [statusMenuOpen]);

  useEffect(() => {
    if (!compareMenuOpen) return;
    const close = () => setCompareMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [compareMenuOpen]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/applications');
      setApplications(res.data);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (e, appId) => {
    e.stopPropagation();
    setApplicationToDelete(appId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!applicationToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/applications/${applicationToDelete}`);
      setApplications(applications.filter((app) => app._id !== applicationToDelete));
      if (selectedApp?._id === applicationToDelete) {
        setSelectedApp(null);
      }
      setDeleteModalOpen(false);
      setApplicationToDelete(null);
    } catch (error) {
      console.error('Failed to delete application', error);
      alert('Failed to delete application. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const updateSelectedApp = (updates) => {
    const updated = { ...selectedApp, ...updates };
    setSelectedApp(updated);
    setApplications((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  };

  const handleStatusUpdate = async (appId, status) => {
    setStatusMenuOpen(null);
    // Optimistic update — revert on failure
    const prevApps = applications;
    const prevSelected = selectedApp;
    setApplications((apps) =>
      apps.map((a) => (a._id === appId ? { ...a, status, statusUpdatedAt: new Date().toISOString() } : a))
    );
    if (selectedApp?._id === appId) {
      setSelectedApp((prev) => ({ ...prev, status, statusUpdatedAt: new Date().toISOString() }));
    }
    try {
      await api.patch(`/applications/${appId}/status`, { status });
      toast.success(`Status updated: ${STATUS_META[status]?.label || status}`);
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Failed to update status. Please try again.');
      setApplications(prevApps);
      setSelectedApp(prevSelected);
    }
  };

  // Compose status filter + text search + sort. Each application passes
  // through three gates before display:
  //   1. Status group matches the active filter tab (or "all").
  //   2. Job title or company contains the search query (case-insensitive).
  //   3. Sort by the selected order (newest/oldest/score asc-desc).
  const filteredApplications = applications
    .filter((app) => {
      if (filter !== 'all') {
        const status = app.status || 'analyzed';
        if (STATUS_META[status]?.group !== filter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const title = (app.jobId?.title || app.jobTitle || '').toLowerCase();
        const company = (app.jobId?.company || app.jobCompany || '').toLowerCase();
        if (!title.includes(q) && !company.includes(q)) return false;
      }
      return true;
    })
    .slice() // copy before sorting so React doesn't mutate state
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'score_desc':
          return (b.fitScore ?? -1) - (a.fitScore ?? -1);
        case 'score_asc':
          return (a.fitScore ?? 101) - (b.fitScore ?? 101);
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

  // Maps API errors to consistent toasts across asset generation handlers.
  const handleAssetGenError = (err, fallbackMessage) => {
    const code = err.response?.data?.code;
    if (err.response?.status === 403 && code === 'INSUFFICIENT_CREDITS') {
      toast.error(`Insufficient credits. Need ${err.response.data.required}, have ${err.response.data.current}.`);
      return;
    }
    if (err.response?.status === 503 && code === 'AI_UNAVAILABLE') {
      toast.error('AI is temporarily unavailable. You have not been charged. Please try again in a moment.');
      return;
    }
    if (err.response?.status === 409 && code === 'GENERATION_IN_PROGRESS') {
      toast.error('A CV generation is already running for this application.');
      return;
    }
    toast.error(fallbackMessage);
  };

  // Polls /applications/:id every 1.5s for CV generation progress.
  // See Dashboard.jsx for the same pattern on the active analysis flow.
  const startCVPoll = (applicationId) => {
    if (cvPollRef.current) clearInterval(cvPollRef.current);
    cvPollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/applications/${applicationId}`);
        const fresh = res.data;
        const status = fresh.generationStatus;
        if (status) setCvGenStatus(status);

        if (status?.stage === 'completed') {
          clearInterval(cvPollRef.current);
          cvPollRef.current = null;
          updateSelectedApp({
            optimizedCV: fresh.optimizedCV,
            skills: fresh.skills,
            draftCVId: fresh.draftCVId,
            optimizedFitScore: fresh.optimizedFitScore,
            status: fresh.status,
            statusUpdatedAt: fresh.statusUpdatedAt,
          });
          try {
            const bal = await api.get('/billing/balance');
            if (bal.data?.credits !== undefined) {
              window.dispatchEvent(new CustomEvent('credit_updated', { detail: bal.data.credits }));
            }
          } catch (e) {
            // Non-critical
          }
          const before = fresh.fitScore;
          const after = fresh.optimizedFitScore;
          if (typeof before === 'number' && typeof after === 'number' && after > before) {
            toast.success(`Match lifted ${before}% → ${after}%`);
          } else {
            toast.success('CV generated successfully!');
          }
          setGeneratingCV(false);
          setCvGenStatus(null);
        } else if (status?.stage === 'failed') {
          clearInterval(cvPollRef.current);
          cvPollRef.current = null;
          toast.error(status.error || 'CV generation failed. You have not been charged.');
          setGeneratingCV(false);
          setCvGenStatus(null);
        }
      } catch (e) {
        console.error('CV poll error (will retry):', e.message);
      }
    }, 1500);
  };

  // See Dashboard.jsx — bundle reuses the CV poll because the backend writes
  // the same generationStatus field. By the time stage='completed', all three
  // artifacts are persisted on the application.
  const startGeneration = async (mode, providedMetrics = {}) => {
    if (!selectedApp || generatingCV) return;
    const endpoint = mode === 'bundle' ? 'generate-bundle' : 'generate-cv';
    const startMessage = mode === 'bundle' ? 'Starting bundle…' : 'Starting…';
    const errorMessage =
      mode === 'bundle'
        ? 'Failed to start bundle generation.'
        : 'Failed to start CV generation.';

    setGeneratingCV(true);
    setCvGenStatus({ stage: 'extracting', progress: 5, stageMessage: startMessage });
    try {
      const res = await api.post(`/analysis/${selectedApp._id}/${endpoint}`, {
        providedMetrics,
      });
      if (res.data.generationStatus) setCvGenStatus(res.data.generationStatus);
      startCVPoll(selectedApp._id);
    } catch (err) {
      setGeneratingCV(false);
      setCvGenStatus(null);
      handleAssetGenError(err, errorMessage);
    }
  };

  const beginGeneration = async (mode) => {
    if (!selectedApp || generatingCV) return;
    try {
      const pre = await api.post(`/analysis/${selectedApp._id}/preflight-metrics`);
      const vague = pre.data?.vagueBullets || [];
      if (vague.length > 0) {
        setMetricCapture({ isOpen: true, vagueBullets: vague, mode });
        return;
      }
    } catch (e) {
      // Non-fatal — proceed without the modal.
      console.error('Preflight failed:', e.message);
    }
    startGeneration(mode);
  };

  const handleGenerateCV = () => beginGeneration('cv');
  const handleGenerateBundle = () => beginGeneration('bundle');

  const handleMetricCaptureSubmit = (providedMetrics) => {
    const { mode } = metricCapture;
    setMetricCapture({ isOpen: false, vagueBullets: [], mode: null });
    startGeneration(mode, providedMetrics);
  };

  const handleMetricCaptureCancel = () => {
    setMetricCapture({ isOpen: false, vagueBullets: [], mode: null });
  };

  // Refresh balance after a recovered request — the failed POST didn't return
  // remainingCredits but the backend deducted before completing.
  const refreshBalance = async () => {
    try {
      const bal = await api.get('/billing/balance');
      if (bal.data?.credits !== undefined) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: bal.data.credits }));
      }
    } catch (_) {
      /* non-critical */
    }
  };

  const showCoverLetterToast = (warnings) => {
    if (warnings && warnings.length > 0) {
      toast.warning(
        `Cover letter generated, but ${warnings.length} claim${warnings.length === 1 ? '' : 's'} may not be supported by your resume — verify before sending.`,
        { duration: 8000 }
      );
    } else {
      toast.success('Cover letter generated successfully!');
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedApp) return;
    setGeneratingCL(true);
    try {
      const res = await api.post(`/analysis/${selectedApp._id}/generate-cover-letter`);
      updateSelectedApp({
        coverLetter: res.data.coverLetter,
        coverLetterWarnings: res.data.coverLetterWarnings || [],
      });
      showCoverLetterToast(res.data.coverLetterWarnings);
      window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.data.remainingCredits }));
    } catch (err) {
      // Long LLM calls (gen + fact-check) sometimes have the connection dropped
      // by an upstream proxy after the backend has already saved the letter.
      // Re-fetch before declaring failure.
      try {
        const recovery = await api.get(`/applications/${selectedApp._id}`);
        if (recovery.data?.coverLetter) {
          updateSelectedApp({
            coverLetter: recovery.data.coverLetter,
            coverLetterWarnings: recovery.data.coverLetterWarnings || [],
          });
          showCoverLetterToast(recovery.data.coverLetterWarnings);
          refreshBalance();
          return;
        }
      } catch (_) {
        /* fall through */
      }
      handleAssetGenError(err, 'Failed to generate cover letter.');
    } finally {
      setGeneratingCL(false);
    }
  };

  const handleGenerateInterview = async () => {
    if (!selectedApp) return;
    setGeneratingInterview(true);
    try {
      const res = await api.post(`/analysis/${selectedApp._id}/generate-interview`);
      updateSelectedApp({ interviewQuestions: res.data.interviewQuestions, questionsToAsk: res.data.questionsToAsk });
      toast.success('Interview prep generated!');
      window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.data.remainingCredits }));
    } catch (err) {
      // Same recovery pattern — backend may have saved even if request appeared to fail.
      try {
        const recovery = await api.get(`/applications/${selectedApp._id}`);
        if (recovery.data?.interviewQuestions?.length > 0) {
          updateSelectedApp({
            interviewQuestions: recovery.data.interviewQuestions,
            questionsToAsk: recovery.data.questionsToAsk || [],
          });
          toast.success('Interview prep generated!');
          refreshBalance();
          return;
        }
      } catch (_) {
        /* fall through */
      }
      handleAssetGenError(err, 'Failed to generate interview prep.');
    } finally {
      setGeneratingInterview(false);
    }
  };

  /**
   * Re-run fit analysis for an existing application — useful when the AI has
   * been upgraded, the user has edited their resume, or the original analysis
   * looked off. Costs 10 credits (same as the original analyze). Backend
   * upserts by (userId, jobId, resumeId) so the existing record is updated.
   */
  const handleReanalyze = async () => {
    if (!selectedApp || reanalyzing) return;
    const resumeId = selectedApp.resumeId?._id || selectedApp.resumeId;
    const jobId = selectedApp.jobId?._id || selectedApp.jobId;
    if (!resumeId || !jobId) {
      toast.error("Can't re-run: missing resume or job reference.");
      return;
    }
    setReanalyzing(true);
    try {
      const res = await api.post('/analysis/analyze', { resumeId, jobId });
      updateSelectedApp({
        fitScore: res.data.fitScore,
        fitAnalysis: res.data.fitAnalysis,
        actionPlan: res.data.actionPlan,
      });
      if (res.data.remainingCredits !== undefined) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.data.remainingCredits }));
      }
      toast.success(`Re-analyzed: ${res.data.fitScore}% match`);
    } catch (err) {
      handleAssetGenError(err, 'Failed to re-run analysis.');
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-8 pb-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="text-slate-500">Track and manage your generated applications.</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading history...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No applications yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Start by generating your first tailored CV and cover letter in the "Get Hired"
              section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* List Column: Hidden on mobile if an app is selected */}
            <div
              className={`lg:col-span-1 space-y-4 ${selectedApp ? 'hidden lg:block' : 'block'} lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2 custom-scrollbar pb-8`}
            >
              {/* Search + sort */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by job title or company"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 text-slate-600"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      Sort: {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter tabs */}
              <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {FILTER_TABS.map((tab) => {
                  const count = tab.id === 'all'
                    ? applications.length
                    : applications.filter((a) => STATUS_META[a.status || 'analyzed']?.group === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setFilter(tab.id)}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        filter === tab.id
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-1 ${filter === tab.id ? 'text-indigo-400' : 'text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredApplications.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400">
                  {searchQuery.trim() || filter !== 'all'
                    ? 'No applications match these filters.'
                    : 'No applications yet.'}
                </div>
              )}

              {filteredApplications.map((app) => (
                <div
                  key={app._id}
                  onClick={() => {
                    setSelectedApp(app);
                    setSelectedTemplate(app.templateId || 'ats-clean');
                    // Scroll to top on mobile when selecting
                    if (window.innerWidth < 1024) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`
                                        p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md
                                        ${
                                          selectedApp?._id === app._id
                                            ? 'bg-white border-primary shadow-md ring-1 ring-primary/20'
                                            : 'bg-white border-slate-200 hover:border-indigo-300'
                                        }
                                    `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 line-clamp-1">
                      {app.jobId?.title || app.jobTitle || 'Unknown Role'}
                    </h3>
                    <span
                      className="text-xs font-medium text-slate-400 whitespace-nowrap"
                      title={new Date(app.createdAt).toLocaleString()}
                    >
                      {formatRelativeDate(app.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                    <Building className="w-3 h-3" />
                    <span className="line-clamp-1">{app.jobId?.company || app.jobCompany || 'Unknown Company'}</span>
                  </div>
                  <div className="mb-2">
                    <StatusPill status={app.status || 'analyzed'} />
                  </div>
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {(app.optimizedCV || app.draftCVId) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200">
                          <FileText className="w-3 h-3" /> CV
                        </span>
                      )}
                      {app.coverLetter && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-medium border border-blue-200">
                          <Mail className="w-3 h-3" /> Letter
                        </span>
                      )}
                      {app.interviewQuestions && app.interviewQuestions.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-600 text-xs font-medium border border-purple-200">
                          <MessageSquare className="w-3 h-3" /> Interview
                        </span>
                      )}
                      {!app.optimizedCV && !app.draftCVId && !app.coverLetter && (!app.interviewQuestions || app.interviewQuestions.length === 0) && (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 text-slate-400 text-xs font-medium border border-slate-200">
                          Analysis only
                        </span>
                      )}
                    </div>
                    {app.fitScore !== undefined && (
                      <span
                        className={`
                                                flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                                                ${
                                                  app.fitScore >= 80
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : app.fitScore >= 50
                                                      ? 'bg-amber-100 text-amber-700'
                                                      : 'bg-red-100 text-red-700'
                                                }
                                            `}
                      >
                        <Sparkles className="w-3 h-3" />
                        {app.fitScore}% Match
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, app._id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-2 w-full flex justify-center items-center bg-slate-50 border border-slate-100"
                    title="Delete application"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Preview Column: Hidden on mobile if NO app is selected */}
            <div
              className={`lg:col-span-2 ${selectedApp ? 'block' : 'hidden lg:block'} lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)]`}
            >
              {selectedApp ? (
                /* Outer card framing kicks in only at lg+. On mobile the
                   panel is already full-width inside the page — adding a
                   bordered card here just nests padding inside padding and
                   crushes the inner content on small phones. */
                <div className="overflow-hidden min-h-[600px] animate-in slide-in-from-right-4 duration-300 lg:animate-none lg:h-full lg:flex lg:flex-col lg:mb-8 lg:bg-white lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-sm">
                  <div
                    className={`px-3 py-3 lg:px-4 lg:py-4 border-b transition-all duration-200 z-10 ${isScrolled ? 'shadow-md border-transparent bg-white/95 backdrop-blur-sm' : 'border-slate-200 bg-slate-50'} flex items-center gap-3 lg:gap-4 sticky top-0`}
                  >
                    {/* Back Button (Mobile Only) */}
                    <button
                      onClick={() => setSelectedApp(null)}
                      className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex-1 flex justify-between items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-slate-900">Application Details</h2>
                        {/* Interactive status pill — opens menu to change status */}
                        <div className="relative">
                          <StatusPill
                            status={selectedApp.status || 'analyzed'}
                            onClick={() => setStatusMenuOpen(statusMenuOpen === 'detail' ? null : 'detail')}
                          />
                          {statusMenuOpen === 'detail' && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[180px]"
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => handleStatusUpdate(selectedApp._id, opt)}
                                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 flex items-center gap-2 ${
                                    selectedApp.status === opt ? 'bg-slate-50' : ''
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      TONE_CLASSES[STATUS_META[opt].tone].split(' ')[0].replace('bg-', 'bg-')
                                    }`}
                                  />
                                  {STATUS_META[opt].label}
                                  {selectedApp.status === opt && (
                                    <CheckCircle className="w-3 h-3 ml-auto text-indigo-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Re-run analysis — refreshes fitScore + analysis using
                            the same resume + job. Useful when prompts/models
                            have been upgraded since the original run. */}
                        <button
                          type="button"
                          onClick={handleReanalyze}
                          disabled={reanalyzing}
                          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Re-run analysis (10 credits)"
                        >
                          <RefreshCw className={`w-3 h-3 ${reanalyzing ? 'animate-spin' : ''}`} />
                          {reanalyzing ? 'Re-running…' : 'Re-run (10 cr)'}
                        </button>

                        {/* Compare with… — only shows other applications for the
                            same job, since cross-job comparison is apples-to-
                            oranges. Disabled when there's nothing to compare. */}
                        {(() => {
                          const sameJobOthers = applications.filter(
                            (a) =>
                              a._id !== selectedApp._id &&
                              (a.jobId?._id || a.jobId) ===
                                (selectedApp.jobId?._id || selectedApp.jobId)
                          );
                          if (sameJobOthers.length === 0) return null;
                          return (
                            <div className="relative hidden sm:block">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCompareMenuOpen(!compareMenuOpen);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
                                title="Compare with another analysis for the same job"
                              >
                                <GitCompare className="w-3 h-3" />
                                Compare
                                <ChevronDown className="w-3 h-3 opacity-60" />
                              </button>
                              {compareMenuOpen && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute top-full right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[260px] max-h-[280px] overflow-y-auto"
                                >
                                  <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
                                    Compare against
                                  </div>
                                  {sameJobOthers.map((other) => (
                                    <button
                                      key={other._id}
                                      onClick={() => {
                                        setCompareMenuOpen(false);
                                        navigate(`/compare/${selectedApp._id}/${other._id}`);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between gap-3"
                                    >
                                      <div className="flex flex-col leading-tight min-w-0">
                                        <span className="text-slate-700 truncate">
                                          Resume from {formatRelativeDate(other.resumeId?.createdAt)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 truncate">
                                          Run {formatRelativeDate(other.createdAt)}
                                        </span>
                                      </div>
                                      {typeof other.fitScore === 'number' && (
                                        <span
                                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            other.fitScore >= 80
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : other.fitScore >= 50
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-red-100 text-red-700'
                                          }`}
                                        >
                                          {other.fitScore}%
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <div className="text-xs text-slate-500 hidden sm:flex flex-col items-end leading-tight">
                          <span title={new Date(selectedApp.createdAt).toLocaleString()}>
                            {formatRelativeDate(selectedApp.createdAt)}
                          </span>
                          {selectedApp.resumeId?.createdAt && (
                            <span className="text-[10px] text-slate-400">
                              Resume from {formatRelativeDate(selectedApp.resumeId.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="p-3 space-y-6 lg:p-6 lg:space-y-8 lg:overflow-y-auto custom-scrollbar lg:flex-1"
                    onScroll={(e) => setIsScrolled(e.target.scrollTop > 0)}
                  >
                    {selectedApp.fitAnalysis && (
                      <div className="mb-8 space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 items-center flex gap-2">
                          <Sparkles className="w-5 h-5 text-indigo-500" />
                          Snapshot Analysis
                        </h3>
                        <NextBestAction
                          fitScore={selectedApp.fitScore}
                          fitAnalysis={selectedApp.fitAnalysis}
                          application={selectedApp}
                          onGenerateCV={handleGenerateCV}
                          onGenerateCoverLetter={handleGenerateCoverLetter}
                          onGenerateInterview={handleGenerateInterview}
                          onGenerateBundle={handleGenerateBundle}
                          onView={() => navigate(`/resume/${selectedApp.draftCVId || selectedApp._id}`)}
                          generatingCV={generatingCV}
                          generatingCL={generatingCL}
                          generatingInterview={generatingInterview}
                          cvGenStatus={cvGenStatus}
                        />
                        <JobRequirementsCard
                          fitAnalysis={selectedApp.fitAnalysis}
                          jobTitle={selectedApp.jobTitle}
                          jobCompany={selectedApp.jobCompany}
                        />
                        <FitScoreCard
                          fitScore={selectedApp.fitScore}
                          fitAnalysis={selectedApp.fitAnalysis}
                          actionPlan={selectedApp.actionPlan}
                          optimizedFitScore={selectedApp.optimizedFitScore}
                          applicationId={selectedApp._id}
                        />
                      </div>
                    )}

                    {/* Generated Assets */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 items-center flex gap-2 mb-4">
                        <Briefcase className="w-5 h-5 text-indigo-500" />
                        Generated Assets
                      </h3>

                      {/* CV + Cover Letter — compact 2-column row. Both are
                          "click to view" assets that open in dedicated pages,
                          so the cards just need state + a single CTA. */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        {/* CV Card */}
                        <div className={`p-4 rounded-xl border ${(selectedApp.optimizedCV || selectedApp.draftCVId) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className={`w-4 h-4 ${(selectedApp.optimizedCV || selectedApp.draftCVId) ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span className="text-sm font-semibold text-slate-700">Optimized CV</span>
                          </div>
                          {(selectedApp.optimizedCV || selectedApp.draftCVId) ? (
                            <button
                              onClick={() => navigate(`/resume/${selectedApp.draftCVId || selectedApp._id}?tab=resume`)}
                              className="w-full mt-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" /> View & Download
                            </button>
                          ) : (
                            <button
                              onClick={handleGenerateCV}
                              disabled={generatingCV}
                              className={`w-full mt-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                generatingCV ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {generatingCV ? (
                                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                              ) : (
                                <><Sparkles className="w-3.5 h-3.5" /> Generate (10 Credits)</>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Cover Letter Card */}
                        <div className={`p-4 rounded-xl border ${selectedApp.coverLetter ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Mail className={`w-4 h-4 ${selectedApp.coverLetter ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-sm font-semibold text-slate-700">Cover Letter</span>
                          </div>
                          {selectedApp.coverLetter ? (
                            <button
                              onClick={() => navigate(`/resume/${selectedApp.draftCVId || selectedApp._id}?tab=cover-letter`)}
                              className="w-full mt-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" /> View & Download
                            </button>
                          ) : (
                            <button
                              onClick={handleGenerateCoverLetter}
                              disabled={generatingCL}
                              className={`w-full mt-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                generatingCL ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {generatingCL ? (
                                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                              ) : (
                                <><Sparkles className="w-3.5 h-3.5" /> Generate (5 Credits)</>
                              )}
                            </button>
                          )}
                          {/* Fact-check warnings — claims the letter makes that
                              the resume doesn't directly support. Non-blocking. */}
                          {selectedApp.coverLetter && selectedApp.coverLetterWarnings?.length > 0 && (
                            <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                              <div className="font-bold uppercase tracking-wide mb-1">
                                Verify before sending
                              </div>
                              <ul className="space-y-0.5 list-disc pl-3">
                                {selectedApp.coverLetterWarnings.slice(0, 5).map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Interview Prep entry point — links to the dedicated
                          /interview-prep/:applicationId page where users can
                          drill into questions + answers + skill talking points
                          and add personal notes. Replaces the previously inline
                          two-column section that lived here. */}
                      {selectedApp.interviewPrep?.jobQuestions?.length > 0 ||
                      selectedApp.interviewPrep?.skillsWithEvidence?.length > 0 ||
                      selectedApp.interviewQuestions?.length > 0 ? (
                        <Link
                          to={`/interview-prep/${selectedApp._id}`}
                          className="rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-colors p-4 flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-white text-indigo-600 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-900">
                              Interview prep ready
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {(selectedApp.interviewPrep?.jobQuestions?.length ||
                                selectedApp.interviewQuestions?.length ||
                                0)}{' '}
                              question
                              {(selectedApp.interviewPrep?.jobQuestions?.length ||
                                selectedApp.interviewQuestions?.length ||
                                0) === 1
                                ? ''
                                : 's'}
                              {selectedApp.interviewPrep?.skillsWithEvidence?.length > 0 &&
                                ` · ${selectedApp.interviewPrep.skillsWithEvidence.length} skills with talking points`}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-700 transition-colors shrink-0" />
                        </Link>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white text-slate-400 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-900">
                              Interview prep
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Generate likely questions + suggested answers tailored to your CV and this role.
                            </p>
                          </div>
                          <button
                            onClick={handleGenerateInterview}
                            disabled={generatingInterview}
                            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              generatingInterview
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {generatingInterview ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />{' '}
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" /> Generate (5 cr)
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                  <Briefcase className="w-12 h-12 mb-4 opacity-50" />
                  <p>Select an application to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setDeleteModalOpen(false);
              setApplicationToDelete(null);
            }
          }}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />

        <MetricCaptureModal
          isOpen={metricCapture.isOpen}
          vagueBullets={metricCapture.vagueBullets}
          primaryLabel={metricCapture.mode === 'bundle' ? 'Generate full kit' : 'Generate CV'}
          onSubmit={handleMetricCaptureSubmit}
          onCancel={handleMetricCaptureCancel}
        />
      </main>
    </div>
  );
};

export default JobHistory;
