import React from 'react';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ModelPicker from '../ModelPicker';

// THE Aria composer — one docked input shared by every Aria chat surface (the builder's
// AriaChat + AskAriaGenerate, the Target step's inert parity row, StudioChat, and
// SectionCoach's portaled dock). It used to be five near-identical copies; a change to
// the input meant five edits, so it lives here now.
//
// Shape: ONE row inside a pill — model chip · divider · textarea · theme · send. A second
// footer row would double the resting height (~78px vs ~44px), which is real estate a
// phone can't spare. That keeps rounded-3xl right: it's a single-row pill again.
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

      <div className="flex items-end gap-1.5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-1.5 py-1 focus-within:border-slate-900 dark:focus-within:border-slate-100 focus-within:ring-1 focus-within:ring-slate-900/20 dark:focus-within:ring-slate-100/20 transition-colors">
        {/* The model chip. Its menu drops UP — the composer is docked at the bottom of
            the viewport, so a downward menu would open off-screen. */}
        <ModelPicker value={modelId} onSelect={onSelectModel} drop="up" align="left" compact />
        <span
          aria-hidden="true"
          className="w-px h-[18px] mb-2 bg-slate-200 dark:bg-slate-700 shrink-0"
        />

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
          className={`flex-1 min-w-0 bg-transparent border-0 outline-none resize-none px-1.5 py-2.5 text-[16px] leading-relaxed text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 scrollbar-none max-h-[140px] ${
            inputInert ? 'opacity-50' : ''
          } ${inert ? 'cursor-not-allowed' : ''}`}
        />

        <button
          type="button"
          onClick={() => onSend?.()}
          disabled={!canSend}
          aria-label={resolvedSendAriaLabel}
          className={`shrink-0 h-9 flex items-center justify-center rounded-full transition-colors ${
            sendLabel ? 'px-4 text-[12px] font-semibold' : 'w-9'
          } ${
            inert
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white ring-1 ring-transparent dark:ring-slate-100/30 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40'
          }`}
        >
          {sendLabel || <ArrowUp className="w-4 h-4" />}
        </button>
      </div>

      {footer}
    </div>
  );
};

export default AriaComposer;
