import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, PhoneOff } from 'lucide-react';

// The call itself, standing where the textarea normally is.
//
// It REPLACES the composer rather than sitting beside it, because during a call there is
// nothing to type into and a disabled textarea would just be furniture. The coach already
// does exactly this in three of its four phases, so the seam existed.
//
// What the orb has to communicate, in order of importance:
//   1. that it is listening (otherwise people stop talking to check)
//   2. how long is left, because the minutes are finite and running out mid-sentence
//      without warning is the worst version of this feature
//   3. a way out that is impossible to miss
//
// The words go in the CHAT, not here. Captions inside the orb would be a second place to
// look, and the whole point of the design is that what was said becomes the transcript.
//
// The analyser runs entirely outside React — an rAF loop that setStates 60 times a second
// would re-render the chat stream underneath it. Same rule VoiceVisualizer follows.
const BARS = 28;

const AriaLiveOrb = ({ state = 'connecting', stream, secondsLeft, onEnd }) => {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const audioRef = useRef({ ctx: null, analyser: null, data: null, source: null });

  // Live level meter off the REMOTE stream — Aria's voice, not the user's. The user can
  // hear themselves; what they cannot otherwise tell is whether Aria is still talking or
  // has finished and is waiting for them.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx2d = canvas.getContext('2d');
    let analyser = null;
    let data = null;

    if (stream) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        data = new Uint8Array(analyser.frequencyBinCount);
        audioRef.current = { ctx, analyser, data, source };
      } catch {
        // No analyser is survivable — the orb falls back to a calm idle pulse. A call that
        // works without a visualiser is better than a visualiser that takes the call down.
        analyser = null;
      }
    }

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const { width, height } = canvas;
      ctx2d.clearRect(0, 0, width, height);

      let level = 0;
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        level = data.reduce((a, b) => a + b, 0) / data.length / 255;
      }

      const cx = width / 2;
      const cy = height / 2;
      const base = Math.min(width, height) * 0.24;
      const t0 = Date.now() / 600;

      for (let i = 0; i < BARS; i += 1) {
        const angle = (i / BARS) * Math.PI * 2;
        // A slow idle breath so a silent orb still reads as live, plus the real level on
        // top of it. Without the breath, "listening" looks identical to "crashed".
        const breath = 0.06 + 0.04 * Math.sin(t0 + i * 0.45);
        const reach = base * (1 + breath + level * 0.9);
        ctx2d.beginPath();
        ctx2d.moveTo(cx + Math.cos(angle) * base, cy + Math.sin(angle) * base);
        ctx2d.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
        ctx2d.lineCap = 'round';
        ctx2d.lineWidth = 2;
        ctx2d.strokeStyle = `rgba(148,163,184,${0.35 + level * 0.5})`;
        ctx2d.stroke();
      }

      ctx2d.beginPath();
      ctx2d.arc(cx, cy, base, 0, Math.PI * 2);
      ctx2d.fillStyle = 'rgba(148,163,184,0.14)';
      ctx2d.fill();
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      const { ctx, source } = audioRef.current;
      try {
        source?.disconnect();
        ctx?.close();
      } catch {
        /* already torn down */
      }
      audioRef.current = { ctx: null, analyser: null, data: null, source: null };
    };
  }, [stream]);

  const mmss = (n) => {
    const s = Math.max(0, Math.round(n || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const label =
    state === 'connecting'
      ? t('ariaStudio.ariaLive.connecting')
      : state === 'speaking'
        ? t('ariaStudio.ariaLive.speaking')
        : t('ariaStudio.ariaLive.listening');

  // Under a minute goes rose. It is the only colour in the component, and it is carrying
  // information rather than decorating: this is the moment to start wrapping up.
  const low = secondsLeft != null && secondsLeft <= 60;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <canvas ref={canvasRef} width={72} height={72} className="h-[72px] w-[72px]" />
          <Mic
            className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* aria-live so a screen-reader user is told the call connected and who has the
              floor — the canvas says nothing to them at all. */}
          <p
            aria-live="polite"
            className="text-[14px] font-semibold text-slate-800 dark:text-slate-100"
          >
            {label}
          </p>
          <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
            {t('ariaStudio.ariaLive.justTalk')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {secondsLeft != null && (
            <span
              className={`font-mono text-[12px] tabular-nums ${
                low ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {mmss(secondsLeft)}
            </span>
          )}
          <button
            type="button"
            onClick={onEnd}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:border-rose-400 hover:text-rose-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-rose-500 dark:hover:text-rose-400"
          >
            <PhoneOff className="h-3.5 w-3.5" aria-hidden="true" />
            {t('ariaStudio.ariaLive.end')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AriaLiveOrb;
