import React, { useId, useState } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// A field label with an "i" beside it that opens a sentence explaining what the field is
// FOR — not what to type in it. The placeholder already answers that.
//
// Deliberately not a tooltip and not a dialog:
//
//   A hover tooltip does not exist on a phone, which is where most of this app is used,
//   so half the audience would never see the explanation at all.
//
//   A dialog is too much furniture for one sentence, and these labels sit inside cards
//   that are already inside a chat that is itself inside a drawer. A third stacked layer
//   is the recurring bug in this codebase, not a pattern to add to.
//
// So it expands IN FLOW, under the label, pushing the field down. That is honest about
// what it is — a footnote, not an interruption — and `aria-expanded`/`aria-controls` tell
// a screen reader there is more to read and where it went.
//
// It owns the whole label LINE rather than just the icon, because the note has to be a
// sibling of the <label>, never a child: a <label> may only contain phrasing content, and
// a nested button would have its click forwarded to the labelled input.
const HintedLabel = ({ htmlFor, hint, hintLabel, className = '', children }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <>
      <div className="mb-1 flex items-baseline gap-1">
        <label htmlFor={htmlFor} className={className}>
          {children}
        </label>
        {hint && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={id}
            aria-label={hintLabel || t('common.whatIsThis')}
            title={hintLabel || t('common.whatIsThis')}
            className={`inline-flex shrink-0 translate-y-[1px] items-center justify-center rounded-full p-0.5 transition-colors hover:text-slate-700 dark:hover:text-slate-200 ${
              open ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {hint && open && (
        <p
          id={id}
          className="mb-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-normal leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400"
        >
          {hint}
        </p>
      )}
    </>
  );
};

export default HintedLabel;
