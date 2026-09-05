import React from 'react';
import { Users, Lock, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// "Who's likely to interview you" — the 3-person panel (HR + 2 JD-derived roles).
// Used on the prep detail screen (preview, with an optional upsell lock) and on
// the live-interview connecting screen (dark variant). Text-only by design: a
// name and a role tell you who you're facing; a stock headshot from a 5-photo
// pool (the same 5 faces recycled across every user, every job) told you
// nothing and cost more to look at than it gave back.

const InterviewerCard = ({ person, dark, active = false, dim = false, compact = false }) => {
  return (
    <div
      className={`flex flex-col items-center text-center w-full transition-all duration-300 ${
        active ? 'scale-105' : dim ? 'opacity-40' : ''
      }`}
    >
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
    <div className="w-16 h-3 rounded bg-slate-100 dark:bg-slate-800" />
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
        {/* gap-2.5, not the old 1.5 (6px): with no avatar square anchoring each
            seat, a thin gap read as three cards jammed together, first and last
            pressed up against the page's own gutter. */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
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
                    // pt-5, not p-3 on every side: the Info icon and score badge
                    // are absolutely positioned into the card's top corners, and
                    // used to float over the avatar block. With no avatar, that
                    // corner is now the name's own first line — the extra top
                    // clearance keeps the icons from sitting on the text.
                    className={`relative rounded-2xl px-3 pb-3 pt-5 transition-all w-full ${
                      locked
                        ? 'cursor-not-allowed ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-50 dark:bg-slate-800/40'
                        : selectedIndex === i
                          ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-900 dark:ring-white shadow-sm'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 ring-1 ring-transparent'
                    }`}
                  >
                    {/* Dim only the name/role when locked — keep the requirement
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
