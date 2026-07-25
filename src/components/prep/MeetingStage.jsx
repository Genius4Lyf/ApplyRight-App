import React, { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BAR_COUNT = 4;

const MiniVoiceIndicator = ({ active, stream }) => {
  const barRefs = useRef([]);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!stream || !active) {
      return undefined;
    }

    let audioCtx = null;
    let analyser = null;
    let source = null;
    let raf = 0;
    let freq = null;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      analyser = null;
    }

    const update = () => {
      raf = requestAnimationFrame(update);
      if (!analyser) return;
      analyser.getByteFrequencyData(freq);

      // Voice energy sits in the low-mid bins. Raw per-bin levels are small, so
      // the candidate's bars looked tiny next to the interviewers' lively canned
      // animation. Average + amplify (GAIN) so normal speaking drives the bars to
      // a comparable height, with per-bar variation so it isn't a flat block.
      const GAIN = 3.4;
      const bins = Math.min(freq.length, 16);
      let sum = 0;
      for (let k = 1; k <= bins; k++) sum += freq[k];
      const energy = Math.min(1, (sum / bins / 255) * GAIN);

      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = barRefs.current[i];
        if (bar) {
          const idx = 1 + Math.floor((i / BAR_COUNT) * bins);
          const local = Math.min(1, (freq[idx] / 255) * GAIN);
          const scaleY = 0.2 + Math.max(energy * 0.6, local) * 0.8;
          bar.style.transform = `scaleY(${scaleY})`;
        }
      }
    };

    update();

    return () => {
      cancelAnimationFrame(raf);
      try {
        source && source.disconnect();
        audioCtx && audioCtx.close();
      } catch {
        /* ignore */
      }
    };
  }, [stream, active]);

  if (!active) return null;

  return (
    <div className="flex items-end gap-[3px] h-3.5 w-6 justify-center">
      {[...Array(BAR_COUNT)].map((_, i) => {
        const delay = `${i * 150}ms`;
        return (
          <span
            key={i}
            ref={(el) => {
              barRefs.current[i] = el;
            }}
            className={`w-[3px] h-full bg-slate-400 dark:bg-slate-500 rounded-full origin-bottom will-change-transform ${
              stream ? 'scale-y-[0.25] transition-transform duration-75' : 'animate-mini-bounce'
            }`}
            style={{ animationDelay: stream ? undefined : delay }}
          />
        );
      })}
    </div>
  );
};

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const InterviewerTile = ({ person, active, speaking, joining = false }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/90 w-full h-full min-h-0 flex flex-col items-center justify-center transition-all duration-300 ${
        active
          ? 'ring-2 ring-slate-900 dark:ring-white'
          : 'ring-1 ring-slate-200 dark:ring-white/10'
      } ${joining ? 'opacity-80' : ''}`}
    >
      <div className="relative">
        {active && speaking && !joining ? (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center">
            <MiniVoiceIndicator active={true} />
          </div>
        ) : (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center text-lg font-extrabold">
            {initials(person.name)}
          </div>
        )}
        {/* pulse ring — emphatic while speaking, gentle while joining */}
        {active && (speaking || joining) && (
          <span
            className={`absolute -inset-1.5 rounded-full ring-2 ring-slate-900/30 dark:ring-white/30 ${
              joining ? 'animate-pulse' : 'animate-ping'
            }`}
            aria-hidden
          />
        )}
      </div>

      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-left">
        <p className="text-xs font-bold text-slate-900 dark:text-white truncate drop-shadow-sm dark:drop-shadow">
          {person.name}
        </p>
        <p className="text-[10px] text-slate-500 dark:text-slate-300 truncate">{person.role}</p>
      </div>

      <div className="absolute top-2.5 right-2.5">
        {active && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {joining
              ? t('interviewPrep.meetingStage.joining')
              : speaking
                ? t('interviewPrep.meetingStage.speaking')
                : t('interviewPrep.meetingStage.onCall')}
          </span>
        )}
      </div>
    </div>
  );
};

const CandidateTile = ({ name, muted, listening, stream }) => {
  const { t } = useTranslation();
  return (
  <div
    className={`relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/90 w-full h-full min-h-0 flex flex-col items-center justify-center transition-all duration-300 ${
      listening && !muted
        ? 'ring-2 ring-slate-900 dark:ring-white'
        : 'ring-1 ring-slate-200 dark:ring-white/10'
    }`}
  >
    <div className="relative">
      {listening && !muted ? (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center">
          <MiniVoiceIndicator active={true} stream={stream} />
        </div>
      ) : (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-100 flex items-center justify-center text-lg font-extrabold">
          {initials(name)}
        </div>
      )}
      {/* speaking pulse ring around the avatar */}
      {listening && !muted && (
        <span
          className="absolute -inset-1.5 rounded-full ring-2 ring-slate-900/30 dark:ring-white/30 animate-ping"
          aria-hidden
        />
      )}
    </div>

    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
      <p className="text-xs font-bold text-slate-900 dark:text-white truncate drop-shadow-sm dark:drop-shadow">
        {t('interviewPrep.meetingStage.you')}
      </p>
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
          muted
            ? 'bg-rose-500/80 text-white'
            : 'bg-slate-200 text-slate-600 dark:bg-white/15 dark:text-slate-200'
        }`}
      >
        {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      </span>
    </div>
  </div>
  );
};

