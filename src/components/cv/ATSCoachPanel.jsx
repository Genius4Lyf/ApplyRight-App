import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Briefcase,
  AlertTriangle,
  Check,
  Lock,
  Loader2,
  Plus,
  RefreshCw,
  ChevronRight,
  Compass,
  Lightbulb,
  ArrowLeft,
  ScanLine,
  Bot,
  Sparkles,
} from 'lucide-react';
import CVService from '../../services/cv.service';
import {
  computeCvHealth,
  healthColor,
  computeRoleMatch,
  roleMatchColor,
} from '../../utils/cvHealth';
import { getStepCoaching, getQuickReplies } from '../../utils/cvCoach';
import { useCVBuilder } from '../../context/CVContext';

// Small fade/rise wrapper for staggering result cards in.
const Reveal = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay }}
  >
    {children}
  </motion.div>
);

// ─── CV Health score ring (free, live) — also reused for the Job Match headline ───
const ScoreRing = ({ score }) => {
  const { ring, text } = healthColor(score);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-[88px] h-[88px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          stroke={ring}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-extrabold ${text}`}>{score}</span>
        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">/ 100</span>
      </div>
    </div>
  );
};

// ─── CV Health section card (grouped by section, with its requirements) ───
const SectionStatusIcon = ({ status }) => {
  if (status === 'complete')
    return (
      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
        <Check className="w-2.5 h-2.5" />
      </span>
    );
  if (status === 'partial')
    return (
      <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      </span>
    );
  return (
    <span className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
  );
};

// ─── Paid scan layers ───
const matchBadge = (score) => {
  if (score >= 75)
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (score >= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
};

const JobMatchCard = ({ jobMatch }) => {
  if (!jobMatch?.available) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-indigo-500" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Job Match</h4>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {jobMatch?.note || 'Paste a job description above to see your match for the role.'}
        </p>
      </div>
    );
  }
  const matched = jobMatch.matchedSkills || [];
  const missing = jobMatch.missingSkills || [];
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
      {missing.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500 mb-1">
            Missing keywords
          </p>
          <div className="flex flex-wrap gap-1">
            {missing.slice(0, 12).map((s, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
              >
                {s.name}
                {s.importance === 'must_have' ? ' *' : ''}
              </span>
            ))}
          </div>
        </div>
      )}
      {matched.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500 mb-1">
            Matched
          </p>
          <div className="flex flex-wrap gap-1">
            {matched.slice(0, 12).map((s, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {(jobMatch.actionPlan || []).length > 0 && (
        <ul className="space-y-1 mt-2">
          {jobMatch.actionPlan.slice(0, 4).map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-indigo-400" />
              <span>{a.task}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2">* = must-have skill</p>
    </div>
  );
};

const CareerMatchCard = ({ roles }) => {
  if (!roles || roles.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="w-4 h-4 text-indigo-500" />
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
          Roles your CV can land
        </h4>
      </div>
      <ul className="space-y-2.5">
        {roles.map((r, i) => (
          <li
            key={i}
            className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 pb-2.5 last:pb-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {r.role}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${matchBadge(r.fitScore)}`}
              >
                {r.fitScore}%
              </span>
            </div>
            {r.why && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{r.why}</p>
            )}
            {(r.skillsToAdd || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1">
                <span className="text-[9px] text-slate-400 inline-flex items-center gap-0.5">
                  <Plus className="w-2.5 h-2.5" /> add:
                </span>
                {r.skillsToAdd.map((s, j) => (
                  <span
                    key={j}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const severityDot = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
};

const RedFlagsCard = ({ flags }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="w-4 h-4 text-amber-500" />
      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
        What a recruiter would flag
      </h4>
    </div>
    {!flags || flags.length === 0 ? (
      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5" /> No obvious red flags. Nice work.
      </p>
    ) : (
      <ul className="space-y-2">
        {flags.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${severityDot[f.severity] || severityDot.low}`}
            />
            <div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                {f.label}
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                {f.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// Blurred upsell teaser shown to free users who've used their taste.
const LockedTeaser = ({ onUpgrade }) => (
  <div className="relative rounded-xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
    <div className="p-3 space-y-2 blur-[3px] select-none pointer-events-none" aria-hidden="true">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">Job Match</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
          82% fit
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {['Kubernetes', 'CI/CD', 'Terraform', 'Go', 'gRPC'].map((s) => (
          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
            {s}
          </span>
        ))}
      </div>
      <div className="text-xs font-bold text-slate-700 pt-1">Roles your CV can land</div>
      {['Senior Backend Engineer — 84%', 'Platform Engineer — 71%'].map((r) => (
        <div key={r} className="text-[11px] text-slate-500">
          {r}
        </div>
      ))}
    </div>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-white/40 dark:bg-slate-900/40">
      <Lock className="w-5 h-5 text-indigo-500 mb-1.5" />
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
        You've used your free Deep Scan
      </p>
      <button
        onClick={onUpgrade}
        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
      >
        Upgrade for unlimited scans
      </button>
    </div>
  </div>
);

// ─── Dynamic, step-aware coaching (the hero of the coach view) ───
const TONE_STYLES = {
  start: {
    wrap: 'from-indigo-50 to-white dark:from-indigo-900/30 dark:to-slate-800 border-indigo-200 dark:border-indigo-800',
    icon: 'text-indigo-500',
  },
  progress: {
    wrap: 'from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 border-amber-200 dark:border-amber-800',
    icon: 'text-amber-500',
  },
  win: {
    wrap: 'from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500',
  },
};

// Typewriter — reveals the coach's words one character at a time so it feels like
// a real coach typing to you, right now. Re-types whenever the message changes.
// The reset is done DURING RENDER (React's recommended alternative to a
// setState-in-effect) so only the interval callback updates state.
const Typewriter = ({ text = '', speed = 16 }) => {
  const [shown, setShown] = useState('');
  const [prevText, setPrevText] = useState(text);
  if (text !== prevText) {
    setPrevText(text);
    setShown('');
  }
  useEffect(() => {
    if (!text) return undefined;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  const done = shown.length >= text.length;
  return (
    <span>
      {shown}
      {!done && (
        <span className="inline-block w-[2px] h-3.5 -mb-0.5 ml-px bg-indigo-400 dark:bg-indigo-300 animate-pulse align-middle" />
      )}
    </span>
  );
};

// Friendly per-step nouns for the "Analyzing your …" headline (web only — the
// native app keeps its own coach surface).
const STEP_NOUNS = {
  target_job: 'target job',
  heading: 'contact details',
  history: 'work history',
  projects: 'projects',
  education: 'education',
  skills: 'skills',
  summary: 'summary',
};

// Warm, professional status lines cycled while the coach reads the current step,
// so the wait reads as "your coach is looking" rather than a blank placeholder.
const ANALYZING_LINES = [
  'Reading what you’ve added…',
  'Checking it against your target role…',
  'Lining up the keywords recruiters scan for…',
  'Putting your guidance together…',
];

// The "the coach is looking at this section" state — a floating bot, a rotating
// status line, and shimmer lines standing in for the message that's coming. Shown
// in place of the scripted text on a step's FIRST analysis so the user never sees
// a throwaway default get typed out and then swapped for the real reply.
const CoachAnalyzing = ({ sectionLabel }) => {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLine((v) => (v + 1) % ANALYZING_LINES.length), 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center text-center py-4">
      {/* Floating coach bot — same icon, gradient & ping halo as the mobile FAB. */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-10 h-10"
      >
        <span className="absolute inset-0 rounded-full bg-indigo-400/50 animate-ping" />
        <span className="relative z-10 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/30 border border-white/20">
          <Bot className="w-5 h-5" />
        </span>
        <motion.span
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-0.5 -right-0.5 z-20 text-amber-300"
        >
          <Sparkles className="w-3 h-3" />
        </motion.span>
      </motion.div>

      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Analyzing your {sectionLabel}…
      </p>
      <div className="h-4 mt-1">
        <AnimatePresence mode="wait">
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-[11px] text-slate-500 dark:text-slate-400"
          >
            {ANALYZING_LINES[line]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-3 w-full max-w-[200px] space-y-1.5" aria-hidden="true">
        <div className="h-2 rounded bg-slate-200 dark:bg-slate-700 animate-pulse w-full" />
        <div className="h-2 rounded bg-slate-200 dark:bg-slate-700 animate-pulse w-4/5 mx-auto" />
      </div>
    </div>
  );
};

// The hero card: a live, conversational coach. When it flags something it can
// help with, it ASKS — tapping the offer opens the focused island helper. The
// scripted fallback shows tips instead of an offer.
// What free users see in place of the coach: the live CV-strength score stays
// visible (the Journey below is fully free), with a slim nudge to unlock the
// conversational, role-aware AI coach + section reviews.
const FreeCoachTeaser = ({ score, healthMeta, onUpgrade }) => (
  <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-800 dark:to-slate-800/60 p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 rounded-full bg-white/70 dark:bg-slate-900/40 flex items-center justify-center text-slate-400">
          <Lock className="w-3.5 h-3.5" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          AI Coach
        </span>
      </div>
      {typeof score === 'number' && healthMeta && (
        <span
          title={`CV strength: ${score}/100 · ${healthMeta.label}`}
          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/40 ${healthMeta.text}`}
        >
          {score}
          <span className="opacity-50">/100</span>
        </span>
      )}
    </div>
    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
      Your CV strength below is <strong>free</strong> — track it as you build. Unlock the{' '}
      <strong>AI Coach</strong> for live, role-aware guidance and a review of each section against
      the job you’re targeting.
    </p>
    <button
      onClick={onUpgrade}
      className="mt-3 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 transition-colors"
    >
      <Compass className="w-3.5 h-3.5" /> Unlock the AI Coach
    </button>
  </section>
);

const CoachCard = ({
  coaching,
  loading,
  analyzing,
  sectionLabel,
  limited,
  score,
  healthMeta,
  quickReplies,
  interaction,
  onInteraction,
  onQuickReply,
  onRefresh,
  onUpgrade,
}) => {
  const tone = TONE_STYLES[coaching.tone] || TONE_STYLES.start;
  // Interaction state is owned + persisted by the panel so it survives leaving and
  // returning to the coach (the label picked, recheck availability, ignore choice).
  const answered = interaction?.answered ?? null;
  const ignored = interaction?.ignored ?? false;
  const canRecheck = interaction?.canRecheck ?? false;
  const replies = quickReplies?.replies || [];

  const greenBar = (text, spinning) => (
    <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 flex items-center gap-2">
      {spinning ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : (
        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Check className="w-3 h-3" />
        </span>
      )}
      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        {text}
      </span>
    </div>
  );

  // The quick-reply review state machine: Done → "Reviewing…" → (win → "Looks
  // solid ✓") or (flaw → Recheck / Ignore). JD hand-off just confirms.
  let quickNode = null;
  if (replies.length > 0) {
    if (!answered) {
      quickNode = (
        <div className="mt-3 flex flex-wrap gap-2">
          {replies.map((q) => (
            <button
              key={q.label}
              disabled={loading}
              onClick={() => {
                onInteraction?.({ answered: q.label, canRecheck: !!q.recheck, ignored: false });
                onQuickReply?.(q.signal);
              }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/50 disabled:opacity-40 transition-colors"
            >
              {q.label}
            </button>
          ))}
        </div>
      );
    } else if (loading) {
      quickNode = greenBar(
        quickReplies.kind === 'review' ? 'Reviewing your section…' : 'Sending to your coach…',
        true
      );
    } else if (quickReplies.kind === 'jd') {
      // The user told the coach about the JD (no auto-detect). It's acknowledged;
      // if they later edit the description, Recheck re-notifies the coach.
      quickNode = (
        <>
          {greenBar(`Sent — “${answered}” ✓`)}
          {canRecheck && (
            <button
              disabled={loading}
              onClick={() => onQuickReply?.(quickReplies.recheckSignal)}
              title="Edited the job description? Have the coach take another look."
              className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Recheck
            </button>
          )}
        </>
      );
    } else if (ignored) {
      quickNode = greenBar('Noted — you can revisit it anytime ✓');
    } else if (coaching.tone === 'progress') {
      // The coach flagged something (shown above) — fix it & recheck, or ignore.
      quickNode = (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            disabled={loading}
            onClick={() => onQuickReply?.(quickReplies.recheckSignal)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Recheck
          </button>
          <button
            disabled={loading}
            onClick={() => {
              onInteraction?.({ ignored: true });
              onQuickReply?.(quickReplies.ignoreSignal);
            }}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/50 disabled:opacity-40 transition-colors"
          >
            Ignore
          </button>
        </div>
      );
    } else {
      quickNode = greenBar('Looks solid ✓');
    }
  }

  return (
    <section className={`rounded-2xl border bg-gradient-to-br p-4 ${tone.wrap}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-6 h-6 rounded-full bg-white/70 dark:bg-slate-900/40 flex items-center justify-center ${tone.icon}`}
          >
            <Compass className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Your Coach
          </span>
          {loading && !analyzing && (
            <span className="flex items-center gap-0.5" title="Thinking…">
              <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {typeof score === 'number' && healthMeta && (
            <span
              title={`CV strength: ${score}/100 · ${healthMeta.label}`}
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/40 ${healthMeta.text}`}
            >
              {score}
              <span className="opacity-50">/100</span>
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Fresh tip"
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50 disabled:opacity-40 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {analyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CoachAnalyzing sectionLabel={sectionLabel} />
          </motion.div>
        ) : (
          <motion.div
            key="message"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              <Typewriter text={coaching.message} />
            </p>

            {coaching.tips?.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {coaching.tips.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300"
                  >
                    <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}

            {quickNode}
          </motion.div>
        )}
      </AnimatePresence>

      {limited && (
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
          You’ve used today’s live coaching.{' '}
          <button
            onClick={onUpgrade}
            className="font-bold text-indigo-600 dark:text-indigo-300 hover:underline"
          >
            Upgrade for unlimited
          </button>
        </p>
      )}
    </section>
  );
};

// One row of the coach's "journey" — a section in builder order. Requirements
// stay hidden behind the journey's "what each needs" toggle so the strip reads
// as progress, not a checklist competing with the conversation.
const JourneyRow = ({ section, showDetail }) => (
  <div className="py-1.5">
    <div className="flex items-center gap-2">
      <SectionStatusIcon status={section.status} />
      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
        {section.title}
      </span>
      {section.recommended && (
        <span className="text-[8px] uppercase font-bold tracking-wide text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 rounded px-1 py-px">
          Recommended
        </span>
      )}
      <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 truncate">
        {section.detail}
      </span>
    </div>
    {showDetail && section.status !== 'complete' && (
      <ul className="mt-1.5 ml-6 space-y-1">
        {section.requirements.map((r, i) => (
          <li key={i} className="flex items-center gap-1.5 text-[11px]">
            {r.met ? (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
            )}
            <span
              className={
                r.met
                  ? 'text-slate-400 line-through dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-300'
              }
            >
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// The coach's view of where you are — the builder sections in order, with the
// Deep-Scan finale woven into the bottom. Subordinate to the conversation: this
// is "your journey", not a separate scorecard.
const Journey = ({ health, cvComplete, sectionsLeft, isPaidHint, onEnterScan }) => {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">Your CV journey</h3>
        <button
          onClick={() => setShowDetail((v) => !v)}
          className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
        >
          {showDetail ? 'Hide details' : 'What each needs'}
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {health.sections.map((s) => (
          <JourneyRow key={s.id} section={s} showDetail={showDetail} />
        ))}
      </div>

      {/* Deep-Scan finale — woven into the journey, not a separate card. */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
        {cvComplete ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-3 text-white"
          >
            <p className="text-xs font-extrabold mb-1">Your CV’s ready! 🎉</p>
            <p className="text-[11px] text-indigo-100 mb-2">
              Every section’s done. See how it matches a real role.
            </p>
            <button
              onClick={onEnterScan}
              className="w-full text-sm font-bold px-4 py-2 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 transition-colors inline-flex items-center justify-center gap-2"
            >
              <ScanLine className="w-4 h-4" />
              {isPaidHint ? 'Run ATS Deep Scan' : 'Run free Deep Scan'}
            </button>
          </motion.div>
        ) : (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3 h-3 shrink-0" />
            ATS Deep Scan unlocks at 100% — {sectionsLeft} section
            {sectionsLeft > 1 ? 's' : ''} to go.
          </p>
        )}
      </div>
    </section>
  );
};

// ─── Role Match band (free honesty signal) ───
// Sits above the coach so a COMPLETE CV can't read as a GREAT one for the target
// job: completeness (the 0-100 health score) and relevance are shown separately.
// The clash copy fires when the CV is finished but barely matches the role — the
// exact "falsely-reassuring green 100%" case this band exists to prevent.
const RoleMatchBand = ({ roleMatch, completeness }) => {
  const c = roleMatchColor(roleMatch.level);
  const clash = completeness >= 80 && roleMatch.level === 'low';
  let msg;
  if (clash) {
    msg = `Your CV is complete, but it covers only ${roleMatch.pct}% of what this job asks for. A finished CV isn't the same as a matched one — weave in the keywords that are genuinely true for you.`;
  } else if (roleMatch.level === 'low') {
    msg = `Your CV covers little of this role's keywords so far (${roleMatch.covered}/${roleMatch.total}). Add the ones that are genuinely true for you.`;
  } else if (roleMatch.level === 'medium') {
    msg = `Partial match — ${roleMatch.covered}/${roleMatch.total} of this role's key terms are covered. Close the gaps to climb higher.`;
  } else {
    msg = `Strong alignment — ${roleMatch.covered}/${roleMatch.total} of this role's key terms are covered. Nice work.`;
  }
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Target className={`w-4 h-4 ${c.text}`} />
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">Role match</h3>
        </div>
        <span className={`text-xs font-extrabold ${c.text}`}>{roleMatch.pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${c.bar} transition-all duration-500`}
          style={{ width: `${roleMatch.pct}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{msg}</p>
      {roleMatch.mustHaveTotal > 0 && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          must-haves {roleMatch.mustHaveCovered}/{roleMatch.mustHaveTotal}
        </p>
      )}
    </section>
  );
};

// Steps the coach verifies LIVE and deterministically (no AI round-trip), so they
// re-verify the instant they're complete. Contact is pure fill-in fields, so its
// scripted verdict (computed from liveCvData) is exact and updates as you type.
const LIVE_STEPS = new Set(['heading']);

// Steps where the coach must NOT speak automatically on entry — it waits for the
// user to explicitly trigger it. Target Job only reads the JD when the user clicks
// "I've added it" (we never auto-detect a pasted description). Unlike LIVE_STEPS,
// the AI reply IS shown once they trigger it.
const MANUAL_STEPS = new Set(['target_job']);

// The coach's per-step state (the AI reply + which quick reply the user picked) is
// persisted per draft for the active builder session, so leaving the panel (switching
// to the preview, navigating away) and coming back restores the conversation.

// The STATIC invite shown on a manual step before the user triggers the coach — a
// fixed string so nothing reacts as they type the role or paste the description.
const MANUAL_PROMPT = {
  target_job: {
    message:
      'Add your target role, and paste the job description if you have one. Then tap “✓ I’ve added the description” — I’ll read it, highlight what this role really wants, and guide you to build a CV tailored to it.',
    tone: 'start',
    tips: [],
  },
};

const ATSCoachPanel = ({ cvData, user, currentStepId, updateCvData }) => {
  const { id: draftId } = useParams();
  const navigate = useNavigate();
  const health = useMemo(() => computeCvHealth(cvData), [cvData]);
  const scripted = useMemo(() => getStepCoaching(currentStepId, cvData), [currentStepId, cvData]);
  const healthMeta = healthColor(health.score);

  // Coach conversation (per-step replies + interaction) AND the role-match coverage
  // result are cached in the builder context, so leaving the panel — e.g. closing
  // the mobile coach bubble or flipping to the Preview tab — and returning restores
  // them instead of re-fetching. See `_roleCoverage` in the coverage effect below.
  const { coachState: aiByStep, setCoachState: setAiByStep } = useCVBuilder();

  // ── Role Match (free JD-relevance honesty band) ──
  // Pre-check with no coverage to read eligibility: only fetch the (free, no-AI)
  // backend coverage once there's a JD AND enough content — so we never show a
  // red "low match" on a barely-started CV, and never fetch needlessly.
  const roleMatchPre = useMemo(() => computeRoleMatch(cvData, null), [cvData]);
  const shouldFetchCoverage = roleMatchPre.reason === 'pending';
  const [coverage, setCoverage] = useState(null);
  const skillNames = useMemo(
    () => (cvData.skills || []).map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean),
    [cvData.skills]
  );
  const bulletsText = useMemo(
    () => (cvData.experience || []).map((e) => e.description || '').join('\n'),
    [cvData.experience]
  );
  const coverageSig = `${(cvData.targetJob?.description || '').trim()}::${skillNames.join('|')}::${bulletsText}`;

  useEffect(() => {
    if (!shouldFetchCoverage) {
      setCoverage(null);
      return undefined;
    }
    // Reuse the coverage already computed for these exact inputs. This survives the
    // panel unmounting (mobile: closing the coach bubble / switching to Preview), so
    // reopening does NOT re-hit /ai/job-keywords + /ai/keyword-coverage every time.
    const cachedCov = aiByStep._roleCoverage;
    if (cachedCov?.sig === coverageSig) {
      setCoverage(cachedCov.coverage);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        // Prefer the paid AI keyword set cached on the draft; else the free
        // deterministic baseline. Same two endpoints the JobKeywordPanel uses.
        const cached = cvData.targetJob?.aiKeywords;
        let keywords = Array.isArray(cached) && cached.length ? cached : null;
        if (!keywords) {
          const kw = await CVService.getJobKeywords({
            title: cvData.targetJob?.title || '',
            description: cvData.targetJob?.description || '',
          });
          keywords = Array.isArray(kw?.keywords) ? kw.keywords : [];
        }
        if (keywords.length === 0) {
          if (!cancelled) setCoverage(null);
          return;
        }
        const cov = await CVService.getKeywordCoverage(keywords, {
          text: bulletsText,
          skills: skillNames,
        });
        if (!cancelled) {
          setCoverage(cov);
          // Cache against the inputs so a remount reuses it instead of re-fetching.
          setAiByStep((m) => ({ ...m, _roleCoverage: { sig: coverageSig, coverage: cov } }));
        }
      } catch {
        if (!cancelled) setCoverage(null); // degrade silently — it's a guidance band
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetchCoverage, coverageSig]);

  const roleMatch = useMemo(() => computeRoleMatch(cvData, coverage), [cvData, coverage]);
  const cvComplete = health.sections.every((s) => s.recommended || s.status === 'complete');
  const sectionsLeft = health.sections.filter(
    (s) => !s.recommended && s.status !== 'complete'
  ).length;
  const isPaidHint = user?.plan === 'paid';

  const [mode, setMode] = useState('coach'); // 'coach' | 'scan'
  const [jd, setJd] = useState(cvData.targetJob?.description || '');
  const [scan, setScan] = useState(null); // server response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { message, agent? }

  // Live AI coach loading/limited flags. The per-step replies + interaction live in
  // the builder context (`aiByStep`, destructured near the top) so leaving the panel
  // and returning restores the conversation, not the intro. Never fires on keystrokes
  // — only on step change + explicit acts.
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLimited, setAiLimited] = useState(false);

  // Record which quick reply the user picked (persisted alongside the reply) so the
  // card restores its resolved button state (Recheck / "Looks solid ✓") on return.
  const setStepInteraction = (step, partial) =>
    setAiByStep((m) => ({ ...m, [step]: { ...m[step], ...partial } }));

  // `signal` is set when the user explicitly hands something to the coach (a quick
  // reply / "done here") — the coach then acknowledges it. Without a signal this is
  // the normal per-step greeting. Either way it's an explicit action, never a
  // reaction to field edits.
  const fetchGuide = async (step, signal) => {
    if (!step) return;
    setAiLoading(true);
    try {
      const data = await CVService.coachGuide(draftId, step, signal, cvData);
      if (data?.limited) {
        setAiLimited(true);
      } else if (data?.message) {
        // Merge so the user's quick-reply interaction on this step is preserved.
        setAiByStep((m) => ({
          ...m,
          [step]: { ...m[step], message: data.message, tone: data.tone || 'progress' },
        }));
        setAiLimited(false);
      } else {
        // data.fallback (AI off) → keep the scripted coach, but mark the step
        // settled so the "Analyzing…" bot resolves to it instead of spinning.
        setAiByStep((m) => ({ ...m, [step]: { ...m[step], settled: true } }));
      }
    } catch {
      // network/other → fall back to the scripted coach, and settle so the bot
      // doesn't hang on this step.
      setAiByStep((m) => ({ ...m, [step]: { ...m[step], settled: true } }));
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    // Paid-only, and never for live-verify steps (Contact uses the live scripted
    // verdict so it can re-check the instant the section is complete).
    if (
      mode !== 'coach' ||
      !isPaidHint ||
      !currentStepId ||
      LIVE_STEPS.has(currentStepId) ||
      MANUAL_STEPS.has(currentStepId) ||
      aiByStep[currentStepId]
    )
      return;
    const step = currentStepId;
    const t = setTimeout(() => fetchGuide(step), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId, mode, isPaidHint]);

  // Live-verify steps (Contact) never use a cached AI message — they fall through
  // to the deterministic scripted verdict, which recomputes from liveCvData on
  // every keystroke, so the card flips to green the instant the section completes.
  const isLiveStep = LIVE_STEPS.has(currentStepId);
  const isManualStep = MANUAL_STEPS.has(currentStepId);
  const aiEntry = isLiveStep ? null : aiByStep[currentStepId];
  // Manual steps (Target Job) show a STATIC invite until the user explicitly
  // triggers the coach — so nothing reacts as they type the role or paste the JD.
  // The scripted fallback (live, data-aware) is only used on the other steps.
  const fallback =
    isManualStep && MANUAL_PROMPT[currentStepId] ? MANUAL_PROMPT[currentStepId] : scripted;
  const coaching = {
    message: aiEntry?.message || fallback.message,
    tone: aiEntry?.tone || fallback.tone,
    tips: aiEntry?.message ? [] : fallback.tips || [],
  };

  // Quick replies the user can hand to the coach on this step (explicit only).
  const quickReplies = useMemo(() => getQuickReplies(currentStepId), [currentStepId]);

  // Steps that get the conversational AI coach (and therefore the analyzing→typing
  // flow). Live/manual steps never auto-fetch, so they skip the bot entirely.
  const usesAiCoach = isPaidHint && !!currentStepId && !isLiveStep && !isManualStep;

  // Minimum time the "Analyzing…" bot stays up. A fast (or cached) AI reply would
  // otherwise flicker past before the user registers it — so the reveal waits for
  // BOTH the reply AND this dwell to elapse, then hands off to the typewriter.
  const MIN_ANALYZE_MS = 1100;
  const [dwelledStep, setDwelledStep] = useState(null);
  useEffect(() => {
    if (!usesAiCoach) return undefined;
    const step = currentStepId;
    setDwelledStep(null);
    const t = setTimeout(() => setDwelledStep(step), MIN_ANALYZE_MS);
    return () => clearTimeout(t);
  }, [currentStepId, usesAiCoach]);
  const minDwellElapsed = dwelledStep === currentStepId;

  // Show the floating-bot "Analyzing…" state on a step's FIRST read, from the very
  // first frame (derived, not tied to the in-flight request) so the scripted default
  // never flashes before it. It clears once the step settles (an AI reply or the
  // AI-off/error settle marker make `aiEntry` truthy) AND the min dwell has passed.
  // A rate-limit drops it immediately to the upsell. The `!currentStepId` arm covers
  // the brief builder-load window where the step id hasn't resolved yet — without it,
  // a paid user would see the generic scripted default flash before the bot.
  const analyzing =
    isPaidHint &&
    !aiLimited &&
    !isLiveStep &&
    !isManualStep &&
    (!currentStepId || !aiEntry || !minDwellElapsed);

  const enterScan = () => {
    setJd(cvData.targetJob?.description || '');
    setError(null);
    setMode('scan');
  };

  const runScan = async () => {
    if (loading) return;
    const jobDescription = jd.trim();
    setLoading(true);
    setError(null);
    try {
      const data = await CVService.coachDeepScan(draftId, jobDescription);
      setScan(data);
      // One source of truth: push the pasted JD back into the builder so the
      // Target Job step, keyword panel and ATS bullet suggestions all use it too.
      if (jobDescription && jobDescription !== (cvData.targetJob?.description || '').trim()) {
        updateCvData?.({ targetJob: { ...(cvData.targetJob || {}), description: jobDescription } });
      }
    } catch (err) {
      const code = err?.response?.data?.code;
      setError({
        message: err?.response?.data?.message || 'Could not run the scan. Please try again.',
        agent: code === 'AGENT_CV',
      });
    } finally {
      setLoading(false);
    }
  };

  const newScan = () => {
    setScan(null);
    setError(null);
  };

  const tooEmpty = scan?.tooEmpty;
  const unlocked = scan && !scan.locked && !scan.tooEmpty;
  const showLocked = (scan && scan.locked) || error?.agent;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {mode === 'coach' ? (
        <motion.div
          key="coach"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Role Match honesty band — keeps a complete CV from reading as a great
              fit for the wrong job. Free, shown to everyone once applicable. */}
          {roleMatch.applicable && (
            <RoleMatchBand roleMatch={roleMatch} completeness={health.score} />
          )}

          {/* The conversational coach is paid-only (the hero). Free users get the
              deterministic Journey below + a slim unlock teaser here. */}
          {isPaidHint ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepId || 'intro'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <CoachCard
                  coaching={coaching}
                  loading={aiLoading}
                  analyzing={analyzing}
                  sectionLabel={STEP_NOUNS[currentStepId] || 'CV'}
                  limited={aiLimited}
                  score={health.score}
                  healthMeta={healthMeta}
                  quickReplies={quickReplies}
                  interaction={aiEntry}
                  onInteraction={(p) => setStepInteraction(currentStepId, p)}
                  onQuickReply={(signal) => fetchGuide(currentStepId, signal)}
                  onRefresh={
                    isLiveStep || isManualStep ? undefined : () => fetchGuide(currentStepId)
                  }
                  onUpgrade={() => navigate('/upgrade')}
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            <FreeCoachTeaser
              score={health.score}
              healthMeta={healthMeta}
              onUpgrade={() => navigate('/upgrade')}
            />
          )}

          {/* The coach's view of where you are — journey + Deep-Scan finale. */}
          <Journey
            health={health}
            cvComplete={cvComplete}
            sectionsLeft={sectionsLeft}
            isPaidHint={isPaidHint}
            onEnterScan={enterScan}
          />
        </motion.div>
      ) : (
        <motion.div
          key="scan"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Scan header with a way back to coaching */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('coach')}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Back to coaching"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <ScanLine className="w-4 h-4 text-indigo-500" /> ATS Match
              </h3>
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin mb-2" />
              <span className="text-xs">Scanning your CV against the role…</span>
            </div>
          )}

          {!loading && showLocked && <LockedTeaser onUpgrade={() => navigate('/upgrade')} />}

          {!loading && !showLocked && tooEmpty && (
            <Reveal>
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
                <Compass className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                  Let’s build your CV first
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  There isn’t enough in your CV yet to score a real match. Add your work experience
                  and a few skills, then come back and scan — your free scan is still waiting.
                </p>
                <button
                  onClick={() => setMode('coach')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to coaching
                </button>
              </div>
            </Reveal>
          )}

          {!loading && !showLocked && !tooEmpty && error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-4 text-center">
              <p className="text-[11px] text-rose-600 dark:text-rose-300 mb-2">{error.message}</p>
              <button
                onClick={runScan}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Try again
              </button>
            </div>
          )}

          {/* Results */}
          {!loading && !showLocked && !error && unlocked && (
            <div className="space-y-3">
              {scan.taste && (
                <Reveal>
                  <p className="text-[10px] text-center text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 rounded-md py-1">
                    ✨ This was your free scan. Upgrade to re-run it anytime your CV changes.
                  </p>
                </Reveal>
              )}

              {scan.jobMatch?.available && (
                <Reveal>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex items-center gap-4">
                    <ScoreRing score={scan.jobMatch.fitScore} />
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                        {scan.jobMatch.fitScore >= 75
                          ? 'Strong match 🎯'
                          : scan.jobMatch.fitScore >= 50
                            ? 'Decent match'
                            : 'Needs tailoring'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Your CV matches this role at {scan.jobMatch.fitScore}%. Close the gaps below
                        to climb higher.
                      </p>
                    </div>
                  </div>
                </Reveal>
              )}

              <Reveal delay={0.06}>
                <JobMatchCard jobMatch={scan.jobMatch} />
              </Reveal>
              <Reveal delay={0.12}>
                <CareerMatchCard roles={scan.careerMatch} />
              </Reveal>
              <Reveal delay={0.18}>
                <RedFlagsCard flags={scan.redFlags} />
              </Reveal>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={newScan}
                  className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 inline-flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Scan another job
                </button>
                {!scan.isPaid && (
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>
          )}

          {/* JD input — the entry to a match */}
          {!loading && !showLocked && !error && !unlocked && !tooEmpty && (
            <Reveal>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <label
                  htmlFor="coach-jd-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Paste the job description
                </label>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 mb-2">
                  We’ll match your CV against it — and save it to your target job so the rest of the
                  builder uses it too.
                </p>
                <textarea
                  id="coach-jd-input"
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runScan();
                  }}
                  rows={8}
                  placeholder="Paste the full job description here…"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-2.5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none custom-scrollbar"
                />
                <button
                  onClick={runScan}
                  className="w-full mt-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors inline-flex items-center justify-center gap-2"
                >
                  <ScanLine className="w-4 h-4" /> See my match
                </button>
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1.5">
                  {jd.trim()
                    ? 'No job description? You’ll still get role suggestions and red-flags.'
                    : 'Tip: even without a JD you’ll get the roles your CV can land.'}
                  {!isPaidHint && ' · Free preview, one per account.'}
                </p>
              </div>
            </Reveal>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ATSCoachPanel;
