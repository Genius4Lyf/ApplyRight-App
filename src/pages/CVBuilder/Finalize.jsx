import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  CheckCircle, ArrowLeft, ExternalLink, X, Pencil, Search,
  ShieldCheck, AlertTriangle, XCircle, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import TailorDiffView from '../../components/cv/TailorDiffView';

// --- Score-based guidance ---
const getScoreGuidance = (afterScore, beforeScore, missingSkills) => {
  if (afterScore >= 70) {
    return {
      level: 'strong',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'emerald',
      title: 'Strong Match',
      message: 'Your CV is well-aligned with this role. The tailoring enhanced your keywords and experience to match the job requirements.',
      advice: 'Review the changes below to make sure everything reads naturally, then proceed to preview.',
    };
  }
  if (afterScore >= 40) {
    const improvement = afterScore - (beforeScore || 0);
    return {
      level: 'partial',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'amber',
      title: 'Partial Match',
      message: `Tailoring improved your score by ${improvement > 0 ? '+' + improvement : '0'} points, but there are gaps between your profile and this role.`,
      advice: missingSkills?.length > 0
        ? `Consider building experience in: ${missingSkills.slice(0, 4).map((s) => s.name || s).join(', ')}. You can still apply, but highlighting transferable skills will help.`
        : 'Consider customizing your summary and experience bullets to better reflect the role requirements.',
    };
  }
  return {
    level: 'poor',
    icon: <XCircle className="w-5 h-5" />,
    color: 'red',
    title: 'Low Match',
    message: 'This role may not align well with your current experience. Even after tailoring, key qualifications are missing.',
    advice: 'We recommend exploring roles that better match your skills. You can search for jobs based on your CV profile for better-fitting opportunities.',
    showSearchCTA: true,
  };
};

