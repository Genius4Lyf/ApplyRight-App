import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CardDeck from '../ui/CardDeck';

// The live-interview pre-flight, as a paced three-step sequence rather than a
// page you scroll: what this is → who's interviewing you → start.
//
// The point of the whole thing is that the CHROME NEVER MOVES — not between
// steps, not under a long brief. The rail/step name above and the footer below
// are fixed, the pane between them is a fixed-height box on both viewports, and
// only that box scrolls. Nothing about paging through the steps changes the
// size or position of anything you're aiming at.
//
// One set of panes, two presentations: a clickable step rail + centred pane on
// lg+, a named step + swipe deck below it. Only one is mounted at a time
// (matchMedia, not `hidden lg:block`) so a pane's DOM — ids, media permissions,
// AI panels — exists exactly once.

const LG = '(min-width: 1024px)';

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia(LG).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(LG);
    const apply = () => setIsDesktop(mq.matches);
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else mq.removeListener(apply);
    };
  }, []);

  return isDesktop;
};

// The pane body is a FIXED-height reading box on both viewports, not a capped
// one. Height that follows the content means the card — and the footer under
// it — changes size as you page through the steps, which reads as the layout
// jumping rather than as a step advancing. Same box every step, content scrolls
// inside it.
//
// Desktop takes a share of the window; mobile takes what's left of the screen
// after the chrome, so the box is as tall as a phone can make it (the old 52vh
// cap showed about a third of the brief and left dead space under the buttons).
// `svh`, not `dvh`: the small-viewport unit doesn't change when a mobile URL
// bar hides, so the card can't resize under your thumb mid-scroll.
const DESKTOP_BODY_H = 'h-[clamp(300px,52vh,430px)]';
const MOBILE_BODY_H = 'max(280px, calc(100svh - 15.5rem - env(safe-area-inset-bottom)))';

// The fade that says "there's more below". Applied only while the box actually
// has somewhere left to scroll, so it always MEANS something — a permanent
// fade would soften the last line of a pane that had already ended.
const FADE = 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent)';

// `custom-scrollbar` swaps the chunky native bar for the app's 6px ink one, and
// the radius on the box itself means that bar is clipped by the card's corner
// instead of squaring it off.
const ScrollPane = ({ resetKey, className = '', style, inert, children }) => {
  const ref = useRef(null);
  const [more, setMore] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 8);
  }, []);

  // Every step starts at the top of its box — a body left scrolled halfway down
  // by the previous step reads as a broken jump.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
    update();
  }, [resetKey, update]);

  // Panes grow after mount (a panel finishes loading, a picker opens), which
  // changes whether there's anything left to scroll to.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [update]);

  return (
    <div
      ref={ref}
      onScroll={update}
      inert={inert}
      className={`custom-scrollbar overflow-y-auto ${className}`}
      style={{ ...style, ...(more ? { maskImage: FADE, WebkitMaskImage: FADE } : null) }}
    >
      {children}
    </div>
  );
};

const PANE_CARD =
  'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card';

const railNumClass = (state) =>
  ({
    // Ink fill for where you are, a hairline-outlined number for what you've
    // done, muted for what's still ahead. State reads by weight, not hue.
    current:
      'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900',
    done: 'border-slate-900 text-slate-900 dark:border-white dark:text-white',
    todo: 'border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500',
  })[state];

const railLabelClass = (state) =>
  ({
    current: 'text-slate-900 dark:text-white',
    done: 'text-slate-600 dark:text-slate-300',
    todo: 'text-slate-400 dark:text-slate-500',
  })[state];

