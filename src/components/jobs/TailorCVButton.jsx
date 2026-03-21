import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronDown, FileText, Package, Loader2, Plus, Target } from 'lucide-react';
import { toast } from 'sonner';
import jobSearchService from '../../services/jobSearchService';

const PROGRESS_STEPS = [
  { message: 'Analyzing job requirements...', duration: 3000 },
  { message: 'Matching your experience...', duration: 4000 },
  { message: 'Enhancing your bullet points...', duration: 5000 },
  { message: 'Optimizing keywords...', duration: 4000 },
  { message: 'Finalizing your tailored CV...', duration: null },
];

const TailorCVButton = ({ searchId, resultId, jobTitle, company, jobDescription, userCVs = [], onSuccess }) => {
  const [selectedCV, setSelectedCV] = useState(userCVs[0]?._id || '');
  const [showSelector, setShowSelector] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [bundling, setBundling] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [atsScore, setAtsScore] = useState(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const progressTimerRef = useRef(null);

  // Fetch quick ATS score when selected CV changes
  useEffect(() => {
    if (!selectedCV || !searchId || !resultId) {
      setAtsScore(null);
      return;
    }

    let cancelled = false;
    const fetchScore = async () => {
      setLoadingScore(true);
      try {
        const result = await jobSearchService.quickScore(searchId, resultId, selectedCV);
        if (!cancelled) setAtsScore(result);
      } catch {
        if (!cancelled) setAtsScore(null);
      } finally {
        if (!cancelled) setLoadingScore(false);
      }
    };

    fetchScore();
    return () => { cancelled = true; };
  }, [selectedCV, searchId, resultId]);

  // Progress step timer
  useEffect(() => {
    if (!tailoring) {
      setProgressIndex(0);
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      return;
    }

    if (progressIndex < PROGRESS_STEPS.length - 1) {
      const step = PROGRESS_STEPS[progressIndex];
      progressTimerRef.current = setTimeout(() => {
        setProgressIndex((prev) => prev + 1);
      }, step.duration);
    }

    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [tailoring, progressIndex]);

  const handleTailor = async () => {
    if (!selectedCV) {
      toast.error('Please select a CV to tailor');
      return;
    }

    setTailoring(true);
    try {
      const result = await jobSearchService.tailorCV(searchId, resultId, selectedCV);
      toast.success(`CV tailored for ${jobTitle} at ${company}!`);

      if (result.remainingCredits !== undefined) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: result.remainingCredits }));
      }

      onSuccess?.(result);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Insufficient credits', {
          description: `You need ${error.response.data.required} credits. You have ${error.response.data.available}.`,
          action: {
            label: 'Get Credits',
            onClick: () => (window.location.href = '/credits'),
          },
        });
      } else {
        toast.error('Failed to tailor CV');
      }
    } finally {
      setTailoring(false);
    }
  };

  const handleBundle = async () => {
    if (!selectedCV) {
      toast.error('Please select a CV to tailor');
      return;
    }

    setBundling(true);
    try {
      const result = await jobSearchService.tailorBundle(searchId, resultId, selectedCV);
      toast.success('Bundle generated! CV + Cover Letter + Interview Prep');

      if (result.remainingCredits !== undefined) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: result.remainingCredits }));
      }

      onSuccess?.(result);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Insufficient credits', {
          description: `You need ${error.response.data.required} credits. You have ${error.response.data.available}.`,
          action: {
            label: 'Get Credits',
            onClick: () => (window.location.href = '/credits'),
          },
        });
      } else {
        toast.error('Failed to generate bundle');
      }
    } finally {
      setBundling(false);
    }
  };

  // W1: No-CV guard with guided CTA
  if (!userCVs.length) {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-slate-500 mb-2">No CVs yet — build one to tailor it for this job</p>
        <Link
          to="/cv-builder/new/target-job"
          state={{ prefillJob: { title: jobTitle, company, description: jobDescription } }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Build a CV for this job
        </Link>
      </div>
    );
  }

  const scoreColor = atsScore
    ? atsScore.fitScore >= 70 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : atsScore.fitScore >= 50 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-500 bg-red-50 border-red-200'
    : '';

  const barColor = atsScore
    ? atsScore.fitScore >= 70 ? 'bg-emerald-500'
    : atsScore.fitScore >= 50 ? 'bg-amber-500'
    : 'bg-red-400'
    : 'bg-slate-200';

  return (
    <div className="space-y-2">
      {/* CV Selector */}
      {userCVs.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <FileText className="w-4 h-4" />
              {userCVs.find((cv) => cv._id === selectedCV)?.title || 'Select CV'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showSelector && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
              {userCVs.map((cv) => (
                <button
                  key={cv._id}
                  onClick={() => {
                    setSelectedCV(cv._id);
                    setShowSelector(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                    selectedCV === cv._id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'
                  }`}
                >
                  {cv.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* W2: ATS Score Badge */}
      {(loadingScore || atsScore) && (
        <div className={`rounded-lg border p-2.5 ${atsScore ? scoreColor : 'bg-slate-50 border-slate-200'}`}>
          {loadingScore ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Checking match...
            </div>
          ) : atsScore && (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Target className="w-3.5 h-3.5" />
                  {atsScore.fitScore}% match
                </span>
                <span className="text-[10px] opacity-70">
                  {atsScore.recommendation === 'strong_match' ? 'Strong match' :
                   atsScore.recommendation === 'good_match' ? 'Good match' :
                   atsScore.recommendation === 'potential_match' ? 'Potential match' : 'Needs work'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/10">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${atsScore.fitScore}%` }}
                />
              </div>
              {atsScore.missingSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {atsScore.missingSkills.slice(0, 3).map((skill) => (
                    <span key={skill.name} className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 opacity-80">
                      +{skill.name}
                    </span>
                  ))}
                  {atsScore.missingSkills.length > 3 && (
                    <span className="text-[10px] opacity-60">+{atsScore.missingSkills.length - 3} more</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* W4: Progress loading state */}
      {tailoring && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
          <span className="text-xs text-emerald-700 font-medium">
            {PROGRESS_STEPS[progressIndex].message}
          </span>
        </div>
      )}

      {/* W5: Primary Tailor button (full width) */}
      <button
        onClick={handleTailor}
        disabled={tailoring || bundling}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {tailoring ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {tailoring ? PROGRESS_STEPS[progressIndex].message : 'Tailor CV (15 cr)'}
      </button>

      {/* W5: Bundle upsell row */}
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-slate-400 flex-1">
          Add Cover Letter & Interview Prep for just +5 credits
        </p>
        <button
          onClick={handleBundle}
          disabled={tailoring || bundling}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-violet-300 text-violet-600 rounded-lg text-xs font-medium hover:bg-violet-50 disabled:opacity-50 transition-colors"
        >
          {bundling ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Package className="w-3 h-3" />
          )}
          {bundling ? '...' : 'Bundle (20 cr)'}
        </button>
      </div>
    </div>
  );
};

export default TailorCVButton;
