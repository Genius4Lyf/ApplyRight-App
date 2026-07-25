import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CardDeck from '../ui/CardDeck';

// The live-interview pre-flight, as a paced three-step sequence rather than a
// page you scroll: what this is → who's interviewing you → start.
//
// The point of the whole thing is that the CHROME NEVER MOVES. The rail and the
// footer are fixed; only the pane body scrolls. That's what stops "Start
// interview" scrolling away under a long brief.
//
// One set of panes, two presentations: a clickable step rail + centred pane on
// lg+, a swipe deck + dots below it. Only one is mounted at a time (matchMedia,
// not `hidden lg:block`) so a pane's DOM — ids, media permissions, AI panels —
// exists exactly once.

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

// The scrolling pane body: tall enough to read in, capped so the footer stays
// put. `custom-scrollbar` swaps the chunky native bar for the app's 6px ink
// one, and the radius on the body itself means that bar is clipped by the
// card's corner instead of squaring it off.
const BODY = 'custom-scrollbar overflow-y-auto max-h-[clamp(260px,52vh,430px)]';

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

  // Every step change starts at the top of its pane — a body scrolled halfway
  // down from the previous step reads as a broken jump.
  const bodyRef = useRef(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [current]);

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
                  className="flex shrink-0 cursor-pointer select-none items-center gap-2.5 rounded-lg px-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
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
          <div ref={bodyRef} className={`rounded-t-2xl px-5 py-5 sm:px-6 ${BODY}`}>
            {active?.node}
          </div>
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
      <CardDeck
        sequence
        items={steps}
        activeIndex={current}
        onIndexChange={go}
        getKey={(s) => s.key}
        ariaLabel={ariaText}
        cardClassName={PANE_CARD}
        renderItem={(s, i, isFront) => (
          <div
            ref={isFront ? bodyRef : null}
            // The body IS the whole mobile pane, so it carries the full radius.
            className={`rounded-2xl px-4 py-4 ${BODY}`}
            // Only the pane in front is reachable; the others are parked
            // off-stage and must not collect tab stops.
            inert={!isFront}
          >
            {s.node}
          </div>
        )}
      />
      {/* Footer sits under the dots, outside the deck — the buttons stay put
          while the pane above them scrolls or swipes. */}
      <div className="mt-3 flex items-center gap-2.5">
        {backBtn('flex-1')}
        {forwardBtn('flex-[2] justify-center')}
      </div>
    </div>
  );
};

export default PreflightSteps;
