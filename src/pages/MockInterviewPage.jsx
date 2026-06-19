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
  MessageSquare,
  BookOpen,
  Wifi,
  Send,
  Lock,
  MicOff,
  Captions,
} from 'lucide-react';
import { toast } from 'sonner';
import InterviewPrepService from '../services/interviewPrep.service';
import billingService from '../services/billing.service';
import { getJobQuestions, computeReadiness, getInterviewTrend } from '../utils/interviewPrep';
import { BreathingExercise } from '../components/prep/CalmKit';
import VoiceVisualizer from '../components/prep/VoiceVisualizer';
import AudioPlayer from '../components/AudioPlayer';
import AssessmentReport from '../components/prep/AssessmentReport';
import { VoiceStyleSelector, DeviceCheck } from '../components/prep/InterviewSetup';
import {
  isRealtimeSupported,
  createRealtimeSession as createRealtimeWebRTC,
} from '../lib/realtime';
import { createMixedRecorder } from '../lib/recorder';
import { saveRecording } from '../lib/recordings';
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
const READINESS_LABEL = {
  ready: 'Interview-ready',
  almost: 'Almost there',
  needs_work: 'Needs work',
};
// Seconds remaining at which we nudge the live interviewer to start its closing.
const REALTIME_NUDGE_SEC = 45;

