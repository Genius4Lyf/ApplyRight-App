import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Crown, Zap, Shield, Sparkles } from 'lucide-react';

const UpgradeModal = ({ isOpen, onClose, onUpgrade, userPlan }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 grid grid-cols-1 md:grid-cols-2"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-20"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Free Plan (Current) */}
                    <div className="p-8 md:p-10 bg-slate-50 flex flex-col relative border-r border-slate-100">
                        {userPlan !== 'paid' && (
                            <span className="absolute top-8 right-8 px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-full">
                                Current Plan
                            </span>
                        )}

                        <div className="mb-8 mt-4">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Free Starter</h3>
                            <p className="text-slate-500">Good for getting started, but limited.</p>
                        </div>

                        <div className="space-y-4 flex-1">
                            <LimitItem icon={<Check />} text="1 Resume Draft" />
                            <LimitItem icon={<Check />} text="3 Job Optimizations" />
                            <LimitItem icon={<Check />} text="Basic Templates" />
                            <div className="opacity-40 space-y-4 pt-4 border-t border-slate-200">
                                <LimitItem icon={<X className="text-slate-400" />} text="Unlimited AI Analysis" crossed />
                                <LimitItem icon={<X className="text-slate-400" />} text="ATS Keyword Targeting" crossed />
                                <LimitItem icon={<X className="text-slate-400" />} text="Cover Letter Generator" crossed />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200 md:hidden">
                            <p className="text-center text-sm text-slate-500">Scroll down for Pro benefits</p>
                        </div>
                    </div>

                    {/* Pro Plan (Upgrade) */}
                    <div className="p-8 md:p-10 bg-slate-900 text-white flex flex-col relative overflow-hidden">
                        {/* Background Effects */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>

                        <div className="relative z-10 flex-1">
                            <div className="mb-8 mt-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg shadow-amber-900/20 mb-4">
                                    <Sparkles className="w-3 h-3" /> Recommended
                                </span>
                                <h3 className="text-3xl font-bold mb-2 flex items-center gap-3">
                                    Pro Access <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
                                </h3>
                                <p className="text-indigo-200">Unlock your full career potential.</p>
                            </div>

                            <div className="space-y-5">
                                <BenefitItem text="Unlimited Resumes & Drafts" />
                                <BenefitItem text="Endless Job Optimizations" />
                                <BenefitItem text="Access All Premium Templates" />
                                <BenefitItem text="Advanced ATS Keyword Targeting" />
                                <BenefitItem text="AI Cover Letter Generator" />
                                <BenefitItem text="Priority Support" />
                            </div>
                        </div>

                        <div className="mt-10 relative z-10">
                            <div className="flex items-end gap-2 mb-6">
                                <span className="text-4xl font-bold text-white">$19</span>
                                <span className="text-lg text-indigo-300 pb-1">/ lifetime</span>
                            </div>

                            <button
                                onClick={onUpgrade}
                                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                            >
                                <Zap className="w-5 h-5 fill-white group-hover:animate-pulse" />
                                Upgrade Now
                            </button>
                            <p className="text-center text-xs text-indigo-300 mt-4">One-time payment. No hidden subscription.</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

// Helper Components
const LimitItem = ({ icon, text, crossed }) => (
    <div className={`flex items-center gap-3 ${crossed ? 'text-slate-400' : 'text-slate-600'}`}>
        <div className={`w-5 h-5 flex items-center justify-center rounded-full ${crossed ? 'bg-slate-100' : 'bg-green-100 text-green-600'}`}>
            {React.cloneElement(icon, { size: 12 })}
        </div>
        <span className={`text-sm font-medium ${crossed ? 'line-through' : ''}`}>{text}</span>
    </div>
);

const BenefitItem = ({ text }) => (
    <div className="flex items-center gap-3">
        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-500/50">
            <Check size={14} strokeWidth={3} />
        </div>
        <span className="font-semibold text-white/90">{text}</span>
    </div>
);

export default UpgradeModal;
