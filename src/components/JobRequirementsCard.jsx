import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ChevronDown, Sparkles } from 'lucide-react';

const SENIORITY_LABEL = {
  intern: 'Intern',
  entry: 'Entry-level',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead',
  manager: 'Manager',
  director: 'Director',
  executive: 'Executive',
};

const formatSeniority = (level) => {
  if (!level) return null;
  return SENIORITY_LABEL[String(level).toLowerCase()] || level;
};

const JobRequirementsCard = ({ fitAnalysis, jobTitle, jobCompany }) => {
  const [expanded, setExpanded] = useState(false);

  if (!fitAnalysis) return null;

  const matched = fitAnalysis.matchedSkills || [];
  const missing = fitAnalysis.missingSkills || [];
  const allSkills = [...matched, ...missing];

  const requiredSkills = allSkills.filter((s) => s?.importance === 'must_have');
  const niceToHaveSkills = allSkills.filter((s) => s?.importance === 'nice_to_have');

  const requiredYears = fitAnalysis.experienceAnalysis?.requiredYears;
  const seniority = formatSeniority(fitAnalysis.seniorityAnalysis?.requiredLevel);

  const teaserParts = [];
  if (seniority) teaserParts.push(seniority);
  if (typeof requiredYears === 'number' && requiredYears > 0) {
    teaserParts.push(`${requiredYears}+ yrs`);
  }
  if (requiredSkills.length > 0) {
    teaserParts.push(`${requiredSkills.length} required`);
  }
  if (niceToHaveSkills.length > 0) {
    teaserParts.push(`${niceToHaveSkills.length} nice-to-have`);
  }

  // Nothing useful to show
  if (teaserParts.length === 0 && requiredSkills.length === 0 && niceToHaveSkills.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Briefcase className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              Job requirements
            </span>
            <span className="text-[10px] text-slate-400">AI extracted</span>
          </div>
          <p className="text-sm font-semibold text-slate-700 mt-0.5 truncate">
            {teaserParts.join(' · ') || 'Tap to view extracted requirements'}
          </p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 shrink-0"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4">
              {(jobTitle || jobCompany) && (
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {jobTitle || 'Untitled role'}
                  </p>
                  {jobCompany && (
                    <p className="text-xs text-slate-500 mt-0.5">{jobCompany}</p>
                  )}
                </div>
              )}

              {(seniority || (typeof requiredYears === 'number' && requiredYears > 0)) && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {seniority && (
                    <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                      Seniority: <span className="text-slate-900">{seniority}</span>
                    </span>
                  )}
                  {typeof requiredYears === 'number' && requiredYears > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                      Experience: <span className="text-slate-900">{requiredYears}+ yrs</span>
                    </span>
                  )}
                </div>
              )}

              {requiredSkills.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-rose-700 mb-2">
                    Required ({requiredSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkills.map((s, i) => (
                      <span
                        key={`req-${i}`}
                        className="text-xs px-2 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-medium"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {niceToHaveSkills.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-2">
                    Nice to have ({niceToHaveSkills.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {niceToHaveSkills.map((s, i) => (
                      <span
                        key={`nth-${i}`}
                        className="text-xs px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                <Sparkles className="w-3 h-3" />
                <span>Extracted by AI from the job description. Verify against the original posting if anything looks off.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default JobRequirementsCard;
