import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lightbulb, Rocket, BookOpen, CheckCircle } from 'lucide-react';

// Per-step icon tint is the one accent touch; the tile itself stays a flat
// neutral surface (no pastel fills, no gradients). Emerald marks the win.
const LOADING_STEPS = [
  {
    icon: Rocket,
    color: 'text-slate-900 dark:text-slate-100',
    title: 'Igniting your potential...',
    message:
      "You've taken the first step towards your dream career, {name}. We're excited to be part of your journey!",
    type: 'MOTIVATION',
  },
  {
    icon: Lightbulb,
    color: 'text-slate-900 dark:text-slate-100',
    title: 'Did you know?',
    message:
      '75% of resumes are rejected by ATS before a human sees them. ApplyRight helps you beat the odds.',
    type: 'TIP',
  },
  {
    icon: BookOpen,
    color: 'text-slate-900 dark:text-slate-100',
    title: 'Must Know',
    message: 'Tailoring your CV for every single application is the #1 way to get more interviews.',
    type: 'GUIDE',
  },
  {
    icon: CheckCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    title: 'All set!',
    message: "Your dashboard is ready. Let's start building your future.",
    type: 'READY',
  },
];

const WelcomeModal = ({ isOpen, firstName, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    // Progress bar animation (approx 20 seconds total for 4 steps)
    const duration = 5000 * LOADING_STEPS.length;
    const interval = 50;
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        return next > 100 ? 100 : next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Step transition logic
    if (progress < 100) {
      // Map progress 0-100 to steps 0-(N-2)
      // We save the last step (Ready) for strictly 100%
      const activeStepCount = LOADING_STEPS.length - 1;
      const newStep = Math.floor((progress / 100) * activeStepCount);
      if (newStep !== currentStep && newStep < activeStepCount) {
        setCurrentStep(newStep);
      }
    } else {
      // Force last step when progress is 100
      setCurrentStep(LOADING_STEPS.length - 1);
    }
  }, [progress, isOpen]);

  if (!isOpen) return null;

  const StepIcon = LOADING_STEPS[currentStep].icon;
  const isReady = currentStep === LOADING_STEPS.length - 1;
  const cleanName = firstName || 'Future Pro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="w-full max-w-2xl p-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center"
          >
            {/* Dynamic Icon — flat neutral tile with a hairline border */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center mb-8"
            >
              <StepIcon className={`w-10 h-10 ${LOADING_STEPS[currentStep].color}`} />
            </motion.div>

            {/* Category Label — editorial hairline pill */}
            <span className="text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 mb-4">
              {LOADING_STEPS[currentStep].type}
            </span>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl font-heading font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-4">
              {LOADING_STEPS[currentStep].title}
            </h2>

            {/* Message */}
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed mb-12">
              {LOADING_STEPS[currentStep].message.replace('{name}', cleanName)}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Footer Area: Progress or Button */}
        <div className="max-w-md mx-auto h-20 flex items-center justify-center">
          {!isReady ? (
            <div className="w-full space-y-2">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-slate-900 dark:bg-white rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
                />
              </div>
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium animate-pulse">
                Setting up your personal dashboard...
              </p>
            </div>
          ) : (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onComplete}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-8 py-4 rounded-lg font-semibold text-lg shadow-sm flex items-center gap-3 transition-all active:scale-[0.98]"
            >
              Enter Dashboard
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
