import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAvatarUrl } from './InterviewerPanel';

const InterviewerInfoModal = ({ person, onClose }) => {
  const { t } = useTranslation();
  if (!person) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl relative animate-in fade-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-3 pr-6">
          <img
            src={getAvatarUrl(person.name)}
            alt={person.name}
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0"
          />
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold text-slate-900 dark:text-slate-100 truncate">
              {person.name}
            </h3>
            <p className="text-[15px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {person.role}
            </p>
          </div>
        </div>

        <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
          {person.description || t('interviewPrep.mock.setupScreen.seatDescFallback')}
        </p>
      </div>
    </div>
  );
};

export default InterviewerInfoModal;
