import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Volume2,
  Clock,
  ArrowRight,
  SkipForward,
  RefreshCw,
  PlayCircle,
  Trophy,
  Play,
  CheckCircle2,
  Circle,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Wind,
  Mic,
  Loader,
} from 'lucide-react';
import { toast } from 'sonner';
import InterviewPrepService from '../services/interviewPrep.service';
import { getJobQuestions, computeReadiness, getInterviewTrend } from '../utils/interviewPrep';
import { BreathingExercise } from '../components/prep/CalmKit';
import { useMinVisible } from '../hooks/useMinVisible';
import { speak, stopSpeaking, startDictation, isSpeechRecognitionSupported } from '../lib/speech';

const MINUTES_BY_TYPE = {
  intro: 2,
  motivation: 2,
  behavioral: 3,
  situational: 3,
  technical: 4,
  gap: 2,
};
const budgetMin = (q) => MINUTES_BY_TYPE[(q.type || '').toLowerCase()] || 3;

const FLOW_RANK = { intro: 0, behavioral: 1, technical: 1, situational: 1, motivation: 2, gap: 3 };
const flowRank = (q) => FLOW_RANK[(q.type || '').toLowerCase()] ?? 1;

const TYPE_LABEL = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Question');
const CONF = [
  { id: 'needs_work', label: 'Shaky' },
  { id: 'almost', label: 'Okay' },
  { id: 'ready', label: 'Strong' },
];
const CONF_WORD = { needs_work: 'shaky', almost: 'okay', ready: 'strong' };

const WEAKNESS_Q = {
  question:
    'Tell me about a weakness, or a gap in your experience — and what you’re doing about it.',
  type: 'gap',
  _origIndex: -1,
  isWeakness: true,
};

// Scripted hand-off lines the AI speaks before each next question, so the
// interview feels like a paced conversation rather than a slideshow. Rotated by
// index (no randomness needed) so consecutive questions don't repeat a line.
const TRANSITIONS = [
  'Thanks for that. Let’s move on.',
  'Great — next up.',
  'Good. Let’s keep going.',
  'Understood. Here’s the next one.',
  'Appreciate it. Moving on.',
];
const LAST_TRANSITIONS = ['Last one for you.', 'And the final question.'];
const TIMEUP_LINE = 'In the interest of time, let’s move on.';
const pickTransition = (toIndex, isLast, reason) => {
  if (reason === 'timeup') return TIMEUP_LINE;
  if (isLast) return LAST_TRANSITIONS[toIndex % LAST_TRANSITIONS.length];
  return TRANSITIONS[toIndex % TRANSITIONS.length];
};

