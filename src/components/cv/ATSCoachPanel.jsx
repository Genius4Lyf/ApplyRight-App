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
import { toast } from 'sonner';
import CVService from '../../services/cv.service';
import {
  computeCvHealth,
  healthColor,
  computeRoleMatch,
  roleMatchColor,
} from '../../utils/cvHealth';
import { getStepCoaching, getQuickReplies } from '../../utils/cvCoach';
import { useCVBuilder } from '../../context/CVContext';
import { CREDIT_COSTS } from '../../lib/credits';

// Maps a CV Health section id → the builder step that fixes it. Drives the
// "Go fix" navigation on the Top fixes list (certifications live on the education step).
const SECTION_STEP = {
  contact: 'heading',
  history: 'history',
  projects: 'projects',
  education: 'education',
  certifications: 'education',
  skills: 'skills',
  summary: 'summary',
};

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
const ScoreRing = ({ score, size = 88 }) => {
  const { ring, text } = healthColor(score);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
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
        <span className={`font-extrabold ${text}`} style={{ fontSize: Math.round(size * 0.26) }}>
          {score}
        </span>
        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">/ 100</span>
      </div>
    </div>
  );
};

// ─── CV Health Scoreboard (free, live) — the hero score at the top of the coach
// panel. Promotes CV Health from a corner chip to a ring + plain-English band +
// "to Strong" target, with an emerald delta that floats up when the score rises.
// Deterministic, no AI/network. Shown to BOTH free and paid.
const Scoreboard = ({ score, healthMeta }) => {
  const prevRef = React.useRef(score);
  const [delta, setDelta] = useState(null);
  useEffect(() => {
    const d = score - prevRef.current;
    prevRef.current = score;
    if (d > 0) {
      setDelta(d);
      const t = setTimeout(() => setDelta(null), 1100);
      return () => clearTimeout(t);
    }
  }, [score]);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <ScoreRing score={score} size={64} />
          <AnimatePresence>
            {delta != null && (
              <motion.span
                key={`d-${delta}-${score}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: -22 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute left-1/2 -top-1 -translate-x-1/2 text-sm font-extrabold text-emerald-600 dark:text-emerald-400 pointer-events-none"
              >
                +{delta}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            CV Health · live
          </div>
          <div className={`font-heading text-base font-bold leading-tight mt-0.5 ${healthMeta.text}`}>
            {healthMeta.label}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {score >= 100 ? (
              'Recruiter-ready — perfect 100 ✓'
            ) : score >= 80 ? (
              <>Recruiter-ready — <span className="font-bold">{100 - score}</span> to a perfect 100</>
            ) : (
              <><span className="font-bold">+{80 - score}</span> to Strong</>
            )}
          </div>
          <div className="relative mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: healthMeta.ring }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
            <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-slate-400/60 dark:bg-slate-500/60" style={{ left: '80%' }} />
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Top fixes — the ranked, tappable gap list under the Scoreboard. Handles two
// kinds: deterministic point-fixes ("Go fix" → jump to the step, +N/PTS badge and
// a "Next" chip on the top row) and AI phrasing rewrites ("Sharpen" → opens the
// rewrite preview, priced in credits for free users). Shows an "all clear" state
// when nothing's left. Shown to free AND paid.
const TopFixes = ({ items, ptsToStrong, isPaid, rewriteCost, onGo, onRewrite }) => {
  const [expanded, setExpanded] = useState(false);
  if (!items.length)
    return (
      <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
        <p className="font-heading text-base font-bold text-emerald-700 dark:text-emerald-300">
          All clear — recruiter-ready ✓
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Every required section is complete.
        </p>
      </section>
    );
  const shown = expanded ? items : items.slice(0, 3);
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Top fixes
        </h3>
        {ptsToStrong > 0 && (
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            {ptsToStrong} pts to Strong
          </span>
        )}
      </div>
      {shown.map((f, i) => {
        const isNext = i === 0 && f.kind === 'go';
        return (
          <div
            key={f.id}
            className={`flex items-center gap-3 rounded-xl border p-2.5 bg-white dark:bg-slate-900 ${
              isNext
                ? 'border-slate-300 dark:border-slate-600'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            {f.kind === 'go' ? (
              <div className="shrink-0 w-8 flex flex-col items-center leading-none">
                <span className="text-[13px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{f.gain}
                </span>
                <span className="text-[7px] font-bold tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">
                  PTS
                </span>
              </div>
            ) : (
              <div className="shrink-0 w-8 flex items-center justify-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded px-1 py-0.5">
                  AI
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                {f.kind === 'go' ? f.label : `Sharpen “${f.title}”`}
              </p>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {isNext && (
                  <span className="text-[8px] font-bold uppercase tracking-wider text-white dark:text-slate-900 bg-slate-900 dark:bg-white rounded px-1 py-px">
                    Next
                  </span>
                )}
                <span className="inline-block text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded px-1 py-px">
                  {f.kind === 'go' ? f.sectionTitle : f.reason}
                </span>
              </div>
            </div>
            {f.kind === 'go' ? (
              <button
                onClick={() => onGo(f.stepId)}
                className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 inline-flex items-center gap-1 transition-colors"
              >
                Go fix <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={() => onRewrite(f.section, f.sortId, f.title)}
                className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 whitespace-nowrap transition-colors"
              >
                Rewrite
                {!isPaid && (
                  <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
                    · {rewriteCost}cr
                  </span>
                )}
              </button>
            )}
          </div>
        );
      })}
      {items.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {expanded ? 'Show fewer' : `${items.length - 3} more fix${items.length - 3 > 1 ? 'es' : ''}`}
        </button>
      )}
    </section>
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

// A placeholder is any [bracketed] fill-in left by the ATS rewrite (e.g. "[X]%").
const PLACEHOLDER_RE = /\[[^\]]+\]/;

// Bullet openers / filler that read weak — mirrors the backend detectRedFlags lists
// so the coach's live, per-role hints match what a Deep Scan would flag.
const WEAK_OPENERS = [
  'responsible for',
  'worked on',
  'helped',
  'assisted',
  'duties included',
  'tasked with',
  'in charge of',
  'involved in',
];
const BUZZWORDS = [
  'team player',
  'hard worker',
  'go-getter',
  'synergy',
  'detail-oriented',
  'self-starter',
  'results-driven',
  'fast learner',
];

// Deterministic, instant per-role issues for the coach card (no AI / network) — the
// same checks the Deep Scan runs, so "rewrite this role" can show WHY it's worth it.
const roleIssues = (description) => {
  const bullets = (description || '')
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean);
  const issues = [];
  if (bullets.length < 2) issues.push('Add 2+ bullets');
  if (bullets.length > 0 && !bullets.some((b) => /\d/.test(b))) issues.push('No numbers');
  const stripped = (b) => b.replace(/^[•\-*\s]+/, '').toLowerCase();
  if (bullets.some((b) => WEAK_OPENERS.some((w) => stripped(b).startsWith(w))))
    issues.push('Passive opener');
  if (BUZZWORDS.some((w) => bullets.join('\n').toLowerCase().includes(w))) issues.push('Buzzwords');
  if (bullets.some((b) => PLACEHOLDER_RE.test(b))) issues.push('Fill in numbers');
  return issues;
};

