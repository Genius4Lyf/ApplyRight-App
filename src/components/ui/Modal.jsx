import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, actions, size = 'md' }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl transform transition-all animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight min-w-0 truncate">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700 rounded-full transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {actions && (
          <div className="shrink-0 flex justify-end gap-3 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
