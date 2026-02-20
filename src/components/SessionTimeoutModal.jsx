import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SessionTimeoutModal = ({ isOpen, remainingTime, onExtendSession, onLogout }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
                    >
                        {/* decorative background element */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-50 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-16 h-16 bg-amber-100/80 rounded-full flex items-center justify-center mb-6 text-amber-600 shadow-sm border border-amber-200">
                                <Clock className="w-8 h-8 animate-pulse" />
                            </div>

                            <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Are you still there?</h3>

                            <p className="text-slate-600 mb-6 leading-relaxed">
                                For your security, you will be logged out due to inactivity in:
                            </p>

                            <div className="text-4xl font-black text-amber-600 mb-8 tabular-nums tracking-tighter">
                                {remainingTime}s
                            </div>

                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={onExtendSession}
                                    className="w-full px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-indigo-200"
                                >
                                    I'm Still Here
                                </button>
                                <button
                                    onClick={onLogout}
                                    className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition-colors"
                                >
                                    Log Out Now
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SessionTimeoutModal;
