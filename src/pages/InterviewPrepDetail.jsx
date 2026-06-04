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
  Play,
  BookOpen,
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
} from '../utils/interviewPrep';
import LinkedCVBanner from '../components/prep/LinkedCVBanner';
import NotesList from '../components/prep/NotesList';
import StoryBank from '../components/prep/StoryBank';
import ReadinessOverview from '../components/prep/ReadinessOverview';
import { CONFIDENCE_OPTIONS } from '../components/prep/PracticeRunner';
import AdPlayer from '../components/AdPlayer';
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

  // "Generate more questions" CTA state. When credits run low, the button
  // becomes a "Watch ad to unlock more questions" CTA that opens AdPlayer.
  const [generatingMore, setGeneratingMore] = useState(false);
  const [adForMoreOpen, setAdForMoreOpen] = useState(false);
  const [newQuestionIndices, setNewQuestionIndices] = useState(() => new Set());
  // Story Bank generation — ad-rewarded, same pattern as "Get more questions".
  const [generatingStories, setGeneratingStories] = useState(false);
  const [adForStoriesOpen, setAdForStoriesOpen] = useState(false);
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
        toast.error('Not enough credits. Watch an ad to earn more.');
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
  const handleGenerateMoreQuestions = () => setAdForMoreOpen(true);

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
        toast.error('Not enough credits. Watch an ad to earn more.');
      } else {
        toast.error(msg);
      }
    } finally {
      setGeneratingStories(false);
    }
  };

  const handleGenerateStories = () => setAdForStoriesOpen(true);
  const handleAdForStoriesComplete = () =>
    handleAdReward(runGenerateStories, 'Building your stories…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const app = await reload();
        if (cancelled) return;
        // Default tab: Stories if any, else Skills, else Questions, else Notes.
        const stories = getStories(app);
        const skills = getSkillPrep(app);
        const questions = getJobQuestions(app);
        setActiveTab(
          stories.length
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

  const tabs = [
    { id: 'stories', label: 'Stories', icon: BookOpen, count: stories.length },
    { id: 'skills', label: 'Skills', icon: Sparkles, count: skillsWithEvidence.length },
    { id: 'questions', label: 'Questions', icon: MessageSquare, count: jobQuestions.length },
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

            <Link
              to={
                !isCvOnly
                  ? `/resume/${application._id}`
                  : application.draftCVId
                    ? `/cv-builder/${application.draftCVId}/skills`
                    : '#'
              }
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              aria-label={isCvOnly ? 'Open CV' : 'View CV'}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">{isCvOnly ? 'Open CV' : 'View CV'}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <ReadinessOverview
          application={application}
          onPracticeWeak={startPracticeWeak}
          onGoToTab={setActiveTab}
        />

        <LinkedCVBanner applicationId={applicationId} isCvOnly={isCvOnly} onPulled={reload} />

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
                applicationId={applicationId}
                isCvOnly={isCvOnly}
                skills={skillsWithEvidence}
                draftCVId={application.draftCVId}
                onChange={reload}
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
                generatingMore={generatingMore}
                newQuestionIndices={newQuestionIndices}
                isCvOnly={isCvOnly}
                onConfidenceChange={reload}
              />
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
                <NotesList applicationId={applicationId} initialNotes={notes} />
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
    </div>
  );
};

const SkillsTab = ({ applicationId, isCvOnly, skills, draftCVId, onChange, onPracticeSkill }) => {
  const [savingSkills, setSavingSkills] = useState(false);

  const handlePullSkills = async () => {
    setSavingSkills(true);
    try {
      await InterviewPrepService.saveSkills(applicationId);
      await onChange?.();
      toast.success('Skill talking points saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save skill prep');
    } finally {
      setSavingSkills(false);
    }
  };

  if (skills.length === 0) {
    return (
      <section className="bg-white border border-dashed border-slate-200 rounded-xl p-6 sm:p-8">
        <SectionHeader
          icon={Sparkles}
          title="Skill-based prep"
          subtitle="Pull rehearsable talking points from your CV's skills"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          Each AI-generated skill on this CV ships with evidence (where it came from in your
          history) and a talking point you can read aloud. Save them here to anchor your interview
          prep.
        </p>
        {isCvOnly && draftCVId ? (
          <Link
            to={`/cv-builder/${draftCVId}/skills`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <Eye className="w-4 h-4" /> Open CV builder
          </Link>
        ) : (
          <button
            type="button"
            onClick={handlePullSkills}
            disabled={savingSkills}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {savingSkills ? 'Pulling…' : 'Pull from CV'}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {skills.map((skill, i) => (
        <SkillCard
          key={`${skill.name}-${i}`}
          applicationId={applicationId}
          skill={skill}
          onPractice={() => onPracticeSkill(skill.name)}
          onConfidenceChange={onChange}
        />
      ))}
    </section>
  );
};

const SkillCard = ({ applicationId, skill, onPractice, onConfidenceChange }) => {
  const [confidence, setConfidence] = useState(skill.confidence || null);
  const [saving, setSaving] = useState(false);

  const handleMark = async (level) => {
    const next = confidence === level ? null : level;
    setConfidence(next);
    setSaving(true);
    try {
      await InterviewPrepService.updateSkillConfidence(applicationId, skill.name, next);
      onConfidenceChange?.();
    } catch {
      setConfidence(skill.confidence || null);
      toast.error('Failed to save confidence');
    } finally {
      setSaving(false);
    }
  };

  // Mirror of the job-based prep card pattern: hide the study content
  // (evidence + talking point) on the landing view so the user reaches it
  // by tapping Prep me on this, which opens the practice runner with the
  // skill's talking point and related questions one at a time.
  return (
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
            {confidence && (
              <span
                className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                  confidence === 'ready'
                    ? 'bg-emerald-50 text-emerald-700'
                    : confidence === 'almost'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                }`}
              >
                {confidence.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onPractice}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          <PlayCircle className="w-4 h-4" />
          Prep me on this
        </button>
        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          {CONFIDENCE_OPTIONS.map((opt) => {
            const active = confidence === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleMark(opt.id)}
                disabled={saving}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                  active ? opt.activeClasses : opt.classes
                } disabled:opacity-60`}
              >
                {active ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

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
    } catch (e) {
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
      <div
        onClick={onToggle}
        className="flex items-start justify-between gap-4 p-4 cursor-pointer select-none"
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
      </div>

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
                    <span className="font-bold">Verify facts in the suggested answer:</span> The AI
                    suggested answer includes details not found in your CV profile:
                    <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium text-amber-800">
                      {warnings.unsupportedClaims.map((claim, idx) => (
                        <li key={idx}>{claim}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Suggested Answer */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm mb-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                  Suggested Answer
                </p>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {question.suggestedAnswer || 'No suggested answer available.'}
                </p>
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

const QuestionsTab = ({
  applicationId,
  jobQuestions,
  fabricationWarnings,
  questionsToAsk,
  onStartPractice,
  onStartMock,
  onGenerateMore,
  generatingMore,
  newQuestionIndices,
  isCvOnly,
  onConfidenceChange,
}) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (jobQuestions.length === 0 && questionsToAsk.length === 0) {
    return (
      <section className="bg-white border border-dashed border-slate-200 rounded-xl p-6 sm:p-8 text-center">
        <MessageSquare className="w-7 h-7 mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-600">
          No job-specific questions yet. Run a job analysis to generate them.
        </p>
      </section>
    );
  }

  const canGenerateMore = !isCvOnly && jobQuestions.length > 0;

  return (
    <div className="space-y-6">
      {jobQuestions.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-6">
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
                Mock interview
              </button>
            </div>
          </div>

          {/* Core Collapsible Questions List */}
          <div className="space-y-3 mb-6">
            {jobQuestions.map((q, i) => {
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
                    <span className="inline-flex items-center gap-1 ml-1 pl-2 pr-2 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                      <PlayCircle className="w-3 h-3" />
                      Ad video
                    </span>
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 mt-2">
                Watch a short ad to unlock fresh questions — free, no credits used.
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
