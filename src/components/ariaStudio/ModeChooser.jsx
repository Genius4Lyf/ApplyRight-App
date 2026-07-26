import React from 'react';
import { Target, FilePlus2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// The Studio's first fork: what are we here to do? Both modes are live — tailoring
// reworks a copy against a job description (the original stays untouched), and build
// creates a brand-new CV in-chat. The Studio is the front door for both.
const ModeChooser = ({ onPick }) => {
  const { t } = useTranslation();
  return (
    <AriaCard cardKey="mode">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.modeChooser.whatAreWeDoing')}
        </p>

        <button
          type="button"
          onClick={() => onPick('tailor')}
          className="mt-3 w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 p-3.5 flex items-start gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {/* Decorative — it illustrates the mode, it isn't an action. Neutral chip,
              matching the builder's entry cards (Education's GraduationCap). */}
          <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
            <Target className="w-4 h-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
              {t('ariaStudio.modeChooser.tailorTitle')}
            </span>
            <span className="block mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t('ariaStudio.modeChooser.tailorBody')}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onPick('build')}
          className="mt-2 w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 p-3.5 flex items-start gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
            <FilePlus2 className="w-4 h-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
              {t('ariaStudio.modeChooser.buildTitle')}
            </span>
            <span className="block mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t('ariaStudio.modeChooser.buildBody')}
            </span>
          </span>
        </button>
      </div>
    </AriaCard>
  );
};

export default ModeChooser;
