import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Crown, Shield, User, MessageSquare, Calendar, Loader2, Lock, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import FeedbackCard from '../components/FeedbackCard';
import AdminLayout from '../components/Admin/AdminLayout';


const FeedbackDashboard = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
            }
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
            toast.error("Failed to load feedback");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFeature = async (feedbackId) => {
        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/feedback/${feedbackId}/feature`, {}, config);

            if (data.success) {
                // Update local state
                setFeedbacks(prev => prev.map(f =>
                    f._id === feedbackId ? { ...f, isFeatured: data.data.isFeatured } : f
                ));
                toast.success(data.data.isFeatured ? 'Feedback featured!' : 'Feedback unfeatured');
            }
        } catch (error) {
            console.error('Toggle feature error:', error);
            toast.error(error.response?.data?.error || 'Failed to update status');
        }
    };

    const filteredFeedbacks = feedbacks.filter(feedback =>
        feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Feedback Dashboard</h1>
                    <p className="text-slate-500">Insights from your users.</p>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2 text-sm">
                        <span className="text-slate-500 font-medium">Total:</span>
                        <span className="font-bold text-indigo-600">{feedbacks.length}</span>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search feedback..."
                            className="pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <>
                    {/* Feedback Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                        <AnimatePresence>
                            {filteredFeedbacks.map((feedback, index) => (
                                <FeedbackCard
                                    key={feedback._id}
                                    feedback={feedback}
                                    index={index}
                                    isAdmin={true}
                                    onToggleFeature={handleToggleFeature}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {filteredFeedbacks.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                            <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No feedback found</h3>
                            <p className="text-sm text-slate-500">
                                {searchTerm ? "Try adjusting your search terms" : "Wait for users to share their thoughts"}
                            </p>
                        </div>
                    )}
                </>
            )}
        </AdminLayout>
    );
};

export default FeedbackDashboard;