// ── Mobile call layout (< sm) ──────────────────────────────────────────────
// A purpose-built phone-call surface instead of the shrunken desktop grid: the
// active interviewer is a full-bleed hero tile, "You" is a picture-in-picture
// self-view pinned to the corner, and a panel (>1 interviewer) gets a small
// avatar filmstrip up top so the roster is still visible.
const MobileCallStage = ({
  seats,
  activeName,
  candidateName,
  muted,
  speaking,
  micStream,
  handingOff,
}) => {
  const { t } = useTranslation();
  // Spotlight the speaker; fall back to the first seat when nobody is active
  // (e.g. while the candidate is talking) so the hero never goes blank.
  const heroSeat = seats.find((s) => s.name === activeName) || seats[0];
  const heroActive = !!activeName && heroSeat?.name === activeName && (speaking || handingOff);
  const youListening = !speaking && !handingOff && !muted;

  return (
    <div className="sm:hidden flex-grow min-h-0 flex flex-col gap-3">
      {/* Panel filmstrip — only when there's more than one interviewer */}
      {seats.length > 1 && (
        <div className="shrink-0 flex flex-wrap items-center justify-center gap-2">
          {seats.map((p, i) => {
            const on = p.name === activeName;
            return (
              <div
                key={p.seat ?? i}
                className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 border transition-colors ${
                  on
                    ? 'border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800'
                    : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                    on
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                  }`}
                >
                  {initials(p.name)}
                </span>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 max-w-[80px] truncate">
                  {p.name?.split(/\s+/)[0]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Hero interviewer — fills the remaining height */}
      <div
        className={`relative flex-grow min-h-0 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800/90 flex flex-col items-center justify-center px-4 text-center transition-all duration-300 ${
          heroActive
            ? 'ring-2 ring-slate-900 dark:ring-white'
            : 'ring-1 ring-slate-200 dark:ring-white/10'
        } ${handingOff ? 'opacity-90' : ''}`}
      >
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full">
          {handingOff
            ? t('interviewPrep.meetingStage.joining')
            : heroActive
              ? t('interviewPrep.meetingStage.speaking')
              : t('interviewPrep.meetingStage.onCall')}
        </span>

        <div className="relative">
          {heroActive && !handingOff ? (
            <div className="w-28 h-28 rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center">
              <div className="scale-[1.9]">
                <MiniVoiceIndicator active={true} />
              </div>
            </div>
          ) : (
            <div className="w-28 h-28 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center text-3xl font-extrabold">
              {initials(heroSeat?.name)}
            </div>
          )}
          {heroActive && (
            <span
              className={`absolute -inset-2 rounded-full ring-2 ring-slate-900/30 dark:ring-white/30 ${
                handingOff ? 'animate-pulse' : 'animate-ping'
              }`}
              aria-hidden
            />
          )}
        </div>

        <div className="mt-5">
          <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {heroSeat?.name}
          </p>
          {heroSeat?.role && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-300 leading-snug">
              {heroSeat.role}
            </p>
          )}
        </div>

        {/* "You" picture-in-picture self-view */}
        <div
          className={`absolute bottom-3 right-3 w-[92px] h-28 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/95 backdrop-blur flex flex-col items-center justify-center transition-all duration-300 ${
            youListening
              ? 'ring-2 ring-slate-900 dark:ring-white'
              : 'ring-1 ring-slate-200 dark:ring-white/15'
          }`}
        >
          <div className="relative">
            {youListening ? (
              <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center">
                <MiniVoiceIndicator active={true} stream={micStream} />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-100 flex items-center justify-center text-sm font-extrabold">
                {initials(candidateName)}
              </div>
            )}
          </div>
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow">
              {t('interviewPrep.meetingStage.you')}
            </span>
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                muted
                  ? 'bg-rose-500/80 text-white'
                  : 'bg-slate-200 text-slate-600 dark:bg-white/15 dark:text-slate-200'
              }`}
            >
              {muted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MeetingStage = ({
  panel = [],
  activeSeat = null,
  candidateName = '',
  muted = false,
  speaking = false,
  micStream = null,
  handingOff = false,
}) => {
  const seats = Array.isArray(panel) ? panel.filter((p) => p && p.role) : [];
  if (seats.length < 1) return null;
  const activeName = activeSeat?.name;
  // Tiles = interviewers + the candidate. 1:1 (2 tiles) → one row; a panel (4
  // tiles) → 2×2 grid.
  const rowsClass = seats.length + 1 <= 2 ? 'grid-rows-1' : 'grid-rows-2';
  // With 2 interviewers (3 tiles total) a plain 2×2 grid leaves a lopsided
  // empty cell, so let the candidate span the full bottom row.
  const candidateSpan = seats.length === 2 ? 'col-span-2' : '';
  return (
    <>
      {/* Phones (< sm): dedicated call UI. */}
      <MobileCallStage
        seats={seats}
        activeName={activeName}
        candidateName={candidateName}
        muted={muted}
        speaking={speaking}
        micStream={micStream}
        handingOff={handingOff}
      />

      {/* Tablet / desktop (≥ sm): the original Meet-style grid, unchanged. */}
      <div className={`hidden sm:grid flex-grow min-h-0 grid-cols-2 ${rowsClass} gap-3`}>
        {seats.map((p, i) => (
          <InterviewerTile
            key={p.seat ?? i}
            person={p}
            active={activeName === p.name}
            speaking={speaking && activeName === p.name}
            joining={handingOff && activeName === p.name}
          />
        ))}
        {/* While swapping interviewers the candidate isn't "live" yet — don't show
            their tile as listening. */}
        <div className={`min-h-0 ${candidateSpan}`}>
          <CandidateTile
            name={candidateName}
            muted={muted}
            listening={!speaking && !handingOff}
            stream={micStream}
          />
        </div>
      </div>
    </>
  );
};

export default MeetingStage;
