import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Download } from 'lucide-react';

// On-brand audio player (replaces the default browser <audio controls> UI).
// Controls geared to reviewing an interview recording: play/pause, a scrubbable
// progress bar, current/total time, ±10s skip, playback speed, and download.
const SPEEDS = [1, 1.25, 1.5, 2];

const fmtTime = (s) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const AudioPlayer = ({
  src,
  autoPlay = false,
  durationHint = 0,
  downloadName = 'interview-recording.webm',
}) => {
  const audioRef = useRef(null);
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  // MediaRecorder (webm) recordings report duration as Infinity, so seed from the
  // known length when we have it; otherwise we resolve it below.
  const [duration, setDuration] = useState(durationHint || 0);
  const [speedIdx, setSpeedIdx] = useState(0);

  // Wire the (hidden) audio element's events. Handlers — not effect-body setState.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;
    let resolving = false;

    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuration(a.duration);
      } else if (!durationHint && (a.duration === Infinity || Number.isNaN(a.duration))) {
        // No duration in the metadata (MediaRecorder webm) and no hint — force the
        // browser to compute it by seeking far past the end, then snap back.
        resolving = true;
        a.currentTime = 1e101;
      }
    };
    const onDuration = () => {
      if (!Number.isFinite(a.duration) || a.duration <= 0) return;
      setDuration(a.duration);
      if (resolving) {
        resolving = false;
        a.currentTime = 0;
        setCurrent(0);
      }
    };
    const onTime = () => {
      if (resolving) return;
      if (!draggingRef.current) setCurrent(a.currentTime || 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      if (!resolving) setPlaying(false);
    };
    const onEnded = () => {
      if (!resolving) setPlaying(false);
    };
    const onEmptied = () => setCurrent(0);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onDuration);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    a.addEventListener('emptied', onEmptied);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onDuration);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('emptied', onEmptied);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const skip = (delta) => {
    const a = audioRef.current;
    if (!a) return;
    const max = duration || a.duration || 0;
    a.currentTime = Math.max(0, Math.min((a.currentTime || 0) + delta, max));
    setCurrent(a.currentTime);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  const seekToClientX = (clientX) => {
    const el = trackRef.current;
    const a = audioRef.current;
    if (!el || !a || !duration) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const t = frac * duration;
    a.currentTime = t;
    setCurrent(t);
  };

  const onPointerDown = (e) => {
    draggingRef.current = true;
    trackRef.current?.setPointerCapture?.(e.pointerId);
    seekToClientX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (draggingRef.current) seekToClientX(e.clientX);
  };
  const onPointerUp = () => {
    draggingRef.current = false;
  };

  const pct = duration ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3 select-none">
      {/* hidden native element — we drive it with our own controls */}
      <audio ref={audioRef} src={src} autoPlay={autoPlay} preload="metadata" className="hidden">
        <track kind="captions" />
      </audio>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          {playing ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          {/* scrubbable progress bar */}
          <div
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="group relative h-2 rounded-full bg-slate-200 cursor-pointer"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-indigo-500 shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-medium tabular-nums text-slate-400">
            <span>{fmtTime(current)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={() => skip(-10)}
            title="Back 10 seconds"
            aria-label="Back 10 seconds"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => skip(10)}
            title="Forward 10 seconds"
            aria-label="Forward 10 seconds"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={cycleSpeed}
            title="Playback speed"
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer tabular-nums"
          >
            {SPEEDS[speedIdx]}x
          </button>
          {src && (
            <a
              href={src}
              download={downloadName}
              title="Download"
              aria-label="Download recording"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
