import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Target,
  Award,
  Briefcase,
  Lightbulb,
  Wrench,
  Bot,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const FitScoreCard = ({ fitScore, fitAnalysis, actionPlan }) => {
  const [skillsExpanded, setSkillsExpanded] = useState(false);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const getBarColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const textColor = getScoreColor(fitScore);
  const bgColor = getScoreBg(fitScore);
  const isAIMode = fitAnalysis?.mode === 'AI';

  const matchedSkills = fitAnalysis?.matchedSkills || [];
  const missingSkills = fitAnalysis?.missingSkills || [];
  const expAnalysis = fitAnalysis?.experienceAnalysis || {};
  const senAnalysis = fitAnalysis?.seniorityAnalysis || {};
  const breakdown = fitAnalysis?.scoreBreakdown || {};

  const SKILLS_PREVIEW_COUNT = 4;
  const totalSkills = matchedSkills.length + missingSkills.length;
  const allSkillItems = [
    ...missingSkills.map((s) => ({ ...s, matched: false })),
    ...matchedSkills.map((s) => ({ ...s, matched: true })),
  ];
  const visibleSkills = skillsExpanded ? allSkillItems : allSkillItems.slice(0, SKILLS_PREVIEW_COUNT);
  const hasMoreSkills = allSkillItems.length > SKILLS_PREVIEW_COUNT;

  const levelLabel = (level) => {
    const labels = {
      intern: 'Intern', entry: 'Entry', junior: 'Junior', mid: 'Mid-Level',
      'mid-senior': 'Mid-Senior', senior: 'Senior', staff: 'Staff',
      lead: 'Lead', principal: 'Principal', manager: 'Manager',
      director: 'Director', vp: 'VP', executive: 'Executive',
      'not specified': 'Not Specified',
    };
    return labels[level] || level || 'Unknown';
  };

  return (
    <div className="w-full space-y-6">
      {/* Main Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-8"
      >
        {/* Circular Score */}
        <div className="relative flex-shrink-0 w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
            <circle
              cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent"
              strokeDasharray={351.86}
              strokeDashoffset={351.86 - (351.86 * (fitScore || 0)) / 100}
              className={`${textColor} transition-all duration-1000 ease-out`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-3xl font-bold ${textColor}`}>{fitScore}%</span>
            <span className="text-xs uppercase font-bold text-slate-400">Match</span>
          </div>
        </div>

        {/* Summary & Recommendation */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Application Fit Analysis</h3>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isAIMode ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
            >
              {isAIMode ? <Bot className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
              {isAIMode ? 'AI-Powered Analysis' : 'Standard Match (Beta)'}
            </div>
          </div>

          <p className="text-slate-600">{fitAnalysis?.overallFeedback}</p>

          <div className={`p-4 rounded-lg flex items-start gap-3 mt-4 ${bgColor}`}>
            <Info className={`w-5 h-5 flex-shrink-0 ${textColor} mt-0.5`} />
            <div>
              <p className={`font-semibold text-sm ${textColor}`}>Our Recommendation</p>
              <p className="text-slate-700 text-sm mt-1">{fitAnalysis?.recommendation}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Score Breakdown Bars */}
      {breakdown.skillsScore != null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
        >
          <h4 className="font-semibold text-slate-800 mb-4">Score Breakdown</h4>
          <div className="space-y-3">
            {[
              { label: 'Skills', score: breakdown.skillsScore, weight: '40%' },
              { label: 'Experience', score: breakdown.experienceScore, weight: '25%' },
              { label: 'Education', score: breakdown.educationScore, weight: '15%' },
              { label: 'Seniority', score: breakdown.seniorityScore, weight: '10%' },
              { label: 'Profile Strength', score: breakdown.overallScore, weight: '10%' },
            ].filter(({ score }) => score != null).map(({ label, score, weight }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{label} <span className="text-slate-400">({weight})</span></span>
                  <span className={`font-semibold ${getScoreColor(score)}`}>{score}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-2 rounded-full ${getBarColor(score)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Detailed Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Skills Match */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              <h4 className="font-semibold text-slate-800">Skills</h4>
            </div>
            {totalSkills > 0 && (
              <span className="text-xs text-slate-400">
                {matchedSkills.length}/{totalSkills} matched
              </span>
            )}
          </div>

          {totalSkills > 0 ? (
            <>
              <ul className="space-y-2">
                {visibleSkills.map((skill, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    {skill.matched ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    )}
                    <span className={skill.matched ? 'text-slate-600' : 'text-slate-700 font-medium'}>
                      {skill.name}
                    </span>
                    {skill.importance === 'must_have' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold uppercase">
                        Required
                      </span>
                    )}
                    {skill.importance === 'nice_to_have' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-semibold uppercase">
                        Bonus
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {hasMoreSkills && (
                <button
                  onClick={() => setSkillsExpanded(!skillsExpanded)}
                  className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-3 font-medium"
                >
                  {skillsExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" /> Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" /> Show all {allSkillItems.length} skills
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              All core skills matched!
            </div>
          )}
        </motion.div>

        {/* Experience Match */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-slate-800">Experience</h4>
          </div>

          {/* Years comparison */}
          {(expAnalysis.candidateYears != null || expAnalysis.requiredYears != null) && (
            <div className="flex items-center gap-3 mb-3">
              <div className="text-center flex-1 p-2 rounded-lg bg-slate-50">
                <div className="text-lg font-bold text-slate-800">
                  {expAnalysis.candidateYears ?? '?'}
                </div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Your Years</div>
              </div>
              <span className="text-slate-300 text-sm">vs</span>
              <div className="text-center flex-1 p-2 rounded-lg bg-slate-50">
                <div className="text-lg font-bold text-slate-800">
                  {expAnalysis.requiredYears ?? '?'}
                </div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Required</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            {expAnalysis.match ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-slate-600">
              {expAnalysis.feedback || (expAnalysis.match ? 'Meets requirements' : 'Less than preferred')}
            </span>
          </div>
        </motion.div>

        {/* Seniority Match */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-purple-500" />
            <h4 className="font-semibold text-slate-800">Seniority Level</h4>
          </div>

          {/* Level comparison */}
          {(senAnalysis.candidateLevel || senAnalysis.requiredLevel) && (
            <div className="flex items-center gap-3 mb-3">
              <div className="text-center flex-1 p-2 rounded-lg bg-slate-50">
                <div className="text-sm font-bold text-slate-800">
                  {levelLabel(senAnalysis.candidateLevel)}
                </div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">You</div>
              </div>
              <span className="text-slate-300 text-sm">vs</span>
              <div className="text-center flex-1 p-2 rounded-lg bg-slate-50">
                <div className="text-sm font-bold text-slate-800">
                  {levelLabel(senAnalysis.requiredLevel)}
                </div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Required</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            {senAnalysis.match ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <Info className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-slate-600">
              {senAnalysis.feedback || (senAnalysis.match ? 'Aligned with role' : 'Role may vary from level')}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Smart Action Plan */}
      {actionPlan && actionPlan.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-indigo-50 rounded-xl p-6 border border-indigo-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Smart Action Plan</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Based on your gaps, here are specific steps to improve your fit:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionPlan.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-start gap-3"
              >
                <div className="mt-1 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-700">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {(item.skill || item.category) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase">
                        {item.category || item.skill}
                      </span>
                    )}
                    {item.importance === 'must_have' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold uppercase">
                        Critical
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 font-medium mt-0.5">{item.task || item.action}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FitScoreCard;
