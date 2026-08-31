import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileUp } from 'lucide-react';
import CvPickerCard from './CvPickerCard';
import CVUploader from '../CVUploader';

// Step one of "Prepare me for an interview": which CV are we analysing?
//
// Two ways in, both on one card. Aria offers the CVs already on your profile, and takes
// an upload for the CV that isn't — someone arriving with a PDF they wrote in Word is the
// most common case there is, and making them build a CV first would put a wall in front
// of the thing they came for.
//
// THE UPLOAD IS FREE, and deliberately so: it goes to /resumes/upload, which only
// extracts text. No CV is created and nothing is charged until the analysis itself. (The
// Studio's other upload — /studio/upload-import — parses a full editable CV and costs
// credits; that one belongs to a build session, where a document is the point.)
const PrepCvCard = ({ onPick, onUploaded, busyId }) => {
  const { t } = useTranslation();

  return (
    <CvPickerCard
      onPick={onPick}
      busyId={busyId}
      eyebrow={t('ariaStudio.prep.whichCv')}
      extra={
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                {t('ariaStudio.prep.uploadTitle')}
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t('ariaStudio.prep.uploadBody')}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <CVUploader
              embedded
              endpoint="/resumes/upload"
              submitLabel={t('ariaStudio.prep.uploadSubmit')}
              busyLabel={t('ariaStudio.prep.uploadBusy')}
              onUploadSuccess={onUploaded}
            />
          </div>
        </div>
      }
    />
  );
};

export default PrepCvCard;