const PreflightSteps = ({
  steps = [],
  initialStep = 0,
  onFinish,
  onCancel,
  finishLabel,
  ariaLabel,
}) => {
  const { t } = useTranslation();
  const finishText = finishLabel ?? t('interviewPrep.preflight.startInterview');
  const ariaText = ariaLabel ?? t('interviewPrep.preflight.setupSteps');
  const isDesktop = useIsDesktop();
  const last = Math.max(steps.length - 1, 0);
  const clamp = useCallback((i) => Math.min(Math.max(i, 0), last), [last]);

  const [step, setStep] = useState(() => clamp(initialStep));
  const current = clamp(step);
  const isLast = current === last;
  const active = steps[current];

  const go = useCallback(
    (i) => setStep((prev) => clamp(typeof i === 'function' ? i(prev) : i)),
    [clamp]
  );

  // The pane keeps a fixed height now, so nothing below it moves between steps
  // and the page shouldn't be left scrolled where the previous step put it.
  // (ScrollPane resets its own scrollTop; this is the window's.)
  useEffect(() => {
    if (isDesktop) return;
    // document.scrollingElement, not window.scrollTo — same effect, and it
    // stays silent under jsdom in tests.
    const doc = typeof document === 'undefined' ? null : document.scrollingElement;
    if (doc) doc.scrollTop = 0;
  }, [current, isDesktop]);

  if (!steps.length) return null;

  const back = () => (current === 0 ? onCancel?.() : go(current - 1));
  const forward = () => (isLast ? onFinish?.() : go(current + 1));
  const backLabel =
    current === 0 ? t('interviewPrep.preflight.cancel') : t('interviewPrep.preflight.back');

  const backBtn = (className = '') => (
    <button
      type="button"
      onClick={back}
      className={`cursor-pointer select-none rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
    >
      {backLabel}
    </button>
  );

  const forwardBtn = (className = '') => (
    <button
      type="button"
      onClick={forward}
      className={`btn-primary cursor-pointer select-none rounded-lg py-2 text-sm ${
        isLast ? 'px-6' : 'px-5'
      } ${className}`}
    >
      {isLast ? finishText : t('interviewPrep.preflight.continue')}
    </button>
  );

  // ── lg+ : step rail + one centred pane ──────────────────────────────────
  if (isDesktop) {
    return (
      <div className="text-left">
        <nav aria-label={ariaText} className="mx-auto mb-5 flex max-w-3xl items-center">
          {steps.map((s, i) => {
            const state = i === current ? 'current' : i < current ? 'done' : 'todo';
            return (
              <React.Fragment key={s.key}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={state === 'current' ? 'step' : undefined}
                  // Without this the numeral runs into the label — "3Start".
                  aria-label={t('interviewPrep.preflight.stepAria', { n: i + 1, label: s.label })}
                  className="flex shrink-0 cursor-pointer select-none items-center gap-2.5 rounded-lg px-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border font-mono text-[11px] font-bold transition-colors ${railNumClass(
                      state
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-[13px] font-semibold transition-colors ${railLabelClass(state)}`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`mx-3.5 h-px flex-1 transition-colors ${
                      i < current ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <div className={`mx-auto max-w-3xl ${PANE_CARD}`}>
          {/* rounded-t-2xl: the body is the card's top section, so it has to
              carry the same corner or the scrollbar squares it off. */}
          <ScrollPane
            resetKey={current}
            className={`rounded-t-2xl px-5 py-5 sm:px-6 ${DESKTOP_BODY_H}`}
          >
            {active?.node}
          </ScrollPane>
          {/* Fixed footer — it belongs to the frame, not to the pane, so it
              can't be scrolled away by a long step. */}
          <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {active?.hint ||
                t('interviewPrep.preflight.stepOf', { current: current + 1, total: steps.length })}
            </span>
            <div className="flex items-center gap-2.5">
              {backBtn()}
              {forwardBtn()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── < lg : the same three panes as a swipe deck ─────────────────────────
  return (
    <div className="text-left">
      {/* The rail is a desktop luxury, but its ORIENTATION isn't: dots alone
          never say what the pane you're looking at is. Name the step. */}
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-white">
          {active?.label}
        </h2>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('interviewPrep.preflight.stepOf', { current: current + 1, total: steps.length })}
        </span>
      </div>

      <CardDeck
        sequence
        items={steps}
        activeIndex={current}
        onIndexChange={go}
        getKey={(s) => s.key}
        ariaLabel={ariaText}
        hint={t('interviewPrep.preflight.swipeHint')}
        dotLabel={(n) => t('interviewPrep.preflight.goToStep', { n })}
        cardClassName={PANE_CARD}
        renderItem={(s, i, isFront) => (
          <ScrollPane
            resetKey={current}
            // The body IS the whole mobile pane, so it carries the full radius.
            className="rounded-2xl px-4 py-4"
            style={{ height: MOBILE_BODY_H }}
            // Only the pane in front is reachable; the others are parked
            // off-stage and must not collect tab stops.
            inert={!isFront}
          >
            {s.node}
          </ScrollPane>
        )}
      />

      {/* Footer sits outside the deck and sticks to the bottom of the viewport:
          the pane above it is now as long as its content, so the buttons have
          to follow you down it. Full-bleed (-mx) with an opaque ground so the
          brief scrolls UNDER the bar rather than beside it, and safe-area
          padding so it clears a phone's home indicator. */}
      <div
        className="sticky bottom-0 z-10 -mx-4 mt-3 flex items-center gap-2.5 border-t border-slate-200/70 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:border-slate-800/80 dark:bg-slate-950/95"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {/* 44px floor: these are the only two tap targets on the pane. */}
        {backBtn('min-h-[44px] flex-1')}
        {forwardBtn('min-h-[44px] flex-[2] justify-center')}
      </div>
    </div>
  );
};

export default PreflightSteps;
