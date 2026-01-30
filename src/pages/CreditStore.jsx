import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star, Crown, Gift, Share2, PlayCircle, Check, Loader, X } from 'lucide-react';
import { billingService } from '../services';

const CreditStore = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [purchaseStatus, setPurchaseStatus] = useState(null); // 'success' | 'error'

    const tiers = [
        {
            id: 'starter',
            name: 'Starter Pack',
            price: '₦1,000',
            credits: 100,
            icon: Zap,
            color: 'bg-blue-50 text-blue-600',
            popular: false,
            desc: 'Perfect for a quick CV polish.'
        },
        {
            id: 'pro',
            name: 'Pro Bundle',
            price: '₦2,000',
            credits: 220,
            icon: Star,
            color: 'bg-indigo-50 text-indigo-600',
            popular: true,
            desc: 'Best value for active job seekers.'
        },
        {
            id: 'power',
            name: 'Power User',
            price: '₦3,000',
            credits: 350,
            icon: Crown,
            color: 'bg-amber-50 text-amber-600',
            popular: false,
            desc: 'Maximum credits for best results.'
        }
    ];

    const handlePurchase = async (tier) => {
        setLoading(true);
        setPurchaseStatus(null);
        try {
            // Simulate Payment Gateway Delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Call API
            await billingService.addCredits(tier.credits, `Purchase: ${tier.name}`);

            setPurchaseStatus('success');
            // Reload page or update context (simple reload for now to refresh Navbar)
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error(error);
            setPurchaseStatus('error');
        } finally {
            setLoading(false);
        }
    };

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
                        Get credits to unlock AI-powered CV analysis, automated improvements, and custom cover letters.
                    </p>
                </div>

                {/* Pricing Tiers */}
                <div className="grid md:grid-cols-3 gap-8">
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

                            <button
                                onClick={() => handlePurchase(tier)}
                                disabled={loading}
                                className={`mt-8 w-full py-3 px-4 rounded-xl font-semibold transition-all ${tier.popular
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-xl shadow-indigo-200'
                                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                                    } flex items-center justify-center gap-2`}
                            >
                                {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Buy Now'}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Earn Free Credits */}
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold text-white">Want Free Credits?</h2>
                            <p className="text-white text-lg">
                                Short on cash? No problem. Watch a quick video or invite a friend to earn credits instantly.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 rounded-xl transition-colors backdrop-blur-sm">
                                    <PlayCircle className="w-5 h-5 text-amber-400" />
                                    <span>Watch Ad (+5 Credits)</span>
                                </button>
                                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 rounded-xl transition-colors backdrop-blur-sm">
                                    <Share2 className="w-5 h-5 text-green-400" />
                                    <span>Invite Friend (+50 Credits)</span>
                                </button>
                            </div>
                        </div>
                        <div className="hidden md:flex justify-center">
                            <Gift className="w-48 h-48 text-white/20 rotate-12" />
                        </div>
                    </div>
                </div>

            </div>

            {/* Success/Error Toast (Simple) */}
            <AnimatePresence>
                {purchaseStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${purchaseStatus === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white z-50`}
                    >
                        {purchaseStatus === 'success' ? (
                            <>
                                <Check className="w-6 h-6" />
                                <div>
                                    <p className="font-bold">Purchase Successful!</p>
                                    <p className="text-sm opacity-90">Your credits have been added.</p>
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

export default CreditStore;
