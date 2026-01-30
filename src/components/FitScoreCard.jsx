import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, Target, Award, Briefcase, GraduationCap, Lightbulb, Sparkles, Wrench, Bot } from 'lucide-react';

const FitScoreCard = ({ fitScore, fitAnalysis, actionPlan }) => {
    // Determine color based on score
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

    const textColor = getScoreColor(fitScore);
    const bgColor = getScoreBg(fitScore);
    const isAIMode = fitAnalysis?.mode === 'AI';

    return (
        <div className="w-full space-y-6">
            {/* Main Score Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-8"
            >
                {/* Circular Score Display Logic (Simplified CSS implementation) */}
                <div className="relative flex-shrink-0 w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-slate-100"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={351.86} // 2 * PI * 56
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

                {/* Score Summary & Recommendation */}
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Application Fit Analysis</h3>

                        {/* AI / Standard Badge */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isAIMode ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {isAIMode ? <Bot className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                            {isAIMode ? 'AI-Powered Analysis' : 'Standard Match (Beta)'}
                        </div>
                    </div>

                    <p className="text-slate-600">
                        {fitAnalysis.overallFeedback}
                    </p>

                    <div className={`p-4 rounded-lg flex items-start gap-3 mt-4 ${bgColor}`}>
                        <Info className={`w-5 h-5 flex-shrink-0 ${textColor} mt-0.5`} />
                        <div>
                            <p className={`font-semibold text-sm ${textColor}`}>Our Recommendation</p>
                            <p className="text-slate-700 text-sm mt-1">{fitAnalysis.recommendation}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Detailed Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Skills Match */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Target className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-semibold text-slate-800">Skills Gap</h4>
                    </div>
                    {fitAnalysis.skillsGap && fitAnalysis.skillsGap.length > 0 ? (
                        <ul className="space-y-2">
                            {fitAnalysis.skillsGap.slice(0, 4).map((skill, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                    Missing: {skill}
                                </li>
                            ))}
                            {fitAnalysis.skillsGap.length > 4 && (
                                <li className="text-xs text-slate-400 pl-6">+ {fitAnalysis.skillsGap.length - 4} more</li>
                            )}
                        </ul>
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
                    <div className="flex items-center gap-2 text-sm">
                        {fitAnalysis.experienceMatch ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="text-slate-600">
                            {fitAnalysis.experienceFeedback || (fitAnalysis.experienceMatch ? "Meets requirements" : "Less than preferred")}
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
                    <div className="flex items-center gap-2 text-sm">
                        {fitAnalysis.seniorityMatch ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                            <Info className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-slate-600">
                            {fitAnalysis.seniorityFeedback || (fitAnalysis.seniorityMatch ? "Aligned with role" : "Role may vary from level")}
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Smart Action Plan (NEW) */}
            {
                actionPlan && actionPlan.length > 0 && (
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
                        <p className="text-sm text-slate-600 mb-4">Based on your gaps, here are specific steps to improve your fit:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {actionPlan.map((item, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-start gap-3">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-700">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.skill}</span>
                                        <p className="text-sm text-slate-800 font-medium mt-0.5">{item.action}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )
            }
        </div >
    );
};

export default FitScoreCard;
