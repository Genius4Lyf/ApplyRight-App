import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CopyMessageButton from '../cv/CopyMessageButton';

// A FULL ANSWER SOUNDS LIKE — the panel under Aria's build-with question.
//
// It replaces a "Show me an example" pill that revealed one italic sentence. TWO samples,
// not one: shown a single example people either copy it wholesale or decide it does not
// describe them, whereas two that differ in ANGLE read as a range — which is what makes
// them usable as a model rather than a script.
//
// WHAT THIS DELIBERATELY DOES NOT SHOW: the server's `suggestions`, the short first-person
// openings for the same question. They were in here briefly and came straight back out —
// Aria already writes those openings as bullets inside her reply, where they can be copied
// one at a time, so a second copy underneath was the same text twice in two styles.
//
// The samples are whole sentences and are emphatically NOT the user's claim, which is why
// the panel says so under them every time. A sample answer sitting beneath a question is
// one careless paste away from a claim about work nobody did — the single failure this
// product cannot afford.
//
// Collapsed by default: it is help, and help that opens itself is in the way.
const AnswerExamples = ({ examples = [] }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  // NOTE ON RESETTING: every new question brings new samples, and this must come up
  // collapsed each time rather than inheriting the last question's open state. That is
  // done by the CALLER, which keys this component on the samples themselves — so a new
  // turn remounts it and `open` starts false on its own. Resetting it here in an effect
  // would be a second render for something a key expresses exactly.
  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => {
      bodyRef.current?.scrollIntoView({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'nearest',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const clean = examples.map((s) => String(s || '').trim()).filter(Boolean);
  if (!clean.length) return null;

  return (
    <div className="self-start mb-3 w-full max-w-[92%] pl-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {t('ariaStudio.answerExamples.fullAnswer')}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div ref={bodyRef} className="border-t border-slate-200 dark:border-slate-800">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {clean.map((s) => (
                <li key={s} className="flex items-start gap-2 px-3 py-2">
                  {/* Always visible, not hover-revealed: this panel exists TO be copied
                      from, so hiding its only action would be a puzzle. */}
                  <CopyMessageButton text={s} compact reveal="" className="mt-0.5 shrink-0" />
                  <p className="min-w-0 text-[13px] italic leading-relaxed text-slate-600 dark:text-slate-300">
                    {t('cvBuilder.askAria.exampleFormat', { answer: s })}
                  </p>
                </li>
              ))}
            </ul>
            {/* Said out loud, every time — see the note at the top of this file. */}
            <p className="border-t border-slate-100 px-3 py-2 text-[11px] leading-snug text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
              {t('ariaStudio.answerExamples.sampleNote')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerExamples;
