import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import CardEyebrow from './CardEyebrow';

// "SHALL I KEEP THESE?" — offered once the contact block is confirmed, when the CV holds a
// detail the account does not.
//
// The chore this removes is real and was partly a bug: `phone` was read in four places and
// declared on the User schema in none, so every number typed into the Profile page was
// dropped in Mongoose strict mode behind a 200 response. People retyped their phone into
// every CV because the app kept losing it.
//
// WHY IT ASKS RATHER THAN JUST SAVING. Writing someone's phone number and home location to
// their account is not a formatting preference; it is personal data crossing from one
// document into the profile that seeds all the others. Silent capture would be both a
// surprise and, for a location, occasionally a real problem.
//
// Per-field toggles for the same reason: "save my LinkedIn but not where I live" is a
// perfectly ordinary thing to want, and an all-or-nothing button forces the whole answer
// to be no.
//
// Two ways out, and they mean different things. "Not now" closes this card and Aria may
// offer again on the next CV. "Don't show again" is a persisted decision
// (settings.hideContactSavePrompt) that stops the offer for good — so a user who does not
// want their details stored says it once, not every time.
const ContactSaveCard = ({ rows = [], onSave, onDismiss, onNeverAsk, saving = false }) => {
  const { t } = useTranslation();
  // Everything ticked by default: these are details the user just typed on purpose, so the
  // likely answer is yes — but an unticked box has to be able to mean no.
  const [chosen, setChosen] = useState(() => rows.map((r) => r.key));

  if (!rows.length) return null;

  const toggle = (key) =>
    setChosen((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );

  return (
    <AriaCard cardKey="contactsave">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <CardEyebrow icon="📇">{t('ariaStudio.contactSave.eyebrow')}</CardEyebrow>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
          {t('ariaStudio.contactSave.body')}
        </p>

        <ul className="mt-3 flex flex-col gap-1.5">
          {rows.map((row) => {
            const on = chosen.includes(row.key);
            return (
              <li key={row.key}>
                <label className="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={saving}
                    onChange={() => toggle(row.key)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 dark:border-slate-600 accent-slate-900 dark:accent-white"
                  />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">
                      {t(`ariaStudio.contactSave.fields.${row.key}`)}
                    </span>
                    {/* The actual value, so nobody agrees to save something they can't see —
                        `break-all` because a portfolio URL has no spaces to wrap on. */}
                    <span className="block text-[12px] leading-relaxed text-slate-500 dark:text-slate-400 break-all">
                      {row.value}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => onSave?.(chosen)}
          disabled={saving || chosen.length === 0}
          className="btn-primary w-full mt-3 py-2 text-sm disabled:opacity-50"
        >
          {saving ? t('ariaStudio.contactSave.saving') : t('ariaStudio.contactSave.save')}
        </button>

        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDismiss}
            disabled={saving}
            className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('ariaStudio.contactSave.notNow')}
          </button>
          {/* Quieter than "Not now" on purpose: it is the rarer answer and the permanent
              one, so it should take a deliberate look to find. */}
          <button
            type="button"
            onClick={onNeverAsk}
            disabled={saving}
            className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('ariaStudio.contactSave.neverAsk')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default ContactSaveCard;
