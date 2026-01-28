import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
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

    // Get user for auto-fill
    const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

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

    // Load Draft Data if ID is present
    useEffect(() => {
        if (id && id !== 'new') {
            const loadDraft = async () => {
                try {
                    const draft = await CVService.getDraftById(id);
                    setCvData(draft);
                } catch (error) {
                    console.error("Error loading draft", error);
                    const status = error.response?.status;

                    if (status === 404) {
                        toast.error("CV not found");
                        navigate('/dashboard');
                    } else if (status === 401) {
                        toast.error("Unauthorized access");
                        navigate('/dashboard');
                    } else {
                        toast.error("Failed to load CV data. Please refresh.");
                        // Don't redirect on other errors, let user retry
                    }
                }
            };
            loadDraft();
        }
    }, [id, navigate]);

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
                                <h2 className="text-xl font-bold text-slate-900">{cvData.title}</h2>
                                <p className="text-sm text-slate-500">Step {currentStepIndex + 1} of {STEPS.length}: {currentStep?.label}</p>
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
                            <div className="flex gap-1">
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
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px] p-8">
                            <Outlet context={{ cvData, handleNext, handleBack, saving, user }} />
                        </div>
                    </div>
                </div>

                {/* Sidebar - ATS Guide */}
                {showGuide && (
                    <div className="w-96 hidden xl:block border-l border-slate-200 bg-white shadow-xl relative z-10 animate-in slide-in-from-right duration-300">
                        <ATSGuide step={currentStep?.id || 'heading'} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CVBuilderLayout;
