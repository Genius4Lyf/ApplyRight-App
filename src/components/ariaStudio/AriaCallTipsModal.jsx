import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Mic, MessageCircle, Search, TrendingUp, Clock, SlidersHorizontal } from 'lucide-react';
import AriaCallSettingsControls from './AriaCallSettingsControls';

// THE BRIEF BEFORE THE CALL.
//
// A call is only as good as what the user says on it, and people go into their first one
// the way they fill in a form: short, careful, and leaving out everything that sounds too
// small to count. Those small things — the keys they were trusted with, the new starter they
// trained, the complaint they sorted out — are exactly what makes a CV stand out, and Aria
// can only write what she hears.
//
// So this sits between the button and the minutes: four tips on getting a good call, and the
// call settings, in the one place a first-time caller is already reading about how it works.
//
// ── LAYOUT: TWO THINGS, NEVER A SCROLL ──
//
// It started as one tall column, tips above settings, and on a laptop it scrolled — the Start
// button and half the settings sat below the fold, so the thing people most needed to see was
// the thing they had to go looking for. Two different jobs deserve two places:
//
//   md and up — LANDSCAPE. Tips on the left, settings on the right, the footer across both.
//               Everything is on screen at once.
//   phones    — TABS. "Tips" and "Call settings" as two panels you switch between, with the
//               footer (and Start) always visible under either one.
//
// ROOM TO BREATHE, AND STILL NO SCROLL. A first pass fitted short laptop windows by squeezing
// every gap and line-height, and it read as congested. The height now comes from shape
// instead of from cramming: the dialog is wider, and the columns split 3:2 in favour of the
// tips, which carry most of the text — a wider column wraps each tip onto fewer lines, which
// buys back far more height than tighter spacing ever did. Spacing is generous by default and
// eases only a little on genuinely short windows (shorter-screen, ≤620px tall); the intro
// lines drop out only on tiny ones (shortest-screen, ≤560px).
//
// Both panels are always in the DOM and CSS decides which shows below md. That keeps the
// desktop layout free of any tab state, and means a resize never loses what was on screen.
//
// On phones the two panels are STACKED IN ONE GRID CELL and the inactive one is made
// invisible rather than removed. Measured: the tips panel is ~50px taller than the settings,
// so with display:none the centred dialog changed height on every tab tap and visibly jumped.
// Sharing a cell makes the dialog as tall as the taller panel, always, so switching is still.
//
// Without settings (`onSettingsChange` absent) it is the tips alone, as a single narrow card.
//
// Shown before the FIRST call of every build session until the user opts out; the opt-out is
// stored on the account (settings.hideAriaCallTips), not the browser, so it follows them.
// Portalled to <body> like CancelInterviewConfirm: the call button lives in the coach's dock,
// and on a phone the edit panel can sit over the chat — an inline dialog could be invisible.
const TIPS = [
  { key: 'likeAFriend', icon: MessageCircle },
  { key: 'smallThings', icon: Search },
  { key: 'whatChanged', icon: TrendingUp },
  { key: 'ariaWrapsUp', icon: Clock },
];

