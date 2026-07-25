import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Info, X } from 'lucide-react';

// "How am I scored?" explainer — a small info dialog users can open to understand
// what drives the Shaky / Okay / Strong rating. Uses a centered fixed modal so it
// isn't clipped by the card's overflow-hidden.
// The dot is the only colour — labels stay ink, matching the score figures.
const BANDS = [
  { labelKey: 'interviewPrep.scoringInfo.bands.strong', range: '75–100', dot: 'bg-emerald-500' },
  { labelKey: 'interviewPrep.scoringInfo.bands.okay', range: '45–74', dot: 'bg-amber-500' },
  { labelKey: 'interviewPrep.scoringInfo.bands.shaky', range: '0–44', dot: 'bg-rose-500' },
];

const LOOKS_AT_KEYS = [
  'interviewPrep.scoringInfo.looksAt.0',
  'interviewPrep.scoringInfo.looksAt.1',
  'interviewPrep.scoringInfo.looksAt.2',
  'interviewPrep.scoringInfo.looksAt.3',
  'interviewPrep.scoringInfo.looksAt.4',
  'interviewPrep.scoringInfo.looksAt.5',
  'interviewPrep.scoringInfo.looksAt.6',
];

const ScoringInfo = ({ className = '' }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer ${className}`}
      >
        <Info className="w-3.5 h-3.5" /> {t('interviewPrep.scoringInfo.howScored')}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 pr-6">
                {t('interviewPrep.scoringInfo.title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('interviewPrep.scoringInfo.intro')}
              </p>

              <div className="mt-3 space-y-1.5">
                {BANDS.map((b) => (
                  <div key={b.labelKey} className="flex items-center gap-2.5 text-sm">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${b.dot}`} />
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {t(b.labelKey)}
                    </span>
                    <span className="ml-auto text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                      {b.range}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                {t('interviewPrep.scoringInfo.whatWeLookAt')}
              </p>
              <ul className="mt-1.5 space-y-1">
                {LOOKS_AT_KEYS.map((k) => (
                  <li
                    key={k}
                    className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-1.5 shrink-0" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5 leading-relaxed">
                <Trans
                  i18nKey="interviewPrep.scoringInfo.footer"
                  components={{ b: <span className="font-semibold text-slate-700 dark:text-slate-200" /> }}
                />
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ScoringInfo;
