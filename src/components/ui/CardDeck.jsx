import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

// Fan geometry presets, switched by viewport. The desktop values were tuned to
// look centered and tidy with a 3-deep receding stack; the mobile preset
// centers the front card (BX=0) near full-width and shows only a subtle sliver
// of the next 1–2 cards so nothing bleeds off a 360px screen.
const PRESETS = {
  //          BX (front x-offset)  SX (per-card x)  SY (per-card y)  depth
  desktop: { BX: -36, SX: 34, SY: 18, depth: 3 },
  mobile: { BX: 0, SX: 14, SY: 11, depth: 2 },
};

const EASE = 'cubic-bezier(.2,.7,.2,1)';
const SWIPE_THRESHOLD = 85;

/**
 * A generic, swipeable stacked-deck. Renders `items` recent-first with the
 * front card fully interactive and the rest receding behind it. Card chrome
 * (background/border/radius/shadow/padding) is supplied by the caller through
 * `cardClassName` + `renderItem`; CardDeck only owns position, transform,
 * opacity, z-index and pointer state.
 *
 * @param {{
 *   items: Array<any>,
 *   renderItem: (item: any, index: number, isFront: boolean) => React.ReactNode,
 *   getKey: (item: any, index: number) => React.Key,
 *   initialIndex?: number,
 *   onIndexChange?: (index: number) => void,
 *   cardClassName?: string,
 *   label?: string,
 * }} props
 */
