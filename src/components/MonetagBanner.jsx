import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Zap, CheckCircle, Loader } from 'lucide-react';
import { billingService } from '../services';

const MonetagBanner = ({
    title = "Sponsored Offer",
    subtitle = "Check out this special offer from our partners.",
    buttonText = "View Offer",
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
                className="group cursor-pointer bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 flex items-center justify-between shadow-md hover:shadow-lg transition-all border border-slate-700"
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

    // Default Variant (Card)
    return (
        <div
            onClick={handleClick}
            className={`group cursor-pointer bg-white border-2 hover:border-indigo-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden ${status === 'success' ? 'border-green-200 bg-green-50' : 'border-slate-100'}`}
            style={style}
        >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-2xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>

            {/* Success Overlay / State */}
            {status === 'verifying' && (
                <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] z-20 flex items-center justify-center">
                    <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 text-sm font-bold text-slate-700">
                        <Loader className="w-4 h-4 animate-spin text-indigo-600" />
                        Verifying ({timeLeft}s)...
                    </div>
                </div>
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className={`p-3 rounded-xl transition-all ${status === 'success' ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 group-hover:scale-110'}`}>
                        {status === 'success' ? <CheckCircle className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                    </div>
                    <div>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                            <h3 className="font-bold text-slate-800 group-hover:text-indigo-900 transition-colors">
                                {status === 'success' ? 'Reward Claimed!' : title}
                            </h3>
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Ad</span>
                        </div>
                        <p className="text-sm text-slate-500 max-w-md">
                            {status === 'success' ? '2 Credits have been added to your account.' : subtitle}
                        </p>
                    </div>
                </div>

                <button className={`whitespace-nowrap px-6 py-2.5 text-sm font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2 ${status === 'success' ? 'bg-green-500 text-white shadow-green-200' : 'bg-slate-900 text-white group-hover:bg-indigo-600 shadow-slate-200 group-hover:shadow-indigo-200'}`}>
                    {status === 'success' ? 'View Again' : buttonText} <ExternalLink className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default MonetagBanner;
