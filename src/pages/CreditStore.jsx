import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star, Crown, Gift, Share2, PlayCircle, Check, Loader, X, Clock } from 'lucide-react';
import { billingService } from '../services';
import AdPlayer from '../components/AdPlayer';
import { usePaystackPayment } from 'react-paystack';

const CreditStore = () => {
    const navigate = useNavigate();
    const [loadingId, setLoadingId] = useState(null);
    const [purchaseStatus, setPurchaseStatus] = useState(null); // 'success' | 'error'

    // Ad State
    const [showAdPlayer, setShowAdPlayer] = useState(false);
    const [adStats, setAdStats] = useState({ watchCount: 0, maxDaily: 999, lastWatch: null, streak: 0 });
    const [showReward, setShowReward] = useState(false);
    const [rewardMessage, setRewardMessage] = useState('');

    // Referral State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [referralCode, setReferralCode] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [loadingCode, setLoadingCode] = useState(true);

    React.useEffect(() => {
        const fetchAdStats = async () => {
            try {
                const stats = await billingService.getAdStats();
                setAdStats(stats);
            } catch (error) {
                console.error("Failed to fetch ad stats", error);
            }
        };
        fetchAdStats();

        // Fetch user profile to get referral code from backend
        const fetchReferralCode = async () => {
            try {
                setLoadingCode(true);
                // Get fresh user data from localStorage (updated on login)
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (storedUser.referralCode) {
                    setReferralCode(storedUser.referralCode);
                }
                setLoadingCode(false);
            } catch (e) {
                console.error(e);
                setLoadingCode(false);
            }
        };
        fetchReferralCode();
    }, []);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(referralCode);
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/register?ref=${referralCode}`;
        navigator.clipboard.writeText(link);
        setCopySuccess('Link Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
    };

    const handleAdSuccess = async () => {
        try {
            const result = await billingService.watchAd();

            // Dispatch update event for Navbar
            window.dispatchEvent(new CustomEvent('credit_updated', { detail: result.credits }));

            setAdStats(prev => ({
                ...prev,
                watchCount: result.watchCount,
                streak: result.streak
            }));

            setRewardMessage(result.streakMessage || '');
            setShowAdPlayer(false);
            setShowReward(true);
            setTimeout(() => {
                setShowReward(false);
                setRewardMessage('');
            }, 4000);
        } catch (error) {
            console.error("Ad reward failed", error);
            alert("Failed to claim reward. Please try again.");
            setShowAdPlayer(false);
        }
    };

    const tiers = [
        {
            id: 1,
            name: 'Starter Pack',
            price: '₦500',
            credits: 20,
            amountKobo: 50000,
            icon: Zap,
            color: 'bg-blue-50 text-blue-600',
            popular: false,
            desc: 'Perfect for a quick resume polish and check.'
        },
        {
            id: 2,
            name: 'Pro Bundle',
            price: '₦1,000',
            credits: 50,
            amountKobo: 100000,
            icon: Star,
            color: 'bg-purple-50 text-purple-600',
            popular: true,
            desc: 'Best value for serious job seekers.'
        },
        {
            id: 3,
            name: 'Career Max',
            price: '₦2,000',
            credits: 120,
            amountKobo: 200000,
            icon: Crown,
            color: 'bg-amber-50 text-amber-600',
            popular: false,
            desc: 'Maximum credits for best results.'
        }
    ];

    // Get user email usage lazy initializer to ensure it's available on first render
    const [userEmail] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            return stored.email || '';
        } catch (e) {
            return '';
        }
    });

    // Paystack Config Helper
    const getPaystackConfig = (tier) => ({
        reference: (new Date()).getTime().toString() + '_' + tier.id,
        email: userEmail,
        amount: tier.amountKobo,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        currency: 'NGN',
        metadata: {
            credits: tier.credits,
            custom_fields: []
        }
    });

    const handlePaystackSuccess = useCallback(async (reference) => {
        setPurchaseStatus(null);
        try {
            await billingService.verifyPayment(reference.reference);
            setPurchaseStatus('success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error(error);
            setPurchaseStatus('error');
            setLoadingId(null);
        }
    }, []);

    const handlePaystackClose = useCallback(() => {
        console.log('Payment closed');
        setPurchaseStatus('cancelled');
        setLoadingId(null);
        setTimeout(() => setPurchaseStatus(null), 3000);
    }, []);

    // Internal Buy Button Component (Moved logic to render directly or external component)
    // To avoid re-mounting issues, we will render the button logic directly in the map or use a stable component.
    // For simplicity and stability, using the external helper defined below.


    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative">
            {/* Close Button */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                title="Go Back"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="max-w-5xl mx-auto space-y-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        Power Up Your Career Search
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Earn free credits to unlock AI-powered CV analysis, automated improvements, and custom cover letters.
                    </p>
                </div>

                {/* Pricing Tiers - COMMENTED OUT */}
                {/* <div className="grid md:grid-cols-3 gap-8">
                    {tiers.map((tier) => (
                        <div key={tier.id} className={`relative bg-white rounded-2xl shadow-sm border ${tier.popular ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'} p-8 flex flex-col hover:shadow-lg transition-shadow duration-300`}>
                            {tier.popular && (
                                <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md transform rotate-3">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className={`w-12 h-12 rounded-xl ${tier.color} flex items-center justify-center mb-6`}>
                                <tier.icon className="w-6 h-6" />
                            </div>

                            <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-slate-900">{tier.price}</span>
                                <span className="text-sm text-slate-500">/ one-time</span>
                            </div>
                            <p className="mt-4 text-sm text-slate-600">{tier.desc}</p>

                            <div className="mt-6 space-y-3 flex-1">
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span className="font-bold">{tier.credits} Credits</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span>Instant Access</span>
                                </div>
                            </div>

                            <BuyButton
                                tier={tier}
                                userEmail={userEmail}
                                loadingId={loadingId}
                                setLoadingId={setLoadingId}
                                onSuccess={handlePaystackSuccess}
                                onClose={handlePaystackClose}
                                className={`mt-8 w-full py-3 px-4 rounded-xl font-semibold transition-all ${tier.popular
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-xl shadow-indigo-200'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                                    } flex items-center justify-center gap-2`}
                            >
                                Buy Now
                            </BuyButton>
                        </div>
                    ))}
                </div> */}

                {/* Earn Free Credits */}
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                    <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">Want Free Credits?</h2>
                                <p className="text-indigo-200 text-lg">
                                    Short on cash? Watch a quick video to power up your search.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4 max-w-sm">
                                <button
                                    onClick={() => setShowAdPlayer(true)}
                                    className="flex items-center gap-3 px-6 py-4 rounded-xl transition-all border bg-white/10 hover:bg-white/20 border-white/20 hover:scale-105 backdrop-blur-sm shadow-xl"
                                >
                                    <div className="p-2 rounded-full bg-amber-500/20 text-amber-400">
                                        <PlayCircle className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold">Watch Ad (+5 Credits)</div>
                                        {adStats.streak > 0 && (
                                            <div className="text-xs opacity-70">
                                                <span className="bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                                    🔥 {adStats.streak} Day Streak
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </button>

                                {/* Streak Bonus Hint */}
                                <div className="text-xs text-indigo-200/60 text-center -mt-2 px-2">
                                    💡 Watch daily to build a streak and get bonus credits on day 3!
                                </div>

                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="flex items-center gap-3 px-6 py-4 rounded-xl transition-all border bg-white/10 hover:bg-white/20 border-white/20 hover:scale-105 backdrop-blur-sm shadow-xl"
                                >
                                    <div className="p-2 rounded-full bg-green-500/20 text-green-400">
                                        <Share2 className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold">Invite Friend (+10)</div>
                                        <div className="text-xs opacity-70">
                                            You earn 10 credits per friend
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="hidden md:flex justify-center relative">
                            {/* 3D Gift Icon */}
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Gift className="w-48 h-48 text-white/20" />
                            </motion.div>

                            {/* Floating Coins Animation (for decoration) */}
                            <motion.div
                                animate={{ y: [0, -20, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute top-0 right-10"
                            >
                                <div className="w-12 h-12 rounded-full bg-yellow-400/20 blur-md"></div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Ad Player Modal */}
                {showAdPlayer && (
                    <AdPlayer
                        onComplete={handleAdSuccess}
                        onClose={() => setShowAdPlayer(false)}
                    />
                )}

                {/* Reward Celebration Overlay */}
                <AnimatePresence>
                    {showReward && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none"
                        >
                            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center text-center">
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", bounce: 0.5 }}
                                    className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-yellow-400/50"
                                >
                                    <Zap className="w-12 h-12 text-white fill-white" />
                                </motion.div>
                                <h2 className="text-4xl font-black text-white drop-shadow-lg mb-2">+5 Credits!</h2>
                                {rewardMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-orange-500 text-white px-3 py-1 rounded-full font-bold text-sm mb-2 shadow-lg"
                                    >
                                        {rewardMessage}
                                    </motion.div>
                                )}
                                <p className="text-white/80 font-medium">Reward Claimed Successfully</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

            {/* Invite Friend Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowInviteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>

                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <Share2 className="w-8 h-8 text-green-600" />
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">Invite Friends & Earn</h3>
                                    <p className="text-slate-600 mt-2">
                                        Share your code with friends. When they sign up, <b>you get</b> <span className="text-green-600 font-bold">10 Credits</span>!
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {/* Referral Code */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-2">YOUR REFERRAL CODE</label>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                                            <div className="font-mono text-xl font-bold text-slate-800 tracking-wider">
                                                {loadingCode ? 'LOADING...' : referralCode || 'ERROR'}
                                            </div>
                                            <button
                                                onClick={handleCopyCode}
                                                disabled={loadingCode || !referralCode}
                                                className={`${copySuccess === 'Copied!' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'} px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {copySuccess === 'Copied!' ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Share Link */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-2">OR SHARE THIS LINK</label>
                                        <button
                                            onClick={handleCopyLink}
                                            disabled={loadingCode || !referralCode}
                                            className="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-4 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="text-sm text-indigo-600 font-medium truncate">
                                                {loadingCode ? 'Loading...' : `${window.location.origin}/register?ref=${referralCode}`}
                                            </div>
                                            <div className={`${copySuccess === 'Link Copied!' ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white'} px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap`}>
                                                {copySuccess === 'Link Copied!' ? '✓ Copied' : 'Copy Link'}
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-400">
                                    Credits are valid for CV analysis and optimizations.
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success/Error Toast (Simple) */}
            <AnimatePresence>
                {purchaseStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${purchaseStatus === 'success' ? 'bg-green-600' :
                            purchaseStatus === 'cancelled' ? 'bg-slate-700' : 'bg-red-600'
                            } text-white z-50`}
                    >
                        {purchaseStatus === 'success' ? (
                            <>
                                <Check className="w-6 h-6" />
                                <div>
                                    <p className="font-bold">Purchase Successful!</p>
                                    <p className="text-sm opacity-90">Your credits have been added.</p>
                                </div>
                            </>
                        ) : purchaseStatus === 'cancelled' ? (
                            <>
                                <X className="w-6 h-6" />
                                <div>
                                    <p className="font-bold">Purchase Cancelled</p>
                                    <p className="text-sm opacity-90">Please try again.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <X className="w-6 h-6" />
                                <div>
                                    <p className="font-bold">Purchase Failed</p>
                                    <p className="text-sm opacity-90">Please try again.</p>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Extracted BuyButton Component to prevent re-mounts on state change
const BuyButton = ({ tier, userEmail, loadingId, setLoadingId, onSuccess, onClose, children, className }) => {
    // Generate config with useMemo to keep it stable unless dependencies change
    const config = React.useMemo(() => {
        // Generate unique reference only when tier changes
        const timestamp = Date.now();
        return {
            reference: `${timestamp}_${tier.id}`,
            email: userEmail,
            amount: tier.amountKobo,
            publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
            currency: 'NGN',
            metadata: {
                credits: tier.credits,
                custom_fields: []
            },
            onSuccess: (ref) => onSuccess(ref),
            onClose: () => onClose()
        };
    }, [tier.id, tier.amountKobo, tier.credits, userEmail, onSuccess, onClose]);

    const initializePayment = usePaystackPayment(config);
    const isCurrentLoading = loadingId === tier.id;

    // Debug logging
    if (!config.publicKey) console.error("Missing Paystack Public Key");

    return (
        <button
            onClick={() => {
                if (!userEmail) {
                    alert("Please log in to purchase credits.");
                    return;
                }
                if (!config.publicKey) {
                    alert("Configuration Error: Missing API Key. Please restart developer server.");
                    return;
                }

                // Directly initialize payment without setting loading state first
                // This prevents React re-renders from interfering with the Paystack script
                initializePayment(
                    (reference) => {
                        setLoadingId(tier.id); // Start loading only after success for verification
                        onSuccess(reference);
                    },
                    onClose
                );
            }}
            className={className}
            disabled={loadingId !== null}
        >
            {isCurrentLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                </span>
            ) : (
                children
            )}
        </button>
    );
};

export default CreditStore;
