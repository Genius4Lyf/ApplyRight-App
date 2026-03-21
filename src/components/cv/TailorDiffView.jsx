import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Plus, Minus, Equal } from 'lucide-react';
import CVService from '../../services/cv.service';

const Section = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
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
    <span className="text-xs text-slate-500 w-14">{label}</span>
    <div className="flex-1 h-2 rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
    </div>
    <span className="text-xs font-semibold w-10 text-right">{score}%</span>
  </div>
);

const TailorDiffView = ({ originalCVId, currentCVData, tailoredForJob, atsScores }) => {
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
    return () => { cancelled = true; };
  }, [originalCVId]);

  if (loading) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">Loading comparison...</div>
    );
  }

  if (!original) {
    return null;
  }

  // Skills diff
  const originalSkillNames = new Set((original.skills || []).map((s) => (typeof s === 'string' ? s : s.name).toLowerCase()));
  const currentSkillNames = new Set((currentCVData.skills || []).map((s) => (typeof s === 'string' ? s : s.name).toLowerCase()));

  const keptSkills = [...currentSkillNames].filter((s) => originalSkillNames.has(s));
  const addedSkills = [...currentSkillNames].filter((s) => !originalSkillNames.has(s));
  const removedSkills = [...originalSkillNames].filter((s) => !currentSkillNames.has(s));

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-slate-800">
          What Changed
        </h3>
        {tailoredForJob && (
          <span className="text-xs text-slate-400 ml-auto">
            Tailored for {tailoredForJob.title} at {tailoredForJob.company}
          </span>
        )}
      </div>

      {/* ATS Score comparison */}
      {atsScores && (
        <Section title="ATS Match Score" defaultOpen>
          <div className="space-y-2">
            <ScoreBar label="Before" score={atsScores.before?.fitScore || 0} color="bg-slate-400" />
            <ScoreBar label="After" score={atsScores.after?.fitScore || 0} color="bg-emerald-500" />
            {atsScores.before && atsScores.after && (
              <p className="text-xs text-emerald-600 font-medium mt-1">
                +{(atsScores.after.fitScore || 0) - (atsScores.before.fitScore || 0)} points improvement
              </p>
            )}
          </div>
        </Section>
      )}

      {/* Summary diff */}
      {(original.professionalSummary || currentCVData.professionalSummary) && (
        <Section title="Professional Summary" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Original</span>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed bg-slate-50 rounded p-2">
                {original.professionalSummary || 'No summary'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">Tailored</span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-emerald-50 rounded p-2 border border-emerald-100">
                {currentCVData.professionalSummary || 'No summary'}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Experience diff */}
      {currentCVData.experience?.length > 0 && (
        <Section title={`Experience (${currentCVData.experience.length} roles)`} defaultOpen={false}>
          <div className="space-y-4">
            {currentCVData.experience.map((exp, i) => {
              const origExp = original.experience?.[i];
              const changed = origExp && origExp.description !== exp.description;
              return (
                <div key={i} className="text-xs">
                  <p className="font-semibold text-slate-700 mb-1">
                    {exp.title} at {exp.company}
                    {changed && <span className="ml-2 text-[10px] text-emerald-500 font-normal">Enhanced</span>}
                  </p>
                  {changed ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded p-2 text-slate-500 leading-relaxed">
                        {origExp.description || 'No description'}
                      </div>
                      <div className="bg-emerald-50 rounded p-2 text-slate-700 leading-relaxed border border-emerald-100">
                        {exp.description || 'No description'}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No changes</p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Skills diff */}
      {(addedSkills.length > 0 || removedSkills.length > 0) && (
        <Section title="Skills" defaultOpen>
          <div className="flex flex-wrap gap-1.5">
            {keptSkills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                <Equal className="w-2.5 h-2.5" /> {s}
              </span>
            ))}
            {addedSkills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                <Plus className="w-2.5 h-2.5" /> {s}
              </span>
            ))}
            {removedSkills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-red-50 text-red-500 line-through">
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
