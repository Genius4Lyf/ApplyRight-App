import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  Eye,
  ChevronDown,
  Search,
  RefreshCw,
  GitCompare,
  ChevronRight,
  FileSearch,
  ArrowUpDown,
  Check,
  Wrench,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Plus,
  Layers,
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
import JobRequirementsCard from '../components/JobRequirementsCard';
import CreditGate from '../components/CreditGate';
import { CREDIT_COSTS } from '../lib/credits';
import MetricCaptureModal from '../components/MetricCaptureModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import JobPostingDrawer from '../components/JobPostingDrawer';
import {
  getPrepSummary,
  hasInterviewPrep,
  mergeInterviewPrepResponse,
} from '../utils/interviewPrep';
import { toast } from 'sonner';
import CardDeck from '../components/ui/CardDeck';
import ViewToggle from '../components/ui/ViewToggle';
import WorkspaceSkeleton from '../components/ui/WorkspaceSkeleton';
import NoteCard from '../components/ui/NoteCard';
import { momentumStats, nextMove, bandOf } from '../lib/applicationInsights';
import { BAND_TEXT, BAND_RULEBG, NEXT_TONE, PAPER_CARD, RULED_PAPER } from '../lib/noteStyles';

// Maps a nextMove icon name to its lucide component. The band/next-move color
// tokens and paper-note chrome now live in ../lib/noteStyles (imported above)
// so the list rows, deck notes, and the shared NoteCard stay in lockstep.
const NEXT_ICON = { Wrench, TrendingUp, Mail, CheckCircle2, ArrowRight };

// Derive every display value a note/row needs from one application record.
const deriveApp = (a) => {
  const title = a.jobId?.title || a.jobTitle || 'Unknown Role';
  const company = a.jobId?.company || a.jobCompany || 'Unknown Company';
  const score = a.optimizedFitScore ?? a.fitScore;
  const band = bandOf(score);
  const improved =
    typeof a.optimizedFitScore === 'number' &&
    typeof a.fitScore === 'number' &&
    a.optimizedFitScore > a.fitScore;
  return { title, company, score, band, improved, mv: nextMove(a) };
};

/**
 * Reusable section header for the application detail panel. Gives each major
 * group (Snapshot Analysis, Generated Assets) a consistent title + subtitle +
 * subtle bottom border so cards inside don't visually run into each other.
 */
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
    {Icon && (
      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4" />
      </div>
    )}
    <div className="min-w-0">
      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{subtitle}</p>
      )}
    </div>
  </div>
);

/**
 * Modern custom sort dropdown — replaces the native <select> (which renders the
 * OS default style and can't be themed). Click-outside + Escape to close, with
 * a check mark on the active option. Full-width on mobile, fixed width on sm+.
 */