// One role/project row in a fix list — shared by the coach card and the Deep-Scan
// TailorCard so the states read identically. Three states, animated:
//   • applied   → green "Sharpened ✓" (+ gentle amber "Finish: …" if a placeholder
//                 survived), the loud button demoted to a subtle "Rewrite again".
//   • has issues → amber chips + prominent "✨ Rewrite".
//   • clean      → muted "Looks strong ✓" + a quiet "Rewrite" link.
// `locked` (free Deep-Scan users) overrides the action with an Upgrade CTA.
const FixRow = ({ title, subtitle, issues = [], applied, disabled, locked, onRewrite }) => {
  const hasIssues = issues.length > 0;
  const wrap = applied
    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/15'
    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40';

  let action;
  if (locked) {
    action = (
      <button
        onClick={onRewrite}
        className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 min-h-[36px] rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1"
      >
        <Lock className="w-3 h-3" /> Upgrade
      </button>
    );
  } else if (applied) {
    action = (
      <button
        onClick={onRewrite}
        disabled={disabled}
        className="shrink-0 text-[10px] font-semibold px-2 py-1.5 min-h-[36px] rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-700/50 inline-flex items-center gap-1 disabled:opacity-40"
      >
        <RefreshCw className="w-2.5 h-2.5" /> Rewrite again
      </button>
    );
  } else if (hasIssues) {
    action = (
      <button
        onClick={onRewrite}
        disabled={disabled}
        title={disabled ? 'Save this role once, then rewrite' : undefined}
        className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 min-h-[36px] rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white inline-flex items-center gap-1"
      >
        <Sparkles className="w-3 h-3" /> Rewrite
      </button>
    );
  } else {
    action = (
      <button
        onClick={onRewrite}
        disabled={disabled}
        className="shrink-0 text-[10px] font-semibold px-2 py-1.5 min-h-[36px] rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 inline-flex items-center gap-1 disabled:opacity-40"
      >
        <Sparkles className="w-2.5 h-2.5" /> Rewrite
      </button>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-2.5 flex items-start justify-between gap-2 ${wrap}`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
          {title}
        </p>
        {subtitle && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>
        )}

        {applied ? (
          <>
            <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <Check className="w-2.5 h-2.5" /> Sharpened
            </p>
            {hasIssues && (
              <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">
                Finish: {issues.slice(0, 2).join(', ')}
              </p>
            )}
          </>
        ) : hasIssues ? (
          <div className="flex flex-wrap gap-1 mt-1">
            {issues.slice(0, 3).map((lbl) => (
              <span
                key={lbl}
                className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              >
                {lbl}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <Check className="w-2.5 h-2.5" /> Looks strong
          </p>
        )}
      </div>
      {action}
    </motion.div>
  );
};

// "Tailor your bullets to this job" — the fix station. Lists each work-history
// role + project with the recruiter flags it triggered, and a button to generate
// role-targeted ATS bullet rewrites. This is the literal "use these on this role,
// these on that role" loop. Rewrites are paid; free users get an upgrade CTA.
const TailorCard = ({
  entries,
  issuesBySortId,
  isPaid,
  appliedSortIds = {},
  onRewrite,
  onUpgrade,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
          Tailor your bullets to this job
        </h4>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2.5">
        Rewrite a role’s bullets in the language this job screens for — then Recheck to turn its
        flags green.
      </p>
      {entries.length === 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Add a work-history role or project to get role-targeted rewrites.
        </p>
      )}
      <div className="space-y-2">
        {entries.map((en) => (
          <FixRow
            key={`${en.section}:${en.sortId || en.title}`}
            title={en.title}
            subtitle={en.subtitle}
            issues={[...new Set(issuesBySortId[en.sortId] || [])]}
            applied={isPaid && !!appliedSortIds[en.sortId]}
            disabled={isPaid && !en.sortId}
            locked={!isPaid}
            onRewrite={() => (isPaid ? onRewrite(en.section, en.sortId, en.title) : onUpgrade())}
          />
        ))}
      </div>
    </div>
  );
};

// SURGICAL rewrite preview — rendered INLINE as a coach-card surface (not a modal),
// so on web and mobile the coach area itself becomes the "here's how I'd sharpen this
// role" view and animates back to the coach when you apply or go back. The coach KEEPS
// the strong bullets untouched and shows the weak ones as before → after; the user can
// fill in [bracketed] numbers, toggle an improvement off to keep the original, and
// apply — only the weak lines change.
const RewritePreview = ({ rewrite, applying, onToggle, onEdit, onApply, onClose, onRetry }) => {
  if (!rewrite) return null;
  const items = rewrite.items || [];
  const ready = !rewrite.loading && !rewrite.error;
  const improved = items.filter((it) => it.original !== null && !it.keep).length;
  const kept = items.filter((it) => it.original !== null && it.keep).length;
  const isNew = items.filter((it) => it.original === null).length;
  // Lines that will actually be written (mirrors applyRewrite).
  const willWrite = items.filter((it) =>
    it.original === null ? it.apply && it.text.trim() : it.keep || true
  ).length;
  // A bullet contributes its (edited) text when it's an applied rewrite or an added
  // new bullet. We must NOT ship a raw "[X]" placeholder to the CV — it reads as
  // unfinished AND never satisfies the coach's "add a number" flag, so the loop
  // can't converge. Block Apply until every such bullet's placeholders are filled
  // in (a real number) or edited out.
  const contributesText = (it) => it.apply && (it.original === null || !it.keep);
  const unfilled = items.filter((it) => contributesText(it) && PLACEHOLDER_RE.test(it.text)).length;
  // The AI kept every bullet (nothing improved, nothing new) — there's genuinely
  // nothing to apply, so don't show a confusing all-green Apply screen.
  const nothingToApply = ready && improved === 0 && isNew === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to coach
        </button>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500" /> Sharpening {rewrite.title}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {!ready
            ? 'Reviewing each bullet…'
            : nothingToApply
              ? 'Good news — these bullets are already strong. Nothing to rewrite here. 👍'
              : kept === 0 && isNew > 0
                ? 'Fresh bullets for this role — fill in any [numbers], then apply.'
                : 'I kept your strong bullets and rewrote the rest — fill in any [numbers], then apply.'}
        </p>
      </div>

      {ready && (improved > 0 || kept > 0 || isNew > 0) && (
        <div className="px-4 pt-2.5 flex flex-wrap gap-1.5">
          {kept > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              {kept} kept
            </span>
          )}
          {improved > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              {improved} improved
            </span>
          )}
          {isNew > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {isNew} new
            </span>
          )}
        </div>
      )}

      <div className="p-4 space-y-2">
        {rewrite.loading && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="text-xs">Finding the bullets worth improving…</span>
          </div>
        )}

        {!rewrite.loading && rewrite.error === 'locked' && (
          <div className="text-center py-8">
            <Lock className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Bullet rewrites are a Pro feature.
            </p>
            <button
              onClick={onClose}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white"
            >
              Got it
            </button>
          </div>
        )}

        {!rewrite.loading && rewrite.error && rewrite.error !== 'locked' && (
          <div className="text-center py-8">
            <p className="text-[11px] text-rose-600 dark:text-rose-300 mb-3">{rewrite.error}</p>
            <button
              onClick={onRetry}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          </div>
        )}

        {ready &&
          items.map((it) => {
            // Already-strong bullet — kept verbatim, not editable.
            if (it.original !== null && it.keep) {
              return (
                <div
                  key={it.id}
                  className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-2.5"
                >
                  <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-0.5">
                    <Check className="w-2.5 h-2.5" /> Kept
                    {it.reason ? ` · ${it.reason}` : ' — already strong'}
                  </p>
                  <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                    {it.original}
                  </p>
                </div>
              );
            }

            // Weak bullet (before → after) or a brand-new starter bullet.
            const fresh = it.original === null;
            const hasPh = PLACEHOLDER_RE.test(it.text);
            return (
              <div
                key={it.id}
                className={`rounded-xl border p-2.5 ${
                  it.apply
                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                    {fresh ? 'New bullet' : 'Improved'}
                    {it.reason ? (
                      <span className="text-slate-400 normal-case"> · {it.reason}</span>
                    ) : null}
                  </span>
                  <button
                    onClick={() => onToggle(it.id)}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                      it.apply
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {it.apply
                      ? fresh
                        ? 'Adding ✓'
                        : 'Using new ✓'
                      : fresh
                        ? 'Skipped'
                        : 'Keep original'}
                  </button>
                </div>

                {!fresh && (
                  <p className="text-[10px] leading-snug text-slate-400 dark:text-slate-500 line-through mb-1">
                    {it.original}
                  </p>
                )}

                {it.apply ? (
                  <>
                    <textarea
                      value={it.text}
                      onChange={(e) => onEdit(it.id, e.target.value)}
                      rows={2}
                      className="w-full text-[16px] sm:text-[11px] leading-snug bg-transparent text-slate-700 dark:text-slate-200 resize-none focus:outline-none"
                    />
                    {hasPh && (
                      <p className="text-[9px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> Replace the [bracketed] parts with
                        your real numbers
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                    {fresh ? '(won’t be added)' : it.original}
                  </p>
                )}
              </div>
            );
          })}
      </div>

      {ready && nothingToApply && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full text-xs font-bold px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3 h-3" /> Back to coach
          </button>
        </div>
      )}

      {ready && !nothingToApply && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          {unfilled > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2 flex items-start gap-1">
              <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
              Fill in the [bracketed] numbers with your real figures (or edit them out) to apply —
              that’s what turns the coach’s flag green.
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
            <button
              onClick={onApply}
              disabled={willWrite === 0 || applying || unfilled > 0}
              title={
                unfilled > 0 ? 'Fill in or remove the [bracketed] placeholders first' : undefined
              }
              className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white inline-flex items-center justify-center gap-1.5"
            >
              {applying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              {unfilled > 0 ? `Fill ${unfilled} number${unfilled > 1 ? 's' : ''}` : 'Apply to role'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

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
const Typewriter = ({ text = '', speed = 16, instant = false, onDone }) => {
  const [shown, setShown] = useState(instant ? text : '');
  const [prevText, setPrevText] = useState(text);
  if (text !== prevText) {
    setPrevText(text);
    setShown(instant ? text : '');
  }
  useEffect(() => {
    if (!text) return undefined;
    // Already seen this exact message (e.g. reopening the coach on the same step) —
    // show it in full at once instead of re-typing it out every time.
    if (instant) {
      setShown(text);
      onDone?.();
      return undefined;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.(); // coach finished "speaking" — lets the card reveal its opt-in offer
      }
    }, speed);
    return () => clearInterval(id);
    // onDone intentionally omitted — it fires exactly once when typing completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, instant]);
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
  <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 rounded-full bg-white/70 dark:bg-slate-900/40 flex items-center justify-center text-slate-400">
          <Lock className="w-3.5 h-3.5" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          AI Coach
        </span>
      </div>
    </div>
    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
      Your CV Health above is <strong>free</strong> — track it as you build. Unlock the{' '}
      <strong>AI Coach</strong> for live, role-aware guidance and a review of each section against
      the job you’re targeting.
    </p>
    <button
      onClick={onUpgrade}
      className="mt-3 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 inline-flex items-center gap-1.5 transition-colors"
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
  messageSeen = false,
  onMessageDone,
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
              className="text-[11px] font-semibold px-2.5 py-1.5 min-h-[36px] inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/50 disabled:opacity-40 transition-colors"
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
              className="mt-2 text-[11px] font-bold px-3 py-1.5 min-h-[36px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors"
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
            className="text-[11px] font-bold px-3 py-1.5 min-h-[36px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Recheck
          </button>
          <button
            disabled={loading}
            onClick={() => {
              onInteraction?.({ ignored: true });
              onQuickReply?.(quickReplies.ignoreSignal);
            }}
            className="text-[11px] font-semibold px-3 py-1.5 min-h-[36px] inline-flex items-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/50 disabled:opacity-40 transition-colors"
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
              <Typewriter
                text={coaching.message}
                instant={messageSeen}
                onDone={() => {
                  onMessageDone?.();
                }}
              />
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
const Journey = ({ health, cvComplete, scanReady, isPaidHint, onEnterScan }) => {
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
        {scanReady ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3"
          >
            <p className="text-xs font-extrabold mb-1 text-emerald-800 dark:text-emerald-200">
              {cvComplete ? 'Your CV’s ready! 🎉' : 'Ready to scan'}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mb-2">
              {cvComplete
                ? 'Every section’s done. See how it matches a real role.'
                : 'See how your CV matches a real role — the more complete it is, the sharper the read.'}
            </p>
            <button
              onClick={onEnterScan}
              className="w-full text-sm font-bold px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-2"
            >
              <ScanLine className="w-4 h-4" />
              {isPaidHint ? 'Run ATS Deep Scan' : 'Run free Deep Scan'}
            </button>
          </motion.div>
        ) : (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3 h-3 shrink-0" />
            Add a role, a few skills, or a short summary to unlock your Deep Scan.
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
const RoleMatchBand = ({ roleMatch, completeness, missing = [], onGoSkills }) => {
  const [showAll, setShowAll] = useState(false);
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
      {missing.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Add the ones genuinely yours
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {roleMatch.covered}/{roleMatch.total} covered
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(showAll ? missing : missing.slice(0, 8)).map((k, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                {k.importance === 'must_have' && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                    title="Must-have"
                  />
                )}
                {k.name}
              </span>
            ))}
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            {missing.length > 8 ? (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-[9.5px] font-mono uppercase tracking-wide text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showAll ? 'show fewer' : `+${missing.length - 8} more`}
              </button>
            ) : (
              <span />
            )}
            {onGoSkills && (
              <button
                onClick={onGoSkills}
                className="text-[11px] font-bold text-slate-800 dark:text-slate-100 hover:opacity-70 inline-flex items-center gap-1 transition-opacity"
              >
                Add in Skills <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

// Steps the coach verifies LIVE and deterministically (no AI round-trip), so they
// re-verify the instant they're complete. Contact is pure fill-in fields, so its
// scripted verdict (computed from liveCvData) is exact and updates as you type.
const LIVE_STEPS = new Set(['heading', 'finalize']);

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
  const {
    coachState: aiByStep,
    setCoachState: setAiByStep,
    applyRoleEdit,
    steps,
    goToStep,
  } = useCVBuilder();

  // ── Top fixes (free, deterministic) ──
  // Flatten every unmet, point-bearing requirement of an incomplete (non-recommended)
  // section into a single list ranked by projected point gain, each linking to the
  // builder step that fixes it. Re-derives on every score change — completing a
  // requirement drops its row and the Scoreboard climbs.
  const fixes = useMemo(() => {
    const out = [];
    for (const s of health.sections) {
      if (s.recommended || s.status === 'complete') continue;
      for (const r of s.requirements || []) {
        if (r.met || !r.gain) continue;
        out.push({
          id: `${s.id}:${r.label}`,
          sectionTitle: s.title,
          label: r.label,
          gain: r.gain,
          stepId: SECTION_STEP[s.id],
        });
      }
    }
    return out.sort((a, b) => b.gain - a.gain);
  }, [health]);
  const goToFix = (stepId) => {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx >= 0) goToStep(idx);
  };

  // ── Sharpen fixes (AI rewrite, priced in credits) ──
  // Scans ALL roles/projects (not just the current step) for phrasing the AI
  // rewrite can fix — passive openers and buzzwords. Each becomes a "Sharpen"
  // row that opens the existing rewrite preview.
  const sharpenFixes = useMemo(() => {
    const out = [];
    const scan = (list, section) =>
      (list || []).forEach((e) => {
        const phrasing = roleIssues(e.description || '').filter(
          (x) => x === 'Passive opener' || x === 'Buzzwords'
        );
        if (phrasing.length)
          out.push({
            id: `${section}:${e._sortId}`,
            kind: 'rewrite',
            section,
            sortId: e._sortId,
            title: e.title || (section === 'experience' ? 'Untitled role' : 'Untitled project'),
            reason: phrasing.join(' · '),
          });
      });
    scan(cvData.experience, 'experience');
    scan(cvData.projects, 'project');
    return out;
  }, [cvData.experience, cvData.projects]);
  const allFixes = useMemo(
    () => [...fixes.map((f) => ({ ...f, kind: 'go' })), ...sharpenFixes],
    [fixes, sharpenFixes]
  );

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
  // The uncovered JD keywords (must-haves first) — honest "add these if genuinely
  // yours" guidance surfaced in the free Role Match band. No network: the coverage
  // payload already flags each keyword's `covered`.
  const missingKeywords = useMemo(() => {
    const results = coverage?.results || [];
    return results
      .filter((r) => !r.covered)
      .sort(
        (a, b) =>
          (b.importance === 'must_have' ? 1 : 0) - (a.importance === 'must_have' ? 1 : 0)
      );
  }, [coverage]);
  const cvComplete = health.sections.every((s) => s.recommended || s.status === 'complete');
  // Mirrors the backend enoughCv guard (deepScan): unlock the Deep Scan CTA as soon
  // as there's something real to scan, not at 100% — the backend refuses (and spends
  // no taste on) a too-empty CV, so this can safely open early.
  const scanReady = useMemo(() => {
    const exp = cvData.experience || [];
    const skills = (cvData.skills || []).filter(Boolean);
    const projects = cvData.projects || [];
    const summary = (cvData.professionalSummary || '').trim();
    return exp.length >= 1 || skills.length >= 3 || projects.length >= 1 || summary.length >= 40;
  }, [cvData.experience, cvData.skills, cvData.projects, cvData.professionalSummary]);
  const isPaidHint = user?.plan === 'paid';
  // Roles the user has sharpened this session (persisted in coachState/sessionStorage),
  // so their rows render the green "Sharpened ✓" state. See applyRewrite.
  const appliedRoles = aiByStep._appliedRoles || {};

  const [mode, setMode] = useState('coach'); // 'coach' | 'scan'
  const [jd, setJd] = useState(cvData.targetJob?.description || '');
  const [scan, setScan] = useState(null); // server response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { message, agent? }

  // ── Role-targeted rewrites + recheck (the "fix it" loop) ──
  // `rewrite` drives the preview modal; null when closed. `recheckSummary` holds
  // the green-flip result (which flags cleared + score delta) after a recheck.
  const [rewrite, setRewrite] = useState(null);
  const [applying, setApplying] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [recheckSummary, setRecheckSummary] = useState(null);

  // Every work-history role + project, with the recruiter flags it triggered (keyed
  // off the stable _sortId the scan reports in each flag's `affected`). Drives the
  // "Tailor your bullets" fix station.
  const scanEntries = useMemo(() => {
    const exp = (cvData.experience || []).map((e) => ({
      section: 'experience',
      sortId: e._sortId,
      title: e.title || 'Untitled role',
      subtitle: e.company || '',
    }));
    const proj = (cvData.projects || []).map((p) => ({
      section: 'project',
      sortId: p._sortId,
      title: p.title || 'Untitled project',
      subtitle: '',
    }));
    return [...exp, ...proj];
  }, [cvData.experience, cvData.projects]);

  const issuesBySortId = useMemo(() => {
    const map = {};
    (scan?.redFlags || []).forEach((f) =>
      (f.affected || []).forEach((a) => {
        if (!a.sortId) return;
        (map[a.sortId] = map[a.sortId] || []).push(f.label);
      })
    );
    return map;
  }, [scan]);

  // Surgically improve a role's bullets and open the preview. The server keeps the
  // strong bullets (keep:true) and rewrites only the weak ones. Server 402 → 'locked'.
  // Each item: { id, original, keep, reason, text, apply } where `apply` means "use
  // the improved/new text" (vs keeping the original).
  const openRewrite = async (section, sortId, title) => {
    setRewrite({ section, sortId, title, loading: true, error: null, items: [] });
    try {
      const data = await CVService.coachRewriteRole(draftId, section, sortId);
      setRewrite({
        section,
        sortId,
        title: data.title || title,
        loading: false,
        error: null,
        items: (data.bullets || []).map((b, i) => ({
          id: i,
          original: b.original ?? null,
          keep: !!b.keep,
          reason: b.reason || '',
          text: b.text || b.original || '',
          // Default: apply improvements + new bullets; kept bullets stay as the original.
          apply: b.original === null ? true : !b.keep,
        })),
      });
    } catch (err) {
      // Out of credits — close the preview and nudge to top up (paid tiers never
      // hit this; they draw from their allowance).
      if (err?.response?.status === 403 || err?.response?.data?.code === 'INSUFFICIENT_CREDITS') {
        toast.error("You're out of credits — earn more or top up to rewrite.");
        setRewrite(null);
        return;
      }
      const locked = err?.response?.status === 402;
      setRewrite((r) =>
        r
          ? {
              ...r,
              loading: false,
              error: locked
                ? 'locked'
                : err?.response?.data?.message || 'Could not improve this role. Please try again.',
            }
          : r
      );
    }
  };

  const toggleItem = (id) =>
    setRewrite((r) =>
      r
        ? { ...r, items: r.items.map((it) => (it.id === id ? { ...it, apply: !it.apply } : it)) }
        : r
    );
  const editItem = (id, text) =>
    setRewrite((r) =>
      r ? { ...r, items: r.items.map((it) => (it.id === id ? { ...it, text } : it)) } : r
    );

  // Merge the choices back into the role IN ORDER: kept bullets stay verbatim, weak
  // bullets become their rewrite (or stay original if the user toggled the fix off),
  // and accepted new bullets are appended. Only the weak lines ever change.
  const applyRewrite = async () => {
    if (!rewrite) return;
    const lines = (rewrite.items || [])
      .flatMap((it) => {
        if (it.original === null) return it.apply && it.text.trim() ? [it.text] : []; // new bullet
        if (it.keep) return [it.original]; // already strong — untouched
        return [it.apply ? it.text : it.original]; // weak: rewrite, or keep original
      })
      .map((t) => `• ${t.trim().replace(/^[•\-*\s]+/, '')}`)
      .filter((l) => l.length > 2);
    if (lines.length === 0) {
      toast.error('Nothing to apply.');
      return;
    }
    setApplying(true);
    try {
      const ok = await applyRoleEdit(rewrite.section, rewrite.sortId, lines.join('\n'));
      if (ok) {
        // Mark this role sharpened so its row flips to the green "Sharpened ✓" state.
        // Persisted in coachState (sessionStorage) so it survives panel remounts.
        setAiByStep((m) => ({
          ...m,
          _appliedRoles: { ...(m._appliedRoles || {}), [rewrite.sortId]: true },
        }));
        toast.success(`Sharpened ${rewrite.title} ✓`);
        setRewrite(null);
      }
    } finally {
      setApplying(false);
    }
  };

  // Re-verify after fixes: recompute red-flags + fit score, then show which
  // originally-flagged items cleared (green) and how the score moved.
  const runRecheck = async () => {
    if (rechecking || !scan) return;
    const prevLabels = (scan.redFlags || []).map((f) => f.label);
    const prevScore = scan.jobMatch?.available ? scan.jobMatch.fitScore : null;
    setRechecking(true);
    try {
      const res = await CVService.coachRecheck(draftId);
      const newLabels = (res.redFlags || []).map((f) => f.label);
      const resolved = prevLabels.filter((l) => !newLabels.includes(l));
      const newScore = res.jobMatch?.available ? res.jobMatch.fitScore : null;
      setScan((s) => ({ ...s, jobMatch: res.jobMatch, redFlags: res.redFlags }));
      setRecheckSummary({ resolved, from: prevScore, to: newScore });
    } catch (err) {
      const locked = err?.response?.status === 402;
      toast.error(
        locked
          ? 'Upgrade to recheck your CV.'
          : err?.response?.data?.message || 'Recheck failed. Please try again.'
      );
    } finally {
      setRechecking(false);
    }
  };

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
    setRecheckSummary(null);
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
    setRecheckSummary(null);
    setRewrite(null);
  };

  const tooEmpty = scan?.tooEmpty;
  const unlocked = scan && !scan.locked && !scan.tooEmpty;
  const showLocked = (scan && scan.locked) || error?.agent;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {rewrite ? (
        // The rewrite preview TAKES OVER the panel (the coach area becomes the
        // "sharpen this role" surface). Closing/applying clears `rewrite` and
        // animates back to whichever mode launched it — coach card or Deep Scan.
        <motion.div
          key="rewrite"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2 }}
        >
          <RewritePreview
            rewrite={rewrite}
            applying={applying}
            onToggle={toggleItem}
            onEdit={editItem}
            onApply={applyRewrite}
            onClose={() => setRewrite(null)}
            onRetry={() => openRewrite(rewrite.section, rewrite.sortId, rewrite.title)}
          />
        </motion.div>
      ) : mode === 'coach' ? (
        <motion.div
          key="coach"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
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
                  // The coach only "types" a message the first time it's shown. Once
                  // seen, reopening the panel on the same step renders it in full — no
                  // re-writing. Tracked in the persisted context so it survives remount.
                  messageSeen={!!aiByStep._typedMsgs?.[coaching.message]}
                  onMessageDone={() =>
                    setAiByStep((m) =>
                      m._typedMsgs?.[coaching.message]
                        ? m
                        : {
                            ...m,
                            _typedMsgs: { ...(m._typedMsgs || {}), [coaching.message]: true },
                          }
                    )
                  }
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

          {/* CV Health hero — the live, free score. Above the isPaidHint split so
              it surfaces for free and paid alike. */}
          <Scoreboard score={health.score} healthMeta={healthMeta} />

          {/* Ranked, tappable gap list — the closed fix loop. Free and paid. */}
          <TopFixes
            items={allFixes}
            ptsToStrong={Math.max(0, 80 - health.score)}
            isPaid={isPaidHint}
            rewriteCost={CREDIT_COSTS.REWRITE_ROLE ?? 1}
            onGo={goToFix}
            onRewrite={openRewrite}
          />

          {/* Role Match honesty band — keeps a complete CV from reading as a great
              fit for the wrong job. Free, shown to everyone once applicable. */}
          {roleMatch.applicable && (
            <RoleMatchBand
              roleMatch={roleMatch}
              completeness={health.score}
              missing={missingKeywords}
              onGoSkills={() => goToFix('skills')}
            />
          )}

          {/* The coach's view of where you are — journey + Deep-Scan finale. */}
          <Journey
            health={health}
            cvComplete={cvComplete}
            scanReady={scanReady}
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

              {/* Green-flip celebration after a recheck — which originally-flagged
                  items cleared, and how the match score moved. */}
              {recheckSummary && (
                <Reveal>
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Recheck complete
                    </p>
                    {recheckSummary.resolved.length > 0 ? (
                      <div className="mt-1.5 space-y-1">
                        {recheckSummary.resolved.map((l) => (
                          <p
                            key={l}
                            className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"
                          >
                            <Check className="w-3 h-3 shrink-0" /> Fixed: {l}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                        No flags cleared yet — apply a rewrite below, then recheck.
                      </p>
                    )}
                    {recheckSummary.from != null &&
                      recheckSummary.to != null &&
                      recheckSummary.to !== recheckSummary.from && (
                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mt-1.5">
                          Match {recheckSummary.from}% → {recheckSummary.to}%
                          {recheckSummary.to > recheckSummary.from ? ' ▲' : ''}
                        </p>
                      )}
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

              {/* Fix station — rewrite each role's bullets to this job, then recheck. */}
              <Reveal delay={0.24}>
                <TailorCard
                  entries={scanEntries}
                  issuesBySortId={issuesBySortId}
                  isPaid={scan.isPaid}
                  appliedSortIds={appliedRoles}
                  onRewrite={openRewrite}
                  onUpgrade={() => navigate('/upgrade')}
                />
              </Reveal>

              <div className="flex gap-2 pt-1">
                {scan.isPaid && (
                  <button
                    onClick={runRecheck}
                    disabled={rechecking}
                    className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white inline-flex items-center justify-center gap-1.5"
                  >
                    {rechecking ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Recheck
                  </button>
                )}
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
                  className="w-full text-[16px] sm:text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-2.5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none custom-scrollbar"
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
