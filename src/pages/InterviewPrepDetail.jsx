import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Eye,
  CheckCircle2,
  Circle,
  HelpCircle,
  PlayCircle,
  StickyNote,
  Plus,
  Loader,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  EyeOff,
  Play,
  Lock,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import Navbar from '../components/Navbar';
import InterviewPrepService from '../services/interviewPrep.service';
import { useMinVisible } from '../hooks/useMinVisible';
import {
  getJobQuestions,
  getQuestionsToAsk,
  getSkillPrep,
  getStories,
  computeReadiness,
  computeInterviewGate,
} from '../utils/interviewPrep';
import { initials } from '../utils/avatar';
import NotesList from '../components/prep/NotesList';
import StoryBank from '../components/prep/StoryBank';
import RoleBrief from '../components/prep/RoleBrief';
import CalmKit from '../components/prep/CalmKit';
import BodyLanguage from '../components/prep/BodyLanguage';
import NervesTrend from '../components/prep/NervesTrend';
import RecordingsPanel from '../components/prep/RecordingsPanel';
import LastAssessmentCard from '../components/prep/LastAssessmentCard';
import RoundReviews from '../components/prep/RoundReviews';
import InterviewerPanel from '../components/prep/InterviewerPanel';
import LoopBoard from '../components/prep/LoopBoard';
import DressGuide from '../components/prep/DressGuide';
import { CONFIDENCE_OPTIONS } from '../components/prep/PracticeRunner';
import AdPlayer from '../components/AdPlayer';
import CVViewModal from '../components/CVViewModal';
import api from '../services/api';

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const MotionDiv = motion.div;

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

// Seed for the "draft your weakness" note — the title keyword ("weakness") is
// what the readiness checks key off, so seeding it makes the task completable in
// one click. Shared by ReadinessOverview, the gate checklist, and gap coaching.
const WEAKNESS_SEED = {
  title: 'My weakness / growth area',
  body: 'Weakness or growth area I’ll talk about:\n- \n\nWhat I’m actively doing about it:\n- \n\n(Tip: pick a real growth area — not a humblebrag — and show the action you’re taking. Mirror a gap flagged in the Role tab.)',
};

// Generic roster shown (blurred, behind a lock) to free users when we have no
// real panel to preview — a teaser for the paid multi-interviewer loop.
const PLACEHOLDER_SEATS = [
  { name: 'HR Screen', role: 'Recruiter' },
  { name: 'Hiring Manager', role: 'Your future boss' },
  { name: 'Panel Member', role: 'Cross-functional' },
];

