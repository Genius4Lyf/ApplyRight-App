import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Mic, Check, AlertTriangle } from 'lucide-react';
import VoiceVisualizer from './VoiceVisualizer';

// Pre-interview personalization + device check for the live (realtime) mode.

// Friendly names + gender for the OpenAI realtime voices. `id` is the actual
// OpenAI voice sent to the session. Gender is a best-guess label for the
// perceived voice (OpenAI doesn't officially gender them) — easy to swap if a
// voice sounds different on a real run.
const VOICES = [
  { id: 'marin', name: 'Obiageli', gender: 'Female' },
  { id: 'cedar', name: 'Daniel', gender: 'Male' },
  { id: 'shimmer', name: 'Amara', gender: 'Female' },
];

const STYLES = [
  {
    id: 'balanced',
    label: 'Balanced',
    blurb:
      'A natural mix of behavioural, motivation, and role-relevant skill questions — the all-rounder.',
    examples: [
      'Tell me about a project you’re proud of.',
      'Why are you interested in this role?',
      'How would you approach this kind of work?',
    ],
  },
  {
    id: 'screening',
    label: 'Screening',
    blurb:
      'A friendly first-round call — focused on fit, motivation, and your background. Kept broad, not deeply technical.',
    examples: [
      'What draws you to this role?',
      'Walk me through your background.',
      'What are you looking for in your next role?',
    ],
  },
  {
    id: 'technical',
    label: 'Technical',
    blurb:
      'A deep-dive on the hard skills the role needs — specifics, trade-offs, and how you’d solve real problems.',
    examples: [
      'Walk me through how you’d design X.',
      'What trade-offs did you weigh on Y?',
      'How would you debug or improve this?',
    ],
  },
  {
    id: 'behavioral',
    label: 'Behavioural',
    blurb:
      'Past situations in STAR form — what you actually did and the outcome, to show how you work.',
    examples: [
      'Tell me about a time you handled conflict.',
      'Describe a failure and what you learned.',
      'Give an example of leading under pressure.',
    ],
  },
];

// How hard the panel pushes. Set before the interview — the interviewers act like
// real people on the team making sure the candidate is genuinely prepared.
const CHALLENGES = [
  {
    id: 'gentle',
    label: 'Gentle',
    blurb: 'Supportive and encouraging — fair questions, gentle nudges, confidence-building.',
  },
  {
    id: 'realistic',
    label: 'Realistic',
    blurb:
      'Like a real, fair interview — no vague answers; specifics, evidence, and pointed follow-ups.',
  },
  {
    id: 'tough',
    label: 'Challenging',
    blurb:
      'A demanding panel — they pressure-test your claims, push back on weak answers, and make you defend your reasoning against the CV + job.',
  },
];

