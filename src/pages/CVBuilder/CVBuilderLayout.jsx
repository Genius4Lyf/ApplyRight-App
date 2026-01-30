import React, { useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import ATSGuide from '../../components/ATSGuide';
import { Save } from 'lucide-react';
import { CVBuilderProvider, useCVBuilder } from '../../context/CVContext';

const CVBuilderInner = () => {
    const {
        cvData,
        currentStep,
        currentStepIndex,
        steps,
        saving,
        user,
        handleNext,
        handleBack,
        updateCvData,
        loading
    } = useCVBuilder();

    const [showGuide, setShowGuide] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Progress Bar */}
                    <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-slate-900 line-clamp-1">{cvData.title}</h2>
                                <p className="text-xs md:text-sm text-slate-500">
                                    <span className="md:hidden">Step {currentStepIndex + 1} / {steps.length}</span>
                                    <span className="hidden md:inline">Step {currentStepIndex + 1} of {steps.length}: {currentStep?.label}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowGuide(!showGuide)}
                                className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${showGuide ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {showGuide ? 'Hide Guide' : 'Show Guide'}
                            </button>
                            {saving && <span className="text-xs text-indigo-600 animate-pulse flex items-center gap-1"><Save className="w-3 h-3" /> Saving...</span>}
                            <div className="hidden md:flex gap-1">
                                {steps.map((s, idx) => (
                                    <div
                                        key={s.id}
                                        className={`h-2 w-8 rounded-full transition-colors ${idx <= currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px] p-4 md:p-8">
                            <Outlet context={{ cvData, handleNext, handleBack, saving, user, updateCvData }} />
                        </div>
                    </div>
                </div>

                {/* Sidebar - ATS Guide */}
                <AnimatePresence mode="wait">
                    {showGuide && (
                        <>
                            {/* Mobile Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 xl:hidden"
                                onClick={() => setShowGuide(false)}
                            />

                            {/* Guide Container */}
                            <motion.div
                                initial={{ x: '100%', opacity: 0.5 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: '100%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
                                className="fixed inset-y-0 right-0 z-50 w-[90%] max-w-sm xl:static xl:w-96 xl:block border-l border-slate-200 bg-slate-50 shadow-2xl flex flex-col"
                            >
                                <div className="xl:hidden p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                                    <h3 className="font-bold text-indigo-900">ATS Best Practices</h3>
                                    <button onClick={() => setShowGuide(false)} className="p-2 bg-white rounded-full shadow-sm text-slate-500 hover:text-slate-800">
                                        <span className="sr-only">Close</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto bg-slate-50">
                                    <ATSGuide step={currentStep?.id || 'heading'} />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const CVBuilderLayout = () => {
    return (
        <CVBuilderProvider>
            <CVBuilderInner />
        </CVBuilderProvider>
    );
};

export default CVBuilderLayout;

