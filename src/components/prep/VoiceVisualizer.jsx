import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Animated audio-level meter (moving bars, like a recording app). Given a live
// MediaStream it taps a Web Audio AnalyserNode and draws ~22 bars scaled to the
// real sound level. `active` highlights it on the user's turn. Drawing happens
// entirely on a canvas via requestAnimationFrame — no React state in the loop —
// so it never trips the strict set-state-in-effect rule.
const BAR_COUNT = 22;

const VoiceVisualizer = ({ stream, active = false, dark = false }) => {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const activeRef = useRef(active);
  // Same ref trick as `active`: the draw loop reads the bar colour every frame,
  // and putting `dark` in the effect deps would tear down and rebuild the
  // AudioContext on a theme toggle. A ref keeps the colour live without that.
  const darkRef = useRef(dark);

  // Keep the ref in sync without touching it during render (lint: react-hooks/refs).
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    darkRef.current = dark;
  }, [dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const dpr = window.devicePixelRatio || 1;

    let audioCtx = null;
    let analyser = null;
    let source = null;
    let raf = 0;
    let freq = null;
    let t = 0;

    if (stream) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioCtx();
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser); // NOT to destination — avoids mic→speaker loop
        freq = new Uint8Array(analyser.frequencyBinCount);
      } catch {
        analyser = null;
      }
    }

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const on = activeRef.current;
      const color = on
        ? darkRef.current
          ? 'rgba(226,232,240,0.95)'
          : 'rgba(15,23,42,0.9)'
        : 'rgba(148,163,184,0.6)';
      const gap = 4;
      const barW = Math.max(2, (w - gap * (BAR_COUNT - 1)) / BAR_COUNT);
      const mid = h / 2;

      if (analyser) analyser.getByteFrequencyData(freq);

      for (let i = 0; i < BAR_COUNT; i += 1) {
        let level;
        if (analyser) {
          // Sample across the spectrum; emphasize voice band a touch.
          const idx = Math.floor((i / BAR_COUNT) * freq.length * 0.7);
          level = freq[idx] / 255;
        } else {
          // Idle shimmer when there's no stream.
          level = ((Math.sin(t / 12 + i * 0.5) + 1) / 2) * (on ? 0.5 : 0.18);
        }
        const barH = Math.max(3, level * (h * 0.92));
        const x = i * (barW + gap);
        ctx.fillStyle = color;
        const r = Math.min(barW / 2, 3);
        const y = mid - barH / 2;
        // rounded bar
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + barW, y, x + barW, y + barH, r);
        ctx.arcTo(x + barW, y + barH, x, y + barH, r);
        ctx.arcTo(x, y + barH, x, y, r);
        ctx.arcTo(x, y, x + barW, y, r);
        ctx.closePath();
        ctx.fill();
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      try {
        source && source.disconnect();
        audioCtx && audioCtx.close();
      } catch {
        /* noop */
      }
    };
  }, [stream]);

  return (
    <div
      className={`w-full rounded-2xl border p-4 transition-colors ${
        dark
          ? active
            ? 'border-slate-700 bg-slate-800/40'
            : 'border-white/10 bg-white/5'
          : active
            ? 'border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-16" />
      <p
        className={`mt-2 text-center text-[11px] font-bold uppercase tracking-wider ${
          active
            ? dark
              ? 'text-white'
              : 'text-slate-900 dark:text-slate-100'
            : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        {active
          ? t('interviewPrep.voiceVisualizer.listening')
          : t('interviewPrep.voiceVisualizer.yourTurnLightsUp')}
      </p>
    </div>
  );
};

export default VoiceVisualizer;
