import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building, ExternalLink, Hash, FileText } from 'lucide-react';

/**
 * JobPostingDrawer
 *
 * Right-side slide-over (full-screen sheet on mobile) that shows the original
 * job posting that an analysis was run against. The data already lives on the
 * application's populated `jobId` (title/company/description/jobUrl/keywords) —
 * this is purely a reference view, no fetching or mutation.
 *
 * Kept out of the main detail scroll on purpose: postings run long and would
 * bury the Generate CTAs if inlined. Opened from a ghost button in the detail
 * header; dismiss via backdrop, the X, or Esc.
 */
const JobPostingDrawer = ({ isOpen, onClose, job }) => {
  // Esc to close + lock body scroll while open so the page behind doesn't
  // scroll under the drawer on desktop.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const title = job?.title || 'Job posting';
  const company = job?.company || '';
  const description = job?.description || '';
  const jobUrl = job?.jobUrl || '';
  const keywords = Array.isArray(job?.keywords) ? job.keywords.filter(Boolean) : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-end"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md lg:max-w-lg h-full bg-white shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Job posting"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start gap-3 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-slate-900 leading-tight">{title}</h2>
                {company && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <Building className="w-3 h-3" />
                    <span className="truncate">{company}</span>
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                aria-label="Close job posting"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
              {/* Original posting link */}
              {jobUrl && (
                <a
                  href={jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View original posting
                </a>
              )}

              {/* Parsed keywords */}
              {keywords.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                    <Hash className="w-3 h-3" /> Detected keywords
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw, i) => (
                      <span
                        key={`${kw}-${i}`}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full description */}
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                  Job description
                </div>
                {description ? (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                    {description}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    No description was saved for this posting.
                  </p>
                )}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobPostingDrawer;
