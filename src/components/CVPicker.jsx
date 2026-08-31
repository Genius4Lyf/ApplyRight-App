import React from 'react';
import { FileText, CheckCircle } from 'lucide-react';
import CVUploader from './CVUploader';

/**
 * Step 1 "choose your CV" picker — a Saved CV / Upload toggle.
 *
 * Controlled component: all selection state lives in the parent so the parent
 * can derive what to send to the API (a saved draft's id vs. an uploaded
 * resume's id). Shared by the "Interview Me" flow and the ApplyRight analysis
 * flow so both stay visually and behaviourally identical.
 */
const CVPicker = ({
  cvMode, // 'saved' | 'upload'
  onCvModeChange,
  drafts = [],
  draftsLoading = false,
  selectedDraftId,
  onSelectDraft,
  uploadedResume,
  onUploadedResume,
  uploadEndpoint, // optional override for CVUploader
  title = 'Step 1 · Your CV',
  subtitle = 'Pick a saved CV or upload one',
}) => {
  return (
    // Chrome-less: the host wrapper supplies the card (border/background/
    // padding), matching how the "Interview Me" page frames its steps.
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      {/* Editorial segmented toggle — hairline track, filled active tab. */}
      <div className="flex gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1 mb-5">
        <button
          type="button"
          onClick={() => onCvModeChange('saved')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            cvMode === 'saved'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Saved CV
        </button>
        <button
          type="button"
          onClick={() => onCvModeChange('upload')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            cvMode === 'upload'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Upload
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {cvMode === 'saved' ? (
          draftsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              No saved CVs yet — switch to <strong>Upload</strong> to use a PDF.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-none pr-1">
              {drafts.map((d) => {
                const selected = selectedDraftId === d._id;
                const label = d.title || d.personalInfo?.fullName || 'Untitled CV';
                return (
                  <button
                    key={d._id}
                    type="button"
                    onClick={() => onSelectDraft(d._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      selected
                        ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {label}
                    </span>
                    {selected && <CheckCircle className="w-5 h-5 text-slate-900 dark:text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          )
        ) : uploadedResume ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Resume uploaded
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 truncate">
                {uploadedResume.parsedData?.experience?.[0]?.role || 'Ready to analyze'}
              </p>
            </div>
            <button
              onClick={() => onUploadedResume(null)}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline shrink-0"
            >
              Change
            </button>
          </div>
        ) : (
          <CVUploader
            embedded
            onUploadSuccess={onUploadedResume}
            {...(uploadEndpoint ? { endpoint: uploadEndpoint } : {})}
          />
        )}
      </div>
    </div>
  );
};

export default CVPicker;
