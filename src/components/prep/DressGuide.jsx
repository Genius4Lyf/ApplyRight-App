import React from 'react';
import AriaLoader from '../ui/AriaLoader';
import { Shirt, CheckCircle2, Sparkles, Loader } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Capacitor } from '@capacitor/core';

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const DRESS_LABEL_KEYS = {
  business_formal: 'interviewPrep.dressGuide.labels.business_formal',
  business_casual: 'interviewPrep.dressGuide.labels.business_casual',
  smart_casual: 'interviewPrep.dressGuide.labels.smart_casual',
  creative: 'interviewPrep.dressGuide.labels.creative',
  uniform_or_specialized: 'interviewPrep.dressGuide.labels.uniform_or_specialized',
};

// Tailored, AI-generated "what to wear / first impression" guide for the role.
// Lives on the Game-day tab (it's game-day prep, not role analysis).
const DressGuide = ({ application, onGenerate, generating }) => {
  const { t } = useTranslation();
  const dressGuide = application?.interviewPrep?.dressGuide || null;
  const hasDress = !!(dressGuide && dressGuide.summary);
  const job = application?.jobId || {};
  const company = job.company || application?.jobCompany || '';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Shirt className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {t('interviewPrep.dressGuide.heading')}
        </h3>
      </div>

      {hasDress ? (
        <div className="space-y-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            {DRESS_LABEL_KEYS[dressGuide.dressCode]
              ? t(DRESS_LABEL_KEYS[dressGuide.dressCode])
              : t('interviewPrep.dressGuide.dressCodeFallback')}
          </span>
          {dressGuide.summary && (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {dressGuide.summary}
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {dressGuide.wear?.length > 0 && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                  {t('interviewPrep.dressGuide.wear')}
                </p>
                <ul className="space-y-1">
                  {dressGuide.wear.map((w, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {dressGuide.avoid?.length > 0 && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                  {t('interviewPrep.dressGuide.avoid')}
                </p>
                <ul className="space-y-1">
                  {dressGuide.avoid.map((w, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5"
                    >
                      <span className="text-rose-500 dark:text-rose-300 shrink-0 font-bold">✕</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {(dressGuide.virtualTip || dressGuide.groomingNote) && (
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {dressGuide.virtualTip && (
                <p>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {t('interviewPrep.dressGuide.onCamera')}
                  </span>{' '}
                  {dressGuide.virtualTip}
                </p>
              )}
              {dressGuide.groomingNote && (
                <p>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {t('interviewPrep.dressGuide.grooming')}
                  </span>{' '}
                  {dressGuide.groomingNote}
                </p>
              )}
            </div>
          )}
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-900 dark:hover:decoration-slate-100 disabled:opacity-60"
            >
              {generating
                ? t('interviewPrep.dressGuide.refreshing')
                : t('interviewPrep.dressGuide.regenerate')}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
            <Trans
              i18nKey="interviewPrep.dressGuide.emptyBody"
              values={{ company: company || t('interviewPrep.dressGuide.thisRole') }}
              components={{ b: <span className="font-semibold" /> }}
            />
          </p>
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold disabled:opacity-60"
            >
              {generating ? (
                <AriaLoader inline tone="mono" size={14} label={t('interviewPrep.dressGuide.refreshing')} />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {generating
                ? t('interviewPrep.dressGuide.styling')
                : t('interviewPrep.dressGuide.generateGuide', {
                    cost: isAndroidNative()
                      ? t('interviewPrep.dressGuide.watchAd')
                      : t('interviewPrep.dressGuide.twoCredits'),
                  })}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DressGuide;
