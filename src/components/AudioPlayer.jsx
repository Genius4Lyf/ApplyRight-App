import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
    <div className="select-none w-full">
      {/* hidden native element — we drive it with our own controls */}
      <audio ref={audioRef} src={src} autoPlay={autoPlay} preload="metadata" className="hidden">
        <track kind="captions" />
      </audio>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        {/* Play/Pause & Skip Controls */}
        <div className="flex items-center gap-3 justify-center md:justify-start">
          <button
            type="button"
            onClick={() => skip(-10)}
            title={t('interviewPrep.audioPlayer.back10')}
            aria-label={t('interviewPrep.audioPlayer.back10')}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>

          <button
            type="button"
            onClick={toggle}
            aria-label={
              playing ? t('interviewPrep.audioPlayer.pause') : t('interviewPrep.audioPlayer.play')
            }
            className="w-11 h-11 rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
          >
            {/* fill-current, not fill-white: the button inverts in dark mode, so the
                glyph has to follow text colour or it goes white-on-white. */}
            {playing ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => skip(10)}
            title={t('interviewPrep.audioPlayer.forward10')}
            aria-label={t('interviewPrep.audioPlayer.forward10')}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCw className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Progress bar and timeline */}
        <div className="flex-1 flex items-center gap-3.5 min-w-0">
          <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400 w-9 text-right shrink-0">
            {fmtTime(current)}
          </span>

          <div className="flex-1 py-2">
            <div
              ref={trackRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="group relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 cursor-pointer overflow-visible"
            >
              {/* Played portion */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-slate-900 dark:bg-white"
                style={{ width: `${pct}%` }}
              />
              {/* Knob — inverts against the ink fill so it stays visible mid-track */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-white shadow-md scale-90 group-hover:scale-110 active:scale-120 transition-transform"
                style={{ left: `${pct}%` }}
              />
            </div>
          </div>

          <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400 w-9 text-left shrink-0">
            {fmtTime(duration)}
          </span>
        </div>

        {/* Speed & Download */}
        <div className="flex items-center justify-center gap-2 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80 pt-3 md:pt-0 shrink-0">
          <button
            type="button"
            onClick={cycleSpeed}
            title={t('interviewPrep.audioPlayer.playbackSpeed')}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-205 dark:hover:bg-slate-700 transition-colors cursor-pointer tabular-nums min-w-[48px] text-center"
          >
            {SPEEDS[speedIdx]}x
          </button>

          {src && (
            <a
              href={src}
              download={downloadName}
              title={t('interviewPrep.audioPlayer.downloadRecording')}
              aria-label={t('interviewPrep.audioPlayer.downloadRecording')}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4.5 h-4.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
