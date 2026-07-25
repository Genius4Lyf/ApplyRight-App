import React from 'react';
import { Target, CheckCircle2, AlertTriangle, Flag, Lightbulb } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

// "Understand the exam" orientation, built entirely from the fit-analysis data
// already on the application (no API call). Shown only for job-linked prep.
const mustHave = (arr) =>
  (Array.isArray(arr) ? arr : []).filter((s) => s.importance === 'must_have');

const SkillChip = ({ label, tone }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
      tone === 'have'
        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
        : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
    }`}
  >
    {label}
  </span>
);

const Block = ({ icon, title, iconColor, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      {React.createElement(icon, { className: `w-4 h-4 ${iconColor}` })}
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
    </div>
    {children}
  </div>
);

const RoleBrief = ({ application }) => {
  const { t } = useTranslation();
  const job = application.jobId || {};
  const title = job.title || application.jobTitle || t('interviewPrep.roleBrief.thisRole');
  const company = job.company || application.jobCompany || '';
  const fit = application.fitAnalysis || {};
  const fitScore = typeof application.fitScore === 'number' ? application.fitScore : null;

  const matched = fit.matchedSkills || [];
  const missing = fit.missingSkills || [];
  const matchedMust = mustHave(matched);
  const missingMust = mustHave(missing);
  const recommendation = fit.recommendation || fit.overallFeedback || '';
  const exp = fit.experienceAnalysis;
  const sen = fit.seniorityAnalysis;
  const actionPlan = Array.isArray(application.actionPlan) ? application.actionPlan : [];

  const watchOuts = [
    exp && exp.match === false && exp.feedback ? exp.feedback : null,
    sen && sen.match === false && sen.feedback ? sen.feedback : null,
  ].filter(Boolean);

  // Action text for a missing must-have, if the action plan covers it.
  const actionFor = (skillName) => {
    const hit = actionPlan.find(
      (a) => (a.skill || '').toLowerCase() === (skillName || '').toLowerCase()
    );
    return hit?.action || hit?.task || null;
  };

  // The fit figure is ink; the band shows as one small semantic dot on the label.
  const scoreDot =
    fitScore == null
      ? 'bg-slate-300 dark:bg-slate-600'
      : fitScore >= 75
        ? 'bg-emerald-500'
        : fitScore >= 50
          ? 'bg-amber-500'
          : 'bg-rose-500';

  const hasAny =
    matched.length || missing.length || recommendation || watchOuts.length || fitScore != null;

  if (!hasAny) {
    return (
      <section className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 text-center">
        <Target className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('interviewPrep.roleBrief.emptyState')}
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('interviewPrep.roleBrief.whatItTests')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              {title}
              {company ? ` · ${company}` : ''}
            </p>
          </div>
        </div>
        {fitScore != null && (
          <div className="text-right shrink-0">
            <p className="font-heading text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {fitScore}%
            </p>
            <p className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${scoreDot}`} />
              {t('interviewPrep.roleBrief.fit')}
            </p>
          </div>
        )}
      </div>

      {recommendation && (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {recommendation}
        </p>
      )}

      {/* Strengths to lean on */}
      {matchedMust.length > 0 && (
        <Block
          icon={CheckCircle2}
          title={t('interviewPrep.roleBrief.leanStrengths')}
          iconColor="text-emerald-600 dark:text-emerald-300"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {t('interviewPrep.roleBrief.leanStrengthsBody')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matchedMust.map((s, i) => (
              <SkillChip key={i} label={s.name} tone="have" />
            ))}
          </div>
        </Block>
      )}

      {/* Gaps to shore up */}
      {missingMust.length > 0 && (
        <Block
          icon={AlertTriangle}
          title={t('interviewPrep.roleBrief.defendGaps')}
          iconColor="text-rose-600 dark:text-rose-300"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {t('interviewPrep.roleBrief.defendGapsBody')}
          </p>
          <div className="space-y-2">
            {missingMust.map((s, i) => {
              const action = actionFor(s.name);
              return (
                <div key={i} className="flex items-start gap-2">
                  <SkillChip label={s.name} tone="gap" />
                  {action && (
                    <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {action}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Block>
      )}

      {/* Watch-outs */}
      {watchOuts.length > 0 && (
        <Block
          icon={Flag}
          title={t('interviewPrep.roleBrief.watchOuts')}
          iconColor="text-amber-600 dark:text-amber-300"
        >
          <ul className="space-y-1">
            {watchOuts.map((w, i) => (
              <li
                key={i}
                className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-3 border-l-2 border-amber-200 dark:border-amber-500/30"
              >
                {w}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* What to prove */}
      <Block
        icon={Lightbulb}
        title={t('interviewPrep.roleBrief.whatToProve')}
        iconColor="text-slate-400 dark:text-slate-500"
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {matchedMust.length > 0 ? (
            missingMust.length > 0 ? (
              <Trans
                i18nKey="interviewPrep.roleBrief.proveBoth"
                values={{
                  strengths: matchedMust
                    .slice(0, 3)
                    .map((s) => s.name)
                    .join(', '),
                  gaps: missingMust
                    .slice(0, 2)
                    .map((s) => s.name)
                    .join(', '),
                }}
                components={{ b: <span className="font-semibold" /> }}
              />
            ) : (
              <Trans
                i18nKey="interviewPrep.roleBrief.proveStrengths"
                values={{
                  strengths: matchedMust
                    .slice(0, 3)
                    .map((s) => s.name)
                    .join(', '),
                }}
                components={{ b: <span className="font-semibold" /> }}
              />
            )
          ) : (
            t('interviewPrep.roleBrief.proveFallback')
          )}{' '}
          <Trans
            i18nKey="interviewPrep.roleBrief.proveSuffix"
            components={{ b: <span className="font-semibold text-slate-900 dark:text-slate-100" /> }}
          />
        </p>
      </Block>
    </section>
  );
};

export default RoleBrief;
