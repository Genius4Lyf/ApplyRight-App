import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CVUploader from '../components/CVUploader';
import JobLinkInput from '../components/JobLinkInput';
import Preview from './Preview';
import api from '../services/api';
import { Sparkles, LogOut, ChevronRight, CheckCircle, User, Briefcase } from 'lucide-react';
import Navbar from '../components/Navbar';
import FitScoreCard from '../components/FitScoreCard';
import TemplateSelector from '../components/TemplateSelector';
import { toast } from 'sonner';

const Dashboard = () => {
    const navigate = useNavigate();
    const [resume, setResume] = useState(null);
    const [job, setJob] = useState(null);
    const [application, setApplication] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [fitResult, setFitResult] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('modern');
    const [showAutoAnalyzeModal, setShowAutoAnalyzeModal] = useState(false);

    // Get user from local storage
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

    // Auto-analyze when both resume and job are available AND setting is enabled
    useEffect(() => {
        const analyzeFit = async () => {
            // Check if setting is explicitly true. Default is false (manual)
            const shouldAutoRun = user?.settings?.autoGenerateAnalysis === true;

            if (resume && job && !fitResult && shouldAutoRun) {
                performAnalysis();
            }
        };

        analyzeFit();
    }, [resume, job]);

    const performAnalysis = async () => {
        setAnalyzing(true);
        try {
            const res = await api.post('/analysis/analyze', {
                resumeId: resume._id,
                jobId: job._id
            });
            setFitResult(res.data);
            return res.data;
        } catch (error) {
            console.error("Analysis failed", error);
            throw error; // Re-throw to handle in caller
        } finally {
            setAnalyzing(false);
        }
    };

    const enableAutoAnalysis = async () => {
        try {
            const updatedSettings = { ...user.settings, autoGenerateAnalysis: true };
            const res = await api.put('/auth/profile', {
                settings: updatedSettings
            });

            // Update local state and storage
            const updatedUser = { ...user, settings: res.data.settings };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));

            toast.success("Auto-analysis enabled for future jobs!");
            setShowAutoAnalyzeModal(false);
        } catch (error) {
            console.error("Failed to update settings", error);
            toast.error("Failed to save setting");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleGenerate = async () => {
        if (!resume || !job) return;

        // Step 1: Analyze if not done
        if (!fitResult) {
            try {
                await performAnalysis();
                // We stop here to let the user see the "How it did" (Fit Score) 
                // and choose a Professional Style (Template)
                toast.success("Analysis complete. Select a style and generate.");

                // Scroll to the results
                setTimeout(() => {
                    document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } catch (err) {
                // Error handled in performAnalysis
            }
            return;
        }

        // Step 2: Generate Assets (Only if analysis is already done)
        setGenerating(true);
        try {
            const res = await api.post('/ai/generate', {
                resumeId: resume._id,
                jobId: job._id,
                templateId: selectedTemplate
            });
            setApplication(res.data);
            toast.success("Professional assets generated successfully!");

            // Step 3: Prompt for Auto-Analysis if currently disabled
            if (!user?.settings?.autoGenerateAnalysis) {
                setShowAutoAnalyzeModal(true);
            }

            // Construct URL to jump to preview
            setTimeout(() => {
                document.getElementById('preview-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error('Generation failed', error);
            if (error.response?.status === 403) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to generate application. Please try again.');
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

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 relative">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <CVUploader onUploadSuccess={setResume} />
                    <JobLinkInput onJobExtracted={setJob} />
                </div>

                {/* Fit Analysis Section */}
                {(analyzing || fitResult) && (
                    <div id="analysis-section" className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-2 mb-6">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-bold text-slate-900">AI Compatibility Analysis</h3>
                        </div>

                        {analyzing ? (
                            <div className="w-full h-48 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center p-8">
                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                <p className="text-slate-500 font-medium">Analyzing your profile against role requirements...</p>
                            </div>
                        ) : (
                            <FitScoreCard fitScore={fitResult.fitScore} fitAnalysis={fitResult.fitAnalysis} />
                        )}
                    </div>
                )}

                {/* Template Selection Section */}
                {(fitResult) && (
                    <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <div className="flex items-center gap-2 mb-6">
                            <Briefcase className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-bold text-slate-900">Choose Your Professional Style</h3>
                        </div>
                        <TemplateSelector
                            selectedTemplate={selectedTemplate}
                            onSelect={setSelectedTemplate}
                            userPlan={user.plan || 'free'}
                        />
                    </div>
                )}

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
                                    {analyzing ? 'Analyzing Match...' : 'Generating Documents...'}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-3" />
                                    {!fitResult ? "Generate Professional Assets" : "Create Application"}
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
                            {!fitResult && <><CheckCircle className="w-4 h-4" /> Ready for optimization</>}
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

                {/* Auto-Analysis Modal */}
                {showAutoAnalyzeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Enable Auto-Analysis?</h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        We can automatically analyze the compatibility between your resume and job description as soon as you upload them in the future.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowAutoAnalyzeModal(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    No, keep it manual
                                </button>
                                <button
                                    onClick={enableAutoAnalysis}
                                    className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all hover:scale-105"
                                >
                                    Yes, enable auto-analysis
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
