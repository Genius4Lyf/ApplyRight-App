import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// One cinematic stage for a single interviewer: no card, no frame — the room IS
// the interviewer's. Identity top-left, their voice as a wide waveform through
// the middle, "you" as a small self-view tile pinned bottom-right. The visual
// language mirrors the landing page's InterviewReveal, but every state here is
// real (live audio, mute, turn-taking) rather than a canned timeline.
const BAR_COUNT = 42;

const StageWaveform = ({
  stream,
  animated,
  bars = BAR_COUNT,
  className = 'h-16 gap-[3px] sm:h-20',
  barClassName = 'bg-slate-900/70 dark:bg-white/70',
}) => {
  const barRefs = useRef([]);
  // The analysed stream now swaps every turn (interviewer ⇄ candidate), so the
  // AudioContext is created once and reused — browsers cap how many a document
  // may open, and churning one per turn burns through that budget.
  const audioCtxRef = useRef(null);

  useEffect(
    () => () => {
      try {
        audioCtxRef.current && audioCtxRef.current.close();
      } catch {
        /* ignore */
      }
      audioCtxRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (!stream) {
      // Park the bars at rest so a stopped/muted mic doesn't freeze mid-word —
      // unless the canned bounce is running, which needs the inline transform
      // cleared so its keyframes own the property.
      barRefs.current.forEach((bar) => {
        if (bar) bar.style.transform = animated ? '' : 'scaleY(0.12)';
      });
      return undefined;
    }

    let analyser = null;
    let source = null;
    let raf = 0;
    let freq = null;

    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      // 512 → 256 bins (~94Hz each). The old fftSize of 64 gave just 16 usable
      // bins across 42 bars, so bars came in identical triplets — a big part of
      // why the waveform read as a solid block rather than a voice.
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      analyser = null;
    }

    // Per-bar bin map, built once. Bars are MIRRORED around the centre and
    // spaced LOGARITHMICALLY: centre bars read the low formants (where speech
    // lives and moves most), outer bars the high end. A linear map wasted two
    // thirds of the bars on near-silent high frequencies, which is why they all
    // sat at the same height. The right half is offset by a bin so the two
    // halves stay balanced without being pixel-identical.
    const binIdx = new Int16Array(bars);
    const amp = new Float32Array(bars);
    if (analyser) {
      const MIN_BIN = 2;
      const MAX_BIN = Math.min(freq.length - 2, 96);
      const half = (bars - 1) / 2;
      for (let i = 0; i < bars; i++) {
        const d = Math.abs(i - half) / half; // 0 = centre, 1 = outer edge
        const b = Math.round(MIN_BIN * Math.pow(MAX_BIN / MIN_BIN, d));
        binIdx[i] = Math.min(freq.length - 2, i > half ? b + 1 : b);
        // Gentle centre emphasis so the voice reads as bursting from the middle.
        amp[i] = 0.78 + 0.22 * (1 - d);
      }
    }

    // Smoothed level per bar: fast attack, slow release. This is what makes a
    // meter feel physical instead of jittery — bars leap onto a syllable and
    // fall away from it.
    const levels = new Float32Array(bars);
    const ATTACK = 0.5;
    const RELEASE = 0.12;
    // Measured against a speech-like signal across a 3.3x loudness range: 1.6
    // with the soft knee below gives the widest spread of bar heights with zero
    // bars pinned to the ceiling. Raising it to 2.2 clipped 24 of 42 bars flat.
    const GAIN = 1.6;
    const KNEE = 0.75;

    const update = () => {
      raf = requestAnimationFrame(update);
      if (!analyser) return;
      analyser.getByteFrequencyData(freq);

      for (let i = 0; i < bars; i++) {
        const bar = barRefs.current[i];
        if (!bar) continue;
        const b = binIdx[i];
        // Average the bin with its neighbour: one bin alone flickers.
        const raw = (freq[b] + freq[b + 1]) / 2 / 255;
        // No energy floor any more. The old code lifted every bar to 60% of the
        // overall energy, which is precisely what flattened them into a wall —
        // quiet bands are supposed to drop.
        let v = raw * GAIN * amp[i];
        // Soft knee rather than a hard clamp: a loud passage compresses toward
        // the ceiling instead of a dozen bars hitting it dead flat. Flat tops
        // are what made this read as a progress bar rather than a voice.
        if (v > KNEE) v = KNEE + (1 - Math.exp(-(v - KNEE) * 2.2)) * (1 - KNEE);
        const target = Math.min(1, v);
        const prev = levels[i];
        levels[i] = prev + (target - prev) * (target > prev ? ATTACK : RELEASE);
        bar.style.transform = `scaleY(${0.12 + levels[i] * 0.88})`;
      }
    };

    update();

    return () => {
      cancelAnimationFrame(raf);
      try {
        source && source.disconnect();
        analyser && analyser.disconnect();
      } catch {
        /* ignore */
      }
    };
  }, [stream, animated, bars]);

  // No Tailwind scale-* on the bars: v4 compiles those to the standalone `scale`
  // property, which MULTIPLIES with the `transform` the loop writes — a
  // scale-y utility class pinned every bar to a fraction of the loop's own
  // output (Tailwind emits `scale: var(--tw-scale-x) var(--tw-scale-y)`) and
  // the waveform looked dead. JS owns the vertical scale outright.
  const bounce = animated && !stream;
  return (
    <div aria-hidden className={`flex items-center justify-center ${className}`}>
      {[...Array(bars)].map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          // Capped width keeps the bars slim at any container size — stretched
          // to ~14px on a wide stage they read as a progress bar, not a voice.
          className={`min-w-[2px] max-w-[9px] flex-1 h-full rounded-full origin-center will-change-transform ${barClassName} ${
            bounce ? 'animate-mini-bounce' : ''
          }`}
          style={{
            // Start at rest so the bars never flash full-height before the
            // first analyser frame.
            transform: bounce ? undefined : 'scaleY(0.12)',
            animationDelay: bounce ? `${(i % 7) * 90}ms` : undefined,
          }}
        />
      ))}
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

