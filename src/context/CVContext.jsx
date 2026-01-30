import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import CVService from '../services/cv.service';
import api from '../services/api';

const CVBuilderContext = createContext(null);

export const STEPS = [
    { id: 'target_job', label: 'Target Job', path: 'target-job' },
    { id: 'heading', label: 'Heading', path: 'heading' },
    { id: 'history', label: 'History', path: 'history' },
    { id: 'projects', label: 'Projects', path: 'projects' },
    { id: 'education', label: 'Education', path: 'education' },
    { id: 'skills', label: 'Skills', path: 'skills' },
    { id: 'summary', label: 'Summary', path: 'summary' },
    { id: 'finalize', label: 'Review', path: 'finalize' },
];

export const CVBuilderProvider = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams(); // Draft ID if editing

    const [user, setUser] = useState(null);
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
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch full user profile from API on mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await api.get('/users/profile');
                setUser(res.data);
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
                // Fallback to localStorage if API fails
                const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                setUser(localUser);
            }
        };
        fetchUserProfile();
    }, []);

    // Sync user data on storage events (for cross-tab updates)
    useEffect(() => {
        const handleStorageChange = () => {
            const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
            setUser(updatedUser);
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('userDataUpdated', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('userDataUpdated', handleStorageChange);
        };
    }, []);

    // Load Draft Data
    useEffect(() => {
        const loadDraft = async () => {
            if (!id || id === 'new') {
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch latest from Backend
                const backendDraft = await CVService.getDraftById(id);

                // 2. Check for Local Backup (Conflict Resolution: Prefer Backend for now to be safe, or backup if newer?)
                // For robustness, let's stick to backend as source of truth unless it fails, 
                // but we can check if local backup has a newer timestamp if we added timestamps.
                // For now, let's use the pattern of: Backend > Backup

                const backupKey = `applyright_backup_${id}`;
                const localBackup = localStorage.getItem(backupKey);

                if (localBackup) {
                    try {
                        const parsedBackup = JSON.parse(localBackup);
                        // Optional: Compare updated dates
                        // if (new Date(parsedBackup.updatedAt) > new Date(backendDraft.updatedAt)) ...
                        // For this implementation, we will merge, preferring backend ID but maybe local fields?
                        // Let's just use backend to avoid sync issues for now, or keep existing logic.
                        // Existing logic used backup. Let's stick to Backend consistency for "Robustness" phase.
                        // setCvData({ ...backendDraft, ...parsedBackup }); // OLD
                        setCvData(backendDraft); // NEW: Strict Source of Truth
                    } catch (e) {
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
            } finally {
                setLoading(false);
            }
        };

        loadDraft();
    }, [id, navigate]);

    // Handle URL / Step Sync
    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const currentPath = pathParts[pathParts.length - 1];
        const index = STEPS.findIndex(s => s.path === currentPath);

        if (index !== -1) {
            setCurrentStepIndex(index);
        } else if (id === 'new' && currentPath !== 'target-job') {
            navigate(`/cv-builder/new/target-job`, { replace: true });
        }
    }, [location.pathname, id, navigate]);


    // Helper to update local state without saving yet
    const updateCvData = useCallback((partialData) => {
        setCvData(prev => ({ ...prev, ...partialData }));
    }, []);

    // Save and Next
    const handleNext = async (stepData) => {
        // 1. Update Local State immediately
        const updatedData = { ...cvData, ...stepData };
        setCvData(updatedData);

        setSaving(true);
        try {
            const nextStepIndex = currentStepIndex + 1;
            const nextStep = STEPS[nextStepIndex];

            // 2. Save to Backend
            const payload = {
                ...updatedData,
                _id: id !== 'new' ? id : undefined,
                currentStep: nextStep ? nextStep.id : 'finalize'
            };

            const savedDraft = await CVService.saveDraft(payload);

            if (!savedDraft || !savedDraft._id) {
                throw new Error("Invalid save response");
            }

            // 3. Navigate
            if (nextStep) {
                const targetId = id === 'new' ? savedDraft._id : id;
                navigate(`/cv-builder/${targetId}/${nextStep.path}`);
            } else {
                // Determine where to go if no next step (probably finalize)
                const targetId = id === 'new' ? savedDraft._id : id;
                // verify if we are already at finalize
                if (location.pathname.includes('finalize')) {
                    // Do nothing or go to dashboard?
                }
            }

        } catch (error) {
            console.error("Save failed", error);
            toast.error("Failed to save progress.");
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        const prevStep = STEPS[currentStepIndex - 1];
        if (prevStep) {
            navigate(`/cv-builder/${id}/${prevStep.path}`);
        } else {
            navigate('/dashboard');
        }
    };

    const value = {
        cvData,
        updateCvData,
        handleNext,
        handleBack,
        saving,
        loading,
        user,
        currentStep: STEPS[currentStepIndex],
        currentStepIndex,
        steps: STEPS
    };

    return (
        <CVBuilderContext.Provider value={value}>
            {children}
        </CVBuilderContext.Provider>
    );
};

export const useCVBuilder = () => {
    const context = useContext(CVBuilderContext);
    if (!context) {
        throw new Error('useCVBuilder must be used within a CVBuilderProvider');
    }
    return context;
};
