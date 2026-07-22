import React, { useState } from 'react';
import AriaCard from './AriaCard';

// The job comes from an inline role+description FORM Aria conjures — not the chat
// textarea. Mirrors the CV Builder's TargetChat form (ATSCoachPanel's TargetChat):
// same fields, same 25-char JD floor.
//
// Capture only: onSubmit({ jobTitle, jobDescription }) hands off immediately and the
// caller owns the "reading the job" beat, so the keyword read and the Role Brief
// resolve together under ONE indicator instead of two sequential waits.
const JobCaptureCard = ({ initialTitle = '', initialDescription = '', onSubmit, onCancel }) => {
  const [roleInput, setRoleInput] = useState(initialTitle);
  const [jdInput, setJdInput] = useState(initialDescription);

  const canAdd = roleInput.trim().length > 0 && jdInput.trim().length >= 25;

  const submit = () => {
    const jobTitle = roleInput.trim();
    const jobDescription = jdInput.trim();
    if (!jobTitle || jobDescription.length < 25) return;
    onSubmit?.({ jobTitle, jobDescription });
  };

  return (
    // `wide` — this card is a workspace, not speech: a full JD needs room to paste and
    // read. `min-w-0` lets it shrink below the flex basis on a 360px screen instead of
    // forcing horizontal scroll.
    <AriaCard cardKey="jobform" wide>
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          The job you&rsquo;re going for
        </p>

        <label
          htmlFor="studio-job-title"
          className="mt-3 block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
        >
          Job title / role
        </label>
        <input
          id="studio-job-title"
          value={roleInput}
          onChange={(e) => setRoleInput(e.target.value)}
          placeholder="e.g. Wireline Field Operator"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-3.5 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors"
        />

        <label
          htmlFor="studio-job-description"
          className="mt-3 block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
        >
          Job description
        </label>
        <textarea
          id="studio-job-description"
          value={jdInput}
          onChange={(e) => setJdInput(e.target.value)}
          placeholder="Paste the full job description…"
          className="w-full resize-y min-h-[150px] sm:min-h-[190px] lg:min-h-[230px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-3.5 py-2 text-[13px] leading-relaxed outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors"
        />

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canAdd}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default JobCaptureCard;
