import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileUp } from 'lucide-react';
import AriaCard from './AriaCard';
import CreditGate from '../CreditGate';
import CVUploader from '../CVUploader';
import { CREDIT_COSTS } from '../../lib/credits';

// The Studio's upload step — the one place a CV enters a build session as a file.
//
// It stands exactly where the contact step otherwise would: career stage and the target
// job are already answered, so the document lands into a session that knows who the user
// is and what they're aiming at.
//
// Two things this card is careful about:
//
//  1. THE PRICE IS STATED BEFORE THE FILE PICKER, not after. CreditGate additionally
//     blocks the whole thing when the balance is short, so nobody chooses a file, waits,
//     and only then learns they can't afford it.
//
//  2. IT ALWAYS HAS A WAY OUT. "I'll type it out instead" drops straight into the normal
//     build conversation. An upload that fails, or a CV the user can't find, must never
//     be the end of the session.
const StudioUploadCard = ({ draftId, onImported, onSkip }) => {
  const { t } = useTranslation();
  const cost = CREDIT_COSTS.CREATE_FROM_UPLOAD;

  return (
    <AriaCard cardKey="upload">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <div className="flex items-start gap-3">
          <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
            <FileUp className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.chat.upload.eyebrow')}
            </p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
              {t('ariaStudio.chat.upload.prompt')}
            </p>
          </div>
          {/* The price, stated plainly. A hairline chip in ink — it is a fact about the
              action, not a warning worth colouring. */}
          <span className="shrink-0 inline-flex items-center rounded border border-slate-200 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t('ariaStudio.buildRoadmap.uploadCost', { n: cost })}
          </span>
        </div>

        <p className="mt-2.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t('ariaStudio.chat.upload.verbatimNote')}
        </p>

        <div className="mt-4">
          <CreditGate cost={cost} layout="card">
            <CVUploader
              embedded
              endpoint="/studio/upload-import"
              fields={{ draftId }}
              submitLabel={t('ariaStudio.chat.upload.submit')}
              busyLabel={t('ariaStudio.chat.upload.busy')}
              onUploadSuccess={onImported}
            />
          </CreditGate>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full text-center text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 rounded"
        >
          {t('ariaStudio.chat.upload.typeInstead')}
        </button>
      </div>
    </AriaCard>
  );
};

export default StudioUploadCard;
