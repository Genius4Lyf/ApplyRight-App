import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, PenTool, BarChart2, X, ChevronRight, Upload, Zap } from 'lucide-react';

const TOUR_STEPS = [
    {
        id: 'welcome',
        title: "Welcome to ApplyRight",
        description: "Your personal AI career assistant. Let's take a quick tour of your new command center.",
        icon: Sparkles,
        color: "text-indigo-600",
        bg: "bg-indigo-100",
        image: "/tour-welcome.png" // Placeholder, we'll use CSS shapes/icons if image missing
    },
    {
        id: 'credits',
        title: "Credits & Support",
        description: "Start with 20 free credits for your first application. Support us and earn more credits instantly by watching short ads.",
        icon: Zap,
        color: "text-amber-500",
        bg: "bg-amber-100",
    },
    {
        id: 'upload',
        title: "Match Analysis",
        description: "Upload your CV and a job description to get an instant AI compatibility score and actionable advice.",
        icon: Upload,
        color: "text-emerald-600",
        bg: "bg-emerald-100",
    },
    {
        id: 'builder',
        title: "Smart CV Builder",
        description: "Create ATS-friendly resumes from scratch or edit existing ones with our intelligent builder.",
        icon: PenTool,
        color: "text-blue-600",
        bg: "bg-blue-100",
    },
    {
        id: 'optimize',
        title: "Tailored Optimization",
        description: "We rewrite your bullet points to match the job requirements perfectly. Never send a generic CV again.",
        icon: BarChart2,
        color: "text-rose-600",
        bg: "bg-rose-100",
    }
];

const DashboardTour = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        // Check local storage to see if tour has been completed
        const hasSeenTour = localStorage.getItem('dashboard_tour_seen');
        if (!hasSeenTour) {
            // Add a small delay so it doesn't pop up INSTANTLY upon dashboard load
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('dashboard_tour_seen', 'true');
    };

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    if (!isOpen) return null;

    const step = TOUR_STEPS[currentStep];
    const Icon = step.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative"
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-white bg-black/10 hover:bg-black/20 rounded-full transition-colors z-20"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Creative Header Background */}
                <div className={`h-40 ${step.bg} relative overflow-hidden transition-colors duration-500`}>
                    <div className="absolute inset-0 opacity-20">
                        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" className={step.color} />
                        </svg>
                    </div>

                    <motion.div
                        key={step.id}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center ${step.color} z-10 border-4 border-white`}
                    >
                        <Icon className="w-12 h-12" />
                    </motion.div>
                </div>

                {/* Content */}
                <div className="pt-12 pb-8 px-8 text-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3 className="text-2xl font-bold text-slate-900 mb-3 font-heading">
                                {step.title}
                            </h3>
                            <p className="text-slate-500 leading-relaxed mb-8">
                                {step.description}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2 mb-8">
                        {TOUR_STEPS.map((s, idx) => (
                            <div
                                key={s.id}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-indigo-600' : 'bg-slate-200'}`}
                            />
                        ))}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleNext}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:shadow-indigo-300 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {currentStep === TOUR_STEPS.length - 1 ? "Get Started" : "Next"}
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {currentStep < TOUR_STEPS.length - 1 && (
                        <button
                            onClick={handleClose}
                            className="mt-4 text-xs text-slate-400 hover:text-slate-600 font-medium"
                        >
                            Skip Tour
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DashboardTour;
