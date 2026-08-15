import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Mic, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ModelPicker from '../ModelPicker';
import { isSpeechRecognitionSupported, startDictation } from '../../lib/speech';
import { costForActionTier, tierOf } from '../../lib/models';

// THE Aria composer — one docked input shared by every Aria chat surface (the builder's
// AriaChat + AskAriaGenerate, the Target step's inert parity row, StudioChat, and
// SectionCoach's portaled dock). It used to be five near-identical copies; a change to
// the input meant five edits, so it lives here now.
//
// Shape: ONE row inside a FULL pill — textarea · model chip · send — mirroring the
// reference chat's input bar (soft shadow instead of a hard border, generous height,
// the model chip trailing on the right rather than leading on the left). A second
// footer row would double the resting height (~86px vs ~48px), which is real estate a
// phone can't spare, so it stays single-row.
//
// Two things that look broken if they drift:
//   · `items-end`, never items-center — the textarea auto-grows, and centred controls
//     float to the middle of a 3-line box instead of sitting on its bottom edge.
//   · the focus treatment belongs to the CONTAINER via `focus-within`; a ring on the
//     textarea would outline the text alone, not the box.
// Ink throughout, including the focus ring — no indigo anywhere in this component.
//
// Props:
//   value/onChange(string)/onSend  the controlled input and its submit
//   inputRef                       forwarded to the textarea — callers reset its height
//                                  after a send and focus it when inserting a starter
//   disabled  the textarea is inert (a card owns the stream); it dims, the control row
//             stays live so the model/theme are still switchable
//   busy      a turn is in flight — blocks send without dimming the input
//   inert     permanently decorative (the Target step, which is driven by its form)
//   modelId/onSelectModel  the per-CV Aria model (see hooks/useAriaModel)
//   showModelPicker  set false when the caller already surfaces the model chip elsewhere
//                     (Aria Studio's header) — keeps the input row from duplicating it
//   sendLabel  render a text send button instead of the round arrow
//   note/footer  optional lines above the box / below it
const AriaComposer = ({
  value = '',
  onChange,
  onSend,
  inputRef,
  placeholder,
  disabled = false,
  busy = false,
  inert = false,
  modelId,
  onSelectModel,
  showModelPicker = true,
  showModelNotice = false,
  sendLabel = null,
  sendAriaLabel,
  note = null,
  footer = null,
  className = '',
}) => {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [modelNotice, setModelNotice] = useState(null);
  const textareaRef = useRef(null);
  const stopDictationRef = useRef(null);
  const dictatedPrefixRef = useRef('');
  // Defaults resolve to i18n at render — a caller-supplied string still wins.
  const resolvedPlaceholder = placeholder ?? t('cvBuilder.ariaComposer.placeholder');
  const resolvedSendAriaLabel = sendAriaLabel ?? t('cvBuilder.ariaComposer.send');
  const inputInert = disabled || inert;
  const canSend = !inputInert && !busy && value.trim().length >= 2;
  const canDictate = !inputInert && !busy && isSpeechRecognitionSupported();

  useEffect(() => {
    if (!showModelNotice) return undefined;
    const onModelSelected = (event) => setModelNotice(event.detail?.modelId || null);
    window.addEventListener('aria:model-selected', onModelSelected);
    return () => window.removeEventListener('aria:model-selected', onModelSelected);
  }, [showModelNotice]);

  useEffect(() => {
    if (!modelNotice) return undefined;
    const timeout = window.setTimeout(() => setModelNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [modelNotice]);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const hasText = value.trim().length > 0;
    // Match the chat-composer behavior: once the field has expanded, retain that
    // roomy full-width edit state while any text remains. It resets only when the
    // user clears the message entirely.
    const wrapped = hasText && textarea.scrollHeight > 56;
    // Placeholder-only composers always return to their true compact resting height.
    textarea.style.height = hasText
      ? `${Math.max(56, Math.min(textarea.scrollHeight, 240))}px`
      : '56px';
    // Derive the sticky expanded state from the previous value inside the setter.
    // Keeping `expanded` out of this callback's dependencies prevents a resize →
    // setState → resize loop in the layout effect.
    setExpanded((wasExpanded) => {
      const shouldExpand = wrapped || (wasExpanded && hasText);
      return wasExpanded === shouldExpand ? wasExpanded : shouldExpand;
    });
  }, [value]);

  // Resize before paint. A regular effect briefly displayed the temporary `auto`
  // height, which looked like a vertical jump during live transcription.
  useLayoutEffect(() => {
    resizeTextarea();
  }, [resizeTextarea]);

  useEffect(
    () => () => {
      stopDictationRef.current?.();
    },
    []
  );

  const stopDictation = () => {
    stopDictationRef.current?.();
    stopDictationRef.current = null;
    setListening(false);
  };

  const toggleDictation = () => {
    if (listening) {
      stopDictation();
      return;
    }

    // Preserve typed text; each interim transcript replaces only its live tail.
    dictatedPrefixRef.current = value.trimEnd();
    setListening(true);
    stopDictationRef.current = startDictation({
      onText: (transcript) => {
        const prefix = dictatedPrefixRef.current;
        onChange?.([prefix, transcript].filter(Boolean).join(prefix && transcript ? ' ' : ''));
      },
      onEnd: () => {
        stopDictationRef.current = null;
        setListening(false);
      },
      onError: () => {
        stopDictationRef.current = null;
        setListening(false);
      },
    });
  };

  const send = () => {
    // Reset immediately; a late browser `onend` cannot restore sent text.
    if (listening) stopDictation();
    onSend?.();
  };

  const handleTextChange = (event) => {
    // A physical keyboard (or paste) means the user has taken over from voice.
    // Stop first so a delayed recognition result cannot overwrite their typing.
    if (listening) stopDictation();
    onChange?.(event.target.value);
  };

  const setTextareaRef = (node) => {
    textareaRef.current = node;
    if (typeof inputRef === 'function') inputRef(node);
    // The documented contract forwards the DOM textarea to the caller.
    // eslint-disable-next-line react-hooks/immutability
    else if (inputRef) inputRef.current = node;
  };

  return (
    <div className={className}>
      {note}

      {/* Capped and centered — on a wide desktop the pill stays chat-width, it doesn't
          stretch edge to edge with the column (matches the reference chat). */}
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-0">
        <div className={`relative border bg-white dark:bg-slate-900 shadow-md shadow-slate-900/10 dark:shadow-black/30 p-1.5 transition-[border-color,box-shadow] ${
          expanded ? 'rounded-[26px]' : 'rounded-full'
        } ${
          listening
            ? 'border-rose-300/80 dark:border-rose-400/40'
            : 'border-slate-200/70 dark:border-slate-700/80'
        }`}>
          <AnimatePresence>
            {modelNotice && (
              <motion.div
                key={modelNotice}
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 5, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 3, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`pointer-events-none absolute -top-5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase tracking-wide shadow-sm ${
                  tierOf(modelNotice) === 'flagship'
                    ? 'border-amber-200 bg-amber-50/95 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'border-emerald-200 bg-emerald-50/95 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300'
                }`}
              >
                {tierOf(modelNotice) === 'flagship'
                  ? t('ariaStudio.sectionCoach.proTurnCost', {
                      n: costForActionTier('ARIA_CHAT_MESSAGE', 'flagship'),
                    })
                  : t('ariaStudio.sectionCoach.freeBackAndForth')}
              </motion.div>
            )}
          </AnimatePresence>
          <textarea
            ref={setTextareaRef}
            value={value}
            disabled={inputInert}
            onChange={handleTextChange}
            // Auto-grow to the content, capped at a roomy Google-like height (where the textarea's own
            // scrollbar takes over — hidden via scrollbar-none).
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={resolvedPlaceholder}
            // Prose, not a credential field — keeps password managers / AutoFill from
            // claiming a row of the keyboard accessory bar, while predictive text stays on.
            name="aria-message"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck="true"
            enterKeyHint="send"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            // min-w-0 is load-bearing: without it flex refuses to shrink the textarea and
            // the send button gets pushed out of a narrow row.
            // py-4 + leading-6 fills the 56px resting field exactly, vertically centering
            // the text line with the 44px control buttons rather than leaving it top-heavy.
            className={`block w-full min-h-14 bg-transparent border-0 outline-none resize-none overscroll-none [touch-action:pan-y] py-4 text-[17px] leading-6 text-slate-800 dark:text-slate-100 placeholder:text-[17px] placeholder:font-normal placeholder-slate-400 dark:placeholder-slate-500 scrollbar-none max-h-[240px] ${
              expanded ? 'px-3' : showModelPicker ? 'pl-12 pr-28 sm:pl-32' : 'pl-3 pr-28'
            } ${
              inputInert ? 'opacity-50' : ''
            } ${inert ? 'cursor-not-allowed' : ''}`}
          />

          <div
            className={
              expanded
                ? `pointer-events-none flex h-11 items-center gap-2 px-1 ${
                    showModelPicker ? 'justify-between' : 'justify-end'
                  }`
                : `pointer-events-none absolute inset-x-1.5 top-1/2 flex h-11 -translate-y-1/2 items-center gap-2 ${
                    showModelPicker ? 'justify-between' : 'justify-end'
                  }`
            }
          >
          {/* The model chip trails the text, right of the input — mirrors the reference
              chat's layout. Its menu drops UP since the composer is docked at the bottom
              of the viewport. Omitted entirely when the caller already shows the model
              elsewhere (Aria Studio's header). */}
          {showModelPicker && (
            <div className="pointer-events-auto">
              <ModelPicker value={modelId} onSelect={onSelectModel} drop="up" align="right" compact />
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-2">
          {canDictate && (
            <button
              type="button"
              onClick={toggleDictation}
              aria-label={listening ? t('cvBuilder.ariaComposer.stopDictation') : t('cvBuilder.ariaComposer.startDictation')}
              aria-pressed={listening}
              className={`relative shrink-0 h-11 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 dark:focus-visible:ring-white/40 ${
                listening
                  ? 'w-[92px] bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300'
                  : 'w-11 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {listening ? (
                <span className="flex h-full items-center justify-center gap-[3px]" aria-hidden="true">
                  {[12, 19, 27, 16, 23, 13, 20].map((height, index) => (
                    <span
                      key={index}
                      className="w-[2px] rounded-full bg-current animate-pulse"
                      style={{ height: `${height}px`, animationDelay: `${index * 90}ms` }}
                    />
                  ))}
                  <span className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white">
                    <Square className="h-3 w-3 fill-current" />
                  </span>
                </span>
              ) : (
                <Mic className="mx-auto h-5 w-5" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label={resolvedSendAriaLabel}
            className={`shrink-0 h-11 flex items-center justify-center rounded-full transition-colors ${
              sendLabel ? 'px-4 text-[13px] font-semibold' : 'w-11 aspect-square'
            } ${
              inert
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40'
            }`}
          >
            {sendLabel || <ArrowUp className="w-5 h-5" />}
          </button>
          </div>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
          {t('cvBuilder.ariaComposer.aiDisclaimer')}
        </p>
      </div>

      {footer}
    </div>
  );
};

export default AriaComposer;