// --- Review Modal ---
const TailorReviewModal = ({ isOpen, onClose, onEdit, onPreview, atsScores, tailoredForJob }) => {
  if (!isOpen) return null;

  const afterScore = atsScores?.after?.fitScore || 0;
  const beforeScore = atsScores?.before?.fitScore || 0;
  const missingSkills = atsScores?.after?.missingSkills || atsScores?.before?.missingSkills || [];
  const guidance = getScoreGuidance(afterScore, beforeScore, missingSkills);

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500', bar: 'bg-amber-500' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500', bar: 'bg-red-500' },
  };
  const colors = colorMap[guidance.color];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-slate-800">CV Tailored Successfully</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4 overflow-y-auto">
          {/* Score Badge */}
          {atsScores && (
            <div className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
              <div className="flex items-start gap-3">
                <div className={`${colors.icon} mt-0.5`}>{guidance.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold ${colors.text}`}>{guidance.title}</span>
                    <span className={`text-sm font-semibold ${colors.text}`}>{afterScore}%</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{guidance.message}</p>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-12">Before</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/60">
                  <div className="h-full rounded-full bg-slate-400" style={{ width: `${beforeScore}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 w-8 text-right">{beforeScore}%</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-12">After</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/60">
                  <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${afterScore}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-slate-600 w-8 text-right">{afterScore}%</span>
              </div>
            </div>
          )}

          {/* Advice */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-sm text-slate-600 leading-relaxed">{guidance.advice}</p>
          </div>

          {/* Review Checklist */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Before you proceed, review:</p>
            <ul className="space-y-2">
              {[
                'Professional summary reads naturally and matches your voice',
                'Experience bullet points are accurate and not exaggerated',
                'Added skills are ones you can genuinely demonstrate',
                'Contact details and personal info are correct',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={onClose}
              className="w-full btn-primary px-6 py-3 flex items-center justify-center gap-2 text-sm font-semibold"
            >
              Got it
            </button>
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit CV
              </button>
              {guidance.showSearchCTA && (
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/jobs';
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" /> Find Better Fits
                </button>
              )}
            </div>
          </div>

          {tailoredForJob && (
            <p className="text-[11px] text-slate-400 text-center">
              Tailored for {tailoredForJob.title} at {tailoredForJob.company}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const Finalize = () => {
  // Safely destructure context
  const context = useOutletContext();
  const { cvData, handleBack, saving, tailoredFrom, tailoredForJob } = context || {};
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const atsScores = location.state?.atsScores;
  const isBundle = location.state?.isBundle;

  // Show review modal automatically when arriving from tailor/bundle
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (tailoredFrom && atsScores) {
      setShowReviewModal(true);
    }
  }, [tailoredFrom, atsScores]);

  const handlePreview = () => {
    if (!id || id === 'new') {
      toast.error('Please add some data to create a draft first.');
      return;
    }
    setShowReviewModal(false);
    navigate(`/resume/${id}`);
  };

  const handleEditCV = () => {
    setShowReviewModal(false);
    // Navigate to the summary step so user can start reviewing content
    navigate(`/cv-builder/${id}/summary`);
  };

  if (!cvData) {
    return <div className="p-8 text-center text-slate-500">Loading review...</div>;
  }

  const isComplete = cvData.personalInfo?.fullName && cvData.experience?.length > 0;

  // Score guidance for inline display (when modal is dismissed)
  const afterScore = atsScores?.after?.fitScore || 0;
  const beforeScore = atsScores?.before?.fitScore || 0;
  const missingSkills = atsScores?.after?.missingSkills || atsScores?.before?.missingSkills || [];
  const guidance = atsScores ? getScoreGuidance(afterScore, beforeScore, missingSkills) : null;

  const guidanceColorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Review Modal */}
      <TailorReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onEdit={handleEditCV}
        onPreview={handlePreview}
        atsScores={atsScores}
        tailoredForJob={tailoredForJob}
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {tailoredFrom ? 'Tailored CV Review' : 'Final Review'}
          </h2>
          <p className="text-slate-500">
            {tailoredFrom
              ? 'Review the changes made to your CV before previewing.'
              : "You've added all the essentials. Ready to visualize?"}
          </p>
        </div>
      </div>

      {/* Inline Score Guidance (visible after modal is dismissed) */}
      {guidance && tailoredFrom && !showReviewModal && (
        <div className={`${guidanceColorMap[guidance.color].bg} ${guidanceColorMap[guidance.color].border} border rounded-xl p-4 flex items-start gap-3`}>
          <div className={`${guidanceColorMap[guidance.color].icon} mt-0.5 flex-shrink-0`}>{guidance.icon}</div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${guidanceColorMap[guidance.color].text}`}>
              {guidance.title} — {afterScore}% match
            </p>
            <p className="text-sm text-slate-600 mt-1">{guidance.advice}</p>
            {guidance.showSearchCTA && (
              <button
                onClick={() => navigate('/jobs')}
                className="mt-2 text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" /> Browse better-fitting roles
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4">Summary of your inputs:</h3>
        <ul className="space-y-3">
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.personalInfo?.fullName ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
            >
              {cvData.personalInfo?.fullName ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span className={cvData.personalInfo?.fullName ? 'text-slate-700' : 'text-slate-400'}>
              Heading & Contact Info
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.professionalSummary ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
            >
              {cvData.professionalSummary ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span className={cvData.professionalSummary ? 'text-slate-700' : 'text-slate-400'}>
              Professional Summary
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.experience?.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
            >
              {cvData.experience?.length > 0 ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span className={cvData.experience?.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
              Work History ({cvData.experience?.length || 0} roles)
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.education?.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
            >
              {cvData.education?.length > 0 ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span className={cvData.education?.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
              Education ({cvData.education?.length || 0} entries)
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.skills?.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
            >
              {cvData.skills?.length > 0 ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span className={cvData.skills?.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
              Skills ({cvData.skills?.length || 0} listed)
            </span>
          </li>
        </ul>

        {!isComplete && (
          <div className="mt-6 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg border border-amber-100">
            Warning: Some key sections seem empty. You can still preview, but your resume might look
            incomplete.
          </div>
        )}
      </div>

      {/* Tailor Diff View (shown for tailored CVs) */}
      {tailoredFrom && cvData && (
        <TailorDiffView
          originalCVId={tailoredFrom}
          currentCVData={cvData}
          tailoredForJob={tailoredForJob}
          atsScores={atsScores}
        />
      )}

      <div className="pt-6 border-t border-slate-100 flex flex-col-reverse md:flex-row justify-between gap-3 md:gap-0">
        {tailoredFrom ? (
          <button
            type="button"
            onClick={handleEditCV}
            className="w-full md:w-auto px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium flex items-center justify-center md:justify-start gap-2 transition-colors border md:border-transparent border-slate-200"
          >
            <Pencil className="w-4 h-4" /> Edit CV
          </button>
        ) : (
          <button
            type="button"
            onClick={handleBack}
            className="w-full md:w-auto px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium flex items-center justify-center md:justify-start gap-2 transition-colors border md:border-transparent border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        <button
          type="button"
          onClick={handlePreview}
          disabled={saving}
          className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2"
        >
          Preview My Application <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Finalize;
