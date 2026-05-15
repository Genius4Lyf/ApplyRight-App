import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  title = 'Delete Application',
  message = 'Are you sure you want to delete this application? This action cannot be undone.',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — z-[100] so it sits above the mobile bottom nav (z-40)
              and any other in-page modals at z-50. Covers the entire viewport
              including the safe-area regions. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
            onClick={!isDeleting ? onClose : undefined}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header — tighter padding on mobile, looser on desktop */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-red-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {title}
                  </h3>
                </div>
                <button
                  onClick={!isDeleting ? onClose : undefined}
                  className="p-1.5 -mr-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  disabled={isDeleting}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 overflow-y-auto">
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{message}</p>
              </div>

              {/* Footer — buttons stack on mobile (full-width, big tap targets),
                  inline on desktop. Primary action sits above Cancel on mobile
                  via flex-col-reverse so it's the first thing the thumb hits. */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span className="sm:hidden">Delete</span>
                      <span className="hidden sm:inline">Delete Application</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirmationModal;