const InterviewPrepDetail = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Navigation model: a primary group (Prepare / Game day / Results) and — while
  // in Prepare — which one section is showing. `prepSection` starts null until
  // the default-selection effect picks the most useful section.
  const [primaryTab, setPrimaryTab] = useState('prepare');
  const [prepSection, setPrepSection] = useState(null);
  const showLoader = useMinVisible(loading, 800);

  // Platform split for AI generation (more questions / story bank): the Android
  // app routes through an AdMob rewarded video (grants credits → nets free);
  // web charges credits directly with no ad.
  const adRewarded = isAndroidNative();

  // "Generate more questions" CTA state. When credits run low, the button
  // becomes a "Watch ad to unlock more questions" CTA that opens AdPlayer.
  const [generatingMore, setGeneratingMore] = useState(false);
  const [adForMoreOpen, setAdForMoreOpen] = useState(false);
  const [newQuestionIndices, setNewQuestionIndices] = useState(() => new Set());
  // Story Bank generation — ad-rewarded, same pattern as "Get more questions".
  const [generatingStories, setGeneratingStories] = useState(false);
  const [adForStoriesOpen, setAdForStoriesOpen] = useState(false);
  // Essential-answer generation (intro / motivation). `generatingEssential` holds
  // the kind in flight; `adEssentialKind` holds the kind pending an ad (Android).
  const [generatingEssential, setGeneratingEssential] = useState(null);
  const [adEssentialKind, setAdEssentialKind] = useState(null);
  // Dress-guide generation (Role tab). Same ad-rewarded/credit split.
  const [generatingDress, setGeneratingDress] = useState(false);
  const [adForDressOpen, setAdForDressOpen] = useState(false);
  // Inline, view-only CV preview (job-linked prep).
  const [showCv, setShowCv] = useState(false);
  // Seed for the Notes tab — set when the "Draft your answer in My notes" CTA is
  // tapped, so NotesList opens a prefilled new note. Cleared once consumed.
  const [notesSeed, setNotesSeed] = useState(null);
  // Only needed for AdMob SSV — credit balance is tracked globally via the
  // navbar, not in this component.
  const [userId, setUserId] = useState(() => readStoredUser()._id || readStoredUser().id || null);
  // Interview roster ("who interviews you") — lazily fetched when the Role tab
  // opens; powers the loop board (paid) / locked teaser (free).
  const [panel, setPanel] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const isFreeTier = (readStoredUser().tier || 'free') === 'free';
  // Recordings count (device-local) — tracked so the Recordings tab can show an
  // empty state and a badge.
  const [recordingsCount, setRecordingsCount] = useState(null);

  useEffect(() => {
    const refresh = () => {
      const u = readStoredUser();
      setUserId(u._id || u.id || null);
    };
    window.addEventListener('userDataUpdated', refresh);
    return () => window.removeEventListener('userDataUpdated', refresh);
  }, []);

  // Lazily load the interview roster once on mount so the rail can show it.
  // Fetches once, then short-circuits.
  // NOTE: panelLoading must NOT be in the deps — setting it would re-run the
  // effect, fire the cleanup, and cancel the in-flight request (leaving the
  // skeleton stuck forever). Dep is only applicationId.
  useEffect(() => {
    if (panel.length > 0 || panelLoading) return undefined;
    let cancelled = false;
    setPanelLoading(true);
    InterviewPrepService.getPanel(applicationId)
      .then((res) => {
        if (!cancelled && Array.isArray(res?.panel)) setPanel(res.panel);
      })
      .catch(() => {
        /* non-blocking — the roster is a nicety, not core to the page */
      })
      .finally(() => {
        if (!cancelled) setPanelLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const reload = async () => {
    const { application: app } = await InterviewPrepService.getOne(applicationId);
    setApplication(app);
    return app;
  };

  const runGenerateMore = async () => {
    setGeneratingMore(true);
    try {
      const res = await api.post(`/analysis/${applicationId}/generate-more-interview`);
      const { newQuestionIndices: idxs = [], addedCount = 0, remainingCredits } = res.data || {};
      setNewQuestionIndices(new Set(idxs));
      if (typeof remainingCredits === 'number') {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: remainingCredits }));
      }
      await reload();
      if (addedCount > 0) {
        toast.success(`${addedCount} new question${addedCount === 1 ? '' : 's'} added`);
      } else {
        toast.message('No new questions this round — try again for a different angle.');
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to generate more questions';
      const code = e.response?.data?.code;
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(
          adRewarded
            ? 'Not enough credits. Watch an ad to earn more.'
            : 'Not enough credits to generate more questions.'
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setGeneratingMore(false);
    }
  };

  // Generating more questions is an ad-rewarded action — the user always
  // watches a short video and gets the new questions for free. We never
  // charge credits at this entry point, even if the user happens to have a
  // balance. (The /generate-more-interview endpoint still deducts internally;
  // the ad rewards more credits than the call costs, so it nets out positive
  // for the user.)
  const handleGenerateMoreQuestions = () => {
    if (adRewarded) setAdForMoreOpen(true);
    else runGenerateMore();
  };

  // Shared post-ad reward claim used by both the "more questions" and "story
  // bank" ad flows. Claims the reward (web), polls /auth/me until credits land,
  // syncs localStorage + fires the credit events, and returns the final balance.
  // Returns -1 on a hard failure (already toasted by the caller's catch).
  const claimAdReward = async (toastId) => {
    // NATIVE ANDROID ONLY: AdMob credits the account server-side via SSV, which
    // can lag a few seconds — covered by the poll below. Web has no ads (this
    // path is only reached after an AdPlayer completion, which only mounts on
    // native), so there is no client-side reward call.
    const deadline = Date.now() + 20000;
    let credits = 0;
    let fresh = null;
    while (Date.now() < deadline) {
      try {
        const me = await api.get('/auth/me');
        fresh = me.data;
        credits = fresh?.credits ?? 0;
        if (credits >= 5) break;
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (fresh) {
      try {
        const existing = readStoredUser();
        localStorage.setItem('user', JSON.stringify({ ...existing, ...fresh }));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: fresh }));
      window.dispatchEvent(new CustomEvent('credit_updated', { detail: credits }));
    }

    if (credits < 5) {
      toast.error("Reward didn't land in time — try again in a moment.", { id: toastId });
      return -1;
    }
    return credits;
  };

  const handleAdReward = async (run, generatingLabel) => {
    // Close the ad modal immediately; a loading toast covers the post-ad work.
    setAdForMoreOpen(false);
    setAdForStoriesOpen(false);
    setAdEssentialKind(null);
    const toastId = toast.loading('Crediting your account…');
    try {
      const credits = await claimAdReward(toastId);
      if (credits < 0) return;
      toast.loading(generatingLabel, { id: toastId });
      await run();
      toast.dismiss(toastId);
    } catch (e) {
      console.error('Ad reward failed:', e);
      const code = e.response?.data?.code;
      const msg = e.response?.data?.message;
      if (code === 'COOLDOWN') {
        toast.error(msg || 'Please wait a moment before watching another ad.', { id: toastId });
      } else if (code === 'DAILY_CAP') {
        toast.error('Daily ad limit reached. Come back tomorrow.', { id: toastId });
      } else {
        toast.error('Failed to claim ad reward.', { id: toastId });
      }
    }
  };

  const handleAdForMoreComplete = () =>
    handleAdReward(runGenerateMore, 'Generating new questions…');

  // ── Story Bank generation (ad-rewarded, same contract as more questions) ──
  const runGenerateStories = async () => {
    setGeneratingStories(true);
    try {
      const res = await InterviewPrepService.generateStories(applicationId);
      if (typeof res.remainingCredits === 'number') {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      await reload();
      const count = res.stories?.length || 0;
      toast.success(count ? `${count} stories ready` : 'Story bank generated');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to generate stories';
      const code = e.response?.data?.code;
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(
          adRewarded
            ? 'Not enough credits. Watch an ad to earn more.'
            : 'Not enough credits to generate your story bank.'
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setGeneratingStories(false);
    }
  };

  const handleGenerateStories = () => {
    if (adRewarded) setAdForStoriesOpen(true);
    else runGenerateStories();
  };

  // ── Essential answer generation (intro / motivation), 2 credits or ad ──
  const runGenerateEssential = async (kind) => {
    if (!kind) return;
    setGeneratingEssential(kind);
    try {
      const res = await InterviewPrepService.generateEssential(applicationId, kind);
      if (typeof res.remainingCredits === 'number') {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      await reload();
      toast.success(
        kind === 'intro'
          ? 'Your "about you" answer is ready'
          : 'Your "why this role" answer is ready'
      );
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(
          adRewarded
            ? 'Not enough credits. Watch an ad to earn more.'
            : 'Not enough credits (2 needed).'
        );
      } else if (code === 'NO_CV_GROUNDING') {
        toast.error(e.response?.data?.message);
      } else {
        toast.error(e.response?.data?.message || 'Failed to generate answer');
      }
    } finally {
      setGeneratingEssential(null);
    }
  };

  const handleGenerateEssential = (kind) => {
    if (adRewarded) setAdEssentialKind(kind);
    else runGenerateEssential(kind);
  };

  const runGenerateDressGuide = async () => {
    setGeneratingDress(true);
    try {
      const res = await InterviewPrepService.generateDressGuide(applicationId);
      if (typeof res.remainingCredits === 'number') {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      await reload();
      toast.success('Your dress guide is ready');
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(
          adRewarded
            ? 'Not enough credits. Watch an ad to earn more.'
            : 'Not enough credits (2 needed).'
        );
      } else {
        toast.error(e.response?.data?.message || 'Failed to generate dress guide');
      }
    } finally {
      setGeneratingDress(false);
    }
  };

  const handleGenerateDressGuide = () => {
    if (adRewarded) setAdForDressOpen(true);
    else runGenerateDressGuide();
  };
  const handleAdForDressComplete = () =>
    handleAdReward(runGenerateDressGuide, 'Styling your look…');
  const handleAdForEssentialComplete = () =>
    handleAdReward(() => runGenerateEssential(adEssentialKind), 'Writing your answer…');
  const handleAdForStoriesComplete = () =>
    handleAdReward(runGenerateStories, 'Building your stories…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const app = await reload();
        if (cancelled) return;
        // Default view: always start in Prepare. Role brief for job-linked prep
        // (orient first), else the first populated prep section.
        const stories = getStories(app);
        const skills = getSkillPrep(app);
        const questions = getJobQuestions(app);
        const isCvOnlyApp = app.source === 'draft' || (!app.jobId && !app.jobTitle);
        const fa = app.fitAnalysis || {};
        const hasRole =
          !isCvOnlyApp &&
          (typeof app.fitScore === 'number' ||
            !!fa.recommendation ||
            !!fa.overallFeedback ||
            (fa.matchedSkills || []).length > 0 ||
            (fa.missingSkills || []).length > 0);
        setPrimaryTab('prepare');
        setPrepSection(
          hasRole
            ? 'role'
            : questions.length
              ? 'questions'
              : stories.length
                ? 'stories'
                : skills.length
                  ? 'skills'
                  : 'notes'
        );
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load interview prep');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  if (showLoader) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navbar />
        <div className="text-center py-12 text-rose-600 dark:text-rose-300">{error}</div>
      </div>
    );
  }

  if (!application) return null;

  const job = application.jobId || {};
  const isCvOnly = application.source === 'draft' || (!application.jobId && !application.jobTitle);
  const title = job.title || application.jobTitle || (isCvOnly ? 'CV draft' : 'Untitled role');
  const company = job.company || application.jobCompany || '';
  const jobQuestions = getJobQuestions(application);
  const skillsWithEvidence = getSkillPrep(application);
  const questionsToAsk = getQuestionsToAsk(application);
  const stories = getStories(application);
  // Gamified readiness gate: starting an interview is locked until the prep
  // checklist is complete (see computeInterviewGate). Drives both entry points.
  const interviewGate = computeInterviewGate(application);
  // Weak-question set powers the "Practice weak spots" shortcut in the readiness rail.
  const { weakQuestionIndices } = computeReadiness(application);
  const hasWeakQuestions = weakQuestionIndices.length > 0;
  const storyWarnings = application.interviewPrep?.storyFabricationWarnings || [];
  const notes = Array.isArray(application.interviewPrep?.userNotes)
    ? application.interviewPrep.userNotes
    : [];

  // Role brief draws on the job fit-analysis — only meaningful for job-linked prep.
  const fa = application.fitAnalysis || {};
  const hasRoleBrief =
    !isCvOnly &&
    (typeof application.fitScore === 'number' ||
      !!fa.recommendation ||
      !!fa.overallFeedback ||
      (fa.matchedSkills || []).length > 0 ||
      (fa.missingSkills || []).length > 0);

  // Completed interview-loop rounds (per-interviewer scores + assessments).
  const rounds = application?.interviewPrep?.rounds || [];

  // Primary navigation: four groups. Results counts completed rounds; Recordings
  // is its own tab with its device-local count.
  const resultsCount = rounds.length;
  const primaryTabs = [
    { id: 'prepare', label: 'Prepare' },
    { id: 'gameday', label: 'Game day' },
    { id: 'results', label: 'Results', count: resultsCount },
    { id: 'recordings', label: 'Recordings', count: recordingsCount || 0 },
  ];
  // Secondary switcher (only under Prepare): show ONE section at a time.
  const prepSections = [
    ...(hasRoleBrief ? [{ id: 'role', label: 'Role' }] : []),
    { id: 'questions', label: 'Questions', count: jobQuestions.length },
    { id: 'stories', label: 'Stories', count: stories.length },
    { id: 'skills', label: 'Skills', count: skillsWithEvidence.length },
    { id: 'notes', label: 'Notes' },
  ];

  const startPracticeAllQuestions = () => {
    navigate(`/interview-prep/${applicationId}/practice`);
  };

  const startPracticeForSkill = (skillName) => {
    navigate(`/interview-prep/${applicationId}/practice?skill=${encodeURIComponent(skillName)}`);
  };

  const startPracticeForStory = (storyId) => {
    navigate(`/interview-prep/${applicationId}/practice?story=${encodeURIComponent(storyId)}`);
  };

  const startPracticeWeak = () => {
    navigate(`/interview-prep/${applicationId}/practice?filter=weak`);
  };

  const startMockInterview = () => {
    // Hard gate — the button is disabled when locked, but guard the nav too.
    if (!interviewGate.unlocked) return;
    navigate(`/interview-prep/${applicationId}/mock`);
  };

  // Jump to a Prepare section (used by the readiness checklist, essentials CTAs,
  // and "draft your answer in notes" links).
  const goToPrep = (section) => {
    setPrimaryTab('prepare');
    setPrepSection(section);
  };

  // Seed + open the weakness note (completes the "draft your weakness" readiness task).
  const draftWeakness = () => {
    setNotesSeed(WEAKNESS_SEED);
    goToPrep('notes');
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Navbar />

      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/interview-prep')}
              className="p-1.5 -ml-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors shrink-0"
              aria-label="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {title}
                </h1>
                {company && (
                  <span className="hidden sm:inline text-sm text-slate-400 dark:text-slate-500 shrink-0">
                    ·
                  </span>
                )}
                {company && (
                  <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400 truncate">
                    {company}
                  </span>
                )}
                <span
                  className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    isCvOnly
                      ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  }`}
                >
                  {isCvOnly ? 'From CV' : 'Job role'}
                </span>
              </div>
              {company && (
                <p className="sm:hidden text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {company}
                </p>
              )}
              {isCvOnly && (
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Not attached to a job yet
                </p>
              )}
            </div>

            <Link
              to={`/interview-prep/${applicationId}/brief`}
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 rounded-md transition-colors"
              aria-label="Pre-call brief"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Brief</span>
            </Link>

            <Link
              to="/how-to-ace-your-interview"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              aria-label="How scoring works"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">How scoring works</span>
            </Link>

            {isCvOnly ? (
              <Link
                to={application.draftCVId ? `/cv-builder/${application.draftCVId}/skills` : '#'}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                aria-label="Open CV"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Open CV</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowCv(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                aria-label="View CV"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">View CV</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
          {/* Left rail — the prep desk: start the interview + track readiness.
              Stacks above the content on mobile. */}
          <aside className="lg:sticky lg:top-4 flex flex-col gap-4">
            {/* Card A — Start + roster (the crown-jewel primary action) */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                Mock interview
              </p>
              {interviewGate.unlocked ? (
                <button
                  type="button"
                  onClick={startMockInterview}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
                >
                  <PlayCircle className="w-4 h-4" /> Start interview
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Complete your interview readiness to unlock"
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-sm font-semibold px-4 py-2.5 cursor-not-allowed select-none"
                >
                  <Lock className="w-4 h-4" /> Complete prep to unlock
                </button>
              )}
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                A live, spoken mock with an AI interviewer who knows your CV.
              </p>

              {/* Roster — who's interviewing you */}
              <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Who’s interviewing you
                </p>
                {!isFreeTier && panel.length >= 2 ? (
                  <ul className="mt-3 space-y-2.5">
                    {panel
                      .filter((p) => p && p.role)
                      .map((p, i) => (
                        <li key={p.seat ?? i} className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            {initials(p.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {p.name}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              {p.role}
                            </span>
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="relative mt-3">
                    <ul className="space-y-2.5 select-none blur-[3px]" aria-hidden="true">
                      {(panel.length >= 2
                        ? panel.filter((p) => p && p.role)
                        : PLACEHOLDER_SEATS
                      ).map((p, i) => (
                        <li key={p.seat ?? i} className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            {initials(p.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {p.name}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              {p.role}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <Lock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                        Unlock your full interview panel
                      </span>
                      <Link
                        to="/upgrade"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200"
                      >
                        Upgrade <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Card B — Readiness (repurposed ReadinessOverview / checklist) */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Readiness
                </p>
                <p className="font-heading text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {interviewGate.doneCount}
                  <span className="text-slate-400 dark:text-slate-500">
                    /{interviewGate.requiredCount}
                  </span>
                </p>
              </div>

              {/* Progress meter */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${interviewGate.pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
                {interviewGate.unlocked
                  ? "You're prepped — the interview is unlocked."
                  : 'Finish these to unlock your interview.'}
              </p>

              {/* Checklist rows */}
              <ul className="mt-3 space-y-2">
                {interviewGate.tasks.map((t) => (
                  <li key={t.key} className="flex items-center gap-2.5">
                    {t.done ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-xs font-semibold leading-tight ${
                          t.done
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {t.label}
                      </span>
                      {!t.done && (
                        <span className="block text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                          {t.hint}
                        </span>
                      )}
                    </span>
                    {!t.done && (
                      <button
                        type="button"
                        onClick={() => (t.key === 'weakness' ? draftWeakness() : goToPrep(t.tab))}
                        className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
                      >
                        Do it <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {/* Practice weak spots — only once unlocked and weak questions exist */}
              {interviewGate.unlocked && hasWeakQuestions && (
                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={startPracticeWeak}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Practice weak spots{' '}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </section>
          </aside>

          {/* Right column — the tab strip + tab panels (moved verbatim) */}
          <div className="min-w-0">
            {/* Primary sub-nav — four groups sharing the row evenly. Hairline row
                with a 2px indigo underline sliding under the active group. */}
            <div className="mb-6">
              <nav className="flex items-stretch border-b border-slate-200 dark:border-slate-700">
                {primaryTabs.map((tab) => {
                  const active = primaryTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPrimaryTab(tab.id)}
                      className={`relative flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-3 text-[13px] sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                          {tab.count}
                        </span>
                      )}
                      {active && (
                        <motion.span
                          layoutId="prep-tab-underline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                        />
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Secondary switcher — only under Prepare; one section at a time. */}
              {primaryTab === 'prepare' && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {prepSections.map((s) => {
                    const active = prepSection === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setPrepSection(s.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-transparent bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {s.label}
                        {typeof s.count === 'number' && s.count > 0 && (
                          <span className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                            {s.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {primaryTab === 'prepare' && prepSection === 'role' && (
                <MotionDiv
                  key="role"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Paid: the interview LOOP — pick each interviewer for a focused 1:1
                  round and build a combined readiness. Free: the locked teaser. */}
                  {!isFreeTier && panel.length >= 2 ? (
                    <div className="mb-4">
                      {!interviewGate.unlocked && (
                        <div className="mb-3 flex items-center gap-2 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-500/5 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          Finish your interview readiness checklist to unlock these rounds.
                        </div>
                      )}
                      <LoopBoard
                        seats={panel}
                        rounds={rounds}
                        locked={!interviewGate.unlocked}
                        unlockAll={!!application?.unlockAllInterviewers}
                        onStart={(seatIndex) => {
                          if (!interviewGate.unlocked) return;
                          navigate(
                            `/interview-prep/${applicationId}/mock?interviewer=${seatIndex}`
                          );
                        }}
                      />
                    </div>
                  ) : (
                    (panelLoading || panel.length >= 2) && (
                      <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sm:p-5">
                        <InterviewerPanel
                          panel={panel}
                          locked={isFreeTier}
                          loading={panelLoading}
                        />
                        <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
                          On a paid plan, you pick each of these interviewers for a focused 1:1
                          round — and complete your interview loop.
                        </p>
                      </div>
                    )
                  )}

                  <RoleBrief application={application} />
                </MotionDiv>
              )}

              {primaryTab === 'prepare' && prepSection === 'stories' && (
                <MotionDiv
                  key="stories"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <StoryBank
                    applicationId={applicationId}
                    initialStories={stories}
                    warnings={storyWarnings}
                    isCvOnly={isCvOnly}
                    generating={generatingStories}
                    adRewarded={adRewarded}
                    onGenerate={handleGenerateStories}
                    onChange={reload}
                    onPracticeStory={startPracticeForStory}
                  />
                </MotionDiv>
              )}

              {primaryTab === 'prepare' && prepSection === 'skills' && (
                <MotionDiv
                  key="skills"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <SkillsTab
                    skills={skillsWithEvidence}
                    draftCVId={application.draftCVId}
                    onPracticeSkill={startPracticeForSkill}
                  />
                </MotionDiv>
              )}

              {primaryTab === 'prepare' && prepSection === 'questions' && (
                <MotionDiv
                  key="questions"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <QuestionsTab
                    applicationId={applicationId}
                    jobQuestions={jobQuestions}
                    fabricationWarnings={application.interviewPrep?.fabricationWarnings || []}
                    questionsToAsk={questionsToAsk}
                    onStartPractice={startPracticeAllQuestions}
                    onStartMock={startMockInterview}
                    onGenerateMore={handleGenerateMoreQuestions}
                    onGenerateEssential={handleGenerateEssential}
                    generatingEssential={generatingEssential}
                    onGoToNotes={(seed) => {
                      setNotesSeed(seed || null);
                      goToPrep('notes');
                    }}
                    adRewarded={adRewarded}
                    generatingMore={generatingMore}
                    newQuestionIndices={newQuestionIndices}
                    isCvOnly={isCvOnly}
                    onConfidenceChange={reload}
                    gate={interviewGate}
                  />
                </MotionDiv>
              )}

              {primaryTab === 'gameday' && (
                <MotionDiv
                  key="gameday"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="mb-4">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      Game-day readiness
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Walk in calm and ready — not just prepped on what to say.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <NervesTrend application={application} />
                    <DressGuide
                      application={application}
                      onGenerate={handleGenerateDressGuide}
                      generating={generatingDress}
                    />
                    <CalmKit />
                    <BodyLanguage />
                  </div>
                </MotionDiv>
              )}

              {primaryTab === 'prepare' && prepSection === 'notes' && (
                <MotionDiv
                  key="notes"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card p-5 sm:p-6">
                    <NotesList
                      applicationId={applicationId}
                      initialNotes={notes}
                      seed={notesSeed}
                      onSeedConsumed={() => setNotesSeed(null)}
                    />
                  </section>
                </MotionDiv>
              )}

              {primaryTab === 'results' && (
                <MotionDiv
                  key="results"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="space-y-4">
                    {/* Per-interviewer scores + feedback (loop rounds). */}
                    {rounds.length > 0 && <RoundReviews rounds={rounds} />}

                    {/* Re-readable AI assessment — fallback case (no interview-loop
                        rounds, e.g. a free/solo interview). For the loop, each
                        interviewer's full assessment lives on their Reviews card. */}
                    {rounds.length === 0 && <LastAssessmentCard application={application} />}
                  </div>
                </MotionDiv>
              )}

              {primaryTab === 'recordings' && (
                <MotionDiv
                  key="recordings"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Device-local recordings + empty state. */}
                  <RecordingsPanel
                    applicationId={applicationId}
                    onItemsChange={(rows) => setRecordingsCount(rows.length)}
                  />
                  {recordingsCount === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        No recordings yet
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Your live interviews are saved here on this device so you can replay them.
                      </p>
                    </div>
                  )}
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {adForMoreOpen && adRewarded && (
        <AdPlayer
          userId={userId}
          onComplete={handleAdForMoreComplete}
          onClose={() => setAdForMoreOpen(false)}
          title="Unlock More Questions"
          subtitle="Watch a short ad to earn credits and generate fresh interview questions for this role."
          buttonText="Watch & Unlock"
          successTitle="Credits Earned!"
          successMessage="Generating more questions for you…"
          androidTitle="Unlock More Questions"
          androidSubtitle="Watch a quick video to earn credits, then we'll generate fresh questions."
          androidButtonText="Watch Video"
          androidSuccessTitle="Credits Earned!"
          androidSuccessMessage="Generating more questions for you…"
        />
      )}

      {adForStoriesOpen && adRewarded && (
        <AdPlayer
          userId={userId}
          onComplete={handleAdForStoriesComplete}
          onClose={() => setAdForStoriesOpen(false)}
          title="Build Your Story Bank"
          subtitle="Watch a short ad to earn credits and generate STAR stories from your CV for this role."
          buttonText="Watch & Build"
          successTitle="Credits Earned!"
          successMessage="Building your stories…"
          androidTitle="Build Your Story Bank"
          androidSubtitle="Watch a quick video to earn credits, then we'll build your STAR stories."
          androidButtonText="Watch Video"
          androidSuccessTitle="Credits Earned!"
          androidSuccessMessage="Building your stories…"
        />
      )}

      {adEssentialKind && adRewarded && (
        <AdPlayer
          userId={userId}
          onComplete={handleAdForEssentialComplete}
          onClose={() => setAdEssentialKind(null)}
          title="Generate Your Answer"
          subtitle="Watch a short ad to earn credits and write a personalized answer from your CV."
          buttonText="Watch & Generate"
          successTitle="Credits Earned!"
          successMessage="Writing your answer…"
          androidTitle="Generate Your Answer"
          androidSubtitle="Watch a quick video to earn credits, then we'll write your answer."
          androidButtonText="Watch Video"
          androidSuccessTitle="Credits Earned!"
          androidSuccessMessage="Writing your answer…"
        />
      )}

      {adForDressOpen && adRewarded && (
        <AdPlayer
          userId={userId}
          onComplete={handleAdForDressComplete}
          onClose={() => setAdForDressOpen(false)}
          title="Get Your Dress Guide"
          subtitle="Watch a short ad to earn credits and get a tailored what-to-wear guide for this role."
          buttonText="Watch & Generate"
          successTitle="Credits Earned!"
          successMessage="Styling your look…"
          androidTitle="Get Your Dress Guide"
          androidSubtitle="Watch a quick video to earn credits, then we'll tailor your interview outfit."
          androidButtonText="Watch Video"
          androidSuccessTitle="Credits Earned!"
          androidSuccessMessage="Styling your look…"
        />
      )}

      {!isCvOnly && (
        <CVViewModal
          applicationId={application._id}
          isOpen={showCv}
          onClose={() => setShowCv(false)}
        />
      )}
    </div>
  );
};

// Skills are a REFERENCE layer (not a practice/readiness mode): quick,
// CV-grounded soundbites for "what's your experience with X?" probes. They
// auto-surface from the linked CV (the backend reads them through), so there's
// no manual "pull" and no per-skill rating — full narratives live in Stories.
const SkillsTab = ({ skills, draftCVId, onPracticeSkill }) => {
  if (skills.length === 0) {
    return (
      <section className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8">
        <SectionHeader
          eyebrow="Reference"
          title="Skill soundbites"
          subtitle="Quick, CV-grounded answers for skill-probe questions"
        />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          When your CV has AI-generated skills with evidence, their rehearsable talking points
          appear here automatically. Generate skills in the CV builder to populate them.
        </p>
        {draftCVId && (
          <Link
            to={`/cv-builder/${draftCVId}/skills`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <Eye className="w-4 h-4" /> Open CV builder
          </Link>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/15 border border-emerald-100 dark:border-emerald-500/30 px-3 py-2.5">
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Quick soundbites</span>{' '}
          for &ldquo;what&apos;s your experience with X?&rdquo; questions, pulled from your CV. For
          full STAR narratives, use the{' '}
          <span className="font-semibold text-indigo-700 dark:text-indigo-300">Stories</span> tab.
        </p>
      </div>
      {skills.map((skill, i) => (
        <SkillCard
          key={`${skill.name}-${i}`}
          skill={skill}
          onPractice={() => onPracticeSkill(skill.name)}
        />
      ))}
    </section>
  );
};

const SkillCard = ({ skill, onPractice }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card p-4">
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{skill.name}</p>
          {skill.category && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              {skill.category}
            </span>
          )}
        </div>
        {skill.talkingPoint && (
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-1.5">
            {skill.talkingPoint}
          </p>
        )}
        {Array.isArray(skill.evidence) && skill.evidence.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
              From:
            </span>
            {skill.evidence.map((ev, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-semibold uppercase"
              >
                {ev.type === 'experience' ? 'Work history' : ev.type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>

    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <button
        type="button"
        onClick={onPractice}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
      >
        <PlayCircle className="w-4 h-4" />
        Rehearse this
      </button>
    </div>
  </div>
);

const QuestionListItem = ({
  applicationId,
  question,
  index,
  isExpanded,
  onToggle,
  onConfidenceChange,
  warnings,
}) => {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const attempts = Array.isArray(question.attempts) ? question.attempts : [];
  const bestScore = attempts.length ? Math.max(...attempts.map((a) => a.score || 0)) : null;

  const handleMarkConfidence = async (level) => {
    const nextLevel = question.confidence === level ? null : level;
    setSaving(true);
    try {
      await InterviewPrepService.updateQuestionConfidence(
        applicationId,
        question.question,
        index,
        nextLevel
      );
      toast.success('Confidence updated');
      onConfidenceChange?.();
    } catch {
      toast.error('Failed to update confidence');
    } finally {
      setSaving(false);
    }
  };

  const startPracticeThis = () => {
    navigate(`/interview-prep/${applicationId}/practice?questionIndex=${index}`);
  };

  const typeLabel = question.type
    ? question.type.charAt(0).toUpperCase() + question.type.slice(1)
    : 'Technical';
  const typeBadgeColor =
    question.type === 'behavioral'
      ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
      : question.type === 'situational'
        ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
        : 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-card overflow-hidden">
      {/* Header Row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 p-4 cursor-pointer select-none text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${typeBadgeColor}`}
            >
              {typeLabel}
            </span>
            {question.confidence && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  question.confidence === 'ready'
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                    : question.confidence === 'almost'
                      ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                      : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                }`}
              >
                {question.confidence.replace('_', ' ')}
              </span>
            )}
            {bestScore !== null && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                Best {bestScore}% · {attempts.length} attempt{attempts.length === 1 ? '' : 's'}
              </span>
            )}
            {warnings && warnings.unsupportedClaims?.length > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> Verify claims
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {question.question}
          </h4>
        </div>
        <div className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 mt-0.5 shrink-0">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20">
              {/* Grounding CV badging */}
              {question.sourcedFrom && question.sourcedFrom.length > 0 && (
                <div className="flex items-center gap-1.5 mb-3 flex-wrap pt-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                    Grounded in:
                  </span>
                  {question.sourcedFrom.map((src, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-semibold uppercase"
                    >
                      {src.type === 'experience' ? 'Work history' : src.type}
                    </span>
                  ))}
                </div>
              )}

              {/* Warnings Panel */}
              {warnings && warnings.unsupportedClaims?.length > 0 && (
                <div className="mb-3.5 p-3.5 bg-amber-50/60 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Verify these facts before you rehearse:</span> the
                    model answer (shown in Practice / Interview mode) includes details not found in
                    your CV profile:
                    <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium text-amber-800 dark:text-amber-200">
                      {warnings.unsupportedClaims.map((claim, idx) => (
                        <li key={idx}>{claim}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Model answer is intentionally hidden here — it's revealed in
                  Practice mode ("Reveal answer") or read aloud in Interview
                  mode, so the user rehearses before peeking. */}
              <div className="bg-indigo-50/50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 rounded-lg p-3.5 mb-4 flex items-start gap-2.5">
                <EyeOff className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Model answer hidden on purpose
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Rehearse out loud first, then reveal the model answer in{' '}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                      Practice mode
                    </span>{' '}
                    or hear it read to you in{' '}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                      Interview mode
                    </span>
                    .
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3.5 border-t border-slate-150 dark:border-slate-700">
                <button
                  type="button"
                  onClick={startPracticeThis}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  <Play className="w-3.5 h-3.5" /> Practice this question
                </button>

                <div className="sm:ml-auto flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mr-1">
                    Readiness:
                  </span>
                  {CONFIDENCE_OPTIONS.map((opt) => {
                    const active = question.confidence === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleMarkConfidence(opt.id)}
                        disabled={saving}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-colors ${
                          active ? opt.activeClasses : opt.classes
                        } disabled:opacity-60`}
                      >
                        {active ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Circle className="w-3 h-3" />
                        )}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Question categories, in display order. The generated `type` maps onto these;
// anything unrecognized falls into "Other".
const QUESTION_CATEGORIES = [
  { key: 'intro', label: 'Tell me about yourself' },
  { key: 'behavioral', label: 'Behavioral' },
  { key: 'technical', label: 'Technical' },
  { key: 'situational', label: 'Situational' },
  { key: 'motivation', label: 'Why this role / company' },
  { key: 'gap', label: 'Gaps & weaknesses' },
  { key: 'other', label: 'Other' },
];

// Group questions by category while preserving each one's original index (used
// for confidence, practice routing, and fabrication-warning lookup).
const groupQuestionsByCategory = (questions) => {
  const byKey = {};
  questions.forEach((q, i) => {
    const t = typeof q.type === 'string' ? q.type.toLowerCase() : '';
    const key = QUESTION_CATEGORIES.some((c) => c.key === t) ? t : 'other';
    (byKey[key] = byKey[key] || []).push({ q, i });
  });
  return QUESTION_CATEGORIES.filter((c) => byKey[c.key]?.length).map((c) => ({
    key: c.key,
    label: c.label,
    items: byKey[c.key],
  }));
};

// Universal questions every interview opens with. `intro` and `motivation` can be
// turned into a personalized, CV-grounded answer on demand (then they move into the
// graded question list); `gap` stays coaching-only (auto-writing someone's weakness
// is risky — better to guide them to pick their own).
const ESSENTIALS = [
  {
    kind: 'intro',
    q: 'Tell me about yourself.',
    tip: 'A 60–90s pitch: current role → 1–2 relevant wins → why this role excites you. Lead with a Story Bank highlight; don’t recite your CV top-to-bottom.',
    generatable: true,
  },
  {
    kind: 'motivation',
    q: 'Why do you want this role / this company?',
    tip: 'Connect your goals to the role and name something specific about the company or product. Tie it to a strength from the Role tab.',
    generatable: true,
  },
  {
    kind: 'gap',
    q: 'What’s your biggest weakness / a gap in your experience?',
    tip: 'Pick a real growth area (not a humblebrag), then show what you’re actively doing about it — mirror the gaps flagged in the Role tab.',
    generatable: false,
    noteSeed: WEAKNESS_SEED,
  },
];

const EssentialsSection = ({
  jobQuestions,
  adRewarded,
  generatingEssential,
  onGenerateEssential,
  onGoToNotes,
}) => {
  const hasType = (t) => (jobQuestions || []).some((q) => (q.type || '').toLowerCase() === t);
  // Once intro/motivation has a personalized answer, it lives in the grouped
  // question list — hide its coaching card here to avoid duplication.
  const visible = ESSENTIALS.filter((e) => !(e.generatable && hasType(e.kind)));
  if (visible.length === 0) return null;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card p-5 sm:p-6">
      <SectionHeader
        eyebrow="Essentials"
        title="Interview essentials"
        subtitle="The questions almost every interview opens with"
      />
      <div className="mt-4 space-y-4">
        {visible.map((e) => (
          <div key={e.kind} className="border-l-2 border-amber-200 dark:border-amber-500/30 pl-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{e.q}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {e.tip}
            </p>
            {e.generatable && onGenerateEssential && (
              <button
                type="button"
                onClick={() => onGenerateEssential(e.kind)}
                disabled={generatingEssential === e.kind}
                className="mt-2 inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/50 text-white text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generatingEssential === e.kind ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" /> Writing…
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Generate from my CV
                    <span className="ml-1 inline-flex items-center gap-1 pl-1.5 pr-1.5 py-0.5 rounded bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                      {adRewarded ? (
                        <>
                          <PlayCircle className="w-3 h-3" /> Ad
                        </>
                      ) : (
                        '2 cr'
                      )}
                    </span>
                  </>
                )}
              </button>
            )}
            {!e.generatable && onGoToNotes && (
              <button
                type="button"
                onClick={() => onGoToNotes(e.noteSeed)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-xs font-semibold transition-colors"
              >
                <StickyNote className="w-3.5 h-3.5" /> Draft your answer in My notes
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const QuestionsTab = ({
  applicationId,
  jobQuestions,
  fabricationWarnings,
  questionsToAsk,
  onStartPractice,
  onStartMock,
  onGenerateMore,
  onGenerateEssential,
  generatingEssential,
  onGoToNotes,
  adRewarded,
  generatingMore,
  newQuestionIndices,
  isCvOnly,
  onConfidenceChange,
  gate,
}) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const canGenerateMore = !isCvOnly && jobQuestions.length > 0;
  const interviewLocked = gate && !gate.unlocked;

  return (
    <div className="space-y-6">
      <EssentialsSection
        jobQuestions={jobQuestions}
        adRewarded={adRewarded}
        generatingEssential={generatingEssential}
        onGenerateEssential={isCvOnly ? null : onGenerateEssential}
        onGoToNotes={onGoToNotes}
      />

      {jobQuestions.length === 0 && (
        <section className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 text-center">
          <MessageSquare className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No job-specific questions yet. Generate interview prep from the dashboard.
          </p>
        </section>
      )}

      {jobQuestions.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <SectionHeader
              eyebrow="Questions"
              title="Job-based prep"
              subtitle={`${jobQuestions.length} likely question${jobQuestions.length === 1 ? '' : 's'} with rehearsable answers`}
            />
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={onStartPractice}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Practice all
              </button>
              {interviewLocked ? (
                <button
                  type="button"
                  disabled
                  title="Complete your interview readiness to unlock"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Complete prep to unlock
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartMock}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  <Play className="w-3.5 h-3.5" />
                  Interview Mode
                </button>
              )}
            </div>
          </div>

          {/* Questions grouped by category */}
          <div className="space-y-5 mb-6">
            {groupQuestionsByCategory(jobQuestions).map((group) => (
              <div key={group.key}>
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
                  {group.label}{' '}
                  <span className="text-slate-300 dark:text-slate-600">· {group.items.length}</span>
                </p>
                <div className="space-y-3">
                  {group.items.map(({ q, i }) => {
                    const warnings = (fabricationWarnings || []).find((w) => w.index === i);
                    return (
                      <QuestionListItem
                        key={i}
                        applicationId={applicationId}
                        question={q}
                        index={i}
                        isExpanded={expandedIndex === i}
                        onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
                        onConfidenceChange={onConfidenceChange}
                        warnings={warnings}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {newQuestionIndices && newQuestionIndices.size > 0 && (
            <div className="mt-4 space-y-2 mb-6">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                Just added
              </p>
              <ul className="space-y-1.5">
                {jobQuestions.map((q, i) => {
                  if (!newQuestionIndices.has(i)) return null;
                  const text = typeof q === 'string' ? q : q?.question;
                  if (!text) return null;
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-3 border-l-2 border-emerald-300 dark:border-emerald-500/30"
                    >
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wide shrink-0 mt-0.5">
                        New
                      </span>
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {canGenerateMore && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onGenerateMore}
                disabled={generatingMore}
                className="group relative inline-flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/50 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {generatingMore ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Get more questions
                    {adRewarded ? (
                      <span className="inline-flex items-center gap-1 ml-1 pl-2 pr-2 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                        <PlayCircle className="w-3 h-3" />
                        Ad video
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 ml-1 pl-2 pr-2 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                        5 credits
                      </span>
                    )}
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {adRewarded
                  ? 'Watch a short ad to unlock fresh questions — free, no credits used.'
                  : 'Uses 5 credits to generate fresh questions.'}
              </p>
            </div>
          )}
        </section>
      )}

      {questionsToAsk.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card p-5 sm:p-6">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
            Questions to ask the interviewer
          </h4>
          <ul className="space-y-2">
            {questionsToAsk.map((q, i) => (
              <li
                key={i}
                className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-3 border-l-2 border-emerald-200 dark:border-emerald-500/30"
              >
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const SectionHeader = ({ eyebrow, title, subtitle }) => (
  <div className="min-w-0">
    {eyebrow && (
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {eyebrow}
      </p>
    )}
    <h2 className="mt-1 font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
      {title}
    </h2>
    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
  </div>
);

export default InterviewPrepDetail;
