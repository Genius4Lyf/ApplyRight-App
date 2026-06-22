import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { getCompletionStatus } from '../lib/cvCompleteness';

// Shared card for a CV draft. `compact` mirrors the original dashboard widget
// (icon + title + single CTA). `full` adds a progress bar and missing-sections
// chip list for the dedicated /my-cvs listing.
const CVCard = ({ draft, onDelete, layout = 'compact' }) => {
  const navigate = useNavigate();
  const status = getCompletionStatus(draft);
  const { isComplete, percent, completedCount, totalCount, missing } = status;

  const target = isComplete ? `/resume/${draft._id}` : `/cv-builder/${draft._id}`;
  const handleNavigate = () => navigate(target);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate();
    }
  };
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete?.(draft);
  };

  return (
    <div
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open ${draft.title || 'Untitled CV'}`}
      className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-md transition-all group flex flex-col h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
    >
      <div className="flex justify-between items-start mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isComplete
              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
              : 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-300'
          }`}
        >
          {isComplete ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-full border border-slate-100 dark:border-slate-800">
          {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : ''}
        </span>
      </div>

      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
        {draft.title || 'Untitled CV'}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
        {draft.professionalSummary || 'No summary yet…'}
      </p>

      {layout === 'full' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isComplete ? 'Complete' : `${completedCount} of ${totalCount} sections`}
            </span>
            <span
              className={`text-[11px] font-bold ${
                isComplete
                  ? 'text-emerald-600 dark:text-emerald-300'
                  : 'text-indigo-600 dark:text-indigo-300'
              }`}
            >
              {percent}%
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isComplete ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          {!isComplete && missing.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider self-center mr-0.5">
                Add:
              </span>
              {missing.map((m) => (
                <span
                  key={m}
                  className="text-[11px] font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/15 border border-orange-100 dark:border-orange-500/30 px-1.5 py-0.5 rounded"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <span
          className={`text-xs font-semibold flex items-center group-hover:underline decoration-indigo-200 underline-offset-4 ${
            isComplete
              ? 'text-emerald-600 dark:text-emerald-300'
              : 'text-indigo-600 dark:text-indigo-300'
          }`}
        >
          {isComplete ? (
            <>
              Review CV <Eye className="w-3 h-3 ml-1" />
            </>
          ) : (
            <>
              Continue Editing <ChevronRight className="w-3 h-3 ml-1" />
            </>
          )}
        </span>
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
            title="Delete CV"
            aria-label={`Delete ${draft.title || 'Untitled CV'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CVCard;
