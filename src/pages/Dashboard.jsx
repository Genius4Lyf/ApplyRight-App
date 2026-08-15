import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AriaLoader from '../components/ui/AriaLoader';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import CVUploader from '../components/CVUploader';
import CVPicker from '../components/CVPicker';
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
  PlayCircle,
  Mail,
  MessageSquare,
  Mic,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import AriaOrbit from '../components/cv/AriaOrbit';
import GlobalBanner from '../components/GlobalBanner';
import CreditGate from '../components/CreditGate';
import { CREDIT_COSTS } from '../lib/credits';
import { STUDIO_TAILORING_ENABLED } from '../lib/studioFeatures';
import { isMobile } from '../utils/platform';
import { signalReady } from '../utils/splash';
import { useTranslation, Trans } from 'react-i18next';
import FitScoreCard from '../components/FitScoreCard';
import { ReadyChip, GhostButton, InkButton } from '../components/dashboard/ToolkitButtons';
import NextBestAction from '../components/NextBestAction';
import MetricCaptureModal from '../components/MetricCaptureModal';
import {
  getPrepId,
  getPrepSummary,
  hasInterviewPrep,
  mergeInterviewPrepResponse,
} from '../utils/interviewPrep';
import { toast } from 'sonner';

const Dashboard = () => {
  const { t } = useTranslation();
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
  // Step 1 CV source for the ApplyRight analysis flow. 'saved' picks an existing
  // ApplyRight CV (selectedDraftId); 'upload' uses a freshly uploaded resume.
  const [cvMode, setCvMode] = useState('saved');
  const [selectedDraftId, setSelectedDraftId] = useState(null);
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
  const [clFreeRemaining, setClFreeRemaining] = useState(0);
  const [generatingInterview, setGeneratingInterview] = useState(false);
  const [openingStudio, setOpeningStudio] = useState(false);
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

  // Resolved Step 1 selection for the analysis flow, derived from cvMode.
  const selectedDraft =
    cvMode === 'saved' ? myDrafts.find((d) => d._id === selectedDraftId) || null : null;
  const cvChosen = cvMode === 'saved' ? !!selectedDraftId : !!resume;
  // True until the first drafts fetch resolves. Drives the dashboard skeleton
  // and also gates the Capacitor splash (via signalReady) on mobile so the app
  // doesn't flash an empty dashboard between splash-hide and first paint.
  const [initialLoading, setInitialLoading] = useState(true);
  // After ~6s of the first load still running, own the likelihood that a cold
  // backend is waking — so the wait reads as "working", not "hung".
  const [slowWake, setSlowWake] = useState(false);
  useEffect(() => {
    if (!initialLoading) { setSlowWake(false); return; }
    const id = setTimeout(() => setSlowWake(true), 6000);
    return () => clearTimeout(id);
  }, [initialLoading]);
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
      toast.success(t('dashboard.toasts.cvDeleted'));
      setDeleteModalOpen(false);
      setDraftToDelete(null);
      loadDrafts(); // Reload the list
    } catch (error) {
      console.error('Failed to delete draft', error);
      toast.error(t('dashboard.toasts.cvDeleteFailed'));
    }
  };

  // Helper to update credits globally (Navbar + Local State)
  const updateCredits = (newBalance) => {
    // 1. Dispatch event for Navbar
    window.dispatchEvent(new CustomEvent('credit_updated', { detail: newBalance }));

    // 2. Update local state
    setUser((prev) => ({ ...prev, credits: newBalance }));

    // 3. Update local storage (so it persists on refresh)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    currentUser.credits = newBalance;
    localStorage.setItem('user', JSON.stringify(currentUser));
  };

  // Free-tier daily cover letter allowance — fetch once on mount so the
  // toolkit button shows "Free today" immediately, without waiting on an
  // unrelated generation to sync the balance first.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/billing/balance')
      .then((res) => {
        if (!cancelled && res.data?.coverLetterFreeRemaining !== undefined) {
          setClFreeRemaining(res.data.coverLetterFreeRemaining);
        }
      })
      .catch(() => {
        // Non-critical — button falls back to the normal credit-cost display.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-analyze when both resume and job are available AND setting is enabled.
  // Deliberately depends only on [resume, job] — we want a single auto-trigger
  // when the upload pair completes, not extra re-runs when fitResult clears
  // (which would loop) or when the user setting flips (the user is consenting
  // ahead of time, not retroactively).
  useEffect(() => {
    const analyzeFit = async () => {
      const shouldAutoRun = user?.settings?.autoGenerateAnalysis === true;

      if (cvChosen && job && !fitResult && shouldAutoRun) {
        performAnalysis();
      }
    };

    analyzeFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, selectedDraftId, job]);

  const performAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post('/analysis/analyze', {
        ...(cvMode === 'saved' ? { draftCVId: selectedDraftId } : { resumeId: resume._id }),
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

      toast.success(t('dashboard.toasts.autoAnalysisEnabled'));
      setShowAutoAnalyzeModal(false);
    } catch (error) {
      console.error('Failed to update settings', error);
      toast.error(t('dashboard.toasts.settingSaveFailed'));
    }
  };

  const handleAnalyze = async () => {
    if (!cvChosen || !job) return;
    try {
      const result = await performAnalysis();
      if (result) {
        toast.success(t('dashboard.toasts.analysisComplete'));
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
      toast.error(t('dashboard.toasts.aiUnavailable'));
      return;
    }
    if (error.response?.status === 409 && code === 'GENERATION_IN_PROGRESS') {
      toast.error(t('dashboard.toasts.generationInProgress'));
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
            if (bal.data?.coverLetterFreeRemaining !== undefined) {
              setClFreeRemaining(bal.data.coverLetterFreeRemaining);
            }
          } catch {
            // Non-critical — UI will still re-fetch credits on next interaction.
          }
          const before = fresh.fitScore;
          const after = fresh.optimizedFitScore;
          if (typeof before === 'number' && typeof after === 'number' && after > before) {
            toast.success(t('dashboard.toasts.matchLifted', { before, after }));
          } else {
            toast.success(t('dashboard.toasts.cvGenerated'));
          }
          setGeneratingCV(false);
          setCvGenStatus(null);
          setJustCompleted('cv');
        } else if (status?.stage === 'failed') {
          clearInterval(cvPollRef.current);
          cvPollRef.current = null;
          toast.error(status.error || t('dashboard.toasts.cvGenerationFailed'));
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
    setCvGenStatus({
      stage: 'extracting',
      progress: 5,
      stageMessage: t('dashboard.genStage.starting'),
    });
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
      handleAssetGenError(error, t('dashboard.toasts.cvStartFailed'));
    }
  };

  const startBundleGeneration = async (providedMetrics) => {
    if (!application?.applicationId) return;
    setGeneratingCV(true);
    setCvGenStatus({
      stage: 'extracting',
      progress: 5,
      stageMessage: t('dashboard.genStage.startingBundle'),
    });
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
      handleAssetGenError(error, t('dashboard.toasts.bundleStartFailed'));
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

  // Open Aria Studio to tailor THIS application's CV. /analysis/:id/edit turns
  // the application into a real DraftCV (idempotent — reuses one if it exists),
  // which is what Aria Studio tailors FROM. Pre-selecting the source means the
  // user isn't asked which CV to use.
  const openInAriaStudio = async () => {
    const applicationId = application?._id || application?.applicationId;
    if (!applicationId || openingStudio) return;
    setOpeningStudio(true);
    try {
      const res = await api.post(`/analysis/${applicationId}/edit`);
      const draftId = res.data?.draftId;
      if (!draftId) throw new Error('no draft returned');
      navigate('/aria-studio', {
        state: {
          seedSource: { id: draftId, title: application?.jobTitle || application?.title || '' },
        },
      });
    } catch (err) {
      console.error('Open in Aria Studio failed', err);
      toast.error(t('dashboard.toasts.studioOpenFailed'));
      setOpeningStudio(false);
    }
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
      if (res.data.coverLetterFreeRemaining !== undefined) {
        setClFreeRemaining(res.data.coverLetterFreeRemaining);
      }
      const warnings = res.data.coverLetterWarnings || [];
      if (warnings.length > 0) {
        // Surface fact-check warnings immediately so the user verifies before
        // sending. Non-blocking — the letter is still generated and saved.
        toast.warning(t('dashboard.toasts.coverLetterWarning', { count: warnings.length }), {
          duration: 8000,
        });
      } else {
        toast.success(t('dashboard.toasts.coverLetterGenerated'));
      }
      // Fire interstitial at this completion moment. No-op on web / paid /
      // non-eligible users; frequency caps enforced inside the hook.
      triggerInterstitial('cover_letter_generated');
      setJustCompleted('coverLetter');
    } catch (error) {
      handleAssetGenError(error, t('dashboard.toasts.coverLetterFailed'));
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
      toast.success(t('dashboard.toasts.interviewPrepGenerated'));
      setJustCompleted('interview');
    } catch (error) {
      handleAssetGenError(error, t('dashboard.toasts.interviewPrepFailed'));
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
    setSelectedDraftId(null);
    setFitResult(null);
    setApplication(null);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const getStatusMessage = () =>
    user.firstName
      ? t('dashboard.greeting', { name: user.firstName })
      : t('dashboard.greetingNoName');

  const getRecommendedAction = () => {
    if (!user.currentStatus) return t('dashboard.recommendedDefault');
    const field = user.education?.discipline || t('dashboard.yourField');
    const byStatus = {
      student: t('dashboard.recommendedStudent', { field }),
      graduate: t('dashboard.recommendedGraduate', { field }),
      professional: t('dashboard.recommendedProfessional'),
      other: t('dashboard.recommendedOther'),
    };
    return byStatus[user.currentStatus] || byStatus.other;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <GlobalBanner />

      <main
        className={`flex-1 max-w-5xl mx-auto w-full px-4 relative ${
          workflowMode ? 'pt-8 pb-12' : 'py-12'
        }`}
      >
        {showProfileBanner && (
          <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
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
              aria-label={t('dashboard.banner.enhanceAria')}
              className="flex items-center gap-3 cursor-pointer flex-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm group-hover:scale-110 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-slate-100">
                  {t('dashboard.banner.enhanceTitle')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('dashboard.banner.enhanceBody')}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileBanner(false);
              }}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
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
            aria-label={t('dashboard.banner.completeAria')}
            className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-slate-100">
                  {t('dashboard.banner.completeTitle')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('dashboard.banner.completeBody')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:translate-x-1 transition-transform" />
          </div>
        )}

        {!workflowMode && initialLoading && (
          <div className="py-20 flex flex-col items-center gap-4">
            <AriaLoader size={40} label={t('dashboard.loading.sr')} />
            {slowWake && (
              <p className="max-w-sm px-6 text-center text-sm text-slate-500 dark:text-slate-400 animate-in fade-in duration-500">
                {t('dashboard.loading.wakingUp')}
              </p>
            )}
          </div>
        )}

        {/* Welcome heading — only on the dashboard landing state. Once the
            user picks a workflow we hide it so the upload/job inputs aren't
            pushed below the fold by ~180px of intro copy. */}
        {!workflowMode && !initialLoading && (
          <div className="max-w-3xl mx-auto mb-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('dashboard.workspace')}
            </p>
            <h1 className="mt-2 font-heading text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {getStatusMessage()}
            </h1>
            <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              {getRecommendedAction()}
            </p>
          </div>
        )}

        {/* Aria Studio — the hero launcher. Sits above the two pillars because it's the
            one place where Aria does the work FOR you rather than alongside you. Flat
            hairline card; the left rule is ink, not indigo — indigo is reserved for
            interactive accent (focus rings, links), never decoration. */}
        {!workflowMode && !initialLoading && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-xl rounded-l-none border border-slate-200 dark:border-slate-800 border-l-[6px] border-l-slate-900 dark:border-l-white bg-white dark:bg-slate-900 shadow-card p-6 md:p-7 flex flex-col md:flex-row md:items-center gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <AriaOrbit size={18} />
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {t('dashboard.studio.kicker')}
                  </p>
                </div>
                <h2 className="mt-2.5 font-heading text-2xl md:text-[26px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {t('dashboard.studio.title')}
                </h2>
                <p className="mt-2 text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  {t('dashboard.studio.body')}
                </p>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/aria-studio')}
                  className="btn-primary gap-2 px-5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                >
                  {t('dashboard.studio.cta')} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Two intent pillars — "Your application" (tailor / build) and
            "Interview practice" (live mock). Flat editorial cards; the flagship
            Tailor card carries a single ink top-accent + "Recommended" chip.
            Consistent across web and the Android/Capacitor build — we're removing
            paralysis, not removing choice. */}
        {!workflowMode && !initialLoading && (
          <div className="space-y-10 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Pillar A — Your application */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 shrink-0">
                  {t('dashboard.pillarApplication')}
                </p>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4">
                {/* Tailor my CV — the flagship */}
                <div
                  onClick={() => {
                    setResume(null);
                    setSelectedDraftId(null);
                    // Default to the Saved CV tab when the user has CVs, else Upload.
                    setCvMode(myDrafts.length > 0 ? 'saved' : 'upload');
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
                  aria-label={t('dashboard.tailorCard.aria')}
                  className="rounded-xl rounded-t-none border border-slate-200 dark:border-slate-800 border-t-[3px] border-t-slate-900 dark:border-t-white bg-white dark:bg-slate-900 shadow-card p-6 cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <UploadIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <span className="inline-flex items-center rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                      {t('dashboard.tailorCard.chip')}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('dashboard.tailorCard.title')}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                    <Trans
                      i18nKey="dashboard.tailorCard.body"
                      components={{
                        f: <span className="font-bold italic text-slate-700 dark:text-slate-200" />,
                      }}
                    />
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {t('dashboard.tailorCard.cta')} <ArrowRight className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      {t('dashboard.tailorCard.poweredBy')}
                    </span>
                  </div>
                </div>

                {/* Build a new CV */}
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
                  aria-label={t('dashboard.buildCard.aria')}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-6 cursor-pointer flex flex-col transition-colors hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <PenTool className="w-5 h-5 text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('dashboard.buildCard.title')}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                    {t('dashboard.buildCard.body')}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t('dashboard.buildCard.cta')} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </section>

            {/* Pillar B — Interview practice */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 shrink-0">
                  {t('dashboard.pillarInterview')}
                </p>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4">
                {/* Interview me — standalone live mock */}
                <div
                  onClick={() => navigate('/interview/start')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate('/interview/start');
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={t('dashboard.interviewCard.aria')}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-6 cursor-pointer flex flex-col transition-colors hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <Mic className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                      {t('dashboard.interviewCard.chip')}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('dashboard.interviewCard.title')}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                    {t('dashboard.interviewCard.body')}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {t('dashboard.interviewCard.cta')} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Quiet companion note — not a button */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-6 flex flex-col justify-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('dashboard.interviewCard.companion')}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Create Options Modal */}
        {showCreateOptions &&
          createPortal(
            /* Bottom-sheet on mobile, centered card on desktop. Compact
             horizontal-row options on mobile (icon left, content right);
             stacked grid on desktop. */
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pb-[env(safe-area-inset-bottom)] sm:p-4 sm:pb-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setShowCreateOptions(false)}
                  aria-label={t('common.close')}
                  className="absolute top-3 right-3 p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="px-5 pt-7 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
                  <h3 className="font-heading text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 sm:mb-2 sm:text-center">
                    {t('dashboard.createModal.title')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 sm:text-center">
                    {t('dashboard.createModal.subtitle')}
                  </p>
                </div>

                <div className="px-5 pb-5 sm:px-8 sm:pb-8 flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-6">
                  {/* Start from Scratch */}
                  <button
                    type="button"
                    onClick={() => navigate('/cv-builder/new')}
                    className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-0 p-4 sm:p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 sm:mb-3" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base sm:mb-2">
                        {t('dashboard.createModal.scratchTitle')}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-snug">
                        {t('dashboard.createModal.scratchBody')}
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
                    className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-0 p-4 sm:p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition-colors"
                  >
                    <UploadIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 sm:mb-3" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:items-center">
                        <h4 className="font-heading font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base sm:mb-1">
                          {t('dashboard.createModal.uploadTitle')}
                        </h4>
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] uppercase tracking-[0.1em] rounded shrink-0">
                          15 cr
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-snug sm:mt-1">
                        {t('dashboard.createModal.uploadBody')}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

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
                setSelectedDraftId(null);
                setJob(null);
                setFitResult(null);
                setApplication(null);
                setWorkflowMode(null);
              }}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> {t('dashboard.backToDashboard')}
            </button>
            {!fitResult && (
              <div className="mb-8">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t('dashboard.tailorCard.poweredBy')}
                </p>
                <h1 className="mt-1 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {t('dashboard.tailorCard.title')}
                </h1>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  {t('dashboard.setup.checkCv')}
                </p>
                <span className="inline-flex items-center mt-3 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {t('dashboard.creditsCount', { count: user.credits || 0 })}
                </span>
              </div>
            )}
            {!fitResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {/* Step 1 — choose CV. Card chrome lives on the section
                    (matching the Interview Me page); CVPicker is chrome-less. */}
                <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card p-5 sm:p-6 flex flex-col">
                  <CVPicker
                    cvMode={cvMode}
                    onCvModeChange={setCvMode}
                    drafts={myDrafts}
                    draftsLoading={initialLoading}
                    selectedDraftId={selectedDraftId}
                    onSelectDraft={setSelectedDraftId}
                    uploadedResume={resume}
                    onUploadedResume={setResume}
                  />
                </section>

                {/* Step 2 — job listing. Header supplied here so JobLinkInput
                    runs embedded (no duplicate chrome), same as Interview Me. */}
                <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card p-5 sm:p-6 flex flex-col">
                  <div className="mb-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      {t('dashboard.setup.step2')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('dashboard.setup.step2Body')}
                    </p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <JobLinkInput key={jobInputKey} embedded onJobExtracted={setJob} />
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                {(resume || selectedDraft) && (
                  <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />{' '}
                        {selectedDraft ? t('dashboard.savedCv') : t('dashboard.resumeUploaded')}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {selectedDraft
                          ? selectedDraft.title || selectedDraft.personalInfo?.fullName || 'Your CV'
                          : `${resume.parsedData?.experience?.[0]?.role || 'Your resume'}${
                              resume.parsedData?.skills?.length
                                ? ` · ${resume.parsedData.skills.length} skills`
                                : ''
                            }`}
                      </p>
                    </div>
                    <button
                      onClick={handleChangeResume}
                      className="text-xs font-semibold text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-900 dark:hover:decoration-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>
                )}
                {job && (
                  <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <CheckCircle className="w-3 h-3 text-emerald-500" /> Target job
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {job.title}
                        {job.company ? ` · ${job.company}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateNew}
                      className="text-xs font-semibold text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-900 dark:hover:decoration-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors shrink-0"
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
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> {t('dashboard.backToDashboard')}
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-card border border-slate-200 dark:border-slate-700 p-8">
              <div className="text-center mb-8">
                <h3 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {t('dashboard.setup.uploadTitle')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {t('dashboard.setup.uploadBody')}
                </p>
              </div>

              {scanning ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <AriaLoader inline size={56} label="Scanning your CV…" className="mb-6" />
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 animate-pulse">
                    {t('dashboard.setup.scanning')}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">
                    {t('dashboard.setup.scanningBody')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center pb-4">
                    <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] uppercase tracking-[0.1em] rounded border border-amber-200 dark:border-amber-500/30">
                      15 cr
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
                          toast.error(t('dashboard.toasts.resumeParseFailed'));
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
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
              {/* Header — editorial: mono eyebrow → serif title → muted subcopy */}
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                ✓ CV scanned
              </p>
              <h3 className="mt-1 font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('dashboard.health.title')}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {t('dashboard.health.body')}
              </p>

              {/* CV Health Score */}
              {scanATSReadiness && (
                <div className="mt-5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        {t('dashboard.health.scoreLabel')}
                      </p>
                      <p
                        className={`mt-1 font-heading text-lg font-bold ${
                          scanATSReadiness.score >= 75
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : scanATSReadiness.score >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {scanATSReadiness.score >= 75
                          ? t('dashboard.verdict.wellStructured')
                          : scanATSReadiness.score >= 50
                            ? t('dashboard.verdict.gettingThere')
                            : t('dashboard.verdict.needsWork')}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-heading text-4xl font-bold leading-none tabular-nums ${
                        scanATSReadiness.score >= 75
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : scanATSReadiness.score >= 50
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {scanATSReadiness.score}
                    </span>
                  </div>

                  {/* Band rail — needs-work / getting-there / strong, with a marker pin */}
                  <div className="mt-4">
                    <div className="relative">
                      <div className="grid grid-cols-[50fr_25fr_25fr] gap-0.5 h-2 rounded-full overflow-hidden">
                        <span className="bg-rose-500/45" />
                        <span className="bg-amber-500/45" />
                        <span className="bg-emerald-500/45" />
                      </div>
                      <span
                        aria-hidden="true"
                        className="absolute -top-0.5 h-3 w-0.5 -translate-x-1/2 rounded bg-slate-900 dark:bg-slate-100"
                        style={{
                          left: `${Math.max(0, Math.min(100, scanATSReadiness.score))}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 grid grid-cols-[50fr_25fr_25fr] gap-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                      <span>{t('dashboard.health.needsWork')}</span>
                      <span className="text-center">{t('dashboard.health.gettingThere')}</span>
                      <span className="text-right">{t('dashboard.health.strong')}</span>
                    </div>
                  </div>

                  {/* Checks — clean two-column grid, failed ones emphasized */}
                  {scanATSReadiness.checks?.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {scanATSReadiness.checks.slice(0, 6).map((check, i) => (
                        <div key={i} className="flex items-center gap-2 min-w-0">
                          <span
                            className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              check.passed
                                ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {check.passed ? '✓' : '✕'}
                          </span>
                          <span
                            className={`text-xs truncate ${
                              check.passed
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-slate-900 dark:text-slate-100 font-semibold'
                            }`}
                          >
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    // Completion moment after CV upload+convert. Fire-and-forget
                    // — don't block navigation on ad load. No-op on web/paid.
                    triggerInterstitial('upload_edit_in_builder');
                    navigate(`/cv-builder/${scanSuccessDraftId}`);
                  }}
                  className="w-full btn-primary py-3.5 rounded-xl gap-2"
                >
                  <PenTool className="w-5 h-5" /> Review & edit in builder
                </button>
                <button
                  onClick={() => {
                    triggerInterstitial('upload_ats_preview');
                    navigate(`/resume/${scanSuccessDraftId}`, {
                      state: { atsReadiness: scanATSReadiness },
                    });
                  }}
                  className="w-full text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-1.5 py-2"
                >
                  <Eye className="w-4 h-4" /> Skip to preview
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
            <div className="mb-6">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {t('dashboard.fit.title')}
              </p>
              <h3 className="mt-1 font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {job?.title || 'Analysis'}
              </h3>
              {job?.company && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {job.company} · just analyzed
                </p>
              )}
            </div>

            {analyzing ? (
              <div className="w-full h-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card flex flex-col items-center justify-center p-8">
                <AriaLoader inline size={32} label="Analyzing…" className="mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  {t('dashboard.fit.analyzing')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Understanding before action: the verdict leads, requirement
                    detail supports, then the generation/next-step card sits just
                    above the toolkit. */}
                <FitScoreCard
                  fitScore={fitResult.fitScore}
                  fitAnalysis={fitResult.fitAnalysis}
                  actionPlan={fitResult.actionPlan}
                  optimizedFitScore={application?.fitScoreAfter ?? application?.optimizedFitScore}
                  applicationId={application?.applicationId}
                />
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
                  showDefaultCta={false}
                />
              </div>
            )}
          </div>
        )}

        {/* Asset Generation Section */}
        {fitResult && application?.applicationId && (
          <div className="mb-16 pb-24 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card">
              {/* Header — eyebrow + title, with the bundle as a right action. */}
              <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Ready to use · now that you&apos;ve read the analysis
                  </p>
                  <h2 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('dashboard.toolkit.title')}
                  </h2>
                </div>
                {!application.optimizedCV &&
                  !application.coverLetter &&
                  !hasInterviewPrep(application) && (
                    <CreditGate cost={CREDIT_COSTS.GENERATE_BUNDLE} className="shrink-0">
                      <button
                        type="button"
                        onClick={handleGenerateBundle}
                        className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                      >
                        <Layers className="w-4 h-4 text-slate-400" /> Full kit
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                          {CREDIT_COSTS.GENERATE_BUNDLE} cr · save 2
                        </span>
                      </button>
                    </CreditGate>
                  )}
              </div>

              {/* Optimized CV */}
              <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {t('dashboard.toolkit.optimizedCv')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('dashboard.toolkit.optimizedCvBody')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {application.optimizedCV ? (
                      <>
                        <ReadyChip />
                        <GhostButton
                          onClick={() =>
                            navigate(
                              `/resume/${application.draftId || application.applicationId}?tab=resume`
                            )
                          }
                        >
                          View &amp; download
                        </GhostButton>
                      </>
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        {STUDIO_TAILORING_ENABLED && (
                          <button
                            type="button"
                            onClick={openInAriaStudio}
                            disabled={openingStudio}
                            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors disabled:opacity-60"
                          >
                            <AriaOrbit size={14} tone="mono" />
                            {openingStudio
                              ? t('dashboard.toolkit.openingStudio')
                              : t('dashboard.toolkit.workWithAria')}
                          </button>
                        )}
                        <CreditGate cost={CREDIT_COSTS.GENERATE_CV}>
                          <button
                            type="button"
                            onClick={handleGenerateCV}
                            disabled={generatingCV}
                            className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-60"
                          >
                            {generatingCV
                              ? t('dashboard.toolkit.generating')
                              : t('dashboard.toolkit.justGenerateIt', {
                                  cost: CREDIT_COSTS.GENERATE_CV,
                                })}
                          </button>
                        </CreditGate>
                      </div>
                    )}
                  </div>
                </div>
                {/* Live pipeline progress — kept under the row. */}
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
                        className="h-1 rounded-full bg-slate-900 dark:bg-white transition-all"
                        style={{ width: `${cvGenStatus.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cover letter */}
              <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {t('dashboard.toolkit.coverLetter')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('dashboard.toolkit.coverLetterBody')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {application.coverLetter ? (
                      <>
                        <ReadyChip />
                        <GhostButton
                          onClick={() =>
                            navigate(`/resume/${application.applicationId}?tab=cover-letter`)
                          }
                        >
                          View &amp; download
                        </GhostButton>
                      </>
                    ) : (
                      <CreditGate
                        cost={clFreeRemaining > 0 ? 0 : CREDIT_COSTS.GENERATE_COVER_LETTER}
                      >
                        <InkButton
                          onClick={handleGenerateCoverLetter}
                          generating={generatingCL}
                          disabled={generatingCL}
                          cost={CREDIT_COSTS.GENERATE_COVER_LETTER}
                          freeLabel={clFreeRemaining > 0 ? t('dashboard.toolkit.freeToday') : null}
                        />
                      </CreditGate>
                    )}
                  </div>
                </div>
                {/* Fact-check warnings — flat amber-accented note. */}
                {application.coverLetter && application.coverLetterWarnings?.length > 0 && (
                  <div className="mt-3 border-l-2 border-amber-500 pl-3">
                    <div className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400 mb-1">
                      {t('dashboard.toolkit.verifyBeforeSending')}
                    </div>
                    <ul className="space-y-0.5 list-disc pl-3 text-[11px] text-slate-600 dark:text-slate-300">
                      {application.coverLetterWarnings.slice(0, 5).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Interview prep */}
              <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {t('dashboard.toolkit.interviewPrep')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('dashboard.toolkit.interviewPrepBody')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasInterviewPrep(application) ? (
                      <>
                        <ReadyChip />
                        <GhostButton
                          onClick={() => {
                            const prepId = getPrepId(application);
                            if (prepId) navigate(`/interview-prep/${prepId}`);
                          }}
                        >
                          View
                        </GhostButton>
                      </>
                    ) : (
                      <CreditGate cost={CREDIT_COSTS.GENERATE_INTERVIEW}>
                        <InkButton
                          onClick={handleGenerateInterview}
                          generating={generatingInterview}
                          disabled={generatingInterview}
                          cost={CREDIT_COSTS.GENERATE_INTERVIEW}
                        />
                      </CreditGate>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate New Analysis Button */}
        {fitResult && (
          <div className="mb-12 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <button
              onClick={handleGenerateNew}
              className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="flex flex-col items-start leading-tight">
                <span>{t('dashboard.toolkit.newAnalysis')}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {t('dashboard.toolkit.newAnalysisBody')}
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
            className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 flex items-center gap-3 p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group"
          >
            <div className="w-11 h-11 rounded-lg bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                {t('dashboard.toolkit.prepReady')}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                {getPrepSummary(application)} - tap to review answers and talking points
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors shrink-0" />
          </Link>
        )}

        {/* Analyze Button (desktop) — Only show if in upload mode AND not yet
            analyzed. The mobile equivalent is a sticky bottom bar rendered
            outside <main> so it survives scroll. Mobile users get a more
            compact step-checklist + cost summary in that bar; desktop keeps
            the hero treatment. */}
        {workflowMode === 'upload' && !fitResult && !analyzing && (
          <div className="hidden md:flex md:items-center md:justify-between gap-4 mt-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {!cvChosen
                ? t('dashboard.ready.chooseCv')
                : !job
                  ? t('dashboard.ready.addJob')
                  : t('dashboard.ready.ready')}
            </p>
            <CreditGate cost={CREDIT_COSTS.FIT_ANALYSIS}>
              <button
                onClick={handleAnalyze}
                disabled={!cvChosen || !job || analyzing}
                className={`inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg font-semibold transition-all ${
                  !cvChosen || !job || analyzing
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                {analyzing ? (
                  <>
                    <AriaLoader inline tone="mono" size={16} label="" /> Analyzing…
                  </>
                ) : (
                  <>
                    Analyze fit{' '}
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/15 dark:bg-slate-900/10">
                      {CREDIT_COSTS.FIT_ANALYSIS} cr
                    </span>
                  </>
                )}
              </button>
            </CreditGate>
          </div>
        )}

        {/* Mobile sticky Analyze CTA — replaces the desktop hero button on
            small screens. Always visible at the bottom while in upload mode
            so users don't have to scroll to discover the action or the cost.
            On Capacitor we offset above the bottom nav; on mobile web we sit
            flush with the safe-area inset. */}
        {workflowMode === 'upload' && !fitResult && !analyzing && (
          <div
            className="md:hidden fixed left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            style={
              isMobile() ? { bottom: 'calc(4rem + env(safe-area-inset-bottom))' } : { bottom: 0 }
            }
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span
                  className={`flex items-center gap-1 ${cvChosen ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}`}
                >
                  {cvChosen ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                  )}
                  CV
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                <span
                  className={`flex items-center gap-1 ${job ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}`}
                >
                  {job ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                  )}
                  Job
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full">
                10 cr
              </span>
            </div>
            <CreditGate cost={CREDIT_COSTS.FIT_ANALYSIS}>
              <button
                onClick={handleAnalyze}
                disabled={!cvChosen || !job || analyzing}
                className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm transition-all ${
                  !cvChosen || !job || analyzing
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-semibold cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                {!cvChosen || !job ? (
                  'Complete both steps to continue'
                ) : (
                  <>
                    {t('dashboard.setup.analyzeCta')}
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/15 dark:bg-slate-900/10">
                      {CREDIT_COSTS.FIT_ANALYSIS} cr
                    </span>
                  </>
                )}
              </button>
            </CreditGate>
          </div>
        )}

        {/* Mobile sticky next-step CTA — surfaces the single primary action for
            the results state so users don't have to scroll to the toolkit. Same
            fixed/Capacitor-offset pattern as the setup analyze bar above. Desktop
            keeps the toolkit buttons as the action. */}
        {fitResult && !analyzing && application?.applicationId && (
          <div
            className="md:hidden fixed left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            style={
              isMobile() ? { bottom: 'calc(4rem + env(safe-area-inset-bottom))' } : { bottom: 0 }
            }
          >
            {!application.optimizedCV ? (
              <div className="flex flex-col gap-2">
                {STUDIO_TAILORING_ENABLED && (
                  <button
                    onClick={openInAriaStudio}
                    disabled={openingStudio}
                    className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm btn-primary disabled:opacity-60"
                  >
                    <AriaOrbit size={16} tone="mono" />
                    {openingStudio
                      ? t('dashboard.toolkit.openingStudio')
                      : t('dashboard.toolkit.workWithAria')}
                  </button>
                )}
                <CreditGate cost={CREDIT_COSTS.GENERATE_CV}>
                  <button
                    onClick={handleGenerateCV}
                    disabled={generatingCV}
                    className="w-full text-center text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 disabled:opacity-60"
                  >
                    {generatingCV
                      ? t('dashboard.toolkit.generating')
                      : t('dashboard.toolkit.justGenerateIt', { cost: CREDIT_COSTS.GENERATE_CV })}
                  </button>
                </CreditGate>
              </div>
            ) : (
              <button
                onClick={() =>
                  navigate(`/resume/${application?.draftId || application?.applicationId}`)
                }
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm btn-primary"
              >
                {t('dashboard.toolkit.viewCv')}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Auto-Analysis Modal */}
        {showAutoAnalyzeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
              {/* Mobile: stacked + centered. Desktop (sm+): icon left, copy right. */}
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-4 mb-5 sm:mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 mb-3 sm:mb-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-1.5 sm:mb-2 font-heading">
                    {t('dashboard.autoAnalysis.title')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('dashboard.autoAnalysis.body')}
                  </p>
                </div>
              </div>
              {/* Mobile: stacked, full-width, primary on top. Desktop: inline right-aligned. */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAutoAnalyzeModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl transition-all active:scale-[0.98]"
                >
                  {t('dashboard.autoAnalysis.keepManual')}
                </button>
                <button
                  onClick={enableAutoAnalysis}
                  className="w-full sm:w-auto btn-primary px-5 py-2.5 text-xs rounded-xl gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('dashboard.autoAnalysis.enable')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-4 mb-5 sm:mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100/50 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mb-3 sm:mb-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-1.5 sm:mb-2 font-heading">
                    {t('dashboard.deleteCv.title')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('dashboard.deleteCv.body', {
                      title: draftToDelete?.title || t('dashboard.untitledCv'),
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDraftToDelete(null);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/10 hover:shadow-rose-500/20 transition-all active:scale-[0.98]"
                >
                  {t('dashboard.deleteCv.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Insufficient Credits Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center relative">
            <button
              onClick={() => setShowCreditModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-805 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-5">
              <AriaOrbit size={20} />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 font-heading">
              {t('dashboard.insufficientCredits')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              You need{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {requiredCredits} A.I credits
              </span>{' '}
              to perform this action, but you only have{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {user.credits || 0}
              </span>
              .
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/credits')}
                className="w-full btn-primary py-3 rounded-xl text-sm gap-2"
              >
                <AriaOrbit size={16} tone="mono" /> Get More A.I Credits
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  OR
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <button
                onClick={() => navigate('/credits')} // For now direct to store where ad option lives
                className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4 text-amber-500" /> Watch Ad for Free A.I Credits
              </button>
            </div>
          </div>
        </div>
      )}

      <MetricCaptureModal
        isOpen={metricCapture.isOpen}
        vagueBullets={metricCapture.vagueBullets}
        primaryLabel={t(
          metricCapture.mode === 'bundle'
            ? 'dashboard.metricCapture.generateBundle'
            : 'dashboard.metricCapture.generateCv'
        )}
        onSubmit={handleMetricCaptureSubmit}
        onCancel={handleMetricCaptureCancel}
      />
    </div>
  );
};

export default Dashboard;