export default function CardDeck({
  items = [],
  renderItem,
  getKey,
  initialIndex = 0,
  onIndexChange,
  cardClassName = '',
  label,
}) {
  const reduceMotion = useReducedMotion();
  const count = items.length;

  const [currentRaw, setCurrent] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0))
  );
  // Clamp during render so a shrinking `items` list can never leave us pointing
  // past the end — no set-state-in-effect needed; `commit` re-clamps on write.
  const current = Math.min(Math.max(currentRaw, 0), Math.max(count - 1, 0));
  const [isDesktop, setIsDesktop] = useState(true);
  const [drag, setDrag] = useState({ active: false, dx: 0 });
  const [stageMinH, setStageMinH] = useState(0);

  const preset = isDesktop ? PRESETS.desktop : PRESETS.mobile;

  // Keep the latest index in a ref so pointer/keyboard handlers read it without
  // becoming stale, and so we can fire onIndexChange outside a state updater.
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const commit = useCallback(
    (target) => {
      const clamped = Math.min(Math.max(target, 0), Math.max(count - 1, 0));
      if (clamped !== currentRef.current) {
        setCurrent(clamped);
        onIndexChange?.(clamped);
      }
    },
    [count, onIndexChange]
  );

  const next = useCallback(() => commit(currentRef.current + 1), [commit]);
  const prev = useCallback(() => commit(currentRef.current - 1), [commit]);

  // Responsive preset via matchMedia; recomputes transforms on resize.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(min-width: 640px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else mq.removeListener(apply);
    };
  }, []);

  // Measure the front card so the stage sizes to its content — the deck fills
  // whatever height the parent gives it, with only a small floor so it can never
  // collapse.
  const frontNodeRef = useRef(null);
  const measureFront = useCallback(() => {
    const node = frontNodeRef.current;
    if (node && node.offsetHeight) setStageMinH(node.offsetHeight + 68);
  }, []);

  useEffect(() => {
    measureFront();
    const node = frontNodeRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measureFront);
    ro.observe(node);
    return () => ro.disconnect();
  }, [measureFront, current, isDesktop, count]);

  // ---- Drag / swipe on the front card ----
  const DRAG_START = 8; // px of movement before a press becomes a drag; below this = a tap
  const dragState = useRef({ active: false, startX: 0, captured: false });

  const onPointerDown = (e) => {
    dragState.current = { active: true, startX: e.clientX, captured: false };
    // Do NOT setPointerCapture here — capturing on press redirects the click to
    // this wrapper and swallows the card's tap-to-open. Capture only once a drag
    // actually starts (see onPointerMove).
    setDrag({ active: true, dx: 0 });
  };
  const onPointerMove = (e) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.startX;
    if (!dragState.current.captured && Math.abs(dx) > DRAG_START) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      dragState.current.captured = true;
    }
    setDrag({ active: true, dx });
  };
  const endDrag = (e) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.startX;
    const { captured } = dragState.current;
    dragState.current = { active: false, startX: 0, captured: false };
    if (captured) e.currentTarget.releasePointerCapture?.(e.pointerId);
    setDrag({ active: false, dx: 0 });
    if (dx > SWIPE_THRESHOLD) next();
    else if (dx < -SWIPE_THRESHOLD) prev();
    // A tap (never captured, dx≈0) falls through: the native click reaches the
    // card and NoteCard's onOpen fires.
  };

  // Keyboard nav is bound via a listener (not an onKeyDown prop) so the wrapper
  // stays a plain, non-interactive container for a11y while still catching
  // left/right arrows when the deck holds focus.
  const rootRef = useRef(null);
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    };
    node.addEventListener('keydown', handler);
    return () => node.removeEventListener('keydown', handler);
  }, [prev, next]);

  if (!count) return null;

  const { BX, SX, SY, depth } = preset;
  const transition = reduceMotion ? 'none' : `transform .42s ${EASE}, opacity .42s`;

  const cardStyle = (index) => {
    const isFront = index === current;

    // Live drag on the front card — follow the finger, no transition.
    if (isFront && drag.active) {
      return {
        transform: `translate(${BX + drag.dx}px, 0) rotate(${drag.dx * 0.03}deg)`,
        opacity: 1,
        zIndex: 60,
        pointerEvents: 'auto',
        transition: 'none',
      };
    }

    const rel = index - current;
    let transform;
    let opacity;
    let zIndex;
    let pointerEvents = 'none';

    if (rel < 0) {
      // Passed cards fly off to the right and fade out.
      transform = 'translate(560px, 14px) rotate(6deg)';
      opacity = 0;
      zIndex = 0;
    } else if (rel === 0) {
      transform = `translate(${BX}px, 0) scale(1)`;
      opacity = 1;
      zIndex = 60;
      pointerEvents = 'auto';
    } else if (rel <= depth) {
      transform = `translate(${BX + rel * SX}px, ${rel * -SY}px) scale(${1 - rel * 0.055})`;
      opacity = Math.max(0, 1 - rel * 0.4); // front=1, first behind ≈.6, second ≈.2, deepest → gone
      zIndex = 60 - rel;
    } else {
      // Beyond the visible depth — kept mounted but hidden.
      transform = `translate(${BX + depth * SX}px, ${depth * -SY}px) scale(${1 - depth * 0.055})`;
      opacity = 0;
      zIndex = 0;
    }

    return { transform, opacity, zIndex, pointerEvents, transition };
  };

  const counter = `${String(current + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
  const atStart = current <= 0;
  const atEnd = current >= count - 1;

  return (
    <div
      ref={rootRef}
      className="flex h-full w-full flex-col outline-none"
      role="group"
      aria-roledescription="carousel"
      aria-label="Application deck"
      // Focusable custom widget: arrows drive the deck when it holds focus.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      {/* Controls row — optional label on the left, counter + arrows on the right */}
      <div className="mb-2 flex items-center justify-between gap-3">
        {label ? (
          <span className="min-w-0 truncate font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {label}
          </span>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-xs font-medium tabular-nums tracking-[0.08em] text-slate-400 dark:text-slate-500">
            {counter}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prev}
              disabled={atStart}
              aria-label="Previous card"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={atEnd}
              aria-label="Next card"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Stage wrapper — grows to fill the parent's height and centers the deck
          vertically. The stage itself sizes to the measured card height. */}
      <div className="flex flex-1 items-center">
        {/* Stage — both axes clipped so receding/passing cards never spawn a
            scrollbar (a lone overflow-x promotes overflow-y to auto). */}
        <div
          className="relative w-full overflow-hidden"
          style={{ minHeight: Math.max(240, stageMinH) }}
        >
          {items.map((item, index) => {
            const isFront = index === current;
            return (
              <div
                key={getKey ? getKey(item, index) : index}
                ref={isFront ? frontNodeRef : null}
                className={cardClassName}
                style={{
                  position: 'absolute',
                  top: 48,
                  left: 0,
                  right: 0,
                  margin: '0 auto',
                  width: 430,
                  maxWidth: 'calc(100% - 8px)',
                  touchAction: 'pan-y',
                  willChange: 'transform',
                  // Scale from the top edge so shrinking back cards step UP (top peek)
                  // instead of collapsing toward center and cancelling the upward offset.
                  transformOrigin: 'top center',
                  ...cardStyle(index),
                }}
                onPointerDown={isFront ? onPointerDown : undefined}
                onPointerMove={isFront ? onPointerMove : undefined}
                onPointerUp={isFront ? endDrag : undefined}
                onPointerCancel={isFront ? endDrag : undefined}
                aria-hidden={isFront ? undefined : true}
              >
                {renderItem(item, index, isFront)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="mt-4 flex items-center justify-center gap-1">
        {items.map((item, index) => {
          const active = index === current;
          return (
            <button
              key={getKey ? getKey(item, index) : index}
              type="button"
              onClick={() => commit(index)}
              aria-label={`Go to card ${index + 1}`}
              aria-current={active ? 'true' : undefined}
              className="flex items-center justify-center px-1 py-2"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  active ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <div className="mt-1 flex items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500">
        <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
          Swipe or use the arrows
        </span>
      </div>
    </div>
  );
}
