import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ModelPicker from '../ModelPicker';
import { isSpeechRecognitionSupported, startDictation } from '../../lib/speech';

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
  sendLabel = null,
  sendAriaLabel,
  note = null,
  footer = null,
  className = '',
}) => {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false);
  const textareaRef = useRef(null);
  const stopDictationRef = useRef(null);
  const dictatedPrefixRef = useRef('');
  // Defaults resolve to i18n at render — a caller-supplied string still wins.
  const resolvedPlaceholder = placeholder ?? t('cvBuilder.ariaComposer.placeholder');
  const resolvedSendAriaLabel = sendAriaLabel ?? t('cvBuilder.ariaComposer.send');
  const inputInert = disabled || inert;
  const canSend = !inputInert && !busy && value.trim().length >= 2;
  const canDictate = !inputInert && !busy && isSpeechRecognitionSupported();

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  // Voice recognition updates `value` through React, which does not fire the
  // textarea's native input event. Resize from the value itself so typed and spoken
  // text have exactly the same growing behavior.
  useEffect(() => {
    resizeTextarea();
  }, [value]);

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
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-0">
        <div className={`flex items-end gap-2 rounded-[26px] border bg-white dark:bg-slate-900 shadow-sm dark:shadow-black/30 p-1.5 focus-within:ring-2 focus-within:ring-slate-900/15 dark:focus-within:ring-slate-100/20 transition-shadow ${
          listening
            ? 'border-rose-300/80 dark:border-rose-400/40'
            : 'border-slate-200/80 dark:border-slate-700'
        }`}>
          <textarea
            ref={setTextareaRef}
            value={value}
            disabled={inputInert}
            onChange={handleTextChange}
            // Auto-grow to the content, capped at max-h-[140px] (where the textarea's own
            // scrollbar takes over — hidden via scrollbar-none).
            onInput={() => {
              resizeTextarea();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={resolvedPlaceholder}
            // min-w-0 is load-bearing: without it flex refuses to shrink the textarea and
            // the send button gets pushed out of a narrow row.
            // py-2 + leading-6 sums to exactly 40px on one line — the same as the send
            // button's h-10, so `items-end` centers them pixel-for-pixel at rest instead
            // of leaving the button a few px high or low against the text.
            className={`flex-1 min-w-0 min-h-10 bg-transparent border-0 outline-none resize-none px-3 py-2 text-[17px] leading-6 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 scrollbar-none max-h-[160px] transition-[height] duration-150 ease-out ${
              inputInert ? 'opacity-50' : ''
            } ${inert ? 'cursor-not-allowed' : ''}`}
          />

          {/* The model chip trails the text, right of the input — mirrors the reference
              chat's layout. Its menu drops UP since the composer is docked at the bottom
              of the viewport. Omitted entirely when the caller already shows the model
              elsewhere (Aria Studio's header). */}
          {showModelPicker && (
            <ModelPicker value={modelId} onSelect={onSelectModel} drop="up" align="right" compact />
          )}

          {canDictate && (
            <button
              type="button"
              onClick={toggleDictation}
              aria-label={listening ? t('cvBuilder.ariaComposer.stopDictation') : t('cvBuilder.ariaComposer.startDictation')}
              aria-pressed={listening}
              className={`relative shrink-0 h-10 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 dark:focus-visible:ring-white/40 ${
                listening
                  ? 'w-[86px] bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300'
                  : 'w-10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
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
                  <span className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white">
                    <Square className="h-2.5 w-2.5 fill-current" />
                  </span>
                </span>
              ) : (
                <Mic className="mx-auto h-4 w-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label={resolvedSendAriaLabel}
            className={`shrink-0 h-10 flex items-center justify-center rounded-full transition-colors ${
              sendLabel ? 'px-4 text-[13px] font-semibold' : 'w-10'
            } ${
              inert
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40'
            }`}
          >
            {sendLabel || <ArrowUp className="w-4 h-4" />}
          </button>
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
