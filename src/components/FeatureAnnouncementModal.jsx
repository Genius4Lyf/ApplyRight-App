import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, CheckCircle, ArrowRight, Briefcase, Search } from 'lucide-react';

const FeatureAnnouncementModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenUpdate = localStorage.getItem('hasSeenJobsFeatureUpdate_v1');
    if (!hasSeenUpdate) {
      // Short delay to allow DOM to settle
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenJobsFeatureUpdate_v1', 'true');
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative animate-in zoom-in-95 duration-300">
        {/* Header Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-600 to-violet-600"></div>

        {/* Content */}
        <div className="relative z-10 pt-12 px-8 pb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 mx-auto">
            <Briefcase className="w-8 h-8 text-indigo-600" />
          </div>

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Introducing ApplyRight Jobs & Tailoring</h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              We've launched a powerful new Jobs platform tightly integrated with One-Click CV Tailoring to help you land more interviews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full text-indigo-600 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Global Job Search</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Browse thousands of remote, local, and global opportunities. ApplyRight now curates a "For You" feed matching your unique skills and preferences.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full text-emerald-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">One-Click CV Tailoring</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Found a job you like? Our AI instantly analyzes the job description and tailors your CV to highlight the perfect matching skills and experience, dramatically boosting your ATS score.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
          >
            Got it, continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FeatureAnnouncementModal;