const SortDropdown = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find((o) => o.id === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative w-full sm:w-56 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ArrowUpDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="truncate">{current.label}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg shadow-slate-900/5 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {options.map((opt) => {
            const active = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-left transition-colors ${
                  active
                    ? 'text-indigo-600 dark:text-indigo-300 font-semibold bg-indigo-50/60 dark:bg-indigo-500/10'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
                {active && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const JobHistory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatingCV, setGeneratingCV] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(false);
  const [generatingInterview, setGeneratingInterview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  // Deck vs list, remembered across visits. Deck is the default first impression.
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('appsView') === 'list' ? 'list' : 'deck';
    } catch (_) {
      return 'deck';
    }
  });
  const [compareMenuOpen, setCompareMenuOpen] = useState(false);
  const [cvGenStatus, setCvGenStatus] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [jobDrawerOpen, setJobDrawerOpen] = useState(false);
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
      // Deep-link: /history?app=<id> preselects that application (e.g. arriving
      // from the interview page's "generate your CV" prompt).
      const preselectId = searchParams.get('app');
      if (preselectId) {
        const match = res.data.find((a) => a._id === preselectId);
        if (match) setSelectedApp(match);
      }
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

  // Opens an application into the full-width detail view. Same behavior the old
  // list rows had inline — extracted so the deck and list share one code path.
  const openApp = (app) => {
    setSelectedApp(app);
    setSelectedTemplate(app.templateId || 'ats-clean');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewChange = (v) => {
    setView(v);
    try {
      localStorage.setItem('appsView', v);
    } catch (_) {
      /* private mode — non-critical */
    }
  };

  const filteredApplications = applications
    .filter((app) => {
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
      toast.error(
        `Insufficient credits. Need ${err.response.data.required}, have ${err.response.data.current}.`
      );
      return;
    }
    if (err.response?.status === 503 && code === 'AI_UNAVAILABLE') {
      toast.error(
        'AI is temporarily unavailable. You have not been charged. Please try again in a moment.'
      );
      return;
    }
    if (err.response?.status === 409 && code === 'GENERATION_IN_PROGRESS') {
      toast.error('A CV generation is already running for this application.');
      return;
    }
    if (err.response?.status === 422 && code === 'NO_CV_GROUNDING') {
      toast.error(err.response.data.message);
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
      mode === 'bundle' ? 'Failed to start bundle generation.' : 'Failed to start CV generation.';

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
      window.dispatchEvent(
        new CustomEvent('credit_updated', { detail: res.data.remainingCredits })
      );
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
      updateSelectedApp(mergeInterviewPrepResponse(selectedApp, res.data));
      toast.success('Interview prep generated!');
      window.dispatchEvent(
        new CustomEvent('credit_updated', { detail: res.data.remainingCredits })
      );
    } catch (err) {
      // Same recovery pattern — backend may have saved even if request appeared to fail.
      try {
        const recovery = await api.get(`/applications/${selectedApp._id}`);
        if (hasInterviewPrep(recovery.data)) {
          updateSelectedApp(recovery.data);
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
        window.dispatchEvent(
          new CustomEvent('credit_updated', { detail: res.data.remainingCredits })
        );
      }
      toast.success(`Re-analyzed: ${res.data.fitScore}% match`);
    } catch (err) {
      handleAssetGenError(err, 'Failed to re-run analysis.');
    } finally {
      setReanalyzing(false);
    }
  };

  // Deck shows the 10 most-recent applications, newest-first, independent of the
  // list view's search/sort state.
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  // A single application as a paper note for the deck — a thin wrapper over the
  // shared NoteCard (which owns the tap-vs-drag guard, spiral binding, stamp,
  // ruled verdict, band rail, and footer). Tapping opens it.
  const renderNote = (a) => {
    const { title, company, score, band, improved, mv } = deriveApp(a);
    return (
      <NoteCard
        band={band}
        stamp={{
          value: score == null ? '—' : score,
          label: 'Match',
          sub: improved ? `↑ from ${a.fitScore}` : undefined,
        }}
        eyebrow={`${company} · ${formatRelativeDate(a.createdAt)}`}
        title={title}
        verdict={a.fitAnalysis?.overallFeedback}
        nextMove={{ label: mv.label, tone: mv.tone, Icon: NEXT_ICON[mv.icon] || ArrowRight }}
        onOpen={() => openApp(a)}
      />
    );
  };

  // A single application as a dense editorial row for the list view.
  const renderRow = (app) => {
    const { title, company, score, band, mv } = deriveApp(app);
    const NextIcon = NEXT_ICON[mv.icon] || ArrowRight;
    return (
      <div
        key={app._id}
        role="button"
        tabIndex={0}
        aria-label={`Open ${title} at ${company}`}
        onClick={() => openApp(app)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openApp(app);
          }
        }}
        className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 pl-5 sm:p-5 sm:pl-6 cursor-pointer transition-colors hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-500/50"
      >
        {/* Band left edge */}
        <span
          aria-hidden="true"
          className={`absolute left-0 top-0 bottom-0 w-[3px] ${BAND_RULEBG[band]}`}
        />

        {/* Score */}
        <div className="text-center min-w-[3rem]">
          <div
            className={`font-heading text-xl sm:text-2xl font-bold tabular-nums leading-none ${BAND_TEXT[band]}`}
          >
            {score == null ? '—' : `${score}%`}
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            Match
          </div>
        </div>

        {/* Role + next move */}
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 truncate">
            {company} · {formatRelativeDate(app.createdAt)}
          </p>
          <h3 className="mt-0.5 font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h3>
          <span
            className={`mt-1 inline-flex max-w-full items-center gap-1.5 text-xs sm:text-sm font-semibold ${NEXT_TONE[mv.tone]}`}
          >
            <NextIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{mv.label}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={(e) => handleDelete(e, app._id)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-all sm:opacity-0 sm:group-hover:opacity-100"
            title="Delete application"
            aria-label="Delete application"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <span className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-300 whitespace-nowrap group-hover:gap-2 transition-all">
            Open
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-8 pb-8">
        {loading ? (
          <WorkspaceSkeleton />
        ) : applications.length === 0 ? (
          /* Editorial empty state — a clear desk, with the one action that
             starts everything. */
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-14 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Your desk is clear
            </p>
            <h3 className="mt-3 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
              No applications yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Analyze a role to see how your CV measures up — then tailor it, draft a cover letter,
              and prep for the interview.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Analyze your first role
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : !selectedApp ? (
          /* List state — a two-column workspace: identity + momentum rail on the
             left, the deck (or dense list) on the right. Clicking any item swaps
             the whole page to the detail view below. */
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 lg:gap-12 items-stretch pb-8">
            {/* LEFT RAIL */}
            <div className="flex flex-col">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Your job hunt
              </p>
              <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900 dark:text-slate-100">
                Applications
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Every role you&apos;ve analyzed, most recent first.
              </p>

              {/* Momentum — vertical list on desktop */}
              <div className="mt-8 hidden lg:block">
                {momentumStats(applications).map((s, i) => (
                  <div
                    key={s.label}
                    className={`flex items-baseline justify-between py-3.5 border-b border-slate-200 dark:border-slate-700 ${
                      i === 0 ? 'border-t' : ''
                    }`}
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                      {s.label}
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums ${
                        s.tone === 'ok'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Momentum — 2×2 grid on mobile */}
              <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 lg:hidden">
                {momentumStats(applications).map((s) => (
                  <div
                    key={s.label}
                    className="px-4 py-3 border-slate-200 dark:border-slate-700 [&:nth-child(2)]:border-l [&:nth-child(4)]:border-l [&:nth-child(3)]:border-t [&:nth-child(4)]:border-t"
                  >
                    <div
                      className={`text-2xl font-bold tabular-nums ${
                        s.tone === 'ok'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {s.value}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* View toggle + new-role CTA — natural position under the stats */}
              <div className="mt-6 space-y-3">
                <ViewToggle value={view} onChange={handleViewChange} className="w-full" />
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Analyze a new role
                </button>
              </div>
            </div>

            {/* RIGHT MAIN */}
            <div className="min-w-0">
              {view === 'deck' ? (
                <CardDeck
                  items={recentApps}
                  getKey={(a) => a._id}
                  renderItem={renderNote}
                  cardClassName={PAPER_CARD}
                  label="10 most recent"
                />
              ) : (
                /* List view — keeps search + sort */
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by job title or company"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 focus:border-indigo-300 transition-colors"
                      />
                    </div>
                    <SortDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
                  </div>

                  {filteredApplications.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                      {searchQuery.trim()
                        ? 'No applications match your search.'
                        : 'No applications yet.'}
                    </div>
                  ) : (
                    filteredApplications.map(renderRow)
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Focused detail view — takes the full page width so nothing is
             crammed into a side panel. The whole page scrolls naturally. */
          <div className="pb-8">
            <button
              onClick={() => setSelectedApp(null)}
              className="inline-flex items-center gap-1.5 mb-6 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to applications
            </button>
            <div className="animate-in fade-in duration-300">
              {/* Editorial header — the role is the title; a hairline border,
                  not a filled bar. */}
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-700 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-indigo-800 dark:text-indigo-300">
                    Application
                  </p>
                  <h1 className="mt-1 font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {selectedApp.jobId?.title || selectedApp.jobTitle || 'Application'}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {(selectedApp.jobId?.company || selectedApp.jobCompany) &&
                      `${selectedApp.jobId?.company || selectedApp.jobCompany} · `}
                    analyzed {formatRelativeDate(selectedApp.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:shrink-0">
                  {/* View the original job posting this analysis ran
                          against. Reference-only drawer; data already rides
                          on the populated jobId. Shown on mobile too. */}
                  <button
                    type="button"
                    onClick={() => setJobDrawerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="View the original job posting"
                  >
                    <FileSearch className="w-3.5 h-3.5" />
                    Job posting
                  </button>

                  {/* Re-run analysis — refreshes fitScore + analysis using
                          the same resume + job. Useful when prompts/models
                          have been upgraded since the original run. */}
                  <button
                    type="button"
                    onClick={handleReanalyze}
                    disabled={reanalyzing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Re-run analysis (10 credits)"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin' : ''}`} />
                    {reanalyzing ? 'Re-running…' : 'Re-run (10 cr)'}
                  </button>

                  {/* Compare with… — only shows other applications for the
                          same job, since cross-job comparison is apples-to-
                          oranges. Disabled when there's nothing to compare. */}
                  {(() => {
                    const sameJobOthers = applications.filter(
                      (a) =>
                        a._id !== selectedApp._id &&
                        (a.jobId?._id || a.jobId) === (selectedApp.jobId?._id || selectedApp.jobId)
                    );
                    if (sameJobOthers.length === 0) return null;
                    return (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompareMenuOpen(!compareMenuOpen);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          title="Compare with another analysis for the same job"
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                          Compare
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>
                        {compareMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-full right-0 mt-1 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[260px] max-h-[280px] overflow-y-auto"
                          >
                            <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                              Compare against
                            </div>
                            {sameJobOthers.map((other) => (
                              <button
                                key={other._id}
                                onClick={() => {
                                  setCompareMenuOpen(false);
                                  navigate(`/compare/${selectedApp._id}/${other._id}`);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between gap-3"
                              >
                                <div className="flex flex-col leading-tight min-w-0">
                                  <span className="text-slate-700 dark:text-slate-300 truncate">
                                    Resume from {formatRelativeDate(other.resumeId?.createdAt)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                    Run {formatRelativeDate(other.createdAt)}
                                  </span>
                                </div>
                                {typeof other.fitScore === 'number' && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      other.fitScore >= 80
                                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : other.fitScore >= 50
                                          ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                          : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300'
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
                  <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:flex flex-col items-end leading-tight">
                    <span title={new Date(selectedApp.createdAt).toLocaleString()}>
                      {formatRelativeDate(selectedApp.createdAt)}
                    </span>
                    {selectedApp.resumeId?.createdAt && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Resume from {formatRelativeDate(selectedApp.resumeId.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Wayfinders — thin anchor links, mono/indigo, no buttons. */}
              <div className="mt-4 mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[0.7rem] uppercase tracking-[0.16em]">
                {selectedApp.fitAnalysis && (
                  <a
                    href="#analysis"
                    className="text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 transition-colors"
                  >
                    See what to fix ↓
                  </a>
                )}
                <a
                  href="#toolkit"
                  className="text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 transition-colors"
                >
                  My CV toolkit ↓
                </a>
              </div>

              <div className="space-y-8 sm:space-y-10">
                {selectedApp.fitAnalysis && (
                  <section className="space-y-5 sm:space-y-6">
                    <JobRequirementsCard
                      fitAnalysis={selectedApp.fitAnalysis}
                      jobTitle={selectedApp.jobTitle}
                      jobCompany={selectedApp.jobCompany}
                    />
                    <div id="analysis" className="scroll-mt-24">
                      <FitScoreCard
                        fitScore={selectedApp.fitScore}
                        fitAnalysis={selectedApp.fitAnalysis}
                        actionPlan={selectedApp.actionPlan}
                        optimizedFitScore={selectedApp.optimizedFitScore}
                        applicationId={selectedApp._id}
                      />
                    </div>
                  </section>
                )}

                {/* My CV toolkit — the ready-to-use assets. */}
                <section id="toolkit" className="scroll-mt-24 space-y-4 sm:space-y-5">
                  <div>
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-indigo-800 dark:text-indigo-300">
                      Ready to use · now that you&apos;ve read the analysis
                    </p>
                    <h2 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                      My CV toolkit
                    </h2>
                  </div>

                  {/* Discounted bundle — a subtle one-tap shortcut, only offered
                          before anything has been generated. */}
                  {!selectedApp.optimizedCV &&
                    !selectedApp.draftCVId &&
                    !selectedApp.coverLetter &&
                    !hasInterviewPrep(selectedApp) && (
                      <CreditGate cost={CREDIT_COSTS.GENERATE_BUNDLE}>
                        <button
                          type="button"
                          onClick={handleGenerateBundle}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors text-left"
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Generate the full kit
                              </span>
                              <span className="block text-xs text-slate-500 dark:text-slate-400">
                                CV, cover letter &amp; interview prep in one go
                              </span>
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                            18 cr{' '}
                            <span className="text-emerald-600 dark:text-emerald-400">(save 2)</span>
                          </span>
                        </button>
                      </CreditGate>
                    )}

                  {/* CV + Cover Letter — flat hairline cards. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* CV Card */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Optimized CV
                        </span>
                        {(selectedApp.optimizedCV || selectedApp.draftCVId) && (
                          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                          </span>
                        )}
                      </div>
                      {selectedApp.optimizedCV || selectedApp.draftCVId ? (
                        <button
                          onClick={() =>
                            navigate(
                              `/resume/${selectedApp.draftCVId || selectedApp._id}?tab=resume`
                            )
                          }
                          className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View &amp; Download
                        </button>
                      ) : (
                        <button
                          onClick={handleGenerateCV}
                          disabled={generatingCV}
                          className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            generatingCV
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {generatingCV ? (
                            <>
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />{' '}
                              Generating…
                            </>
                          ) : (
                            'Generate · 10 credits'
                          )}
                        </button>
                      )}
                      {/* Optional live progress — keeps the rich pipeline feedback. */}
                      {generatingCV && cvGenStatus && (
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.1em] tabular-nums text-slate-500 dark:text-slate-400">
                            <span className="truncate">
                              {cvGenStatus.stageMessage || cvGenStatus.stage}
                            </span>
                            {typeof cvGenStatus.progress === 'number' && (
                              <span>{cvGenStatus.progress}%</span>
                            )}
                          </div>
                          <div className="mt-1 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-1 rounded-full bg-indigo-500 transition-all"
                              style={{ width: `${cvGenStatus.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cover Letter Card */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Cover Letter
                        </span>
                        {selectedApp.coverLetter && (
                          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                          </span>
                        )}
                      </div>
                      {selectedApp.coverLetter ? (
                        <button
                          onClick={() =>
                            navigate(
                              `/resume/${selectedApp.draftCVId || selectedApp._id}?tab=cover-letter`
                            )
                          }
                          className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View &amp; Download
                        </button>
                      ) : (
                        <button
                          onClick={handleGenerateCoverLetter}
                          disabled={generatingCL}
                          className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            generatingCL
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {generatingCL ? (
                            <>
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />{' '}
                              Generating…
                            </>
                          ) : (
                            'Generate · 5 credits'
                          )}
                        </button>
                      )}
                      {/* Fact-check warnings — flat amber-accented note, not a filled box. */}
                      {selectedApp.coverLetter && selectedApp.coverLetterWarnings?.length > 0 && (
                        <div className="mt-3 border-l-2 border-amber-500 pl-3">
                          <div className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400 mb-1">
                            Verify before sending
                          </div>
                          <ul className="space-y-0.5 list-disc pl-3 text-[11px] text-slate-600 dark:text-slate-300">
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
                          and add personal notes. */}
                  {hasInterviewPrep(selectedApp) ? (
                    <Link
                      to={`/interview-prep/${selectedApp._id}`}
                      className="group flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Interview prep
                          </h4>
                          <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {getPrepSummary(selectedApp)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Interview prep
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Generate likely questions + suggested answers tailored to your CV and this
                          role.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateInterview}
                        disabled={generatingInterview}
                        className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          generatingInterview
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {generatingInterview ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />{' '}
                            Generating…
                          </>
                        ) : (
                          'Generate · 5 cr'
                        )}
                      </button>
                    </div>
                  )}
                </section>
              </div>
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

        <JobPostingDrawer
          isOpen={jobDrawerOpen}
          onClose={() => setJobDrawerOpen(false)}
          job={selectedApp?.jobId}
        />
      </main>
    </div>
  );
};

export default JobHistory;
