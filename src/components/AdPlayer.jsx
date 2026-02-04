import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Loader, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdPlayer = ({ onComplete, onClose }) => {
    // States: 'initial', 'verifying', 'completed'
    const [adState, setAdState] = useState('initial');
    const [timeLeft, setTimeLeft] = useState(15);
    const intervalRef = useRef(null);

    // Monetag Direct Link
    const DIRECT_LINK_URL = "https://otieu.com/4/10562647";

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const handleStartAd = () => {
        // Open Monetag Direct Link in new tab
        window.open(DIRECT_LINK_URL, '_blank');

        // Start verification timer
        setAdState('verifying');
        startTimer();
    };

    const startTimer = () => {
        setTimeLeft(15);
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    handleAdComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleAdComplete = () => {
        setAdState('completed');
        // Small delay to show completion state before closing
        setTimeout(() => {
            onComplete();
        }, 2000);
    };

    const handleClose = () => {
        if (adState === 'completed') {
            onClose();
        } else if (adState === 'verifying') {
            if (window.confirm("Cancel verification? You won't receive credits.")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative"
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10 text-slate-500"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-8 text-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">

                    {/* Icon State */}
                    <div className="w-24 h-24 mx-auto mb-6 relative">
                        {adState === 'initial' && (
                            <div className="w-full h-full bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                                <ExternalLink className="w-10 h-10" />
                            </div>
                        )}
                        {adState === 'verifying' && (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                    <circle
                                        cx="50" cy="50" r="45" fill="none" stroke="#4f46e5" strokeWidth="8"
                                        strokeDasharray="283"
                                        strokeDashoffset={283 - (283 * ((15 - timeLeft) / 15))}
                                        className="transition-all duration-1000 ease-linear"
                                    />
                                </svg>
                                <span className="text-2xl font-bold text-indigo-600 font-mono">{timeLeft}</span>
                            </div>
                        )}
                        {adState === 'completed' && (
                            <div className="w-full h-full bg-green-100 text-green-600 rounded-full flex items-center justify-center scale-110 transition-transform">
                                <CheckCircle className="w-12 h-12" />
                            </div>
                        )}
                    </div>

                    {/* Text State */}
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                        {adState === 'initial' && 'Sponsored Offer'}
                        {adState === 'verifying' && 'Verifying...'}
                        {adState === 'completed' && 'Reward Unlocked!'}
                    </h3>

                    <p className="text-slate-500 mb-8 min-h-[48px]">
                        {adState === 'initial' && 'View our sponsor\'s offer to unlock your free credits instantly.'}
                        {adState === 'verifying' && 'Please keep the offer tab open for a few seconds to verify your view.'}
                        {adState === 'completed' && 'Your 10 credits have been added to your account.'}
                    </p>

                    {/* Action Button */}
                    {adState === 'initial' && (
                        <button
                            onClick={handleStartAd}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            View Offer <ArrowRight className="w-5 h-5" />
                        </button>
                    )}

                    {adState === 'verifying' && (
                        <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl font-medium flex items-center justify-center gap-2 cursor-wait">
                            <Loader className="w-5 h-5 animate-spin" /> Verifying...
                        </div>
                    )}

                    {adState === 'completed' && (
                        <div className="w-full py-4 bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2">
                            Success!
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 text-xs text-center text-slate-400 border-t border-slate-100">
                    Trusted Partner Network
                </div>
            </motion.div>
        </div>
    );
};

export default AdPlayer;
