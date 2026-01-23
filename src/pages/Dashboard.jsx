import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CVUploader from '../components/CVUploader';
import JobLinkInput from '../components/JobLinkInput';
import Preview from './Preview';
import api from '../services/api';
import { Sparkles, LogOut, ChevronRight, CheckCircle, User } from 'lucide-react';
import Navbar from '../components/Navbar';

const Dashboard = () => {
    const navigate = useNavigate();
    const [resume, setResume] = useState(null);
    const [job, setJob] = useState(null);
    const [application, setApplication] = useState(null);
    const [generating, setGenerating] = useState(false);

    // Get user from local storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleGenerate = async () => {
        if (!resume || !job) return;
        setGenerating(true);
        try {
            const res = await api.post('/ai/generate', {
                resumeId: resume._id,
                jobId: job._id,
            });
            setApplication(res.data);
            // Construct URL to jump to preview
            setTimeout(() => {
                document.getElementById('preview-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error('Generation failed', error);
            if (error.response?.status === 403) {
                alert(error.response.data.message); // Simple alert for now, can be upgraded to modal
            } else {
                alert('Failed to generate application. Please try again.');
            }
        } finally {
            setGenerating(false);
        }
    };

    const getStatusMessage = () => {
        if (!user.firstName) return "Optimize Your Professional Presence";
        return `Welcome back, ${user.firstName}. Let's get you hired.`;
    };

    const getRecommendedAction = () => {
        if (!user.currentStatus) return "Precision engineering for your job applications. Upload your credentials and the target role to begin the optimization process.";

        const statusMap = {
            'student': `As a student in ${user.education?.discipline || 'your field'}, focusing on internships and entry-level roles is key.`,
            'graduate': `Congratulations on graduating! Now let's translate that ${user.education?.discipline} degree into a career.`,
            'professional': `Ready for the next step in your career? Let's highlight your experience.`,
            'other': "Let's align your unique background with your target role."
        };
        return statusMap[user.currentStatus] || statusMap['other'];
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12">
                {!user.onboardingCompleted && (
                    <div
                        onClick={() => navigate('/onboarding')}
                        className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-indigo-900">Complete your profile</h3>
                                <p className="text-sm text-indigo-700">Tell us about your goals to get personalized recommendations.</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                )}

                <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
                    <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                        Tailored for your career
                    </div>
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        {getStatusMessage()}
                    </h2>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        {getRecommendedAction()}
                    </p>
                </div>

                {/* Main Workflow Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                    <CVUploader onUploadSuccess={setResume} />
                    <JobLinkInput onJobExtracted={setJob} />
                </div>

                {/* Final Generation Stage */}
                <div className="relative pt-8 flex flex-col items-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-slate-200"></div>

                    <div className="relative group">
                        {(!resume || !job) && (
                            <div className="absolute -inset-1 bg-white/40 backdrop-blur-[1px] rounded-full z-10 pointer-events-none" />
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={!resume || !job || generating}
                            className={`
                                relative z-20 flex items-center justify-center h-16 px-12 rounded-full font-bold text-lg shadow-xl shadow-primary/20 transition-all duration-300
                                ${!resume || !job
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'btn-primary hover:scale-105 active:scale-95'}
                            `}
                        >
                            {generating ? (
                                <>
                                    <div className="w-6 h-6 border-4 border-indigo-200 border-t-white rounded-full animate-spin mr-3"></div>
                                    Generating Documents...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-3" />
                                    Generate Professional Assets
                                    <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    {!resume || !job ? (
                        <div className="mt-8 flex items-center gap-3 text-slate-400 font-medium bg-slate-50 px-6 py-3 rounded-full border border-slate-200">
                            <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px]">!</div>
                            Please complete both steps to proceed
                        </div>
                    ) : (
                        <p className="mt-8 text-indigo-600 font-medium animate-pulse flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Ready for optimization
                        </p>
                    )}
                </div>

                {/* Preview Section */}
                {application && (
                    <div id="preview-section" className="mt-24 pb-24 border-t border-slate-200 pt-24">
                        <div className="max-w-4xl mx-auto">
                            <Preview application={application} />
                        </div>
                    </div>
                )}
            </main>

            <footer className="mt-auto border-t border-slate-200 bg-white py-8">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-semibold uppercase tracking-widest">ApplyRight</span>
                    </div>
                    <p className="text-sm text-slate-500">
                        &copy; 2026 Professional Career Suite. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
