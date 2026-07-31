import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  CheckCircle,
  ArrowLeft,
  ExternalLink,
  X,
  Pencil,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import TailorDiffView from '../../components/cv/TailorDiffView';
import StepHeader from '../../components/cv/StepHeader';
import CvLanguageToggle from '../../components/cv/CvLanguageToggle';
import useInterstitial from '../../hooks/useInterstitial';

// --- Score-based guidance ---
// Module-level: returns i18n KEYS (+ interpolation params), resolved via t() at the
// call sites. No literal copy is baked in, so it follows a live language switch.
const getScoreGuidance = (afterScore, beforeScore, missingSkills) => {
  if (afterScore >= 70) {
    return {
      level: 'strong',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'emerald',
      titleKey: 'cvBuilder.finalize.scoreGuidance.strong.title',
      messageKey: 'cvBuilder.finalize.scoreGuidance.strong.message',
      adviceKey: 'cvBuilder.finalize.scoreGuidance.strong.advice',
    };
  }
  if (afterScore >= 40) {
    const improvement = afterScore - (beforeScore || 0);
    return {
      level: 'partial',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'amber',
      titleKey: 'cvBuilder.finalize.scoreGuidance.partial.title',
      messageKey: 'cvBuilder.finalize.scoreGuidance.partial.message',
      messageParams: { improvement: improvement > 0 ? '+' + improvement : '0' },
      adviceKey:
        missingSkills?.length > 0
          ? 'cvBuilder.finalize.scoreGuidance.partial.adviceSkills'
          : 'cvBuilder.finalize.scoreGuidance.partial.adviceGeneric',
      adviceParams:
        missingSkills?.length > 0
          ? {
              skills: missingSkills
                .slice(0, 4)
                .map((s) => s.name || s)
                .join(', '),
            }
          : undefined,
    };
  }
  return {
    level: 'poor',
    icon: <XCircle className="w-5 h-5" />,
    color: 'red',
    titleKey: 'cvBuilder.finalize.scoreGuidance.poor.title',
    messageKey: 'cvBuilder.finalize.scoreGuidance.poor.message',
    adviceKey: 'cvBuilder.finalize.scoreGuidance.poor.advice',
  };
};

