import React, { useState, useEffect } from 'react';
import { Sparkles, Building2, ClipboardPaste, X, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import UserService from '../../services/user.service';

const HistoryTutorial = ({ isOpen, onClose, user }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleDismiss = async () => {
        if (onClose) onClose();

        if (dontShowAgain && user) {
            try {
                // Merge existing settings to avoid overwriting other keys
                const currentSettings = user.settings || {};
                await UserService.updateSettings({ ...currentSettings, showOnboardingTutorials: false });
            } catch (error) {
                console.error("Failed to update tutorial usage", error);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white relative">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                            <Sparkles className="w-6 h-6 text-yellow-300" />
                        </div>
                        <h2 className="text-xl font-bold">AI Superpowers Activated</h2>
                    </div>
                    <p className="text-indigo-100">
                        We've upgraded the Work History section to write for you.
                    </p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Feature 1 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mt-1">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Context is King</h3>
                            <p className="text-sm text-slate-600 leading-relaxed mt-1">
                                Enter the <strong>exact Job Title and Company Name</strong>. Our AI uses this to tailor suggestions to your specific industry.
                            </p>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mt-1">
                            <ClipboardPaste className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Paste & Optimize</h3>
                            <p className="text-sm text-slate-600 leading-relaxed mt-1">
                                Have a rough draft or job description? <strong>Paste it into the Description box</strong>. Our AI will automatically offer to rewrite it into ATS-friendly bullet points.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="peer h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 transition-all cursor-pointer"
                            />
                        </div>
                        <span className="text-sm text-slate-500 group-hover:text-slate-700 select-none">
                            Don't show this again
                        </span>
                    </label>

                    <button
                        onClick={handleDismiss}
                        className="btn-primary px-6 py-2.5 flex items-center gap-2 shadow-lg shadow-indigo-200"
                    >
                        Got it! Let's Build <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default HistoryTutorial;
