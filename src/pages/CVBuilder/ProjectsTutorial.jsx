import React, { useState, useEffect } from 'react';
import { Sparkles, FlaskConical, ClipboardPaste, X, ArrowRight } from 'lucide-react';
import UserService from '../../services/user.service';

const ProjectsTutorial = ({ isOpen, onClose, user }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleDismiss = async () => {
        if (onClose) onClose();

        if (dontShowAgain && user) {
            try {
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
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white relative">
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
                        <h2 className="text-xl font-bold">Showcase Your Builds</h2>
                    </div>
                    <p className="text-emerald-100">
                        Projects prove your skills. Here is how our AI helps you shine.
                    </p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Feature 1 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mt-1">
                            <FlaskConical className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Project Name & Goals</h3>
                            <p className="text-sm text-slate-600 leading-relaxed mt-1">
                                Enter a clear <strong>Project Name</strong> and what you achieved (e.g. "Marketing Campaign", "Community Initiative"). Our AI uses this to highlight your impact.
                            </p>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mt-1">
                            <ClipboardPaste className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Paste Project Details</h3>
                            <p className="text-sm text-slate-600 leading-relaxed mt-1">
                                Paste a rough list of tasks, results, or a description. Our AI will optimize it into <strong>impressive professional achievements</strong>.
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
                                className="peer h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 transition-all cursor-pointer"
                            />
                        </div>
                        <span className="text-sm text-slate-500 group-hover:text-slate-700 select-none">
                            Don't show this again
                        </span>
                    </label>

                    <button
                        onClick={handleDismiss}
                        className="btn-primary px-6 py-2.5 flex items-center gap-2 shadow-lg shadow-emerald-200"
                    >
                        Got it! Start Adding <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectsTutorial;
