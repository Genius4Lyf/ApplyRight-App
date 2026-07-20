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

// Turn a raw (often HTML) job description from job-search into clean plain text:
// strip markup + junk boilerplate lines, collapse whitespace. Shared by the
// prefill effect and the new-draft create path so a job-search prefill survives
// the immediate 'new' → real-id draft creation.
const cleanJobDescription = (description) => {
  if (!description) return '';
  const doc = new DOMParser().parseFromString(description, 'text/html');
  doc
    .querySelectorAll('script, style, iframe, form, button, img, svg')
    .forEach((el) => el.remove());
  const raw = doc.body.textContent || '';
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
  return raw
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
};

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

  // Session-only coach flags (skip choice, always-allow, target ack). The
  // CONVERSATION itself lives on the draft (cvData.coachChats), not here.
  const [coachState, setCoachState] = useState({});
  // Guards the coachChats autosave: the serialized value last known to be on the
  // server, so we skip redundant/echo writes and never loop.
  const lastSavedChatsRef = useRef(null);
  // The in-flight draft-create promise (or null). Lets builder-entry and the coach
  // share ONE create (no double-create), and self-clears so a later New CV recreates.
  const creatingRef = useRef(null);

  // Bumped whenever the ATS Coach applies a bullet rewrite to a role/project from
  // the side panel. History/Projects steps seed their local form state ONCE from
  // cvData and only sync local→parent, so they'd never see a panel-driven edit
  // while mounted. They watch this nonce and re-seed when it changes. See
  // applyRoleEdit below.
  const [externalEditNonce, setExternalEditNonce] = useState(0);

  // The _sortId of the entry Aria most recently WROTE bullets into (via
  // appendRoleBullets). Drives the "Aria filled this in" reveal (glow + scroll +
  // pill) on the matching History/Projects card.
  const [lastAiWriteSortId, setLastAiWriteSortId] = useState(null);

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
      const plainDescription = cleanJobDescription(description);
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

  // Load Draft Data — or, for a brand-new CV, CREATE the draft up front so it
  // has a real ObjectId immediately (Aria's coach endpoints reject a non-ObjectId
  // draftId, so chatting before the first manual save used to 400).
  useEffect(() => {
    const loadDraft = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      if (id === 'new') {
        // Create-on-entry goes through the SAME shared ensureDraft() the coach uses,
        // so entry + an eager coach click share one create (no duplicate).
        await ensureDraft();
        setLoading(false);
        return;
      }

      // Just created via ensureDraft (the [id] re-run after the 'new'→realId swap) —
      // we already have this exact draft in state, so skip the refetch flash.
      if (cvData?._id === id) {
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
        // Mark the loaded conversation as already-persisted so the coachChats
        // autosave below doesn't immediately echo it back to the server.
        lastSavedChatsRef.current = JSON.stringify(backendDraft.coachChats || {});
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

      // Auto-save currentStep to DB so "Continue Editing" resumes from here. Send ONLY
      // currentStep (a partial $set, like the title rename) — step DATA is already
      // persisted by goToStep/handleNext, and sending the full cvData would clobber
      // coachChats (the debounced autosave is its sole backend writer).
      const currentStepId = STEPS[index].id;
      if (id && id !== 'new' && cvData.currentStep !== currentStepId) {
        // Silently update currentStep in the background
        CVService.saveDraft({
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

  // Helper to update local state without saving yet. coachChats is deep-merged
  // FUNCTIONALLY (off `prev`, not a captured snapshot) so a freshly-mounted section
  // writing only its own key can't clobber another section's saved thread — the
  // lost-update that erased chats on step navigation.
  const updateCvData = useCallback((partialData) => {
    setCvData((prev) => {
      const next = { ...prev, ...partialData };
      if (partialData.coachChats) {
        next.coachChats = { ...(prev.coachChats || {}), ...partialData.coachChats };
      }
      return next;
    });
  }, []);

  // Debounced backend autosave for Aria's conversation. Unlike step data, chatting
  // never goes through handleNext/goToStep, so persist coachChats on its own timer —
  // a partial { _id, coachChats } $set that touches nothing else on the draft. The
  // ref guard skips the loaded value and any unchanged write, so there's no echo loop.
  // Skipped for a 'new' (unsaved) draft; the first real save carries it along.
  useEffect(() => {
    if (!id || id === 'new') return;
    const serialized = JSON.stringify(cvData.coachChats || {});
    if (lastSavedChatsRef.current === null) {
      lastSavedChatsRef.current = serialized; // first observation — treat as already saved
      return;
    }
    if (serialized === lastSavedChatsRef.current) return;
    const t = setTimeout(() => {
      lastSavedChatsRef.current = serialized;
      CVService.saveDraft({ _id: id, coachChats: cvData.coachChats }).catch((err) =>
        console.error('Failed to autosave Aria chats:', err)
      );
    }, 800);
    return () => clearTimeout(t);
  }, [cvData.coachChats, id]);

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
      setCvData((prev) => ({ ...updated, coachChats: prev.coachChats }));
      setExternalEditNonce((n) => n + 1);

      if (id && id !== 'new') {
        try {
          const { coachChats: _omitChats, ...base } = updated;
          await CVService.saveDraft({ ...base, _id: id });
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

  // Coach writer: set the professional summary (from Aria's in-chat draft), save, and
  // bump externalEditNonce so a mounted Summary step re-seeds its textarea. Mirrors
  // applyRoleEdit.
  const applySummary = useCallback(
    async (text) => {
      const updated = { ...cvData, professionalSummary: text };
      setCvData((prev) => ({ ...updated, coachChats: prev.coachChats }));
      setExternalEditNonce((n) => n + 1);
      if (id && id !== 'new') {
        try {
          const { coachChats: _omitChats, ...base } = updated;
          await CVService.saveDraft({ ...base, _id: id });
        } catch (error) {
          console.error('Failed to save applied summary', error);
        }
      }
    },
    [cvData, id]
  );

  // Coach writer: append Aria's chat-picked skills (case-insensitive dedupe vs what's
  // already on the CV), save, and bump externalEditNonce so a mounted Skills step
  // re-seeds. Returns { added } so the chat can confirm. Mirrors applySummary.
  const applySkills = useCallback(
    async (newSkills) => {
      const nameOf = (s) => (typeof s === 'string' ? s : s?.name || '').toLowerCase();
      const have = new Set((cvData.skills || []).map(nameOf));
      const additions = (newSkills || []).filter((s) => !have.has(nameOf(s)));
      if (!additions.length) return { added: 0 };
      const updated = { ...cvData, skills: [...(cvData.skills || []), ...additions] };
      setCvData((prev) => ({ ...updated, coachChats: prev.coachChats }));
      setExternalEditNonce((n) => n + 1);
      if (id && id !== 'new') {
        try {
          const { coachChats: _omitChats, ...base } = updated;
          await CVService.saveDraft({ ...base, _id: id });
        } catch (error) {
          console.error('Failed to save applied skills', error);
        }
      }
      return { added: additions.length };
    },
    [cvData, id]
  );

  // Reconcile a role/project's bullets against Ask-Aria's toggle record: ADD checked
  // bullets that aren't already there and REMOVE unchecked ones — by line-match, so
  // any hand-edited lines that don't match a remove target simply stay. Reads the
  // REAL entry (reports `found`), bumps externalEditNonce so a mounted step re-seeds,
  // and fires the reveal only when she ADDS.
  const applyRoleBulletDiff = useCallback(
    async (section, sortId, addTexts = [], removeTexts = []) => {
      const key = section === 'project' ? 'projects' : 'experience';
      const norm = (s) =>
        String(s)
          .replace(/^[•\-*\s]+/, '')
          .trim();
      let found = false;
      const list = (cvData[key] || []).map((e) => {
        if (e._sortId !== sortId) return e;
        found = true;
        const remove = new Set(removeTexts.map(norm));
        let lines = (e.description || '').split('\n').filter((l) => !remove.has(norm(l))); // safe: unmatched (hand-edited) lines just stay
        const present = new Set(lines.map(norm));
        addTexts.forEach((t) => {
          if (!present.has(norm(t))) lines.push(`• ${norm(t)}`);
        });
        return {
          ...e,
          description: lines
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim(),
        };
      });
      if (!found) return { ok: false, found: false };
      const updated = { ...cvData, [key]: list };
      setCvData((prev) => ({ ...updated, coachChats: prev.coachChats }));
      setExternalEditNonce((n) => n + 1);
      if (addTexts.length) setLastAiWriteSortId(sortId); // reveal only fires when she ADDS
      if (id && id !== 'new') {
        try {
          const { coachChats: _omitChats, ...base } = updated;
          await CVService.saveDraft({ ...base, _id: id });
          return { ok: true, found: true };
        } catch (err) {
          console.error('applyRoleBulletDiff save failed', err);
          return { ok: false, found: true, saveFailed: true };
        }
      }
      return { ok: true, found: true };
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

  // Actively CREATE the draft on demand and resolve to its real id — the single create
  // path shared by builder-entry (loadDraft) and the coach (which may fire the instant
  // the builder opens, before entry finishes). A promise-based in-flight guard means
  // both callers await the SAME create (no duplicate), and it self-clears so a later
  // New CV can create again. Resolves null if creation genuinely fails.
  const ensureDraft = useCallback(async () => {
    if (id && id !== 'new') return id; // already a real draft
    if (!creatingRef.current) {
      creatingRef.current = (async () => {
        const stepPath = location.pathname.split('/').pop() || 'target-job';
        const stepId = (STEPS.find((s) => s.path === stepPath) || STEPS[0]).id;
        const payload = { currentStep: stepId };
        // Fold a job-search prefill INTO the create — the prefill effect can't re-run
        // once the URL swaps off 'new'.
        const pj = location.state?.prefillJob;
        if (pj) {
          if (pj.title) payload.title = `CV for ${pj.title}${pj.company ? ` at ${pj.company}` : ''}`;
          payload.targetJob = { title: pj.title || '', description: cleanJobDescription(pj.description) };
        }
        const created = await CVService.saveDraft(payload); // no _id → backend creates it (same call as Continue)
        if (!created?._id) throw new Error('create returned no _id');
        setCvData(created);
        lastSavedChatsRef.current = JSON.stringify(created.coachChats || {});
        navigate(`/cv-builder/${created._id}/${stepPath}`, { replace: true });
        return created._id;
      })();
    }
    try {
      return await creatingRef.current;
    } catch (e) {
      if (!handleAgentPaywall(e)) {
        console.error('ensureDraft failed', e);
        toast.error("Couldn't start your CV. Try again.");
      }
      return null;
    } finally {
      creatingRef.current = null;
    }
  }, [id, location, navigate, handleAgentPaywall]);

  // Save and Next
  const handleNext = async (stepData) => {
    // 1. Update Local State immediately — preserve coachChats from the latest state
    //    (it's owned solely by the chat persist effect + debounced autosave).
    setCvData((prev) => ({ ...prev, ...stepData, coachChats: prev.coachChats }));
    const updatedData = { ...cvData, ...stepData };

    setSaving(true);
    try {
      const nextStepIndex = currentStepIndex + 1;
      const nextStep = STEPS[nextStepIndex];

      // 2. Save to Backend — omit coachChats so no full-snapshot saver writes a stale
      //    conversation; the debounced autosave is the sole backend writer for it.
      const { coachChats: _omitChats, ...base } = updatedData;
      const payload = {
        ...base,
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
    // Capture the outgoing section's live form (incl. autofill) so its completeness
    // + preview reflect it immediately, just like goToStep.
    const partial = stepDataRef.current?.();
    if (partial) setCvData((prev) => ({ ...prev, ...partial, coachChats: prev.coachChats }));
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

      // Always capture the outgoing section's LIVE form (incl. autofill the user never
      // "edited") into cvData, so its completeness + preview reflect it immediately —
      // not only after a dirty-triggered Next. The BACKEND save stays gated on stepDirty.
      if (partial) {
        setCvData((prev) => ({ ...prev, ...partial, coachChats: prev.coachChats }));
      }

      if (partial && stepDirty) {
        setSaving(true);
        try {
          const merged = { ...cvData, ...partial };
          // Omit coachChats — the debounced autosave is the sole backend writer for it.
          const { coachChats: _omitChats, ...base } = merged;
          const payload = {
            ...base,
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

  // Persist the current draft to the DB RIGHT NOW, including the active step's
  // in-progress data (pulled straight from the registered step-data getter, so it
  // reflects freshly-assigned _sortIds without waiting on the 500ms auto-sync
  // debounce). Used before "Ask Aria" focus: the build-with flow resolves the role
  // server-side by _sortId, which only exists in the DB once this save lands.
  // Best-effort + awaitable; a 'new' draft has no server row to target yet.
  const flushDraft = useCallback(async () => {
    if (!id || id === 'new') return;
    const getter = stepDataRef.current;
    const partial = getter ? getter() : null;
    const merged = partial ? { ...cvData, ...partial } : cvData;
    if (partial) setCvData((prev) => ({ ...prev, ...partial, coachChats: prev.coachChats }));
    try {
      // Omit coachChats — the debounced autosave is the sole backend writer for it.
      const { coachChats: _omitChats, ...base } = merged;
      await CVService.saveDraft({ ...base, _id: id });
    } catch (error) {
      console.error('flushDraft save failed', error);
    }
  }, [cvData, id]);

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
      // Overlay the active step's live (unsaved) form onto cvData, so the CURRENT
      // section reads accurately (incl. autofill) everywhere completeness is used —
      // before Next/goToStep has flushed it into cvData.
      const cv = liveStepData ? { ...cvData, ...liveStepData } : cvData;
      switch (stepId) {
        case 'target_job':
          return !!cv.targetJob?.title?.trim();
        case 'heading':
          return !!cv.personalInfo?.fullName;
        case 'history':
          return (cv.experience?.length || 0) > 0;
        case 'projects':
          return (cv.projects?.length || 0) > 0;
        case 'education':
          return (cv.education?.length || 0) > 0;
        case 'skills':
          return (cv.skills?.length || 0) > 0;
        case 'summary':
          return !!cv.professionalSummary?.trim();
        case 'finalize':
          return true; // Review step — nothing to fill in here.
        default:
          return false;
      }
    },
    [cvData, liveStepData]
  );

  const value = {
    cvData,
    liveCvData,
    updateCvData,
    ensureDraft,
    applyRoleEdit,
    applyRoleBulletDiff,
    applySummary,
    applySkills,
    externalEditNonce,
    lastAiWriteSortId,
    handleNext,
    handleBack,
    goToStep,
    registerStepData,
    flushDraft,
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