const Pill = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none cursor-pointer ${
      active
        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
    }`}
  >
    {children}
  </button>
);

export const VoiceStyleSelector = ({
  voice,
  style,
  onVoiceChange,
  onStyleChange,
  className = '',
  showVoice = true,
  showStyle = true,
  borderless = false,
  challenge = 'realistic',
  onChallengeChange = null,
}) => (
  <div
    className={
      borderless
        ? `relative z-10 space-y-2.5 ${className}`
        : `relative z-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 ${className}`
    }
  >
    {/* Voice picker only applies to the SOLO (free-taste) interview. Panel
        interviews give each interviewer their own voice, so it's hidden there. */}
    {showVoice && (
      <div>
        <p className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
          Interviewer voice
        </p>
        <div className="flex flex-wrap gap-1.5">
          {VOICES.map((v) => (
            <Pill key={v.id} active={voice === v.id} onClick={() => onVoiceChange(v.id)}>
              {v.name} <span className="font-normal opacity-70">· {v.gender}</span>
            </Pill>
          ))}
        </div>
      </div>
    )}
    {/* Interview style — only for the generic (free/solo) interview. When the
        candidate picks a specific role, the role itself sets the interview type. */}
    {showStyle && (
      <div>
        <p className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
          Interview style
        </p>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((s) => (
            <Pill key={s.id} active={style === s.id} onClick={() => onStyleChange(s.id)}>
              {s.label}
            </Pill>
          ))}
        </div>
        {STYLES.filter((s) => s.id === style).map((sel) => (
          <div key={sel.id} className="mt-1.5 space-y-1">
            <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed">
              {sel.blurb}
            </p>
            <details className="group cursor-pointer select-none">
              <summary className="text-[11px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline list-none [&::-webkit-details-marker]:hidden flex items-center gap-0.5">
                <span>View example questions</span>
                <span className="text-[8px] transition-transform duration-200 group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <ul className="mt-1 ml-1.5 pl-2 border-l border-slate-150 dark:border-slate-800 space-y-0.5">
                {sel.examples.map((q, i) => (
                  <li
                    key={i}
                    className="text-xs italic text-slate-500 dark:text-slate-400 leading-relaxed"
                  >
                    “{q}”
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ))}
      </div>
    )}
    {/* Challenge level — how hard the panel pushes. Only shown when wired up. */}
    {onChallengeChange && (
      <div>
        <p className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
          Challenge level
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CHALLENGES.map((c) => (
            <Pill key={c.id} active={challenge === c.id} onClick={() => onChallengeChange(c.id)}>
              {c.label}
            </Pill>
          ))}
        </div>
        {CHALLENGES.filter((c) => c.id === challenge).map((sel) => (
          <p
            key={sel.id}
            className="mt-1.5 text-xs text-slate-550 dark:text-slate-450 leading-relaxed"
          >
            {sel.blurb}
          </p>
        ))}
      </div>
    )}
  </div>
);

// Mic + speaker check BEFORE connecting (so a dead mic doesn't waste a paid
// session). Requesting the mic here also surfaces a permission denial early.
export const DeviceCheck = ({ inline = false, onDone }) => {
  const [open, setOpen] = useState(inline);
  const [stream, setStream] = useState(null);
  const [denied, setDenied] = useState(false);
  const ctxRef = useRef(null);

  useEffect(() => {
    if (inline) {
      setOpen(true);
    }
  }, [inline]);

  useEffect(() => {
    if (!open) return undefined;
    let live;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        live = s;
        setStream(s);
      })
      .catch(() => setDenied(true));
    return () => {
      cancelled = true;
      if (live) live.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [open]);

  // Tear down any test-tone audio context on unmount.
  useEffect(() => () => ctxRef.current?.close?.(), []);

  const playTestSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      /* test tone is best-effort */
    }
  };

  if (inline) {
    return (
      <div className="w-full flex flex-col justify-between h-full">
        <div>
          <p className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-4 text-center">
            Device check
          </p>

          {denied ? (
            <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-350 bg-rose-50/50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                We couldn’t access your microphone. Allow mic access in your browser, then try
                again.
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <VoiceVisualizer stream={stream} active={!!stream} />
              <p className="mt-1.5 text-xs text-slate-550 dark:text-slate-450 flex items-center gap-1.5 justify-center">
                {stream ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Say something — the bars
                    should move.
                  </>
                ) : (
                  'Requesting microphone…'
                )}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={playTestSound}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" /> Play test sound
          </button>
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setDenied(false);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 cursor-pointer select-none"
        >
          <Mic className="w-3.5 h-3.5" /> Test your mic &amp; sound first
        </button>
      ) : (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl relative animate-in fade-in zoom-in-95 duration-200 text-left">
            <p className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-2">
              Device check
            </p>

            {denied ? (
              <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-350 bg-rose-50/50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  We couldn’t access your microphone. Allow mic access in your browser, then try
                  again.
                </span>
              </div>
            ) : (
              <>
                <VoiceVisualizer stream={stream} active={!!stream} />
                <p className="mt-1.5 text-xs text-slate-550 dark:text-slate-455 flex items-center gap-1">
                  {stream ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Say something — the bars
                      should move.
                    </>
                  ) : (
                    'Requesting microphone…'
                  )}
                </p>
              </>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={playTestSound}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" /> Play test sound
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
