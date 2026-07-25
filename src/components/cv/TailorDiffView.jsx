import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Plus, Minus, Equal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CVService from '../../services/cv.service';

const Section = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-semibold text-slate-700 dark:text-slate-300"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
};

const ScoreBar = ({ label, score, color }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-slate-500 dark:text-slate-400 w-14">{label}</span>
    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-900">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
    <span className="text-xs font-semibold w-10 text-right">{score}%</span>
  </div>
);

const TailorDiffView = ({ originalCVId, currentCVData, tailoredForJob, atsScores }) => {
  const { t } = useTranslation();
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!originalCVId) return;
    let cancelled = false;

    const fetchOriginal = async () => {
      try {
        const data = await CVService.getDraftById(originalCVId);
        if (!cancelled) setOriginal(data);
      } catch {
        if (!cancelled) setOriginal(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOriginal();
    return () => {
      cancelled = true;
    };
  }, [originalCVId]);

  if (loading) {
    return (
      <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
        {t('cvBuilder.tailorDiff.loading')}
      </div>
    );
  }

  if (!original) {
    return null;
  }

  // Skills diff
  const originalSkillNames = new Set(
    (original.skills || []).map((s) => (typeof s === 'string' ? s : s.name).toLowerCase())
  );
  const currentSkillNames = new Set(
    (currentCVData.skills || []).map((s) => (typeof s === 'string' ? s : s.name).toLowerCase())
  );

  const keptSkills = [...currentSkillNames].filter((s) => originalSkillNames.has(s));
  const addedSkills = [...currentSkillNames].filter((s) => !originalSkillNames.has(s));
  const removedSkills = [...originalSkillNames].filter((s) => !currentSkillNames.has(s));

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200">
          {t('cvBuilder.tailorDiff.whatChanged')}
        </h3>
        {tailoredForJob && (
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
            {t('cvBuilder.common.tailoredFor', {
              title: tailoredForJob.title,
              company: tailoredForJob.company,
            })}
          </span>
        )}
      </div>

      {/* ATS Score comparison */}
      {atsScores && (
        <Section title={t('cvBuilder.tailorDiff.atsMatchScore')} defaultOpen>
          <div className="space-y-2">
            <ScoreBar
              label={t('cvBuilder.tailorDiff.before')}
              score={atsScores.before?.fitScore || 0}
              color="bg-slate-400"
            />
            <ScoreBar
              label={t('cvBuilder.tailorDiff.after')}
              score={atsScores.after?.fitScore || 0}
              color="bg-emerald-500"
            />
            {atsScores.before && atsScores.after && (
              <p className="text-xs text-emerald-600 dark:text-emerald-300 font-medium mt-1">
                {t('cvBuilder.tailorDiff.pointsImprovement', {
                  n: (atsScores.after.fitScore || 0) - (atsScores.before.fitScore || 0),
                })}
              </p>
            )}
          </div>
        </Section>
      )}

      {/* Summary diff */}
      {(original.professionalSummary || currentCVData.professionalSummary) && (
        <Section title={t('cvBuilder.tailorDiff.professionalSummary')} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                {t('cvBuilder.tailorDiff.original')}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-900 rounded p-2">
                {original.professionalSummary || t('cvBuilder.tailorDiff.noSummary')}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-500 dark:text-emerald-300 font-semibold">
                {t('cvBuilder.tailorDiff.tailored')}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed bg-emerald-50 dark:bg-emerald-500/15 rounded p-2 border border-emerald-100 dark:border-emerald-500/30">
                {currentCVData.professionalSummary || t('cvBuilder.tailorDiff.noSummary')}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Experience diff */}
      {currentCVData.experience?.length > 0 && (
        <Section
          title={t('cvBuilder.tailorDiff.experienceRoles', {
            n: currentCVData.experience.length,
          })}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {currentCVData.experience.map((exp, i) => {
              const origExp = original.experience?.[i];
              const changed = origExp && origExp.description !== exp.description;
              return (
                <div key={i} className="text-xs">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('cvBuilder.tailorDiff.roleAtCompany', {
                      title: exp.title,
                      company: exp.company,
                    })}
                    {changed && (
                      <span className="ml-2 text-[10px] text-emerald-500 dark:text-emerald-300 font-normal">
                        {t('cvBuilder.tailorDiff.enhanced')}
                      </span>
                    )}
                  </p>
                  {changed ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-900 rounded p-2 text-slate-500 dark:text-slate-400 leading-relaxed">
                        {origExp.description || t('cvBuilder.tailorDiff.noDescription')}
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-500/15 rounded p-2 text-slate-700 dark:text-slate-300 leading-relaxed border border-emerald-100 dark:border-emerald-500/30">
                        {exp.description || t('cvBuilder.tailorDiff.noDescription')}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic">
                      {t('cvBuilder.tailorDiff.noChanges')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Skills diff */}
      {(addedSkills.length > 0 || removedSkills.length > 0) && (
        <Section title={t('cvBuilder.tailorDiff.skills')} defaultOpen>
          <div className="flex flex-wrap gap-1.5">
            {keptSkills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
              >
                <Equal className="w-2.5 h-2.5" /> {s}
              </span>
            ))}
            {addedSkills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium"
              >
                <Plus className="w-2.5 h-2.5" /> {s}
              </span>
            ))}
            {removedSkills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-red-50 dark:bg-red-500/15 text-red-500 dark:text-red-300 line-through"
              >
                <Minus className="w-2.5 h-2.5" /> {s}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default TailorDiffView;
