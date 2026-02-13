import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';

/**
 * LoadingWithAd - Loading screen with MoneyTag 728×90 Banner Ad
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Banner zone (728×90) in MoneyTag dashboard
 * 2. Get your zone ID
 * 3. Replace 'YOUR_ZONE_ID_HERE' below with your actual zone ID
 * 4. Test that ads appear during loading states
 * 
 * @param {string[]} messages - Array of loading messages to rotate through
 * @param {boolean} showProgress - Whether to show progress bar
 * @param {function} onComplete - Callback when minimum display time reached
 */
const LoadingWithAd = ({
    messages = ["Processing..."],
    showProgress = false,
    onComplete = null
}) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    const MIN_DISPLAY_TIME = 10000; // Minimum 10 seconds to ensure ad impression
    const MESSAGE_ROTATION_TIME = 3500; // Rotate messages every 3.5 seconds

    // TODO: Replace with your actual MoneyTag Zone ID
    const MONETAG_ZONE_ID = 'YOUR_ZONE_ID_HERE';


    // Rotate through messages
    useEffect(() => {
        if (messages.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        }, MESSAGE_ROTATION_TIME);

        return () => clearInterval(interval);
    }, [messages.length]);

    // Track display time and progress
    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;

            if (showProgress) {
                const progressPercent = Math.min((elapsed / 10000) * 100, 95);
                setProgress(progressPercent);
            }

            if (elapsed >= MIN_DISPLAY_TIME && onComplete) {
                onComplete();
            }
        }, 100);

        return () => clearInterval(interval);
    }, [showProgress, onComplete]);

    // Rotating Tips Logic
    const tips = [
        "Tailor your CV to every job description for better results.",
        "Use action verbs like 'Led', 'Created', and 'Optimized'.",
        "Keep your CV concise - 1-2 pages is usually best.",
        "Quantify your achievements with numbers and percentages.",
        "Proofread carefully! Typos can be a dealbreaker.",
        "Focus on results, not just responsibilities.",
        "Save your CV as a PDF to ensure formatting stays consistent."
    ];

    const [currentTipIndex, setCurrentTipIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % tips.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const currentMessage = messages[currentMessageIndex];

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-8 m-4 shadow-2xl">
                {/* Loading indicator */}
                <div className="flex flex-col items-center mb-8">
                    <Loader className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 text-center">{currentMessage}</h2>
                    <p className="text-slate-500 mt-2">This will only take a moment</p>
                </div>

                {/* ApplyRight Tips Banner (Replaces Ad) */}
                <div className="my-6">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">

                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-100 rounded-full blur-2xl opacity-50"></div>
                        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-purple-100 rounded-full blur-2xl opacity-50"></div>

                        {/* Icon */}
                        <div className="relative z-10 bg-white p-3 rounded-xl shadow-sm">
                            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>

                        {/* Text */}
                        <div className="relative z-10 flex-1 text-center md:text-left">
                            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-1">ApplyRight Pro Tip</h3>
                            <p className="text-slate-700 font-medium text-lg leading-relaxed">
                                "{tips[currentTipIndex]}"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Apologetic message (Updated for tips) */}
                <p className="text-sm text-slate-400 text-center mb-6">
                    Sit tight! We're optimizing your experience.
                </p>

                {/* Progress bar (optional) */}
                {showProgress && (
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoadingWithAd;
