import React, { useState, useEffect } from 'react';
import { Sparkles, X, CheckCircle, ArrowRight } from 'lucide-react';

const FeatureAnnouncementModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasSeenUpdate = localStorage.getItem('hasSeenSkillsUpdate_v1');
        if (!hasSeenUpdate) {
            // Short delay to allow dashboard to load
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('hasSeenSkillsUpdate_v1', 'true');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative animate-in zoom-in-95 duration-300">
                {/* Header Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-600 to-violet-600"></div>

                {/* Content */}
                <div className="relative z-10 pt-12 px-8 pb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 mx-auto">
                        <Sparkles className="w-8 h-8 text-indigo-600" />
                    </div>

                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Intelligent Skills Engine</h2>
                        <p className="text-slate-500">
                            We've upgraded our core analysis engine to provide professional-grade skill categorization automatically.
                        </p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-4">
                            <div className="mt-1 bg-indigo-100 p-1.5 rounded-full text-indigo-600">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">Automated Categorization</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Your skills are now automatically extracted, structured, and categorized (Technical, Soft Skills, Tools) to match industry standards.
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-4">
                            <div className="mt-1 bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">Pricing Update</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    To cover the costs of the advanced AI models powering the new Intelligent Skills feature (5 Credits), we have updated our pricing:
                                </p>
                                <div className="flex gap-4 mt-2">
                                    <span className="text-xs font-semibold bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600">
                                        Upload: <span className="text-slate-900">5 → 10 Credits</span>
                                    </span>
                                    <span className="text-xs font-semibold bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600">
                                        Analysis: <span className="text-slate-900">15 → 20 Credits</span>
                                    </span>
                                </div>
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
        </div>
    );
};

export default FeatureAnnouncementModal;
