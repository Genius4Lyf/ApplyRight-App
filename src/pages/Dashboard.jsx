import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import CVUploader from '../components/CVUploader';
import JobLinkInput from '../components/JobLinkInput';
import Preview from './Preview';
import api from '../services/api';
import CVService from '../services/cv.service';
import useInterstitial from '../hooks/useInterstitial';
import {
  Sparkles,
  LogOut,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  User,
  Briefcase,
  FileText,
  Plus,
  Upload as UploadIcon,
  Clock,
  PenTool,
  Trash2,
  Eye,
  X,
  Zap,
  PlayCircle,
  Mail,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import GlobalBanner from '../components/GlobalBanner';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';
import CreditGate from '../components/CreditGate';
import { CREDIT_COSTS } from '../lib/credits';
import { isMobile } from '../utils/platform';
import { signalReady } from '../utils/splash';
import FitScoreCard from '../components/FitScoreCard';
import NextBestAction from '../components/NextBestAction';
import JobRequirementsCard from '../components/JobRequirementsCard';
import DashboardTour from '../components/dashboard/DashboardTour';
import MonetagBanner from '../components/MonetagBanner';
import MetricCaptureModal from '../components/MetricCaptureModal';
import {
  getPrepId,
  getPrepSummary,
  hasInterviewPrep,
  mergeInterviewPrepResponse,
} from '../utils/interviewPrep';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerInterstitial } = useInterstitial();
  const [showProfileBanner, setShowProfileBanner] = useState(false);

  useEffect(() => {
    if (location.state?.showProfilePrompt) {
      setShowProfileBanner(true);
      // Clear the state without reloading to prevent persisting on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const [resume, setResume] = useState(null);
  const [job, setJob] = useState(null);
  const [application, setApplication] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  // Template choice was state in an earlier iteration; the picker UI was
  // removed but the value is still threaded into PDF generation calls below.
  const selectedTemplate = 'ats-clean';
  const [showAutoAnalyzeModal, setShowAutoAnalyzeModal] = useState(false);

  // Asset generation loading states
  const [generatingCV, setGeneratingCV] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(false);
  const [generatingInterview, setGeneratingInterview] = useState(false);
  // Holds the asset that was *just* generated so NextBestAction can show a
  // dedicated completion card instead of immediately rotating to the next
  // action. User dismisses explicitly via View or Next.
  const [justCompleted, setJustCompleted] = useState(null); // 'cv' | 'coverLetter' | 'interview'
  // Live progress from the async CV generation pipeline (stage, %, message).
  const [cvGenStatus, setCvGenStatus] = useState(null);
  // Poll handle for the CV generation status endpoint
  const cvPollRef = useRef(null);

  // Metric-capture modal — shown between Generate click and the actual request
  // when the preflight surfaces bullets that lack concrete numbers. `mode`
  // remembers which generate path to resume after the user submits/cancels.
  const [metricCapture, setMetricCapture] = useState({
    isOpen: false,
    vagueBullets: [],
    mode: null, // 'cv' | 'bundle'
  });

  // Cleanup any in-flight poll on unmount
  useEffect(() => {
    return () => {
      if (cvPollRef.current) clearInterval(cvPollRef.current);
    };
  }, []);

  // New Feature State
  const [workflowMode, setWorkflowMode] = useState(null); // 'upload' (optimize), 'create-upload' (new feature)
  const [myDrafts, setMyDrafts] = useState([]);
  // True until the first drafts fetch resolves. Drives the dashboard skeleton
  // and also gates the Capacitor splash (via signalReady) on mobile so the app
  // doesn't flash an empty dashboard between splash-hide and first paint.
  const [initialLoading, setInitialLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [scanSuccessDraftId, setScanSuccessDraftId] = useState(null);
  const [scanATSReadiness, setScanATSReadiness] = useState(null);
  // Scanning indicator below was wired to a setter that was removed when the
  // upload-and-create flow went async; keeping the variable as a constant
  // preserves the (currently dead) loading branch in case it's resurrected.
  const scanning = false;

  // Get user from local storage
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  useEffect(() => {
    loadDrafts({ initial: true });
  }, []);

  const loadDrafts = async ({ initial = false } = {}) => {
    try {
      const drafts = await CVService.getMyDrafts();
      setMyDrafts(drafts);
    } catch (error) {
      console.error('Failed to load drafts', error);
    } finally {
      if (initial) {
        setInitialLoading(false);
        signalReady();
      }
    }
  };

  const confirmDelete = async () => {
    try {
      await CVService.deleteDraft(draftToDelete._id);
      toast.success('CV deleted successfully');
      setDeleteModalOpen(false);
      setDraftToDelete(null);
      loadDrafts(); // Reload the list
    } catch (error) {
      console.error('Failed to delete draft', error);
      toast.error('Failed to delete CV');
    }
  };

  // Helper to update credits globally (Navbar + Local State)
  const updateCredits = (newBalance) => {
    // console.log('🔄 Dashboard: Updating credits to:', newBalance);

    // 1. Dispatch event for Navbar
    window.dispatchEvent(new CustomEvent('credit_updated', { detail: newBalance }));
    // console.log('📡 Dashboard: Dispatched credit_updated event with:', newBalance);

    // 2. Update local state
    setUser((prev) => ({ ...prev, credits: newBalance }));

    // 3. Update local storage (so it persists on refresh)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    currentUser.credits = newBalance;
    localStorage.setItem('user', JSON.stringify(currentUser));
  };

  // Auto-analyze when both resume and job are available AND setting is enabled.
  // Deliberately depends only on [resume, job] — we want a single auto-trigger
  // when the upload pair completes, not extra re-runs when fitResult clears
  // (which would loop) or when the user setting flips (the user is consenting
  // ahead of time, not retroactively).
  useEffect(() => {
    const analyzeFit = async () => {
      const shouldAutoRun = user?.settings?.autoGenerateAnalysis === true;

      if (resume && job && !fitResult && shouldAutoRun) {
        performAnalysis();
      }
    };

    analyzeFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, job]);

  const performAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post('/analysis/analyze', {
        resumeId: resume._id,
        jobId: job._id,
      });
      setFitResult(res.data);
      // Store applicationId so we can call asset generation endpoints
      setApplication({ _id: res.data.applicationId, applicationId: res.data.applicationId });
      if (res.data.job) {
        setJob(res.data.job);
      }
      if (res.data.remainingCredits !== undefined) {
        updateCredits(res.data.remainingCredits);
      }
      return res.data;
    } catch (error) {
      if (error.response?.status === 403 && error.response.data.code === 'INSUFFICIENT_CREDITS') {
        handleInsufficientCredits(error.response.data.required, error.response.data.current);
        setAnalyzing(false);
        return;
      }
      console.error('Analysis failed', error);
      throw error;
    } finally {
      setAnalyzing(false);
    }
  };

  const enableAutoAnalysis = async () => {
    try {
      const updatedSettings = { ...user.settings, autoGenerateAnalysis: true };
      const res = await api.put('/auth/profile', {
        settings: updatedSettings,
      });

      // Update local state and storage
      const updatedUser = { ...user, settings: res.data.settings };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Auto-analysis enabled for future jobs!');
      setShowAutoAnalyzeModal(false);
    } catch (error) {
      console.error('Failed to update settings', error);
      toast.error('Failed to save setting');
    }
  };

  const handleAnalyze = async () => {
    if (!resume || !job) return;
    try {
      const result = await performAnalysis();
      if (result) {
        toast.success('Analysis complete!');
        setTimeout(() => {
          document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        // Prompt for Auto-Analysis if currently disabled
        if (!user?.settings?.autoGenerateAnalysis) {
          setShowAutoAnalyzeModal(true);
        }
      }
    } catch {
      // Error handled in performAnalysis
    }
  };

  // Asset generation handlers
  // Maps API errors to user-facing toasts/modals consistently across asset gen.
  const handleAssetGenError = (error, fallbackMessage) => {
    const code = error.response?.data?.code;
    if (error.response?.status === 403 && code === 'INSUFFICIENT_CREDITS') {
      handleInsufficientCredits(error.response.data.required, error.response.data.current);
      return;
    }
    if (error.response?.status === 503 && code === 'AI_UNAVAILABLE') {
      toast.error(
        'AI is temporarily unavailable. You have not been charged. Please try again in a moment.'
      );
      return;
    }
    if (error.response?.status === 409 && code === 'GENERATION_IN_PROGRESS') {
      toast.error('A CV generation is already running for this application.');
      return;
    }
    if (error.response?.status === 422 && code === 'NO_CV_GROUNDING') {
      toast.error(error.response.data.message);
      return;
    }
    toast.error(fallbackMessage);
  };

  // Polls /applications/:id every 1.5s for CV generation progress. Stops on
  // completed/failed, applies the final result to local state, refreshes the
  // credit balance, and surfaces a score-lift toast on success.
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
          setApplication((prev) => ({
            ...prev,
            optimizedCV: fresh.optimizedCV,
            draftId: fresh.draftCVId,
            draftCVId: fresh.draftCVId,
            skills: fresh.skills,
            templateId: fresh.templateId,
            fitScoreBefore: fresh.fitScore,
            fitScoreAfter: fresh.optimizedFitScore,
            optimizedFitScore: fresh.optimizedFitScore,
            status: fresh.status,
            statusUpdatedAt: fresh.statusUpdatedAt,
          }));
          // Sync credits from /billing/balance — pipeline already deducted.
          try {
            const bal = await api.get('/billing/balance');
            if (bal.data?.credits !== undefined) updateCredits(bal.data.credits);
          } catch {
            // Non-critical — UI will still re-fetch credits on next interaction.
          }
          const before = fresh.fitScore;
          const after = fresh.optimizedFitScore;
          if (typeof before === 'number' && typeof after === 'number' && after > before) {
            toast.success(`Match lifted ${before}% → ${after}%`);
          } else {
            toast.success('Optimized CV generated!');
          }
          setGeneratingCV(false);
          setCvGenStatus(null);
          setJustCompleted('cv');
        } else if (status?.stage === 'failed') {
          clearInterval(cvPollRef.current);
          cvPollRef.current = null;
          toast.error(status.error || 'CV generation failed. You have not been charged.');
          setGeneratingCV(false);
          setCvGenStatus(null);
        }
      } catch (e) {
        // Transient network failures — keep polling. We only stop on terminal
        // states reported by the server.
        console.error('CV poll error (will retry):', e.message);
      }
    }, 1500);
  };

  // Actual CV generation request. Split out from handleGenerateCV so the
  // metric-capture modal can resume the same call after the user submits.
  const startCVGeneration = async (providedMetrics) => {
    if (!application?.applicationId) return;
    setGeneratingCV(true);
    setCvGenStatus({ stage: 'extracting', progress: 5, stageMessage: 'Starting…' });
    try {
      const res = await api.post(`/analysis/${application.applicationId}/generate-cv`, {
        templateId: selectedTemplate,
        providedMetrics,
      });
      if (res.data.generationStatus) setCvGenStatus(res.data.generationStatus);
      startCVPoll(application.applicationId);
    } catch (error) {
      setGeneratingCV(false);
      setCvGenStatus(null);
      handleAssetGenError(error, 'Failed to start CV generation. Please try again.');
    }
  };

  const startBundleGeneration = async (providedMetrics) => {
    if (!application?.applicationId) return;
    setGeneratingCV(true);
    setCvGenStatus({ stage: 'extracting', progress: 5, stageMessage: 'Starting bundle…' });
    try {
      const res = await api.post(`/analysis/${application.applicationId}/generate-bundle`, {
        templateId: selectedTemplate,
        providedMetrics,
      });
      if (res.data.generationStatus) setCvGenStatus(res.data.generationStatus);
      startCVPoll(application.applicationId);
    } catch (error) {
      setGeneratingCV(false);
      setCvGenStatus(null);
      handleAssetGenError(error, 'Failed to start bundle generation. Please try again.');
    }
  };

  // Hits the preflight to find vague bullets. If any are flagged, opens the
  // metric-capture modal and defers the actual generate call until submit.
  // Preflight is best-effort: any failure falls through to direct generation.
  const handleGenerateCV = async () => {
    if (!application?.applicationId || generatingCV) return;
    try {
      const { data } = await api.post(`/analysis/${application.applicationId}/preflight-metrics`);
      const vague = data?.vagueBullets || [];
      if (vague.length > 0) {
        setMetricCapture({ isOpen: true, vagueBullets: vague, mode: 'cv' });
        return;
      }
    } catch (err) {
      console.error('Preflight failed (proceeding without metrics):', err.message);
    }
    startCVGeneration(undefined);
  };

  // Bundle: kicks off the same async pipeline as CV but the backend will also
  // generate cover letter + interview prep before charging once at 18 credits.
  const handleGenerateBundle = async () => {
    if (!application?.applicationId || generatingCV) return;
    try {
      const { data } = await api.post(`/analysis/${application.applicationId}/preflight-metrics`);
      const vague = data?.vagueBullets || [];
      if (vague.length > 0) {
        setMetricCapture({ isOpen: true, vagueBullets: vague, mode: 'bundle' });
        return;
      }
    } catch (err) {
      console.error('Preflight failed (proceeding without metrics):', err.message);
    }
    startBundleGeneration(undefined);
  };

  const handleMetricCaptureSubmit = (metrics) => {
    const { mode } = metricCapture;
    setMetricCapture({ isOpen: false, vagueBullets: [], mode: null });
    const payload = metrics && Object.keys(metrics).length > 0 ? metrics : undefined;
    if (mode === 'bundle') {
      startBundleGeneration(payload);
    } else {
      startCVGeneration(payload);
    }
  };

  const handleMetricCaptureCancel = () => {
    setMetricCapture({ isOpen: false, vagueBullets: [], mode: null });
  };

  const handleGenerateCoverLetter = async () => {
    if (!application?.applicationId) return;
    setGeneratingCL(true);
    try {
      const res = await api.post(`/analysis/${application.applicationId}/generate-cover-letter`);
      setApplication((prev) => ({ ...prev, ...res.data }));
      if (res.data.remainingCredits !== undefined) {
        updateCredits(res.data.remainingCredits);
      }
      const warnings = res.data.coverLetterWarnings || [];
      if (warnings.length > 0) {
        // Surface fact-check warnings immediately so the user verifies before
        // sending. Non-blocking — the letter is still generated and saved.
        toast.warning(
          `Cover letter generated, but ${warnings.length} claim${warnings.length === 1 ? '' : 's'} may not be supported by your resume — verify before sending.`,
          { duration: 8000 }
        );
      } else {
        toast.success('Cover letter generated!');
      }
      // Fire interstitial at this completion moment. No-op on web / paid /
      // non-eligible users; frequency caps enforced inside the hook.
      triggerInterstitial('cover_letter_generated');
      setJustCompleted('coverLetter');
    } catch (error) {
      handleAssetGenError(error, 'Failed to generate cover letter. Please try again.');
    } finally {
      setGeneratingCL(false);
    }
  };

  const handleGenerateInterview = async () => {
    if (!application?.applicationId) return;
    setGeneratingInterview(true);
    try {
      const res = await api.post(`/analysis/${application.applicationId}/generate-interview`);
      setApplication((prev) => mergeInterviewPrepResponse(prev, res.data));
      if (res.data.remainingCredits !== undefined) {
        updateCredits(res.data.remainingCredits);
      }
      toast.success('Interview prep generated!');
      setJustCompleted('interview');
    } catch (error) {
      handleAssetGenError(error, 'Failed to generate interview prep. Please try again.');
    } finally {
      setGeneratingInterview(false);
    }
  };

  // New: Insufficient Credits Modal
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(0);

  const handleInsufficientCredits = (required, current) => {
    setRequiredCredits(required);
    // Sync real balance from backend into local state
    if (current !== undefined) {
      updateCredits(current);
    }
    setShowCreditModal(true);
  };

  // "Generate New" — keep resume, reset job + analysis
  const [jobInputKey, setJobInputKey] = useState(0);

  const handleGenerateNew = () => {
    setJob(null);
    setFitResult(null);
    setApplication(null);
    setJobInputKey((k) => k + 1); // Force JobLinkInput to remount & clear
    // Scroll back up
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // "Change Resume" from the collapsed summary — reset resume + analysis,
  // keep the job so the user only needs to swap one input.
  const handleChangeResume = () => {
    setResume(null);
    setFitResult(null);
    setApplication(null);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const getStatusMessage = () => {
    if (!user.firstName) return 'Optimize Your Professional Presence';
    return `Welcome back, ${user.firstName}. Let's get you hired.`;
  };

  const getRecommendedAction = () => {
    if (!user.currentStatus)
      return 'Precision engineering for your job applications. Upload your credentials and the target role to begin the optimization process.';

    const statusMap = {
      student: `As a student in ${user.education?.discipline || 'your field'}, focusing on internships and entry-level roles is key.`,
      graduate: `Congratulations on graduating! Now let's translate that ${user.education?.discipline} degree into a career.`,
      professional: `Ready for the next step in your career? Let's highlight your experience.`,
      other: "Let's align your unique background with your target role.",
    };
    return statusMap[user.currentStatus] || statusMap['other'];
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <GlobalBanner />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 relative">
        {showProfileBanner && (
          <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
            <div
              onClick={() => navigate('/profile')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/profile');
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Enhance your profile"
              className="flex items-center gap-3 cursor-pointer flex-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">Enhance Your Profile</h3>
                <p className="text-sm text-indigo-700">
                  Complete setting up your profile to improve CV optimization.
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileBanner(false);
              }}
              className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {!user.onboardingCompleted && (
          <div
            onClick={() => navigate('/onboarding')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/onboarding');
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Complete your profile"
            className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">Complete your profile</h3>
                <p className="text-sm text-indigo-700">
                  Tell us about your goals to get personalized recommendations.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </div>
        )}

        {!workflowMode && initialLoading && <DashboardSkeleton />}

        {/* Welcome heading — only on the dashboard landing state. Once the
            user picks a workflow we hide it so the upload/job inputs aren't
            pushed below the fold by ~180px of intro copy. */}
        {!workflowMode && !initialLoading && (
          <div className="max-w-3xl mx-auto text-center mb-12 space-y-4">
            <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              Tailored for your career
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              {getStatusMessage()}
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              {getRecommendedAction()}
            </p>
          </div>
        )}

        {/* Monetag Banner - Top */}
        {/* <MonetagBanner style={{ marginBottom: '2rem' }} /> */}

        {/* Workflow Selection Cards
            "ApplyRight" is always surfaced as the recommended path so the badge
            is consistent across web and the Android/Capacitor build (it no longer
            shifts based on draft count, which made the two platforms look out of
            sync). The non-recommended card stays equally accessible; we're
            removing paralysis, not removing choice. */}
        {!workflowMode &&
          !initialLoading &&
          (() => {
            const recommendedWorkflow = 'apply';
            const RecommendedBadge = () => (
              <span className="absolute top-4 right-4 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3 h-3" />
                Recommended
              </span>
            );
            const applyIsRecommended = recommendedWorkflow === 'apply';
            const createIsRecommended = recommendedWorkflow === 'create';

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Option 1: ApplyRight */}
                <div
                  onClick={() => {
                    setResume(null);
                    setJob(null);
                    setFitResult(null);
                    setApplication(null);
                    setWorkflowMode('upload');
                    // Scroll to top so the upload area lands at the top of the
                    // viewport instead of wherever the user clicked the card.
                    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.currentTarget.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Start ApplyRight workflow"
                  className={`bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    applyIsRecommended
                      ? 'border-2 border-indigo-300 ring-2 ring-indigo-100 hover:border-indigo-400'
                      : 'border border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  {applyIsRecommended && <RecommendedBadge />}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300">
                    <UploadIcon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 relative z-10">
                    ApplyRight
                  </h3>
                  <p className="text-slate-500 leading-relaxed mb-6 relative z-10 flex-1">
                    Run a check on your target job to see if you are qualified. We will analyze the
                    requirements and tailor your CV to perfectly match the role.
                  </p>
                  <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform mt-auto">
                    Check your CV <ChevronRight className="w-5 h-5 ml-1" />
                  </div>
                </div>

                {/* Option 2: Create New */}
                <div
                  onClick={() => setShowCreateOptions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowCreateOptions(true);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Create a new CV"
                  className={`bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    createIsRecommended
                      ? 'border-2 border-indigo-300 ring-2 ring-indigo-100 hover:border-indigo-400'
                      : 'border border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  {createIsRecommended && <RecommendedBadge />}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
                  <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300">
                    <PenTool className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 relative z-10">
                    Create a new CV
                  </h3>
                  <p className="text-slate-500 leading-relaxed mb-6 relative z-10 flex-1">
                    Build a professional resume. Start from scratch or upload an existing CV to let
                    our AI do the heavy lifting.
                  </p>
                  <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform mt-auto">
                    Start Builder <ChevronRight className="w-5 h-5 ml-1" />
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Create Options Modal */}
        {showCreateOptions && (
          /* Bottom-sheet on mobile, centered card on desktop. Compact
             horizontal-row options on mobile (icon left, content right);
             stacked grid on desktop. */
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pb-[env(safe-area-inset-bottom)] sm:p-4 sm:pb-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setShowCreateOptions(false)}
                aria-label="Close"
                className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="px-5 pt-7 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2 sm:text-center">
                  How would you like to start?
                </h3>
                <p className="text-sm text-slate-500 sm:text-center">
                  Pick the path that fits where you are now.
                </p>
              </div>

              <div className="px-5 pb-5 sm:px-8 sm:pb-8 flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-6">
                {/* Start from Scratch */}
                <button
                  type="button"
                  onClick={() => navigate('/cv-builder/new')}
                  className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-0 p-4 sm:p-6 border border-slate-200 sm:border-2 sm:border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl transition-all group"
                >
                  <div className="w-11 h-11 sm:w-16 sm:h-16 bg-indigo-50 sm:bg-white sm:border sm:border-slate-200 rounded-full flex items-center justify-center sm:mb-4 group-hover:scale-105 transition-transform text-indigo-600 shrink-0 sm:shadow-sm">
                    <Plus className="w-5 h-5 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base sm:mb-2">
                      Start from scratch
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 leading-snug">
                      Step-by-step wizard, build a resume from the ground up.
                    </p>
                  </div>
                </button>

                {/* Upload Existing */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateOptions(false);
                    setResume(null);
                    setJob(null);
                    setFitResult(null);
                    setApplication(null);
                    setWorkflowMode('create-upload');
                    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                  }}
                  className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-0 p-4 sm:p-6 border border-slate-200 sm:border-2 sm:border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 rounded-xl transition-all group"
                >
                  <div className="w-11 h-11 sm:w-16 sm:h-16 bg-emerald-50 sm:bg-white sm:border sm:border-slate-200 rounded-full flex items-center justify-center sm:mb-4 group-hover:scale-105 transition-transform text-emerald-600 shrink-0 sm:shadow-sm">
                    <UploadIcon className="w-5 h-5 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:items-center">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base sm:mb-1">
                        Upload existing CV
                      </h4>
                      <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] sm:text-xs font-bold rounded-full shrink-0">
                        15 cr
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 leading-snug sm:mt-1">
                      We'll scan your PDF and auto-fill the builder with your details.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Monetag Banner - Bottom */}
        {/* {!workflowMode && (
                    <MonetagBanner style={{ marginBottom: '2rem' }} />
                )} */}

        {/* My Recent CVs widget was removed — /my-cvs is now the canonical
            home for CV listings (linked from the Navbar and mobile bottom
            nav). Keeping it here duplicated the surface and competed with
            the workflow cards above it on the landing screen. */}

        {/* Active Upload Workflow */}
        {workflowMode === 'upload' && (
          <div
            className={`animate-in fade-in zoom-in-95 duration-300 ${
              !fitResult && !analyzing ? 'pb-32 md:pb-0' : ''
            }`}
          >
            <button
              onClick={() => {
                setResume(null);
                setJob(null);
                setFitResult(null);
                setApplication(null);
                setWorkflowMode(null);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </button>
            {!fitResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-8 lg:bg-transparent lg:border-0 lg:shadow-none lg:p-0 lg:rounded-none">
                  <CVUploader onUploadSuccess={setResume} />
                </div>
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-8 lg:bg-transparent lg:border-0 lg:shadow-none lg:p-0 lg:rounded-none">
                  <JobLinkInput key={jobInputKey} onJobExtracted={setJob} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                {resume && (
                  <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <CheckCircle className="w-3 h-3 text-emerald-500" /> Resume uploaded
                      </div>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {resume.parsedData?.experience?.[0]?.role || 'Your resume'}
                        {resume.parsedData?.skills?.length
                          ? ` · ${resume.parsedData.skills.length} skills`
                          : ''}
                      </p>
                    </div>
                    <button
                      onClick={handleChangeResume}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>
                )}
                {job && (
                  <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <CheckCircle className="w-3 h-3 text-emerald-500" /> Target job
                      </div>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {job.title}
                        {job.company ? ` · ${job.company}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateNew}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create from Upload Workflow */}
        {workflowMode === 'create-upload' && (
          <div className="animate-in fade-in zoom-in-95 duration-300 max-w-2xl mx-auto">
            <button
              onClick={() => {
                setResume(null);
                setJob(null);
                setFitResult(null);
                setApplication(null);
                setWorkflowMode(null);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </button>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Upload your Resume</h3>
                <p className="text-slate-500">
                  Upload your existing CV (PDF) and we'll convert it into our editable format.
                </p>
              </div>

              {scanning ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                  <h4 className="text-lg font-bold text-slate-800 animate-pulse">
                    Scanning Document...
                  </h4>
                  <p className="text-slate-500 mt-2">Extracting your experience and skills</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center pb-4">
                    <span className="inline-block px-4 py-2 bg-amber-50 text-amber-700 font-bold rounded-full border border-amber-200">
                      <Zap className="w-4 h-4 inline mr-1" /> Cost: 15 A.I Credits
                    </span>
                  </div>
                  <CreditGate cost={CREDIT_COSTS.CREATE_FROM_UPLOAD}>
                    <CVUploader
                      endpoint="/resumes/upload-and-create"
                      onUploadSuccess={(data) => {
                        if (data.draftId) {
                          setScanSuccessDraftId(data.draftId);
                          setScanATSReadiness(data.atsReadiness || null);
                          if (data.remainingCredits !== undefined) {
                            updateCredits(data.remainingCredits);
                          }
                        } else {
                          toast.error('Failed to parse resume.');
                        }
                      }}
                      onError={(errorData) => {
                        if (errorData.code === 'INSUFFICIENT_CREDITS') {
                          handleInsufficientCredits(errorData.required, errorData.current);
                        }
                      }}
                    />
                  </CreditGate>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scan Success Modal */}
        {scanSuccessDraftId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                CV Scanned Successfully!
              </h3>
              <p className="text-sm sm:text-base text-slate-500 mb-4">
                We've extracted and optimized your details with AI-powered formatting.
              </p>

              {/* ATS Readiness Score */}
              {scanATSReadiness && (
                <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-3 mb-3">
                    <div
                      className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-lg font-extrabold border-4 ${
                        scanATSReadiness.score >= 75
                          ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                          : scanATSReadiness.score >= 50
                            ? 'border-amber-400 text-amber-700 bg-amber-50'
                            : 'border-red-400 text-red-700 bg-red-50'
                      }`}
                    >
                      {scanATSReadiness.score}
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-bold text-slate-800">ATS Readiness Score</p>
                      <p className="text-xs text-slate-500">
                        {scanATSReadiness.score >= 75
                          ? 'Your resume is well-structured for ATS systems'
                          : scanATSReadiness.score >= 50
                            ? 'Good start — a few improvements will boost your score'
                            : 'Needs work — edit in the builder to improve'}
                      </p>
                    </div>
                  </div>
                  {/* Quick check summary */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {scanATSReadiness.checks?.slice(0, 5).map((check, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          check.passed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {check.passed ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {check.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => {
                    // Completion moment after CV upload+convert. Fire-and-forget
                    // — don't block navigation on ad load. No-op on web/paid.
                    triggerInterstitial('upload_edit_in_builder');
                    navigate(`/cv-builder/${scanSuccessDraftId}`);
                  }}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <PenTool className="w-5 h-5" /> Review & Edit in Builder
                </button>
                <button
                  onClick={() => {
                    triggerInterstitial('upload_ats_preview');
                    navigate(`/resume/${scanSuccessDraftId}`, {
                      state: { atsReadiness: scanATSReadiness },
                    });
                  }}
                  className="w-full text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-1.5 py-2"
                >
                  <Eye className="w-4 h-4" /> Skip to ATS Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Link to Fit Analysis & Preview only show in 'upload' mode if we have results, 
                    OR if we just finished analysis. But logic below relies on 'fitResult'.
                    We only show these sections if we are in 'upload' mode OR if we have results active.
                    Ideally, if switching to 'create', we clear this state, but for now let's keep it simple.
                 */}
        {(analyzing || fitResult) && (
          <div
            id="analysis-section"
            className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">AI Compatibility Analysis</h3>
              </div>
              {job && (job.title || job.company) && (
                <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  For: <span className="text-slate-900 font-bold">{job.title || 'Role'}</span>{' '}
                  {job.company && <span>at {job.company}</span>}
                </div>
              )}
            </div>

            {analyzing ? (
              <div className="w-full h-48 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">
                  Analyzing your profile against role requirements...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <NextBestAction
                  fitScore={fitResult.fitScore}
                  fitAnalysis={fitResult.fitAnalysis}
                  application={application}
                  onGenerateCV={handleGenerateCV}
                  onGenerateCoverLetter={handleGenerateCoverLetter}
                  onGenerateInterview={handleGenerateInterview}
                  onGenerateBundle={handleGenerateBundle}
                  onView={() =>
                    navigate(`/resume/${application?.draftId || application?.applicationId}`)
                  }
                  generatingCV={generatingCV}
                  generatingCL={generatingCL}
                  generatingInterview={generatingInterview}
                  cvGenStatus={cvGenStatus}
                  justCompleted={justCompleted}
                  onDismissCompletion={() => setJustCompleted(null)}
                  onViewCV={() => {
                    setJustCompleted(null);
                    navigate(
                      `/resume/${application?.draftId || application?.applicationId}?tab=resume`
                    );
                  }}
                  onViewCoverLetter={() => {
                    setJustCompleted(null);
                    navigate(`/resume/${application?.applicationId}?tab=cover-letter`);
                  }}
                  onViewInterviewPrep={() => {
                    setJustCompleted(null);
                    const prepId = getPrepId(application);
                    if (prepId) navigate(`/interview-prep/${prepId}`);
                  }}
                />
                <JobRequirementsCard
                  fitAnalysis={fitResult.fitAnalysis}
                  jobTitle={job?.title}
                  jobCompany={job?.company}
                />
                <FitScoreCard
                  fitScore={fitResult.fitScore}
                  fitAnalysis={fitResult.fitAnalysis}
                  actionPlan={fitResult.actionPlan}
                  optimizedFitScore={application?.fitScoreAfter ?? application?.optimizedFitScore}
                  applicationId={application?.applicationId}
                />
              </div>
            )}
          </div>
        )}

        {/* Asset Generation Section */}
        {fitResult && application?.applicationId && (
          <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">Generate Professional Assets</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Choose which assets to generate. Each is created independently so you only pay for
              what you need.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Generate CV Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Optimized CV</h4>
                    <p className="text-xs text-slate-500">ATS-optimized resume</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4 flex-1">
                  AI rewrites your resume with role-specific keywords, achievement-oriented bullets,
                  and clean formatting.
                </p>
                {application.optimizedCV ? (
                  <button
                    onClick={() =>
                      navigate(
                        `/resume/${application.draftId || application.applicationId}?tab=resume`
                      )
                    }
                    className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  >
                    <Eye className="w-4 h-4" /> View CV
                  </button>
                ) : (
                  <CreditGate cost={CREDIT_COSTS.GENERATE_CV}>
                    <button
                      onClick={handleGenerateCV}
                      disabled={generatingCV}
                      className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        generatingCV
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'btn-primary'
                      }`}
                    >
                      {generatingCV ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Generate (10 Credits)
                        </>
                      )}
                    </button>
                  </CreditGate>
                )}
              </div>

              {/* Generate Cover Letter Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Cover Letter</h4>
                    <p className="text-xs text-slate-500">Tailored to the role</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4 flex-1">
                  A personalized cover letter connecting your experience to the job requirements.
                </p>
                {application.coverLetter ? (
                  <button
                    onClick={() =>
                      navigate(`/resume/${application.applicationId}?tab=cover-letter`)
                    }
                    className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  >
                    <Eye className="w-4 h-4" /> View Cover Letter
                  </button>
                ) : (
                  <CreditGate cost={CREDIT_COSTS.GENERATE_COVER_LETTER}>
                    <button
                      onClick={handleGenerateCoverLetter}
                      disabled={generatingCL}
                      className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        generatingCL
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'btn-primary'
                      }`}
                    >
                      {generatingCL ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Generate (5 Credits)
                        </>
                      )}
                    </button>
                  </CreditGate>
                )}
              </div>

              {/* Generate Interview Prep Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Interview Prep</h4>
                    <p className="text-xs text-slate-500">Questions & strategies</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4 flex-1">
                  Role-specific interview questions to practice, plus smart questions to ask the
                  interviewer.
                </p>
                {hasInterviewPrep(application) ? (
                  <button
                    onClick={() => {
                      const prepId = getPrepId(application);
                      if (prepId) navigate(`/interview-prep/${prepId}`);
                    }}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  >
                    <Eye className="w-4 h-4" /> View Interview Prep
                  </button>
                ) : (
                  <CreditGate cost={CREDIT_COSTS.GENERATE_INTERVIEW}>
                    <button
                      onClick={handleGenerateInterview}
                      disabled={generatingInterview}
                      className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        generatingInterview
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'btn-primary'
                      }`}
                    >
                      {generatingInterview ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Generate (5 Credits)
                        </>
                      )}
                    </button>
                  </CreditGate>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generate New Analysis Button */}
        {fitResult && (
          <div className="mb-12 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <button
              onClick={handleGenerateNew}
              className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-indigo-200 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all hover:scale-[1.02] shadow-sm"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="flex flex-col items-start leading-tight">
                <span>Generate New Analysis</span>
                <span className="text-xs font-normal text-slate-500">
                  Same resume, different job
                </span>
              </span>
            </button>
          </div>
        )}

        {/* Interview Prep entry point — replaces the previous inline preview.
            Sends users to the dedicated /interview-prep/:id page for the full
            experience (questions + suggested answers + skill talking points). */}
        {getPrepId(application) && hasInterviewPrep(application) && (
          <Link
            to={`/interview-prep/${getPrepId(application)}`}
            id="preview-section"
            className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 flex items-center gap-3 p-4 sm:p-5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-colors group"
          >
            <div className="w-11 h-11 rounded-lg bg-white text-indigo-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-slate-900">
                Interview prep ready
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {getPrepSummary(application)} - tap to review answers and talking points
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-700 transition-colors shrink-0" />
          </Link>
        )}

        {/* Analyze Button (desktop) — Only show if in upload mode AND not yet
            analyzed. The mobile equivalent is a sticky bottom bar rendered
            outside <main> so it survives scroll. Mobile users get a more
            compact step-checklist + cost summary in that bar; desktop keeps
            the hero treatment. */}
        {workflowMode === 'upload' && !fitResult && !analyzing && (
          <div className="relative pt-8 hidden md:flex flex-col items-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-slate-200"></div>

            <CreditGate cost={CREDIT_COSTS.FIT_ANALYSIS} className="w-full max-w-xl">
              <div className="relative group flex justify-center">
                {(!resume || !job) && (
                  <div className="absolute -inset-1 bg-white/40 backdrop-blur-[1px] rounded-full z-10 pointer-events-none" />
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={!resume || !job || analyzing}
                  className={`
                    relative z-20 flex items-center justify-center h-16 px-12 rounded-full font-bold text-lg shadow-xl shadow-primary/20 transition-all duration-300
                    ${
                      !resume || !job || analyzing
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'btn-primary hover:scale-105 active:scale-95'
                    }
                  `}
                >
                  {analyzing ? (
                    <>
                      <div className="w-6 h-6 border-4 border-indigo-200 border-t-white rounded-full animate-spin mr-3"></div>
                      Analyzing Match...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-3" />
                      <span className="flex flex-col items-start leading-tight">
                        <span>Analyze Fit</span>
                        <span className="text-xs font-normal opacity-80">Cost: 10 A.I Credits</span>
                      </span>
                      <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </CreditGate>

            {!resume || !job ? (
              <div className="mt-8 flex items-center gap-3 text-slate-400 font-medium bg-slate-50 px-6 py-3 rounded-full border border-slate-200">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px]">
                  !
                </div>
                Please complete both steps to proceed
              </div>
            ) : (
              <p className="mt-8 text-indigo-600 font-medium animate-pulse flex items-center gap-2">
                {!analyzing && (
                  <>
                    <CheckCircle className="w-4 h-4" /> Ready for analysis
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {/* Mobile sticky Analyze CTA — replaces the desktop hero button on
            small screens. Always visible at the bottom while in upload mode
            so users don't have to scroll to discover the action or the cost.
            On Capacitor we offset above the bottom nav; on mobile web we sit
            flush with the safe-area inset. */}
        {workflowMode === 'upload' && !fitResult && !analyzing && (
          <div
            className="md:hidden fixed left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            style={
              isMobile() ? { bottom: 'calc(4rem + env(safe-area-inset-bottom))' } : { bottom: 0 }
            }
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span
                  className={`flex items-center gap-1 ${resume ? 'text-emerald-700' : 'text-slate-400'}`}
                >
                  {resume ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                  )}
                  Resume
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span
                  className={`flex items-center gap-1 ${job ? 'text-emerald-700' : 'text-slate-400'}`}
                >
                  {job ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                  )}
                  Job
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                10 cr
              </span>
            </div>
            <CreditGate cost={CREDIT_COSTS.FIT_ANALYSIS}>
              <button
                onClick={handleAnalyze}
                disabled={!resume || !job || analyzing}
                className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm transition-all ${
                  !resume || !job || analyzing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'btn-primary shadow-lg shadow-indigo-200 active:scale-[0.98]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {!resume || !job ? 'Complete both steps to continue' : 'Analyze Fit'}
              </button>
            </CreditGate>
          </div>
        )}

        {/* Auto-Analysis Modal */}
        {showAutoAnalyzeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
              {/* Mobile: stacked + centered. Desktop (sm+): icon left, copy right. */}
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-4 mb-5 sm:mb-4">
                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600 mb-3 sm:mb-0 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">
                    Enable Auto-Analysis?
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Automatically analyze your resume against any job you upload — no extra taps
                    needed.
                  </p>
                </div>
              </div>
              {/* Mobile: stacked, full-width, primary on top. Desktop: inline right-aligned. */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-2 sm:mt-6">
                <button
                  onClick={() => setShowAutoAnalyzeModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Keep it manual
                </button>
                <button
                  onClick={enableAutoAnalysis}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all sm:hover:scale-105"
                >
                  Enable auto-analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Delete CV?</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Are you sure you want to delete "{draftToDelete?.title || 'Untitled CV'}"? This
                    action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDraftToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Insufficient Credits Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center relative">
            <button
              onClick={() => setShowCreditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">Insufficient A.I Credits</h3>
            <p className="text-slate-500 mb-6">
              You need{' '}
              <span className="font-bold text-slate-900">{requiredCredits} A.I credits</span> to
              perform this action, but you only have{' '}
              <span className="font-bold text-slate-900">{user.credits || 0}</span>.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/credits')}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> Get More A.I Credits
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">
                  OR
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                onClick={() => navigate('/credits')} // For now direct to store where ad option lives
                className="w-full py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4 text-amber-500" /> Watch Ad for Free A.I Credits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New User Tour */}
      <DashboardTour />

      <MetricCaptureModal
        isOpen={metricCapture.isOpen}
        vagueBullets={metricCapture.vagueBullets}
        primaryLabel={metricCapture.mode === 'bundle' ? 'Generate full kit' : 'Generate CV'}
        onSubmit={handleMetricCaptureSubmit}
        onCancel={handleMetricCaptureCancel}
      />
    </div>
  );
};

export default Dashboard;
