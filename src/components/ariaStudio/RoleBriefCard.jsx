import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// Human-facing labels for the inferred company type (the enum lives in the backend
// Role Brief). Same map the coach panel's "Aria's read" strip uses — reuse the SAME
// i18n keys (cvBuilder.askAria.companyType.*) rather than duplicating the translations.
const COMPANY_TYPE_KEYS = {
  startup: 'cvBuilder.askAria.companyType.startup',
  enterprise: 'cvBuilder.askAria.companyType.enterprise',
  agency: 'cvBuilder.askAria.companyType.agency',
  nonprofit: 'cvBuilder.askAria.companyType.nonprofit',
  government: 'cvBuilder.askAria.companyType.government',
  smb: 'cvBuilder.askAria.companyType.smb',
};

// Aria's read of the job — role · company · type · seniority, plus the must-have
// keywords she'll tailor against. Confirming it is the gate into picking a CV, so the
// user sees what she understood BEFORE she touches a document.
//
// `brief` is the Role Brief from tailor-start (or CVService.getBrief). It can be null
// if the AI was unavailable — the card degrades to the job title and still lets the
// flow continue, because the clone already exists at this point.
const RoleBriefCard = ({ brief, jobTitle, onConfirm, onEdit }) => {
  const { t } = useTranslation();
  const mustHaves = (brief?.mustHaves || [])
    .map((k) => (typeof k === 'string' ? k : k?.name))
    .filter(Boolean)
    .slice(0, 8);

  const typeLabel = brief?.companyType ? t(COMPANY_TYPE_KEYS[brief.companyType]) : null;
  const line = [
    brief?.role || jobTitle,
    brief?.company,
    typeLabel,
    brief?.seniority && t('ariaStudio.roleBrief.seniorityLevel', { seniority: brief.seniority }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AriaCard cardKey="brief">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 border-l-2 border-l-slate-900 dark:border-l-white bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[17px] uppercase tracking-[0.14em] text-slate-900 dark:text-white">
          {t('ariaStudio.roleBrief.ariasRead')}
        </p>
        <p className="mt-1.5 font-heading text-[16px] font-bold text-slate-900 dark:text-slate-100">
          {line || jobTitle || t('ariaStudio.roleBrief.thisRole')}
        </p>

        {brief?.yearsRequired ? (
          <p className="mt-1 text-[13.5px] text-slate-500 dark:text-slate-400">
            {t('ariaStudio.roleBrief.lookingForYears', { count: brief.yearsRequired })}
          </p>
        ) : null}

        {mustHaves.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
              {t('ariaStudio.roleBrief.keepsAskingFor')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mustHaves.map((k) => (
                <span
                  key={k}
                  // Neutral: these are extracted facts about the job, not actions and
                  // not state. The card's eyebrow + left border already mark the
                  // whole thing as Aria's read; colouring the chips too made
                  // non-interactive labels out-shout the actual action below them.
                  // Matches StudioArtifactPanel's existing treatment of job keywords.
                  className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {!brief && (
          <p className="mt-3 text-[13.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('ariaStudio.roleBrief.couldntFullyRead')}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onEdit?.()}
            className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
          >
            ✎ {t('ariaStudio.pinnedEntry.edit')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.()}
            className="btn-primary px-5 py-2 text-[16px]"
          >
            {t('ariaStudio.contactConfirm.looksRight')} →
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default RoleBriefCard;
