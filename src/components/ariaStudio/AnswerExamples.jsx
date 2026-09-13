import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CopyMessageButton from '../cv/CopyMessageButton';

// WAYS TO ANSWER — the panel under Aria's build-with question.
//
// It replaces a single "Show me an example" pill that revealed one italic sentence. Two
// things were wrong with that:
//
//   1. ONE example is a coincidence, not a pattern. Shown a single sample, people either
//      copy it wholesale or decide it does not describe them and give up. Three or four
//      openings, visibly different from each other, read as "here are some angles" —
//      which is what they are.
//   2. THE STARTERS WERE NOT ON SCREEN AT ALL. The server has always returned
//      `suggestions` — short first-person openings with a literal "___" where the user's
//      own detail goes — and the UI dropped them, on the theory that Aria repeats them as
//      bullets inside her reply. She often did not, and when she did there was no way to
//      lift one out. So the most useful thing the turn produced was the one thing you
//      could not reach.
//
// THE TWO KINDS ARE KEPT APART ON PURPOSE. A starter is a scaffold to finish in your own
// words; the example is a whole sample answer that is emphatically NOT the user's claim.
// Running them together would invite someone to paste a sentence about work they never
// did, which is the one failure this product cannot afford.
//
// Collapsed by default: it is help, and help that opens itself is in the way.
const AnswerExamples = ({ starters = [], example = '', label = '' }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  // NOTE ON RESETTING: every new question is a new set of answers, and this must come up
  // collapsed each time rather than inheriting the last question's open state. That is
  // done by the CALLER, which keys this component on the answers themselves — so a new
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

  const clean = starters.map((s) => String(s || '').trim()).filter(Boolean);
  const sample = String(example || '').trim();
  if (!clean.length && !sample) return null;

  const heading = String(label || '').trim() || t('ariaStudio.answerExamples.title');

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
            {heading}
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
            {clean.length > 0 && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {clean.map((s) => (
                  <li
                    key={s}
                    className="flex items-start gap-2 px-3 py-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200"
                  >
                    {/* Always visible here, not hover-revealed: this panel exists TO be
                        copied from, so hiding its only action would be a puzzle. */}
                    <CopyMessageButton text={s} compact reveal="" className="mt-0.5 shrink-0" />
                    <span className="min-w-0">{s}</span>
                  </li>
                ))}
              </ul>
            )}

            {sample && (
              <div
                className={`px-3 py-2 ${
                  clean.length ? 'border-t border-slate-200 dark:border-slate-800' : ''
                } bg-slate-50/60 dark:bg-slate-800/20`}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t('ariaStudio.answerExamples.fullAnswer')}
                </p>
                <div className="mt-1 flex items-start gap-2">
                  <CopyMessageButton text={sample} compact reveal="" className="mt-0.5 shrink-0" />
                  <p className="min-w-0 text-[13px] italic leading-relaxed text-slate-600 dark:text-slate-300">
                    {t('cvBuilder.askAria.exampleFormat', { answer: sample })}
                  </p>
                </div>
                {/* Said out loud, every time. A sample answer sitting under a question is
                    one careless paste away from becoming a claim about work nobody did. */}
                <p className="mt-1.5 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
                  {t('ariaStudio.answerExamples.sampleNote')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerExamples;