// Minimum time the "connecting" call screen stays up, so the connect animation
// always reads as a deliberate beat instead of flashing past when the
// interviewer's voice happens to be ready instantly.
const CONNECT_MIN_MS = 1800;
// How long the "Connected" confirmation holds before the call view reveals — the
// ringing resolves into a connected beat, then opens, like a call being answered.
const CONNECTED_HOLD_MS = 600;

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

  // choose → (scripted) intro | connecting | running | review
  //        → (conversational, realtime)  intro | connecting | live | grading | review
  //        → (conversational, fallback)  intro | connecting | conversation | grading | review
  const [phase, setPhase] = useState('choose');
  const [mode, setMode] = useState(null); // 'scripted' | 'conversational'
  const [showReadyCheck, setShowReadyCheck] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
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

  // ── conversational mode (turn-based live interview) ──
  // The client owns the transcript + spine and resends them each turn; the
  // backend is stateless. The question is NOT shown on screen — it's a
  // conversation, so the user listens and replies.
  const [transcript, setTranscript] = useState([]);
  const [spineIndex, setSpineIndex] = useState(0);
  const [turnLoading, setTurnLoading] = useState(false);

  // ── realtime (live voice) mode ──
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [muted, setMuted] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [savedRecordingBlob, setSavedRecordingBlob] = useState(null);
  const [savedRecordingDuration, setSavedRecordingDuration] = useState(0);
  // AI assessment of a conversational interview (replaces self-rating). Null for
  // the guided/scripted mode, which keeps self-rating.
  const [assessment, setAssessment] = useState(null);
  // Transcript kept around so a failed assessment can be re-run from review.
  const [gradingTranscript, setGradingTranscript] = useState(null);
  const [gradeError, setGradeError] = useState(false);
  const realtimeRef = useRef(null);
  const recorderRef = useRef(null);
  const maxSessionSecRef = useRef(360);
  // Live-minute reservation id from createRealtimeSession; echoed back at assess
  // so the backend reconciles the right reservation (null for turn-based runs).
  const reservationRef = useRef(null);
  const nudgedRef = useRef(false); // wrap-up nudge sent once near the time cap
  // ── time-up wind-down ──
  // When the main time runs out we DON'T hard-cut: we enter a grace window so the
  // interviewer can verbally wrap up + run the closing ("any questions for me?").
  const [inGrace, setInGrace] = useState(false);
  const graceSecRef = useRef(90); // grace window length (from the backend session)
  const graceKickRef = useRef(null); // silent-room fallback timer during grace

  // ── "connecting" call beat ──
  // Hold the connecting screen for at least CONNECT_MIN_MS so the call-connect
  // animation always registers, even when the interviewer's voice is ready
  // instantly. enterConnecting() opens it; leaveConnecting(target) flips to the
  // live phase once the minimum has elapsed.
  const connectStartRef = useRef(0);
  const leftConnectingRef = useRef(false);
  const connectTimerRef = useRef(null);
  // Drives the "Connected" confirmation beat on the call screen before the call
  // view reveals.
  const [connected, setConnected] = useState(false);
  const enterConnecting = () => {
    leftConnectingRef.current = false;
    connectStartRef.current = Date.now();
    clearTimeout(connectTimerRef.current);
    setConnected(false);
    setPhase('connecting');
  };
  // Called the instant the interviewer's voice is ready. Keeps ringing until the
  // minimum beat is nearly up, then shows "Connected" for CONNECTED_HOLD_MS, then
  // reveals the call view — so the connection visibly resolves instead of cutting.
  const leaveConnecting = (target) => {
    if (leftConnectingRef.current) return; // first caller wins (realtime fires repeatedly)
    leftConnectingRef.current = true;
    const elapsed = Date.now() - connectStartRef.current;
    const ringRemain = Math.max(0, CONNECT_MIN_MS - elapsed - CONNECTED_HOLD_MS);
    connectTimerRef.current = setTimeout(() => {
      setConnected(true); // ringing resolves into the "Connected" beat
      connectTimerRef.current = setTimeout(() => setPhase(target), CONNECTED_HOLD_MS);
    }, ringRemain);
  };

  // Personalization: interviewer voice + interview style (remembered per device).
  const [voice, setVoice] = useState(() => localStorage.getItem('interview_voice') || 'marin');
  const [style, setStyle] = useState(() => localStorage.getItem('interview_style') || 'balanced');
  // Optional live captions of what the interviewer says (accessibility).
  const [captionsOn, setCaptionsOn] = useState(false);
  const [caption, setCaption] = useState('');

  const chooseVoice = (v) => {
    setVoice(v);
    try {
      localStorage.setItem('interview_voice', v);
    } catch {
      /* ignore */
    }
  };
  const chooseStyle = (s) => {
    setStyle(s);
    try {
      localStorage.setItem('interview_style', s);
    } catch {
      /* ignore */
    }
  };

  const startedAtRef = useRef(0);
  const audioRef = useRef(null);
  const audioCacheRef = useRef(new Map());

  const firstName = useMemo(() => {
    const u = readStoredUser();
    return (u.name || u.firstName || '').trim().split(' ')[0] || 'there';
  }, []);

  // Subscription tier (free | plus | pro). Read from the stored user so the
  // chooser can show which tier each mode needs.
  const userTier = useMemo(() => readStoredUser().tier || 'free', []);

  // Live-interview entitlement (minutes balance + tier), the gate for the live
  // voice interview. Refreshed after each run so the remaining minutes stay current.
  const [entitlement, setEntitlement] = useState(null);
  const refreshEntitlement = React.useCallback(async () => {
    try {
      setEntitlement(await billingService.getEntitlement());
      // Let the navbar wallet pill refresh its minutes after a run/purchase.
      window.dispatchEvent(new Event('entitlement_updated'));
    } catch {
      /* non-fatal — gate falls back to allowing the attempt; server enforces */
    }
  }, []);
  useEffect(() => {
    refreshEntitlement();
  }, [refreshEntitlement]);

  // Seconds of live interview the user can still start (paid minutes or free taste).
  const liveSecondsAvailable = entitlement
    ? entitlement.tier !== 'free'
      ? entitlement.secondsRemaining || 0
      : entitlement.freeTasteRemainingSec || 0
    : null; // null = unknown (entitlement not loaded yet)

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
      clearTimeout(connectTimerRef.current);
      clearTimeout(graceKickRef.current);
      // Tear down any live realtime session + recorder on unmount.
      realtimeRef.current?.stop();
      recorderRef.current?.stop();
    };
  }, []);

  // ── realtime session countdown (cost guardrail) ──
  // Runs only during the live phase; reaching zero ends the interview.
  useEffect(() => {
    if (phase !== 'live') return undefined;
    const id = setInterval(() => {
      setSecondsLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'live') return;
    if (secondsLeft === 0) {
      if (!inGrace) {
        // Main time is up — DON'T cut the candidate off. Enter the grace window:
        // tell the interviewer to finish the current exchange, then wrap up and
        // run the closing. The countdown now shows the grace seconds.
        setInGrace(true);
        nudgedRef.current = true; // the soft heads-up is moot now
        realtimeRef.current?.sendInstruction(
          "TIME IS UP. If the candidate is mid-answer, let them finish their current thought — do NOT interrupt. Then warmly tell them you're right at time, and go straight to your CLOSING: ask whether they have any questions for you, answer briefly, then give a warm sign-off and thank them by name."
        );
        setSecondsLeft(graceSecRef.current);
        // Silent-room fallback: if neither side is speaking shortly after time-up,
        // prompt the interviewer to deliver the wrap-up on its own. Guarded so it
        // never talks over a speaking candidate (live isUserSpeaking check).
        clearTimeout(graceKickRef.current);
        graceKickRef.current = setTimeout(() => {
          if (voiceState !== 'speaking' && !realtimeRef.current?.isUserSpeaking?.()) {
            realtimeRef.current?.sendInstruction('', true);
          }
        }, 8000);
      } else {
        // Grace window expired — now close + grade.
        endRealtime();
      }
      return;
    }
    // Soft heads-up while there's still time, so time-up isn't a surprise. Sent
    // once, and only for sessions long enough to have a meaningful tail.
    if (
      !nudgedRef.current &&
      !inGrace &&
      maxSessionSecRef.current > 150 &&
      secondsLeft <= REALTIME_NUDGE_SEC
    ) {
      nudgedRef.current = true;
      realtimeRef.current?.sendInstruction(
        "TIME CHECK: you're nearly at time. Start steering toward wrapping up soon — finish the current topic, but don't begin a long new thread."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase, inGrace]);

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
    // Tear down any live session + recorder before leaving.
    realtimeRef.current?.stop();
    realtimeRef.current = null;
    recorderRef.current?.stop();
    recorderRef.current = null;
    navigate(`/interview-prep/${applicationId}`);
  };

  // Confirm before bailing out of an interview that's actually in progress
  // (leaving loses the session, recording, and assessment). Other screens exit
  // straight away.
  const ACTIVE_PHASES = ['running', 'conversation', 'live'];
  const handleExitClick = () => {
    if (ACTIVE_PHASES.includes(phase)) setShowExitConfirm(true);
    else exitToDetail();
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
      startByMode();
    }
  };

  // Start whichever mode the user picked on the chooser. Used by the intro
  // "start" button (after the ready check), "Start anyway", and "Retake".
  const startByMode = () => {
    if (mode === 'conversational') beginConversation();
    else beginInterview();
  };

  // Practice/simulated Q&A (the non-voice flow below) is free. The metered,
  // paid product is the LIVE VOICE interview (beginRealtime), gated on the
  // live-minute balance. Keep this open for the practice flow.
  const canStartInterview = () => true;

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
    enterConnecting();

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
      leaveConnecting('running');
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

  // ── conversational flow ──
  const spinePayload = () => simQuestions.map((q) => ({ question: q.question, type: q.type }));

  // Conversational mode dispatches to the realtime (live voice) experience when
  // the browser supports it (web + WebRTC + mic), else the turn-based fallback
  // (Android WebView, no mic, etc.).
  const beginConversation = () => {
    if (isRealtimeSupported()) return beginRealtime();
    return beginTurnBasedConversation();
  };

  const resetSessionState = () => {
    reservationRef.current = null; // only a realtime mint sets a live reservation
    setShowReadyCheck(false);
    setCurrent(0);
    setResults([]);
    setConfidence(null);
    setFlagged(new Set());
    setSessionRatings({});
    setTranscript([]);
    setSpineIndex(0);
    setAssessment(null);
    setGradingTranscript(null);
    setGradeError(false);
    setSavedRecordingBlob(null);
    setSavedRecordingDuration(0);
    setInGrace(false);
  };

  const beginTurnBasedConversation = async () => {
    resetSessionState();
    enterConnecting();

    try {
      const res = await InterviewPrepService.conversationTurn(applicationId, {
        phase: 'greeting',
        questionSpine: spinePayload(),
        spineIndex: 0,
        transcript: [],
        lastAnswer: '',
      });
      startedAtRef.current = Date.now();
      setSpineIndex(typeof res.nextSpineIndex === 'number' ? res.nextSpineIndex : 0);
      setTranscript([{ role: 'interviewer', text: res.spoken }]);
      // Go live the instant the interviewer's voice begins (after the connect beat).
      speakText(res.spoken, () => leaveConnecting('conversation'));
    } catch (e) {
      const code = e.response?.data?.code;
      toast.error(
        code === 'AI_UNAVAILABLE'
          ? 'The AI interviewer is unavailable right now. Try the guided mode instead.'
          : e.response?.data?.message || 'Failed to start the conversation'
      );
      setPhase('intro');
    }
  };

  // ── realtime (live voice) flow ──
  const handleRealtimeError = (err) => {
    if (err?.code === 'MIC_DENIED') {
      toast.error('We need microphone access for the live interview.');
      realtimeRef.current?.stop();
      realtimeRef.current = null;
      setMicStream(null);
      setPhase('intro');
      return;
    }
    // Network drop / handshake loss mid-interview: don't waste it — save and
    // score whatever was captured.
    if (err?.code === 'CONNECTION_LOST' || err?.code === 'HANDSHAKE_FAILED') {
      toast.error('Connection lost — saving and scoring the interview so far.');
    } else {
      toast.error('The live interview hit a problem — scoring what we have.');
    }
    endRealtime();
  };

  const beginRealtime = async () => {
    // Live-minute paywall: block before minting if we know the balance is empty.
    // (null = entitlement not loaded yet → let the server be the gate.)
    if (liveSecondsAvailable === 0) {
      toast.error(
        entitlement?.tier === 'free'
          ? 'You’ve used your free interview minutes. Upgrade to keep practicing.'
          : 'You’re out of interview minutes. Grab a plan or a top-up.'
      );
      navigate('/upgrade');
      return;
    }

    resetSessionState();
    setMuted(false);
    setMicStream(null);
    setCaption('');
    nudgedRef.current = false;
    enterConnecting();

    try {
      // Give the interviewer a natural, time-aware opening (greets by name + time).
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const sess = await InterviewPrepService.createRealtimeSession(applicationId, spinePayload(), {
        timeOfDay,
        candidateName: firstName && firstName !== 'there' ? firstName : '',
        voice,
        style,
      });
      reservationRef.current = sess.reservationId || null;
      maxSessionSecRef.current = sess.maxSessionSec || 360;
      graceSecRef.current = sess.graceSec || 90;
      setSecondsLeft(maxSessionSecRef.current);

      const ctl = createRealtimeWebRTC({
        clientSecret: sess.clientSecret,
        model: sess.model,
        onState: (s) => {
          setVoiceState(s === 'speaking' ? 'speaking' : s === 'connecting' ? 'loading' : 'idle');
          if (s === 'listening' || s === 'speaking') leaveConnecting('live');
        },
        onError: handleRealtimeError,
        onStream: ({ local, remote }) => {
          setMicStream(local);
          recorderRef.current = createMixedRecorder(local, remote);
        },
        onCaption: (turn) => {
          if (turn.role === 'interviewer') setCaption(turn.text);
        },
      });
      realtimeRef.current = ctl;
      startedAtRef.current = Date.now();
      await ctl.start();
    } catch (e) {
      const code = e.response?.data?.code;
      // Out of minutes (race / stale entitlement) → send to pricing, don't fall back.
      if (code === 'NO_MINUTES') {
        clearTimeout(connectTimerRef.current);
        setPhase('choose');
        await refreshEntitlement();
        toast.error(e.response?.data?.message || 'You’re out of interview minutes.');
        navigate('/upgrade');
        return;
      }
      toast.error(
        code === 'REALTIME_UNAVAILABLE' || code === 'AI_UNAVAILABLE'
          ? 'The live interviewer is unavailable — switching to the typed conversation.'
          : e.response?.data?.message || 'Failed to start the live interview.'
      );
      // Seamless fallback to the turn-based conversational mode.
      beginTurnBasedConversation();
    }
  };

  // End the live session: grab the transcript, stop + persist the recording,
  // then AI-assess the interview.
  const endRealtime = async () => {
    clearTimeout(graceKickRef.current);
    const liveTranscript = realtimeRef.current?.getTranscript?.() || [];
    try {
      const blob = await recorderRef.current?.stop();
      recorderRef.current = null;
      if (blob) {
        const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
        const id = await saveRecording({ applicationId, blob, durationSec, createdAt: Date.now() });
        if (id) {
          setSavedRecordingBlob(blob);
          setSavedRecordingDuration(durationSec);
          toast.success('Interview recording saved — replay it anytime on this device.');
        }
      }
    } catch {
      /* recording is best-effort */
    }
    realtimeRef.current?.stop();
    realtimeRef.current = null;
    setMicStream(null);
    finishConversation(liveTranscript);
  };

  const toggleRealtimeMute = () => {
    const nowMuted = realtimeRef.current?.toggleMute();
    setMuted(!!nowMuted);
  };

  // One turn: send the candidate's answer + transcript, speak the reply, advance.
  const submitAnswer = async (answerText) => {
    if (turnLoading) return;
    const text = (answerText || '').trim();
    if (!text) return;
    const nextTranscript = [...transcript, { role: 'candidate', text }];
    setTranscript(nextTranscript);
    setTurnLoading(true);
    setVoiceState('loading'); // interviewer tile shows "Preparing…"
    try {
      const res = await InterviewPrepService.conversationTurn(applicationId, {
        phase: 'answer',
        questionSpine: spinePayload(),
        spineIndex,
        transcript: nextTranscript,
        lastAnswer: text,
      });
      const finalTranscript = [...nextTranscript, { role: 'interviewer', text: res.spoken }];
      setTranscript(finalTranscript);
      setSpineIndex(typeof res.nextSpineIndex === 'number' ? res.nextSpineIndex : spineIndex);
      speakText(res.spoken);
      if (res.done) finishConversation(finalTranscript);
    } catch (e) {
      const code = e.response?.data?.code;
      toast.error(
        code === 'AI_UNAVAILABLE'
          ? 'The AI interviewer is unavailable right now.'
          : e.response?.data?.message || 'Failed to continue the interview'
      );
      setVoiceState('idle');
    } finally {
      setTurnLoading(false);
    }
  };

  // Grade a transcript and show the report. Keeps the transcript on failure so
  // the user can re-run the assessment from the review screen (the interview
  // isn't lost just because the assessor blipped).
  const gradeTranscript = async (tx) => {
    setGradingTranscript(tx);
    setGradeError(false);
    setPhase('grading');
    try {
      const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const res = await InterviewPrepService.assessInterview(applicationId, {
        transcript: tx,
        durationSec,
        plannedSec,
        reservationId: reservationRef.current,
      });
      // Reservation is now reconciled server-side; don't double-reconcile on a re-run.
      reservationRef.current = null;
      refreshEntitlement(); // reflect the minutes just spent
      setAssessment(res.assessment);
      setGradingTranscript(null);
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
    } catch (e) {
      setGradeError(true);
      toast.error(
        e.response?.data?.code === 'AI_UNAVAILABLE'
          ? 'Couldn’t score this interview right now — your recording is saved; you can re-run it.'
          : 'Couldn’t score this interview right now — you can re-run it.'
      );
    } finally {
      setPhase('review');
    }
  };

  // End of a conversational interview → AI-assess it from the transcript
  // (replaces self-rating). Falls back to a plain review if there's nothing to grade.
  const finishConversation = (gradingTranscriptArg) => {
    const resultsWithRatings = simQuestions.map((q, i) => ({
      ...q,
      confidence: sessionRatings[i] || q.confidence || null,
    }));
    setResults(resultsWithRatings);

    const tx = Array.isArray(gradingTranscriptArg) ? gradingTranscriptArg : transcript;
    const hasAnswers = tx.some((t) => t.role === 'candidate' && (t.text || '').trim());
    if (!hasAnswers) {
      setGradingTranscript(null);
      setPhase('review');
      return;
    }
    gradeTranscript(tx);
  };

  const retryAssessment = () => {
    if (gradingTranscript && gradingTranscript.length) gradeTranscript(gradingTranscript);
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/60 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/30 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!application) return null;
  const title = application.jobTitle || application.jobId?.title || 'Interview';

  // Dark "call room" theme for the conversational interview itself — the live
  // voice run, the turn-based conversation, the connect beat that leads into
  // them, and the scoring screen that follows. Setup (chooser/intro), the guided
  // reader, and the review scorecard stay on the bright theme, so stepping into
  // the conversation reads as walking into the call.
  const immersive =
    phase === 'conversation' ||
    phase === 'live' ||
    phase === 'grading' ||
    (phase === 'connecting' && mode === 'conversational');

  return (
    <div
      className={`min-h-screen flex flex-col ${
        immersive
          ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100'
          : 'bg-gradient-to-b from-slate-50 via-white to-indigo-50/60 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/30 text-slate-900 dark:text-slate-100'
      }`}
    >
      <header
        className={`backdrop-blur sticky top-0 z-10 border-b ${
          immersive ? 'border-white/10 bg-slate-950/50' : 'border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
              immersive ? 'text-indigo-300' : 'text-indigo-600'
            }`}
          >
            {(phase === 'running' || phase === 'conversation' || phase === 'live') && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
            {phase === 'live'
              ? 'Live interview'
              : phase === 'conversation'
                ? 'Conversational interview'
                : 'Interview mode'}
          </span>
          <div className="flex items-center gap-3">
            {phase === 'running' && (
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-bold tabular-nums ${
                  timeLeft <= 30 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'
                }`}
                title="Time left on this question"
              >
                <Clock className="w-4 h-4" /> {fmt(timeLeft)}
              </span>
            )}
            {phase === 'live' && (
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-bold tabular-nums ${
                  inGrace
                    ? 'text-amber-300'
                    : secondsLeft <= 30
                      ? 'text-rose-400'
                      : 'text-slate-200'
                }`}
                title={inGrace ? 'Wrapping up' : 'Time left in this interview'}
              >
                <Clock className="w-4 h-4" />
                {inGrace && <span className="hidden sm:inline">Wrapping up ·</span>}{' '}
                {fmt(secondsLeft)}
              </span>
            )}
            <button
              type="button"
              onClick={handleExitClick}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                immersive
                  ? 'bg-white/5 border border-white/15 hover:bg-white/10 text-slate-200'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <X className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 py-4 sm:py-5">
        <div className="w-full max-w-3xl">
          {phase === 'choose' &&
            (simQuestions.length === 0 ? (
              <IntroView
                firstName={firstName}
                title={title}
                count={0}
                plannedSec={plannedSec}
                lastSession={lastSession}
                trend={getInterviewTrend(application)}
                onStart={handleStartClick}
                onCancel={exitToDetail}
              />
            ) : (
              <ModeChooserView
                title={title}
                userTier={userTier}
                onPick={(picked) => {
                  setMode(picked);
                  setPhase('intro');
                }}
                onCancel={exitToDetail}
              />
            ))}

          {phase === 'intro' && (
            <>
              {entitlement && (
                <div className="max-w-2xl mx-auto mb-3 flex items-center justify-center gap-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    {entitlement.tier === 'free'
                      ? `Free interview minutes left: ${Math.ceil((liveSecondsAvailable || 0) / 60)}`
                      : `${entitlement.minutesRemaining} live interview minutes left`}
                  </span>
                  {(liveSecondsAvailable || 0) <= 60 && (
                    <button
                      onClick={() => navigate('/upgrade')}
                      className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {entitlement.tier === 'free' ? 'Upgrade' : 'Top up'}
                    </button>
                  )}
                </div>
              )}
              <IntroView
                firstName={firstName}
                title={title}
                count={simQuestions.length}
                plannedSec={plannedSec}
                lastSession={lastSession}
                trend={getInterviewTrend(application)}
                mode={mode}
                voice={voice}
                style={style}
                onVoiceChange={chooseVoice}
                onStyleChange={chooseStyle}
                onStart={handleStartClick}
                onCancel={() => setPhase('choose')}
              />
            </>
          )}

          {phase === 'connecting' && (
            <ConnectingView
              firstName={firstName}
              title={title}
              mode={mode}
              dark={mode === 'conversational'}
              connected={connected}
            />
          )}

          {phase === 'conversation' && (
            <ConversationView
              voiceState={voiceState}
              turnLoading={turnLoading}
              spineIndex={spineIndex}
              total={simQuestions.length}
              onReplay={() => {
                const last = [...transcript].reverse().find((t) => t.role === 'interviewer');
                if (last) speakText(last.text);
              }}
              onSubmit={submitAnswer}
              onEnd={() => finishConversation()}
            />
          )}

          {phase === 'live' && (
            <RealtimeView
              voiceState={voiceState}
              secondsLeft={secondsLeft}
              inGrace={inGrace}
              muted={muted}
              micStream={micStream}
              captionsOn={captionsOn}
              caption={caption}
              onToggleCaptions={() => setCaptionsOn((v) => !v)}
              onToggleMute={toggleRealtimeMute}
              onEnd={endRealtime}
            />
          )}

          {phase === 'grading' && <GradingView />}

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
              overall={assessment ? assessment.overallScore : overall}
              assessment={assessment}
              confidence={confidence}
              setConfidence={setConfidence}
              flagged={flagged}
              toggleFlag={toggleFlag}
              saving={saving}
              saved={!!lastSession}
              recordingBlob={savedRecordingBlob}
              recordingDuration={savedRecordingDuration}
              gradeError={gradeError && !assessment && !!gradingTranscript}
              onRetryAssessment={retryAssessment}
              onSave={saveSession}
              onPracticeWeak={() =>
                navigate(`/interview-prep/${applicationId}/practice?filter=weak`)
              }
              onPracticeQuestion={(i) =>
                navigate(`/interview-prep/${applicationId}/practice?questionIndex=${i}`)
              }
              onRetake={startByMode}
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
            onStartAnyway={startByMode}
            onClose={() => setShowReadyCheck(false)}
          />
        )}
        {showExitConfirm && (
          <ExitConfirmModal
            isLive={phase === 'live'}
            onLeave={() => {
              setShowExitConfirm(false);
              exitToDetail();
            }}
            onStay={() => setShowExitConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Exit confirmation (only while an interview is in progress) ──
const ExitConfirmModal = ({ isLive, onLeave, onStay }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onStay}
      className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
    />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-xl relative z-10 text-slate-900 dark:text-slate-100"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-100 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
            Leave the interview?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            You’re in the middle of an interview. If you leave now, this session won’t be saved
            {isLive ? ' — no recording and no assessment' : ' and won’t be assessed'}. To get your
            score, finish and tap{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              End &amp; review
            </span>{' '}
            instead.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onStay}
          className="flex-1 order-1 sm:order-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-100 select-none cursor-pointer"
        >
          Stay in the interview
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="flex-1 order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors select-none cursor-pointer"
        >
          Leave anyway
        </button>
      </div>
    </motion.div>
  </div>
);

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
      className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden z-10 text-slate-900 dark:text-slate-100"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-100 dark:border-amber-500/30 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0 pr-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
            Ready for this interview?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Some essentials are still missing
          </p>
        </div>
      </div>

      <div className="mt-5 bg-slate-50 dark:bg-slate-900 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            Your readiness score
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{readiness}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${readiness}%` }}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
          To-do before you start:
        </p>
        <ul className="space-y-2.5">
          {missing.map((m, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0 animate-pulse" />
              <span className="leading-relaxed">
                Prepare{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {m.replace('your ', '')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 bg-indigo-50/40 dark:bg-indigo-500/15 border border-indigo-100/50 dark:border-indigo-500/30 rounded-lg p-3 mt-5 leading-relaxed">
        <span className="font-semibold text-indigo-800 dark:text-indigo-300">Tip:</span> Preparing
        these essentials enables the AI interviewer to ask targeted questions grounded in your
        actual history.
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
          className="flex-1 order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors select-none cursor-pointer"
        >
          Start anyway
        </button>
      </div>
    </motion.div>
  </div>
);

// ── Going live (connecting) ──
// A short "placing the call" beat shown after the user starts, while the
// interviewer's greeting voice loads. Expanding sonar rings + a stepping status
// make it feel like a call connecting; it's replaced by the live screen the
// instant the interviewer's voice begins. A minimum on-screen time (CONNECT_MIN_MS,
// enforced by the parent) keeps it from flashing past too fast to read.
// `dark` styles it for the immersive conversational call room.
const CONNECT_STEPS = ['Dialing…', 'Ringing…', 'Connecting…'];

const ConnectingView = ({ firstName, title, mode, dark, connected }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (connected) return undefined; // freeze the stepper once connected
    const id = setInterval(() => setStep((s) => Math.min(s + 1, CONNECT_STEPS.length - 1)), 750);
    return () => clearInterval(id);
  }, [connected]);

  return (
    <div className="flex flex-col items-center justify-center text-center h-[calc(100dvh-5.5rem)]">
      {/* Interviewer avatar — sonar rings while placing the call, a settled
          emerald ring once connected. */}
      <div className="relative mb-8 flex items-center justify-center">
        {!connected && (
          <div className="absolute w-20 h-20 sm:w-24 sm:h-24" aria-hidden>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className={`absolute inset-0 rounded-full border ${
                  dark ? 'border-indigo-400/40' : 'border-indigo-300/60'
                }`}
                initial={{ scale: 0.85, opacity: 0.55 }}
                animate={{ scale: 2.3, opacity: 0 }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}
        <motion.div
          animate={connected ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white flex items-center justify-center p-3.5 shadow-xl transition-[box-shadow,border-color] duration-300 ${
            connected
              ? 'border border-emerald-300 ring-4 ring-emerald-400/40'
              : dark
                ? 'border border-white/20 ring-4 ring-indigo-500/30'
                : 'border border-indigo-200 ring-4 ring-indigo-100'
          }`}
        >
          <img
            src="/applyright-icon.png"
            alt="ApplyRight AI interviewer"
            className="w-full h-full object-contain"
          />
        </motion.div>
      </div>

      {connected ? (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${
            dark ? 'text-emerald-300' : 'text-emerald-600'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Connected
        </motion.span>
      ) : (
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${
            dark ? 'text-rose-300' : 'text-rose-600'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          {CONNECT_STEPS[step]}
        </span>
      )}

      <h2 className={`mt-3 text-lg sm:text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
        {connected ? 'Connected — here we go.' : 'Connecting you with your interviewer…'}
      </h2>
      <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        {connected
          ? 'Putting you through…'
          : `${firstName && firstName !== 'there' ? `One moment, ${firstName}.` : 'One moment.'}${
              title ? ` ${title}` : ''
            }`}
      </p>
      {!connected && mode === 'conversational' && (
        <p className={`mt-2 text-xs max-w-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          Setting up a live conversation — this works best on a strong, stable connection.
        </p>
      )}

      {/* progress dots advance with the call steps; all fill on connect */}
      <div className="mt-6 flex items-center gap-2" aria-hidden>
        {CONNECT_STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              connected
                ? `w-6 ${dark ? 'bg-emerald-400' : 'bg-emerald-500'}`
                : i <= step
                  ? `w-6 ${dark ? 'bg-indigo-400' : 'bg-indigo-500'}`
                  : `w-1.5 ${dark ? 'bg-white/15' : 'bg-slate-200'}`
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Shown while the AI scores a finished conversational interview.
const GradingView = () => (
  <div className="flex flex-col items-center justify-center text-center h-[calc(100dvh-5.5rem)]">
    <div className="relative mb-6">
      <span className="absolute -inset-3 rounded-[1.75rem] bg-indigo-300/40 blur-2xl animate-pulse" />
      <div className="relative w-20 h-20 rounded-3xl bg-white border border-white/20 ring-4 ring-indigo-500/30 flex items-center justify-center p-3 shadow-xl">
        <img
          src="/applyright-icon.png"
          alt="ApplyRight AI"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
    <h2 className="mt-1 text-lg sm:text-xl font-bold text-white">Scoring your interview…</h2>
    <p className="mt-1 text-sm text-slate-400 max-w-sm">
      Assessing your answers against your CV and the role — the things interviewers look for.
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200"
      >
        <Wind className="w-3.5 h-3.5" />
        {open ? 'Hide breathing' : 'Feeling nervous? Take a breath first'}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/15 p-4">
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
  mode,
  voice,
  style,
  onVoiceChange,
  onStyleChange,
  onStart,
  onCancel,
}) => (
  <div className="relative overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-5 sm:p-7 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
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
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
        {mode === 'conversational' ? 'Conversational interview' : 'Guided interview'}
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{title}</p>
    </div>

    {count === 0 ? (
      <>
        <p className="relative z-10 text-sm text-slate-500 dark:text-slate-400 mt-6 text-center leading-relaxed">
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
        {mode === 'conversational' ? (
          <p className="relative z-10 text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed text-center">
            Hi <span className="font-semibold text-slate-900 dark:text-slate-100">{firstName}</span>{' '}
            — take a breath. Your ApplyRight AI interviewer will{' '}
            <strong className="text-slate-900 dark:text-slate-100">actually talk with you</strong>:
            it reacts to your answers and asks natural follow-ups. Reply by voice or text — just
            have the conversation, like the real thing.
          </p>
        ) : (
          <p className="relative z-10 text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed text-center">
            Hi <span className="font-semibold text-slate-900 dark:text-slate-100">{firstName}</span>{' '}
            — take a breath. Your ApplyRight AI interviewer will ask each question aloud. Answer out
            loud as if you’re in the room, then{' '}
            <strong className="text-slate-900 dark:text-slate-100">reveal a model answer</strong>{' '}
            and rate how it felt.
          </p>
        )}
        {mode === 'conversational' && (
          <div className="relative z-10 mt-4 rounded-xl border border-amber-100 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/15 p-3 flex items-start gap-2.5">
            <Mic className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Find a quiet spot first.
              </span>{' '}
              The interviewer is always listening, so background noise or other voices can interrupt
              it. Earphones or a headset help a lot.
            </p>
          </div>
        )}
        {mode === 'conversational' && (
          <VoiceStyleSelector
            voice={voice}
            style={style}
            onVoiceChange={onVoiceChange}
            onStyleChange={onStyleChange}
          />
        )}
        {mode === 'conversational' && <DeviceCheck />}
        {trend && trend.count >= 1 && (
          <div className="relative z-10 mt-4 rounded-xl border border-emerald-100 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/15 p-3 flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                You’ve done {trend.count} {trend.count === 1 ? 'interview' : 'interviews'}.
              </span>{' '}
              {trend.trend === 'up' && trend.firstConfidence && trend.lastConfidence
                ? `Your nerves are easing — ${CONF_WORD[trend.firstConfidence]} → ${CONF_WORD[trend.lastConfidence]}. `
                : ''}
              Each rep makes the real room feel more familiar.
            </p>
          </div>
        )}
        <div className="relative z-10 mt-4 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm grid grid-cols-3 gap-2.5 divide-x divide-slate-100 dark:divide-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-indigo-50/80 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
                Questions
              </p>
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {count}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left pl-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50/80 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
                Duration
              </p>
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                ~{Math.round(plannedSec / 60)} min
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left pl-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50/80 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
                Credits
              </p>
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                Free
              </p>
            </div>
          </div>
        </div>
        {lastSession && (
          <div className="relative z-10 mt-4 rounded-xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/15 p-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Last session:
              </span>{' '}
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
            {mode === 'conversational' ? 'Start the conversation' : 'Take your seat'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors cursor-pointer select-none"
          >
            Back
          </button>
        </div>
      </>
    )}
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
    <div className="mt-3 rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/15 p-4">
      <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300 mb-1">
        Adaptive follow-up · premium
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
        Type or dictate your answer and the AI interviewer asks a real follow-up — just like the
        live thing.
      </p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="Your answer…"
        className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <div className="mt-2 flex items-center gap-2">
        {sttSupported && (
          <button
            type="button"
            onClick={toggleMic}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
              listening
                ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
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
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300 mb-1">
            Interviewer follow-up
          </p>
          <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold leading-snug">
            “{followUp}”
          </p>
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
                  : 'w-6 bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Interviewer "video tile" — the AI is present and talking to you */}
      <div className="shrink-0 relative overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 sm:p-5 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
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
                  : 'border-slate-200 dark:border-slate-700 ring-2 ring-slate-100 dark:ring-slate-800'
              }`}
            >
              <img
                src="/applyright-icon.png"
                alt="ApplyRight AI interviewer"
                className="w-full h-full object-contain"
              />
            </div>
            {speaking && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-3.5 bg-white dark:bg-slate-800 rounded-full px-1.5 py-0.5 shadow-sm border border-indigo-100 dark:border-indigo-500/30">
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
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              ApplyRight AI
            </p>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
              Your interviewer
            </p>
            <div className="mt-1.5">
              {speaking ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />{' '}
                  Speaking…
                </span>
              ) : loading ? (
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 animate-pulse">
                  Preparing question…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Listening
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onReplay}
            title="Hear the question again"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer select-none"
          >
            <Volume2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hear again</span>
          </button>
        </div>

        {/* The question, framed as something the interviewer is asking you */}
        <div className="relative z-10 mt-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
            Question {index + 1} of {total} · {TYPE_LABEL(question.type)} · ~{budgetMin(question)}{' '}
            min
          </p>
          <h2 className="mt-1.5 text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
            “{question.question}”
          </h2>
        </div>
      </div>

      {/* Your turn — scrolls internally so the controls stay pinned and the page never scrolls */}
      <div className="flex-1 min-h-0 flex flex-col mt-4">
        <p className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2 px-1">
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
                className="flex flex-col items-center justify-center p-6 sm:p-8 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl bg-white/60 dark:bg-slate-800/60 text-center"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-md leading-relaxed">
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
                <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/15 space-y-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300">
                    {question.isWeakness ? 'Coaching strategy' : 'Model answer outline'}
                  </p>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
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
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 text-center sm:text-left">
                    How did your answer feel?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => onRate('needs_work')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all select-none cursor-pointer ${
                        currentRating === 'needs_work'
                          ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-400 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 ring-2 ring-rose-100 dark:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                          ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-400 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-100 dark:ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-100 dark:ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
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
      <div className="shrink-0 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer select-none"
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
  assessment,
  confidence,
  setConfidence,
  flagged,
  toggleFlag,
  saving,
  saved,
  recordingBlob,
  recordingDuration,
  gradeError,
  onRetryAssessment,
  onSave,
  onPracticeWeak,
  onPracticeQuestion,
  onRetake,
  onDone,
  onRateQuestion,
}) => {
  const [openIdx, setOpenIdx] = useState(null);

  // Object URL for the just-recorded live session (replay on the review screen).
  const recordingUrl = useMemo(
    () => (recordingBlob ? URL.createObjectURL(recordingBlob) : null),
    [recordingBlob]
  );
  useEffect(() => () => recordingUrl && URL.revokeObjectURL(recordingUrl), [recordingUrl]);

  const confBadgeStyle = (c) => {
    if (c === 'ready')
      return 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30';
    if (c === 'almost')
      return 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30';
    if (c === 'needs_work')
      return 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
  };

  const confLabel = (c) => {
    if (c === 'ready') return 'Strong';
    if (c === 'almost') return 'Okay';
    if (c === 'needs_work') return 'Shaky';
    return 'Unrated';
  };

  const scoreTone = (s) =>
    s >= 75
      ? 'text-emerald-600 dark:text-emerald-300'
      : s >= 45
        ? 'text-amber-600 dark:text-amber-300'
        : 'text-rose-600 dark:text-rose-300';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-5 sm:p-8 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)]">
      {/* ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl"
      />

      <div className="relative z-10">
        <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
            {overall != null ? (
              <span className={`text-xl font-bold ${scoreTone(overall)}`}>{overall}%</span>
            ) : (
              <Trophy className="w-7 h-7 text-amber-500" />
            )}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              Interview complete
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {assessment
                ? `AI readiness score: ${overall}% — ${READINESS_LABEL[assessment.readiness] || ''}`
                : overall != null
                  ? `Self-assessed performance score: ${overall}% average`
                  : 'Complete your ratings to calculate your score.'}
            </p>
          </div>
        </div>

        {/* Recording of the live session — replay it right here */}
        {recordingUrl && (
          <div className="mt-5 rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/15 p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300 mb-2">
              Your interview recording
            </p>
            <AudioPlayer src={recordingUrl} durationHint={recordingDuration} />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Saved on this device — find it again under “Past interviews” on your prep page.
            </p>
          </div>
        )}

        {/* AI assessment (conversational) — replaces self-rating */}
        {assessment ? (
          <AssessmentReport assessment={assessment} />
        ) : gradeError ? (
          <div className="mt-6 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/15 p-4 text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              We couldn’t score this interview just now.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your answers are still here — give it another try.
            </p>
            <button
              type="button"
              onClick={onRetryAssessment}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Re-run assessment
            </button>
          </div>
        ) : (
          <>
            {/* Self confidence overall (guided/scripted mode) */}
            <div className="mt-6">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5">
                How did that feel overall?
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {CONF.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConfidence(c.id)}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all select-none cursor-pointer ${
                      confidence === c.id
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
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
          </>
        )}

        {/* Per-question results (guided/scripted only) */}
        {!assessment && results.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-3.5">
              Your practiced questions — tick any you want to keep working on
            </p>
            <div className="space-y-3">
              {results.map((r, i) => {
                const open = openIdx === i;
                const on = flagged.has(r._origIndex);
                return (
                  <div
                    key={i}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <button
                        type="button"
                        onClick={() => toggleFlag(r._origIndex)}
                        className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-colors"
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
                        className="flex-1 min-w-0 text-left text-sm font-semibold text-slate-800 dark:text-slate-200 truncate hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                      >
                        {r.question}
                      </button>
                    </div>
                    {open && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-4">
                        {/* Suggested answer outline */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300 mb-1.5">
                            {r.isWeakness ? 'Coaching strategy' : 'Model answer outline'}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 whitespace-pre-line leading-relaxed">
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
                        <div className="border-t border-slate-200/80 dark:border-slate-700/80 pt-3">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
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
                                      ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                      : c.id === 'almost'
                                        ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-400 dark:border-amber-500/40 text-amber-700 dark:text-amber-300'
                                        : 'bg-rose-50 dark:bg-rose-500/15 border-rose-400 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-semibold transition-all cursor-pointer"
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
            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-all cursor-pointer select-none"
          >
            <RefreshCw className="w-4 h-4" /> Retake
          </button>
          <button
            type="button"
            onClick={onDone}
            className="sm:ml-auto px-4.5 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none text-center"
          >
            Back to prep
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Mode chooser ──
// Shown the moment the user starts an interview. Teaches the difference between
// the two modes (what each is, why it differs, the tier + the network it needs)
// so the user picks the right one. Free during testing — the tier pill is
// informational, never a hard block.
const TIER_RANK = { free: 0, plus: 1, pro: 2 };

const ModeCard = ({
  icon,
  name,
  tierLabel,
  tierKey,
  userTier,
  blurb,
  bullets,
  network,
  networkIcon,
  accent,
  onPick,
}) => {
  // Free during testing: everyone can start either mode. The pill tells the
  // user which tier this mode will need once Interview Mode becomes paid.
  const owned = TIER_RANK[userTier] >= TIER_RANK[tierKey];
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-5 sm:p-6 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.4)] flex flex-col ${accent.border}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-20 -right-14 w-52 h-52 rounded-full blur-3xl ${accent.glow}`}
      />
      <div className="relative z-10 flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${accent.iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {name}
          </h3>
          <span
            className={`mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${accent.pill}`}
          >
            {owned ? null : <Lock className="w-2.5 h-2.5" />} {tierLabel}
          </span>
        </div>
      </div>

      <p className="relative z-10 text-sm text-slate-600 dark:text-slate-300 mt-3.5 leading-relaxed">
        {blurb}
      </p>

      <ul className="relative z-10 mt-3 space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${accent.dot}`} />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>

      <div
        className={`relative z-10 mt-4 flex items-start gap-2 rounded-xl border p-2.5 ${accent.netBox}`}
      >
        {networkIcon}
        <p className="text-xs leading-relaxed">{network}</p>
      </div>

      <div className="relative z-10 mt-auto pt-4">
        <button
          type="button"
          onClick={onPick}
          className={`w-full px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all cursor-pointer shadow-md hover:-translate-y-0.5 active:translate-y-0 select-none ${accent.btn}`}
        >
          {name.startsWith('Conversational') ? 'Start conversational' : 'Start guided'}
        </button>
        <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Included free during testing
        </p>
      </div>
    </div>
  );
};

const ModeChooserView = ({ title, userTier, onPick, onCancel }) => (
  <div className="relative">
    <div className="text-center mb-5">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
        Choose your interview
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Two ways to practice for{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-300">{title}</span> — pick the
        one that fits your connection.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ModeCard
        icon={<MessageSquare className="w-5 h-5" />}
        name="Conversational interview"
        tierLabel="Plus"
        tierKey="plus"
        userTier={userTier}
        blurb="A real back-and-forth. The AI reacts to what you actually say, references your CV, and asks natural follow-ups — the closest thing to the real room."
        bullets={[
          'Talks with you, not at you — live follow-ups',
          'Reply by voice or text, at your own pace',
          'Best on desktop / Chrome',
        ]}
        network="Needs excellent network coverage — every answer is a live round-trip to the interviewer."
        networkIcon={<Wifi className="w-4 h-4 shrink-0 mt-0.5" />}
        accent={{
          border: 'border-indigo-200 dark:border-indigo-500/30',
          glow: 'bg-gradient-to-br from-indigo-200/60 to-violet-200/40',
          iconBg:
            'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30',
          pill: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30',
          dot: 'bg-indigo-500',
          netBox:
            'border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
          btn: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/20',
        }}
        onPick={() => onPick('conversational')}
      />

      <ModeCard
        icon={<BookOpen className="w-5 h-5" />}
        name="Guided question reader"
        tierLabel="Pro"
        tierKey="pro"
        userTier={userTier}
        blurb="The interviewer reads each prepared question aloud with a warm, human delivery. You answer out loud, reveal a model outline, and rate how it felt."
        bullets={[
          'Steady, predictable pace — one question at a time',
          'Reveal a model answer after each question',
          'Self-rate to track your readiness',
        ]}
        network="Needs only a normal, good internet connection — questions are prepared up front, so brief dips are fine."
        networkIcon={<Wifi className="w-4 h-4 shrink-0 mt-0.5" />}
        accent={{
          border: 'border-slate-200 dark:border-slate-700',
          glow: 'bg-gradient-to-br from-slate-200/60 to-indigo-100/40',
          iconBg:
            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
          pill: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30',
          dot: 'bg-slate-400',
          netBox:
            'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300',
          btn: 'bg-slate-800 hover:bg-slate-900 shadow-slate-300/40',
        }}
        onPick={() => onPick('scripted')}
      />
    </div>

    <div className="mt-5 text-center">
      <button
        type="button"
        onClick={onCancel}
        className="px-5 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none"
      >
        Cancel
      </button>
    </div>
  </div>
);

// Shared interviewer "tile" for the conversational run — avatar + live voice
// state + a replay button. (The guided RunningView keeps its own inline tile.)
const InterviewerTile = ({ voiceState, onReplay }) => {
  const speaking = voiceState === 'speaking';
  const loading = voiceState === 'loading';
  return (
    <div className="shrink-0 relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 sm:p-5 shadow-[0_10px_40px_-16px_rgba(79,70,229,0.6)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/15 blur-3xl"
      />
      <div className="relative z-10 flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white flex items-center justify-center p-2.5 border transition-all duration-300 ${
              speaking
                ? 'border-indigo-300 ring-4 ring-indigo-400/40 shadow-lg shadow-indigo-500/40 scale-[1.03]'
                : 'border-white/20 ring-2 ring-white/10'
            }`}
          >
            <img
              src="/applyright-icon.png"
              alt="ApplyRight AI interviewer"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-base font-bold text-white">ApplyRight AI</p>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Your interviewer
          </p>
          <div className="mt-1.5">
            {speaking ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Speaking…
              </span>
            ) : loading ? (
              <span className="text-[11px] font-bold text-slate-400 animate-pulse">Thinking…</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Listening
              </span>
            )}
          </div>
        </div>

        {onReplay && (
          <button
            type="button"
            onClick={onReplay}
            title="Hear that again"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-colors cursor-pointer select-none"
          >
            <Volume2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hear again</span>
          </button>
        )}
      </div>
    </div>
  );
};

// Reusable answer box — textarea + optional voice dictation + submit. Used by
// the conversational run for every turn.
const AnswerComposer = ({ onSubmit, loading, placeholder }) => {
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

  const send = () => {
    const text = answer.trim();
    if (!text || loading) return;
    onSubmit(text);
    setAnswer('');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={4}
        placeholder={placeholder || 'Answer naturally — speak or type…'}
        className="w-full text-sm rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
      />
      <div className="mt-2 flex items-center gap-2">
        {sttSupported && (
          <button
            type="button"
            onClick={toggleMic}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
              listening
                ? 'border-rose-400/40 bg-rose-500/10 text-rose-300'
                : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> {listening ? 'Stop' : 'Dictate'}
          </button>
        )}
        <button
          type="button"
          disabled={loading || !answer.trim()}
          onClick={send}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold disabled:opacity-50 transition-all"
        >
          {loading ? (
            <Loader className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Send answer
        </button>
      </div>
    </div>
  );
};

// ── Conversational run ──
// Turn-based conversational fallback (Android / no-mic). It's a real
// conversation, so the QUESTION is NOT shown on screen — you listen and reply.
// The typed composer stays here because it's the only way to answer without a mic.
const ConversationView = ({ voiceState, turnLoading, onReplay, onSubmit, onEnd }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    className="flex flex-col h-[calc(100dvh-5.5rem)]"
  >
    {/* header row */}
    <div className="shrink-0 flex items-center justify-between mb-3 px-1">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
        Conversation in progress
      </p>
      <button
        type="button"
        onClick={onEnd}
        className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
      >
        End &amp; review
      </button>
    </div>

    <InterviewerTile voiceState={voiceState} onReplay={onReplay} />

    {/* Your turn — listen to the interviewer, then answer (no question shown) */}
    <div className="flex-1 min-h-0 flex flex-col mt-4">
      <p className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 px-1">
        Your turn
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <AnswerComposer onSubmit={onSubmit} loading={turnLoading} />
        <p className="mt-3 text-center text-xs text-slate-400 leading-relaxed">
          Listen to the interviewer, then answer like you would in a real interview — they respond
          to what you say.
        </p>
      </div>
    </div>
  </motion.div>
);

// ── Realtime (live voice) view — VOICE ONLY, no text, no question on screen ──
const RealtimeView = ({
  voiceState,
  secondsLeft,
  inGrace,
  muted,
  micStream,
  captionsOn,
  caption,
  onToggleCaptions,
  onToggleMute,
  onEnd,
}) => {
  const speaking = voiceState === 'speaking';
  const connecting = voiceState === 'loading';
  const listening = !speaking && !connecting;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-[calc(100dvh-5.5rem)]"
    >
      <div className="shrink-0 flex items-center justify-between mb-3 px-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
          Live voice interview
        </p>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleCaptions}
            title="Toggle captions"
            className={`inline-flex items-center gap-1 text-[11px] font-bold transition-colors ${
              captionsOn ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Captions className="w-3.5 h-3.5" /> CC
          </button>
          <span
            className={`text-[11px] font-bold tabular-nums ${
              inGrace ? 'text-amber-300' : secondsLeft <= 30 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {inGrace ? `Wrapping up · ${fmt(secondsLeft)}` : `${fmt(secondsLeft)} left`}
          </span>
        </div>
      </div>

      <InterviewerTile voiceState={voiceState} />

      {/* Big live status */}
      <div className="shrink-0 mt-5 text-center">
        <p className="text-lg sm:text-xl font-bold text-white">
          {inGrace
            ? 'We’re at time — any questions for me?'
            : connecting
              ? 'Connecting…'
              : speaking
                ? 'Interviewer is speaking'
                : 'Go ahead — I’m listening'}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {inGrace
            ? 'Just wrapping up — ask anything you’d like, then we’ll close.'
            : 'Just talk — the interviewer hears you and replies in real time.'}
        </p>
      </div>

      {/* Optional captions of what the interviewer just said (accessibility) */}
      {captionsOn && (
        <div className="shrink-0 mt-4 mx-1 rounded-xl border border-white/10 bg-white/5 p-3 min-h-[3rem]">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
            Interviewer (captions)
          </p>
          <p className="text-sm text-slate-200 leading-relaxed">{caption || '…'}</p>
        </div>
      )}

      {/* Voice tracker — lights up + tracks your mic on your turn */}
      <div className="flex-1 min-h-0 flex flex-col justify-center mt-5">
        <VoiceVisualizer stream={micStream} active={listening && !muted} dark />
      </div>

      {/* Controls (pinned) */}
      <div className="shrink-0 mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleMute}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
            muted
              ? 'border-rose-400/40 bg-rose-500/10 text-rose-300'
              : 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200'
          }`}
        >
          {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button
          type="button"
          onClick={onEnd}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 select-none"
        >
          End &amp; review
        </button>
      </div>
    </motion.div>
  );
};

export default MockInterviewPage;
