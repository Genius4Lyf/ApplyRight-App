import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, Shield, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { toast } from 'sonner';

const Upgrade = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleConfirmUpgrade = async () => {
        setLoading(true);
        try {
            // Mock Payment Processing
            const res = await api.put('/users/profile', { plan: 'paid' });
            localStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
            toast.success("Welcome to ApplyRight Pro!");
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (error) {
            console.error(error);
            toast.error("Upgrade failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-grow flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-0 shadow-2xl rounded-3xl overflow-hidden bg-white max-md:flex max-md:flex-col-reverse">

                    {/* Free Plan (Current) */}
                    <div className="p-8 md:p-12 bg-slate-50 flex flex-col relative border-r border-slate-100">
                        <button
                            onClick={() => navigate(-1)}
                            className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Back</span>
                        </button>

                        <div className="mt-12 mb-8">
                            {user?.plan !== 'paid' ? (
                                <span className="inline-block px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                                    Current Plan
                                </span>
                            ) : (
                                <div className="h-[24px] mb-4"></div> // Spacer to maintain alignment
                            )}
                            <h3 className="text-3xl font-bold text-slate-900 mb-2">Free Starter</h3>
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
                    </div>

                    {/* Pro Plan (Upgrade) */}
                    <div className="p-8 md:p-12 bg-slate-900 text-white flex flex-col relative overflow-hidden">
                        {/* Background Effects */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500 rounded-full blur-[120px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>

                        {/* Decorative Grid */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>

                        <div className="relative z-10 flex-1">
                            <div className="mb-8 mt-12">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg shadow-amber-900/20 mb-4 animate-pulse">
                                    <Sparkles className="w-3 h-3" /> Recommended
                                </span>
                                <h3 className="text-3xl font-bold mb-2 flex items-center gap-3 text-white">
                                    Pro Access <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
                                </h3>
                                <p className="text-indigo-200">Unlock your full career potential.</p>
                            </div>

                            <div className="space-y-4">
                                <BenefitItem text="Unlimited Resumes & Drafts" />
                                <BenefitItem text="Endless Job Optimizations" />
                                <BenefitItem text="Access All Premium Templates" />
                                <BenefitItem text="Advanced ATS Keyword Targeting" />
                                <BenefitItem text="AI Cover Letter Generator" />
                                <BenefitItem text="Priority Support" />
                            </div>
                        </div>

                        <div className="mt-12 relative z-10">
                            <div className="flex items-end gap-2 mb-6">
                                <span className="text-5xl font-bold text-white">$19</span>
                                <span className="text-lg text-indigo-300 pb-1">/ lifetime</span>
                            </div>

                            {user?.plan === 'paid' ? (
                                <button
                                    disabled
                                    className="w-full py-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-xl font-bold text-lg flex items-center justify-center gap-2 cursor-default"
                                >
                                    <Check className="w-5 h-5" />
                                    Active Plan
                                </button>
                            ) : (
                                <button
                                    onClick={handleConfirmUpgrade}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Zap className="w-5 h-5 fill-white group-hover:animate-pulse" />
                                            Upgrade Now
                                        </>
                                    )}
                                </button>
                            )}
                            <p className="text-center text-xs text-indigo-300 mt-4">One-time payment. No hidden subscription.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// Helper Components - defined locally since not shared
const X = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
);

const LimitItem = ({ icon, text, crossed }) => (
    <div className={`flex items-center gap-3 ${crossed ? 'text-slate-400' : 'text-slate-600'}`}>
        <div className={`w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${crossed ? 'bg-slate-100' : 'bg-green-100 text-green-600'}`}>
            {React.cloneElement(icon, { size: 14 })}
        </div>
        <span className={`text-base font-medium ${crossed ? 'line-through' : ''}`}>{text}</span>
    </div>
);

const BenefitItem = ({ text }) => (
    <div className="flex items-center gap-3">
        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-500/50 shrink-0">
            <Check size={14} strokeWidth={3} />
        </div>
        <span className="font-medium text-white/90 text-base">{text}</span>
    </div>
);

export default Upgrade;
