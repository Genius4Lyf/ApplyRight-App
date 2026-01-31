import React, { useState, useEffect } from 'react';
import { X, PlayCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdPlayer = ({ onComplete, onClose }) => {
    const [timeLeft, setTimeLeft] = useState(15); // 15 seconds for mock ad
    const [canSkip, setCanSkip] = useState(false);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        if (completed) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCompleted(true);
                    onComplete(); // Auto-complete when timer hits 0
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [completed, onComplete]);

    useEffect(() => {
        const skipTimer = setTimeout(() => {
            setCanSkip(true);
        }, 5000); // Allow skip after 5 seconds (but no reward if skipped early, optionally)

        return () => clearTimeout(skipTimer);
    }, []);

    const handleClose = () => {
        if (!completed) {
            if (window.confirm("Close ad? You won't get your reward.")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center">
            {/* Ad Content Mock */}
            <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center overflow-hidden">
                <div className="text-center space-y-4 animate-pulse">
                    <div className="w-24 h-24 bg-neutral-800 rounded-xl mx-auto flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-neutral-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-neutral-400">Sponsored Content</h3>
                        <p className="text-neutral-600 text-sm">Advertisement playing...</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-indigo-600 transition-all duration-1000 ease-linear"
                    style={{ width: `${((15 - timeLeft) / 15) * 100}%` }}
                ></div>
            </div>

            {/* Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-4">
                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full font-mono font-bold text-sm border border-white/10">
                    {completed ? 'Reward Verified' : `Reward in ${timeLeft}s`}
                </div>

                <button
                    onClick={handleClose}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Loading/Verifying Overlay */}
            <AnimatePresence>
                {completed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20"
                    >
                        <div className="flex flex-col items-center">
                            <Loader className="w-10 h-10 text-green-500 animate-spin mb-4" />
                            <h3 className="text-2xl font-bold text-green-400">Verifying Reward...</h3>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdPlayer;
