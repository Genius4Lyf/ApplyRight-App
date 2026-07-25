import React, { useEffect, useMemo, useRef, useState } from 'react';
import AriaLoader from '../components/ui/AriaLoader';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  Eye,
  TrendingUp,
  Wind,
  Mic,
  MessageSquare,
  BookOpen,
  Wifi,
  Send,
  Lock,
  MicOff,
  Captions,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import InterviewPrepService from '../services/interviewPrep.service';
import billingService from '../services/billing.service';
import {
  getJobQuestions,
  computeReadiness,
  getInterviewTrend,
  computeInterviewGate,
} from '../utils/interviewPrep';
import InterviewReadinessChecklist from '../components/prep/InterviewReadinessChecklist';
import { BreathingExercise } from '../components/prep/CalmKit';
import InterviewerPanel from '../components/prep/InterviewerPanel';
import RoomBrief from '../components/prep/RoomBrief';
import PreflightSteps from '../components/prep/PreflightSteps';
import MeetingStage from '../components/prep/MeetingStage';
import { seatUnlocked } from '../utils/interviewLoop';
import AudioPlayer from '../components/AudioPlayer';
import AssessmentReport from '../components/prep/AssessmentReport';
import InterviewPaywallModal from '../components/InterviewPaywallModal';
import { VoiceStyleSelector, DeviceCheck } from '../components/prep/InterviewSetup';
import {
  isRealtimeSupported,
  createRealtimeSession as createRealtimeWebRTC,
} from '../lib/realtime';
import { createMixedRecorder } from '../lib/recorder';
import { saveRecording } from '../lib/recordings';
import { useMinVisible } from '../hooks/useMinVisible';
import { speak, stopSpeaking, startDictation, isSpeechRecognitionSupported } from '../lib/speech';
import { useTheme } from '../context/ThemeContext';

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
// Seconds before a panel seat's budget ends at which we pre-connect the NEXT
// interviewer in the background, so the hand-off is a seamless crossfade.
const REALTIME_PREWARM_LEAD_SEC = 30;

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
  const [searchParams, setSearchParams] = useSearchParams();
  // The immersive "call room" now follows the app theme like every other
  // screen. `.dark` is applied on this (dark-eligible) route whenever the
  // preference is dark, so `dark:` variants below do the work; the one place
  // that needs the boolean is ConnectingView, which themes via a `dark` prop.
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // Seconds elapsed when the user tapped End — drives the confirm modal copy
  // (review vs. early-exit) and whether the AI scorecard is even offered.
  const [endElapsedSec, setEndElapsedSec] = useState(0);
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
  // Free taste finishes without an AI scorecard (gated server-side, cost upsell).
  const [analysisLocked, setAnalysisLocked] = useState(false);
  const realtimeRef = useRef(null);
  const recorderRef = useRef(null);
  const maxSessionSecRef = useRef(360);
  // Live-minute reservation id from createRealtimeSession; echoed back at assess
  // so the backend reconciles the right reservation (null for turn-based runs).
  const reservationRef = useRef(null);
  // Which roster seat ran this session (pick-a-role), so grading records the round
  // against the right interviewer. null for solo/free/panel.
  const sessionSeatRef = useRef(null);
  const nudgedRef = useRef(false); // wrap-up nudge sent once near the time cap
  // ── time-up wind-down ──
  // When the main time runs out we DON'T hard-cut: we enter a grace window so the
  // interviewer can verbally wrap up + run the closing ("any questions for me?").
  const [inGrace, setInGrace] = useState(false);
  const graceSecRef = useRef(90); // grace window length (from the backend session)
  const graceKickRef = useRef(null); // silent-room fallback timer during grace
  // ── Premium/Pro multi-voice panel orchestration ──
  // The interview runs as a sequence of realtime sessions, one per panel seat
  // (each its own voice). We accumulate the transcript across segments for
  // grading, and track which seat is currently speaking.
  const panelModeRef = useRef('solo');
  const segmentsRef = useRef([]); // per-seat plan from the backend
  const segmentIdxRef = useRef(0); // current seat index
  const accumTranscriptRef = useRef([]); // transcript from completed segments
  const accumTelemetryRef = useRef([]); // delivery telemetry from completed segments
  const finalTelemetryRef = useRef([]); // stitched telemetry for the graded session
  const segStartRef = useRef(0); // start time of the current segment (per-seg recording)
  const advancingRef = useRef(false); // guard against double-advance on a seat
  // Pre-warmed NEXT interviewer ({ ctl, state }) — connected silently in the
  // background so the hand-off is a seamless crossfade, not a reconnect gap.
  const nextCtlRef = useRef(null);
  const prewarmingRef = useRef(false); // guard against double pre-warm
  // The panel seats for the live session, in a ref so the set_active_speaker
  // handler maps names → seats without a stale closure.
  const livePanelRef = useRef([]);
  const [activeSeat, setActiveSeat] = useState(null); // {name, role} currently speaking
  // True while we swap one interviewer's voice session for the next, IN PLACE
  // (no leaving the call screen). Pauses the countdown and shows a "joining" beat
  // on the incoming tile instead of the full dialing screen.
  const [handingOff, setHandingOff] = useState(false);
  const handingOffRef = useRef(false);

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
  // How hard the panel pushes (gentle | realistic | tough). Set before the interview.
  const [challenge, setChallenge] = useState(
    () => localStorage.getItem('interview_challenge') || 'realistic'
  );
  // Optional live captions of what the interviewer says (accessibility).
  const [captionsOn, setCaptionsOn] = useState(false);
  const [caption, setCaption] = useState('');
  // The 3-person interview panel (paid tiers) returned by createRealtimeSession;
  // shown on the connecting screen. Empty for free/solo interviews.
  const [panel, setPanel] = useState([]);
  // Panel shown on the SETUP screen (fetched ahead of time) so the user sees who's
  // interviewing them BEFORE they start. Free tier gets a generic teaser (blurred).
  const [setupPanel, setSetupPanel] = useState([]);
  const [panelLoading, setPanelLoading] = useState(true);
  // Pick-a-role: which roster interviewer the user chose to run this round (index
  // into setupPanel). Defaults to HR (seat 0), or a ?interviewer= deep link from
  // the loop board.
  const [chosenSeatIndex, setChosenSeatIndex] = useState(() => {
    const p = Number(new URLSearchParams(window.location.search).get('interviewer'));
    return Number.isInteger(p) && p >= 0 ? p : 0;
  });
  // Loop gating for the chooser: which seats are locked + each seat's best score.
  // A support-granted override unlocks everyone.
  const loopRounds = application?.interviewPrep?.rounds || [];
  const unlockAllInterviewers = !!application?.unlockAllInterviewers;
  const lockedIndices = useMemo(
    () =>
      setupPanel
        .map((_, i) => i)
        .filter((i) => !seatUnlocked(i, loopRounds, unlockAllInterviewers)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setupPanel, application]
  );
  const seatScores = useMemo(() => {
    const m = {};
    (loopRounds || []).forEach((r) => {
      if (r && typeof r.score === 'number') m[r.seatIndex] = r.score;
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application]);
  // If the chosen seat is locked (e.g. a stale deep link), fall back to the first
  // unlocked interviewer.
  useEffect(() => {
    if (lockedIndices.includes(chosenSeatIndex)) {
      const firstOpen = setupPanel.findIndex((_, i) => !lockedIndices.includes(i));
      setChosenSeatIndex(firstOpen >= 0 ? firstOpen : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedIndices]);

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
  const chooseChallenge = (c) => {
    setChallenge(c);
    try {
      localStorage.setItem('interview_challenge', c);
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

  // Buy a ₦600 Practice Pass (one scored solo run) via the hosted Flutterwave
  // checkout. Returns to /billing/return, which grants the minutes; the user comes
  // back with secondsRemaining > 0 and can run a scored session.
  const [buyingPass, setBuyingPass] = useState(false);
  // Pre-interview paywall modal — shown when a free user out of taste taps Start.
  const [showInterviewPaywall, setShowInterviewPaywall] = useState(false);
  const buyPracticePass = async () => {
    if (buyingPass) return;
    setBuyingPass(true);
    try {
      // Remember this interview so BillingReturn can send the buyer straight back
      // here (and auto-start the call) instead of dumping them on the dashboard —
      // the Flutterwave redirect wipes React state, so we stash it in localStorage.
      localStorage.setItem('arPostCheckout', window.location.pathname);
      const { link } = await billingService.checkout('practice_pass', 'NGN');
      if (link) window.location.href = link;
      else {
        toast.error('Could not start checkout — please try again.');
        setBuyingPass(false);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start checkout — please try again.');
      setBuyingPass(false);
    }
  };

  // Fetch the interview panel for the setup screen (conversational/live mode) so
  // the user sees who's interviewing them before starting. Re-fetches when the
  // style changes (the panel mix depends on it). Paid → real panel (cached);
  // free → generic teaser. Non-blocking: a failure just hides the card.
  useEffect(() => {
    if (mode !== 'conversational' || (phase !== 'intro' && phase !== 'choose')) return undefined;
    let cancelled = false;
    setPanelLoading(true);
    InterviewPrepService.getPanel(applicationId, style)
      .then((res) => {
        if (!cancelled && Array.isArray(res?.panel)) setSetupPanel(res.panel);
      })
      .catch(() => {
        /* the setup panel card is a nicety, not core to the flow */
      })
      .finally(() => {
        if (!cancelled) setPanelLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, phase, style, applicationId]);

  // Seconds of live interview the user can still start (paid minutes or free taste).
  // Spend PURCHASED minutes first (subscription / top-up / ₦600 Practice Pass),
  // then fall back to the lifetime free taste — mirrors the backend's reservation
  // order, so a free-tier Practice Pass buyer can start a (scored) session.
  const liveSecondsAvailable = entitlement
    ? (entitlement.secondsRemaining || 0) > 0
      ? entitlement.secondsRemaining
      : entitlement.freeTasteRemainingSec || 0
    : null; // null = unknown (entitlement not loaded yet)

  // Tier still gates the PANEL experience (role selection, length slider, sharper
  // model) — a Practice Pass buyer stays "free" tier and gets the solo interviewer,
  // just with their scorecard unlocked. Paid plans remain the upgrade for the panel.
  const isPaidTier = !!entitlement && entitlement.tier !== 'free';

  // Live-interview length control (paid only). Bounded by the per-tier cap and the
  // remaining balance; free is fixed at its taste. `lengthSec` is the chosen length;
  // null until initialized from the auto-planned duration once entitlement loads.
  const [lengthSec, setLengthSec] = useState(null);
  // End-of-interview wrap-up window. Default ON; draws from the user's balance so
  // the interviewer can close out. Off = hard cut at time-up (every second to Q&A).
  const [wrapUp, setWrapUp] = useState(true);
  // The slider picks the TOTAL session length (the interview + its wrap-up) —
  // matching the backend, which carves the wrap-up out of it. Range: a 10-minute
  // floor (sessions shorter than this make a weak scorecard) up to the per-tier
  // cap (15 min for Pro, 20 for Premium) or the remaining balance, whichever is
  // smaller. Steps of 5 min → 10 / 15 / 20. 10 minutes is the recommended sweet
  // spot. The floor gracefully shrinks to the balance when a user has < 10 min left.
  const RECOMMENDED_SEC = 600; // 10 min
  const budgetCapSec = entitlement
    ? Math.max(0, Math.min(entitlement.maxSessionSec || 0, liveSecondsAvailable || 0))
    : 0;
  const lengthMaxSec = budgetCapSec;
  const lengthMinSec = lengthMaxSec > 0 ? Math.min(600, lengthMaxSec) : 600;

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

  // Seed the paid length slider once: default to the auto-planned duration, clamped
  // into [lengthMinSec, lengthMaxSec]. Free tier never uses this.
  useEffect(() => {
    if (!isPaidTier || lengthSec != null || !lengthMaxSec) return;
    // Default to the recommended 10 min, clamped into the available range.
    const def = Math.max(lengthMinSec, Math.min(RECOMMENDED_SEC, lengthMaxSec));
    setLengthSec(def);
  }, [isPaidTier, lengthSec, lengthMaxSec, lengthMinSec]);

  // Paid users skip the Conversational-vs-Guided chooser and land straight on the
  // live-panel pre-flight (the panel picker already lives on the conversational
  // intro). A ?interviewer= deep-link — a LoopBoard "Start with <name>" click —
  // always implies a paid panel pick, so it skips too; because that runs before
  // entitlement even resolves (and while the loader is still up), the chooser never
  // flashes. Free users with no deep-link keep the chooser. The "no questions" case
  // is left on 'choose' so its "generate prep first" intro still shows for everyone.
  const hasInterviewerDeepLink = searchParams.get('interviewer') != null;
  useEffect(() => {
    if (phase !== 'choose' || mode !== null || simQuestions.length === 0) return;
    if (isPaidTier || hasInterviewerDeepLink) {
      setMode('conversational');
      setPhase('intro');
    }
  }, [isPaidTier, hasInterviewerDeepLink, phase, mode, simQuestions.length]);

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
      nextCtlRef.current?.ctl?.stop();
      recorderRef.current?.stop();
    };
  }, []);

  // ── realtime session countdown (cost guardrail) ──
  // Runs only during the live phase; reaching zero ends the interview.
  useEffect(() => {
    if (phase !== 'live') return undefined;
    const id = setInterval(() => {
      // Pause the clock while we swap voices between panel interviewers — that
      // reconnect time shouldn't burn the candidate's minutes or trip time-up.
      if (handingOffRef.current) return;
      setSecondsLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'live') return;
    // Multi-voice panel, not the last seat: pre-connect the next interviewer ~30s
    // before this seat's budget ends, so the hand-off (tool-driven or time-up) is
    // an instant crossfade. Cheap: a pre-warmed session is idle until activated.
    if (
      panelModeRef.current === 'multi-voice' &&
      segmentIdxRef.current < segmentsRef.current.length - 1 &&
      !handingOffRef.current &&
      secondsLeft > 0 &&
      secondsLeft <= REALTIME_PREWARM_LEAD_SEC &&
      !nextCtlRef.current &&
      !prewarmingRef.current
    ) {
      prewarmNextSegment();
    }
    if (secondsLeft === 0) {
      // Multi-voice panel: if this isn't the LAST seat and the interviewer hasn't
      // already handed off via the tool, the time backstop crossfades to the next.
      if (
        panelModeRef.current === 'multi-voice' &&
        segmentIdxRef.current < segmentsRef.current.length - 1
      ) {
        performHandoff();
        return;
      }
      // Wrap-up turned off (graceSec 0) → hard cut at time-up: close + grade now.
      if (!inGrace && graceSecRef.current <= 0) {
        endRealtime();
        return;
      }
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
  // Paid-only coaching — free users are routed to upgrade before any request.
  const handleFollowUp = async (answerText) => {
    if (!answerText || loadingFollowUp) return;
    if (!isPaidTier) {
      toast.error('Adaptive follow-ups are a Pro feature.');
      navigate('/upgrade');
      return;
    }
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
      if (code === 'TIER_REQUIRED') {
        toast.error('Adaptive follow-ups are a Pro feature.');
        navigate('/upgrade');
      } else if (code === 'INSUFFICIENT_CREDITS') {
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

  // Returning from a Practice Pass purchase (BillingReturn sends ?paid=1): the
  // minutes are now granted, so auto-start the live call instead of making the
  // buyer hunt for "Start" again. Fires ONCE, and only when the page + entitlement
  // have loaded, minutes are present, and the readiness gate is open — otherwise it
  // no-ops and the normal Start button stays (their purchased minutes aren't lost).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (searchParams.get('paid') !== '1') return;
    if (!application || !entitlement) return; // wait for both async loads
    if ((liveSecondsAvailable || 0) <= 0) return; // minutes must have landed
    if (!computeInterviewGate(application).unlocked) return; // respect the prep gate
    autoStartedRef.current = true;
    // Strip the flag so a refresh / re-render can't re-trigger the call.
    const next = new URLSearchParams(searchParams);
    next.delete('paid');
    setSearchParams(next, { replace: true });
    toast.success('Practice Pass active — starting your interview.');
    setMode('conversational');
    beginConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, application, entitlement, liveSecondsAvailable]);

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
    setAnalysisLocked(false);
    setGradingTranscript(null);
    setGradeError(false);
    setSavedRecordingBlob(null);
    setSavedRecordingDuration(0);
    setInGrace(false);
    // Reset multi-voice panel orchestration.
    panelModeRef.current = 'solo';
    segmentsRef.current = [];
    segmentIdxRef.current = 0;
    accumTranscriptRef.current = [];
    accumTelemetryRef.current = [];
    advancingRef.current = false;
    handingOffRef.current = false;
    setHandingOff(false);
    // Tear down any pre-warmed next interviewer from a prior run.
    try {
      nextCtlRef.current?.ctl?.stop();
    } catch {
      /* noop */
    }
    nextCtlRef.current = null;
    prewarmingRef.current = false;
    livePanelRef.current = [];
    setActiveSeat(null);
    setPanel([]);
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

  // Map a spoken first name → a panel seat (fuzzy match against livePanelRef).
  const seatByName = (name) => {
    const seats = livePanelRef.current || [];
    if (!name) return null;
    const lc = String(name).toLowerCase().trim();
    return (
      seats.find((p) => p.name && p.name.toLowerCase() === lc) ||
      seats.find(
        (p) => p.name && (p.name.toLowerCase().includes(lc) || lc.includes(p.name.toLowerCase()))
      ) ||
      null
    );
  };

  // Move the panel highlight to whoever a spoken name resolves to.
  const highlightSpeaker = (name) => {
    const m = seatByName(name);
    if (m) setActiveSeat({ name: m.name, role: m.role });
  };

  // Detect WHOSE question the HR host is asking, from what they just said. The
  // host attributes each colleague's question by name ("this is from Marcus",
  // "Marcus wanted me to ask", "over to Marcus's area") and returns to themselves
  // for HR questions ("I'm Renee", "on the HR side"). Names merely MENTIONED in
  // the opening panel introduction (e.g. "Marcus, our Engineering Lead" with no
  // attribution verb) don't match, so the highlight only moves on a real change.
  // Reliable fallback for when the model skips the set_active_speaker tool.
  const detectSpeakerFromText = (text) => {
    const seats = livePanelRef.current || [];
    if (!text || seats.length < 2) return null;
    for (const p of seats) {
      const n = (p.name || '').toLowerCase().replace(/[^a-z]/g, '');
      if (!n) continue;
      const re = new RegExp(
        // self-intro / attribution lead-ins: "I'm X", "this is X", "from X", "on behalf of X"
        `(?:\\bi'?m|\\bi am|\\bthis is|\\bfrom|on behalf of)\\s+${n}\\b` +
          // "X here", "X wanted/wants/would want/asks/is curious/would like"
          `|\\b${n}\\b\\s+(?:here|wanted|wants|would want|would like|asks?|is curious)` +
          // explicit handoff verbs
          `|(?:over to|bring in|hand(?:ing)?\\s+(?:it\\s+|you\\s+)?(?:over\\s+)?to|pass(?:ing)?\\s+(?:it\\s+|you\\s+)?to)\\s+${n}\\b`,
        'i'
      );
      if (re.test(text)) return p;
    }
    return null;
  };

  // Build a realtime controller for ONE panel seat, with all live-interview wiring.
  // `silent` builds a PRE-WARMED seat: it connects in the background but stays
  // muted (no voice, no mic, no UI takeover) until activate() promotes it. Its
  // callbacks are gated on `state.active` so a pre-warming seat never touches the
  // UI of the seat that's currently talking. Returns { ctl, state }.
  const buildSegmentController = ({ clientSecret, model, silent }) => {
    const state = { active: !silent, ready: false, wired: false, local: null, remote: null };

    // Wire mic + recorder to THIS seat's streams — only once it's the active seat.
    const wire = () => {
      if (state.wired || !state.local) return;
      state.wired = true;
      setMicStream(state.local);
      recorderRef.current = createMixedRecorder(state.local, state.remote);
    };

    const ctl = createRealtimeWebRTC({
      clientSecret,
      model,
      autoGreet: !silent, // pre-warmed seats stay silent until activate()
      startSilent: silent,
      onReady: () => {
        state.ready = true;
      },
      // Conversation-driven hand-off: this interviewer finished + said its hand-off
      // line, so crossfade to the next seat. Only meaningful once it's active.
      onHandoff: () => {
        if (state.active) performHandoff();
      },
      // Single-voice panel: the model explicitly signals who's now talking (the
      // set_active_speaker tool) → move the on-screen highlight to their tile.
      onSpeakerChange: (name) => {
        if (state.active) highlightSpeaker(name);
      },
      onState: (s) => {
        if (!state.active) return; // a pre-warming seat must not drive the UI
        setVoiceState(s === 'speaking' ? 'speaking' : s === 'connecting' ? 'loading' : 'idle');
        if (s === 'listening' || s === 'speaking') {
          leaveConnecting('live'); // no-op after the first segment
          if (handingOffRef.current) {
            handingOffRef.current = false;
            setHandingOff(false);
          }
        }
      },
      onError: (err) => {
        // A pre-warm failure must NOT end the interview — just drop it; the
        // hand-off will connect on demand. Only the ACTIVE seat's errors are fatal.
        if (state.active) {
          handleRealtimeError(err);
        } else {
          if (nextCtlRef.current && nextCtlRef.current.state === state) nextCtlRef.current = null;
          prewarmingRef.current = false;
        }
      },
      onStream: ({ local, remote }) => {
        state.local = local;
        state.remote = remote;
        if (state.active) wire();
      },
      onCaption: (turn) => {
        if (!state.active || turn.role !== 'interviewer') return;
        setCaption(turn.text);
        // Reliable fallback for the highlight: detect a speaker change from what
        // the interviewer actually said (self-intro / hand-off), in case the model
        // didn't call the set_active_speaker tool.
        const sp = detectSpeakerFromText(turn.text);
        if (sp) setActiveSeat({ name: sp.name, role: sp.role });
      },
    });

    return { ctl, state, wire };
  };

  // Stop + persist the CURRENT segment's recording (best-effort, silent). Used at
  // each multi-voice handoff so no segment's audio is lost.
  const saveSegmentRecording = async () => {
    try {
      const blob = await recorderRef.current?.stop();
      recorderRef.current = null;
      if (blob) {
        const durationSec = Math.round((Date.now() - segStartRef.current) / 1000);
        await saveRecording({ applicationId, blob, durationSec, createdAt: Date.now() });
      }
    } catch {
      /* recording is best-effort */
    }
  };

  // Pre-connect the NEXT panel seat in the background (its own voice), muted, so
  // the hand-off is an instant crossfade instead of a reconnect gap. Idempotent.
  const prewarmNextSegment = async () => {
    if (nextCtlRef.current || prewarmingRef.current) return nextCtlRef.current;
    const nextIdx = segmentIdxRef.current + 1;
    if (nextIdx >= segmentsRef.current.length) return null; // last seat: nobody after
    prewarmingRef.current = true;
    try {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const seg = await InterviewPrepService.createRealtimeSegment(applicationId, {
        reservationId: reservationRef.current,
        seatIndex: nextIdx,
        timeOfDay,
        candidateName: firstName && firstName !== 'there' ? firstName : '',
        style,
        challenge,
        questionSpine: spinePayload(),
      });
      const built = buildSegmentController({
        clientSecret: seg.clientSecret,
        model: seg.model,
        silent: true,
      });
      nextCtlRef.current = built;
      await built.ctl.start(); // connects silently; onReady flips state.ready
      prewarmingRef.current = false;
      return built;
    } catch {
      prewarmingRef.current = false;
      nextCtlRef.current = null;
      return null;
    }
  };

  const waitUntil = (cond, timeoutMs) =>
    new Promise((resolve) => {
      if (cond()) return resolve(true);
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (cond() || Date.now() - t0 > timeoutMs) {
          clearInterval(iv);
          resolve(cond());
        }
      }, 100);
    });

  // Seamless multi-voice hand-off: crossfade from the current interviewer to the
  // pre-warmed next one — no reconnect gap, no leaving the call screen. Triggered
  // either by the interviewer's hand_off_to_next tool (conversation-driven) or, as
  // a backstop, by the segment's time running out.
  const performHandoff = async () => {
    if (advancingRef.current) return;
    if (panelModeRef.current !== 'multi-voice') return;
    const curIdx = segmentIdxRef.current;
    if (curIdx >= segmentsRef.current.length - 1) return; // last seat never hands off
    advancingRef.current = true;
    handingOffRef.current = true;
    setHandingOff(true);

    // Make sure the next seat is connected (pre-warmed ideally; else connect now).
    let nxt = nextCtlRef.current || (await prewarmNextSegment());
    if (nxt) await waitUntil(() => nxt.state.ready, 6000);
    if (!nxt || !nxt.state.ready) {
      advancingRef.current = false;
      handingOffRef.current = false;
      setHandingOff(false);
      toast.error('Could not bring in the next interviewer — scoring the interview so far.');
      endRealtime();
      return;
    }

    // Stash the outgoing interviewer's transcript + recording before we swap.
    const prev = realtimeRef.current;
    const segTx = prev?.getTranscript?.() || [];
    accumTranscriptRef.current = [...accumTranscriptRef.current, ...segTx];
    accumTelemetryRef.current = [...accumTelemetryRef.current, ...(prev?.getTelemetry?.() || [])];
    await saveSegmentRecording();

    // Promote the pre-warmed seat to active and move the countdown to its budget.
    const nextIdx = curIdx + 1;
    nxt.state.active = true;
    realtimeRef.current = nxt.ctl;
    nextCtlRef.current = null;
    segmentIdxRef.current = nextIdx;
    const plan = segmentsRef.current[nextIdx] || {};
    setActiveSeat({ name: plan.name, role: plan.role });
    setCaption('');
    setMuted(false);
    nudgedRef.current = false;
    setInGrace(false);
    maxSessionSecRef.current = plan.mainSec || 60;
    graceSecRef.current = plan.graceSec ?? 0;
    setSecondsLeft(maxSessionSecRef.current);
    segStartRef.current = Date.now();
    nxt.wire(); // attach mic + recorder to the new seat (if its stream is ready)

    // Crossfade: the next voice fades in + starts speaking while the previous
    // fades out — the seamless baton-pass.
    await Promise.all([nxt.ctl.activate({ fadeMs: 300 }), prev?.fadeOut?.(300)]);
    prev?.stop?.();

    advancingRef.current = false;
  };

  const beginRealtime = async () => {
    // Live-minute paywall: block before minting if we know the balance is empty.
    // (null = entitlement not loaded yet → let the server be the gate.)
    if (liveSecondsAvailable === 0) {
      // Free user at peak "I want to practice now" intent → offer the ₦600 Practice
      // Pass right here (the modal, not the pricing page). Paid users who've burned
      // their allowance need a plan/top-up, so send them to /upgrade as before.
      if (entitlement?.tier === 'free') {
        setShowInterviewPaywall(true);
      } else {
        toast.error('You’re out of interview minutes. Grab a plan or a top-up.');
        navigate('/upgrade');
      }
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
        challenge,
        // Pick-a-role: which roster interviewer runs this round (paid).
        interviewerSeatIndex: isPaidTier ? chosenSeatIndex : undefined,
        // Paid users pick a length; free is fixed server-side (taste). wrapUp drives
        // the billed end-of-interview close-out window.
        requestedSec: isPaidTier && lengthSec ? lengthSec : undefined,
        wrapUp,
      });
      reservationRef.current = sess.reservationId || null;

      // CV guard: if this interview isn't grounded in the candidate's CV (no CV /
      // resume content found), the interviewer can't reference their background —
      // warn so they know to attach/upload a CV for a tailored interview.
      if (sess.cvGrounded === false) {
        toast(
          "Heads up — this interview isn't tied to your CV, so it won't reference your background. Attach or upload your CV/resume to this application for a tailored interview.",
          { icon: '⚠️', duration: 7000 }
        );
      }

      // Pick-a-role single interviewer: one chosen person runs the whole round in
      // their own voice. Show just them (a focused 1:1 call). No panel/segments.
      const isSingleInterviewer = sess.panelMode === 'single-interviewer' && sess.interviewer;
      // Remember which seat ran this session so grading records the loop round.
      sessionSeatRef.current = isSingleInterviewer
        ? (sess.interviewer.seatIndex ?? chosenSeatIndex)
        : null;
      const seats = isSingleInterviewer
        ? [sess.interviewer]
        : Array.isArray(sess.panel)
          ? sess.panel
          : [];
      setPanel(seats);
      livePanelRef.current = seats;

      // Multi-voice (paid): the interview runs as a sequence of realtime sessions,
      // one per panel seat (each its own voice). seg0 (HR) starts here; later seats
      // are PRE-CONNECTED in the background and crossfaded in (performHandoff) so
      // each baton-pass is seamless. Without this the candidate only meets HR.
      const isMultiVoice =
        sess.panelMode === 'multi-voice' &&
        Array.isArray(sess.segments) &&
        sess.segments.length >= 2;
      panelModeRef.current = isMultiVoice ? 'multi-voice' : sess.panelMode || 'solo';
      segmentsRef.current = isMultiVoice ? sess.segments : [];
      segmentIdxRef.current = 0;
      accumTranscriptRef.current = [];
      accumTelemetryRef.current = [];
      advancingRef.current = false;
      nextCtlRef.current = null;
      prewarmingRef.current = false;
      // Highlight the active interviewer: the chosen one (single) or HR (panel).
      setActiveSeat(seats.length >= 1 ? { name: seats[0].name, role: seats[0].role } : null);

      // mainSec = the speaking countdown; graceSec = the wrap-up that runs after it
      // (0 when the user turned wrap-up off → hard cut). Both bill against the balance.
      maxSessionSecRef.current = sess.mainSec || sess.maxSessionSec || 360;
      graceSecRef.current = sess.graceSec ?? 0;
      setSecondsLeft(maxSessionSecRef.current);

      const { ctl } = buildSegmentController({
        clientSecret: sess.clientSecret,
        model: sess.model,
        silent: false,
      });
      realtimeRef.current = ctl;
      startedAtRef.current = Date.now();
      segStartRef.current = Date.now();
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
  // The live "End" button: snapshot how long they've been interviewing, then open
  // the confirm modal. Past the review threshold it's "End & review" (grades);
  // before it, the modal is framed as an early exit (no score, minutes still spent).
  const requestEndReview = () => {
    const elapsed = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : 0;
    setEndElapsedSec(elapsed);
    setShowEndConfirm(true);
  };

  const endRealtime = async () => {
    clearTimeout(graceKickRef.current);
    // Multi-voice: stitch the final seat's transcript onto the earlier segments'.
    const liveTranscript = [
      ...accumTranscriptRef.current,
      ...(realtimeRef.current?.getTranscript?.() || []),
    ];
    // Same stitch for the delivery numbers. Captured BEFORE stop() tears the
    // session down, and held in a ref so a re-run of the assessment from the
    // review screen still has them.
    finalTelemetryRef.current = [
      ...accumTelemetryRef.current,
      ...(realtimeRef.current?.getTelemetry?.() || []),
    ];
    try {
      const blob = await recorderRef.current?.stop();
      recorderRef.current = null;
      if (blob) {
        const durationSec = Math.round((Date.now() - segStartRef.current) / 1000);
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
    // Tear down any pre-warmed next interviewer that never got activated.
    try {
      nextCtlRef.current?.ctl?.stop();
    } catch {
      /* noop */
    }
    nextCtlRef.current = null;
    prewarmingRef.current = false;
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
        interviewerSeatIndex: sessionSeatRef.current ?? undefined,
        // Numbers only — hesitation, answer length, pauses, word counts. Absent for
        // the turn-based (non-live) mode, and the server degrades to transcript-only
        // when it's missing rather than guessing at delivery.
        deliveryTelemetry: finalTelemetryRef.current?.length
          ? finalTelemetryRef.current
          : undefined,
      });
      // Reservation is now reconciled server-side; don't double-reconcile on a re-run.
      reservationRef.current = null;
      refreshEntitlement(); // reflect the minutes just spent
      setGradingTranscript(null);
      // Free taste: the server meters the minutes but returns no scorecard — show
      // the upsell instead of a report, and don't touch persisted prep state.
      if (res.analysisLocked) {
        setAnalysisLocked(true);
        setAssessment(null);
        setPhase('review');
        return;
      }
      // Too short to score: the server reconciled the minutes used but skipped the
      // (costly) AI review. Nothing to show — let them know their minutes counted
      // and head back, rather than parking on an empty review screen.
      if (res.tooShort) {
        toast.message(
          res.message ||
            'That interview was too short for a scored review — the minutes you used were counted.'
        );
        exitToDetail();
        return;
      }
      setAssessment(res.assessment);
      setApplication((prev) =>
        prev
          ? {
              ...prev,
              interviewPrep: {
                ...prev.interviewPrep,
                lastInterviewSession: res.lastInterviewSession,
                // Fold in the updated loop rounds so the chooser locks + scores
                // refresh live (e.g. passing HR immediately unlocks the next).
                ...(Array.isArray(res.rounds) ? { rounds: res.rounds } : {}),
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
    return <AriaLoader fullscreen size={40} label="Loading your interview…" />;
  }
  if (!application) return null;

  // Hard gate: the interview is locked until the readiness checklist is done.
  // The entry-point buttons are already disabled, but guard a direct URL hit too.
  const gate = computeInterviewGate(application);
  if (!gate.unlocked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-card text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
            Finish your interview readiness first
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Complete a few quick prep tasks and your interview unlocks — you'll walk in genuinely
            ready.
          </p>
          <div className="mt-4 text-left">
            <InterviewReadinessChecklist gate={gate} />
          </div>
          <button
            type="button"
            onClick={() => navigate(`/interview-prep/${applicationId}`)}
            className="mt-4 w-full btn-primary gap-1.5 px-4 py-2.5 rounded-lg text-sm"
          >
            Go to prep
          </button>
        </div>
      </div>
    );
  }

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

  // ── Live-interview pre-flight, as three steps ────────────────────────────
  // What this is → who's interviewing you → start. One source of truth per
  // pane; PreflightSteps owns both the desktop rail and the mobile deck, and
  // owns the Start/Back footer (hence showActions={false} on IntroView).
  const panelReady = panelLoading || setupPanel.length >= 2;
  const preflightPlannedSec = isPaidTier ? lengthSec || plannedSec : liveSecondsAvailable || 180;

  // (1) The pre-call brief. Phase 3 made the room neutral in content — it no
  // longer explains mid-answer what counts as evidence. That has to be said
  // HERE, before the freeze it prevents. Derived data only: no AI, no credits.
  const briefPane = (
    <RoomBrief
      careerStage={application?.careerStage}
      panel={isPaidTier ? setupPanel : []}
      interviewer={isPaidTier && chosenSeatIndex >= 0 ? setupPanel[chosenSeatIndex] : null}
      style={style}
      challenge={challenge}
      plannedSec={preflightPlannedSec}
      archetype={application?.archetype}
      mustHaves={(application?.interviewPrep?.skillsWithEvidence || [])
        .map((s) => s?.name)
        .filter(Boolean)}
    />
  );

  // (2) Who's interviewing you — paid → tailored panel you pick from; free →
  // generic teaser (locked). The challenge picker rides along underneath.
  const interviewerPane = (
    <div className="space-y-3">
      {panelReady && (
        <div>
          <InterviewerPanel
            panel={setupPanel}
            locked={!isPaidTier}
            loading={panelLoading}
            heading={isPaidTier ? 'Choose your interviewer' : 'Likely to interview you'}
            onSelect={isPaidTier ? setChosenSeatIndex : null}
            selectedIndex={isPaidTier ? chosenSeatIndex : -1}
            lockedIndices={isPaidTier ? lockedIndices : []}
            scores={isPaidTier ? seatScores : {}}
            // Free tier sees the panel blurred behind a lock, so render it
            // compactly — the per-seat detail is hidden anyway.
            compact={!isPaidTier}
          />
          <p className="mt-1.5 text-center text-xs text-slate-550 dark:text-slate-450 leading-relaxed">
            {isPaidTier
              ? setupPanel[chosenSeatIndex]?.description ||
                'Pick who runs this round — each interviews you in their own voice, on what they care about.'
              : 'On a paid plan, you pick who interviews you from this panel.'}
          </p>
        </div>
      )}

      {panelReady && <hr className="border-slate-100 dark:border-slate-800/80" />}

      <VoiceStyleSelector
        voice={voice}
        style={style}
        onVoiceChange={chooseVoice}
        onStyleChange={chooseStyle}
        // Paid users pick a specific interviewer whose role sets the voice AND
        // the interview type — so hide voice + style for them and leave only
        // the difficulty picker.
        showVoice={!isPaidTier}
        showStyle={!isPaidTier}
        borderless={true}
        challenge={challenge}
        onChallengeChange={chooseChallenge}
      />
    </div>
  );

  // (3) Start. The footer carries the primary action, so this pane keeps only
  // its lede, stats and quiet links.
  const startPane = (
    <div className="flex flex-col">
      <IntroView
        firstName={firstName}
        title={title}
        count={simQuestions.length}
        plannedSec={preflightPlannedSec}
        lastSession={lastSession}
        trend={getInterviewTrend(application)}
        mode={mode}
        voice={voice}
        style={style}
        onVoiceChange={chooseVoice}
        onStyleChange={chooseStyle}
        onStart={handleStartClick}
        onCancel={() => setPhase('choose')}
        showSelectors={false}
        showActions={false}
        bare
        entitlement={entitlement}
        isPaidTier={isPaidTier}
        lengthSec={lengthSec}
        setLengthSec={setLengthSec}
        lengthMinSec={lengthMinSec}
        lengthMaxSec={lengthMaxSec}
        liveSecondsAvailable={liveSecondsAvailable}
        wrapUp={wrapUp}
        setWrapUp={setWrapUp}
      />

      {/* Paid users land here directly (chooser skipped) — keep the guided
          reader reachable with a quiet link, right under Start. */}
      {isPaidTier && (
        <button
          type="button"
          onClick={() => setMode('scripted')}
          className="mt-3 self-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none"
        >
          Prefer the guided reader instead?
        </button>
      )}
    </div>
  );

  const preflightSteps = [
    { key: 'brief', label: 'What this is', hint: 'Step 1 of 3', node: briefPane },
    { key: 'interviewer', label: 'Your interviewer', hint: 'Step 2 of 3', node: interviewerPane },
    { key: 'start', label: 'Start', hint: 'Ready when you are', node: startPane },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col ${
        immersive
          ? 'bg-[#f6f6f3] text-slate-900 dark:bg-slate-950 dark:text-slate-100'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
      }`}
    >
      <header
        className={`backdrop-blur sticky top-0 z-10 border-b ${
          immersive
            ? 'border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-950/50'
            : 'border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
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
                    ? 'text-amber-600 dark:text-amber-300'
                    : secondsLeft <= 30
                      ? 'text-rose-500 dark:text-rose-400'
                      : 'text-slate-700 dark:text-slate-200'
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
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-md text-xs font-semibold transition-colors ${
                immersive
                  ? 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <X className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 py-2 sm:py-3.5">
        <div className="w-full max-w-3xl transition-all duration-300">
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
              {/* Live-interview length + wrap-up controls (the realtime voice mode only). */}
              {mode === 'conversational' ? (
                <PreflightSteps
                  steps={preflightSteps}
                  // Someone who has interviewed here before lands on Start;
                  // steps 1 and 2 are one click away on the rail or a dot.
                  initialStep={lastSession ? 2 : 0}
                  onFinish={handleStartClick}
                  onCancel={() => setPhase('choose')}
                  finishLabel="Start interview"
                />
              ) : (
                <>
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
                    showSelectors={false}
                  />
                  {/* Paid users can jump back to the live panel from the guided reader. */}
                  {isPaidTier && (
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setMode('conversational')}
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none"
                      >
                        Use the live panel instead
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {phase === 'connecting' && (
            <ConnectingView
              firstName={firstName}
              title={title}
              mode={mode}
              dark={isDark}
              connected={connected}
              panel={panel}
              activeSeat={activeSeat}
              activeSeatIndex={segmentIdxRef.current}
              isHandoff={panelModeRef.current === 'multi-voice' && segmentIdxRef.current > 0}
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
              onEnd={requestEndReview}
              activeSeat={panel.length >= 1 ? activeSeat : null}
              panel={panel}
              candidateName={firstName && firstName !== 'there' ? firstName : 'You'}
              handingOff={handingOff}
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
              isPaid={isPaidTier}
              onUpgrade={() => navigate('/upgrade')}
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
              analysisLocked={analysisLocked}
              onUpgrade={() => navigate('/upgrade')}
              onBuyPracticePass={buyPracticePass}
              buyingPass={buyingPass}
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
        {showEndConfirm && (
          <EndReviewConfirmModal
            elapsedSec={endElapsedSec}
            minReviewSec={entitlement?.minReviewSec || 480}
            onConfirm={() => {
              setShowEndConfirm(false);
              endRealtime();
            }}
            onCancel={() => setShowEndConfirm(false)}
          />
        )}
      </AnimatePresence>

      <InterviewPaywallModal
        open={showInterviewPaywall}
        onClose={() => setShowInterviewPaywall(false)}
      />
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
      className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative z-10 text-slate-900 dark:text-slate-100"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200/60 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
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

      <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={onStay}
          className="flex-1 order-1 sm:order-2 btn-primary px-4 py-2.5 rounded-xl text-sm select-none cursor-pointer text-center"
        >
          Stay in the interview
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="flex-1 order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-750 text-slate-655 dark:text-slate-305 text-sm font-semibold transition-colors select-none cursor-pointer text-center hover:border-rose-350 dark:hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15"
        >
          Leave anyway
        </button>
      </div>
    </motion.div>
  </div>
);

// ── End & review confirmation (live interview only — minutes are metered) ──
// Two faces, decided by how long they've interviewed:
//   • Past the review threshold (default 8 min) → "End & review": grades the session.
//   • Before it → an early-EXIT warning: a scored review needs the full threshold,
//     so leaving now gives no score, and the minutes already used are still spent.
// Either way the backend reconciles minutes (refunds only the UNUSED remainder),
// and the server independently refuses to grade a sub-threshold session — this
// modal just sets expectations so users don't keep ending early to re-trigger it.
const EndReviewConfirmModal = ({ elapsedSec = 0, minReviewSec = 480, onConfirm, onCancel }) => {
  const canReview = elapsedSec >= minReviewSec;
  const minReviewMin = Math.round(minReviewSec / 60);
  const spentLabel = elapsedSec < 60 ? 'less than a minute' : `${Math.floor(elapsedSec / 60)} min`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative z-10 text-slate-900 dark:text-slate-100"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/30 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {canReview ? 'End the interview now?' : 'Exit the interview?'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {canReview ? (
                <>
                  The interview minutes you’ve used will be counted toward your balance — they won’t
                  be returned. For the most useful feedback, it’s best to complete the full
                  interview before ending.
                </>
              ) : (
                <>
                  You’re only <span className="font-semibold">{spentLabel}</span> in. A scored
                  review needs at least{' '}
                  <span className="font-semibold">{minReviewMin} minutes</span> of interview, so
                  exiting now means <span className="font-semibold">no score</span> — and the{' '}
                  {spentLabel} you’ve used will still be deducted from your minutes. Keep going to
                  unlock your review.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 order-1 sm:order-2 btn-primary px-4 py-2.5 rounded-xl text-sm select-none cursor-pointer text-center"
          >
            Keep going
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-750 text-slate-655 dark:text-slate-305 text-sm font-semibold transition-colors select-none cursor-pointer text-center hover:border-rose-350 dark:hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15"
          >
            {canReview ? 'End & review' : 'Exit anyway'}
          </button>
        </div>
      </motion.div>
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
      className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden z-10 text-slate-900 dark:text-slate-100"
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
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-250 dark:border-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0 pr-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
            Ready for this interview?
          </h2>
          <p className="text-xs text-slate-550 dark:text-slate-450 mt-0.5 font-normal">
            Some essentials are still missing
          </p>
        </div>
      </div>

      <div className="mt-5 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="font-semibold text-slate-650 dark:text-slate-350">
            Your readiness score
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{readiness}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-750 rounded-full overflow-hidden">
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

      <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3.5 mt-5 leading-relaxed">
        <span className="font-semibold text-slate-900 dark:text-white">Tip:</span> Preparing these
        essentials enables the AI interviewer to ask targeted questions grounded in your actual
        history.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={onPrepare}
          className="flex-1 order-1 sm:order-2 btn-primary px-4 py-2.5 rounded-xl text-sm select-none cursor-pointer text-center"
        >
          Prepare these first
        </button>
        <button
          type="button"
          onClick={onStartAnyway}
          className="flex-1 order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-305 text-sm font-semibold transition-colors select-none cursor-pointer text-center"
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

const ConnectingView = ({
  firstName,
  title,
  mode,
  dark,
  connected,
  panel = [],
  activeSeat = null,
  activeSeatIndex = 0,
  isHandoff = false,
}) => {
  const hasPanel = Array.isArray(panel) && panel.length >= 2;
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
              <span
                key={i}
                className={`absolute inset-0 rounded-full border ${
                  dark ? 'border-white/30' : 'border-slate-900/30'
                } animate-sonar`}
                style={{
                  animationDelay: `${i * 0.8}s`,
                }}
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
                ? 'border border-white/20 ring-2 ring-white/20'
                : 'border border-slate-200 ring-2 ring-slate-900/10'
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
        {connected
          ? 'Connected — here we go.'
          : isHandoff && activeSeat
            ? `Bringing in ${activeSeat.name}…`
            : hasPanel
              ? 'Connecting you with your panel…'
              : 'Connecting you with your interviewer…'}
      </h2>
      {!connected && isHandoff && activeSeat && (
        <p className={`mt-1 text-sm font-semibold ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
          {activeSeat.role}
        </p>
      )}
      <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        {connected
          ? 'Putting you through…'
          : `${firstName && firstName !== 'there' ? `One moment, ${firstName}.` : 'One moment.'}${
              title ? ` ${title}` : ''
            }`}
      </p>
      {!connected && mode === 'conversational' && !hasPanel && (
        <p className={`mt-2 text-xs max-w-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          Setting up a live conversation — this works best on a strong, stable connection.
        </p>
      )}

      {/* Paid tiers: the panel about to interview them. During a multi-voice
          handoff, highlight whoever is taking over. */}
      {hasPanel && (
        <div className="mt-7 w-full max-w-md px-2">
          <InterviewerPanel
            panel={panel}
            dark={dark}
            activeIndex={isHandoff ? activeSeatIndex : -1}
          />
        </div>
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
                  ? `w-6 ${dark ? 'bg-white' : 'bg-slate-900'}`
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
      <div className="relative w-20 h-20 rounded-3xl bg-white border border-slate-200 dark:border-white/20 ring-2 ring-slate-900/10 dark:ring-white/20 flex items-center justify-center p-3 shadow-xl">
        <img
          src="/applyright-icon.png"
          alt="ApplyRight AI"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
    <h2 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
      Scoring your interview…
    </h2>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
      Assessing your answers against your CV and the role — the things interviewers look for.
    </p>
    <div className="mt-5 flex items-center gap-1.5" aria-hidden>
      <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white animate-bounce" />
      <span
        className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white animate-bounce"
        style={{ animationDelay: '0.15s' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white animate-bounce"
        style={{ animationDelay: '0.3s' }}
      />
    </div>
  </div>
);

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
  showSelectors = true,
  // Inside the pre-flight stepper the footer owns Start/Back, so this view must
  // not render its own pair — two Start buttons on one screen.
  showActions = true,
  // `bare` drops the card chrome for hosts that already supply a surface (the
  // stepper pane). Standalone call sites keep the card.
  bare = false,
  className = '',
  entitlement,
  isPaidTier,
  lengthSec,
  setLengthSec,
  lengthMinSec,
  lengthMaxSec,
  liveSecondsAvailable,
  wrapUp,
  setWrapUp,
}) => {
  const [activeSubView, setActiveSubView] = useState('main'); // 'main' | 'mic' | 'breathe' | 'length'

  return (
    <div
      className={`relative overflow-hidden flex flex-col ${
        bare
          ? ''
          : 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-card'
      } ${className}`}
    >
      <AnimatePresence mode="wait">
        {activeSubView === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-grow flex flex-col justify-between h-full"
          >
            <div className="flex-grow flex flex-col justify-center">
              <div className="relative z-10 text-center mb-2.5">
                <h1 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
                  <Briefcase className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span>
                    {title.toLowerCase().endsWith('interview') ? title : `${title} Interview`}
                  </span>
                </h1>
              </div>

              {count === 0 ? (
                <>
                  <p className="relative z-10 text-sm text-slate-500 dark:text-slate-400 mt-6 text-center leading-relaxed">
                    No interview questions yet. Generate interview prep first to activate the
                    simulation.
                  </p>
                  <div className="relative z-10 mt-6 text-center">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="btn-primary px-5 py-2.5 rounded-xl text-sm cursor-pointer select-none"
                    >
                      Back to prep
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {mode === 'conversational' ? (
                    <p className="relative z-10 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed text-center">
                      Hi{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {firstName}
                      </span>{' '}
                      — take a breath. Your ApplyRight AI interviewer will{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        actually talk with you
                      </strong>
                      : it reacts to your answers and asks natural follow-ups. Reply by voice or
                      text — just have the conversation.
                    </p>
                  ) : (
                    <p className="relative z-10 text-xs sm:text-sm text-slate-600 dark:text-slate-305 mt-2 leading-relaxed text-center">
                      Hi{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {firstName}
                      </span>{' '}
                      — take a breath. Your ApplyRight AI interviewer will ask each question aloud.
                      Answer out loud as if you’re in the room, then{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        reveal a model answer
                      </strong>{' '}
                      and rate how it felt.
                    </p>
                  )}
                  {mode === 'conversational' && (
                    <div className="relative z-10 mt-2 border-l-2 border-amber-400 pl-3 flex items-start gap-2">
                      <Mic className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Find a quiet spot first.
                        </span>{' '}
                        The interviewer is always listening. Earphones help a lot.
                      </p>
                    </div>
                  )}
                  {mode === 'conversational' && showSelectors && (
                    <VoiceStyleSelector
                      voice={voice}
                      style={style}
                      onVoiceChange={onVoiceChange}
                      onStyleChange={onStyleChange}
                    />
                  )}
                  {trend && trend.count >= 1 && (
                    <div className="relative z-10 mt-2 border-l-2 border-emerald-500 pl-3 flex items-start gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          You’ve done {trend.count} {trend.count === 1 ? 'interview' : 'interviews'}
                          .
                        </span>{' '}
                        {trend.trend === 'up' && trend.firstConfidence && trend.lastConfidence
                          ? `Your nerves are easing — ${CONF_WORD[trend.firstConfidence]} → ${CONF_WORD[trend.lastConfidence]}. `
                          : ''}
                        Each rep builds confidence.
                      </p>
                    </div>
                  )}
                  <div className="relative z-10 mt-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-2 gap-2 divide-x divide-slate-100 dark:divide-slate-800">
                    <div className="flex flex-col items-center justify-center text-center px-1">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 leading-none">
                        Questions
                      </p>
                      <p className="font-heading text-base font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                        {count}
                      </p>
                    </div>

                    <div
                      onClick={
                        mode === 'conversational' ? () => setActiveSubView('length') : undefined
                      }
                      className={`flex flex-col items-center justify-center text-center px-1 ${
                        mode === 'conversational'
                          ? 'cursor-pointer hover:bg-slate-55/60 dark:hover:bg-slate-800/40 rounded-xl p-1 -m-1 transition-colors'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 leading-none">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                          Duration
                        </p>
                        {mode === 'conversational' && (
                          <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold underline decoration-dotted">
                            Edit
                          </span>
                        )}
                      </div>
                      <p className="font-heading text-base font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                        ~{Math.round(plannedSec / 60)} min
                      </p>
                    </div>
                  </div>
                  {lastSession && (
                    <div className="relative z-10 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2 text-xs text-slate-550 dark:text-slate-450 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-705 dark:text-slate-295">
                          Last session:
                        </span>{' '}
                        {typeof lastSession.score === 'number'
                          ? `${lastSession.score}% overall · `
                          : ''}
                        {lastSession.flagged?.length
                          ? `${lastSession.flagged.length} flagged questions to practice`
                          : 'no questions flagged'}
                        .
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {count > 0 && (
              <div className="mt-3 shrink-0">
                {/* The quiet links stay wherever this view is used; only the
                    Start/Back pair below is dropped when a host owns them. */}
                <div className="relative z-10 flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-550 mb-2.5 flex-wrap">
                  {mode === 'conversational' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveSubView('length')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
                      >
                        <Clock className="w-3.5 h-3.5" /> Adjust duration
                      </button>
                      <span className="text-slate-200 dark:text-slate-750">|</span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSubView('mic')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
                  >
                    <Mic className="w-3.5 h-3.5" /> Test your mic &amp; sound first
                  </button>
                  <span className="text-slate-200 dark:text-slate-750">|</span>
                  <button
                    type="button"
                    onClick={() => setActiveSubView('breathe')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
                  >
                    <Wind className="w-3.5 h-3.5" /> Take a breath first
                  </button>
                </div>
                {showActions && (
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={onStart}
                      className="btn-primary px-6 py-2.5 rounded-xl text-sm select-none cursor-pointer"
                    >
                      Start interview
                    </button>
                    <button
                      type="button"
                      onClick={onCancel}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors cursor-pointer select-none"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeSubView === 'mic' && (
          <motion.div
            key="mic"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col justify-between h-full"
          >
            <DeviceCheck inline={true} onDone={() => setActiveSubView('main')} />
          </motion.div>
        )}

        {activeSubView === 'breathe' && (
          <motion.div
            key="breathe"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col justify-between h-full"
          >
            <div className="w-full flex flex-col justify-between h-full">
              <div>
                <p className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-4 text-center">
                  Take a breath
                </p>
                <div className="flex items-center justify-center py-4">
                  <BreathingExercise compact />
                </div>
              </div>
              <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveSubView('main')}
                  className="btn-primary px-4 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubView === 'length' && (
          <motion.div
            key="length"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-grow flex flex-col justify-between h-full"
          >
            <div className="w-full flex-grow flex flex-col justify-center">
              <p className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-5 text-center">
                Set interview length
              </p>

              <div className="max-w-sm mx-auto w-full bg-slate-55/40 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
                {isPaidTier && lengthMaxSec >= lengthMinSec ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="inline-interview-length"
                          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                        >
                          Duration
                        </label>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {Math.round((lengthSec || lengthMinSec) / 60)} min
                          {Math.round((lengthSec || lengthMinSec) / 60) === 10 && (
                            <span className="ml-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                              recommended
                            </span>
                          )}
                        </span>
                      </div>
                      <input
                        id="inline-interview-length"
                        type="range"
                        min={lengthMinSec}
                        max={lengthMaxSec}
                        step={300}
                        value={lengthSec || lengthMinSec}
                        onChange={(e) => setLengthSec(Number(e.target.value))}
                        // Inside the mobile step deck any horizontal drag over
                        // 8px is captured as a swipe — which would make this
                        // slider impossible to move. Keep the gesture local.
                        onPointerDown={(e) => e.stopPropagation()}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                      <p className="mt-1.5 text-xs text-slate-550 dark:text-slate-450">
                        {`Min ${Math.round(lengthMinSec / 60)} · Max ${Math.round(
                          lengthMaxSec / 60
                        )} min · Balance ${Math.floor((liveSecondsAvailable || 0) / 60)} min`}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        💡 10 minutes is recommended for a complete interview.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {entitlement?.tier === 'free'
                      ? `Your free interview runs up to ${Math.ceil((liveSecondsAvailable || 0) / 60)} min.`
                      : 'Add minutes to run a longer interview.'}
                  </p>
                )}

                <hr className="border-slate-200/60 dark:border-slate-800" />

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={wrapUp}
                    onChange={(e) => setWrapUp(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-slate-900 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    Allow a short wrap-up (~90s)
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 leading-normal">
                      {wrapUp
                        ? 'Counts toward your minutes so the interviewer can finish your answer and close out.'
                        : 'The interview stops exactly at time — no wrap-up.'}
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setActiveSubView('main')}
                className="btn-primary px-4.5 py-2 rounded-xl text-xs cursor-pointer"
              >
                Back to setup
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Adaptive follow-up — the premium "real interview" upgrade. The user types or
// dictates their answer and the AI interviewer asks one dynamic follow-up.
const FollowUpPanel = ({ onFollowUp, followUp, loading, isPaid, onUpgrade }) => {
  const [answer, setAnswer] = useState('');
  const [listening, setListening] = useState(false);
  const stopRef = useRef(null);
  const sttSupported = isSpeechRecognitionSupported();

  useEffect(() => () => stopRef.current?.(), []);

  // Adaptive follow-ups are a paid (Pro/Premium) coaching feature. Free users see
  // an upgrade prompt instead of the answer box.
  if (!isPaid) {
    return (
      <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">
          Adaptive follow-up · Pro
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
          Let the AI interviewer react to your answer and ask a real follow-up — just like the live
          interview. Unlimited on a Pro or Premium plan.
        </p>
        <button
          type="button"
          onClick={() => onUpgrade?.()}
          className="btn-primary gap-1.5 px-3 py-2 rounded-lg text-xs"
        >
          <Sparkles className="w-3.5 h-3.5" /> Upgrade to unlock
        </button>
      </div>
    );
  }

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
    <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">
        Adaptive follow-up · Pro
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
        className="w-full text-[16px] sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <div className="mt-2 flex items-center gap-2">
        {sttSupported && (
          <button
            type="button"
            onClick={toggleMic}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
              listening
                ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> {listening ? 'Stop' : 'Dictate'}
          </button>
        )}
        <button
          type="button"
          disabled={loading || !answer.trim()}
          onClick={() => onFollowUp(answer.trim())}
          className="btn-primary gap-1.5 px-3 py-2 rounded-lg text-xs disabled:opacity-50"
        >
          {loading ? (
            <AriaLoader inline tone="mono" size={14} label="Thinking…" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Ask me a follow-up
        </button>
      </div>
      {followUp && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">
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
  isPaid,
  onUpgrade,
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
                ? 'w-6 bg-slate-900 dark:bg-white'
                : i === index
                  ? 'flex-1 bg-slate-900 dark:bg-white'
                  : 'w-6 bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Interviewer "video tile" — the AI is present and talking to you */}
      <div className="shrink-0 relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 shadow-card">
        <div className="relative z-10 flex items-center gap-4">
          {/* Interviewer avatar */}
          <div className="relative shrink-0">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white flex items-center justify-center p-2.5 border transition-all duration-300 ${
                speaking
                  ? 'border-slate-900 dark:border-white ring-2 ring-slate-900 dark:ring-white scale-[1.03]'
                  : 'border-slate-200 dark:border-slate-700 ring-1 ring-slate-100 dark:ring-slate-800'
              }`}
            >
              <img
                src="/applyright-icon.png"
                alt="ApplyRight AI interviewer"
                className="w-full h-full object-contain"
              />
            </div>
            {speaking && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-3.5 bg-white dark:bg-slate-900 rounded-full px-1.5 py-0.5 shadow-sm border border-slate-200 dark:border-slate-800">
                <span className="w-0.5 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-pulse" />
                <span
                  className="w-0.5 h-3 bg-slate-400 dark:bg-slate-500 rounded-full animate-pulse"
                  style={{ animationDelay: '0.15s' }}
                />
                <span
                  className="w-0.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-pulse"
                  style={{ animationDelay: '0.3s' }}
                />
                <span
                  className="w-0.5 h-2.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-pulse"
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
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900 dark:text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-pulse" />{' '}
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
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer select-none"
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
                className="flex flex-col items-center justify-center p-6 sm:p-8 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl bg-white/60 dark:bg-slate-900/60 text-center"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-md leading-relaxed">
                  Answer out loud, as if you’re really in the room. When you’re done, reveal a model
                  outline and rate how it felt.
                </p>
                <button
                  type="button"
                  onClick={onReveal}
                  className="btn-primary gap-2 px-6 py-3.5 rounded-xl text-sm select-none cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
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
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
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
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card">
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
            <FollowUpPanel
              onFollowUp={onFollowUp}
              followUp={followUp}
              loading={loadingFollowUp}
              isPaid={isPaid}
              onUpgrade={onUpgrade}
            />
          )}
        </div>
      </div>

      {/* Controls (pinned to the bottom of the viewport-height column) */}
      <div className="shrink-0 mt-4 pt-4 pb-[env(safe-area-inset-bottom)] border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer select-none"
        >
          <SkipForward className="w-3.5 h-3.5" /> Skip question
        </button>

        <div className="flex items-center gap-3">
          {!currentRating && revealed && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-ping" />
              Pick a rating
            </span>
          )}
          <button
            type="button"
            onClick={onNext}
            className="btn-primary gap-1.5 px-5 py-2.5 rounded-xl text-xs cursor-pointer select-none"
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
  analysisLocked,
  onUpgrade,
  onBuyPracticePass,
  buyingPass,
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
    return 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 sm:p-8 shadow-card">
      <div className="relative z-10">
        <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
            {overall != null ? (
              <span className={`font-heading text-xl font-bold tabular-nums ${scoreTone(overall)}`}>
                {overall}%
              </span>
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
          <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-55/40 dark:bg-slate-950/40 p-4.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                Your interview recording
              </p>
              <span className="text-[9px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                Saved locally
              </span>
            </div>
            <AudioPlayer src={recordingUrl} durationHint={recordingDuration} />
            <p className="mt-3.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
              Saved on this device — find it again under “Past interviews” on your prep page.
            </p>
          </div>
        )}

        {/* AI assessment (conversational) — replaces self-rating */}
        {analysisLocked ? (
          <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Lock className="w-6 h-6 text-slate-900 dark:text-white" />
            </div>
            <h2 className="mt-4 text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Nice — you finished your free practice run!
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              That was a free taste — practice only. Grab a Practice Pass to run a full mock
              interview <span className="font-semibold">with a scored review</span>: your readiness
              score, per-answer feedback, and exactly what to fix.
            </p>
            <div className="mt-5 flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={onBuyPracticePass}
                disabled={buyingPass}
                className="btn-primary gap-2 px-5 py-2.5 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed text-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {buyingPass ? 'Starting checkout…' : 'Interview & Score Review — ₦1,000'}
              </button>
              <button
                type="button"
                onClick={onUpgrade}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Or see all plans <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-450 dark:text-slate-500">
              One scored practice run. No subscription.
            </p>
          </div>
        ) : assessment ? (
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
              className="mt-3 btn-primary gap-1.5 px-4 py-2 rounded-xl text-sm cursor-pointer"
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
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900 dark:border-white shadow-md'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                className="btn-primary gap-1.5 px-4.5 py-2.5 rounded-xl text-sm select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <AriaLoader inline tone="mono" size={16} label="Saving…" /> : null}
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
                    className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <button
                        type="button"
                        onClick={() => toggleFlag(r._origIndex)}
                        className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Flag to work on"
                      >
                        {on ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-slate-900 dark:text-white" />
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
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                            {r.isWeakness ? 'Coaching strategy' : 'Model answer outline'}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 whitespace-pre-line leading-relaxed">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-semibold transition-all cursor-pointer"
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
            className="btn-primary gap-1.5 px-4.5 py-2.5 rounded-xl text-sm select-none cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" /> Practice weak spots
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-all cursor-pointer select-none"
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
  badge,
}) => {
  // Free during testing: everyone can start either mode. The pill tells the
  // user which tier this mode will need once Interview Mode becomes paid.
  const owned = TIER_RANK[userTier] >= TIER_RANK[tierKey];
  return (
    <div
      className={`relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card flex flex-col ${
        accent.recommended ? 'border-t-2 border-t-slate-900 dark:border-t-white' : ''
      }`}
    >
      <div className="relative z-10 flex items-center gap-3">
        <div className="text-slate-400 dark:text-slate-500 shrink-0">{icon}</div>
        <div className="min-w-0">
          <h3 className="font-heading text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {name}
          </h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {owned ? null : <Lock className="w-2.5 h-2.5" />} {tierLabel}
            </span>
            {badge && (
              <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.14em] text-slate-900 dark:text-white select-none">
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="relative z-10 text-sm text-slate-600 dark:text-slate-300 mt-3.5 leading-relaxed">
        {blurb}
      </p>

      <ul className="relative z-10 mt-3 space-y-1.5">
        {(bullets || []).map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>

      <div className="relative z-10 mt-4 flex items-start gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {networkIcon}
        <p>{network}</p>
      </div>

      <div className="relative z-10 mt-auto pt-4">
        <button
          type="button"
          onClick={onPick}
          className={`w-full px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer select-none ${accent.btn}`}
        >
          {name.startsWith('Conversational') ? 'Start conversational' : 'Start guided'}
        </button>
      </div>
    </div>
  );
};

const ModeChooserView = ({ title, userTier, onPick, onCancel }) => (
  <div className="relative">
    <div className="text-center mb-5">
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
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
        tierLabel="Paid"
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
        badge="Recommended"
        accent={{
          recommended: true,
          btn: 'btn-primary',
        }}
        onPick={() => onPick('conversational')}
      />

      <ModeCard
        icon={<BookOpen className="w-5 h-5" />}
        name="Guided question reader"
        tierLabel="Free"
        tierKey="free"
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
          recommended: false,
          btn: 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
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
    <div className="shrink-0 relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md p-4 sm:p-5 shadow-card">
      <div className="relative z-10 flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white flex items-center justify-center p-2.5 border transition-all duration-300 ${
              speaking
                ? 'border-slate-900 dark:border-white ring-2 ring-slate-900 dark:ring-white scale-[1.03]'
                : 'border-slate-200 dark:border-white/20 ring-1 ring-slate-200 dark:ring-white/10'
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
          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            ApplyRight AI
          </p>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
            Your interviewer
          </p>
          <div className="mt-1.5">
            {speaking ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900 dark:text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white animate-pulse" />{' '}
                Speaking…
              </span>
            ) : loading ? (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 animate-pulse">
                Thinking…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
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
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer select-none"
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
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={4}
        placeholder={placeholder || 'Answer naturally — speak or type…'}
        className="w-full text-[16px] sm:text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
      />
      <div className="mt-2 flex items-center gap-2">
        {sttSupported && (
          <button
            type="button"
            onClick={toggleMic}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
              listening
                ? 'border-rose-300 dark:border-rose-400/40 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300'
                : 'border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> {listening ? 'Stop' : 'Dictate'}
          </button>
        )}
        <button
          type="button"
          disabled={loading || !answer.trim()}
          onClick={send}
          className="ml-auto btn-primary gap-1.5 px-4 py-2 rounded-lg text-xs disabled:opacity-50"
        >
          {loading ? (
            <AriaLoader inline tone="mono" size={14} label="Thinking…" />
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
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
        Conversation in progress
      </p>
      <button
        type="button"
        onClick={onEnd}
        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        End &amp; review
      </button>
    </div>

    <InterviewerTile voiceState={voiceState} onReplay={onReplay} />

    {/* Your turn — listen to the interviewer, then answer (no question shown) */}
    <div className="flex-1 min-h-0 flex flex-col mt-4">
      <p className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-2 px-1">
        Your turn
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <AnswerComposer onSubmit={onSubmit} loading={turnLoading} />
        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Listen to the interviewer, then answer like you would in a real interview — they respond
          to what you say.
        </p>
      </div>
    </div>
  </motion.div>
);

// Generic interviewer shown on the Meet-style stage for free/solo live sessions
// (no AI-generated panel). Gives free users the same polished call surface.
const SOLO_SEAT = { name: 'ApplyRight AI', role: 'Your interviewer' };

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
  activeSeat = null,
  panel = [],
  candidateName = '',
  handingOff = false,
}) => {
  // Everyone gets the Google-Meet-style stage — the polished call surface costs
  // nothing. Paid interviews show the real roster (named, JD-tailored seats +
  // multi-voice); free/solo (no roster) shows the SAME stage with one generic
  // ApplyRight AI interviewer, so the free live-interview UX feels identical.
  const hasRoster = Array.isArray(panel) && panel.length >= 1;
  const stageSeats = hasRoster ? panel : [SOLO_SEAT];
  // Light up the generic seat's tile while it's speaking; a real roster has the
  // orchestrator drive activeSeat. Header (above) keeps using the raw activeSeat
  // so it only shows a name for a real named interviewer.
  const stageActiveSeat = hasRoster ? activeSeat : SOLO_SEAT;
  const speaking = voiceState === 'speaking';
  const connecting = voiceState === 'loading';
  // Single source of truth for the live status line — shown large on desktop and
  // compact inside the mobile control dock so the two never drift.
  const statusPrimary = handingOff
    ? `Bringing in ${activeSeat?.name || 'the next interviewer'}…`
    : inGrace
      ? 'We’re at time — any questions for me?'
      : connecting
        ? 'Connecting…'
        : speaking
          ? `${activeSeat?.name || 'Interviewer'} is speaking`
          : 'Go ahead — I’m listening';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-[calc(100dvh-5.5rem)]"
    >
      <div className="shrink-0 flex items-center justify-between mb-3 px-1">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
            Live voice interview
          </p>
          {activeSeat && activeSeat.name && (
            <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
              {activeSeat.name}
              {activeSeat.role ? ` · ${activeSeat.role}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleCaptions}
            title="Toggle captions"
            aria-pressed={captionsOn}
            className={`inline-flex items-center gap-1 py-2 px-2 -my-1 rounded-lg text-[11px] font-bold transition-colors ${
              captionsOn
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Captions className="w-3.5 h-3.5" /> CC
          </button>
          <span
            className={`text-[11px] font-bold tabular-nums ${
              inGrace
                ? 'text-amber-600 dark:text-amber-300'
                : secondsLeft <= 30
                  ? 'text-rose-500 dark:text-rose-400'
                  : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {inGrace ? `Wrapping up · ${fmt(secondsLeft)}` : `${fmt(secondsLeft)} left`}
          </span>
        </div>
      </div>

      {/* Meet-style stage for everyone. Paid → real named panel; free/solo → the
          same stage with a single generic ApplyRight AI interviewer. */}
      <MeetingStage
        panel={stageSeats}
        activeSeat={stageActiveSeat}
        candidateName={candidateName}
        muted={muted}
        speaking={speaking}
        micStream={micStream}
        handingOff={handingOff}
      />

      {/* Big live status — desktop only; on mobile it's consolidated into the
          control dock below so the bottom of the screen reads as one unit. */}
      <div className="hidden sm:block shrink-0 mt-5 text-center">
        <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
          {statusPrimary}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {handingOff
            ? 'Handing you over to the next person on the panel — one moment.'
            : inGrace
              ? 'Just wrapping up — ask anything you’d like, then we’ll close.'
              : 'Just talk — the interviewer hears you and replies in real time.'}
        </p>
      </div>

      {/* Optional captions of what the interviewer just said (accessibility) */}
      {captionsOn && (
        <div className="shrink-0 mt-4 mx-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 min-h-[3rem]">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">
            Interviewer (captions)
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            {caption || '…'}
          </p>
        </div>
      )}

      {/* Control dock — on mobile the status line + Mute + End read as one unit
          pinned above the safe area; desktop keeps its original two-button row. */}
      <div className="shrink-0 mt-4 pt-4 pb-[env(safe-area-inset-bottom)] border-t border-slate-200 dark:border-white/10">
        {/* Compact status line (mobile only — the big block above is sm:+). */}
        <p className="sm:hidden text-center text-base font-bold text-slate-900 dark:text-white mb-3">
          {statusPrimary}
        </p>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onToggleMute}
            className={`inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 rounded-xl border text-sm sm:text-xs font-bold transition-all cursor-pointer select-none ${
              muted
                ? 'border-rose-300 dark:border-rose-400/40 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300'
                : 'border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
            }`}
          >
            {muted ? (
              <MicOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            ) : (
              <Mic className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            )}
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            type="button"
            onClick={onEnd}
            className="btn-primary flex-1 sm:flex-none gap-1.5 px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 rounded-xl text-sm sm:text-xs cursor-pointer select-none"
          >
            End &amp; review
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MockInterviewPage;
