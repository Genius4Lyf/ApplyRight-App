import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import CVService from '../services/cv.service';
import { newSortId } from '../lib/sortId';
import { startCvErrorMessage } from '../lib/startCvError';

// Aria Studio's state brain — a decoupled sibling of CVContext. It carries the SAME
// CV-mutation invariants (functional coachChats merge, debounced chats autosave as the
// sole backend writer, the four apply* writers, promise-guarded ensureDraft) but NONE
// of the wizard machinery: no router, no STEPS, no step registration. The Studio is a
// standalone chat surface, not a wizard — it owns whichever CV it's working on via
// `cvData`, which stays null until Phase 1 clones/chooses one.
const AriaStudioContext = createContext(null);

// The Studio has no :id in its URL, so the draft it's bound to is remembered here.
// Without this a reload would orphan the tailored copy — and its transcript, which
// lives on the draft as coachChats.studio.
const ACTIVE_KEY = 'ariaStudio:draftId';
// The pre-clone transcript — the intake conversation that exists before a draft does.
// Owned by StudioChat, but cleared here too: starting a new session must not inherit
// the previous one's unsaved intake. Kept in sync with StudioChat's LS_KEY.
const PRECLONE_KEY = 'ariaStudio:session';

export const AriaStudioProvider = ({ children }) => {
  // null until a CV is cloned (Phase 1). Every writer below is a no-op-safe read off
  // `cvData?.…` so the shell can mount before there's a document.
  const [cvData, setCvDataRaw] = useState(null);
  const [saving, setSaving] = useState(false);
  // True while the remembered draft is being fetched on mount, so the chat waits for
  // its saved thread instead of briefly rendering an empty conversation.
  const [loading, setLoading] = useState(() => !!localStorage.getItem(ACTIVE_KEY));

  // Guards the coachChats autosave: the serialized value last known to be on the
  // server, so we skip redundant/echo writes and never loop.
  const lastSavedChatsRef = useRef(null);
  // What the debounced autosave still owes the server, if its timer hasn't fired.
  // Lets a session switch flush the last turns instead of dropping them.
  const pendingChatsRef = useRef(null);
  // Bumped on every bind/unbind. StudioChat keys its whole subtree off this, so
  // switching sessions REMOUNTS the chat — no phase, coach transient or in-flight
  // build can leak from session A into session B.
  const [sessionNonce, setSessionNonce] = useState(0);
  // Which first step a brand-new session should open on ('tailor' | 'build'), or null
  // for a normal cold start. Consumed by the chat, which skips the mode chooser.
  const [pendingKind, setPendingKind] = useState(null);
  // A CV pre-selected as the SOURCE for a new tailoring — set when a build session hands
  // off to "now tailor it". { id, title }, or null.
  const [pendingSource, setPendingSource] = useState(null);
  // The in-flight draft-create promise (or null). Lets multiple callers share ONE
  // create (no double-create), and self-clears so a later create can run again.
  const creatingRef = useRef(null);
  // Same guard for build-start — see startBuild.
  const buildingRef = useRef(null);
  // Bumped by every session-changing action (loadSession/newSession/startBuild). The
  // mount-time restore below captures this at start and checks it before applying its
  // result, so a fast "New CV"/session-switch click racing an in-flight restore fetch
  // can never clobber the fresh session once that stale fetch finally resolves.
  const sessionEpochRef = useRef(0);

  // Bumped whenever a writer mutates a role/project from outside a mounted editor.
  // Consumers that seed local form state ONCE from cvData watch this and re-seed.
  const [externalEditNonce, setExternalEditNonce] = useState(0);
  // The _sortId of the entry Aria most recently WROTE bullets into — drives the
  // "Aria filled this in" reveal on the matching card.
  const [lastAiWriteSortId, setLastAiWriteSortId] = useState(null);

  // The draft this Studio session is bound to. Mirrors CVContext's `id` param, but
  // sourced from the document itself since there's no URL to read.
  const draftId = cvData?._id || null;

  // Bind the Studio to a draft: hold it in state, remember it across reloads, and mark
  // its conversation as already-persisted so the autosave below doesn't echo it back.
  const setCvData = useCallback((draft) => {
    setCvDataRaw(draft);
    // RESET the echo guard on every bind. Seeding it with the incoming draft's own
    // chats is what stops the autosave immediately re-writing what we just loaded —
    // and clearing it on unbind (null) means the next session's FIRST write is never
    // suppressed by a stale comparison against the previous session's transcript.
    lastSavedChatsRef.current = draft ? JSON.stringify(draft.coachChats || {}) : null;
    pendingChatsRef.current = null;
    try {
      if (draft?._id) localStorage.setItem(ACTIVE_KEY, draft._id);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* storage unavailable — the session just won't survive a reload */
    }
  }, []);

  // Write any debounced-but-unsent conversation NOW and await it. Called before every
  // session switch: without it, the 800ms timer is cleared by the unmounting effect and
  // the last turns the user typed are silently lost.
  //
  // DECLARATION ORDER IS LOAD-BEARING: this must stay above every hook that names it in
  // a dependency array (loadSession, newSession). Dep arrays are evaluated during
  // render, so a `const` declared lower is in its temporal dead zone and throws
  // "Cannot access 'flushChats' before initialization" — which kills the whole provider
  // and blanks the page. Referencing it inside a callback BODY would be fine (that's a
  // closure, evaluated later); the dep array is what breaks.
  const flushChats = useCallback(async () => {
    const pending = pendingChatsRef.current;
    if (!pending) return true;
    try {
      await CVService.saveDraft({ _id: pending.draftId, coachChats: pending.chats });
      if (pendingChatsRef.current?.serialized === pending.serialized) {
        pendingChatsRef.current = null;
      }
      lastSavedChatsRef.current = pending.serialized;
      return true;
    } catch (err) {
      console.error('Failed to flush Aria Studio chats before switching:', err);
      toast.error("Couldn't sync the latest Aria messages. Try switching again.");
      return false;
    }
  }, []);

  // Re-bind the remembered draft on mount. A stale/deleted id self-clears so the
  // Studio falls back to a fresh intake rather than getting stuck.
  useEffect(() => {
    const remembered = (() => {
      try {
        return localStorage.getItem(ACTIVE_KEY);
      } catch {
        return null;
      }
    })();
    if (!remembered) return;
    const myEpoch = sessionEpochRef.current;
    let alive = true;
    (async () => {
      try {
        const draft = await CVService.getDraftById(remembered);
        if (!alive || sessionEpochRef.current !== myEpoch) return;
        if (draft?._id) setCvData(draft);
        else setCvData(null);
      } catch (error) {
        console.error('Failed to restore the Aria Studio draft', error);
        if (alive && sessionEpochRef.current === myEpoch) setCvData(null);
      } finally {
        if (alive && sessionEpochRef.current === myEpoch) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [setCvData]);

  // ─── Sessions ───
  // A Studio session IS a DraftCV. Switching between them is: flush what's owed, bind
  // the new document, and force the chat to remount so nothing carries over.

  // Open an existing session. Restores its transcript (coachChats.studio) and scan
  // (studioScan) by virtue of binding the whole draft — both live ON it.
  const loadSession = useCallback(
    async (id) => {
      if (!id || id === draftId) return null;
      if (!(await flushChats())) return null;
      sessionEpochRef.current += 1;
      setLoading(true);
      try {
        const draft = await CVService.getDraftById(id);
        if (!draft?._id) throw new Error('session not found');
        setCvData(draft);
        setSessionNonce((n) => n + 1);
        return draft;
      } catch (error) {
        console.error('Failed to open that session', error);
        toast.error("Couldn't open that session.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [draftId, flushChats, setCvData]
  );

  // Start a fresh session. Unbinds the current draft and clears BOTH the remembered id
  // and the pre-clone localStorage transcript — otherwise the new session would open
  // showing the previous unsaved intake. `kind` decides which first step opens; the
  // chat reads it and skips the mode chooser entirely.
  const newSession = useCallback(
    async (kind = 'tailor', source = null) => {
      if (!(await flushChats())) return false;
      sessionEpochRef.current += 1;
      setCvData(null); // unbinds + clears ariaStudio:draftId
      try {
        localStorage.removeItem(PRECLONE_KEY);
      } catch {
        /* storage unavailable — nothing to clear */
      }
      setPendingKind(kind);
      setPendingSource(source);
      setSessionNonce((n) => n + 1);
      setLoading(false);
      return true;
    },
    [flushChats, setCvData]
  );

  // Start a BUILD session — a real, empty draft created up front rather than a local
  // placeholder. Phase 2's bullet generation resolves entries server-side by _sortId,
  // so the document has to exist before the conversation starts.
  // PROMISE-GUARDED, exactly like ensureDraft. A `useState` flag is applied
  // asynchronously, so two clicks in the same tick both read it as false and both
  // create — the guard has to be a ref to be read synchronously. Concurrent callers
  // await the SAME create; it self-clears so a later session can build again.
  const startBuild = useCallback(
    async ({ jobTitle, jobDescription, model } = {}) => {
      if (buildingRef.current) return buildingRef.current;

      buildingRef.current = (async () => {
        if (!(await flushChats())) return null;
        sessionEpochRef.current += 1;
        setLoading(true);
        try {
          const res = await CVService.studioBuildStart({ jobTitle, jobDescription, model });
          if (!res?.draft?._id) throw new Error('build-start returned no draft');
          // Bind ONLY — deliberately no sessionNonce bump.
          //
          // The nonce remounts StudioChat (it's keyed on it in AriaStudio.jsx). That's
          // right when SWITCHING sessions, but this is a continuation of the session the
          // user is already in: newSession('build') has just mounted this chat. Bumping
          // here tore the chat down mid-call, so the buildintro/buildstart markers and
          // the phase advance that follow this await were applied to an unmounted
          // component and lost — dropping the user back on the mode chooser with a draft
          // already created, where a second click made a second one. That was the
          // "two Untitled CV sessions" bug.
          setCvData(res.draft); // binds + remembers ariaStudio:draftId
          return res;
        } catch (e) {
          if (e?.response?.status === 402 && e?.response?.data?.code === 'NEED_AGENT_SUB') {
            // Surfaced to the page, which owns the router and can send them to /upgrade.
            return { paywall: true };
          }
          console.error('startBuild failed', e?.response?.status, e?.response?.data || e);
          toast.error(startCvErrorMessage(e));
          return null;
        } finally {
          setLoading(false);
        }
      })();

      try {
        return await buildingRef.current;
      } finally {
        buildingRef.current = null;
      }
    },
    [flushChats, setCvData]
  );

  // Append an empty entry with a FRESH _sortId and persist it immediately.
  //
  // The id is what makes the entry addressable: /coach/generate-bullets resolves the
  // target role server-side by _sortId, so it must exist ON THE SAVED DRAFT before Aria
  // can write anything into it. Uses the shared newSortId — the same generator the CV
  // builder's History/Projects steps use — so ids are one format everywhere.
  const appendEntry = useCallback(
    async (key, entry) => {
      const sortId = newSortId();
      const previous = cvData?.[key] || [];
      const next = [...previous, { ...entry, _sortId: sortId }];
      setCvDataRaw((prev) => ({ ...(prev || {}), [key]: next }));
      if (draftId) {
        try {
          await CVService.saveDraft({ _id: draftId, [key]: next });
        } catch (error) {
          console.error(`Failed to persist new ${key} entry`, error);
          setCvDataRaw((prev) => ({ ...(prev || {}), [key]: previous }));
          toast.error("Couldn't save that — try again.");
          return null;
        }
      }
      return sortId;
    },
    [cvData, draftId]
  );

  const addRole = useCallback(
    (fields = {}) =>
      appendEntry('experience', {
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        description: '',
        ...fields,
      }),
    [appendEntry]
  );

  const addProject = useCallback(
    (fields = {}) => appendEntry('projects', { title: '', link: '', description: '', ...fields }),
    [appendEntry]
  );

  const addEducation = useCallback(
    (fields = {}) =>
      appendEntry('education', {
        degree: '',
        school: '',
        graduationDate: '',
        description: '',
        ...fields,
      }),
    [appendEntry]
  );

  // Helper to update local state without saving yet. coachChats is deep-merged
  // FUNCTIONALLY (off `prev`, not a captured snapshot) so a freshly-mounted surface
  // writing only its own key can't clobber another's saved thread — the lost-update
  // that erased chats on navigation. This invariant is load-bearing; keep it exact.
  const updateCvData = useCallback((partialData) => {
    setCvDataRaw((prev) => {
      const next = { ...(prev || {}), ...partialData };
      if (partialData.coachChats) {
        next.coachChats = { ...(prev?.coachChats || {}), ...partialData.coachChats };
      }
      return next;
    });
  }, []);

  // Debounced backend autosave for Aria's conversation. Chatting never goes through a
  // step save, so persist coachChats on its own timer — a partial { _id, coachChats }
  // $set that touches nothing else on the draft. The ref guard skips the loaded value
  // and any unchanged write, so there's no echo loop. Inert until a real draft exists.
  useEffect(() => {
    if (!draftId) return undefined;
    const serialized = JSON.stringify(cvData?.coachChats || {});
    if (lastSavedChatsRef.current === null) {
      lastSavedChatsRef.current = serialized; // first observation — treat as already saved
      pendingChatsRef.current = null;
      return undefined;
    }
    if (serialized === lastSavedChatsRef.current) {
      pendingChatsRef.current = null;
      return undefined;
    }
    // Remember what's owed while the debounce is running, so a session switch can
    // FLUSH it instead of losing it (see flushChats).
    pendingChatsRef.current = { draftId, chats: cvData.coachChats, serialized };
    const t = setTimeout(async () => {
      try {
        await CVService.saveDraft({ _id: draftId, coachChats: cvData.coachChats });
        lastSavedChatsRef.current = serialized;
        if (pendingChatsRef.current?.serialized === serialized) pendingChatsRef.current = null;
      } catch (err) {
        // Keep the payload pending so a later debounce or session-switch flush can retry it.
        console.error('Failed to autosave Aria Studio chats:', err);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [cvData?.coachChats, draftId]);

  // Apply a coach-generated bullet rewrite to ONE role/project in place: replace that
  // entry's `description`, persist immediately (so a follow-up recheck reads the new
  // bullets server-side), and bump externalEditNonce. `section` is 'experience' | 'project'.
  const applyRoleEdit = useCallback(
    async (section, sortId, newDescription) => {
      if (!cvData) return false;
      const key = section === 'project' ? 'projects' : 'experience';
      const previous = cvData[key] || [];
      const list = previous.map((e) =>
        e._sortId === sortId ? { ...e, description: newDescription } : e
      );
      setCvDataRaw((prev) => ({ ...(prev || {}), [key]: list }));
      setExternalEditNonce((n) => n + 1);

      if (draftId) {
        try {
          await CVService.saveDraft({ _id: draftId, [key]: list });
          return true;
        } catch (error) {
          console.error('Failed to save applied rewrite', error);
          setCvDataRaw((prev) => ({ ...(prev || {}), [key]: previous }));
          toast.error("Couldn't save that rewrite. Try again.");
          return false;
        }
      }
      return true;
    },
    [cvData, draftId]
  );

  // Writer: set the professional summary (from Aria's in-chat draft) and save.
  const applySummary = useCallback(
    async (text) => {
      if (!cvData) return { ok: false };
      const previous = cvData.professionalSummary;
      setCvDataRaw((prev) => ({ ...(prev || {}), professionalSummary: text }));
      setExternalEditNonce((n) => n + 1);
      if (draftId) {
        try {
          await CVService.saveDraft({ _id: draftId, professionalSummary: text });
        } catch (error) {
          console.error('Failed to save applied summary', error);
          setCvDataRaw((prev) => ({ ...(prev || {}), professionalSummary: previous }));
          toast.error("Couldn't save that summary. Try again.");
          return { ok: false };
        }
      }
      return { ok: true };
    },
    [cvData, draftId]
  );

  // Writer: append Aria's chat-picked skills (case-insensitive dedupe vs what's already
  // on the CV) and save. Returns { added } so the chat can confirm.
  const applySkills = useCallback(
    async (newSkills) => {
      if (!cvData) return { ok: false, added: 0 };
      const nameOf = (s) => (typeof s === 'string' ? s : s?.name || '').toLowerCase();
      const previous = cvData.skills || [];
      const have = new Set(previous.map(nameOf));
      const additions = (newSkills || []).filter((s) => !have.has(nameOf(s)));
      if (!additions.length) return { ok: true, added: 0 };
      const merged = [...previous, ...additions];
      setCvDataRaw((prev) => ({ ...(prev || {}), skills: merged }));
      setExternalEditNonce((n) => n + 1);
      if (draftId) {
        try {
          await CVService.saveDraft({ _id: draftId, skills: merged });
        } catch (error) {
          console.error('Failed to save applied skills', error);
          setCvDataRaw((prev) => ({ ...(prev || {}), skills: previous }));
          toast.error("Couldn't save those skills. Try again.");
          return { ok: false, added: 0 };
        }
      }
      return { ok: true, added: additions.length };
    },
    [cvData, draftId]
  );

  // Reconcile a role/project's bullets against a toggle record: ADD checked bullets that
  // aren't already there and REMOVE unchecked ones — by line-match, so any hand-edited
  // lines that don't match a remove target simply stay. Reports `found`, and fires the
  // reveal only when she ADDS.
  const applyRoleBulletDiff = useCallback(
    async (section, sortId, addTexts = [], removeTexts = []) => {
      if (!cvData) return { ok: false, found: false };
      const key = section === 'project' ? 'projects' : 'experience';
      const previous = cvData[key] || [];
      const norm = (s) =>
        String(s)
          .replace(/^[•\-*\s]+/, '')
          .trim();
      let found = false;
      const list = previous.map((e) => {
        if (e._sortId !== sortId) return e;
        found = true;
        const remove = new Set(removeTexts.map(norm));
        const lines = (e.description || '').split('\n').filter((l) => !remove.has(norm(l))); // safe: unmatched (hand-edited) lines just stay
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
      setCvDataRaw((prev) => ({ ...(prev || {}), [key]: list }));
      setExternalEditNonce((n) => n + 1);
      if (addTexts.length) setLastAiWriteSortId(sortId); // reveal only fires when she ADDS
      if (draftId) {
        try {
          await CVService.saveDraft({ _id: draftId, [key]: list });
          return { ok: true, found: true };
        } catch (err) {
          console.error('applyRoleBulletDiff save failed', err);
          setCvDataRaw((prev) => ({ ...(prev || {}), [key]: previous }));
          toast.error("Couldn't save those bullets. Try again.");
          return { ok: false, found: true, saveFailed: true };
        }
      }
      return { ok: true, found: true };
    },
    [cvData, draftId]
  );

  // Actively CREATE the Studio's draft on demand and resolve to its real id — the single
  // create path for every caller. A promise-based in-flight guard means concurrent callers
  // await the SAME create (no duplicate), and it self-clears so a later session can create
  // again. Resolves null if creation genuinely fails.
  //
  // PHASE 1 HOOK: pass the tailored-copy payload here (source CV fields + tailoredFrom +
  // tailoredForJob) — it flows straight into the create, so the copy lands with its
  // provenance already set rather than needing a second save.
  const ensureDraft = useCallback(
    async (payload = {}) => {
      if (draftId) return draftId; // already a real draft
      if (!creatingRef.current) {
        creatingRef.current = (async () => {
          const created = await CVService.saveDraft(payload); // no _id → backend creates it
          if (!created?._id) throw new Error('create returned no _id');
          setCvData(created); // binds + remembers the draft, and seeds the autosave guard
          return created._id;
        })();
      }
      try {
        return await creatingRef.current;
      } catch (e) {
        // CV agents need an active plan to CREATE a CV (402 NEED_AGENT_SUB). Phase 0 just
        // reports it; Phase 1 can route to /upgrade from the page (which owns the router).
        if (e?.response?.status === 402 && e?.response?.data?.code === 'NEED_AGENT_SUB') {
          toast.error('An active agent plan is required to create CVs.');
        } else {
          console.error('ensureDraft failed', e?.response?.status, e?.response?.data || e);
          toast.error(startCvErrorMessage(e));
        }
        return null;
      } finally {
        creatingRef.current = null;
      }
    },
    [draftId, setCvData]
  );

  // Rename the bound CV — the Studio header's editable title. Mirrors CVContext.renameCv:
  // trim, no-op on empty or unchanged, optimistic local update, then a partial
  // { _id, title } $set. The partial deliberately OMITS coachChats so a rename can never
  // clobber the transcript — same discipline as every other writer here. Uses setCvDataRaw
  // (not setCvData, which is the draft BINDER: passing it a function would blank the
  // localStorage id and unbind the session).
  const renameCv = useCallback(
    async (rawTitle) => {
      const title = (rawTitle || '').trim();
      if (!title || title === cvData?.title) return;
      setCvDataRaw((prev) => (prev ? { ...prev, title } : prev));
      if (draftId) {
        try {
          await CVService.saveDraft({ _id: draftId, title });
        } catch (error) {
          console.error('Rename failed', error);
          toast.error('Could not save the new name.');
        }
      }
    },
    [cvData?.title, draftId]
  );

  const value = {
    cvData,
    setCvData,
    draftId,
    updateCvData,
    renameCv,
    ensureDraft,
    applyRoleEdit,
    applyRoleBulletDiff,
    applySummary,
    applySkills,
    externalEditNonce,
    lastAiWriteSortId,
    saving,
    setSaving,
    loading,
    // Sessions
    loadSession,
    newSession,
    startBuild,
    addRole,
    addProject,
    addEducation,
    flushChats,
    sessionNonce,
    pendingKind,
    setPendingKind,
    pendingSource,
    setPendingSource,
  };

  return <AriaStudioContext.Provider value={value}>{children}</AriaStudioContext.Provider>;
};

// Co-located with the provider for proximity, mirroring CVContext — extracting the hook
// to its own module would just require synchronised re-exports.
// eslint-disable-next-line react-refresh/only-export-components
export const useAriaStudio = () => {
  const context = useContext(AriaStudioContext);
  if (!context) {
    throw new Error('useAriaStudio must be used within an AriaStudioProvider');
  }
  return context;
};
