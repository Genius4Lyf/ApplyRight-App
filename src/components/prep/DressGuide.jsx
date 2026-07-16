import React from 'react';
import { Shirt, CheckCircle2, Sparkles, Loader } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const DRESS_LABELS = {
  business_formal: 'Business formal',
  business_casual: 'Business casual',
  smart_casual: 'Smart casual',
  creative: 'Creative / polished',
  uniform_or_specialized: 'Role-specific',
};

// Tailored, AI-generated "what to wear / first impression" guide for the role.
// Lives on the Game-day tab (it's game-day prep, not role analysis).
const DressGuide = ({ application, onGenerate, generating }) => {
  const dressGuide = application?.interviewPrep?.dressGuide || null;
  const hasDress = !!(dressGuide && dressGuide.summary);
  const job = application?.jobId || {};
  const company = job.company || application?.jobCompany || '';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Shirt className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Dress &amp; first impression
        </h3>
      </div>

      {hasDress ? (
        <div className="space-y-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
            {DRESS_LABELS[dressGuide.dressCode] || 'Dress code'}
          </span>
          {dressGuide.summary && (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {dressGuide.summary}
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {dressGuide.wear?.length > 0 && (
              <div className="rounded-lg border border-emerald-100 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/15 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-300 mb-1.5">
                  Wear
                </p>
                <ul className="space-y-1">
                  {dressGuide.wear.map((w, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {dressGuide.avoid?.length > 0 && (
              <div className="rounded-lg border border-rose-100 dark:border-rose-500/30 bg-rose-50/40 dark:bg-rose-500/15 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-rose-700 dark:text-rose-300 mb-1.5">
                  Avoid
                </p>
                <ul className="space-y-1">
                  {dressGuide.avoid.map((w, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5"
                    >
                      <span className="text-rose-500 dark:text-rose-300 shrink-0 font-bold">✕</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {(dressGuide.virtualTip || dressGuide.groomingNote) && (
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {dressGuide.virtualTip && (
                <p>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    On camera:
                  </span>{' '}
                  {dressGuide.virtualTip}
                </p>
              )}
              {dressGuide.groomingNote && (
                <p>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Grooming:
                  </span>{' '}
                  {dressGuide.groomingNote}
                </p>
              )}
            </div>
          )}
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 disabled:opacity-60"
            >
              {generating ? 'Refreshing…' : 'Regenerate guide'}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
            Get a tailored what-to-wear guide for{' '}
            <span className="font-semibold">{company || 'this role'}</span> — outfit, what to avoid,
            and first-impression tips. Dressing one step above the team can swing the room in your
            favour.
          </p>
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {generating ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {generating
                ? 'Styling…'
                : `Generate dress guide · ${isAndroidNative() ? 'watch an ad' : '2 credits'}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DressGuide;
