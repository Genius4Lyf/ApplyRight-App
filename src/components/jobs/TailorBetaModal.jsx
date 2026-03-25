import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Target } from 'lucide-react';

const TailorBetaModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show once per user
    const hasSeenBeta = localStorage.getItem('tailorBetaSeen');
    if (!hasSeenBeta) {
      // Delay slightly for nice entrance
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('tailorBetaSeen', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-[440px] overflow-hidden border border-slate-200/60"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-8">
                {/* Minimalist Icon */}
                <div className="w-12 h-12 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>

                {/* Typography Hierarchy */}
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">
                  Tailored Applications (Beta)
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  We are excited to share early access to our AI Tailor CV feature. Help us test and shape the future of intelligent job hunting.
                </p>

                {/* Sleek Callout */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 mb-8">
                  <div className="flex gap-3">
                    <Target className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-slate-600 leading-relaxed">
                      Our AI models are actively learning. If a tailored result doesn't perfectly capture your unique voice, we highly recommend using the powerful core <strong className="text-slate-800 font-medium">ApplyRight Builder</strong> for the absolute best outcomes.
                    </p>
                  </div>
                </div>

                {/* Modern CTA */}
                <button
                  onClick={handleClose}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-[0_2px_10px_-3px_rgba(79,70,229,0.4)] transition-all active:scale-[0.98]"
                >
                  Continue exploring
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TailorBetaModal;
