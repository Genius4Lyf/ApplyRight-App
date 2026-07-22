import React, { useState } from 'react';
import AriaCard from './AriaCard';

// The current year, for the "still here" affordance and the year chips.
const THIS_YEAR = new Date().getFullYear();
const RECENT_YEARS = Array.from({ length: 8 }, (_, i) => String(THIS_YEAR - i));

// Capture one field of a role — role title, company, or dates.
//
// Deliberately NOT one big form: the whole premise of building in chat is that you answer
// one small question at a time. A form would just be the CV builder with extra steps.
//
// FREE — this is typing, not generation. Nothing here calls the AI.
const RoleCaptureCard = ({ stage, entry, section = 'experience', onSubmit, onSkip, busy }) => {
  const [text, setText] = useState('');
  const [start, setStart] = useState(entry?.startDate || '');
  const [end, setEnd] = useState(entry?.endDate || '');
  const [isCurrent, setIsCurrent] = useState(!!entry?.isCurrent);

  if (stage === 'dates') {
    const canSave = !!start.trim();
    return (
      <AriaCard cardKey="capture-dates">
        <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            When were you there?
          </p>

          <label
            htmlFor="studio-role-start"
            className="mt-3 block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            Started
          </label>
          <input
            id="studio-role-start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="e.g. Mar 2021"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors"
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {RECENT_YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setStart(y)}
                className="text-[11px] font-semibold px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                {y}
              </button>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
            />
            <span className="text-[12.5px] text-slate-700 dark:text-slate-200">
              I still work here
            </span>
          </label>

          {!isCurrent && (
            <>
              <label
                htmlFor="studio-role-end"
                className="mt-3 block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
              >
                Ended
              </label>
              <input
                id="studio-role-end"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                placeholder="e.g. Aug 2024"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors"
              />
            </>
          )}

          <button
            type="button"
            onClick={() =>
              onSubmit({ startDate: start.trim(), endDate: isCurrent ? '' : end.trim(), isCurrent })
            }
            disabled={!canSave || busy}
            className="btn-primary w-full mt-4 py-2 text-sm disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </AriaCard>
    );
  }

  // One short question per field, across every section that uses this card.
  const PROMPTS = {
    title: {
      q: 'What was your role called?',
      placeholder: 'e.g. Wireline Field Operator',
      hint: 'Use the title on your contract — an inflated one is the first thing a reference check catches.',
    },
    company: {
      q: 'Where was this?',
      placeholder: 'e.g. Baker Hughes',
      hint: 'The employer’s name as it would appear on a payslip.',
    },
    degree: {
      q: 'What did you study?',
      placeholder: 'e.g. BSc Mechanical Engineering',
      hint: 'The qualification as it appears on the certificate.',
    },
    school: {
      q: 'Where did you study it?',
      placeholder: 'e.g. University of Benin',
      hint: '',
    },
    graduationDate: {
      q: 'When did you finish?',
      placeholder: 'e.g. 2019 (or expected 2026)',
      hint: 'An expected date is fine if you’re still studying.',
    },
  };

  // Projects reuse the `title` field with their own wording — same question, different noun.
  const prompt =
    stage === 'title' && section === 'project'
      ? {
          q: 'What’s the project called?',
          placeholder: 'e.g. Rig telemetry dashboard',
          hint: 'A short, plain name — what you’d call it out loud.',
        }
      : PROMPTS[stage] || PROMPTS.title;

  const canSave = text.trim().length > 1;
  const submit = () => canSave && onSubmit({ [stage]: text.trim() });

  return (
    <AriaCard cardKey={`capture-${stage}`}>
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {prompt.q}
        </p>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={prompt.placeholder}
          className="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors"
        />
        {prompt.hint && (
          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{prompt.hint}</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              disabled={busy}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Skip
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSave || busy}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default RoleCaptureCard;
