import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [start, setStart] = useState(entry?.startDate || '');
  const [end, setEnd] = useState(entry?.endDate || '');
  const [isCurrent, setIsCurrent] = useState(!!entry?.isCurrent);

  if (stage === 'dates') {
    const canSave = !!start.trim();
    return (
      <AriaCard cardKey="capture-dates" wide>
        <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.roleCapture.whenWereYouThere')}
          </p>

          <label
            htmlFor="studio-role-start"
            className="mt-3 block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
          >
            {t('ariaStudio.roleCapture.started')}
          </label>
          <input
            id="studio-role-start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder={t('ariaStudio.roleCapture.startedPlaceholder')}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {RECENT_YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setStart(y)}
                className="text-[12px] font-semibold px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-900 hover:text-slate-950 dark:hover:border-white dark:hover:text-white transition-colors"
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
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:text-white dark:focus:ring-white"
            />
            <span className="text-[16px] text-slate-700 dark:text-slate-200">
              {t('ariaStudio.roleCapture.stillWorkHere')}
            </span>
          </label>

          {!isCurrent && (
            <>
              <label
                htmlFor="studio-role-end"
                className="mt-3 block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
              >
                {t('ariaStudio.roleCapture.ended')}
              </label>
              <input
                id="studio-role-end"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                placeholder={t('ariaStudio.roleCapture.endedPlaceholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
              />
            </>
          )}

          <button
            type="button"
            onClick={() =>
              onSubmit({ startDate: start.trim(), endDate: isCurrent ? '' : end.trim(), isCurrent })
            }
            disabled={!canSave || busy}
            className="btn-primary w-full mt-4 py-2 text-[16px] disabled:opacity-50"
          >
            {busy ? t('ariaStudio.roleCapture.saving') : t('ariaStudio.roleCapture.save')}
          </button>
        </div>
      </AriaCard>
    );
  }

  // One short question per field, across every section that uses this card.
  const PROMPTS = {
    title: {
      q: t('ariaStudio.roleCapture.prompts.title.q'),
      placeholder: t('cvBuilder.atsCoach.jobTitlePlaceholder'),
      hint: t('ariaStudio.roleCapture.prompts.title.hint'),
    },
    company: {
      q: t('ariaStudio.roleCapture.prompts.company.q'),
      placeholder: t('ariaStudio.roleCapture.prompts.company.placeholder'),
      hint: t('ariaStudio.roleCapture.prompts.company.hint'),
    },
    degree: {
      q: t('ariaStudio.roleCapture.prompts.degree.q'),
      placeholder: t('ariaStudio.roleCapture.prompts.degree.placeholder'),
      hint: t('ariaStudio.roleCapture.prompts.degree.hint'),
    },
    school: {
      q: t('ariaStudio.roleCapture.prompts.school.q'),
      placeholder: t('ariaStudio.roleCapture.prompts.school.placeholder'),
      hint: '',
    },
    graduationDate: {
      q: t('ariaStudio.roleCapture.prompts.graduationDate.q'),
      placeholder: t('ariaStudio.roleCapture.prompts.graduationDate.placeholder'),
      hint: t('ariaStudio.roleCapture.prompts.graduationDate.hint'),
    },
  };

  // Projects reuse the `title` field with their own wording — same question, different noun.
  const prompt =
    stage === 'title' && section === 'project'
      ? {
          q: t('ariaStudio.roleCapture.prompts.projectTitle.q'),
          placeholder: t('ariaStudio.roleCapture.prompts.projectTitle.placeholder'),
          hint: t('ariaStudio.roleCapture.prompts.projectTitle.hint'),
        }
      : PROMPTS[stage] || PROMPTS.title;

  const canSave = text.trim().length > 1;
  const submit = () => canSave && onSubmit({ [stage]: text.trim() });

  return (
    <AriaCard cardKey={`capture-${stage}`} wide>
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {prompt.q}
        </p>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={prompt.placeholder}
          className="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
        />
        {prompt.hint && (
          <p className="mt-1.5 text-[12px] text-slate-400 dark:text-slate-500">{prompt.hint}</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              disabled={busy}
              className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {t('ariaStudio.roleCapture.skip')}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSave || busy}
            className="btn-primary px-5 py-2 text-[16px] disabled:opacity-50"
          >
            {busy ? t('ariaStudio.roleCapture.saving') : t('ariaStudio.roleCapture.save')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default RoleCaptureCard;
