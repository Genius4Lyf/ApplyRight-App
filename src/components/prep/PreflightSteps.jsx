import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { SPRING_CARD } from '../../lib/ariaMotion';

// The live-interview pre-flight, as a paced three-step sequence rather than a
// page you scroll: what this is → who's interviewing you → start.
//
// The point of the whole thing is that the CHROME NEVER MOVES — not between
// steps, not under a long brief. Bar above, actions below, one scrolling region
// between them, and paging through the steps changes nothing about the size or
// position of what you're aiming at.
//
// One set of panes, two shapes. On lg+ this genuinely IS a dialog floating on a
// page, so it keeps the step rail and a centred card with a capped body. Below
// lg it's a screen, so it's built like one: full-bleed content, a bar that names
// the step, and a pinned action row — the app-shell layout (`auto 1fr auto`,
// middle row `min-h-0`) that every native step flow uses. Only one shape is
// mounted at a time (matchMedia, not `hidden lg:block`) so a pane's DOM — ids,
// media permissions, AI panels — exists exactly once.
//
// The mobile shape needs its parent to give it a height (it fills, it doesn't
// grow): MockInterviewPage stretches the preflight's row for exactly this.

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

// Desktop's card body is a fixed height, not a cap: a body that sizes to its
// content makes the card — and the footer under it — resize as you page
// through, which reads as the layout jumping rather than as a step advancing.
// Mobile needs no such constant; there the content region is simply whatever
// the bars leave.
const DESKTOP_BODY_H = 'h-[clamp(300px,52vh,430px)]';

// The fade that says "there's more below". Applied only while the box actually
// has somewhere left to scroll, so it always MEANS something — a permanent
// fade would soften the last line of a pane that had already ended.
const FADE = 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent)';

// `custom-scrollbar` swaps the chunky native bar for the app's 6px ink one, and
// the radius on the box itself means that bar is clipped by the card's corner
// instead of squaring it off.
const ScrollPane = ({ resetKey, className = '', style, children }) => {
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

  // Step and travel direction move together, as one value: a step reached by
  // Back has to slide back in from the left, or the motion lies about where you
  // are in the flow. Deriving the direction later — from a ref, or by comparing
  // against a previous render — is where that goes wrong.
  const [nav, setNav] = useState(() => ({ step: clamp(initialStep), dir: 1 }));
  const current = clamp(nav.step);
  const isLast = current === last;
  const active = steps[current];
  const reduceMotion = useReducedMotion();

  const go = useCallback(
    (i) =>
      setNav((prev) => {
        const target = clamp(typeof i === 'function' ? i(prev.step) : i);
        return { step: target, dir: target < prev.step ? -1 : 1 };
      }),
    [clamp]
  );

  // The phone shape fills the viewport and scrolls inside itself, so the page
  // behind it shouldn't be left scrolled where a previous screen put it. Belt
  // and braces: the shell shouldn't produce page scroll at all.
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
      className={`cursor-pointer select-none rounded-lg border border-slate-200 bg-white px-4 py-2 text-[15px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
    >
      {backLabel}
    </button>
  );

  const forwardBtn = (className = '') => (
    <button
      type="button"
      onClick={forward}
      className={`btn-primary cursor-pointer select-none rounded-lg py-2 text-[15px] ${
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

  // ── < lg : one full-screen step ─────────────────────────────────────────
  // Three rows — bar, content, actions — and the middle one is `flex-1
  // min-h-0`. That pair is the whole layout: the bars take their natural
  // height, the content region takes what's left, and NOTHING here measures
  // the chrome in pixels. It's the same box on every step by construction, not
  // by a number someone tuned.
  //
  // No card and no deck down here. A card frames content against a page around
  // it, and there is no page around it on a phone; a deck is for peer content
  // you browse, not for required steps of unequal length.
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col text-left">
      {/* The bar. Names the step, counts it, and shows the same progress the
          desktop rail shows — without pretending you can jump around. */}
      <div className="shrink-0 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 truncate text-[15px] font-bold text-slate-900 dark:text-white">
            {active?.label}
          </h2>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('interviewPrep.preflight.stepOf', { current: current + 1, total: steps.length })}
          </span>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= current ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* The only scrolling region on the screen. The step slides in from the
          side it came from — the nav-stack push, not a card thrown off a pile.
          Keying on the step remounts it, so there's one pane in the DOM at a
          time, exactly as on desktop. */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <motion.div
          key={active?.key}
          className="h-full"
          initial={reduceMotion ? false : { opacity: 0, x: nav.dir * 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRING_CARD}
        >
          <ScrollPane resetKey={current} className="h-full pb-4">
            {active?.node}
          </ScrollPane>
        </motion.div>
      </div>

      {/* Pinned actions. Outside the scroll region, so it can't be scrolled
          away and doesn't need to be sticky; full-bleed hairline, and safe-area
          padding so it clears a phone's home indicator. */}
      <div
        className="-mx-4 flex shrink-0 items-center gap-2.5 border-t border-slate-200 bg-slate-50 px-4 pt-3 sm:-mx-6 sm:px-6 dark:border-slate-800 dark:bg-slate-950"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* 44px floor: these are the only two tap targets on the screen. */}
        {backBtn('min-h-[44px] flex-1')}
        {forwardBtn('min-h-[44px] flex-[2] justify-center')}
      </div>
    </div>
  );
};

export default PreflightSteps;
