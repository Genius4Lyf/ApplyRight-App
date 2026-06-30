import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import CVService from '../services/cv.service';
import api from '../services/api';

const CVBuilderContext = createContext(null);

// STEPS is internal to this provider — consumers read the same array via
// `useCVBuilder().steps`. Kept unexported so React Fast Refresh treats this
// file as a pure component module.
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
    certifications: [],
    skills: [],
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  // Indices of steps the user has actually landed on this session. Drives the
  // step navigator's "visited but left empty" warning — we only nag about a
  // section once the user has been there, not on initial load.
  const [visitedSteps, setVisitedSteps] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  // True when the current step has user input that hasn't been persisted via
  // handleNext yet. Steps opt in by calling setStepDirty(true) on change and
  // setStepDirty(false) on successful submit. Drives the beforeunload warning
  // and the Exit-with-confirm flow in the layout.
  const [stepDirty, setStepDirty] = useState(false);

  // Conversation state for the ATS Coach, scoped to the current CV builder session.
  const [coachState, setCoachState] = useState({});

  // Bumped whenever the ATS Coach applies a bullet rewrite to a role/project from
  // the side panel. History/Projects steps seed their local form state ONCE from
  // cvData and only sync local→parent, so they'd never see a panel-driven edit
  // while mounted. They watch this nonce and re-seed when it changes. See
  // applyRoleEdit below.
  const [externalEditNonce, setExternalEditNonce] = useState(0);

  // Reset coach state when draft ID changes (i.e. user switches CVs or starts fresh)
  useEffect(() => {
    setCoachState({});
  }, [id]);

  // The active step registers a getter here that returns its current
  // in-progress data slice (e.g. () => ({ skills: [...] })). Each step holds
  // its own local form state, so this is how the wizard reaches in to flush
  // that state when the user jumps to another section via the step navigator.
  // null when the active step has nothing to persist (e.g. the Review step).
  const stepDataRef = useRef(null);
  // A reactive snapshot of the active step's CURRENT (unsaved) form data. Steps
  // re-register their getter on every change, so this stays live — letting the
  // coach panel + journey read what the user is typing right now, without saving
  // to the backend or touching the step components. null when nothing to persist.
  const [liveStepData, setLiveStepData] = useState(null);
  const registerStepData = useCallback((getter) => {
    stepDataRef.current = getter;
    setLiveStepData(getter ? getter() : null);
  }, []);

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

  // W1: Pre-fill job data when creating new CV from job search
  useEffect(() => {
    if (id === 'new' && location.state?.prefillJob) {
      const { title, company, description } = location.state.prefillJob;
      // Strip HTML tags and collapse whitespace for clean plain text
      let plainDescription = '';
      if (description) {
        const doc = new DOMParser().parseFromString(description, 'text/html');
        // Remove junk sections (safety tips, share links, apply buttons)
        doc
          .querySelectorAll('script, style, iframe, form, button, img, svg')
          .forEach((el) => el.remove());
        const raw = doc.body.textContent || '';
        // Lines to strip from Jobberman descriptions
        const JUNK_LINES = [
          'log in and apply',
          'easy apply',
          'important safety tips',
          'do not make any payment without confirming',
          'if you think this advert is not genuine',
          'report job',
          'share link',
          'share on whatsapp',
          'share on linkedin',
          'share on facebook',
          'share on twitter',
          'job summary',
        ];
        // Collapse whitespace, remove junk lines, clean up
        plainDescription = raw
          .split(/\n/)
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter((line) => {
            if (!line) return false;
            const lower = line.toLowerCase();
            return !JUNK_LINES.some((junk) => lower.includes(junk));
          })
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
      setCvData((prev) => ({
        ...prev,
        title: title ? `CV for ${title}${company ? ` at ${company}` : ''}` : prev.title,
        targetJob: {
          title: title || '',
          description: plainDescription,
        },
      }));
    }
  }, [id, location.state]);

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

        // Local backup reconciliation was removed in favour of strict
        // backend-as-source-of-truth — keeping a single setCvData here.
        // If we ever revive merge-with-local-newer-than-backend, this is
        // the place to re-introduce it (compare updatedAt timestamps).
        setCvData(backendDraft);
      } catch (error) {
        console.error('Error loading draft', error);
        const status = error.response?.status;
        if (status === 404 || status === 401) {
          navigate('/dashboard');
        } else {
          toast.error('Failed to load CV data.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [id, navigate]);

  // Handle URL / Step Sync
  useEffect(() => {
    // Only handle redirects if we're actually on a CV builder route
    if (!location.pathname.includes('/cv-builder')) return;

    // Wait for loading to complete before redirecting (so cvData.currentStep is available)
    if (loading) return;

    const pathParts = location.pathname.split('/');
    const currentPath = pathParts[pathParts.length - 1];
    const index = STEPS.findIndex((s) => s.path === currentPath);

    if (index !== -1) {
      setCurrentStepIndex(index);
      setVisitedSteps((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));

      // Auto-save currentStep to DB so "Continue Editing" resumes from here
      const currentStepId = STEPS[index].id;
      if (id && id !== 'new' && cvData.currentStep !== currentStepId) {
        // Silently update currentStep in the background
        CVService.saveDraft({
          ...cvData,
          _id: id,
          currentStep: currentStepId,
        }).catch((err) => console.error('Failed to update currentStep:', err));
      }
    } else {
      // If no valid step in URL, redirect to appropriate step
      if (id && id !== 'new') {
        // For existing drafts, go to saved currentStep or default to target-job
        const savedStep = cvData.currentStep || 'target_job';
        const stepToNavigate = STEPS.find((s) => s.id === savedStep) || STEPS[0];
        navigate(`/cv-builder/${id}/${stepToNavigate.path}`, { replace: true });
      } else if (id === 'new' && currentPath !== 'target-job') {
        // For new CVs, always start at target-job
        navigate(`/cv-builder/new/target-job`, { replace: true });
      }
    }
    // Including the full `cvData` here would loop: every save changes cvData,
    // which would re-fire this effect, which writes another save. We only
    // care about path/step transitions and the loaded flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, id, navigate, cvData.currentStep, loading]);

  // Helper to update local state without saving yet
  const updateCvData = useCallback((partialData) => {
    setCvData((prev) => ({ ...prev, ...partialData }));
  }, []);

  // Apply a coach-generated bullet rewrite to ONE role/project in place. The ATS
  // Coach panel calls this on "Apply": replace that entry's `description`, persist
  // immediately (so a follow-up recheck reads the new bullets server-side), and
  // bump externalEditNonce so a mounted History/Projects step re-seeds from the
  // fresh cvData. `section` is the backend's 'experience' | 'project'.
  const applyRoleEdit = useCallback(
    async (section, sortId, newDescription) => {
      const key = section === 'project' ? 'projects' : 'experience';
      const list = (cvData[key] || []).map((e) =>
        e._sortId === sortId ? { ...e, description: newDescription } : e
      );
      const updated = { ...cvData, [key]: list };
      setCvData(updated);
      setExternalEditNonce((n) => n + 1);

      if (id && id !== 'new') {
        try {
          await CVService.saveDraft({ ...updated, _id: id });
          return true;
        } catch (error) {
          console.error('Failed to save applied rewrite', error);
          toast.error('Applied to your CV, but saving failed — re-save before rechecking.');
          return false;
        }
      }
      return true;
    },
    [cvData, id]
  );

  // CV agents need an active plan to CREATE a CV — the backend returns 402
  // { code: 'NEED_AGENT_SUB' } from /cv/save. Route them to the agent plans
  // instead of a generic "save failed" toast. Returns true if it handled it.
  const handleAgentPaywall = useCallback(
    (error) => {
      if (error?.response?.status === 402 && error?.response?.data?.code === 'NEED_AGENT_SUB') {
        toast.error('An active agent plan is required to create CVs.');
        navigate('/upgrade');
        return true;
      }
      return false;
    },
    [navigate]
  );

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
        currentStep: nextStep ? nextStep.id : 'finalize',
      };

      const savedDraft = await CVService.saveDraft(payload);

      if (!savedDraft || !savedDraft._id) {
        throw new Error('Invalid save response');
      }

      // 3. Navigate. When `id === 'new'` we just got back the freshly-created
      // draft's _id from the save response, so future navigations use that.
      if (nextStep) {
        const targetId = id === 'new' ? savedDraft._id : id;
        navigate(`/cv-builder/${targetId}/${nextStep.path}`);
      }
      // No next step means we're already on finalize — stay put.
    } catch (error) {
      if (handleAgentPaywall(error)) return;
      console.error('Save failed', error);
      toast.error('Failed to save progress.');
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

  // Jump directly to any step via the step navigator. If the current step has
  // unsaved typing, flush it to the backend first (silent save) so nothing is
  // lost — fulfilling "leave the section and the auto-save is done". The
  // destination is reached even if that save fails, so the user is never stuck.
  const goToStep = useCallback(
    async (targetIndex) => {
      if (targetIndex === currentStepIndex) return;
      const target = STEPS[targetIndex];
      if (!target) return;

      let targetId = id;
      const getter = stepDataRef.current;
      const partial = getter ? getter() : null;

      if (partial && stepDirty) {
        setSaving(true);
        try {
          const merged = { ...cvData, ...partial };
          setCvData(merged);
          const payload = {
            ...merged,
            _id: id !== 'new' ? id : undefined,
            currentStep: target.id,
          };
          const savedDraft = await CVService.saveDraft(payload);
          // A brand-new draft gets its real _id back from this first save.
          if (savedDraft?._id) targetId = id === 'new' ? savedDraft._id : id;
          setStepDirty(false);
        } catch (error) {
          if (handleAgentPaywall(error)) {
            setSaving(false);
            return;
          }
          console.error('Failed to save section before jumping', error);
          toast.error('Could not save this section — jumping anyway.');
        } finally {
          setSaving(false);
        }
      }

      navigate(`/cv-builder/${targetId}/${target.path}`);
    },
    [cvData, currentStepIndex, id, navigate, stepDirty, handleAgentPaywall]
  );

  // Rename the CV. The backend save does a $set of only the fields sent, so a
  // partial { _id, title } update touches just the title and leaves every other
  // section intact. For an unsaved 'new' draft we only update locally — the new
  // title rides along on the next real save (handleNext / goToStep).
  const renameCv = useCallback(
    async (rawTitle) => {
      const title = (rawTitle || '').trim();
      if (!title || title === cvData.title) return;
      setCvData((prev) => ({ ...prev, title }));
      if (id && id !== 'new') {
        try {
          await CVService.saveDraft({ _id: id, title });
        } catch (error) {
          console.error('Rename failed', error);
          toast.error('Could not save the new name.');
        }
      }
    },
    [cvData.title, id]
  );

  // Exit the wizard. Completed steps were already persisted by handleNext on
  // each transition; this just drops in-flight typing in the current step (if
  // any) and sends the user to their CV listing where they can pick this draft
  // back up. Clears stepDirty so the beforeunload listener doesn't fire.
  const exitWizard = useCallback(() => {
    setStepDirty(false);
    // Agents return to their workspace; everyone else to their CV listing.
    navigate(user?.role === 'agent' ? '/agent' : '/my-cvs');
  }, [navigate, user]);

  // Saved CV data overlaid with the active step's live (unsaved) edits — what the
  // user actually sees on screen right now. The coach panel + journey use this so
  // they're never stale on the section being edited.
  const liveCvData = liveStepData ? { ...cvData, ...liveStepData } : cvData;

  const isStepComplete = useCallback(
    (stepId) => {
      switch (stepId) {
        case 'target_job':
          return !!cvData.targetJob?.title?.trim();
        case 'heading':
          return !!cvData.personalInfo?.fullName;
        case 'history':
          return (cvData.experience?.length || 0) > 0;
        case 'projects':
          return (cvData.projects?.length || 0) > 0;
        case 'education':
          return (cvData.education?.length || 0) > 0;
        case 'skills':
          return (cvData.skills?.length || 0) > 0;
        case 'summary':
          return !!cvData.professionalSummary?.trim();
        case 'finalize':
          return true; // Review step — nothing to fill in here.
        default:
          return false;
      }
    },
    [cvData]
  );

  const value = {
    cvData,
    liveCvData,
    updateCvData,
    applyRoleEdit,
    externalEditNonce,
    handleNext,
    handleBack,
    goToStep,
    registerStepData,
    renameCv,
    exitWizard,
    saving,
    loading,
    user,
    currentStep: STEPS[currentStepIndex],
    currentStepIndex,
    visitedSteps,
    steps: STEPS,
    stepDirty,
    setStepDirty,
    isStepComplete,
    isTailored: !!cvData.tailoredFrom,
    tailoredFrom: cvData.tailoredFrom,
    tailoredForJob: cvData.tailoredForJob,
    coachState,
    setCoachState,
  };

  return <CVBuilderContext.Provider value={value}>{children}</CVBuilderContext.Provider>;
};

// Co-located with the provider for proximity; the react-refresh rule wants
// hooks in their own file, but splitting here doesn't pay off — extracting
// the hook to a separate module would just require synchronised re-exports.
// eslint-disable-next-line react-refresh/only-export-components
export const useCVBuilder = () => {
  const context = useContext(CVBuilderContext);
  if (!context) {
    throw new Error('useCVBuilder must be used within a CVBuilderProvider');
  }
  return context;
};
