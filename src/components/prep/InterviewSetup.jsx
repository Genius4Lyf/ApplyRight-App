import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Mic, Check, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VoiceVisualizer from './VoiceVisualizer';

// Pre-interview personalization + device check for the live (realtime) mode.

// Friendly names + gender for the OpenAI realtime voices. `id` is the actual
// OpenAI voice sent to the session. `name` is a proper noun (untranslated);
// `genderKey` resolves via t() at render. Gender is a best-guess label for the
// perceived voice (OpenAI doesn't officially gender them) — easy to swap if a
// voice sounds different on a real run.
const VOICES = [
  { id: 'marin', name: 'Obiageli', genderKey: 'interviewPrep.setup.voices.female' },
  { id: 'cedar', name: 'Daniel', genderKey: 'interviewPrep.setup.voices.male' },
  { id: 'shimmer', name: 'Amara', genderKey: 'interviewPrep.setup.voices.female' },
];

// `id` mirrors the backend style enum; label/blurb/examples resolve via t() at
// render (examples are indexed 0–2 under styles.<id>.examples).
const STYLES = [
  { id: 'balanced', exampleCount: 3 },
  { id: 'screening', exampleCount: 3 },
  { id: 'technical', exampleCount: 3 },
  { id: 'behavioral', exampleCount: 3 },
];

// How hard the panel pushes. Set before the interview — the interviewers act like
// real people on the team making sure the candidate is genuinely prepared.
// `id` mirrors the backend challenge enum; label/blurb resolve via t().
const CHALLENGES = [{ id: 'gentle' }, { id: 'realistic' }, { id: 'tough' }];

const Pill = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors select-none cursor-pointer ${
      active
        ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900 dark:border-white'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200'
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
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={
        borderless
          ? `relative z-10 space-y-2.5 ${className}`
          : `relative z-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-4 space-y-2.5 ${className}`
      }
    >
      {/* Voice picker only applies to the SOLO (free-taste) interview. Panel
          interviews give each interviewer their own voice, so it's hidden there. */}
      {showVoice && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2">
            {t('interviewPrep.setup.interviewerVoice')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VOICES.map((v) => (
              <Pill key={v.id} active={voice === v.id} onClick={() => onVoiceChange(v.id)}>
                {v.name} <span className="font-normal opacity-70">· {t(v.genderKey)}</span>
              </Pill>
            ))}
          </div>
        </div>
      )}
      {/* Interview style — only for the generic (free/solo) interview. When the
          candidate picks a specific role, the role itself sets the interview type. */}
      {showStyle && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2">
            {t('interviewPrep.setup.interviewStyle')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => (
              <Pill key={s.id} active={style === s.id} onClick={() => onStyleChange(s.id)}>
                {t(`interviewPrep.setup.styles.${s.id}.label`)}
              </Pill>
            ))}
          </div>
          {STYLES.filter((s) => s.id === style).map((sel) => (
            <div key={sel.id} className="mt-1.5 space-y-1">
              <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed">
                {t(`interviewPrep.setup.styles.${sel.id}.blurb`)}
              </p>
              <details className="group cursor-pointer select-none">
                <summary className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 list-none [&::-webkit-details-marker]:hidden flex items-center gap-0.5">
                  <span>{t('interviewPrep.setup.viewExamples')}</span>
                  <span className="text-[8px] transition-transform duration-200 group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <ul className="mt-1 ml-1.5 pl-2 border-l border-slate-150 dark:border-slate-800 space-y-0.5">
                  {Array.from({ length: sel.exampleCount }).map((_, i) => (
                    <li
                      key={i}
                      className="text-xs italic text-slate-500 dark:text-slate-400 leading-relaxed"
                    >
                      “{t(`interviewPrep.setup.styles.${sel.id}.examples.${i}`)}”
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
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            {t('interviewPrep.setup.challengeLevel')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CHALLENGES.map((c) => (
              <Pill key={c.id} active={challenge === c.id} onClick={() => onChallengeChange(c.id)}>
                {t(`interviewPrep.setup.challenges.${c.id}.label`)}
              </Pill>
            ))}
          </div>
          {CHALLENGES.filter((c) => c.id === challenge).map((sel) => (
            <p
              key={sel.id}
              className="mt-1.5 text-xs text-slate-550 dark:text-slate-450 leading-relaxed"
            >
              {t(`interviewPrep.setup.challenges.${sel.id}.blurb`)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// Mic + speaker check BEFORE connecting (so a dead mic doesn't waste a paid
// session). Requesting the mic here also surfaces a permission denial early.
export const DeviceCheck = ({ inline = false, onDone }) => {
  const { t } = useTranslation();
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
            {t('interviewPrep.setup.deviceCheck')}
          </p>

          {denied ? (
            <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-350 bg-rose-50/50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('interviewPrep.setup.micDenied')}</span>
            </div>
          ) : (
            <div className="space-y-4">
              <VoiceVisualizer stream={stream} active={!!stream} />
              <p className="mt-1.5 text-xs text-slate-550 dark:text-slate-450 flex items-center gap-1.5 justify-center">
                {stream ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />{' '}
                    {t('interviewPrep.setup.saySomething')}
                  </>
                ) : (
                  t('interviewPrep.setup.requestingMic')
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
            <Volume2 className="w-3.5 h-3.5" /> {t('interviewPrep.setup.playTestSound')}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            {t('interviewPrep.setup.done')}
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-900 dark:hover:decoration-slate-100 cursor-pointer select-none"
        >
          <Mic className="w-3.5 h-3.5" /> {t('interviewPrep.setup.testMicFirst')}
        </button>
      ) : (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl relative animate-in fade-in zoom-in-95 duration-200 text-left">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2">
              {t('interviewPrep.setup.deviceCheck')}
            </p>

            {denied ? (
              <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-350 bg-rose-50/50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t('interviewPrep.setup.micDenied')}</span>
              </div>
            ) : (
              <>
                <VoiceVisualizer stream={stream} active={!!stream} />
                <p className="mt-1.5 text-xs text-slate-550 dark:text-slate-455 flex items-center gap-1">
                  {stream ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />{' '}
                      {t('interviewPrep.setup.saySomething')}
                    </>
                  ) : (
                    t('interviewPrep.setup.requestingMic')
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
                <Volume2 className="w-3.5 h-3.5" /> {t('interviewPrep.setup.playTestSound')}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('interviewPrep.setup.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
