import React from 'react';
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Flag,
  Lightbulb,
  Shirt,
  Sparkles,
  Loader,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const DRESS_LABELS = {
  business_formal: 'Business formal',
  business_casual: 'Business casual',
  smart_casual: 'Smart casual',
  creative: 'Creative / polished',
  uniform_or_specialized: 'Role-specific',
};

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

const RoleBrief = ({ application, onGenerateDressGuide, generatingDress }) => {
  const job = application.jobId || {};
  const title = job.title || application.jobTitle || 'This role';
  const company = job.company || application.jobCompany || '';
  const dressGuide = application.interviewPrep?.dressGuide || null;
  const hasDress = !!(dressGuide && dressGuide.summary);
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
      ? 'text-slate-500 dark:text-slate-400'
      : fitScore >= 75
        ? 'text-emerald-600 dark:text-emerald-300'
        : fitScore >= 50
          ? 'text-amber-600 dark:text-amber-300'
          : 'text-rose-600 dark:text-rose-300';

  const hasAny =
    matched.length || missing.length || recommendation || watchOuts.length || fitScore != null;

  if (!hasAny) {
    return (
      <section className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 text-center">
        <Target className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No role analysis yet. Run a job fit-analysis to see what this interview will test.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              What this interview tests
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              {title}
              {company ? ` · ${company}` : ''}
            </p>
          </div>
        </div>
        {fitScore != null && (
          <div className="text-right shrink-0">
            <p className={`text-2xl font-bold ${scoreColor}`}>{fitScore}%</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">
              Fit
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
          title="Lean on these strengths"
          iconColor="text-emerald-600 dark:text-emerald-300"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
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
        <Block
          icon={AlertTriangle}
          title="Be ready to defend these gaps"
          iconColor="text-rose-600 dark:text-rose-300"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Must-have skills the analysis flagged as weak — expect probing here.
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
        <Block icon={Flag} title="Watch-outs" iconColor="text-amber-600 dark:text-amber-300">
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
        title="What you need to prove"
        iconColor="text-indigo-600 dark:text-indigo-300"
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
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
          Use your{' '}
          <span className="font-semibold text-indigo-700 dark:text-indigo-300">Stories</span> as the
          evidence.
        </p>
      </Block>

      {/* Dress & first impression — tailored, AI-generated */}
      <Block
        icon={Shirt}
        title="Dress & first impression"
        iconColor="text-indigo-600 dark:text-indigo-300"
      >
        {hasDress ? (
          <div className="space-y-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
              {DRESS_LABELS[dressGuide.dressCode] || 'Dress code'}
            </span>
            {dressGuide.summary && (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {dressGuide.summary}
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {dressGuide.wear?.length > 0 && (
                <div className="rounded-lg border border-emerald-100 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/15 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-300 mb-1.5">
                    Wear
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
                <div className="rounded-lg border border-rose-100 dark:border-rose-500/30 bg-rose-50/40 dark:bg-rose-500/15 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-rose-700 dark:text-rose-300 mb-1.5">
                    Avoid
                  </p>
                  <ul className="space-y-1">
                    {dressGuide.avoid.map((w, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5"
                      >
                        <span className="text-rose-500 dark:text-rose-300 shrink-0 font-bold">
                          ✕
                        </span>
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
                      On camera:
                    </span>{' '}
                    {dressGuide.virtualTip}
                  </p>
                )}
                {dressGuide.groomingNote && (
                  <p>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Grooming:
                    </span>{' '}
                    {dressGuide.groomingNote}
                  </p>
                )}
              </div>
            )}
            {onGenerateDressGuide && (
              <button
                type="button"
                onClick={onGenerateDressGuide}
                disabled={generatingDress}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 disabled:opacity-60"
              >
                {generatingDress ? 'Refreshing…' : 'Regenerate guide'}
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              Get a tailored what-to-wear guide for{' '}
              <span className="font-semibold">{company || 'this role'}</span> — outfit, what to
              avoid, and first-impression tips. Dressing one step above the team can swing the room
              in your favour.
            </p>
            {onGenerateDressGuide && (
              <button
                type="button"
                onClick={onGenerateDressGuide}
                disabled={generatingDress}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
              >
                {generatingDress ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {generatingDress
                  ? 'Styling…'
                  : `Generate dress guide · ${isAndroidNative() ? 'watch an ad' : '2 credits'}`}
              </button>
            )}
          </div>
        )}
      </Block>
    </section>
  );
};

export default RoleBrief;
