import React from 'react';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ModelPicker from '../ModelPicker';

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
  // Defaults resolve to i18n at render — a caller-supplied string still wins.
  const resolvedPlaceholder = placeholder ?? t('cvBuilder.ariaComposer.placeholder');
  const resolvedSendAriaLabel = sendAriaLabel ?? t('cvBuilder.ariaComposer.send');
  const inputInert = disabled || inert;
  const canSend = !inputInert && !busy && value.trim().length >= 2;

  return (
    <div className={className}>
      {note}

      {/* Capped and centered — on a wide desktop the pill stays chat-width, it doesn't
          stretch edge to edge with the column (matches the reference chat). */}
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex items-end gap-2 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/30 px-2.5 py-2 focus-within:ring-2 focus-within:ring-slate-900/15 dark:focus-within:ring-slate-100/20 transition-shadow">
          <textarea
            ref={inputRef}
            value={value}
            disabled={inputInert}
            onChange={(e) => onChange?.(e.target.value)}
            // Auto-grow to the content, capped at max-h-[140px] (where the textarea's own
            // scrollbar takes over — hidden via scrollbar-none).
            onInput={(e) => {
              e.currentTarget.style.height = 'auto';
              e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend?.();
              }
            }}
            rows={1}
            placeholder={resolvedPlaceholder}
            // min-w-0 is load-bearing: without it flex refuses to shrink the textarea and
            // the send button gets pushed out of a narrow row.
            // py-2 + leading-6 sums to exactly 40px on one line — the same as the send
            // button's h-10, so `items-end` centers them pixel-for-pixel at rest instead
            // of leaving the button a few px high or low against the text.
            className={`flex-1 min-w-0 bg-transparent border-0 outline-none resize-none px-2.5 py-2 text-[17px] leading-6 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 scrollbar-none max-h-[140px] ${
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

          <button
            type="button"
            onClick={() => onSend?.()}
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
