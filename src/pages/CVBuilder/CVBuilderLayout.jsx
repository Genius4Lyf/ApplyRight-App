import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import ATSGuide from '../../components/ATSGuide';
import CVService from '../../services/cv.service';
import { toast } from 'sonner';
import { ChevronRight, Save, Layout } from 'lucide-react';

const STEPS = [
    { id: 'target_job', label: 'Target Job', path: 'target-job' },
    { id: 'heading', label: 'Heading', path: 'heading' },
    { id: 'history', label: 'History', path: 'history' },
    { id: 'projects', label: 'Projects', path: 'projects' },
    { id: 'education', label: 'Education', path: 'education' },
    { id: 'skills', label: 'Skills', path: 'skills' },
    { id: 'summary', label: 'Summary', path: 'summary' },
    { id: 'finalize', label: 'Review', path: 'finalize' },
];

const CVBuilderLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams(); // Draft ID if editing

    // Get user for auto-fill - make reactive to localStorage updates
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

    // Listen for localStorage updates (e.g., when profile is updated)
    useEffect(() => {
        const handleStorageChange = () => {
            const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
            setUser(updatedUser);
        };

        // Listen for storage events (cross-tab) and custom events (same-tab)
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('userDataUpdated', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('userDataUpdated', handleStorageChange);
        };
    }, []);

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [cvData, setCvData] = useState({
        title: 'Untitled CV',
        targetJob: { title: '', description: '' },
        personalInfo: {},
        professionalSummary: '',
        experience: [],
        projects: [],
        education: [],
        skills: []
    });
    const [saving, setSaving] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // Initial Load - Check URL to set step
    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const currentPath = pathParts[pathParts.length - 1];
        const index = STEPS.findIndex(s => s.path === currentPath);

        console.log('[CVBuilder Init]', {
            pathname: location.pathname,
            pathParts,
            currentPath,
            index,
            id,
            cvData: cvData ? 'loaded' : 'missing'
        });

        if (index !== -1) {
            // Valid step path found in URL, use it
            console.log('[CVBuilder Init] Valid step found, setting index:', index);
            setCurrentStepIndex(index);
        } else if (pathParts.includes('new')) {
            // New CV - always start at first step
            console.log('[CVBuilder Init] New CV detected, navigating to target-job');
            navigate(`/cv-builder/new/target-job`, { replace: true });
        } else if (pathParts.includes('cv-builder') && !STEPS.some(s => s.path === currentPath)) {
            console.log('[CVBuilder Init] Need to navigate to a step');

            // Existing CV without a valid step in URL
            // Only use saved step position on the very first load (when currentStepIndex is still 0 and we have a saved step)
            if (cvData.currentStep && currentStepIndex === 0 && id && id !== 'new') {
                const savedStepIndex = STEPS.findIndex(s => s.id === cvData.currentStep);
                console.log('[CVBuilder Init] Attempting to restore saved step:', cvData.currentStep, 'Index:', savedStepIndex);

                if (savedStepIndex !== -1) {
                    // Navigate to the saved step
                    const targetPath = `/cv-builder/${id}/${STEPS[savedStepIndex].path}`;
                    console.log('[CVBuilder Init] Navigating to saved step:', targetPath);
                    navigate(targetPath, { replace: true });
                    return;
                }
            }

            // Fallback to first step
            if (id && id !== 'new') {
                // Wait for data load before falling back
                if (!cvData._id) {
                    console.log('[CVBuilder Init] Waiting for data load before fallback...');
                    return;
                }

                const fallbackPath = `/cv-builder/${id}/target-job`;
                console.log('[CVBuilder Init] Navigating to fallback:', fallbackPath);
                navigate(fallbackPath, { replace: true });
            } else {
                console.error('[CVBuilder Init] No valid ID for navigation!', { id, pathname: location.pathname });
            }
        }
    }, [location.pathname, navigate, id, cvData.currentStep, currentStepIndex]);

    // Load Draft Data and Restore Backup
    useEffect(() => {
        if (id && id !== 'new') {
            const loadDraft = async () => {
                try {
                    // 1. Fetch latest from Backend
                    const backendDraft = await CVService.getDraftById(id);

                    // 2. Check for Local Backup
                    const backupKey = `applyright_backup_${id}`;
                    const localBackup = localStorage.getItem(backupKey);

                    if (localBackup) {
                        try {
                            const parsedBackup = JSON.parse(localBackup);
                            // Simple check: Use backup if it looks valid
                            // Ideally we'd check timestamps, but for now assumption is local is newer/dirty
                            console.log('[CVBuilder] Restoring local backup found for ID:', id);
                            setCvData({ ...backendDraft, ...parsedBackup });
                        } catch (e) {
                            console.error("Failed to parse local backup", e);
                            setCvData(backendDraft);
                        }
                    } else {
                        setCvData(backendDraft);
                    }

                } catch (error) {
                    console.error("Error loading draft", error);
                    const status = error.response?.status;
                    if (status === 404 || status === 401) {
                        navigate('/dashboard');
                    } else {
                        toast.error("Failed to load CV data.");
                    }
                }
            };
            loadDraft();
        }
    }, [id, navigate]);

    // Auto-Backup Method
    useEffect(() => {
        if (id && id !== 'new' && cvData._id) {
            const backupKey = `applyright_backup_${id}`;
            localStorage.setItem(backupKey, JSON.stringify(cvData));
        }
    }, [cvData, id]);

    // Helper for children to sync state without persisting to DB immediately
    const updateCvData = (partialData) => {
        setCvData(prev => ({ ...prev, ...partialData }));
    };

    const handleNext = async (stepData) => {
        // Prepare updated data
        const updatedData = { ...cvData, ...stepData };

        // Force synchronous state update before navigation
        flushSync(() => {
            setCvData(updatedData);
        });

        // Auto-save to backend
        try {
            setSaving(true);
            const nextStepIndex = currentStepIndex + 1;
            const nextStep = STEPS[nextStepIndex];

            if (!nextStep) {
                console.error('[CVBuilderLayout] No next step found!');
                toast.error("Navigation error - please try again");
                return;
            }

            const savedDraft = await CVService.saveDraft({
                ...updatedData,
                _id: id !== 'new' ? id : undefined,
                currentStep: nextStep.id
            });

            // Validate save response
            if (!savedDraft || !savedDraft._id) {
                console.error('[CVBuilderLayout] Save failed - no ID returned:', savedDraft);
                toast.error("Failed to save CV. Please try again.");
                return;
            }

            // Navigate based on whether this is a new CV or existing
            const targetId = id === 'new' ? savedDraft._id : id;
            const targetPath = `/cv-builder/${targetId}/${nextStep.path}`;

            console.log('[CVBuilderLayout] Navigating to:', targetPath);
            navigate(targetPath, { replace: true });
        } catch (error) {
            console.error("[CVBuilderLayout] Save failed", error);
            toast.error("Failed to save progress. Please try again.");
        } finally {
            setSaving(false);
            // Optional: Clear backup on successful save? 
            // Better to keep it until they leave or explicitly finish, 
            // but for now we keep it to ensure safety against crashes.
        }
    };

    const handleBack = () => {
        const prevStep = STEPS[currentStepIndex - 1];
        if (prevStep) {
            // Use absolute navigation for robustness
            const targetPath = `/cv-builder/${id}/${prevStep.path}`;
            navigate(targetPath);
        } else {
            navigate('/dashboard');
        }
    };

    const currentStep = STEPS[currentStepIndex];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Progress Bar */}
                    <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-slate-900 line-clamp-1">{cvData.title}</h2>
                                <p className="text-xs md:text-sm text-slate-500">
                                    <span className="md:hidden">Step {currentStepIndex + 1} / {STEPS.length}</span>
                                    <span className="hidden md:inline">Step {currentStepIndex + 1} of {STEPS.length}: {currentStep?.label}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowGuide(!showGuide)}
                                className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${showGuide ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {showGuide ? 'Hide Guide' : 'Show Guide'}
                            </button>
                            {saving && <span className="text-xs text-indigo-600 animate-pulse flex items-center gap-1"><Save className="w-3 h-3" /> Saving...</span>}
                            <div className="hidden md:flex gap-1">
                                {STEPS.map((s, idx) => (
                                    <div
                                        key={s.id}
                                        className={`h-2 w-8 rounded-full transition-colors ${idx <= currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px] p-4 md:p-8">
                            <Outlet context={{ cvData, handleNext, handleBack, saving, user, updateCvData }} />
                        </div>
                    </div>
                </div>

                {/* Sidebar - ATS Guide */}
                <AnimatePresence mode="wait">
                    {showGuide && (
                        <>
                            {/* Mobile Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 xl:hidden"
                                onClick={() => setShowGuide(false)}
                            />

                            {/* Guide Container */}
                            <motion.div
                                initial={{ x: '100%', opacity: 0.5 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: '100%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
                                className="fixed inset-y-0 right-0 z-50 w-[90%] max-w-sm xl:static xl:w-96 xl:block border-l border-slate-200 bg-slate-50 shadow-2xl flex flex-col"
                            >
                                <div className="xl:hidden p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                                    <h3 className="font-bold text-indigo-900">ATS Best Practices</h3>
                                    <button onClick={() => setShowGuide(false)} className="p-2 bg-white rounded-full shadow-sm text-slate-500 hover:text-slate-800">
                                        <span className="sr-only">Close</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto bg-slate-50">
                                    <ATSGuide step={currentStep?.id || 'heading'} />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CVBuilderLayout;
