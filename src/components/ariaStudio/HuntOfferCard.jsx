import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// The third way into the cross-history hunt, offered at the moment an entry interview
// closes: the job asked for something, this role couldn't show it, and the rest of the
// CV hasn't been asked yet.
//
// Offered here rather than mid-interview because the question only makes sense once the
// user has finished talking about THIS role — asking earlier would read as Aria not
// listening. And offered, never assumed: declining is a first-class answer that costs
// nothing and is never followed up.
const HuntOfferCard = ({ name, onAccept, onDecline, busy }) => {
  const { t } = useTranslation();
  return (
    <AriaCard cardKey={`huntoffer-${name}`}>
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.chat.huntOffer.eyebrow')}
        </p>
        <p className="mt-2 text-[14px] text-slate-800 dark:text-slate-100">
          {t('ariaStudio.chat.huntOffer.body', { name })}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className="rounded-xl bg-slate-900 dark:bg-white px-3.5 py-2 text-[13px] font-semibold text-white dark:text-slate-900 transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
          >
            {t('ariaStudio.chat.huntOffer.accept')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDecline}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-[13px] text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-900 dark:hover:border-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
          >
            {t('ariaStudio.chat.huntOffer.decline')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default HuntOfferCard;
