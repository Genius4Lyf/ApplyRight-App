import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Lightbulb, Rocket, BookOpen, CheckCircle } from 'lucide-react';

const LOADING_STEPS = [
    {
        icon: Rocket,
        color: "text-rose-500",
        bg: "bg-rose-100",
        title: "Igniting your potential...",
        message: "You've taken the first step towards your dream career, {name}. We're excited to be part of your journey!",
        type: "MOTIVATION"
    },
    {
        icon: Lightbulb,
        color: "text-amber-500",
        bg: "bg-amber-100",
        title: "Did you know?",
        message: "75% of resumes are rejected by ATS before a human sees them. ApplyRight helps you beat the odds.",
        type: "TIP"
    },
    {
        icon: BookOpen,
        color: "text-indigo-500",
        bg: "bg-indigo-100",
        title: "Must Know",
        message: "Tailoring your CV for every single application is the #1 way to get more interviews.",
        type: "GUIDE"
    },
    {
        icon: Sparkles,
        color: "text-emerald-500",
        bg: "bg-emerald-100",
        title: "All set!",
        message: "Your dashboard is ready. Let's start building your future.",
        type: "READY"
    }
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
            setProgress(prev => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
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
                        {/* Dynamic Icon */}
                        <motion.div
                            initial={{ scale: 0.8, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={`w-24 h-24 ${LOADING_STEPS[currentStep].bg} rounded-3xl flex items-center justify-center mb-8 shadow-sm`}
                        >
                            <StepIcon className={`w-12 h-12 ${LOADING_STEPS[currentStep].color}`} />
                        </motion.div>

                        {/* Category Label */}
                        <span className={`text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-4 ${LOADING_STEPS[currentStep].bg} ${LOADING_STEPS[currentStep].color} bg-opacity-50`}>
                            {LOADING_STEPS[currentStep].type}
                        </span>

                        {/* Title */}
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 font-heading">
                            {LOADING_STEPS[currentStep].title}
                        </h2>

                        {/* Message */}
                        <p className="text-lg md:text-xl text-slate-500 max-w-lg leading-relaxed mb-12">
                            {LOADING_STEPS[currentStep].message.replace('{name}', cleanName)}
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* Footer Area: Progress or Button */}
                <div className="max-w-md mx-auto h-20 flex items-center justify-center">
                    {!isReady ? (
                        <div className="w-full space-y-2">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-indigo-600 rounded-full"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: "tween", ease: "linear", duration: 0.1 }}
                                />
                            </div>
                            <p className="text-center text-xs text-slate-400 font-medium animate-pulse">
                                Setting up your personal dashboard...
                            </p>
                        </div>
                    ) : (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={onComplete}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-200 flex items-center gap-3 transition-all hover:-translate-y-1 active:scale-95"
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