// --- Review Modal ---
const TailorReviewModal = ({ isOpen, onClose, onEdit, atsScores, tailoredForJob }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const afterScore = atsScores?.after?.fitScore || 0;
  const beforeScore = atsScores?.before?.fitScore || 0;
  const missingSkills = atsScores?.after?.missingSkills || atsScores?.before?.missingSkills || [];
  const guidance = getScoreGuidance(afterScore, beforeScore, missingSkills);

  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/15',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-600 dark:text-emerald-300',
      bar: 'bg-emerald-500',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-500/15',
      border: 'border-amber-200 dark:border-amber-500/30',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-500 dark:text-amber-300',
      bar: 'bg-amber-500',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-500/15',
      border: 'border-red-200 dark:border-red-500/30',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-500 dark:text-red-300',
      bar: 'bg-red-500',
    },
  };
  const colors = colorMap[guidance.color];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop — clicking closes the modal. Keyboard users can use the
          explicit X button in the header for parity. */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('cvBuilder.finalize.reviewModal.closeLabel')}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {t('cvBuilder.finalize.reviewModal.title')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
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
                    <span className={`font-bold ${colors.text}`}>{t(guidance.titleKey)}</span>
                    <span className={`text-sm font-semibold ${colors.text}`}>{afterScore}%</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t(guidance.messageKey, guidance.messageParams)}
                  </p>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 w-12">
                  {t('cvBuilder.finalize.reviewModal.before')}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/60 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-slate-400"
                    style={{ width: `${beforeScore}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 w-8 text-right">
                  {beforeScore}%
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 w-12">
                  {t('cvBuilder.finalize.reviewModal.after')}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/60 dark:bg-white/10">
                  <div
                    className={`h-full rounded-full ${colors.bar}`}
                    style={{ width: `${afterScore}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">
                  {afterScore}%
                </span>
              </div>
            </div>
          )}

          {/* Advice */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t(guidance.adviceKey, guidance.adviceParams)}
            </p>
          </div>

          {/* Review Checklist */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {t('cvBuilder.finalize.reviewModal.beforeProceed')}
            </p>
            <ul className="space-y-2">
              {[
                t('cvBuilder.finalize.reviewModal.checklist.0'),
                t('cvBuilder.finalize.reviewModal.checklist.1'),
                t('cvBuilder.finalize.reviewModal.checklist.2'),
                t('cvBuilder.finalize.reviewModal.checklist.3'),
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0" />
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
              {t('cvBuilder.finalize.reviewModal.gotIt')}
            </button>
            <button
              onClick={onEdit}
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5" /> {t('cvBuilder.finalize.editCv')}
            </button>
          </div>

          {tailoredForJob && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
              {t('cvBuilder.common.tailoredFor', {
                title: tailoredForJob.title,
                company: tailoredForJob.company,
              })}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const Finalize = () => {
  const { t } = useTranslation();
  // Safely destructure context
  const context = useOutletContext();
  const { cvData, handleBack, saving, tailoredFrom, tailoredForJob, isStepComplete, updateCvData } =
    context || {};
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const atsScores = location.state?.atsScores;

  // Review modal is no longer auto-opened on arrival — that obscured the
  // step content and made Finalize feel like a hidden modal instead of the
  // last step of the wizard. Users see the inline summary banner first and
  // can open the detailed modal explicitly when they want it.
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { triggerInterstitial } = useInterstitial();

  const handlePreview = () => {
    if (!id || id === 'new') {
      toast.error(t('cvBuilder.finalize.addDataFirst'));
      return;
    }
    setShowReviewModal(false);
    // Interstitial at the natural completion moment, before we leave the
    // wizard for the preview. Fires only on Android for free users; web is
    // a no-op. Fire-and-forget — don't block navigation on ad load.
    triggerInterstitial('cv_finalize_preview');
    navigate(`/resume/${id}`);
  };

  const handleEditCV = () => {
    setShowReviewModal(false);
    // Navigate to the summary step so user can start reviewing content
    navigate(`/cv-builder/${id}/summary`);
  };

  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t('cvBuilder.finalize.loading')}
      </div>
    );
  }

  const isComplete = isStepComplete
    ? ['heading', 'history', 'education', 'skills', 'summary'].every((stepId) =>
        isStepComplete(stepId)
      )
    : false;

  // Score guidance for inline display (when modal is dismissed)
  const afterScore = atsScores?.after?.fitScore || 0;
  const beforeScore = atsScores?.before?.fitScore || 0;
  const missingSkills = atsScores?.after?.missingSkills || atsScores?.before?.missingSkills || [];
  const guidance = atsScores ? getScoreGuidance(afterScore, beforeScore, missingSkills) : null;

  const guidanceColorMap = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/15',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-600 dark:text-emerald-300',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-500/15',
      border: 'border-amber-200 dark:border-amber-500/30',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-500 dark:text-amber-300',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-500/15',
      border: 'border-red-200 dark:border-red-500/30',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-500 dark:text-red-300',
    },
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Review Modal */}
      <TailorReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onEdit={handleEditCV}
        atsScores={atsScores}
        tailoredForJob={tailoredForJob}
      />

      <StepHeader
        eyebrow={t('cvBuilder.finalize.eyebrow')}
        title={
          tailoredFrom
            ? t('cvBuilder.finalize.titleTailored')
            : t('cvBuilder.finalize.titleFinal')
        }
        subtitle={
          tailoredFrom
            ? t('cvBuilder.finalize.subtitleTailored')
            : t('cvBuilder.finalize.subtitleFinal')
        }
      />

      {/* The language this CV is WRITTEN in — set it here before previewing or
          downloading, since it drives both the AI writing and the section labels. */}
      <CvLanguageToggle
        draftId={id}
        value={cvData?.outputLang}
        onChange={(next) => updateCvData?.({ outputLang: next })}
      />

      {/* Inline Score Guidance — replaces the auto-opening modal. The
          detailed diff + advice still lives in the modal; users open it
          explicitly via the button instead of being interrupted on arrival. */}
      {guidance && tailoredFrom && (
        <div
          className={`${guidanceColorMap[guidance.color].bg} ${guidanceColorMap[guidance.color].border} border rounded-xl p-4 flex flex-col sm:flex-row items-start gap-3`}
        >
          <div className={`${guidanceColorMap[guidance.color].icon} mt-0.5 flex-shrink-0`}>
            {guidance.icon}
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${guidanceColorMap[guidance.color].text}`}>
              {t('cvBuilder.finalize.matchLine', {
                title: t(guidance.titleKey),
                n: afterScore,
              })}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {t(guidance.adviceKey, guidance.adviceParams)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="shrink-0 self-stretch sm:self-center inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            {t('cvBuilder.finalize.viewTailoringDetails')}
          </button>
        </div>
      )}

      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">
          {t('cvBuilder.finalize.summaryOfInputs')}
        </h3>
        <ul className="space-y-3">
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.personalInfo?.fullName ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}
            >
              {cvData.personalInfo?.fullName ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span
              className={
                cvData.personalInfo?.fullName
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 dark:text-slate-500'
              }
            >
              {t('cvBuilder.finalize.headingContact')}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.professionalSummary ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}
            >
              {cvData.professionalSummary ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span
              className={
                cvData.professionalSummary
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 dark:text-slate-500'
              }
            >
              {t('cvBuilder.finalize.professionalSummary')}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.experience?.length > 0 ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}
            >
              {cvData.experience?.length > 0 ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span
              className={
                cvData.experience?.length > 0
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 dark:text-slate-500'
              }
            >
              {t('cvBuilder.finalize.workHistoryRoles', {
                n: cvData.experience?.length || 0,
              })}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.education?.length > 0 ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}
            >
              {cvData.education?.length > 0 ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span
              className={
                cvData.education?.length > 0
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 dark:text-slate-500'
              }
            >
              {t('cvBuilder.finalize.educationEntries', {
                n: cvData.education?.length || 0,
              })}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.skills?.length > 0 ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}
            >
              {cvData.skills?.length > 0 ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              )}
            </div>
            <span
              className={
                cvData.skills?.length > 0
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 dark:text-slate-500'
              }
            >
              {t('cvBuilder.finalize.skillsListed', { n: cvData.skills?.length || 0 })}
            </span>
          </li>
        </ul>

        {!isComplete && (
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-500/30 flex items-start gap-3">
            <Lock className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {t('cvBuilder.finalize.journeyIncomplete')}
              </p>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">
                {t('cvBuilder.finalize.journeyIncompleteBody')}
              </p>
            </div>
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

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse md:flex-row justify-between gap-3 md:gap-0">
        {tailoredFrom ? (
          <button
            type="button"
            onClick={handleEditCV}
            className="w-full md:w-auto px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium flex items-center justify-center md:justify-start gap-2 transition-colors border md:border-transparent border-slate-200 dark:border-slate-700"
          >
            <Pencil className="w-4 h-4" /> {t('cvBuilder.finalize.editCv')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleBack}
            className="w-full md:w-auto px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium flex items-center justify-center md:justify-start gap-2 transition-colors border md:border-transparent border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </button>
        )}
        <button
          type="button"
          onClick={handlePreview}
          disabled={saving || !isComplete}
          className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isComplete ? (
            <>
              {t('cvBuilder.finalize.previewApp')} <ExternalLink className="w-4 h-4" />
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" /> {t('cvBuilder.finalize.previewLocked')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Finalize;
