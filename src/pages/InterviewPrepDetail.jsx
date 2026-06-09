import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  MessageSquare,
  Sparkles,
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
  BookOpen,
  ClipboardList,
  Target,
  Wind,
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
  getInterviewTrend,
} from '../utils/interviewPrep';
import NotesList from '../components/prep/NotesList';
import StoryBank from '../components/prep/StoryBank';
import ReadinessOverview from '../components/prep/ReadinessOverview';
import RoleBrief from '../components/prep/RoleBrief';
import CalmKit from '../components/prep/CalmKit';
import BodyLanguage from '../components/prep/BodyLanguage';
import NervesTrend from '../components/prep/NervesTrend';
import LastInterviewCard from '../components/prep/LastInterviewCard';
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

const InterviewPrepDetail = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
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

  useEffect(() => {
    const refresh = () => {
      const u = readStoredUser();
      setUserId(u._id || u.id || null);
    };
    window.addEventListener('userDataUpdated', refresh);
    return () => window.removeEventListener('userDataUpdated', refresh);
  }, []);

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
    // Web: claim the Monetag reward synchronously. Android: AdMob credits
    // server-side via SSV, which can lag a few seconds — covered by the poll.
    if (!isAndroidNative()) {
      await api.post('/billing/watch-ad', { type: 'video' });
    }

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
        // Default tab: Role brief for job-linked prep (orient first), else the
        // most actionable populated tab.
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
        setActiveTab(
          hasRole
            ? 'role'
            : stories.length
              ? 'stories'
              : skills.length
                ? 'skills'
                : questions.length
                  ? 'questions'
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
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="text-center py-12 text-rose-600">{error}</div>
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

  const tabs = [
    ...(hasRoleBrief ? [{ id: 'role', label: 'Role', icon: Target, count: 0 }] : []),
    { id: 'stories', label: 'Stories', icon: BookOpen, count: stories.length },
    { id: 'skills', label: 'Skills', icon: Sparkles, count: skillsWithEvidence.length },
    { id: 'questions', label: 'Questions', icon: MessageSquare, count: jobQuestions.length },
    { id: 'gameday', label: 'Game day', icon: Wind, count: 0 },
    { id: 'notes', label: 'My notes', icon: StickyNote, count: notes.length },
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
    navigate(`/interview-prep/${applicationId}/mock`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/interview-prep')}
              className="p-1.5 -ml-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
              aria-label="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  {title}
                </h1>
                {company && (
                  <span className="hidden sm:inline text-sm text-slate-400 shrink-0">·</span>
                )}
                {company && (
                  <span className="hidden sm:inline text-sm text-slate-500 truncate">
                    {company}
                  </span>
                )}
                <span
                  className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    isCvOnly ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {isCvOnly ? 'From CV' : 'Job role'}
                </span>
              </div>
              {company && (
                <p className="sm:hidden text-xs text-slate-500 truncate mt-0.5">{company}</p>
              )}
              {isCvOnly && (
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Not attached to a job yet
                </p>
              )}
            </div>

            <Link
              to={`/interview-prep/${applicationId}/brief`}
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
              aria-label="Pre-call brief"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Brief</span>
            </Link>

            {isCvOnly ? (
              <Link
                to={application.draftCVId ? `/cv-builder/${application.draftCVId}/skills` : '#'}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                aria-label="Open CV"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Open CV</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowCv(true)}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                aria-label="View CV"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">View CV</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {!isCvOnly ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 items-stretch">
            <LastInterviewCard
              session={application.interviewPrep?.lastInterviewSession}
              trend={getInterviewTrend(application)}
              onStart={startMockInterview}
              onPracticeQuestion={(i) =>
                navigate(`/interview-prep/${applicationId}/practice?questionIndex=${i}`)
              }
            />
            <ReadinessOverview
              application={application}
              onPracticeWeak={startPracticeWeak}
              onGoToTab={setActiveTab}
              onGenerateEssential={handleGenerateEssential}
              generatingEssential={generatingEssential}
              onDraftWeakness={() => {
                setNotesSeed({
                  title: 'My weakness / growth area',
                  body: 'Weakness or growth area I’ll talk about:\n- \n\nWhat I’m actively doing about it:\n- \n\n(Tip: pick a real growth area — not a humblebrag — and show the action you’re taking. Mirror a gap flagged in the Role tab.)',
                });
                setActiveTab('notes');
              }}
            />
          </div>
        ) : (
          <div className="mb-6">
            <ReadinessOverview
              application={application}
              onPracticeWeak={startPracticeWeak}
              onGoToTab={setActiveTab}
              onGenerateEssential={handleGenerateEssential}
              generatingEssential={generatingEssential}
              onDraftWeakness={() => {
                setNotesSeed({
                  title: 'My weakness / growth area',
                  body: 'Weakness or growth area I’ll talk about:\n- \n\nWhat I’m actively doing about it:\n- \n\n(Tip: pick a real growth area — not a humblebrag — and show the action you’re taking. Mirror a gap flagged in the Role tab.)',
                });
                setActiveTab('notes');
              }}
            />
          </div>
        )}

        {/* Tabs */}
        <nav className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                  active ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold ${
                      active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
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

        <AnimatePresence mode="wait">
          {activeTab === 'role' && (
            <MotionDiv
              key="role"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <RoleBrief
                application={application}
                onGenerateDressGuide={handleGenerateDressGuide}
                generatingDress={generatingDress}
              />
            </MotionDiv>
          )}

          {activeTab === 'stories' && (
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

          {activeTab === 'skills' && (
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

          {activeTab === 'questions' && (
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
                  setActiveTab('notes');
                }}
                adRewarded={adRewarded}
                generatingMore={generatingMore}
                newQuestionIndices={newQuestionIndices}
                isCvOnly={isCvOnly}
                onConfidenceChange={reload}
              />
            </MotionDiv>
          )}

          {activeTab === 'gameday' && (
            <MotionDiv
              key="gameday"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Game-day readiness
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Walk in calm and ready — not just prepped on what to say.
                </p>
              </div>
              <div className="space-y-4">
                <NervesTrend application={application} />
                <CalmKit />
                <BodyLanguage />
              </div>
            </MotionDiv>
          )}

          {activeTab === 'notes' && (
            <MotionDiv
              key="notes"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
                <NotesList
                  applicationId={applicationId}
                  initialNotes={notes}
                  seed={notesSeed}
                  onSeedConsumed={() => setNotesSeed(null)}
                />
              </section>
            </MotionDiv>
          )}
        </AnimatePresence>
      </main>

      {adForMoreOpen && (
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

      {adForStoriesOpen && (
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

      {adEssentialKind && (
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

      {adForDressOpen && (
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
      <section className="bg-white border border-dashed border-slate-200 rounded-xl p-6 sm:p-8">
        <SectionHeader
          icon={Sparkles}
          title="Skill soundbites"
          subtitle="Quick, CV-grounded answers for skill-probe questions"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
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
      <div className="flex items-start gap-2 rounded-lg bg-emerald-50/50 border border-emerald-100 px-3 py-2.5">
        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-700">Quick soundbites</span> for
          &ldquo;what&apos;s your experience with X?&rdquo; questions, pulled from your CV. For full
          STAR narratives, use the <span className="font-semibold text-indigo-700">Stories</span>{' '}
          tab.
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
  <div className="bg-white border border-slate-200 rounded-xl p-4">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-slate-900">{skill.name}</p>
          {skill.category && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
              {skill.category}
            </span>
          )}
        </div>
        {skill.talkingPoint && (
          <p className="text-sm text-slate-700 leading-relaxed mt-1.5">{skill.talkingPoint}</p>
        )}
        {Array.isArray(skill.evidence) && skill.evidence.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">From:</span>
            {skill.evidence.map((ev, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-semibold uppercase"
              >
                {ev.type === 'experience' ? 'Work history' : ev.type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>

    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        type="button"
        onClick={onPractice}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
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
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : question.type === 'situational'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <div className="border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all shadow-sm overflow-hidden">
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
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : question.confidence === 'almost'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {question.confidence.replace('_', ' ')}
              </span>
            )}
            {bestScore !== null && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                Best {bestScore}% · {attempts.length} attempt{attempts.length === 1 ? '' : 's'}
              </span>
            )}
            {warnings && warnings.unsupportedClaims?.length > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> Verify claims
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-slate-900 leading-snug">{question.question}</h4>
        </div>
        <div className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 mt-0.5 shrink-0">
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
            <div className="px-4 pb-4 pt-1.5 border-t border-slate-100 bg-slate-50/20">
              {/* Grounding CV badging */}
              {question.sourcedFrom && question.sourcedFrom.length > 0 && (
                <div className="flex items-center gap-1.5 mb-3 flex-wrap pt-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Grounded in:
                  </span>
                  {question.sourcedFrom.map((src, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-semibold uppercase"
                    >
                      {src.type === 'experience' ? 'Work history' : src.type}
                    </span>
                  ))}
                </div>
              )}

              {/* Warnings Panel */}
              {warnings && warnings.unsupportedClaims?.length > 0 && (
                <div className="mb-3.5 p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Verify these facts before you rehearse:</span> the
                    model answer (shown in Practice / Interview mode) includes details not found in
                    your CV profile:
                    <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium text-amber-800">
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
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3.5 mb-4 flex items-start gap-2.5">
                <EyeOff className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">
                    Model answer hidden on purpose
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Rehearse out loud first, then reveal the model answer in{' '}
                    <span className="font-semibold text-indigo-600">Practice mode</span> or hear it
                    read to you in{' '}
                    <span className="font-semibold text-indigo-600">Interview mode</span>.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3.5 border-t border-slate-150">
                <button
                  type="button"
                  onClick={startPracticeThis}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  <Play className="w-3.5 h-3.5" /> Practice this question
                </button>

                <div className="sm:ml-auto flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">Readiness:</span>
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
    noteSeed: {
      title: 'My weakness / growth area',
      body: 'Weakness or growth area I’ll talk about:\n- \n\nWhat I’m actively doing about it:\n- \n\n(Tip: pick a real growth area — not a humblebrag — and show the action you’re taking. Mirror a gap flagged in the Role tab.)',
    },
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
    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
      <SectionHeader
        icon={Sparkles}
        title="Interview essentials"
        subtitle="The questions almost every interview opens with"
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
      />
      <div className="mt-4 space-y-4">
        {visible.map((e) => (
          <div key={e.kind} className="border-l-2 border-amber-200 pl-3">
            <p className="text-sm font-semibold text-slate-900">{e.q}</p>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{e.tip}</p>
            {e.generatable && onGenerateEssential && (
              <button
                type="button"
                onClick={() => onGenerateEssential(e.kind)}
                disabled={generatingEssential === e.kind}
                className="mt-2 inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generatingEssential === e.kind ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" /> Writing…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Generate from my CV
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
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-semibold transition-colors"
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
}) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const canGenerateMore = !isCvOnly && jobQuestions.length > 0;

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
        <section className="bg-white border border-dashed border-slate-200 rounded-xl p-6 sm:p-8 text-center">
          <MessageSquare className="w-7 h-7 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-600">
            No job-specific questions yet. Generate interview prep from the dashboard.
          </p>
        </section>
      )}

      {jobQuestions.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <SectionHeader
              icon={MessageSquare}
              title="Job-based prep"
              subtitle={`${jobQuestions.length} likely question${jobQuestions.length === 1 ? '' : 's'} with rehearsable answers`}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
            />
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={onStartPractice}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Practice all
              </button>
              <button
                type="button"
                onClick={onStartMock}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
              >
                <Play className="w-3.5 h-3.5" />
                Interview Mode
              </button>
            </div>
          </div>

          {/* Questions grouped by category */}
          <div className="space-y-5 mb-6">
            {groupQuestionsByCategory(jobQuestions).map((group) => (
              <div key={group.key}>
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                  {group.label} <span className="text-slate-300">· {group.items.length}</span>
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
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
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
                      className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed pl-3 border-l-2 border-emerald-300"
                    >
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide shrink-0 mt-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> New
                      </span>
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {canGenerateMore && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onGenerateMore}
                disabled={generatingMore}
                className="group relative inline-flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
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
              <p className="text-xs text-slate-500 mt-2">
                {adRewarded
                  ? 'Watch a short ad to unlock fresh questions — free, no credits used.'
                  : 'Uses 5 credits to generate fresh questions.'}
              </p>
            </div>
          )}
        </section>
      )}

      {questionsToAsk.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            Questions to ask the interviewer
          </h4>
          <ul className="space-y-2">
            {questionsToAsk.map((q, i) => (
              <li
                key={i}
                className="text-sm text-slate-700 leading-relaxed pl-3 border-l-2 border-emerald-200"
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

const SectionHeader = ({ icon, title, subtitle, iconBg, iconColor }) => (
  <div className="flex items-start gap-3">
    <div
      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
    >
      {React.createElement(icon, { className: 'w-5 h-5' })}
    </div>
    <div className="min-w-0">
      <h2 className="text-base sm:text-lg font-bold text-slate-900">{title}</h2>
      <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);

export default InterviewPrepDetail;
