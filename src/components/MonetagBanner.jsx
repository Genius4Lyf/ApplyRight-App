import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Zap, CheckCircle, Loader } from 'lucide-react';
import { billingService } from '../services';

const MonetagBanner = ({
    title = "Sponsored Offer",
    subtitle = "View this offer to instantly earn +2 Credits.",
    buttonText = "View (+2 Credits)",
    slot,
    style,
    variant = 'default'
}) => {
    const DIRECT_LINK_URL = "https://otieu.com/4/10562647";
    const [status, setStatus] = useState('idle'); // idle, verifying, success
    const [timeLeft, setTimeLeft] = useState(10);
    const intervalRef = useRef(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const handleClick = () => {
        if (status !== 'idle') return;

        // 1. Open Link
        window.open(DIRECT_LINK_URL, '_blank');

        // 2. Start Verification
        setStatus('verifying');
        startTimer();
    };

    const startTimer = () => {
        setTimeLeft(10);
        intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    claimReward();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const claimReward = async () => {
        try {
            const result = await billingService.watchAd('banner');
            setStatus('success');

            // Update global credits
            window.dispatchEvent(new CustomEvent('credit_updated', { detail: result.credits }));

            // Reset after 5s so they can click again if they want
            setTimeout(() => {
                setStatus('idle');
            }, 5000);
        } catch (error) {
            console.error("Banner reward failed", error);
            setStatus('idle');
        }
    };

    // Compact Variant (Bottom Banner ?)
    if (variant === 'compact') {
        return (
            <div
                onClick={handleClick}
                className="group cursor-pointer bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 flex items-center justify-between shadow-md hover:shadow-lg transition-all border border-slate-700 w-full"
                style={style}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-lg text-yellow-400">
                        {status === 'verifying' ? <Loader className="w-5 h-5 animate-spin" /> :
                            status === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                                <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm">
                            {status === 'verifying' ? 'Verifying...' :
                                status === 'success' ? '+2 Credits Added!' :
                                    title}
                        </h4>
                        <p className="text-slate-400 text-xs">
                            {status === 'verifying' ? `Keep tab open for ${timeLeft}s` : subtitle}
                        </p>
                    </div>
                </div>
                <div className="text-white opacity-50 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-5 h-5" />
                </div>
            </div>
        );
    }

    // Default Variant (Vertical Card like "Invite Friends")
    return (
        <div
            onClick={handleClick}
            className={`group cursor-pointer bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden w-full h-full ${status === 'success' ? 'border-green-200 bg-green-50' : ''}`}
            style={style}
        >
            {/* Background Icon (Top Right) */}
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-32 h-32 text-indigo-900" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full">
                {/* Icon Badge */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors ${status === 'success' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {status === 'success' ? <CheckCircle className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                </div>

                {/* Text */}
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {status === 'verifying' ? 'Verifying...' : status === 'success' ? 'Reward Claimed!' : 'Sponsored Offer'}
                </h3>

                <p className="text-slate-500 mb-6 flex-grow">
                    {status === 'verifying' ? `Keep tab open for ${timeLeft}s...` :
                        status === 'success' ? '2 Credits have been added!' :
                            <>View this offer to instantly earn <span className="font-bold text-slate-900">2 Credits</span>.</>}
                </p>

                {/* Button */}
                <button className={`w-full py-3 px-4 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${status === 'success' ? 'bg-green-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                    {status === 'success' ? 'View Again' : 'View Offer'}
                    {status !== 'success' && <ExternalLink className="w-4 h-4 ml-1 opacity-50" />}
                </button>
            </div>

            {/* Success Overlay (Verifying) */}
            {status === 'verifying' && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
                        <span className="font-bold text-indigo-900">Verifying...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonetagBanner;