const AriaCallTipsModal = ({ open, onStart, onCancel, settings, onSettingsChange }) => {
  const { t } = useTranslation();
  // No reset effect: the caller mounts this only while it is open, so every opening starts
  // with the box unticked and on the tips tab.
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [tab, setTab] = useState('tips');
  const startRef = useRef(null);
  const hasSettings = typeof onSettingsChange === 'function';

  useEffect(() => {
    if (!open) return undefined;
    startRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  // Below md: both panels share one grid cell, only the active one visible. From md: two
  // columns, both visible.
  const panelClass = (name) =>
    hasSettings
      ? `col-start-1 row-start-1 md:col-start-auto md:row-start-auto min-w-0 ${
          tab === name ? 'visible' : 'invisible'
        } md:visible`
      : 'block';

  const tabButton = (name, label) => (
    <button
      type="button"
      role="tab"
      id={`aria-call-tab-${name}`}
      aria-selected={tab === name}
      aria-controls={`aria-call-panel-${name}`}
      onClick={() => setTab(name)}
      className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        tab === name
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
      }`}
    >
      {label}
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 short-screen:p-2 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aria-call-tips-title"
        // max-h + overflow are a SAFETY NET for unusually short screens only; at ordinary
        // sizes both layouts fit without scrolling, which is the point of them.
        className={`w-full max-h-[calc(100dvh-1rem)] sm:max-h-[94vh] short-screen:max-h-[calc(100dvh-1rem)] overflow-y-auto scrollbar-none rounded-xl bg-white shadow-xl dark:bg-slate-900 ${
          hasSettings ? 'max-w-md md:max-w-5xl md:shorter-screen:max-w-6xl' : 'max-w-md'
        }`}
      >
        {hasSettings && (
          <div className="px-4 pt-4 md:hidden">
            <div
              role="tablist"
              aria-label={t('ariaStudio.ariaLive.tips.title')}
              className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
            >
              {tabButton('tips', t('ariaStudio.ariaLive.tips.tabTips'))}
              {tabButton('settings', t('ariaStudio.ariaLive.tips.tabSettings'))}
            </div>
          </div>
        )}

        <div
          className={`p-4 md:px-10 md:py-9 md:shorter-screen:py-7 md:shortest-screen:py-6 ${
            hasSettings
              ? 'grid md:grid-cols-[3fr_2fr] md:divide-x md:divide-slate-200 dark:md:divide-slate-800'
              : ''
          }`}
        >
          {/* ── LEFT: before you start ── */}
          <section
            id="aria-call-panel-tips"
            data-panel="tips"
            role={hasSettings ? 'tabpanel' : undefined}
            aria-labelledby={hasSettings ? 'aria-call-tab-tips' : undefined}
            className={`${panelClass('tips')} ${hasSettings ? 'md:pr-10' : ''}`}
          >
            <div
              className={`flex flex-col items-center text-center ${
                hasSettings ? 'md:items-start md:text-left' : ''
              }`}
            >
              <h3
                id="aria-call-tips-title"
                className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 md:text-lg"
              >
                <Mic
                  className={`h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400 ${
                    hasSettings ? 'hidden md:block' : ''
                  }`}
                  aria-hidden="true"
                />
                {t('ariaStudio.ariaLive.tips.title')}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400 md:mt-2 md:shortest-screen:hidden md:max-lg:shorter-screen:hidden">
                {t('ariaStudio.ariaLive.tips.lead')}
              </p>
            </div>

            <ul className="mt-4 space-y-3 md:mt-7 md:space-y-5 md:shorter-screen:mt-6 md:shorter-screen:space-y-4 md:shortest-screen:mt-5 md:shortest-screen:space-y-3.5">
              {/* `Icon` is used only as <Icon />; this eslint config lacks jsx-uses-vars, so it
                  reads as unused — the same false positive JobCaptureCard's DetailChip suppresses. */}
              {/* eslint-disable-next-line no-unused-vars */}
              {TIPS.map(({ key, icon: Icon }) => (
                <li key={key} className="flex gap-3 md:gap-3.5">
                  <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {t(`ariaStudio.ariaLive.tips.${key}.title`)}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400 md:mt-1 md:leading-relaxed">
                      {t(`ariaStudio.ariaLive.tips.${key}.body`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ── RIGHT: how should this call go ── */}
          {hasSettings && (
            <section
              id="aria-call-panel-settings"
              data-panel="settings"
              role="tabpanel"
              aria-labelledby="aria-call-tab-settings"
              className={`${panelClass('settings')} md:pl-10`}
            >
              <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 md:text-lg">
                  <SlidersHorizontal
                    className="hidden h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400 md:block"
                    aria-hidden="true"
                  />
                  {t('ariaStudio.ariaLive.settings.title')}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400 md:mt-2 md:shortest-screen:hidden md:max-lg:shorter-screen:hidden">
                  {t('ariaStudio.ariaLive.tips.settingsLead')}
                </p>
              </div>
              <div className="mt-4 md:mt-7 md:shorter-screen:mt-6 md:shortest-screen:mt-5">
                <AriaCallSettingsControls value={settings} onChange={onSettingsChange} />
              </div>
            </section>
          )}
        </div>

        {/* ── FOOTER, under both columns — Start is never more than a glance away ── */}
        <div className="flex flex-col gap-2.5 border-t border-slate-200 px-4 py-3 dark:border-slate-800 md:flex-row md:gap-3 md:py-5 md:shorter-screen:py-4 md:items-center md:justify-between md:px-10">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
            />
            {t('ariaStudio.ariaLive.tips.dontShowAgain')}
          </label>

          {/* Stacked and full-width on a phone, side by side from `sm`. */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:w-auto"
            >
              {t('ariaStudio.ariaLive.tips.notNow')}
            </button>
            <button
              ref={startRef}
              type="button"
              onClick={() => onStart?.({ dontShowAgain })}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 sm:w-auto"
            >
              {t('ariaStudio.ariaLive.tips.start')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AriaCallTipsModal;
