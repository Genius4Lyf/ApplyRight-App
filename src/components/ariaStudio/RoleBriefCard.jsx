import React from 'react';
import AriaCard from './AriaCard';

// Human-facing labels for the inferred company type (the enum lives in the backend
// Role Brief). Same map the coach panel's "Aria's read" strip uses.
const COMPANY_TYPE_LABELS = {
  startup: 'Startup',
  enterprise: 'Big company',
  agency: 'Agency',
  nonprofit: 'Nonprofit',
  government: 'Public sector',
  smb: 'Small business',
};

// Aria's read of the job — role · company · type · seniority, plus the must-have
// keywords she'll tailor against. Confirming it is the gate into picking a CV, so the
// user sees what she understood BEFORE she touches a document.
//
// `brief` is the Role Brief from tailor-start (or CVService.getBrief). It can be null
// if the AI was unavailable — the card degrades to the job title and still lets the
// flow continue, because the clone already exists at this point.
const RoleBriefCard = ({ brief, jobTitle, onConfirm, onEdit }) => {
  const mustHaves = (brief?.mustHaves || [])
    .map((k) => (typeof k === 'string' ? k : k?.name))
    .filter(Boolean)
    .slice(0, 8);

  const typeLabel = brief?.companyType ? COMPANY_TYPE_LABELS[brief.companyType] : null;
  const line = [
    brief?.role || jobTitle,
    brief?.company,
    typeLabel,
    brief?.seniority && `${brief.seniority} level`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AriaCard cardKey="brief">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 border-l-2 border-l-indigo-500 bg-white dark:bg-slate-900 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-indigo-500 dark:text-indigo-400">
          Aria&rsquo;s read
        </p>
        <p className="mt-1.5 font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
          {line || jobTitle || 'This role'}
        </p>

        {brief?.yearsRequired ? (
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
            Looking for around {brief.yearsRequired} year
            {brief.yearsRequired === 1 ? '' : 's'} of experience.
          </p>
        ) : null}

        {mustHaves.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
              What it keeps asking for
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mustHaves.map((k) => (
                <span
                  key={k}
                  // Neutral: these are extracted facts about the job, not actions and
                  // not state. The card's indigo eyebrow + left border already mark the
                  // whole thing as Aria's read; colouring the chips too made
                  // non-interactive labels out-shout the actual action below them.
                  // Matches StudioArtifactPanel's existing treatment of job keywords.
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {!brief && (
          <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
            I couldn&rsquo;t fully read the job just now — we can still carry on, and I&rsquo;ll
            re-read it when I start tailoring.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onEdit?.()}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
          >
            ✎ Edit
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.()}
            className="btn-primary px-5 py-2 text-sm"
          >
            Looks right →
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default RoleBriefCard;
