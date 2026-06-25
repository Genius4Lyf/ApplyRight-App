import React, { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

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
            className={`w-[3px] h-full bg-indigo-400 dark:bg-indigo-300 rounded-full origin-bottom will-change-transform ${
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
  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-800/90 w-full h-full min-h-0 flex flex-col items-center justify-center transition-all duration-300 ${
        active
          ? 'ring-4 ring-indigo-500 dark:ring-indigo-400 shadow-xl shadow-indigo-500/20'
          : 'ring-1 ring-white/10'
      } ${joining ? 'opacity-80' : ''}`}
    >
      <div className="relative">
        {active && speaking && !joining ? (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
            <MiniVoiceIndicator active={true} />
          </div>
        ) : (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-500/25 text-indigo-100 flex items-center justify-center text-lg font-extrabold">
            {initials(person.name)}
          </div>
        )}
        {/* pulse ring — emphatic while speaking, gentle while joining */}
        {active && (speaking || joining) && (
          <span
            className={`absolute -inset-1.5 rounded-full ring-2 ring-indigo-400/70 ${
              joining ? 'animate-pulse' : 'animate-ping'
            }`}
            aria-hidden
          />
        )}
      </div>

      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-left">
        <p className="text-xs font-bold text-white truncate drop-shadow">{person.name}</p>
        <p className="text-[10px] text-slate-350 truncate">{person.role}</p>
      </div>

      <div className="absolute top-2.5 right-2.5">
        {active && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-indigo-200 bg-black/40 px-1.5 py-0.5 rounded">
            {joining ? 'Joining…' : speaking ? 'Speaking' : 'On the call'}
          </span>
        )}
      </div>
    </div>
  );
};

const CandidateTile = ({ name, muted, listening, stream }) => (
  <div
    className={`relative rounded-2xl overflow-hidden bg-slate-800/90 w-full h-full min-h-0 flex flex-col items-center justify-center transition-all duration-300 ${
      listening && !muted
        ? 'ring-4 ring-indigo-500 dark:ring-indigo-400 shadow-xl shadow-indigo-500/20'
        : 'ring-1 ring-white/10'
    }`}
  >
    <div className="relative">
      {listening && !muted ? (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
          <MiniVoiceIndicator active={true} stream={stream} />
        </div>
      ) : (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-sky-500/25 text-sky-100 flex items-center justify-center text-lg font-extrabold">
          {initials(name)}
        </div>
      )}
      {/* speaking pulse ring around the avatar */}
      {listening && !muted && (
        <span
          className="absolute -inset-1.5 rounded-full ring-2 ring-indigo-400/70 animate-ping"
          aria-hidden
        />
      )}
    </div>

    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
      <p className="text-xs font-bold text-white truncate drop-shadow">You</p>
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
          muted ? 'bg-rose-500/80 text-white' : 'bg-white/15 text-slate-200'
        }`}
      >
        {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      </span>
    </div>
  </div>
);

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
  return (
    <div className={`flex-grow min-h-0 grid grid-cols-2 ${rowsClass} gap-2 sm:gap-3`}>
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
      <CandidateTile
        name={candidateName}
        muted={muted}
        listening={!speaking && !handingOff}
        stream={micStream}
      />
    </div>
  );
};

export default MeetingStage;
