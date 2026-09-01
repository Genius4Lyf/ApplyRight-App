import React, { useState } from 'react';
import { Users, Lock, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { initials } from '../../utils/avatar';

// "Who's likely to interview you" — the 3-person panel (HR + 2 JD-derived roles).
// Used on the prep detail screen (preview, with an optional upsell lock) and on
// the live-interview connecting screen (dark variant). Avatars are realistic
// AI-generated professional headshots mapped deterministically by name.

// Neutral seat treatment — the panel reads as one roster, not a colour code.
// Literal class strings (no runtime string-building) so Tailwind can see them.
const SEAT_RING = 'ring-slate-200 dark:ring-slate-700';
const SEAT_RING_ACTIVE = 'ring-offset-2 ring-offset-transparent ring-slate-900 dark:ring-slate-100';
const SEAT_FALLBACK = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200';

export const getAvatarUrl = (name = '') => {
  const clean = name.trim().toLowerCase();
  if (!clean) return '/avatars/female_1.png';
  if (clean === 'renee') return '/avatars/female_1.png';
  if (clean === 'priya' || clean.includes('priya')) return '/avatars/female_2.png';
  if (clean === 'fatima' || clean.includes('fatima')) return '/avatars/female_3.png';
  if (clean === 'ahmed' || clean.includes('ahmed')) return '/avatars/male_1.png';
  if (clean === 'marcus' || clean.includes('marcus')) return '/avatars/male_2.png';
  if (clean === 'ali' || clean.includes('ali')) return '/avatars/male_1.png';

  // Deterministic fallback using hash
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const isFemale = Math.abs(hash) % 2 === 0;
  if (isFemale) {
    const idx = (Math.abs(hash) % 3) + 1; // female_1 to female_3
    return `/avatars/female_${idx}.png`;
  } else {
    const idx = (Math.abs(hash) % 2) + 1; // male_1 to male_2
    return `/avatars/male_${idx}.png`;
  }
};

const InterviewerCard = ({ person, dark, active = false, dim = false, compact = false }) => {
  const [imgOk, setImgOk] = useState(true);
  const avatar = getAvatarUrl(person.name);

  return (
    <div
      className={`flex flex-col items-center text-center w-full transition-all duration-300 ${
        active ? 'scale-105' : dim ? 'opacity-40' : ''
      }`}
    >
      <div className={`relative shrink-0 ${compact ? 'mb-1.5' : 'mb-2'}`}>
        {imgOk ? (
          <img
            src={avatar}
            onError={() => setImgOk(false)}
            alt={person.name}
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-xl object-cover ring-2 ${
              active ? SEAT_RING_ACTIVE : SEAT_RING
            }`}
          />
        ) : (
          <div
            className={`w-12 h-12 sm:w-13 sm:h-13 rounded-xl flex items-center justify-center font-extrabold text-[15px] ring-2 ${SEAT_FALLBACK} ${
              active ? SEAT_RING_ACTIVE : SEAT_RING
            }`}
          >
            {initials(person.name)}
          </div>
        )}
      </div>
      <h4
        className={`text-[15px] sm:text-[16px] font-bold leading-tight flex items-center justify-center ${compact ? '' : 'min-h-[1.25rem]'} ${dark ? 'text-white' : 'text-slate-900 dark:text-white'}`}
      >
        {person.name}
      </h4>
      <p
        className={`mt-0.5 text-[13px] sm:text-[15px] font-semibold leading-tight flex items-center justify-center ${compact ? '' : 'min-h-[2rem]'} ${dark ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}
      >
        {person.role}
      </p>
      {/* The per-seat focus blurb is the tallest block; hide it in compact mode
          (free-tier teaser is blurred behind the lock, so it's never read). */}
      {person.focus && !compact && (
        <p
          className={`mt-1 text-[13px] leading-snug min-h-[3rem] flex items-start justify-center ${dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          {person.focus}
        </p>
      )}
    </div>
  );
};

const InterviewerSkeleton = () => (
  <div className="flex flex-col items-center text-center w-full animate-pulse">
    <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-200/50 dark:border-slate-800/50" />
    <div className="mt-2 w-16 h-3 rounded bg-slate-100 dark:bg-slate-800" />
    <div className="mt-1.5 w-20 h-2.5 rounded bg-slate-100/70 dark:bg-slate-800/60" />
    <div className="mt-2 w-24 h-2 rounded bg-slate-100/50 dark:bg-slate-800/40" />
  </div>
);

const InterviewerPanel = ({
  panel = [],
  dark = false,
  locked = false,
  showHeading = true,
  activeIndex = -1,
  loading = false,
  // Chooser mode: when onSelect is provided, each card becomes selectable and
  // selectedIndex is highlighted with a check.
  onSelect = null,
  selectedIndex = -1,
  heading,
  lockedIndices = [], // chooser: indices the user hasn't unlocked yet
  scores = {}, // chooser: index -> score (shown as a badge on done seats)
  compact = false, // tighten card heights (free-tier locked teaser)
  onShowInfo = null, // chooser: (index) => void — shows the info modal for that seat
}) => {
  const { t } = useTranslation();
  const headingText = heading ?? t('interviewPrep.interviewerPanel.heading');
  const isLocked = (i) => Array.isArray(lockedIndices) && lockedIndices.includes(i);
  const seats = Array.isArray(panel) ? panel.filter((p) => p && p.role) : [];

  if (!loading && seats.length === 0) return null;

  return (
    <div className="w-full">
      {showHeading && (
        <div className={`flex items-center justify-center gap-2 ${compact ? 'mb-2.5' : 'mb-4'}`}>
          <Users
            className={`w-4 h-4 ${dark ? 'text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}
          />
          <span
            className={`text-[13px] font-bold uppercase tracking-wider ${dark ? 'text-slate-300' : 'text-slate-400'}`}
          >
            {headingText}
          </span>
        </div>
      )}
      <div className="relative">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          {loading ? (
            <>
              <InterviewerSkeleton />
              <InterviewerSkeleton />
              <InterviewerSkeleton />
            </>
          ) : onSelect ? (
            seats.map((p, i) => {
              const locked = isLocked(i);
              const score = scores[i];
              return (
                <div key={p.seat ?? i} className="relative">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && onSelect(i)}
                    className={`relative rounded-2xl p-2.5 sm:p-3 transition-all w-full ${
                      locked
                        ? 'cursor-not-allowed ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-50 dark:bg-slate-800/40'
                        : selectedIndex === i
                          ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-900 dark:ring-white shadow-sm'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 ring-1 ring-transparent'
                    }`}
                  >
                    {/* Dim only the avatar/name when locked — keep the requirement
                        pill below at full contrast so it's clearly readable. */}
                    <div className={locked ? 'opacity-45' : ''}>
                      <InterviewerCard
                        person={p}
                        dark={dark}
                        active={!locked && selectedIndex === i}
                      />
                    </div>
                    {!locked && typeof score === 'number' && (
                      <span className="absolute top-1 right-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-heading text-[9px] font-bold tabular-nums shadow-sm">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {score}%
                      </span>
                    )}
                  </button>

                  {!locked && onShowInfo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowInfo(i);
                      }}
                      aria-label={t('interviewPrep.interviewerPanel.aboutAria', { name: p.name })}
                      className="absolute top-1 left-1 p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-900/80 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            seats.map((p, i) => (
              <InterviewerCard
                key={p.seat ?? i}
                person={p}
                dark={dark}
                active={activeIndex === i}
                dim={activeIndex >= 0 && activeIndex !== i}
                compact={compact}
              />
            ))
          )}
        </div>

        {/* Free-tier upsell: blur the panel and overlay a soft lock. */}
        {!loading && locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/55 dark:bg-slate-900/55 backdrop-blur-[3px]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 text-white text-[13px] font-bold">
              <Lock className="w-3 h-3" /> {t('interviewPrep.interviewerPanel.paidPanel')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewerPanel;