const fmt = (sec) => {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const MockInterviewPage = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const showLoader = useMinVisible(loading, 500);

  const [phase, setPhase] = useState('intro'); // intro | running | review
  const [showReadyCheck, setShowReadyCheck] = useState(false);
  const [missing, setMissing] = useState([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [voiceState, setVoiceState] = useState('idle');
  const [results, setResults] = useState([]); // practiced questions
  const [confidence, setConfidence] = useState(null);
  const [flagged, setFlagged] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  const [revealed, setRevealed] = useState(false);
  const [sessionRatings, setSessionRatings] = useState({});
  // Adaptive follow-up (premium, 1 credit) for the current question.
  const [followUp, setFollowUp] = useState('');
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);

  const startedAtRef = useRef(0);
  const audioRef = useRef(null);
  const audioCacheRef = useRef(new Map());

  const firstName = useMemo(() => {
    const u = readStoredUser();
    return (u.name || u.firstName || '').trim().split(' ')[0] || 'there';
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { application: app } = await InterviewPrepService.getOne(applicationId);
        if (!cancelled) {
          setApplication(app);
          // Set initial flagged questions based on app data
          const prep = app.interviewPrep || {};
          const initialFlags = new Set();
          if (prep.lastInterviewSession?.flagged) {
            prep.lastInterviewSession.flagged.forEach((f) => {
              if (typeof f.index === 'number') initialFlags.add(f.index);
            });
          }
          setFlagged(initialFlags);
        }
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || 'Failed to load interview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const jobQuestions = useMemo(() => getJobQuestions(application), [application]);

  // Flow-ordered sim questions + the universal weakness question.
  const simQuestions = useMemo(() => {
    const ordered = jobQuestions
      .map((q, i) => ({ ...q, _origIndex: i }))
      .sort((a, b) => flowRank(a) - flowRank(b))
      .slice(0, 10);
    const hasGap = ordered.some((q) => (q.type || '').toLowerCase() === 'gap');
    return hasGap ? ordered : [...ordered, WEAKNESS_Q];
  }, [jobQuestions]);

  const plannedSec = useMemo(
    () => simQuestions.reduce((s, q) => s + budgetMin(q) * 60, 0),
    [simQuestions]
  );
  const lastSession = application?.interviewPrep?.lastInterviewSession || null;

  // ── audio ──
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopSpeaking();
    setVoiceState('idle');
  };
  // `onStart` fires the moment audio actually begins playing (or the browser
  // fallback kicks in). Used to drop the "Going live" screen exactly when the
  // interviewer starts talking — never before the voice is ready.
  const speakText = async (text, onStart) => {
    stopAudio();
    if (!text || !text.trim()) {
      onStart?.();
      return;
    }
    setVoiceState('loading');
    try {
      let url = audioCacheRef.current.get(text);
      if (!url) {
        const blob = await InterviewPrepService.synthesizeSpeech(text);
        url = URL.createObjectURL(blob);
        audioCacheRef.current.set(text, url);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setVoiceState('idle');
      audio.onerror = () => setVoiceState('idle');
      setVoiceState('speaking');
      await audio.play();
      onStart?.();
    } catch {
      // Premium TTS unavailable (no key / 503 / autoplay block) — fall back to
      // the browser voice, but still go live so the interview never gets stuck.
      setVoiceState('speaking');
      speak(text);
      setVoiceState('idle');
      onStart?.();
    }
  };

  useEffect(() => {
    const cache = audioCacheRef.current;
    return () => {
      stopAudio();
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  // ── per-question timer ──
  // `timeLeft` is the CURRENT question's answer window (not a whole-run total).
  // It pauses while the model answer is revealed (you're reviewing, not
  // answering) and auto-advances when it reaches zero.
  useEffect(() => {
    if (phase !== 'running' || revealed) return undefined;
    const id = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, revealed]);

  useEffect(() => {
    if (phase === 'running' && !revealed && timeLeft === 0) handleTimeUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, revealed]);

  // ── flow ──
  const exitToDetail = () => {
    stopAudio();
    navigate(`/interview-prep/${applicationId}`);
  };

  const handleStartClick = () => {
    const miss = [];
    if (!jobQuestions.some((q) => (q.type || '').toLowerCase() === 'intro'))
      miss.push('your “Tell me about yourself” pitch');
    if (!jobQuestions.some((q) => (q.type || '').toLowerCase() === 'motivation'))
      miss.push('your “Why this company” answer');
    if (miss.length) {
      setMissing(miss);
      setShowReadyCheck(true);
    } else {
      beginInterview();
    }
  };

  // ── premium gate (scaffolding — OFF during testing) ──
  // Interview Mode is the flagship feature and is planned to become premium:
  // the FIRST interview is free, then each run costs COSTS.INTERVIEW_MODE
  // credits. To turn it on later: set FREE_DURING_TESTING = false and implement
  // the credit path (reuse CreditGate + billingService, mirror the EssentialsSection
  // flow). `getInterviewTrend(application).count === 0` ⇒ first interview, free.
  const FREE_DURING_TESTING = true;
  const canStartInterview = () => {
    if (FREE_DURING_TESTING) return true;
    // const firstInterviewFree = getInterviewTrend(application).count === 0;
    // if (firstInterviewFree) return true;
    // return /* user has >= COSTS.INTERVIEW_MODE credits, else open CreditGate */ true;
    return true;
  };

  const beginInterview = () => {
    if (!canStartInterview()) return; // premium gate (kept open during testing)
    setShowReadyCheck(false);
    setCurrent(0);
    setResults([]);
    setConfidence(null);
    setFlagged(new Set());
    setRevealed(false);
    setFollowUp('');
    setSessionRatings({});
    // "Going live" — show the connecting screen while the greeting voice loads.
    setPhase('connecting');

    const q = simQuestions[0];
    const role = title && title !== 'Interview' ? ` for the ${title} role` : '';
    const greeting =
      `Hi ${firstName}, welcome — and thank you for making the time today. It's great to meet you. ` +
      `I'll be your interviewer${role}. We'll keep this conversational: I'll ask a question, ` +
      `you take a moment and answer out loud, just like a real interview. ` +
      `Let's get started with the first question. ${q?.question || ''}`;

    // Only flip to the live interview once the interviewer's voice actually
    // begins — so the timer starts when the interview truly does.
    speakText(greeting, () => {
      startedAtRef.current = Date.now();
      setTimeLeft(budgetMin(q) * 60); // per-question answer window for Q1
      setPhase('running');
    });
  };

  const handleRateQuestion = async (index, rating) => {
    setSessionRatings((prev) => ({ ...prev, [index]: rating }));
    const q = simQuestions[index];
    if (q._origIndex >= 0) {
      try {
        await InterviewPrepService.updateQuestionConfidence(
          applicationId,
          q.question,
          q._origIndex,
          rating
        );
        setApplication((prev) => {
          if (!prev) return prev;
          const prep = prev.interviewPrep || {};
          const jobQuestionsCopy = [...(prep.jobQuestions || [])];
          if (jobQuestionsCopy[q._origIndex]) {
            jobQuestionsCopy[q._origIndex] = {
              ...jobQuestionsCopy[q._origIndex],
              confidence: rating,
            };
          }
          return {
            ...prev,
            interviewPrep: {
              ...prep,
              jobQuestions: jobQuestionsCopy,
            },
          };
        });
      } catch (e) {
        toast.error('Failed to update question confidence');
      }
    }
  };

  // Single advance path for manual Next, Skip, and the timer running out. The
  // interviewer speaks a scripted hand-off line, then asks the next question —
  // so it feels like a paced conversation instead of a slideshow.
  const advance = (reason) => {
    setRevealed(false);
    setFollowUp('');
    const next = current + 1;
    if (next >= simQuestions.length) {
      finishInterview();
      return;
    }
    setCurrent(next);
    setTimeLeft(budgetMin(simQuestions[next]) * 60); // reset answer window
    const q = simQuestions[next];
    const line = pickTransition(next, next === simQuestions.length - 1, reason);
    speakText(`${line} ${q.question}`);
  };

  const goNext = () => advance('next');
  const skip = () => advance('skip');
  const handleTimeUp = () => advance('timeup');

  // Adaptive interviewer: send the user's answer, get + speak a real follow-up.
  const handleFollowUp = async (answerText) => {
    if (!answerText || loadingFollowUp) return;
    setLoadingFollowUp(true);
    try {
      const res = await InterviewPrepService.generateFollowUp(
        applicationId,
        simQuestions[current].question,
        answerText
      );
      if (res.followUp) {
        setFollowUp(res.followUp);
        speakText(res.followUp);
        if (typeof res.remainingCredits === 'number') {
          window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
        }
      } else {
        toast.message('No follow-up this time — try a fuller answer.');
      }
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error('Not enough credits for a follow-up.');
      } else if (code === 'AI_UNAVAILABLE') {
        toast.error('The AI interviewer is unavailable right now.');
      } else {
        toast.error(e.response?.data?.message || 'Failed to get a follow-up');
      }
    } finally {
      setLoadingFollowUp(false);
    }
  };

  const finishInterview = () => {
    // A short spoken sign-off, then the review screen.
    speakText('That brings us to the end. Thanks for your time today — nice work.');
    const resultsWithRatings = simQuestions.map((q, i) => ({
      ...q,
      confidence: sessionRatings[i] || q.confidence || null,
    }));
    setResults(resultsWithRatings);
    setPhase('review');
  };

  const toggleFlag = (origIndex) => {
    setFlagged((prev) => {
      const n = new Set(prev);
      if (n.has(origIndex)) n.delete(origIndex);
      else n.add(origIndex);
      return n;
    });
  };

  const selfRatedCount = results.filter((r) => r.confidence && r._origIndex >= 0).length;
  const selfRatedSum = results.reduce((sum, r) => {
    if (r._origIndex < 0) return sum; // exclude gap/weakness
    if (r.confidence === 'ready') return sum + 100;
    if (r.confidence === 'almost') return sum + 60;
    if (r.confidence === 'needs_work') return sum + 25;
    return sum;
  }, 0);
  const overall = selfRatedCount ? Math.round(selfRatedSum / selfRatedCount) : null;

  const saveSession = async () => {
    setSaving(true);
    try {
      const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const res = await InterviewPrepService.saveInterviewSession(applicationId, {
        confidence,
        score: overall,
        durationSec,
        plannedSec,
        flaggedIndices: Array.from(flagged),
      });
      setApplication((prev) =>
        prev
          ? {
              ...prev,
              interviewPrep: {
                ...prev.interviewPrep,
                lastInterviewSession: res.lastInterviewSession,
              },
            }
          : prev
      );
      toast.success('Interview saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save interview');
    } finally {
      setSaving(false);
    }
  };

  if (showLoader) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/60 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!application) return null;
  const title = application.jobTitle || application.jobId?.title || 'Interview';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-indigo-50/60 text-slate-900">
      <header className="backdrop-blur sticky top-0 z-10 border-b border-slate-200/70 bg-white/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
            {phase === 'running' && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
            Interview mode
          </span>
          <div className="flex items-center gap-3">
            {phase === 'running' && (
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-bold tabular-nums ${
                  timeLeft <= 30 ? 'text-rose-500' : 'text-slate-700'
                }`}
                title="Time left on this question"
              >
                <Clock className="w-4 h-4" /> {fmt(timeLeft)}
              </span>
            )}
            <button
              type="button"
              onClick={exitToDetail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <X className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 py-4 sm:py-5">
        <div className="w-full max-w-3xl">
          {phase === 'intro' && (
            <IntroView
              firstName={firstName}
              title={title}
              count={simQuestions.length}
              plannedSec={plannedSec}
              lastSession={lastSession}
              trend={getInterviewTrend(application)}
              onStart={handleStartClick}
              onCancel={exitToDetail}
            />
          )}

          {phase === 'connecting' && <ConnectingView firstName={firstName} title={title} />}

          {phase === 'running' && simQuestions.length > 0 && (
            <RunningView
              question={simQuestions[current]}
              index={current}
              total={simQuestions.length}
              revealed={revealed}
              onReveal={() => setRevealed(true)}
              onRate={(rating) => handleRateQuestion(current, rating)}
              currentRating={sessionRatings[current]}
              voiceState={voiceState}
              onReplay={() => speakText(simQuestions[current].question)}
              onNext={goNext}
              onSkip={skip}
              onFollowUp={handleFollowUp}
              followUp={followUp}
              loadingFollowUp={loadingFollowUp}
            />
          )}

          {phase === 'review' && (
            <ReviewView
              results={results}
              overall={overall}
              confidence={confidence}
              setConfidence={setConfidence}
              flagged={flagged}
              toggleFlag={toggleFlag}
              saving={saving}
              saved={!!lastSession}
              onSave={saveSession}
              onPracticeWeak={() =>
                navigate(`/interview-prep/${applicationId}/practice?filter=weak`)
              }
              onPracticeQuestion={(i) =>
                navigate(`/interview-prep/${applicationId}/practice?questionIndex=${i}`)
              }
              onRetake={beginInterview}
              onDone={exitToDetail}
              onRateQuestion={(idx, rating) => {
                setResults((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], confidence: rating };
                  return next;
                });
                handleRateQuestion(idx, rating);
              }}
            />
          )}
        </div>
      </main>

      <AnimatePresence>
        {showReadyCheck && (
          <ReadyCheckModal
            missing={missing}
            readiness={computeReadiness(application).score}
            onPrepare={exitToDetail}
            onStartAnyway={beginInterview}
            onClose={() => setShowReadyCheck(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Ready check ──
const ReadyCheckModal = ({ missing, readiness, onPrepare, onStartAnyway, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
    />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-6 shadow-xl relative overflow-hidden z-10 text-slate-900"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0 pr-6">
          <h2 className="text-base font-bold text-slate-900 leading-snug">
            Ready for this interview?
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Some essentials are still missing</p>
        </div>
      </div>

      <div className="mt-5 bg-slate-50 rounded-xl p-3.5 border border-slate-100">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="font-semibold text-slate-600">Your readiness score</span>
          <span className="font-bold text-slate-900">{readiness}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${readiness}%` }}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          To-do before you start:
        </p>
        <ul className="space-y-2.5">
          {missing.map((m, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0 animate-pulse" />
              <span className="leading-relaxed">
                Prepare <span className="font-medium text-slate-900">{m.replace('your ', '')}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-500 bg-indigo-50/40 border border-indigo-100/50 rounded-lg p-3 mt-5 leading-relaxed">
        <span className="font-semibold text-indigo-800">Tip:</span> Preparing these essentials
        enables the AI interviewer to ask targeted questions grounded in your actual history.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onPrepare}
          className="flex-1 order-1 sm:order-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer"
        >
          Prepare these first
        </button>
        <button
          type="button"
          onClick={onStartAnyway}
          className="flex-1 order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-350 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors select-none cursor-pointer"
        >
          Start anyway
        </button>
      </div>
    </motion.div>
  </div>
);

// ── Going live (connecting) ──
// Shown after the user takes their seat, while the greeting voice is being
// synthesized. It's replaced by the live interview the instant audio plays.
const ConnectingView = ({ firstName, title }) => (
  <div className="flex flex-col items-center justify-center text-center h-[calc(100dvh-5.5rem)]">
    <div className="relative mb-6">
      {/* soft pulsing halo behind the interviewer */}
      <span className="absolute -inset-3 rounded-[1.75rem] bg-indigo-300/40 blur-2xl animate-pulse" />
      <span className="absolute -inset-1 rounded-3xl ring-2 ring-indigo-200/70 animate-ping" />
      <div className="relative w-20 h-20 rounded-3xl bg-white border border-indigo-200 ring-4 ring-indigo-100 flex items-center justify-center p-3 shadow-md">
        <img
          src="/applyright-icon.png"
          alt="ApplyRight AI interviewer"
          className="w-full h-full object-contain"
        />
      </div>
    </div>

    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
      </span>
      Going live
    </span>

    <h2 className="mt-3 text-lg sm:text-xl font-bold text-slate-900">
      Connecting you with your interviewer…
    </h2>
    <p className="mt-1 text-sm text-slate-500">
      {firstName && firstName !== 'there' ? `One moment, ${firstName}.` : 'One moment.'}
      {title ? ` ${title}` : ''}
    </p>

    <div className="mt-5 flex items-center gap-1.5" aria-hidden>
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
      <span
        className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
        style={{ animationDelay: '0.15s' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
        style={{ animationDelay: '0.3s' }}
      />
    </div>
  </div>
);

// Optional pre-interview centering — a skippable "take a breath" that reveals
// the 4-7-8 breathing tool inline. Walking in calm is half the battle.
const BreatheToggle = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative z-10 mt-4 text-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <Wind className="w-3.5 h-3.5" />
        {open ? 'Hide breathing' : 'Feeling nervous? Take a breath first'}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
          <BreathingExercise compact />
        </div>
      )}
    </div>
  );
};

// ── Intro ──
const IntroView = ({
  firstName,
  title,
  count,
  plannedSec,
  lastSession,
  trend,
  onStart,
  onCancel,
}) => (
  <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white/80 backdrop-blur-md p-5 sm:p-7 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
    {/* ambient brand glow */}
    <div
      aria-hidden
      className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl"
    />

    <div className="relative z-10 text-center">
      {/* The interviewer, ready and waiting for you */}
      <div className="w-16 h-16 rounded-2xl bg-white border border-indigo-200 ring-4 ring-indigo-100/70 flex items-center justify-center mx-auto mb-3 p-2.5 shadow-sm">
        <img
          src="/applyright-icon.png"
          alt="ApplyRight AI interviewer"
          className="w-full h-full object-contain"
        />
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Interview mode</h1>
      <p className="text-sm text-slate-500 mt-1">{title}</p>
    </div>

    {count === 0 ? (
      <>
        <p className="relative z-10 text-sm text-slate-500 mt-6 text-center leading-relaxed">
          No interview questions yet. Generate interview prep first to activate the simulation.
        </p>
        <div className="relative z-10 mt-6 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all cursor-pointer shadow-md select-none"
          >
            Back to prep
          </button>
        </div>
      </>
    ) : (
      <>
        <p className="relative z-10 text-sm text-slate-600 mt-4 leading-relaxed text-center">
          Hi <span className="font-semibold text-slate-900">{firstName}</span> — take a breath. Your
          ApplyRight AI interviewer will ask each question aloud. Answer out loud as if you’re in
          the room, then <strong className="text-slate-900">reveal a model answer</strong> and rate
          how it felt.
        </p>
        {trend && trend.count >= 1 && (
          <div className="relative z-10 mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">
                You’ve done {trend.count} {trend.count === 1 ? 'interview' : 'interviews'}.
              </span>{' '}
              {trend.trend === 'up' && trend.firstConfidence && trend.lastConfidence
                ? `Your nerves are easing — ${CONF_WORD[trend.firstConfidence]} → ${CONF_WORD[trend.lastConfidence]}. `
                : ''}
              Each rep makes the real room feel more familiar.
            </p>
          </div>
        )}
        <div className="relative z-10 mt-4 grid grid-cols-3 gap-2.5">
          <Stat icon={HelpCircle} value={count} label={count === 1 ? 'Question' : 'Questions'} />
          <Stat
            icon={Clock}
            value={`~${Math.round(plannedSec / 60)}`}
            unit="min"
            label="Duration"
          />
          <Stat icon={Sparkles} value="Free" label="No credits" />
        </div>
        {lastSession && (
          <div className="relative z-10 mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs text-slate-500 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Last session:</span>{' '}
              {typeof lastSession.score === 'number' ? `${lastSession.score}% overall · ` : ''}
              {lastSession.flagged?.length
                ? `${lastSession.flagged.length} flagged questions to practice`
                : 'no questions flagged'}
              .
            </div>
          </div>
        )}
        <BreatheToggle />
        <div className="relative z-10 mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold transition-all cursor-pointer shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 select-none"
          >
            Take your seat
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors cursor-pointer select-none"
          >
            Cancel
          </button>
        </div>
      </>
    )}
  </div>
);

const Stat = ({ icon: Icon, value, unit, label }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-3.5 flex flex-col items-center text-center transition-all hover:border-indigo-200 hover:shadow-sm">
    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 shrink-0">
      <Icon className="w-4.5 h-4.5" />
    </div>
    <p className="text-lg font-bold text-slate-900 leading-none">
      {value}
      {unit && <span className="text-xs font-semibold text-slate-400 ml-0.5">{unit}</span>}
    </p>
    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-1.5 leading-tight">
      {label}
    </p>
  </div>
);

// Adaptive follow-up — the premium "real interview" upgrade. The user types or
// dictates their answer and the AI interviewer asks one dynamic follow-up.
const FollowUpPanel = ({ onFollowUp, followUp, loading }) => {
  const [answer, setAnswer] = useState('');
  const [listening, setListening] = useState(false);
  const stopRef = useRef(null);
  const sttSupported = isSpeechRecognitionSupported();

  useEffect(() => () => stopRef.current?.(), []);

  const toggleMic = () => {
    if (listening) {
      stopRef.current?.();
      setListening(false);
      return;
    }
    setListening(true);
    stopRef.current = startDictation({
      onText: (t) => setAnswer(t),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
  };

  return (
    <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
      <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 mb-1">
        Adaptive follow-up · premium
      </p>
      <p className="text-xs text-slate-500 mb-2 leading-relaxed">
        Type or dictate your answer and the AI interviewer asks a real follow-up — just like the
        live thing.
      </p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="Your answer…"
        className="w-full text-sm rounded-xl border border-slate-200 bg-white p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <div className="mt-2 flex items-center gap-2">
        {sttSupported && (
          <button
            type="button"
            onClick={toggleMic}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
              listening
                ? 'border-rose-300 bg-rose-50 text-rose-600'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> {listening ? 'Stop' : 'Dictate'}
          </button>
        )}
        <button
          type="button"
          disabled={loading || !answer.trim()}
          onClick={() => onFollowUp(answer.trim())}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Ask me a follow-up · 1 credit
        </button>
      </div>
      {followUp && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 mb-1">
            Interviewer follow-up
          </p>
          <p className="text-sm text-slate-800 font-semibold leading-snug">“{followUp}”</p>
        </div>
      )}
    </div>
  );
};

// ── Running ──
const RunningView = ({
  question,
  index,
  total,
  revealed,
  onReveal,
  onRate,
  currentRating,
  voiceState,
  onReplay,
  onNext,
  onSkip,
  onFollowUp,
  followUp,
  loadingFollowUp,
}) => {
  const isLast = index + 1 >= total;
  const speaking = voiceState === 'speaking';
  const loading = voiceState === 'loading';

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)]">
      {/* Segmented question progress */}
      <div className="shrink-0 flex items-center gap-1.5 mb-4">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < index
                ? 'w-6 bg-indigo-500'
                : i === index
                  ? 'flex-1 bg-gradient-to-r from-indigo-500 to-violet-500'
                  : 'w-6 bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Interviewer "video tile" — the AI is present and talking to you */}
      <div className="shrink-0 relative overflow-hidden rounded-3xl border border-indigo-100 bg-white/80 backdrop-blur-md p-4 sm:p-5 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
        {/* ambient brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-4">
          {/* Interviewer avatar */}
          <div className="relative shrink-0">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white flex items-center justify-center p-2.5 border transition-all duration-300 ${
                speaking
                  ? 'border-indigo-300 ring-4 ring-indigo-200/60 shadow-lg shadow-indigo-300/40 scale-[1.03]'
                  : 'border-slate-200 ring-2 ring-slate-100'
              }`}
            >
              <img
                src="/applyright-icon.png"
                alt="ApplyRight AI interviewer"
                className="w-full h-full object-contain"
              />
            </div>
            {speaking && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-3.5 bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-indigo-100">
                <span className="w-0.5 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <span
                  className="w-0.5 h-3 bg-indigo-500 rounded-full animate-pulse"
                  style={{ animationDelay: '0.15s' }}
                />
                <span
                  className="w-0.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"
                  style={{ animationDelay: '0.3s' }}
                />
                <span
                  className="w-0.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"
                  style={{ animationDelay: '0.45s' }}
                />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-bold text-slate-900">ApplyRight AI</p>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              Your interviewer
            </p>
            <div className="mt-1.5">
              {speaking ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />{' '}
                  Speaking…
                </span>
              ) : loading ? (
                <span className="text-[11px] font-bold text-slate-400 animate-pulse">
                  Preparing question…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Listening
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onReplay}
            title="Hear the question again"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer select-none"
          >
            <Volume2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hear again</span>
          </button>
        </div>

        {/* The question, framed as something the interviewer is asking you */}
        <div className="relative z-10 mt-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Question {index + 1} of {total} · {TYPE_LABEL(question.type)} · ~{budgetMin(question)}{' '}
            min
          </p>
          <h2 className="mt-1.5 text-lg sm:text-xl font-bold text-slate-900 leading-snug">
            “{question.question}”
          </h2>
        </div>
      </div>

      {/* Your turn — scrolls internally so the controls stay pinned and the page never scrolls */}
      <div className="flex-1 min-h-0 flex flex-col mt-4">
        <p className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 px-1">
          Your turn
        </p>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <AnimatePresence mode="wait">
            {!revealed ? (
              <motion.div
                key="reveal-button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center p-6 sm:p-8 border border-dashed border-slate-300 rounded-2xl bg-white/60 text-center"
              >
                <p className="text-sm text-slate-500 mb-5 max-w-md leading-relaxed">
                  Answer out loud, as if you’re really in the room. When you’re done, reveal a model
                  outline and rate how it felt.
                </p>
                <button
                  type="button"
                  onClick={onReveal}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  Reveal model answer
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="suggested-answer"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Model answer outline */}
                <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600">
                    {question.isWeakness ? 'Coaching strategy' : 'Model answer outline'}
                  </p>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                    {question.suggestedAnswer ||
                      (question.isWeakness
                        ? 'A strong weakness answer is personal, honest, and growth-oriented. Follow these principles:\n\n' +
                          "1. **State a genuine weakness**: Choose a real growth area or technical skill you previously lacked. Avoid cliches like 'I'm a perfectionist'.\n" +
                          "2. **Explain the steps you've taken**: Detail the concrete actions you've executed to improve (e.g., enrolling in a course, reading, seeking feedback).\n" +
                          '3. **Show positive progress**: Conclude by demonstrating how you apply your learning to turn this gap into a strength.'
                        : 'Structure your answer using the STAR framework:\n\n' +
                          '• **Situation**: Outline the context or problem you faced.\n' +
                          '• **Task**: Explain the goal or responsibility you had.\n' +
                          '• **Action**: Describe the specific actions you took (focus on *your* contributions).\n' +
                          '• **Result**: Share the quantitative outcomes, lessons learned, or improvements.')}
                  </div>
                </div>

                {/* Rating deck */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white">
                  <p className="text-sm font-bold text-slate-800 mb-3 text-center sm:text-left">
                    How did your answer feel?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => onRate('needs_work')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all select-none cursor-pointer ${
                        currentRating === 'needs_work'
                          ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-100'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      Felt shaky
                    </button>
                    <button
                      type="button"
                      onClick={() => onRate('almost')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all select-none cursor-pointer ${
                        currentRating === 'almost'
                          ? 'bg-amber-50 border-amber-400 text-amber-700 ring-2 ring-amber-100'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      Felt okay
                    </button>
                    <button
                      type="button"
                      onClick={() => onRate('ready')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all select-none cursor-pointer ${
                        currentRating === 'ready'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-100'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      Felt strong
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {onFollowUp && (
            <FollowUpPanel onFollowUp={onFollowUp} followUp={followUp} loading={loadingFollowUp} />
          )}
        </div>
      </div>

      {/* Controls (pinned to the bottom of the viewport-height column) */}
      <div className="shrink-0 mt-4 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer select-none"
        >
          <SkipForward className="w-3.5 h-3.5" /> Skip question
        </button>

        <div className="flex items-center gap-3">
          {!currentRating && revealed && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              Pick a rating
            </span>
          )}
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 select-none"
          >
            {isLast ? 'Finish interview' : 'Next question'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Review ──
const ReviewView = ({
  results,
  overall,
  confidence,
  setConfidence,
  flagged,
  toggleFlag,
  saving,
  saved,
  onSave,
  onPracticeWeak,
  onPracticeQuestion,
  onRetake,
  onDone,
  onRateQuestion,
}) => {
  const [openIdx, setOpenIdx] = useState(null);

  const confBadgeStyle = (c) => {
    if (c === 'ready') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (c === 'almost') return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (c === 'needs_work') return 'bg-rose-50 text-rose-700 border border-rose-200';
    return 'bg-slate-100 text-slate-500 border border-slate-200';
  };

  const confLabel = (c) => {
    if (c === 'ready') return 'Strong';
    if (c === 'almost') return 'Okay';
    if (c === 'needs_work') return 'Shaky';
    return 'Unrated';
  };

  const scoreTone = (s) =>
    s >= 75 ? 'text-emerald-600' : s >= 45 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white/80 backdrop-blur-md p-5 sm:p-8 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
      {/* ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl"
      />

      <div className="relative z-10">
        <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            {overall != null ? (
              <span className={`text-xl font-bold ${scoreTone(overall)}`}>{overall}%</span>
            ) : (
              <Trophy className="w-7 h-7 text-amber-500" />
            )}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Interview complete</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {overall != null
                ? `Self-assessed performance score: ${overall}% average`
                : 'Complete your ratings to calculate your score.'}
            </p>
          </div>
        </div>

        {/* Self confidence overall */}
        <div className="mt-6">
          <p className="text-sm font-bold text-slate-800 mb-2.5">How did that feel overall?</p>
          <div className="flex items-center gap-2 flex-wrap">
            {CONF.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setConfidence(c.id)}
                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all select-none cursor-pointer ${
                  confidence === c.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            {saved ? 'Update my review' : 'Save my review'}
          </button>
        </div>

        {/* Per-question results */}
        {results.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-3.5">
              Your practiced questions — tick any you want to keep working on
            </p>
            <div className="space-y-3">
              {results.map((r, i) => {
                const open = openIdx === i;
                const on = flagged.has(r._origIndex);
                return (
                  <div
                    key={i}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <button
                        type="button"
                        onClick={() => toggleFlag(r._origIndex)}
                        className="shrink-0 text-slate-300 hover:text-indigo-500 transition-colors"
                        title="Flag to work on"
                      >
                        {on ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-indigo-600" />
                        ) : (
                          <Circle className="w-4.5 h-4.5" />
                        )}
                      </button>
                      <span
                        className={`shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold ${confBadgeStyle(r.confidence)}`}
                      >
                        {confLabel(r.confidence)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenIdx(open ? null : i)}
                        className="flex-1 min-w-0 text-left text-sm font-semibold text-slate-800 truncate hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        {r.question}
                      </button>
                    </div>
                    {open && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/60 space-y-4">
                        {/* Suggested answer outline */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 mb-1.5">
                            {r.isWeakness ? 'Coaching strategy' : 'Model answer outline'}
                          </p>
                          <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl p-3 whitespace-pre-line leading-relaxed">
                            {r.suggestedAnswer ||
                              (r.isWeakness
                                ? "1. State a genuine weakness (avoid cliches like 'perfectionist').\n" +
                                  '2. Detail concrete actions you are executing to improve (courses, feedback, practice).\n' +
                                  '3. Show positive progress of turning this gap into a strength.'
                                : '• Situation: Outline context/problem.\n' +
                                  '• Task: Explain the goal/responsibility.\n' +
                                  '• Action: Describe specific action steps you executed.\n' +
                                  '• Result: Share quantitative outcomes or learnings.')}
                          </p>
                        </div>

                        {/* Micro rating adjustment */}
                        <div className="border-t border-slate-200/80 pt-3">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                            Adjust your rating
                          </p>
                          <div className="flex items-center gap-2">
                            {CONF.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => onRateQuestion(i, c.id)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none cursor-pointer ${
                                  r.confidence === c.id
                                    ? c.id === 'ready'
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                      : c.id === 'almost'
                                        ? 'bg-amber-50 border-amber-400 text-amber-700'
                                        : 'bg-rose-50 border-rose-400 text-rose-700'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                }`}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onPracticeQuestion(r._origIndex)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" /> Practice this question
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={onPracticeWeak}
            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" /> Practice weak spots
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-all cursor-pointer select-none"
          >
            <RefreshCw className="w-4 h-4" /> Retake
          </button>
          <button
            type="button"
            onClick={onDone}
            className="sm:ml-auto px-4.5 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer select-none text-center"
          >
            Back to prep
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockInterviewPage;
