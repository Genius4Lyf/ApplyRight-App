import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';

// THE POSTING. Just the posting.
//
// This panel used to carry the requirement checklist and a 0-of-5 target, from back when
// nothing else did — building a CV against a JD was drawing with your eyes shut, and this
// was the only place the requirements were visible at all.
//
// The bar above the composer took that job, and took it better: it sits inside the
// interview, it ticks as you work, and its rows can be tapped to steer the questions. Two
// lists of the same requirements on one screen is one list too many, and the one that
// could not be acted on was this one.
//
// So it keeps the half the bar cannot hold: the employer's own words, in full, reachable
// at any time rather than only mid-interview. Everything Aria says about this job is a
// READING of this text — when a requirement looks wrong, this is where you check.
//
// No count here any more. The header pill and the interview bar each showed the same
// figure, and a third copy — set as a 3xl "0" at the start of every build — was the
// loudest of the three and the least useful.
const JobTargetPanel = ({ onClose, bare = false }) => {
  const { t } = useTranslation();
  const { cvData } = useAriaStudio();

  const brief = cvData?.targetJob?.brief;
  const jobDescription = (cvData?.targetJob?.description || '').trim();

  return (
    <div
      className={`h-full flex flex-col bg-white dark:bg-slate-900 ${
        // See StudioArtifactPanel's `bare`: no card chrome when this IS the surface.
        bare ? '' : 'border-l border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="shrink-0 flex items-start gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('ariaStudio.jobTarget.fullDescription')}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {[brief?.role || cvData?.targetJob?.title, brief?.company]
              .filter(Boolean)
              .join(' · ') || t('ariaStudio.jobTarget.thisJob')}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('ariaStudio.studioArtifactPanel.closePanel')}
            className="shrink-0 -mr-1 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none p-4">
        {/* Open, not behind a disclosure. It is the only thing in here now, and a panel
            whose single item has to be unfolded before it says anything is a panel that
            wasted the tap that opened it. */}
        {jobDescription ? (
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
            {jobDescription}
          </p>
        ) : (
          <p className="text-[12px] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.jobTarget.noPosting')}
          </p>
        )}
      </div>
    </div>
  );
};

export default JobTargetPanel;
