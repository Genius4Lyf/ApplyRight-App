import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, User, Eye, Hand, Zap, Smile } from 'lucide-react';

// Static, research-backed presence coaching. First impressions form in ~7
// seconds, so how you carry yourself matters before you say a word.
// Copy → i18n KEYS resolved via t() at render.
const TIPS = [
  { icon: Clock, i: 0 },
  { icon: User, i: 1 },
  { icon: Eye, i: 2 },
  { icon: Hand, i: 3 },
  { icon: Zap, i: 4 },
  { icon: Smile, i: 5 },
];

const BodyLanguage = () => {
  const { t } = useTranslation();
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Smile className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {t('interviewPrep.bodyLanguage.heading')}
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        {t('interviewPrep.bodyLanguage.subtitle')}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {TIPS.map((tip) => (
          <div
            key={tip.i}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                <tip.icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t(`interviewPrep.bodyLanguage.tips.${tip.i}.title`)}
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t(`interviewPrep.bodyLanguage.tips.${tip.i}.body`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BodyLanguage;
