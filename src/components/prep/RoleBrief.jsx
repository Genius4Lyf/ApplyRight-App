import React from 'react';
import { Target, CheckCircle2, AlertTriangle, Flag, Lightbulb } from 'lucide-react';

// "Understand the exam" orientation, built entirely from the fit-analysis data
// already on the application (no API call). Shown only for job-linked prep.
const mustHave = (arr) =>
  (Array.isArray(arr) ? arr : []).filter((s) => s.importance === 'must_have');

const SkillChip = ({ label, tone }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
      tone === 'have'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-rose-50 text-rose-700 border-rose-200'
    }`}
  >
    {label}
  </span>
);

const Block = ({ icon, title, iconColor, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      {React.createElement(icon, { className: `w-4 h-4 ${iconColor}` })}
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
    </div>
    {children}
  </div>
);

const RoleBrief = ({ application }) => {
  const job = application.jobId || {};
  const title = job.title || application.jobTitle || 'This role';
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

  const scoreColor =
    fitScore == null
      ? 'text-slate-500'
      : fitScore >= 75
        ? 'text-emerald-600'
        : fitScore >= 50
          ? 'text-amber-600'
          : 'text-rose-600';

  const hasAny =
    matched.length || missing.length || recommendation || watchOuts.length || fitScore != null;

  if (!hasAny) {
    return (
      <section className="bg-white border border-dashed border-slate-200 rounded-xl p-6 sm:p-8 text-center">
        <Target className="w-7 h-7 mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-600">
          No role analysis yet. Run a job fit-analysis to see what this interview will test.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              What this interview tests
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 truncate">
              {title}
              {company ? ` · ${company}` : ''}
            </p>
          </div>
        </div>
        {fitScore != null && (
          <div className="text-right shrink-0">
            <p className={`text-2xl font-bold ${scoreColor}`}>{fitScore}%</p>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Fit</p>
          </div>
        )}
      </div>

      {recommendation && <p className="text-sm text-slate-700 leading-relaxed">{recommendation}</p>}

      {/* Strengths to lean on */}
      {matchedMust.length > 0 && (
        <Block icon={CheckCircle2} title="Lean on these strengths" iconColor="text-emerald-600">
          <p className="text-xs text-slate-500 mb-2">
            Must-have skills you already match — bring evidence of these.
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
        <Block icon={AlertTriangle} title="Be ready to defend these gaps" iconColor="text-rose-600">
          <p className="text-xs text-slate-500 mb-2">
            Must-have skills the analysis flagged as weak — expect probing here.
          </p>
          <div className="space-y-2">
            {missingMust.map((s, i) => {
              const action = actionFor(s.name);
              return (
                <div key={i} className="flex items-start gap-2">
                  <SkillChip label={s.name} tone="gap" />
                  {action && (
                    <span className="text-xs text-slate-600 leading-relaxed">{action}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Block>
      )}

      {/* Watch-outs */}
      {watchOuts.length > 0 && (
        <Block icon={Flag} title="Watch-outs" iconColor="text-amber-600">
          <ul className="space-y-1">
            {watchOuts.map((w, i) => (
              <li
                key={i}
                className="text-xs text-slate-700 leading-relaxed pl-3 border-l-2 border-amber-200"
              >
                {w}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* What to prove */}
      <Block icon={Lightbulb} title="What you need to prove" iconColor="text-indigo-600">
        <p className="text-sm text-slate-700 leading-relaxed">
          {matchedMust.length > 0 ? (
            <>
              Show concrete proof of{' '}
              <span className="font-semibold">
                {matchedMust
                  .slice(0, 3)
                  .map((s) => s.name)
                  .join(', ')}
              </span>
              {missingMust.length > 0 ? (
                <>
                  , and have an honest, forward-looking answer ready for{' '}
                  <span className="font-semibold">
                    {missingMust
                      .slice(0, 2)
                      .map((s) => s.name)
                      .join(', ')}
                  </span>
                  .
                </>
              ) : (
                '.'
              )}
            </>
          ) : (
            'Lead with your most relevant, measurable wins and connect each to what this role needs.'
          )}{' '}
          Use your <span className="font-semibold text-indigo-700">Stories</span> as the evidence.
        </p>
      </Block>
    </section>
  );
};

export default RoleBrief;
