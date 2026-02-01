import React, { useState, useEffect, useRef } from 'react';
import { X, PlayCircle, Loader, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdPlayer = ({ onComplete, onClose }) => {
    const [adState, setAdState] = useState('loading'); // loading, ready, playing, completed, error
    const [timeLeft, setTimeLeft] = useState(15); // Fallback mock timer
    const [errorMessage, setErrorMessage] = useState('');
    const adContainerRef = useRef(null);
    const rewardedAdRef = useRef(null);

    const intervalRef = useRef(null);

    // AdMob Configuration
    const ADMOB_APP_ID = import.meta.env.VITE_ADMOB_APP_ID;
    const AD_UNIT_ID = import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID;
    const USE_TEST_ADS = !ADMOB_APP_ID || ADMOB_APP_ID.includes('test') || import.meta.env.DEV;

    useEffect(() => {
        // Try to load Google AdMob Ad
        loadAdMobAd();

        return () => {
            // Cleanup
            if (rewardedAdRef.current) {
                try {
                    rewardedAdRef.current.destroy?.();
                } catch (e) {
                    console.error('Error destroying ad:', e);
                }
            }
            // Clear interval to prevent onComplete from firing after close
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const loadAdMobAd = async () => {
        try {
            // Check if Google Ad Manager is available
            if (!window.googletag) {
                console.log('Google Ad Manager not available, using fallback mock ad');
                useFallbackMockAd();
                return;
            }

            // For rewarded ads, we'll use the Google Publisher Tag (GPT) API
            // This is a simplified implementation - in production you'd use the full AdMob SDK

            // Use test ad unit if no real ID configured
            const adUnitId = USE_TEST_ADS ? '/6499/example/rewarded' : AD_UNIT_ID;

            if (!adUnitId) {
                console.log('No ad unit configured, using mock ad');
                useFallbackMockAd();
                return;
            }

            setAdState('ready');

            // Simulate ad loading and playing (real implementation would use AdMob SDK)
            setTimeout(() => {
                setAdState('playing');
                startAdPlayback();
            }, 1000);

        } catch (error) {
            console.error('Error loading AdMob ad:', error);
            setErrorMessage('Failed to load ad. Using fallback.');
            useFallbackMockAd();
        }
    };

    const startAdPlayback = () => {
        // Real AdMob implementation would play video here
        // For now, simulate 30-second video ad
        let countdown = 30;
        setTimeLeft(countdown);

        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            countdown -= 1;
            setTimeLeft(countdown);

            if (countdown <= 0) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                handleAdComplete();
            }
        }, 1000);
    };

    const useFallbackMockAd = () => {
        // Fallback to mock ad system
        setAdState('playing');
        setErrorMessage('Using demo ad (AdMob not configured)');

        let countdown = 15;
        setTimeLeft(countdown);

        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            countdown -= 1;
            setTimeLeft(countdown);

            if (countdown <= 0) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                handleAdComplete();
            }
        }, 1000);
    };

    const handleAdComplete = () => {
        setAdState('completed');
        setTimeout(() => {
            // Ensure component is still mounted/valid before calling back
            onComplete();
        }, 1500);
    };

    const handleClose = () => {
        if (adState === 'completed') {
            onClose();
        } else {
            if (window.confirm("Close ad? You won't get your reward.")) {
                onClose();
            }
        }
    };

    const getProgressPercentage = () => {
        const totalTime = adState === 'playing' && timeLeft <= 30 ? 30 : 15;
        return ((totalTime - timeLeft) / totalTime) * 100;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center">
            {/* Ad Container */}
            <div
                ref={adContainerRef}
                className="absolute inset-0 bg-neutral-900 flex items-center justify-center overflow-hidden"
            >
                {/* Loading State */}
                {adState === 'loading' && (
                    <div className="text-center space-y-4">
                        <Loader className="w-16 h-16 text-indigo-500 animate-spin mx-auto" />
                        <h3 className="text-xl font-bold text-neutral-300">Loading Advertisement...</h3>
                    </div>
                )}

                {/* Ready/Playing State */}
                {(adState === 'ready' || adState === 'playing') && (
                    <div className="text-center space-y-4">
                        <div className="w-24 h-24 bg-neutral-800 rounded-xl mx-auto flex items-center justify-center animate-pulse">
                            <PlayCircle className="w-12 h-12 text-neutral-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-neutral-400 mb-1">
                                {USE_TEST_ADS ? 'Demo Advertisement' : 'Sponsored Content'}
                            </h3>
                            <p className="text-neutral-500 text-xs max-w-xs mx-auto leading-relaxed mb-4">
                                💚 We use ads to keep ApplyRight free for everyone. Thank you for supporting our platform!
                            </p>

                            <p className="text-neutral-600 text-sm">
                                {adState === 'playing' ? 'Advertisement playing...' : 'Starting ad...'}
                            </p>
                            {errorMessage && (
                                <div className="flex items-center justify-center gap-2 mt-2 text-amber-400 text-xs">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Progress Bar */}
                {adState === 'playing' && (
                    <div
                        className="absolute bottom-0 left-0 h-1 bg-indigo-600 transition-all duration-1000 ease-linear"
                        style={{ width: `${getProgressPercentage()}%` }}
                    />
                )}
            </div>

            {/* Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-4">
                {adState === 'playing' && (
                    <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full font-mono font-bold text-sm border border-white/10">
                        Reward in {timeLeft}s
                    </div>
                )}

                {adState === 'completed' && (
                    <div className="bg-green-500/20 backdrop-blur-md px-4 py-2 rounded-full font-bold text-sm border border-green-500/30 text-green-400">
                        Reward Verified ✓
                    </div>
                )}

                <button
                    onClick={handleClose}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
                    title="Close Ad"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Completion Overlay */}
            <AnimatePresence>
                {adState === 'completed' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20"
                    >
                        <div className="flex flex-col items-center">
                            <Loader className="w-10 h-10 text-green-500 animate-spin mb-4" />
                            <h3 className="text-2xl font-bold text-green-400">Verifying Reward...</h3>
                            <p className="text-neutral-400 text-sm mt-2">Adding 5 credits to your account</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdPlayer;
