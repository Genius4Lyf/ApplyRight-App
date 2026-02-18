import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CVUploader from '../components/CVUploader';
import JobLinkInput from '../components/JobLinkInput';
import Preview from './Preview';
import api from '../services/api';
import CVService from '../services/cv.service';
import { Sparkles, LogOut, ChevronRight, ChevronLeft, CheckCircle, User, Briefcase, FileText, Plus, Upload as UploadIcon, Clock, PenTool, Trash2, Eye, X, Zap, PlayCircle } from 'lucide-react';

import Navbar from '../components/Navbar';
import FitScoreCard from '../components/FitScoreCard';
import TemplateSelector from '../components/TemplateSelector';
import DashboardTour from '../components/dashboard/DashboardTour';
import MonetagBanner from '../components/MonetagBanner';
import LoadingWithAd from '../components/LoadingWithAd';
import FeatureAnnouncementModal from '../components/FeatureAnnouncementModal';
import { toast } from 'sonner';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfileBanner, setShowProfileBanner] = useState(false);

    useEffect(() => {
        if (location.state?.showProfilePrompt) {
            setShowProfileBanner(true);
            // Clear the state without reloading to prevent persisting on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const [resume, setResume] = useState(null);
    const [job, setJob] = useState(null);
    const [application, setApplication] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [fitResult, setFitResult] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('ats-clean');
    const [showAutoAnalyzeModal, setShowAutoAnalyzeModal] = useState(false);

    // New Feature State
    const [workflowMode, setWorkflowMode] = useState(null); // 'upload' (optimize), 'create-upload' (new feature)
    const [myDrafts, setMyDrafts] = useState([]);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [draftToDelete, setDraftToDelete] = useState(null);
    const [showCreateOptions, setShowCreateOptions] = useState(false);
    const [scanSuccessDraftId, setScanSuccessDraftId] = useState(null);
    const [scanning, setScanning] = useState(false);

    // Get user from local storage
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

    useEffect(() => {
        loadDrafts();
    }, []);

    const loadDrafts = async () => {
        try {
            const drafts = await CVService.getMyDrafts();
            setMyDrafts(drafts);
        } catch (error) {
            console.error("Failed to load drafts", error);
        }
    };

    const handleDeleteClick = (e, draft) => {
        e.stopPropagation(); // Prevent card click navigation
        setDraftToDelete(draft);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await CVService.deleteDraft(draftToDelete._id);
            toast.success('CV deleted successfully');
            setDeleteModalOpen(false);
            setDraftToDelete(null);
            loadDrafts(); // Reload the list
        } catch (error) {
            console.error('Failed to delete draft', error);
            toast.error('Failed to delete CV');
        }
    };

    // Helper to update credits globally (Navbar + Local State)
    const updateCredits = (newBalance) => {
        console.log('🔄 Dashboard: Updating credits to:', newBalance);

        // 1. Dispatch event for Navbar
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: newBalance }));
        console.log('📡 Dashboard: Dispatched credit_updated event with:', newBalance);

        // 2. Update local state
        setUser(prev => ({ ...prev, credits: newBalance }));

        // 3. Update local storage (so it persists on refresh)
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        currentUser.credits = newBalance;
        localStorage.setItem('user', JSON.stringify(currentUser));
    };

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
            setApplication(res.data);
            if (res.data.job) {
                setJob(res.data.job); // NEW: Update job state if backend refined it
            }
            console.log('✅ Dashboard: Analysis response:', res.data);
            if (res.data.remainingCredits !== undefined) {
                updateCredits(res.data.remainingCredits);
            } else {
                console.warn('⚠️ Dashboard: No remainingCredits in response');
            }
            return res.data;
        } catch (error) {
            if (error.response?.status === 403 && error.response.data.code === 'INSUFFICIENT_CREDITS') {
                handleInsufficientCredits(error.response.data.required, error.response.data.current);
                // Don't re-throw if handled by modal, but we need to stop caller
                setAnalyzing(false);
                return;
            }
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

        // Step 1: Analyze if not done (This now also generates assets)
        if (!fitResult) {
            try {
                const result = await performAnalysis();

                // Only show success if we actually got data back (not aborted due to insufficient credits)
                if (result) {
                    toast.success("Analysis and Assets generated!");

                    // Scroll to the results
                    setTimeout(() => {
                        document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            } catch (err) {
                // Error handled in performAnalysis
            }
            return;
        }

        // Step 2: Re-Generate / Update (If user clicks again)
        setGenerating(true);
        try {
            const res = await api.post('/analysis/analyze', {
                resumeId: resume._id,
                jobId: job._id,
                templateId: selectedTemplate
            });
            setFitResult(res.data);
            setApplication(res.data);
            if (res.data.job) {
                setJob(res.data.job);
            }
            console.log('✅ Dashboard: Regenerate response:', res.data);
            if (res.data.remainingCredits !== undefined) {
                updateCredits(res.data.remainingCredits);
            } else {
                console.warn('⚠️ Dashboard: No remainingCredits in regenerate response');
            }
            toast.success("Assets updated successfully!");

            // Step 3: Prompt for Auto-Analysis if currently disabled
            if (!user?.settings?.autoGenerateAnalysis) {
                setShowAutoAnalyzeModal(true);
            }
        } catch (error) {
            console.error('Generation failed', error);
            if (error.response?.status === 403 && error.response.data.code === 'INSUFFICIENT_CREDITS') {
                handleInsufficientCredits(error.response.data.required, error.response.data.current);
            } else if (error.response?.status === 403) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to generate application. Please try again.');
            }
        } finally {
            setGenerating(false);
        }
    };

    // New: Insufficient Credits Modal
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [requiredCredits, setRequiredCredits] = useState(0);

    const handleInsufficientCredits = (required, current) => {
        setRequiredCredits(required);
        setShowCreditModal(true);
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
                {showProfileBanner && (
                    <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div
                            onClick={() => navigate('/profile')}
                            className="flex items-center gap-3 cursor-pointer flex-1 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-indigo-900">Enhance Your Profile</h3>
                                <p className="text-sm text-indigo-700">Complete setting up your profile to improve CV optimization.</p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowProfileBanner(false);
                            }}
                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

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

                <div className="max-w-3xl mx-auto text-center mb-12 space-y-4">
                    <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                        Tailored for your career
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                        {getStatusMessage()}
                    </h2>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        {getRecommendedAction()}
                    </p>
                </div>


                {/* Monetag Banner - Top */}
                {/* <MonetagBanner style={{ marginBottom: '2rem' }} /> */}

                {/* Workflow Selection Cards */}
                {!workflowMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Option 1: Create New */}
                        <div
                            onClick={() => setShowCreateOptions(true)}
                            className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
                            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300">
                                <PenTool className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3 relative z-10">Create a new CV</h3>
                            <p className="text-slate-500 leading-relaxed mb-6 relative z-10">
                                Build a professional resume. Start from scratch or upload an existing CV to let our AI do the heavy lifting.
                            </p>
                            <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">
                                Start Builder <ChevronRight className="w-5 h-5 ml-1" />
                            </div>
                        </div>

                        {/* Option 2: Upload Existing */}
                        <div
                            onClick={() => {
                                setResume(null);
                                setJob(null);
                                setFitResult(null);
                                setApplication(null);
                                setWorkflowMode('upload');
                            }}
                            className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300">
                                <UploadIcon className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3 relative z-10">Upload CV</h3>
                            <p className="text-slate-500 leading-relaxed mb-6 relative z-10">
                                Already have a resume? Upload it to get an instant AI analysis and fit score against your target job description.
                            </p>
                            <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform">
                                Upload PDF <ChevronRight className="w-5 h-5 ml-1" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Options Modal */}
                {showCreateOptions && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
                            <button
                                onClick={() => setShowCreateOptions(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            >
                                <LogOut className="w-5 h-5 rotate-45" />
                            </button>

                            <h3 className="text-2xl font-bold text-slate-900 mb-2 text-center">How would you like to start?</h3>
                            <p className="text-slate-500 text-center mb-8">Choose the best way to build your professional CV.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button
                                    onClick={() => navigate('/cv-builder/new')}
                                    className="flex flex-col items-center p-6 border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl transition-all group text-center"
                                >
                                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-indigo-600 shadow-sm">
                                        <Plus className="w-8 h-8" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-2">Start from Scratch</h4>
                                    <p className="text-sm text-slate-500">
                                        Use our step-by-step wizard to build a resume from the ground up.
                                    </p>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowCreateOptions(false);
                                        setResume(null);
                                        setJob(null);
                                        setFitResult(null);
                                        setApplication(null);
                                        setWorkflowMode('create-upload');
                                    }}
                                    className="flex flex-col items-center p-6 border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 rounded-xl transition-all group text-center"
                                >
                                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-emerald-600 shadow-sm">
                                        <UploadIcon className="w-8 h-8" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-2">Upload Existing CV</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        We'll scan your PDF and auto-fill the builder with your details.
                                    </p>
                                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Cost: 10 Credits</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Monetag Banner - Bottom */}
                {/* {!workflowMode && (
                    <MonetagBanner style={{ marginBottom: '2rem' }} />
                )} */}

                {/* My Drafts / Recent CVs - Show only if not in active workflow mode */}
                {!workflowMode && myDrafts.length > 0 && (
                    <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                        <div className="flex items-center gap-2 mb-6 text-slate-900">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-bold">My Recent CVs</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {myDrafts.map(draft => {
                                // Check completeness: Name, Summary, Experience, Education, Skills, and Projects
                                const isComplete =
                                    draft.personalInfo?.fullName &&
                                    draft.professionalSummary &&
                                    draft.experience?.length > 0 &&
                                    draft.education?.length > 0 &&
                                    draft.skills?.length > 0 &&
                                    draft.projects?.length > 0;

                                return (
                                    <div
                                        key={draft._id}
                                        className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {isComplete ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                                {new Date(draft.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                                            {draft.title || 'Untitled CV'}
                                        </h4>
                                        <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                                            {draft.professionalSummary || 'No summary yet...'}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div
                                                onClick={() => navigate(isComplete ? `/resume/${draft._id}` : `/cv-builder/${draft._id}`)}
                                                className={`text-xs font-semibold flex items-center group-hover:underline decoration-indigo-200 underline-offset-4 cursor-pointer ${isComplete ? 'text-emerald-600' : 'text-indigo-600'}`}
                                            >
                                                {isComplete ? (
                                                    <>Review CV <Eye className="w-3 h-3 ml-1" /></>
                                                ) : (
                                                    <>Continue Editing <ChevronRight className="w-3 h-3 ml-1" /></>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteClick(e, draft)}
                                                className="text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                                                title="Delete CV"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}



                {/* Active Upload Workflow */}
                {workflowMode === 'upload' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <button
                            onClick={() => {
                                setResume(null);
                                setJob(null);
                                setFitResult(null);
                                setApplication(null);
                                setWorkflowMode(null);
                            }}
                            className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center mb-6 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <CVUploader onUploadSuccess={setResume} />
                            <JobLinkInput onJobExtracted={setJob} />
                        </div>
                    </div>
                )}

                {/* Create from Upload Workflow */}
                {workflowMode === 'create-upload' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-2xl mx-auto">
                        <button
                            onClick={() => {
                                setResume(null);
                                setJob(null);
                                setFitResult(null);
                                setApplication(null);
                                setWorkflowMode(null);
                            }}
                            className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center mb-6 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                        </button>

                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Upload your Resume</h3>
                                <p className="text-slate-500">Upload your existing CV (PDF) and we'll convert it into our editable format.</p>
                            </div>

                            {scanning ? (
                                <div className="py-12 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                                    <h4 className="text-lg font-bold text-slate-800 animate-pulse">Scanning Document...</h4>
                                    <p className="text-slate-500 mt-2">Extracting your experience and skills</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-center pb-4">
                                        <span className="inline-block px-4 py-2 bg-amber-50 text-amber-700 font-bold rounded-full border border-amber-200">
                                            <Zap className="w-4 h-4 inline mr-1" /> Cost: 10 Credits
                                        </span>
                                    </div>
                                    <CVUploader onUploadSuccess={async (resumeData) => {
                                        setScanning(true);
                                        try {
                                            const res = await api.post('/analysis/analyze', {
                                                resumeId: resumeData._id
                                            });
                                            if (res.data.draftId) {
                                                setScanSuccessDraftId(res.data.draftId);
                                                // Sync credits
                                                if (res.data.remainingCredits !== undefined) {
                                                    updateCredits(res.data.remainingCredits);
                                                }
                                            } else {
                                                toast.error("Failed to parse resume.");
                                                setScanning(false);
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            // Handle insufficient credits specifically
                                            if (err.response?.status === 403 && err.response.data.code === 'INSUFFICIENT_CREDITS') {
                                                handleInsufficientCredits(err.response.data.required, err.response.data.current);
                                                setScanning(false);
                                                return;
                                            }
                                            toast.error("Error analyzing resume.");
                                            setScanning(false);
                                        }
                                    }} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Scan Success Modal */}
                {scanSuccessDraftId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">CV Scanned Successfully!</h3>
                            <p className="text-slate-500 mb-8">We've extracted your details. How would you like to proceed?</p>

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => navigate(`/resume/${scanSuccessDraftId}`)}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all hover:scale-[1.02] shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                                >
                                    <Eye className="w-5 h-5" /> View ATS Preview
                                </button>
                                <button
                                    onClick={() => navigate(`/cv-builder/${scanSuccessDraftId}`)}
                                    className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <PenTool className="w-5 h-5" /> Edit in Builder
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Link to Fit Analysis & Preview only show in 'upload' mode if we have results, 
                    OR if we just finished analysis. But logic below relies on 'fitResult'.
                    We only show these sections if we are in 'upload' mode OR if we have results active.
                    Ideally, if switching to 'create', we clear this state, but for now let's keep it simple.
                 */}
                {(analyzing || fitResult) && (
                    <div id="analysis-section" className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-lg font-bold text-slate-900">AI Compatibility Analysis</h3>
                            </div>
                            {job && (job.title || job.company) && (
                                <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                    For: <span className="text-slate-900 font-bold">{job.title || 'Role'}</span> {job.company && <span>at {job.company}</span>}
                                </div>
                            )}
                        </div>

                        {analyzing ? (
                            <div className="w-full h-48 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center p-8">
                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                <p className="text-slate-500 font-medium">Analyzing your profile against role requirements...</p>
                            </div>
                        ) : (
                            <FitScoreCard
                                fitScore={fitResult.fitScore}
                                fitAnalysis={fitResult.fitAnalysis}
                                actionPlan={fitResult.actionPlan}
                            />
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
                            user={user}
                            onPreview={() => {
                                console.log("Attempting navigation. App:", application);
                                if (application?._id || application?.id || application?.applicationId) {
                                    navigate(`/resume/${application._id || application.id || application.applicationId}`);
                                } else {
                                    console.error("Navigation failed: No Application ID", application);
                                    const keys = application ? Object.keys(application).join(', ') : 'null';
                                    toast.error(`Error: ID missing. Available data: ${keys.substring(0, 50)}...`);
                                }
                            }}
                            isCompact={true}
                        />
                    </div>
                )}

                {/* Preview Section (Moved Here) */}
                {application && (
                    <div id="preview-section" className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                        <Preview application={application} templateId={selectedTemplate} />
                    </div>
                )}

                {/* Final Generation Stage - Only show if in upload mode AND assets NOT generated yet */}
                {workflowMode === 'upload' && !fitResult && (
                    <div className="relative pt-8 flex flex-col items-center">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-slate-200"></div>

                        <div className="relative group">
                            {(!resume || !job) && (
                                <div className="absolute -inset-1 bg-white/40 backdrop-blur-[1px] rounded-full z-10 pointer-events-none" />
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={!resume || !job || generating || analyzing}
                                className={`
                                    relative z-20 flex items-center justify-center h-16 px-12 rounded-full font-bold text-lg shadow-xl shadow-primary/20 transition-all duration-300
                                    ${!resume || !job || generating || analyzing
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'btn-primary hover:scale-105 active:scale-95'}
                                `}
                            >
                                {generating || analyzing ? (
                                    <>
                                        <div className="w-6 h-6 border-4 border-indigo-200 border-t-white rounded-full animate-spin mr-3"></div>
                                        {analyzing ? 'Analyzing Match...' : 'Optimizing Application...'}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-3" />
                                        <span className="flex flex-col items-start leading-tight">
                                            <span>Generate Professional Assets</span>
                                            <span className="text-xs font-normal opacity-80">Cost: 20 Credits</span>
                                        </span>
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
                                {!analyzing && <><CheckCircle className="w-4 h-4" /> Ready for optimization</>}
                            </p>
                        )}
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

                {/* Delete Confirmation Modal */}
                {deleteModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-rose-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Delete CV?</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Are you sure you want to delete "{draftToDelete?.title || 'Untitled CV'}"? This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setDeleteModalOpen(false);
                                        setDraftToDelete(null);
                                    }}
                                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Loading Overlay with  Ad - Shows during CV analysis generation */}
            {generating && (
                <LoadingWithAd
                    messages={[
                        "Getting templates ready...",
                        "Analyzing your CV...",
                        "Building your professional documents...",
                        "Optimizing for ATS compatibility...",
                        "Almost done..."
                    ]}
                    showProgress={false}
                />
            )}

            {/* Insufficient Credits Modal */}
            {showCreditModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center relative">
                        <button
                            onClick={() => setShowCreditModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Zap className="w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Insufficient Credits</h3>
                        <p className="text-slate-500 mb-6">
                            You need <span className="font-bold text-slate-900">{requiredCredits} credits</span> to perform this action, but you only have <span className="font-bold text-slate-900">{user.credits || 0}</span>.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/credits')}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                            >
                                <Zap className="w-4 h-4" /> Get More Credits
                            </button>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">OR</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            <button
                                onClick={() => navigate('/credits')} // For now direct to store where ad option lives
                                className="w-full py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <PlayCircle className="w-4 h-4 text-amber-500" /> Watch Ad for Free Credits
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feature Announcement Modal */}
            <FeatureAnnouncementModal />

            {/* New User Tour */}
            <DashboardTour />
        </div>
    );
};

export default Dashboard;