const MeetingStage = ({
  panel = [],
  activeSeat = null,
  candidateName = '',
  muted = false,
  speaking = false,
  micStream = null,
  remoteStream = null,
  handingOff = false,
}) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  // Sessions are one interviewer now. `panel` stays in the contract (panels may
  // return) but only the active seat is staged — falling back to the first seat
  // so the stage never goes blank between turns.
  const seats = Array.isArray(panel) ? panel.filter((p) => p && p.role) : [];
  const seat = activeSeat || seats[0];
  if (!seat) return null;

  const interviewerSpeaking = speaking && !handingOff;
  // Mid-swap the candidate isn't live yet — don't show them as listening.
  const youListening = !speaking && !handingOff && !muted;

  // The stage waveform is the INTERVIEWER's voice and nothing else — it moves
  // when they talk and rests when they don't. The candidate's mic drives their
  // own tile instead, so the room never appears to speak for you. The canned
  // bounce is only a last resort, for when their stream hasn't arrived yet.
  const waveStream = interviewerSpeaking ? remoteStream : null;
  const waveAnimated = interviewerSpeaking && !remoteStream && !reduce;

  return (
    <div className="relative flex-grow min-h-0 overflow-hidden text-slate-900 dark:text-white">
      {/* No card, no frame: the interviewer isn't a widget on the page, they own
          it. MOBILE seats them dead centre — avatar, name and voice as one
          stacked group with the room's space split above and below, like a phone
          call. DESKTOP keeps the editorial arrangement: identity top-left, voice
          taking the slack under it. The self-view is the one absolute element
          and FLOATS over the room like any call's picture-in-picture. */}
      <section className="relative flex h-full min-w-0 flex-col justify-center gap-7 px-1 pt-2 pb-0 sm:justify-start sm:gap-0 sm:px-2">
        {/* Interviewer identity — the anchor of the room now that nothing frames
            it. Speaking / joining state is owned by the page's status line. */}
        <div className="flex shrink-0 items-start justify-center gap-3 sm:justify-start">
          <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
            {/* No pulsing halo — the waveform already carries "Renee is
                speaking"; a second animated cue on her avatar was redundant. */}
            <div
              className={`grid h-20 w-20 shrink-0 place-items-center rounded-full border border-slate-200 bg-white font-heading text-2xl font-bold dark:border-white/15 dark:bg-white/[.06] sm:h-16 sm:w-16 sm:text-xl ${
                handingOff ? 'opacity-70' : ''
              }`}
            >
              {initials(seat.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-2xl font-bold">{seat.name}</p>
              {seat.role && (
                <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[.16em] text-slate-400 dark:text-slate-500 sm:text-[10px]">
                  {seat.role}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* The interviewer's voice — a real AnalyserNode on their audio, not a
            fixed timer. At rest and faded while it's your turn: the room stays
            quiet when they aren't the one talking. On mobile it sits in the
            centred group under their name; from sm: it takes the slack so it
            centres in the room on its own. */}
        <div
          className={`mx-auto grid min-h-0 w-full max-w-[820px] shrink-0 content-center transition-opacity duration-500 sm:flex-1 ${
            interviewerSpeaking ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <StageWaveform stream={waveStream} animated={waveAnimated} />
        </div>

        {/* Candidate self-view — the only framed thing on screen, and that's the
            point: the room is the interviewer's, you're the guest tile in it. */}
        <aside
          className={`absolute bottom-0 right-0 grid h-[96px] w-[126px] place-items-center rounded-2xl border bg-white shadow-[0_10px_30px_rgba(15,23,42,.10)] transition-colors duration-300 dark:bg-[#0d1424] dark:shadow-[0_18px_40px_rgba(2,6,23,.5)] sm:h-[112px] sm:w-[158px] ${
            youListening
              ? 'border-slate-300 dark:border-white/30'
              : 'border-slate-200 dark:border-white/15'
          }`}
        >
          <div className="text-center">
            {/* No pulsing halo here any more — the mic badge and the level bars
                below say "you're live" without a second animation competing. */}
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-50 font-heading text-sm font-bold dark:border-white/25 dark:bg-white/10 sm:h-12 sm:w-12 sm:text-base">
              {initials(candidateName)}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <p className="text-[10px] font-bold">{t('interviewPrep.meetingStage.you')}</p>
              {/* Green = the floor is yours. Rose = muted. Neutral = they're
                  talking, so it isn't your turn. */}
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-300 ${
                  muted
                    ? 'bg-rose-500/80 text-white'
                    : youListening
                      ? 'bg-emerald-500 text-white dark:bg-emerald-500'
                      : 'bg-slate-100 text-slate-600 dark:bg-white/15 dark:text-slate-200'
                }`}
              >
                {muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </span>
            </div>
            {/* Your mic lives here, not on the main stage — this is where you
                can see you're being picked up. */}
            <div
              className={`mx-auto mt-1.5 w-12 transition-opacity duration-300 ${
                youListening ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <StageWaveform
                stream={youListening ? micStream : null}
                animated={false}
                bars={7}
                className="h-3 gap-[2px]"
                barClassName="bg-slate-400 dark:bg-slate-300"
              />
              <span className="sr-only">{t('interviewPrep.meetingStage.speaking')}</span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default MeetingStage;
