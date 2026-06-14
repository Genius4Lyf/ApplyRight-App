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

const Pill = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none cursor-pointer ${
      active
        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
    }`}
  >
    {children}
  </button>
);

export const VoiceStyleSelector = ({ voice, style, onVoiceChange, onStyleChange }) => (
  <div className="relative z-10 mt-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
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
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
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
        <div key={sel.id} className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <p className="text-[11px] text-slate-600 leading-relaxed">{sel.blurb}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Example questions
          </p>
          <ul className="mt-1 space-y-0.5">
            {sel.examples.map((q, i) => (
              <li key={i} className="text-[11px] italic text-slate-500 leading-relaxed">
                “{q}”
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

// Mic + speaker check BEFORE connecting (so a dead mic doesn't waste a paid
// session). Requesting the mic here also surfaces a permission denial early.
export const DeviceCheck = () => {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [denied, setDenied] = useState(false);
  const ctxRef = useRef(null);

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

  return (
    <div className="relative z-10 mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setDenied(false);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <Mic className="w-3.5 h-3.5" /> Test your mic &amp; sound first
        </button>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
            Device check
          </p>

          {denied ? (
            <div className="flex items-start gap-2 text-xs text-rose-600">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                We couldn’t access your microphone. Allow mic access in your browser, then try
                again.
              </span>
            </div>
          ) : (
            <>
              <VoiceVisualizer stream={stream} active={!!stream} />
              <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                {stream ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" /> Say something — the bars should
                    move.
                  </>
                ) : (
                  'Requesting microphone…'
                )}
              </p>
            </>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={playTestSound}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" /> Play test sound
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
