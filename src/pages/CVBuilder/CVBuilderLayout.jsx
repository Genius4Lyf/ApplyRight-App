import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ATSGuide from '../../components/ATSGuide';
import CVService from '../../services/cv.service';
import { toast } from 'sonner';
import { ChevronRight, Save, Layout } from 'lucide-react';

const STEPS = [
    { id: 'target_job', label: 'Target Job', path: 'target-job' },
    { id: 'heading', label: 'Heading', path: 'heading' },
    { id: 'summary', label: 'Summary', path: 'summary' },
    { id: 'history', label: 'History', path: 'history' },
    { id: 'projects', label: 'Projects', path: 'projects' },
    { id: 'education', label: 'Education', path: 'education' },
    { id: 'skills', label: 'Skills', path: 'skills' },
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

    // Initial Load - Check URL to set step
    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const currentPath = pathParts[pathParts.length - 1];
        const index = STEPS.findIndex(s => s.path === currentPath);
        if (index !== -1) {
            setCurrentStepIndex(index);
        } else if (pathParts.includes('new')) {
            // Default to first step if just /new
            navigate(`target-job`, { replace: true });
        }
    }, [location, navigate]);

    // Load Draft Data if ID is present
    useEffect(() => {
        if (id && id !== 'new') {
            const loadDraft = async () => {
                try {
                    const draft = await CVService.getDraftById(id);
                    setCvData(draft);
                } catch (error) {
                    console.error("Error loading draft", error);
                    toast.error("Failed to load draft");
                    navigate('/dashboard');
                }
            };
            loadDraft();
        }
    }, [id, navigate]);

    const handleNext = async (stepData) => {
        // 1. Update local state
        const updatedData = { ...cvData, ...stepData };
        setCvData(updatedData);

        // 2. Auto-save to backend
        try {
            setSaving(true);
            const savedDraft = await CVService.saveDraft({
                ...updatedData,
                _id: id !== 'new' ? id : undefined
            });

            // If new, replace URL with ID
            if (id === 'new' && savedDraft._id) {
                // Navigate to next step but with ID now
                const nextStep = STEPS[currentStepIndex + 1];
                if (nextStep) {
                    navigate(`/cv-builder/${savedDraft._id}/${nextStep.path}`, { replace: true });
                }
            } else {
                // Normal navigation
                const nextStep = STEPS[currentStepIndex + 1];
                if (nextStep) {
                    navigate(nextStep.path);
                }
            }
        } catch (error) {
            console.error("Save failed", error);
            toast.error("Failed to save progress");
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        const prevStep = STEPS[currentStepIndex - 1];
        if (prevStep) {
            navigate(prevStep.path);
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
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{cvData.title}</h2>
                            <p className="text-sm text-slate-500">Step {currentStepIndex + 1} of {STEPS.length}: {currentStep?.label}</p>
                        </div>
                        <div className="flex items-center gap-4">
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
                <div className="w-96 hidden xl:block border-l border-slate-200 bg-white shadow-xl relative z-10">
                    <ATSGuide step={currentStep?.id || 'heading'} />
                </div>
            </div>
        </div>
    );
};

export default CVBuilderLayout;
