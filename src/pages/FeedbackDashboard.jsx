import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Crown, Shield, User, MessageSquare, Calendar, Loader2, Lock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import logo from '../assets/logo/applyright-icon.png';

const FeedbackDashboard = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [secretKey, setSecretKey] = useState('');
    const [promoting, setPromoting] = useState(false);

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const fetchFeedbacks = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/feedback`, config);

            if (data.success) {
                setFeedbacks(data.data);
                setIsAdmin(true);
            }
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
            if (error.response && error.response.status === 401) {
                // Not authorized - likely not admin
                setIsAdmin(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async (e) => {
        e.preventDefault();
        setPromoting(true);

        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/feedback/promote`, { secretKey }, config);

            if (data.success) {
                toast.success('Promoted to Admin successfully!');
                setIsAdmin(true);
                fetchFeedbacks(); // Reload to get data
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Promotion failed');
        } finally {
            setPromoting(false);
        }
    };

    const filteredFeedbacks = feedbacks.filter(feedback =>
        feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-slate-100 text-center"
                >
                    <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Lock className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Access Required</h2>
                    <p className="text-slate-500 mb-8">Enter the secret key to access the Feedback Dashboard.</p>

                    <form onSubmit={handlePromote} className="space-y-4">
                        <input
                            type="password"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            placeholder="Enter Secret Key"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            required
                        />
                        <button
                            type="submit"
                            disabled={promoting}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70"
                        >
                            {promoting ? 'Verifying...' : 'Unlock Dashboard'}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                            Feedback Dashboard
                        </h1>
                        <p className="text-slate-500 text-lg">
                            Insights from your users, beautifully organized.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2">
                            <span className="text-slate-500 text-sm font-medium">Total Feedback</span>
                            <span className="text-2xl font-bold text-indigo-600">{feedbacks.length}</span>
                        </div>
                        <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            <Crown className="w-5 h-5" />
                        </div>
                    </div>
                </header>

                {/* Search Bar */}
                <div className="relative max-w-xl">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="w-full pl-11 pr-4 py-4 rounded-2xl border-none shadow-lg shadow-slate-200/50 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 bg-white placeholder-slate-400 transition-all"
                        placeholder="Search feedback, users, or emails..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Feedback Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredFeedbacks.map((feedback, index) => (
                            <motion.div
                                key={feedback._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                className="group relative bg-[#F8FAFC] rounded-sm p-8 shadow-[8px_8px_0px_0px_rgba(79,70,229,0.2)] border-l-4 border-indigo-600 transition-all duration-300 transform -translate-y-1"
                            >
                                {/* Paper Texture Effect */}
                                <div className="absolute inset-0 bg-white opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

                                {/* Watermark Logo */}
                                <div className="absolute bottom-4 right-4 opacity-[0.08] transition-opacity duration-500 scale-150 pointer-events-none">
                                    <img src={logo} alt="ApplyRight" className="w-32 h-32 grayscale" />
                                </div>

                                {/* Header: User Info */}
                                <div className="relative z-10 flex items-center justify-between mb-6 border-b border-slate-100 pb-4 border-dashed">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold font-serif text-sm">
                                            {feedback.user?.firstName?.[0] || ''}{feedback.user?.lastName?.[0] || ''}
                                        </div>
                                        <div>
                                            <h3 className="text-slate-900 font-serif font-bold text-lg tracking-tight leading-none">
                                                {feedback.user?.firstName} {feedback.user?.lastName}
                                            </h3>
                                            <div className="flex items-center gap-1 text-indigo-500/80 text-xs font-medium uppercase tracking-wider mt-1">
                                                <span>Verified User</span>
                                                <Shield className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-indigo-300">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Body: Handwritten/Typewriter Vibe */}
                                <div className="relative z-10 mb-8 min-h-[80px]">
                                    <p className="text-slate-700 text-lg leading-relaxed font-serif italic">
                                        "{feedback.message}"
                                    </p>
                                </div>

                                {/* Footer: Meta Data */}
                                <div className="relative z-10 flex items-center gap-2 text-xs font-mono text-slate-400">
                                    <Calendar className="w-3 h-3 text-indigo-300" />
                                    <span>
                                        {new Date(feedback.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-indigo-200 mx-1"></span>
                                    <span className="text-indigo-400">ApplyRight Feedback</span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {filteredFeedbacks.length === 0 && (
                    <div className="text-center py-20">
                        <div className="mx-auto w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <MessageSquare className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No feedback found</h3>
                        <p className="text-slate-500">
                            {searchTerm ? "Try adjusting your search terms" : "Wait for users to share their thoughts"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackDashboard;
