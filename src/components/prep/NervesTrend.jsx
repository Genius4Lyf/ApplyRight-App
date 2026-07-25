import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { getInterviewTrend } from '../../utils/interviewPrep';
import ScoringInfo from './ScoringInfo';

// Visualises how the user's self-rated nerves move across recent Interview Mode
// runs — the exposure-therapy selling point made tangible ("each rep gets
// easier"). Reads interviewPrep.interviewHistory; renders nothing until there's
// at least one run.
// Bars are ink — height alone carries the signal, so the chart needs no colour.
const RANK = { needs_work: 1, almost: 2, ready: 3 };
const LABEL_KEYS = {
  needs_work: 'interviewPrep.nervesTrend.label.needs_work',
  almost: 'interviewPrep.nervesTrend.label.almost',
  ready: 'interviewPrep.nervesTrend.label.ready',
};

const NervesTrend = ({ application }) => {
  const { t } = useTranslation();
  const history = Array.isArray(application?.interviewPrep?.interviewHistory)
    ? application.interviewPrep.interviewHistory
    : [];
  if (history.length === 0) return null;

  const trend = getInterviewTrend(application);
  const recent = history.slice(-8); // last 8 runs for the mini chart

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <h3 className="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {t('interviewPrep.nervesTrend.heading')}
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
        <Trans
          i18nKey="interviewPrep.nervesTrend.descMain"
          components={{ b: <span className="font-semibold text-slate-600 dark:text-slate-300" /> }}
        />{' '}
        {trend.trend === 'up'
          ? t('interviewPrep.nervesTrend.trendUp')
          : t('interviewPrep.nervesTrend.trendOther')}
      </p>
      <div className="flex items-end gap-2 h-20">
        {recent.map((h, i) => {
          const conf = h.confidence || 'needs_work';
          const pct = ((RANK[conf] || 1) / 3) * 100;
          return (
            <div
              key={i}
              className="flex-1 rounded-t bg-slate-900 dark:bg-white transition-all"
              style={{ height: `${pct}%` }}
              title={t(LABEL_KEYS[conf])}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
        <span>{t('interviewPrep.nervesTrend.earlier')}</span>
        <span>{t('interviewPrep.nervesTrend.latest')}</span>
      </div>

      {/* Legend — a mini bar at each height so the scale is self-explanatory */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          {['needs_work', 'almost', 'ready'].map((c) => (
            <span
              key={c}
              className="inline-flex items-end gap-1 text-[11px] text-slate-500 dark:text-slate-400"
            >
              <span
                className="w-1.5 rounded-t bg-slate-900 dark:bg-white"
                style={{ height: `${(RANK[c] / 3) * 12}px` }}
              />
              {t(LABEL_KEYS[c])}
            </span>
          ))}
        </div>
        <ScoringInfo />
      </div>
    </section>
  );
};

export default NervesTrend;
