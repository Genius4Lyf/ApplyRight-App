import React, { useState, useRef, useEffect } from 'react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { bubbleAnim } from '../../lib/ariaMotion';
import AriaTypewriter from '../cv/AriaTypewriter';
import { costForActionTier, tierOf } from '../../lib/models';
import { isUnnamedCv, firstNameFrom } from '../../lib/cvTitle';
import {
  derivePhase,
  phaseForNewSession,
  openFix,
  buildProgress,
  resolvePinnedEntry,
  pinnedSortId,
  pinnedSection,
  resolveProjectType,
  SECTION_LIST,
  PROJECT_TYPES,
  roleStage,
  entryProgress,
  bulletCount,
  FIX_MODE,
  ENTRY_SOURCE,
  sectionLabel,
  sectionNote,
  hasSubstance,
  scoreDelta,
  scoreSignature,
  isDismissable,
  finishableNow,
} from '../../lib/studioFlow';
import { STUDIO_PROJECT_IDEAS_ENABLED } from '../../lib/studioFeatures';

import { useAriaModel } from '../../hooks/useAriaModel';
import { useGenerationModel } from '../../hooks/useGenerationModel';
import { useAriaStudio } from '../../context/AriaStudioContext';
import { toast } from 'sonner';
import CVService from '../../services/cv.service';
import AriaComposer from '../cv/AriaComposer';
import AriaOrbit from '../cv/AriaOrbit';
import AriaThinking from '../cv/AriaThinking';
import RewriteRoleCard from './RewriteRoleCard';
import ProjectIdeasCard from './ProjectIdeasCard';
import ModeChooser from './ModeChooser';

import JobCaptureCard from './JobCaptureCard';
import RoleBriefCard from './RoleBriefCard';
import CvPickerCard from './CvPickerCard';
import AriaCard from './AriaCard';
import ScoreCard from './ScoreCard';
import SectionBreakdownCard from './SectionBreakdownCard';
import FinishCard from './FinishCard';
import StudioPrintSurface from './StudioPrintSurface';
import { DEFAULT_TEMPLATE_ID } from '../../lib/cvDownload';
import { generateMarkdownFromDraft } from '../../utils/markdownUtils';
import EntryPickerCard from './EntryPickerCard';
import SectionCoach from './SectionCoach';
import SummaryFixCard from './SummaryFixCard';
import SectionGuidanceCard from './SectionGuidanceCard';
import BuildRoadmapCard from './BuildRoadmapCard';
import TargetJobAskCard from './TargetJobAskCard';
import CareerStageAskCard from './CareerStageAskCard';
import ContactConfirmCard from './ContactConfirmCard';
import PinnedEntryCard from './PinnedEntryCard';
import RoleCaptureCard from './RoleCaptureCard';
import ProjectTypeCard from './ProjectTypeCard';
import ExperienceTypeCard from './ExperienceTypeCard';
import CertificationsCard from './CertificationsCard';
import SkillsBuildCard from './SkillsBuildCard';
import { SelectedAnswerBubble, StudioPhaseDivider, StudioReceipt } from './StudioTranscriptEvent';

// Aria's opening line in the Studio. Flagged `_opening` so it's regenerated on every
// mount and never persisted — same contract as the coach panel's step openers.
// Key, not text — resolved via t() where used, since this is module scope with no
// react-i18next context.
const OPENER_KEY = 'ariaStudio.chat.opener';

// Phase-0 transcript home. Retired the moment a draft exists: the array migrates into
// `cvData.coachChats.studio` (identical shape) and the context autosave takes over.
const LS_KEY = 'ariaStudio:session';

// How long to wait after a CONTENT change before the automatic re-score. Long enough
// that a drag, a delete and a field edit in the same burst coalesce into ONE call;
// short enough that the score is current by the time anyone looks at it.
const AUTO_RESCORE_MS = 1500;

const loadSession = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// The intake state machine. Each step's card renders as the LAST item in the stream;
// completing it lands a persisted MARKER message in `messages` and advances `phase`.
// On reload the markers re-render from history and `phase` is rebuilt from them
// (see derivePhase), so a refresh mid-flow resumes exactly where it left off.
//
//   greeting → mode → job form → (brief-preview) → brief confirm → cv
//     → (tailor-start) → scan offer → (scan, −10cr) → results → done
//
// NOTE ON ORDER: the brief comes BEFORE the CV pick. Aria's read is the thing most
// likely to be wrong — a mis-pasted or truncated JD produces a bad brief — so the user
// checks and corrects it while correcting is still free. /studio/brief-preview builds a
// brief from raw JD text with NO draft attached, so nothing is created until the read is
// confirmed; an Edit at that point just re-previews. The confirmed brief is then handed
// to tailor-start, which persists it as-is rather than re-extracting.
//
// The brief rides on the `jobcard` marker, so a refresh at the brief step re-renders
// Aria's read from history instead of re-fetching it.

// The scan snapshot lives on the DRAFT (studioScan), not in the transcript — a scan
// marker only records that one happened, so the cards always render the current
// snapshot (including after a free recompute) rather than a stale copy of it.

const StudioChat = ({ onPaywall }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const {
    draftId,
    cvData,
    setCvData,
    updateCvData,
    loading,
    applyRoleBulletDiff,
    applyEntryEdit,
    applySummary,
    applySkills,
    startBuild,
    newSession,
    addRole,
    addProject,
    addEducation,
    pendingKind,
    setPendingKind,
    pendingSource,
    setPendingSource,
    // The delete/undo pair, and the command channel the Live Preview asks through.
    removeEntry,
    restoreEntry,
    studioCommand,
    clearStudioCommand,
    // Focus mode runs the OTHER way down the same wire: this component publishes which
    // entry Aria is working on, and the Live Preview marks + locks that row.
    setActiveEntry,
  } = useAriaStudio();

  // The session's Aria CHAT model — the SAME per-draft choice the Studio header picker and
  // the builder's coach chat show; the composer's picker writes through this.
  const { modelId, selectModel } = useAriaModel({ draftId, cvData, updateCvData });
  // The GENERATION model — independent of the chat model above. A per-user
  // localStorage preference, defaulting to whatever the chat model is.
  const { genModelId, setGenModelId } = useGenerationModel(modelId);

  // The scan cost, priced at the SESSION's selected model tier (flagship scan costs more).
  const scanCost = costForActionTier('FIT_ANALYSIS', tierOf(cvData?.studioModelId)) ?? 10;

  // A session started from the rail already declared its kind, so it opens on that
  // kind's FIRST STEP — the mode chooser would be asking a question already answered.
  // Both openers below are `_opening`, so neither is ever persisted.
  const kindOpener =
    pendingKind === 'build'
      ? t('ariaStudio.chat.kindOpenerBuild')
      : pendingKind === 'tailor'
        ? t('ariaStudio.chat.kindOpenerTailor')
        : t(OPENER_KEY);

  const [messages, setMessages] = useState(() => [
    { who: 'aria', text: kindOpener, _opening: true },
    ...(pendingKind ? [] : loadSession()),
  ]);
  const [phase, setPhase] = useState(() => phaseForNewSession(pendingKind, loadSession()));
  const [openingStudio, setOpeningStudio] = useState(
    () => !loading && !draftId && loadSession().length === 0
  );

  // A source handed over from a finished build ("now tailor it"). Kept in a ref because
  // the provider's copy is cleared immediately below — this session owns it from here.
  const preSourceRef = useRef(pendingSource);

  // The kind + source are consumed once — a refresh after this point re-derives from
  // markers, and a pre-selected source that was never used simply lapses.
  useEffect(() => {
    if (pendingKind) setPendingKind(null);
    if (pendingSource) setPendingSource(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!openingStudio) return undefined;
    const timer = setTimeout(() => setOpeningStudio(false), reduce ? 300 : 2000);
    return () => clearTimeout(timer);
  }, [openingStudio, reduce]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [working, setWorking] = useState(false); // tailor-start in flight
  const [reading, setReading] = useState(false); // keyword + brief-preview in flight
  const [scanning, setScanning] = useState(false); // scan or recompute in flight
  // WHICH of the two is in flight — for the two busy LABELS only. `scanning` stays the
  // "either is running" gate (ready, the composer, the thinking indicator), because both
  // ops should lock the stream; this only decides which button gets to say it's working,
  // so the FREE re-score can no longer make the PAID re-check look like it's running.
  const [scanKind, setScanKind] = useState(null); // null | 'recompute' | 'rescan'
  // ─── Auto re-score plumbing (the silent path) ───
  //
  // A SILENT recompute deliberately does not touch `scanning`: that flag gates `ready`,
  // which unmounts every card in the stream. Fine for a button the user just pressed,
  // wrong for a background heal after a preview edit. These two refs are what let the
  // silent path stay out of React state entirely.
  //
  //   silentRecomputeRef — one silent recompute at a time. Two overlapping calls would
  //     race to write studioScan, and the loser could land an older snapshot.
  //   lastScoredSigRef   — the content signature as of the last SUCCESSFUL scan or
  //     recompute. The auto effect fires only when the live signature differs from it,
  //     which is also what stops it firing on mount (it is seeded to match).
  const silentRecomputeRef = useRef(false);
  const lastScoredSigRef = useRef(null);

  // Generic "step confirmed, moving on" beat — hides the current/next card behind a
  // short labeled thinking indicator instead of swapping cards instantly.
  const [transitionLabel, setTransitionLabel] = useState(null);
  const [pickBusyId, setPickBusyId] = useState(null);
  // Set while re-opening the job form to Edit an already-captured job.
  const [editingJob, setEditingJob] = useState(false);
  // Fix-loop transients. The CONVERSATION lives in `messages` (persisted); these are
  // in-flight flags only, so a refresh restores the thread and the phase, not a
  // half-finished network call.
  const [applyingFix, setApplyingFix] = useState(false);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [summaryWasReroll, setSummaryWasReroll] = useState(false);
  // Whether the build's job question has opened the capture form. Transient by design:
  // the ANSWER is a marker, so a refresh mid-typing returns to the question rather than
  // an empty form pretending to hold something.
  const [buildJobOpen, setBuildJobOpen] = useState(false);
  // 'next' | 'field' | 'done' | null — which pinned-card action is in flight.
  const [roleBusy, setRoleBusy] = useState(null);
  const [pinMessage, setPinMessage] = useState({ sortId: null, nonce: 0 });
  const [appliedReceipt, setAppliedReceipt] = useState(null);
  const [buildRoundNonce, setBuildRoundNonce] = useState(0);
  const [reviewHint, setReviewHint] = useState(null);
  // Generated skill suggestions awaiting a pick, or null. Transient: the ANSWER (what
  // was added) lives on the CV, so a refresh returns to the consent card rather than
  // showing suggestions the user never paid attention to.
  const [skillsData, setSkillsData] = useState(null);
  // The role whose bullets are being rewritten: { section, sortId, entry, rows }. Mirrors
  // the persisted studioPending — the rows are PAID output, so the pending copy is what
  // survives a refresh and this is just the render-time handle on it.
  const [rewriteTarget, setRewriteTarget] = useState(null);
  // Aria's project PROPOSALS, or null. Also PAID output, so the persisted studioPending
  // is the copy of record and this is the render-time handle on it.
  const [projectIdeas, setProjectIdeas] = useState(null);
  const [ideasBusy, setIdeasBusy] = useState(false);
  // One suggestion attempt per session for the FIX entry point, which fetches on mount.
  // Without this, a fetch that came back empty (or 403) would re-fire on every render —
  // a paid endpoint in a render loop.
  const ideasAskedRef = useRef(false);
  // Running total added via the free manual-entry loop this session. StudioChat
  // remounts on sessionNonce, so this resets per session automatically.
  const [manualSkillsAdded, setManualSkillsAdded] = useState(0);
  // The SAME two pieces of state again, for the FIX path. A session is only ever on one
  // phase at a time, so one pair could technically serve both — but the two flows CLOSE
  // differently (build advances to the section hub, a fix runs finishFix), and sharing the
  // counters is how a leftover build total ends up in a fix's receipt. Parallel and
  // explicitly separate: `skillsData`/`manualSkillsAdded` are build's, these are the fix's.
  const [fixSkillsData, setFixSkillsData] = useState(null);
  const [fixSkillsAdded, setFixSkillsAdded] = useState(0);

  // Charged output must survive refresh until the user applies or explicitly discards it.
  const persistStudioPending = async (pending) => {
    updateCvData({ studioPending: pending });
    if (!draftId) return true;
    try {
      await CVService.saveDraft({ _id: draftId, studioPending: pending });
      return true;
    } catch (err) {
      console.error('Failed to persist pending Studio generation', err);
      toast.error(t('ariaStudio.chat.toast.saveFailed'));
      return false;
    }
  };

  useEffect(() => {
    const pending = cvData?.studioPending;
    // Skills generation is PAID on both tracks, so both rehydrate — into their OWN state,
    // routed by the same `workflow` flag derivePhase reads. Restoring into the wrong one
    // would put the user back on a consent card offering to sell them what they just
    // bought. A pending written before `workflow` existed is a build one.
    if (pending?.kind === 'skills') {
      if (pending.workflow === 'fix') setFixSkillsData(pending.data || null);
      else setSkillsData(pending.data || null);
    }

    if (pending?.kind === 'summary') {
      setSummaryDraft(pending.draft || '');
      setSummaryWasReroll(!!pending.wasReroll);
    }
    // Rewrite rows are a PAID result. Rehydrating them is what stops a refresh from
    // charging the user a second time for the same before/after list.
    if (pending?.kind === 'rewrite') setRewriteTarget(pending);
    // Same reasoning for the ideas: they cost a credit, so a refresh must return the
    // list the user already paid for rather than quietly buying it again.
    if (pending?.kind === 'projectideas') {
      setProjectIdeas(pending.ideas || []);
      ideasAskedRef.current = true;
    }
  }, [draftId, cvData?.studioPending]);

  const chatRef = useRef(null);
  const inputRef = useRef(null);
  // The docked slot the ACTIVE coach's composer portals into, so a focused-section input
  // stays pinned below the scroll instead of scrolling away with the messages. A callback
  // ref into state (not a plain ref) so SectionCoach re-renders and portals the moment the
  // slot is attached. See the dock in the render + SectionCoach's `dockNode`.
  const [coachDock, setCoachDock] = useState(null);
  // One-shot guard for the localStorage → coachChats migration.
  const migratedRef = useRef(false);

  // DOM nodes for the plain typed/response bubbles, keyed by their `messages` index —
  // populated by the two bubble branches below. Cards/markers don't register here, so
  // a turn that's all cards (no free-form text yet) naturally falls through to the
  // bottom-scroll fallback in the effect below.
  const msgDomRef = useRef({});
  // Which messages are done "typing" and should render as plain static text — seeded
  // with the CURRENT length so nothing already on screen at mount replays, and bulk-
  // filled by the rehydrate effect so restored history never replays either.
  const revealedRef = useRef(new Set(messages.map((_, i) => i)));
  const prevMsgLenRef = useRef(messages.length);
  const turnAnchorIndexRef = useRef(0);
  // Set by the rehydrate effect right before it bulk-loads a returning session's saved
  // thread — that's a history LOAD, not a new turn, so it should land at the bottom
  // (the most recent point) instead of anchoring to the top of the oldest restored
  // message the way a live reply does.
  const hydratingRef = useRef(false);

  // Anchors the view to the TOP of whatever just arrived — your own message when you
  // send it, then Aria's reply when it lands — rather than chasing every new line with
  // a scroll-to-bottom. Re-runs on the loading-state flags too (not just `messages`) so
  // the anchor holds steady through a turn's whole lifecycle instead of drifting once
  // the thinking indicator appears or clears.
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return undefined;

    if (messages.length > prevMsgLenRef.current) {
      turnAnchorIndexRef.current = prevMsgLenRef.current;
    }
    prevMsgLenRef.current = messages.length;
    const landOnBottom = hydratingRef.current;
    hydratingRef.current = false;

    const behavior = reduce ? 'auto' : 'smooth';
    const doScroll = () => {
      const anchorNode = !landOnBottom && msgDomRef.current[turnAnchorIndexRef.current];
      if (anchorNode) {
        el.scrollTo({ top: Math.max(0, anchorNode.offsetTop - 12), behavior });
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: landOnBottom ? 'auto' : behavior });
      }
    };
    doScroll();
    const raf = requestAnimationFrame(doScroll); // catch entrance layout
    const settle = setTimeout(doScroll, 340); // after header slide / card mount settles
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [messages, thinking, working, reading, transitionLabel, phase, editingJob, reduce]);

  const advance = (fn, label, delay = 700) => {
    setTransitionLabel(label);
    setTimeout(() => {
      setTransitionLabel(null);
      fn();
    }, delay);
  };

  // Rehydrate the flow from the draft's saved thread once one is loaded from the
  // backend (a returning session). Only runs when we have a draft AND nothing local.
  useEffect(() => {
    if (!draftId) return;
    const saved = cvData?.coachChats?.studio;
    if (!Array.isArray(saved) || !saved.length) return;
    setMessages((prev) => {
      const localPersisted = prev.filter((m) => !m._opening);
      if (localPersisted.length) return prev; // local thread wins; nothing to restore
      migratedRef.current = true; // came FROM the backend — don't migrate back over it
      setPhase(derivePhase(saved, cvData));
      hydratingRef.current = true; // land the scroll at the bottom, not the top of history
      for (let idx = 0; idx < saved.length; idx += 1) revealedRef.current.add(idx); // no typewriter replay
      return saved;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  // Persistence. Before a draft exists the transcript lives in localStorage; the moment
  // `draftId` goes live it migrates ONCE into coachChats.studio and the context's
  // debounced autosave becomes the sole writer (localStorage is cleared and never
  // written again). The Phase-0 TODO is retired here.
  useEffect(() => {
    // While the remembered draft is still being fetched we don't yet know the real
    // thread — writing now would clobber localStorage with an empty transcript.
    if (loading) return;
    const persisted = messages.filter((m) => !m._opening);

    if (!draftId) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(persisted));
      } catch (err) {
        console.error('Failed to persist Aria Studio session:', err);
      }
      return;
    }

    if (!migratedRef.current) {
      migratedRef.current = true;
      try {
        localStorage.removeItem(LS_KEY);
      } catch {
        /* storage unavailable — nothing to clean up */
      }
    }

    // Echo guard: only write when the thread actually differs from what's on the draft,
    // so this effect can't ping-pong with the context autosave.
    if (JSON.stringify(cvData?.coachChats?.studio || []) !== JSON.stringify(persisted)) {
      updateCvData({ coachChats: { studio: persisted } });
    }
    // cvData is read only to skip echo writes; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, draftId, loading]);

  const push = (...msgs) => setMessages((m) => [...m, ...msgs]);

  const finishAppliedReceipt = () => {
    if (!appliedReceipt) return;
    const landed = appliedReceipt;
    setPinMessage((previous) => ({
      sortId: landed.sortId,
      nonce: previous.nonce + 1,
    }));
    setAppliedReceipt(null);
    try {
      if (!localStorage.getItem('ariaStudio:review-hint-seen')) setReviewHint(landed);
    } catch {
      setReviewHint(landed);
    }
  };

  const dismissReviewHint = () => {
    setReviewHint(null);
    try {
      localStorage.setItem('ariaStudio:review-hint-seen', '1');
    } catch {
      /* storage unavailable — the hint may appear again in a later session */
    }
  };

  // The pinned role, resolved from the marker against the LIVE draft. Null when the
  // entry has been deleted elsewhere — the effect below then clears the stale pin, so
  // the card can never sit there collecting input that lands nowhere.
  const pinnedEntry = resolvePinnedEntry(messages, cvData);
  const pinnedSectionKey = pinnedSection(messages) || 'experience';
  // The project type: the PERSISTED entry field first, then this thread's marker. The
  // entry is what a tailored project (cloned, so no marker) and an "Edit with Aria"
  // interview have, and it's what the backend now reads too — so resolving it this way
  // is what makes them skip the type chip instead of being asked something Aria knows.
  const pinnedType = pinnedEntry
    ? resolveProjectType(pinnedEntry, messages, pinnedEntry._sortId)
    : null;

  const pinnedStage = roleStage(pinnedEntry, pinnedSectionKey, { typePicked: !!pinnedType });

  // Career stage — same "Where are you in your career?" question as the CV builder's
  // build-with, picked once and carried across every role for this Studio session.
  // Persisted on the draft (not local-only) so a reload/session-resume doesn't silently
  // fall back to backend inference (which defaults to "experienced" once any real job
  // title/company exists).
  // Keep the just-picked stage locally as well as on the draft. The first focused
  // coaching turn can begin before the provider's draft mirror has re-rendered.
  const [pickedCareerStage, setPickedCareerStage] = useState(null);
  const careerStage = pickedCareerStage || cvData?.careerStage || null;
  const setCareerStage = async (stage) => {
    const previous = careerStage;
    setPickedCareerStage(stage);
    updateCvData({ careerStage: stage });
    if (draftId) {
      try {
        await CVService.saveDraft({ _id: draftId, careerStage: stage });
      } catch (err) {
        console.error('Failed to save career stage', err);
        setPickedCareerStage(previous);
        updateCvData({ careerStage: previous });
        toast.error(t('ariaStudio.chat.toast.saveFailed'));
        return false;
      }
    }
    return true;
  };

  // ─── Commanded deletes (the Live Preview's Remove) ───
  //
  // The preview REQUESTS; this owns the consequences, because the ORDER is the whole
  // point. Teardown markers are pushed BEFORE removeEntry mutates cvData, so by the time
  // the self-heal effect below re-runs there is no pin left to heal and its `if (!sortId)
  // return` short-circuits — no duplicate "pin cleared" line, and no race with the save.
  //
  // A deliberate delete and an entry that vanished from another tab are different events
  // and read differently: this one is silent about the pin (the user just deleted the
  // thing; being told it's gone is noise) and offers UNDO. The self-heal stays as the
  // backstop for the genuinely surprising case.
  //
  // ─── Commanded "Edit with Aria" (the Live Preview's ✎ → Aria) ───
  //
  // Same channel, same discipline — the preview may not pin an entry or open an interview
  // itself, because both are transcript/phase changes and this component owns those. The
  // branch below is the TAIL of an existing entry point in each session kind: build
  // reuses startEntry's pin-and-go (minus the create, since the entry exists), and tailor
  // reuses startInterview. BOTH are the conversational route — Aria asks about the entry
  // and only generates bullets at the end, once the user picks a count. "Edit with Aria"
  // means the interview, so nothing here generates anything on arrival: the rewrite card
  // stays where it was chosen deliberately, from Fix → pick an entry.
  //
  // ─── Commanded "Suggest skills with Aria" (the Live Preview's skills section) ───
  //
  // The one command with no sortId — a skill is addressed by NAME, and this asks about the
  // SECTION rather than a row. That null is why both branches above are gated on their own
  // `type` rather than on the presence of a sortId: a section-level command must not fall
  // into an entry-level one.
  //
  // It routes rather than generates, for the same reason as the rest of this effect: the
  // consent step, the price and the phase belong to the chat. Each session kind lands on
  // the skills flow it already has — build:skills for a build, the fix:skills flow for a
  // tailor — so there is no third skills path to keep in step with the other two.
  useEffect(() => {
    if (!studioCommand) return;

    if (studioCommand.type === 'editWithAria') {
      const { section, sortId } = studioCommand;
      // Education can't get here — the row doesn't offer the choice — but the guard is
      // load-bearing anyway: ENTRY_SOURCE has no education key, so a pinrole/rewrite on a
      // degree would strand the user on a phase with nothing behind it. No-op, but STILL
      // clear, or the command sticks and blocks the next one.
      if (!sortId || section === 'education') {
        clearStudioCommand?.();
        return;
      }
      // The entry is looked up for its LABELS only (Aria names the entry she's asking
      // about); the sortId remains the identity everything else resolves by.
      const list = section === 'project' ? cvData?.projects : cvData?.experience;
      const entry = (list || []).find((e) => e._sortId === sortId);

      if (cvData?.studioKind === 'build') {
        // The tail of startEntry: this entry already exists, so pin it and drop into its
        // field capture. Field-by-field, exactly as if Aria had just created it.
        push({ who: 'pinrole', sortId, section });
        setPhase(`build:${section}`);
      } else {
        // The INTERVIEW, not the rewrite. Aria asks about this entry — guided by its
        // type and the session's career stage — and bullets are only generated at the
        // end, once the user picks a count. Nothing is charged on arrival.
        //
        // `section` is the command's own token ('experience' | 'project'), already the
        // focusSection vocabulary, and startInterview treats the caller's entry.section
        // as authoritative — so a PROJECT is interviewed as a project even though no fix
        // is open here to read the section off.
        //
        // Declared below, but only ever CALLED from an effect — by which point the whole
        // component body has run, so the binding is initialised. Same shape as every
        // other handler here; hoisting it above the effect would move ~40 lines of the
        // fix loop away from the rest of it.
        // eslint-disable-next-line no-use-before-define
        startInterview({ section, sortId, title: entry?.title, company: entry?.company });
      }
      clearStudioCommand?.();
      return;
    }

    if (studioCommand.type === 'suggestSkills') {
      if (cvData?.studioKind === 'build') {
        // Enter build:skills as if it had just been reached from the section hub. Both
        // pieces of build-skills state are reset for the reason handleFix resets the fix
        // pair: leftovers would open the card mid-flow — straight on 'card' phase showing
        // suggestions from an earlier visit, or Done landing a receipt counting skills
        // added before this one. (A persisted studioPending is deliberately left alone:
        // it is PAID output, and discarding it here would throw away something bought.)
        setSkillsData(null);
        setManualSkillsAdded(0);
        setPhase('build:skills');
      } else {
        // The TAILOR route goes through handleFix, not around it. It already pushes the
        // fixstart{mode:'skills'} marker, resets fixSkillsData/fixSkillsAdded, says the
        // intro line and sets fix:skills — so calling it is what guarantees this entry
        // point and tapping Fix on the skills row can never drift apart.
        //
        // No scan is required: the generation grounds on the CV and the target job, and
        // the gaps are context. Read off the live snapshot when there IS one, so arriving
        // here after a scan is indistinguishable from arriving from the breakdown.
        const row = cvData?.studioScan?.sections?.find((s) => s.key === 'skills');
        // Declared below, called only from this effect — the component body has already
        // run by then. Same shape (and same suppression) as startInterview above.
        // eslint-disable-next-line no-use-before-define
        handleFix({
          key: 'skills',
          label: row?.label || t('ariaStudio.studioFlow.sections.skills'),
          missingKeywords: row?.missingKeywords || [],
        });
      }
      clearStudioCommand?.();
      return;
    }

    if (studioCommand.type === 'draftSummary') {
      if (cvData?.studioKind === 'build') {
        // Enter build:summary as if it had just been reached from the section hub, which
        // is what cancelFix and the applied-summary path both leave behind: an empty draft
        // and no reroll flag. Leftovers would open the card on someone ELSE's sentence —
        // showing a draft from an earlier visit as though it had just been written, with
        // "Try another angle" already spent. (The persisted studioPending is deliberately
        // left alone: it is PAID output, and discarding it here would throw away something
        // bought — same call the skills branch makes above.)
        setSummaryDraft('');
        setSummaryWasReroll(false);
        setPhase('build:summary');
      } else {
        // The TAILOR route goes through handleFix, not around it. Its summary branch
        // already says the fixSummary intro and sets fix:summary, so calling it is what
        // guarantees this entry point and tapping Fix on the summary row can never drift
        // apart. No scan is required — the rewrite grounds on the CV and the target job,
        // and the gaps are context — so the row is read off the live snapshot when there
        // IS one and an empty list stands in when there isn't.
        const row = cvData?.studioScan?.sections?.find((s) => s.key === 'summary');
        // Declared below, called only from this effect — the component body has already
        // run by then. Same shape (and same suppression) as startInterview above.
        // eslint-disable-next-line no-use-before-define
        handleFix({
          key: 'summary',
          label: row?.label || t('ariaStudio.studioFlow.sections.summary'),
          missingKeywords: row?.missingKeywords || [],
        });
      }
      // The CAREER STAGE needs nothing here. SummaryFixCard hides its stage chips whenever
      // `careerStage` is set, and that flows from cvData.careerStage — so a session that
      // stored one goes straight to "ready to write" and Aria never re-asks. A draft with
      // no stored stage (an older CV) gets the chips, which is the correct fallback rather
      // than a guess.
      clearStudioCommand?.();
      return;
    }

    if (studioCommand.type === 'addEntry') {
      const { section } = studioCommand;
      clearStudioCommand?.();
      // Build track only (tailor is disabled). enterSection creates a fresh entry, pins it
      // and drops into the from-scratch interview (type chip → capture → bullets). On
      // finish, Phase 1's completeness-aware finishSection lands it back on the finish card.
      // eslint-disable-next-line no-use-before-define
      if (cvData?.studioKind === 'build') enterSection(section);
      return;
    }

    if (studioCommand.type !== 'deleteEntry') return;
    const { section, sortId } = studioCommand;
    let cancelled = false;

    (async () => {
      try {
        // 1. Tear down whatever is FOCUSED on this entry, first.
        if (sortId && sortId === pinnedSortId(messages)) {
          push({ who: 'unpinrole' });
          // Only leave a build:<section> screen if it's THIS entry's — a pin can be open
          // while the user is elsewhere, and yanking them to the hub would be wrong.
          if (String(phase).startsWith('build:') && phase === `build:${pinnedSection(messages)}`) {
            setPhase('build:sections');
          }
        } else if (sortId && openFix(messages)?.entry?.sortId === sortId) {
          // An open coach session pointed at this entry: close it cleanly and go back to
          // the breakdown. Its in-flight turn (if any) 404s — SectionCoach handles that.
          push({ who: 'fixend' });
          setPhase('results');
        }

        // 2. Then the delete itself, with the index so undo can put it back in place.
        const { ok, removed, index } = (await removeEntry?.(section, sortId)) || {};
        if (cancelled || !ok || !removed) return;

        // 3. Undo is the safety net that lets the confirm stay lightweight. restoreEntry
        //    keeps the original _sortId, so transcript markers still resolve afterwards.
        toast(t('ariaStudio.livePreview.entryRemoved'), {
          action: {
            label: t('ariaStudio.livePreview.undo'),
            onClick: () => restoreEntry?.(section, removed, index),
          },
        });
      } finally {
        // Always clear, even on a failed/rejected delete — a stuck command would block
        // the next one (the effect is keyed on the payload, and a repeat of the same
        // entry only differs by nonce).
        if (!cancelled) clearStudioCommand?.();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioCommand]);

  // Self-clear a pin whose entry has gone — deleted in the CV builder, or in another tab.
  // Without this the card would keep accepting answers for a role that no longer exists.
  //
  // NOT the path a preview delete takes: that one is commanded (above) and has already
  // pushed its own unpinrole, so `pinnedSortId` is null here and this returns immediately.
  useEffect(() => {
    if (loading || !cvData) return;
    const sortId = pinnedSortId(messages);
    if (!sortId) return;
    const section = pinnedSection(messages) || 'experience';
    const list = SECTION_LIST[section] || 'experience';
    const exists = (cvData[list] || []).some((e) => e._sortId === sortId);
    if (exists) return;
    push(
      { who: 'unpinrole' },
      {
        who: 'aria',
        text: t('ariaStudio.chat.pinCleared'),
      }
    );
    setPhase('build:sections');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvData?.experience, cvData?.projects, cvData?.education, loading]);

  // Aria says something, after a short beat, so her turns feel spoken rather than dumped.
  const ariaSays = (text, delay = 600) => {
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      push({ who: 'aria', text });
    }, delay);
  };

  // ─── Step 1: mode ───
  const pickMode = (mode) => {
    push({ who: 'modepick', mode });
    // Build goes to the SAME roadmap the rail's "New CV" opens — one build entry point,
    // reached two ways.
    if (mode === 'build') {
      setPhase('build:roadmap');
      ariaSays(t('ariaStudio.chat.pickModeBuild'));
      return;
    }
    setPhase('job');
    ariaSays(t('ariaStudio.chat.pickModeTailor'));
  };

  // ─── Step 2: the job → read it (keywords + Role Brief) with NOTHING created yet ───
  // Both reads run in parallel under one indicator: the free deterministic keyword pass
  // and the AI brief. Either can fail independently without blocking the other — the
  // keywords still give Aria something to say if the brief comes back null.
  const captureJob = async ({ jobTitle, jobDescription, jdSource }) => {
    setEditingJob(false);
    setReading(true);

    const [keywords, brief] = await Promise.all([
      (async () => {
        try {
          const data = await CVService.getJobKeywords({ description: jobDescription });
          // Stay free: if the backend ever flags a charge, ignore the keywords.
          if (data?.charged || !Array.isArray(data?.keywords)) return [];
          return data.keywords
            .slice()
            .sort(
              (a, b) =>
                (b.importance === 'must_have' ? 1 : 0) - (a.importance === 'must_have' ? 1 : 0)
            )
            .map((x) => x.name)
            .filter(Boolean)
            .slice(0, 3);
        } catch {
          return [];
        }
      })(),
      (async () => {
        try {
          const res = await CVService.studioBriefPreview({
            jobTitle,
            jobDescription,
            model: modelId,
          });
          return res?.brief || null;
        } catch (err) {
          console.error('brief-preview failed', err);
          return null;
        }
      })(),
    ]);

    setReading(false);
    push({ who: 'jobcard', jobTitle, jobDescription, keywords, brief, jdSource });
    setPhase('brief');
    ariaSays(
      brief ? t('ariaStudio.chat.captureJobWithBrief') : t('ariaStudio.chat.captureJobNoBrief')
    );
  };

  // ─── Step 4: pick a CV → clone, carrying the CONFIRMED brief ───
  const pickCv = async (draft) => {
    if (working) return;
    setPickBusyId(draft._id);
    setWorking(true);

    const job = [...messages].reverse().find((m) => m.who === 'jobcard');
    if (!job) {
      setWorking(false);
      setPickBusyId(null);
      return;
    }

    try {
      const res = await CVService.studioTailorStart({
        sourceDraftId: draft._id,
        jobTitle: job.jobTitle,
        jobDescription: job.jobDescription,
        // The read the user already confirmed — persisted as-is, so the backend
        // doesn't re-extract and any correction they made survives.
        brief: job.brief || undefined,
        model: modelId,
        jdSource: job.jdSource,
      });

      // Bind the provider to the new copy — this is what makes `draftId` go live and
      // hands persistence over to the context autosave.
      if (res?.draft) setCvData(res.draft);

      push(
        {
          who: 'cvpick',
          sourceTitle: draft.title || t('ariaStudio.cvPicker.untitledCv'),
          sourceId: draft._id,
        },
        {
          who: 'tailored',
          draftId: res?.draftId,
          title: res?.title,
          brief: res?.brief || null,
          jobTitle: job.jobTitle,
        }
      );
      setPhase('scanoffer');
      ariaSays(t('ariaStudio.chat.tailorStartDone'));
    } catch (err) {
      if (err?.response?.status === 402 && err?.response?.data?.code === 'NEED_AGENT_SUB') {
        onPaywall?.();
        return;
      }
      console.error('tailor-start failed', err);
      push({
        who: 'aria',
        text: t('ariaStudio.chat.tailorStartFailed'),
      });
    } finally {
      setWorking(false);
      setPickBusyId(null);
    }
  };

  // ─── Step 3: confirm Aria's read ───
  const confirmBrief = () => {
    advance(() => {
      push({ who: 'briefcard', confirmed: true });
      setPhase('cv');
      // Handed over from a finished build — the source is already decided, so skip the
      // picker and say which CV is being used rather than asking a question with one
      // obvious answer. The user can still pick another from the card if it's wrong.
      const pre = preSourceRef.current;
      if (pre?.id) {
        ariaSays(t('ariaStudio.chat.confirmBriefWithSource', { title: pre.title }));
        setTimeout(() => pickCv({ _id: pre.id, title: pre.title }), 700);
        return;
      }
      ariaSays(t('ariaStudio.chat.confirmBriefNoSource'));
    }, t('ariaStudio.chat.thinking.savingBrief'));
  };

  // Edit re-opens the job form so the JD can be corrected and re-previewed. Nothing has
  // been created at this point, so correcting costs nothing and leaves no orphan copy.
  const editBrief = () => {
    setEditingJob(true);
    setPhase('job');
  };

  // The CV as the SCAN sees it, folded to one string (studioFlow.scoreSignature). Read
  // through a ref by anything asynchronous, so a recompute records the document it
  // actually scored rather than whatever the closure it was created in happened to hold.
  const contentSig = scoreSignature(cvData);
  const contentSigRef = useRef(contentSig);
  useEffect(() => {
    contentSigRef.current = contentSig;
  }, [contentSig]);

  // SEED the baseline once the draft is bound. Without this the ref would start null,
  // the live signature would differ from it, and a session that merely OPENED on an
  // existing scan would fire an auto re-score nobody asked for.
  useEffect(() => {
    if (loading || !draftId) return;
    if (lastScoredSigRef.current === null) lastScoredSigRef.current = contentSig;
  }, [loading, draftId, contentSig]);

  // ─── Step 5: the scan — the one charged action in the flow ───
  const runScan = async () => {
    if (scanning || !draftId) return;
    setScanning(true);
    setScanKind('rescan');
    const sigAtRequest = contentSigRef.current;
    try {
      const res = await CVService.studioScan(draftId, modelId);
      // The snapshot lives on the draft; mirror it into context so every card and the
      // artifact panel read one source of truth.
      updateCvData({ studioScan: res.studioScan });
      // This document is now scored. Captured at REQUEST time, not here: an edit made
      // while the scan was in flight is genuinely unscored, and recording the newer
      // signature would swallow the auto re-score that should follow it.
      lastScoredSigRef.current = sigAtRequest;

      if (res.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      push({ who: 'scan', at: res.studioScan?.scannedAt });
      setPhase('results');

      // Name the gap instead of just announcing the score. The scan result is already in
      // hand, so the nudge points at the weakest sections and the exact keywords they're
      // missing — the difference between "you scored 61" and knowing what to fix next.
      const fit = Math.round(res.studioScan?.fitScore ?? 0);
      const allSections = Array.isArray(res.studioScan?.sections) ? res.studioScan.sections : [];
      const bad = allSections.filter((s) => s?.band === 'bad');
      const weak = (bad.length ? bad : allSections.filter((s) => s?.band === 'warn'))
        .slice()
        .sort((a, b) => (a?.score ?? 0) - (b?.score ?? 0))
        .slice(0, 2);
      const sections = weak.map((s) => sectionLabel(t, { key: s.key, label: s.label })).join(', ');
      const keywords = [
        ...new Set(
          weak.flatMap((s) =>
            (Array.isArray(s?.missingKeywords) ? s.missingKeywords : [])
              .map((k) => String(k || '').trim())
              .filter(Boolean)
          )
        ),
      ]
        .slice(0, 3)
        .join(', ');

      if (weak.length && keywords) {
        ariaSays(t('ariaStudio.chat.buildScanGapNudge', { fit, sections, keywords }));
      } else if (!bad.length) {
        ariaSays(t('ariaStudio.chat.buildScanStrong', { fit }));
      } else {
        ariaSays(t('ariaStudio.chat.scanDone'));
      }
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'INSUFFICIENT_CREDITS') {
        push({
          who: 'aria',
          text: t('ariaStudio.chat.scanInsufficientCredits', {
            required: err.response.data.required,
            current: err.response.data.current,
          }),
        });
      } else {
        console.error('studio scan failed', err);
        push({ who: 'aria', text: t('ariaStudio.chat.scanFailed') });
      }
    } finally {
      setScanning(false);
      setScanKind(null);
    }
  };

  // Free deterministic re-score. No AI, no charge — so it can run after every edit.
  // Returns the new snapshot so callers can report a delta.
  //
  // TWO MODES, one implementation:
  //
  //   silent: false (the default, and what every existing caller passes) — today's
  //     behaviour exactly. Sets scanning/scanKind, so the chat shows its busy state and
  //     a failure is toasted. Right for a re-score the user just asked for.
  //
  //   silent: true — the AUTOMATIC path behind a Live Preview edit. It must not set
  //     `scanning`: that gates `ready`, which unmounts every card in the stream, so a
  //     background heal would briefly tear down the conversation the user is reading.
  //     The feedback is the preview's existing aria-just-fixed pulse when a band moves.
  //     A failure is logged and swallowed — a surprise error toast for work nobody asked
  //     for is worse than a score that stays stale until the next change.
  const runRecompute = async ({ silent = false } = {}) => {
    if (!draftId) return null;
    // One silent recompute at a time. The debounced effect re-fires on the next change,
    // so skipping here loses nothing and can't leave two responses racing to write
    // studioScan.
    if (silent && silentRecomputeRef.current) return null;
    if (silent) silentRecomputeRef.current = true;
    else {
      setScanning(true);
      setScanKind('recompute');
    }
    const sigAtRequest = contentSigRef.current;
    try {
      const res = await CVService.studioRecompute(draftId);
      updateCvData({ studioScan: res.studioScan });
      // Same reasoning as runScan: record what was SENT, so an edit made mid-flight
      // still reads as unscored and gets its own pass.
      lastScoredSigRef.current = sigAtRequest;
      return res.studioScan;
    } catch (err) {
      console.error('studio recompute failed', err);
      if (!silent) toast.error(t('ariaStudio.chat.toast.recomputeFailed'));
      return null;
    } finally {
      if (silent) silentRecomputeRef.current = false;
      else {
        setScanning(false);
        setScanKind(null);
      }
    }
  };

  // ─── The auto re-score ───
  //
  // A preview edit or delete changes the CV; the fit score has to follow, or the number
  // on screen is describing a document that no longer exists. Recompute is free and
  // deterministic, so this can just run — debounced, so a drag plus a delete plus a field
  // edit coalesce into ONE call.
  //
  // Every condition below is load-bearing:
  //   • a scan must already exist — there is nothing to refresh before the first one;
  //   • the target job must carry a description — recompute 400s NO_TARGET_JOB without
  //     one, so every build session without a JD would hammer a failing endpoint;
  //   • the CONTENT signature must differ from the last scored one — this is what makes
  //     a REORDER a no-op. Reordering is score-neutral (the scan joins entry text
  //     order-independently), and the signature sorts by _sortId to match;
  //   • nothing else may be re-scoring.
  //
  // Keyed on the signature rather than on studioScan: a recompute WRITES studioScan, so
  // depending on it would re-enter. The signature only moves when the user's content does.
  const autoRescoreReady =
    !!cvData?.studioScan?.scannedAt && !!(cvData?.targetJob?.description || '').trim();
  useEffect(() => {
    if (!autoRescoreReady) return undefined;
    // Not seeded yet (the draft is still loading) — nothing to compare against.
    if (lastScoredSigRef.current === null) return undefined;
    if (contentSig === lastScoredSigRef.current) return undefined;
    if (scanning || silentRecomputeRef.current) return undefined;
    const timer = setTimeout(() => runRecompute({ silent: true }), AUTO_RESCORE_MS);
    return () => clearTimeout(timer);
    // runRecompute is re-created every render; the timer deliberately closes over the one
    // from the render that scheduled it, which is the one holding the current draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSig, autoRescoreReady, scanning]);

  // ─── The fix loop ───

  // Tap a weak section → route it to the right kind of fix. The section's own
  // missingKeywords ride on the marker so the coach can aim at them.
  const handleFix = (section) => {
    const mode = FIX_MODE[section.key];
    if (!mode) return;
    push({
      who: 'fixstart',
      mode,
      sectionKey: section.key,
      sectionLabel: section.label,
      missingKeywords: section.missingKeywords || [],
    });
    setPhase(`fix:${mode}`);

    if (mode === 'pick') {
      // The TRANSLATED name, at its natural capitalisation. Lowercasing it was doing two
      // kinds of damage: it forced an English label into a French sentence, and even
      // once translated, French would need an article ("Corrigeons l'expérience
      // professionnelle") that no generic template can supply. Both strings are now a
      // colon construction — "{{section}}: this job leans on …" — which is article-free
      // and reads correctly in both languages with the name left exactly as it is.
      const name = sectionLabel(t, section);
      ariaSays(
        section.missingKeywords?.length
          ? t('ariaStudio.chat.fixPickWithKeywords', {
              section: name,
              keywords: section.missingKeywords.slice(0, 3).join(', '),
            })
          : t('ariaStudio.chat.fixPickNoKeywords', { section: name })
      );
    } else if (mode === 'skills') {
      // Reset BOTH pieces of fix-skills state on the way in. A previous skills fix in the
      // same session leaves its suggestions and its running count behind, and either one
      // would open this fix mid-flow: the card straight on 'card' phase showing paid
      // output from the last visit, or Done landing a receipt for skills added earlier.
      setFixSkillsData(null);
      setFixSkillsAdded(0);
      ariaSays(t('ariaStudio.chat.fixSkillsIntro'));
    } else if (mode === 'summary') {
      ariaSays(t('ariaStudio.chat.fixSummary'));
    } else if (mode === 'guide') {
      // Education and contact were the only two of the six sections where Aria said
      // NOTHING: the divider and the card appeared, and she sat silent. Same TRANSLATED
      // name, same colon construction as the 'pick' branch, for the same reason.
      ariaSays(t('ariaStudio.chat.fixGuide', { section: sectionLabel(t, section) }));
    }
  };

  // Pull the draft back from the DB. Needed when the edit happened somewhere this tab
  // can't see — the guide CTA opens the CV builder in a NEW TAB, so by the time the user
  // comes back, this tab's cvData is a stale snapshot of a document that has moved on.
  // Overwriting the server's copy from it would silently undo the very edit being scored.
  const refreshDraft = async () => {
    if (!draftId) return null;
    try {
      const res = await CVService.getDraftById(draftId);
      const fresh = res?.draft || res;
      if (fresh?._id) setCvData(fresh);
      return fresh;
    } catch (err) {
      console.error('studio draft refresh failed', err);
      return null;
    }
  };

  // Report what a section's score did. ONE implementation, shared by every path that
  // re-scores — finishFix used to carry its own copy of this arithmetic, and a second
  // copy in the guide flow would have made three places to keep in step.
  const reportMovement = (before, after, sectionKey, storedLabel) => {
    const delta = scoreDelta(before, after);
    // Nothing honest to say without both ends of the comparison, and a section that has
    // since been dismissed scores null — there is no movement to report on a section
    // that is no longer being scored.
    if (!delta || !Number.isFinite(delta.moved)) return;
    // The marker stores the server's ENGLISH label; resolve it from its key at RENDER
    // time so this line reads in the user's language and follows a live switch. A label
    // resolved when the marker was written would freeze in whatever language was then
    // active. The stored string stays as the fallback for a keyless old marker.
    const sectionName = sectionLabel(t, { key: sectionKey, label: storedLabel });
    const bandNote = delta.bandChanged
      ? t(
          before.band === 'bad'
            ? 'ariaStudio.chat.outOfTheRedNote'
            : 'ariaStudio.chat.intoTheGreenNote'
        )
      : '.';
    push({
      who: 'aria',
      text:
        delta.moved > 0
          ? t('ariaStudio.chat.fixMovedScore', {
              section: sectionName,
              from: delta.from,
              to: delta.to,
              bandNote,
            })
          : t('ariaStudio.chat.fixSavedNoMove', { section: sectionName }),
    });
  };

  // "I've updated it — re-score", from the education/contact guidance card. The work was
  // done in the OTHER tab, so the order matters: refresh this tab's copy from the DB
  // FIRST, then recompute. Recompute reads the DB either way, but leaving a stale cvData
  // bound to the session would let any later save write the pre-edit document back.
  const rescoreAfterGuide = async () => {
    const fix = openFix(messages);
    const before = cvData?.studioScan?.sections?.find((s) => s.key === fix?.sectionKey);
    setScanning(true);
    try {
      push({ who: 'fixend' });
      setPhase('results');
      await refreshDraft();
      const snap = await runRecompute();
      reportMovement(
        before,
        snap?.sections?.find((s) => s.key === fix?.sectionKey),
        fix?.sectionKey,
        fix?.sectionLabel
      );
    } finally {
      setScanning(false);
    }
  };

  // Mark a section not-applicable, or put it back. One top-level field, so the existing
  // NARROW patch is exactly right — no new endpoint, and nothing else on the document is
  // touched. The server keeps its own whitelist; this guard only stops us sending a key
  // we know it will ignore.
  const setSectionDismissed = async (section, dismissed) => {
    if (!draftId || !isDismissable(section)) return;
    const current = Array.isArray(cvData?.dismissedSections) ? cvData.dismissedSections : [];
    if (current.includes(section) === dismissed) return;
    const next = dismissed ? [...current, section] : current.filter((k) => k !== section);

    setApplyingFix(true);
    try {
      // Dismissing from the empty entry picker happens INSIDE an open fix session; leave
      // it open and derivePhase would drop the user back into a picker for a section
      // that is no longer scored.
      if (openFix(messages)) {
        push({ who: 'fixend' });
        setPhase('results');
      }
      updateCvData({ dismissedSections: next });
      await CVService.saveDraft({ _id: draftId, dismissedSections: next });
      // The section's points leave (or rejoin) BOTH ATS budgets, so the overall score and
      // every band move with it. Free, so this always runs — a stale red row is exactly
      // the dead end this feature exists to clear.
      await runRecompute();
      ariaSays(
        t(dismissed ? 'ariaStudio.chat.sectionDismissed' : 'ariaStudio.chat.sectionRestored', {
          section: sectionLabel(t, { key: section }),
        })
      );
    } catch (err) {
      console.error('dismiss section failed', err);
      updateCvData({ dismissedSections: current });
      toast.error(t('ariaStudio.chat.toast.saveFailed'));
    } finally {
      setApplyingFix(false);
    }
  };

  const dismissSection = (section) => setSectionDismissed(section, true);
  const restoreSection = (section) => setSectionDismissed(section, false);

  // An entry was chosen → open the focused build-with on it. The opener names the gaps so
  // Aria's first question is already targeted; the Role Brief on the tailored copy grounds
  // the rest server-side, so the JD is never re-sent.
  //
  // The marker the INTERVIEW path needs — factored out because two entry points now lead
  // to it (picking an entry on a CV with no bullets, and escaping the rewrite card), and
  // a second hand-rolled copy is how the pair drifts. finishFix reads this marker to
  // close the loop, so both paths must push exactly the same one.
  // `opener` overrides Aria's first line. The project-ideas path uses it so the interview
  // opens on the IDEA being built rather than "tell me one thing you did there" — which
  // would be asking about work that, by definition, hasn't happened yet.
  //
  // The CALLER's `entry.section` is AUTHORITATIVE. This used to read the section off the
  // open fix — fine while every route in was "a fix is already open" (the picker, the
  // rewrite escape), but "Edit with Aria" from the Live Preview arrives with NO fix open,
  // and `ENTRY_SOURCE[undefined] || ENTRY_SOURCE.experience` would have filed a PROJECT as
  // experience: wrong label on the marker, and the coach interviewing a project as if it
  // were a job. The fix is still consulted as the FALLBACK, for the one caller that hands
  // over a bare { sortId } from inside a projects fix (startBlankProject).
  const startInterview = (entry, opener) => {
    const fix = openFix(messages);
    const section = entry.section || ENTRY_SOURCE[fix?.sectionKey]?.focusSection || 'experience';
    // finishFix re-scores BY SCAN KEY, which is the plural vocabulary — so map the
    // singular focusSection back to it when there's no fix to read it off. Without a key
    // the close-out has no section to compare, and the movement report goes silent.
    const sectionKey =
      fix?.sectionKey ??
      (section === 'project' ? 'projects' : section === 'education' ? 'education' : 'experience');
    // Same story for the gaps: off the open fix when there is one, otherwise straight off
    // the live scan snapshot for that section — the terms the section was marked down for
    // are what make Aria's first question targeted rather than generic.
    const gaps =
      fix?.missingKeywords ??
      cvData?.studioScan?.sections?.find((s) => s.key === sectionKey)?.missingKeywords ??
      [];

    push(
      {
        who: 'fixstart',
        mode: 'coach',
        sectionKey,
        sectionLabel: fix?.sectionLabel,
        missingKeywords: gaps,
        entry: {
          section,
          sortId: entry.sortId,
          title: entry.title,
          company: entry.company,
        },
      },
      {
        who: 'aria',
        text:
          opener ||
          (gaps.length
            ? t('ariaStudio.chat.pickEntryWithGaps', {
                title: entry.title,
                gaps: gaps.slice(0, 2).join(t('ariaStudio.chat.and')),
              })
            : t('ariaStudio.chat.pickEntryNoGaps', { title: entry.title })),
      }
    );
    setPhase('fix:coach');
  };

  // In a TAILOR session the bullets already exist, so the full build interview is the
  // wrong tool: it re-asks for work the user already did, and it is the slowest step in
  // the flow. Rewrite what's there instead, shown before → after. No fixstart is pushed
  // here — the rewrite is not an interview, and marking one would send a refresh into
  // SectionCoach. The interview stays one tap away as the escape.
  const pickEntry = (entry) => {
    const fix = openFix(messages);
    const src = ENTRY_SOURCE[fix?.sectionKey] || ENTRY_SOURCE.experience;
    const target = {
      kind: 'rewrite',
      section: src.focusSection,
      sortId: entry.sortId,
      entry: {
        section: src.focusSection,
        sortId: entry.sortId,
        title: entry.title,
        company: entry.company,
      },
      rows: null,
    };
    setRewriteTarget(target);
    persistStudioPending(target);
    setPhase('fix:rewrite');
  };

  // Leaving the rewrite always clears the pending rows — the same discipline the skills
  // and summary pendings follow. Rows left behind would re-open a card the user closed.
  const clearRewrite = () => {
    setRewriteTarget(null);
    persistStudioPending(null);
  };

  const rewriteInterviewInstead = () => {
    const target = rewriteTarget;
    clearRewrite();
    if (target?.entry) startInterview({ ...target.entry, sortId: target.sortId });
  };

  // Close a fix: land the applied record, re-band for free, and report the movement.
  // The record REFERENCES the entry and what was applied — never the score, which
  // would go stale the moment the next recompute runs.

  const finishFix = async (result) => {
    setScanning(true);
    // Whoever SETS the flag clears it. Leaning on runRecompute()'s own `finally` was not
    // enough: it returns early when there's no draftId, BEFORE its try is entered, so on
    // that path nothing ever cleared `scanning`. `ready` is derived from !scanning, so the
    // Studio then rendered no card at all with the composer disabled — unrecoverable
    // without a refresh. One owner, one finally; every exit below runs it.
    try {
      const fix = openFix(messages);
      push({ who: 'fixend' });

      if (!result) {
        // Backed out without applying anything — nothing to re-score.
        setPhase('results');
        return;
      }

      const before = cvData?.studioScan?.sections?.find((s) => s.key === fix?.sectionKey);
      push({
        who: 'applied',
        sectionKey: fix?.sectionKey,
        sectionLabel: fix?.sectionLabel,
        entry: result.entry || null,
        applied: result.applied || [],
        what: result.what || '',
      });

      const snap = await runRecompute();
      reportMovement(
        before,
        snap?.sections?.find((s) => s.key === fix?.sectionKey),
        fix?.sectionKey,
        fix?.sectionLabel
      );
      setPhase('results');
    } finally {
      setScanning(false);
    }
  };

  // Accepted rewrites replace their originals: remove each `before`, append its `after`.
  // applyRoleBulletDiff appends at the END, so a PARTIAL accept leaves the kept rewrites
  // below the untouched originals. Accepted for v1 — preserving exact position would mean
  // reworking the tested writer for a cosmetic gain.
  //
  // Ends in finishFix, exactly like the interview path, so the free recompute and the
  // movement report still fire — the rewrite is a fix, not a side door around one.
  const applyRewrite = async (afters, befores) => {
    const target = rewriteTarget;
    if (!target || !afters.length) return;
    setApplyingFix(true);
    try {
      const res = await applyRoleBulletDiff(target.section, target.sortId, afters, befores);
      if (!res?.ok) {
        toast.error(t('cvBuilder.askAria.syncFailed'));
        return;
      }
      clearRewrite();
      await finishFix({
        entry: target.entry,
        applied: afters,
        what: t('ariaStudio.chat.nBullets', { count: afters.length }),
      });
    } finally {
      setApplyingFix(false);
    }
  };

  // Summary: one credited generation per attempt (each re-roll charges again — the
  // server owns that), then apply through the provider writer.
  const generateSummary = async (stage, isReroll) => {
    if (!stage || !draftId) return;
    setSummaryBusy(true);
    // Send the gaps off the open fix marker — the terms the summary row was flagged for.
    // Without them the rewrite is generic, and the free recompute that follows re-scores
    // an identical keyword set: the user pays a credit and watches the band not move.
    const missingKeywords = openFix(messages)?.missingKeywords || [];
    try {
      const res = await CVService.coachSummary({
        draftId,
        stage,
        model: genModelId,
        missingKeywords,
      });
      const draft = res.summary || '';
      setSummaryDraft(draft);
      setSummaryWasReroll(!!isReroll);
      await persistStudioPending({
        kind: 'summary',
        workflow: 'fix',
        stage,
        draft,
        wasReroll: !!isReroll,
      });
      if (res.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
    } catch (e) {
      toast.error(
        e?.response?.data?.code === 'INSUFFICIENT_CREDITS'
          ? t('ariaStudio.chat.toast.summaryInsufficientCredits')
          : t('ariaStudio.chat.toast.summaryWriteFailed')
      );
    } finally {
      setSummaryBusy(false);
    }
  };

  const applySummaryDraft = async (text) => {
    setApplyingFix(true);
    try {
      const res = await applySummary(text);
      if (!res?.ok) return;
      if (!(await persistStudioPending(null))) return;
      setSummaryDraft('');
      await finishFix({ what: t('ariaStudio.chat.aTailoredSummary') });
    } finally {
      setApplyingFix(false);
    }
  };

  // ─── Skills, the FIX path ───
  //
  // The same grounded generation the BUILD track runs — model-picked skills, in real
  // categories, drawn from this CV's own roles/projects/education and the JD. It replaces
  // a checklist of raw JD requirement SENTENCES ("Previous experience in a hospitality
  // role"), which were never skills and landed on the CV uncategorized.
  //
  // Everything below mirrors the build handlers except how it CLOSES: a fix ends in
  // finishFix (applied record + free recompute + movement report), not the section hub.
  const generateFixSkills = async () => {
    if (!draftId) return;
    setRoleBusy('skills');
    try {
      const r = await CVService.generateSkills(
        cvData.education,
        cvData.experience,
        cvData.projects,
        cvData.targetJob?.description,
        draftId,
        genModelId
      );
      const data = {
        suggestions: r.suggestions || [],
        bestForRole: r.bestForRole || [],
        reviewGroups: r.reviewGroups || null,
      };
      setFixSkillsData(data);
      // PAID output, so persisting is load-bearing: a refresh must return the suggestions
      // the user already bought rather than charging for them twice. `workflow` is what
      // sends derivePhase back to fix:skills instead of build:skills.
      await persistStudioPending({ kind: 'skills', workflow: 'fix', data });
      if (r.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: r.remainingCredits }));
      }
    } catch (e) {
      if ([402, 403].includes(e?.response?.status)) {
        push({
          who: 'aria',
          text: t('ariaStudio.chat.skillsInsufficientCredits', {
            cost: costForActionTier('GENERATE_SKILLS', tierOf(genModelId)) ?? 10,
          }),
        });
      } else {
        toast.error(t('ariaStudio.chat.toast.skillsPullFailed'));
      }
    } finally {
      setRoleBusy(null);
    }
  };

  // The picks carry their REAL categories from the generation — which is what ends the
  // "Uncategorized" wall the old checklist produced.
  const addPickedFixSkills = async (picked) => {
    setApplyingFix(true);
    try {
      const res = await applySkills(picked);
      if (!res?.ok) return;
      // Every pick was already on the CV. applySkills de-dupes case-insensitively and
      // returns BEFORE saving, so nothing changed: finishing here would land a green
      // "Added 0 skills" receipt and spend a recompute that can only report no movement.
      if (res.added === 0) {
        ariaSays(t('ariaStudio.chat.manualSkillsAllDupes'));
        return;
      }
      if (!(await persistStudioPending(null))) return;
      setFixSkillsData(null);
      await finishFix({
        what: t('ariaStudio.chat.nSkills', { n: res.added }),
        applied: picked,
      });
    } finally {
      setApplyingFix(false);
    }
  };

  // Free manual entry mirrors the CV builder: each Studio form submission carries a
  // name + category. String support remains for any persisted/legacy caller.
  const addManualFixSkills = async (input) => {
    const skills =
      typeof input === 'string'
        ? input
            .split(',')
            .map((name) => ({ name: name.trim(), category: 'Other' }))
            .filter(({ name }) => name)
        : input?.name?.trim()
          ? [{ name: input.name.trim(), category: input.category || 'Other' }]
          : [];
    if (!skills.length) return;
    setRoleBusy('skills');
    try {
      const res = await applySkills(skills);
      if (res?.ok) {
        if (res.added) {
          setFixSkillsAdded((n) => n + res.added);
          ariaSays(t('ariaStudio.chat.manualSkillsAdded', { n: res.added }));
        } else {
          ariaSays(t('ariaStudio.chat.manualSkillsAllDupes'));
        }
      }
    } finally {
      setRoleBusy(null);
    }
  };

  // Done. Nothing added → just close: no receipt, and no recompute that could only report
  // a score standing still.
  const finishFixSkills = async () => {
    setFixSkillsData(null);
    if (!fixSkillsAdded) {
      // Declared below with the rest of the fix-loop exits, but only ever CALLED from a
      // card callback — by which point the whole component body has run. Same pattern as
      // startInterview above; hoisting it would split the fix loop in two.
      // eslint-disable-next-line no-use-before-define
      cancelFix();
      return;
    }

    await finishFix({ what: t('ariaStudio.chat.nSkills', { n: fixSkillsAdded }), applied: [] });
  };

  // ─── Build track ───

  // Roadmap accepted → create the real draft NOW. Phase 2 resolves entries server-side
  // by _sortId, so the document has to exist before any of that can be written into.
  const beginBuild = async () => {
    if (working) return;
    setWorking(true);
    try {
      const res = await startBuild({ model: modelId });
      if (res?.paywall) {
        onPaywall?.();
        return;
      }
      if (!res) return; // startBuild already surfaced the failure
      push({ who: 'buildintro' }, { who: 'buildstart', draftId: res.draftId });
      setPhase('build:career-stage');
      ariaSays(t('ariaStudio.chat.beginBuild'));
    } finally {
      setWorking(false);
    }
  };

  // The build's job question reuses the SAME JobCaptureCard as the tailor track, then
  // reads the JD through the same free keyword + brief-preview pass.
  const buildCaptureJob = async ({ jobTitle, jobDescription }) => {
    setReading(true);
    let brief = null;
    try {
      const res = await CVService.studioBriefPreview({
        jobTitle,
        jobDescription,
        model: modelId,
      });
      brief = res?.brief || null;
    } catch (err) {
      console.error('brief-preview failed', err);
    }
    // Auto-name the build from its job — mirroring the tailor path's job-derived title.
    // Only while the CV is still unnamed, so a title the user typed is never overwritten.
    const autoTitle = isUnnamedCv(cvData?.title)
      ? t('ariaStudio.chat.cvForJob', { jobTitle })
      : null;
    // Persist the job onto the draft so every later section is JD-grounded.
    const previousTargetJob = cvData?.targetJob || {};
    const previousTitle = cvData?.title;
    updateCvData({
      targetJob: { ...(cvData?.targetJob || {}), title: jobTitle, description: jobDescription },
      ...(autoTitle ? { title: autoTitle } : {}),
    });
    if (draftId) {
      try {
        await CVService.saveDraft({
          _id: draftId,
          // DOT NOTATION, deliberately. saveDraft hands `data` straight to
          // findByIdAndUpdate — an implicit $set — and $set on `targetJob` REPLACES the
          // entire subdocument. Sending a bare { title, description } silently destroyed
          // its siblings: the Role Brief buildStart had just written, the CACHED (already
          // paid for) aiKeywords, and the `source` flag marking an AI-drafted JD, whose
          // loss makes a score computed against a synthetic posting render as if it came
          // from a real one. These two paths $set only themselves.
          //
          // Not a spread of the client's copy: that persists whatever this tab happens to
          // hold and re-introduces the stale-snapshot lost update avoided elsewhere here.
          'targetJob.title': jobTitle,
          'targetJob.description': jobDescription,
          ...(autoTitle ? { title: autoTitle } : {}),
        });
      } catch (err) {
        console.error('Failed to save the build target job', err);
        // Local-only rollback: the save failed, so the DB was never touched and the
        // whole previous subdocument is exactly what this client held before.
        updateCvData({ targetJob: previousTargetJob, title: previousTitle });
        setReading(false);
        toast.error(t('ariaStudio.chat.toast.saveFailed'));
        return;
      }
    }
    setReading(false);
    push({ who: 'jobcard', jobTitle, jobDescription, keywords: [], brief });
    setPhase('build:brief');
    ariaSays(
      brief
        ? t('ariaStudio.chat.buildJobDoneWithBrief', { role: brief.role || jobTitle })
        : t('ariaStudio.chat.buildJobDoneNoBrief')
    );
  };

  const buildSkipJob = () => {
    push({ who: 'buildjobdone', skipped: true });
    setPhase('build:contact');
    ariaSays(t('ariaStudio.chat.buildSkipJob'));
  };

  // ─── Build track: confirm Aria's read of the target job ───
  const confirmBuildBrief = () => {
    advance(() => {
      push({ who: 'buildjobdone' });
      setPhase('build:contact');
    }, t('ariaStudio.chat.thinking.savingBrief'));
  };

  // Edit re-opens the job form so the JD can be corrected and re-previewed.
  const editBuildBrief = () => {
    setEditingJob(true);
    setBuildJobOpen(true);
    setPhase('build:job');
  };

  const confirmContact = async (info) => {
    setApplyingFix(true);
    try {
      // A build that SKIPPED the job has no job-derived name — fall back to the user's
      // first name (`${first}'s CV`). Only when still unnamed AND no job named it already
      // (buildCaptureJob's guard), and never fabricated: no name available → leave it, the
      // header rename covers it.
      const first =
        isUnnamedCv(cvData?.title) && !(cvData?.targetJob?.title || '').trim()
          ? firstNameFrom(info)
          : '';
      const autoTitle = first ? t('ariaStudio.chat.firstNamesCv', { first }) : null;
      const previousInfo = cvData?.personalInfo;
      const previousTitle = cvData?.title;
      if (info) updateCvData({ personalInfo: info, ...(autoTitle ? { title: autoTitle } : {}) });
      if (draftId && info) {
        try {
          await CVService.saveDraft({
            _id: draftId,
            personalInfo: info,
            ...(autoTitle ? { title: autoTitle } : {}),
          });
        } catch (err) {
          console.error('Failed to save contact details', err);
          updateCvData({ personalInfo: previousInfo, title: previousTitle });
          toast.error(t('ariaStudio.chat.toast.saveFailed'));
          return;
        }
      }
      advance(() => {
        push({ who: 'contactdone' });
        setPhase('build:sections');
        ariaSays(t('ariaStudio.chat.confirmContactDone'));
      }, t('ariaStudio.chat.thinking.contactSaved'));
    } finally {
      setApplyingFix(false);
    }
  };

  // ─── Entry sections (work history · projects · education) ───
  //
  // ONE loop, parameterised by section. Work history, projects and education differ only
  // in which fields they ask for and which list they persist to — forking the loop per
  // section would triple the places a pin/prune/persist bug could hide.

  // Create a REAL entry, then pin it. The entry has to exist on the saved draft before
  // any /coach call, because generate-bullets resolves its target by _sortId server-side —
  // a locally-invented placeholder would have nothing to write into.
  const startEntry = async (section) => {
    if (roleBusy) return null;
    setRoleBusy('next');
    try {
      const sortId =
        section === 'project'
          ? await addProject()
          : section === 'education'
            ? await addEducation()
            : await addRole();
      if (!sortId) return null;
      push({ who: 'pinrole', sortId, section });
      setPhase(`build:${section}`);
      return sortId;
    } finally {
      setRoleBusy(null);
    }
  };

  const SECTION_OPENER = {
    experience: t('ariaStudio.chat.sectionOpener.experience'),
    project: t('ariaStudio.chat.sectionOpener.project'),
    education: t('ariaStudio.chat.sectionOpener.education'),
  };

  const enterSection = async (section) => {
    const sortId = await startEntry(section);
    if (sortId) ariaSays(SECTION_OPENER[section]);
  };

  const pickCareerStage = (stage) => {
    advance(async () => {
      setRoleBusy('career-stage');
      try {
        const saved = await setCareerStage(stage);
        if (!saved) return;
        push({ who: 'careerstage', stage });
        setPhase('build:job');
      } finally {
        setRoleBusy(null);
      }
    }, t('ariaStudio.chat.thinking.notingThatDown'));
  };

  const skipCareerStage = () => {
    advance(() => {
      push({ who: 'careerstage', skipped: true });
      setPhase('build:job');
    }, t('ariaStudio.chat.thinking.notingThatDown'));
  };

  // Projects are genuinely optional — plenty of experienced people have none worth
  // listing, and pressing them would produce filler. Skipping leaves NO entry behind.
  const skipSection = (section, marker) => {
    advance(() => {
      push({ who: marker, skipped: true });
      setPhase('build:sections');
      ariaSays(
        section === 'project' ? t('ariaStudio.chat.skipProject') : t('ariaStudio.chat.skipOther')
      );
    }, t('ariaStudio.chat.thinking.movingOn'));
  };

  // Each capture writes THROUGH to the draft, so the pinned card — which renders from the
  // entry, not from here — updates as a consequence rather than being told separately.
  const captureRoleField = async (patch) => {
    if (!pinnedEntry) return;
    // Updating the live entry changes `pinnedStage`, which would otherwise mount the
    // next capture card before Aria's acknowledgement starts. Keep that swap behind
    // the same short "noting this down" beat used by the other card transitions.
    setTransitionLabel(t('ariaStudio.chat.thinking.notingThatDown'));
    setRoleBusy('field');
    try {
      // The context writer owns the persistence: optimistic local update, narrow
      // { _id, <one list key> } save, rollback + toast if it fails. Doing it here as well
      // was ~15 lines of the same optimistic-save code, and a second place for the
      // narrow-patch invariant to drift.
      const r = await applyEntryEdit(pinnedSectionKey, pinnedEntry._sortId, patch);
      if (!r.ok) return; // applyEntryEdit already rolled back + toasted
      if (patch.entryType) {
        push({
          who: 'user',
          text: t(`ariaStudio.chat.experienceType.${patch.entryType}`),
          selected: true,
        });
      }
      // Aria acknowledges and asks for the next missing thing. Reading the stage off the
      // UPDATED entry keeps the question in step with the document.
      const updated = { ...pinnedEntry, ...patch };
      const stage = roleStage(updated, pinnedSectionKey, { typePicked: !!pinnedType });
      const NEXT_LINE = {
        company: t('ariaStudio.chat.nextLine.company'),
        dates: t('ariaStudio.chat.nextLine.dates'),
        school: t('ariaStudio.chat.nextLine.school'),
        graduationDate: t('ariaStudio.chat.nextLine.graduationDate'),
        achievements:
          pinnedSectionKey === 'project'
            ? t('ariaStudio.chat.nextLine.achievementsProject', {
                title: updated.title || t('ariaStudio.chat.itFallback'),
              })
            : t('ariaStudio.chat.nextLine.achievementsRole', {
                company: updated.company || t('ariaStudio.chat.thisJobFallback'),
              }),
        entryType: t('ariaStudio.chat.nextLine.roleTitle'),
      };
      if (NEXT_LINE[stage]) ariaSays(NEXT_LINE[stage]);
      else if (stage === 'complete' && pinnedSectionKey === 'education')
        ariaSays(t('ariaStudio.chat.educationNoBullets'));
    } finally {
      setTransitionLabel(null);
      setRoleBusy(null);
    }
  };

  // File the finished entry into the stream as a record, then open a fresh one.
  const nextEntry = async () => {
    if (!pinnedEntry || roleBusy) return;
    advance(async () => {
      push(
        {
          who: 'rolerecord',
          sortId: pinnedEntry._sortId,
          section: pinnedSectionKey,
        },
        { who: 'unpinrole' }
      );
      const sortId = await startEntry(pinnedSectionKey);
      if (sortId) {
        ariaSays(
          pinnedSectionKey === 'project'
            ? t('ariaStudio.chat.nextEntry.project')
            : pinnedSectionKey === 'education'
              ? t('ariaStudio.chat.nextEntry.education')
              : t('ariaStudio.chat.nextEntry.experience')
        );
      }
    }, t('ariaStudio.chat.thinking.settingUpNext'));
  };

  const DONE_MARKER = {
    experience: 'experiencedone',
    project: 'projectsdone',
    education: 'educationdone',
  };

  // There are TWO legitimate ways a build is finished:
  //   1. its live document passes the canonical completeness rules; or
  //   2. its transcript reached summarydone (including an intentionally skipped summary).
  // derivePhase already treats both as build:done. Edit handlers must use the same rule,
  // otherwise a CV can visibly show the finish card, then a skills edit makes Aria claim
  // the summary is still next and strands the user on the section hub.
  const completedBuildSession =
    cvData?.studioKind === 'build' &&
    (messages.some((message) => message?.who === 'summarydone') || finishableNow(cvData));

  // A build can be reopened from its finish card to improve one section. Once that CV is
  // already content-complete, applying the improvement must close the edit and restore
  // the finish card — walking the section hub again makes Aria look as though she forgot
  // the document was finished. Callers decide whether a pin needs clearing because
  // section-level edits (skills/summary) do not own one.
  const returnToCompletedBuild = ({ unpin = false } = {}) => {
    if (unpin) push({ who: 'unpinrole' });
    setPhase('build:done');
    ariaSays(t('ariaStudio.chat.editUpdated'));
  };

  const finishSection = () => {
    if (roleBusy) return;
    const section = pinnedSectionKey;
    const list = SECTION_LIST[section] || 'experience';
    // An untouched entry would otherwise sit in the CV as an empty row forever — and,
    // worse, tick its section in the completeness view.
    const isBlank = pinnedEntry && entryProgress(pinnedEntry, section).done === 0;
    // A content-complete CV means this is an EDIT, not a build step: don't record a duplicate
    // receipt, don't stamp a DONE marker, don't walk the section chain — just close the entry
    // and return to the finish card.
    const editing = completedBuildSession;
    if (!isBlank && pinnedEntry && !editing) {
      push({ who: 'rolerecord', sortId: pinnedEntry._sortId, section });
    }
    advance(() => {
      if (isBlank && draftId) {
        const pruned = (cvData[list] || []).filter((e) => e._sortId !== pinnedEntry._sortId);
        updateCvData({ [list]: pruned });
        CVService.saveDraft({ _id: draftId, [list]: pruned }).catch((err) =>
          console.error('Failed to prune the empty entry', err)
        );
      }
      if (editing) {
        returnToCompletedBuild({ unpin: true });
      } else {
        push({ who: 'unpinrole' }, { who: DONE_MARKER[section] });
        setPhase('build:sections');
        ariaSays(
          section === 'experience'
            ? t('ariaStudio.chat.finishSection.experience')
            : section === 'project'
              ? t('ariaStudio.chat.finishSection.project')
              : t('ariaStudio.chat.finishSection.education')
        );
      }
    }, t('ariaStudio.chat.thinking.sectionWrappedUp'));
  };

  // The project type — sent as an ordinary user turn, because that's where the backend's
  // project prompt reads it from, plus a marker so the chips don't re-ask on refresh.
  const pickProjectType = (type) => {
    if (!pinnedEntry) return;
    const sortId = pinnedEntry._sortId;
    advance(() => {
      // PERSIST the type on the ENTRY as well as pushing the marker. The marker is what
      // the build flow and refresh recovery read; the entry is what survives everything
      // the marker cannot: a tailored COPY inherits it (projects clone), and an "Edit
      // with Aria" interview opened later can still see it — exactly the way an
      // experience entry carries its own entryType. Deliberately NOT awaited: the type
      // is already in the thread, so the conversation must not block on a save, and
      // applyEntryEdit owns its narrow patch, rollback and toast if it fails.
      applyEntryEdit('project', sortId, { entryType: type.key });
      push(
        { who: 'user', text: t(type.messageKey), selected: true },
        { who: 'projecttype', sortId: pinnedEntry._sortId, type: type.key, labelKey: type.labelKey }
      );
      ariaSays(t('ariaStudio.chat.pickProjectType'));
    }, t('ariaStudio.chat.thinking.notingThatDown'));
  };

  // ─── Skills ───
  // The SAME call the CV builder's AriaChat makes, including passing the target-job
  // description so the JD informs the suggestions — the draft already carries it, so
  // nothing is re-extracted.
  const generateBuildSkills = async () => {
    if (!draftId) return;
    setRoleBusy('skills');
    try {
      const r = await CVService.generateSkills(
        cvData.education,
        cvData.experience,
        cvData.projects,
        cvData.targetJob?.description,
        draftId,
        genModelId
      );
      const data = {
        suggestions: r.suggestions || [],
        bestForRole: r.bestForRole || [],
        reviewGroups: r.reviewGroups || null,
      };
      setSkillsData(data);
      await persistStudioPending({ kind: 'skills', data });
      if (r.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: r.remainingCredits }));
      }
    } catch (e) {
      if ([402, 403].includes(e?.response?.status)) {
        push({
          who: 'aria',
          text: t('ariaStudio.chat.skillsInsufficientCredits', {
            cost: costForActionTier('GENERATE_SKILLS', tierOf(genModelId)) ?? 10,
          }),
        });
      } else {
        toast.error(t('ariaStudio.chat.toast.skillsPullFailed'));
      }
    } finally {
      setRoleBusy(null);
    }
  };

  const addPickedSkills = async (picked) => {
    // Capture this before the optimistic writer runs. This is an edit session when the
    // document was already complete on entry; applying another skill must return to the
    // completion card instead of reopening the builder's section sequence.
    const editingCompletedBuild = completedBuildSession;
    const res = await applySkills(picked);
    if (!res?.ok) return;
    if (!(await persistStudioPending(null))) return;
    advance(() => {
      setSkillsData(null);
      if (editingCompletedBuild) {
        returnToCompletedBuild();
      } else {
        push({ who: 'skillsdone', n: res?.added ?? picked.length });
        setPhase('build:sections');
        ariaSays(t('ariaStudio.chat.skillsInDone', { n: res?.added ?? picked.length }));
      }
    }, t('ariaStudio.chat.thinking.skillsSaved'));
  };

  // Free manual entry is categorized, matching the CV Builder's skill form. String
  // support keeps the function compatible with older calls while new form submissions
  // carry the selected category through to the durable CV record.
  const addManualSkills = async (input) => {
    const skills =
      typeof input === 'string'
        ? input
            .split(',')
            .map((name) => ({ name: name.trim(), category: 'Uncategorized' }))
            .filter(({ name }) => name)
        : input?.name?.trim()
          ? [{ name: input.name.trim(), category: input.category || 'Uncategorized' }]
          : [];
    if (!skills.length) return;
    setRoleBusy('skills');
    try {
      const res = await applySkills(skills);
      if (res?.ok) {
        if (res.added) {
          setManualSkillsAdded((n) => n + res.added);
          ariaSays(t('ariaStudio.chat.manualSkillsAdded', { n: res.added }));
        } else {
          ariaSays(t('ariaStudio.chat.manualSkillsAllDupes'));
        }
      }
    } finally {
      setRoleBusy(null);
    }
  };

  // Close out the manual-entry loop with the SAME section-advance addPickedSkills
  // runs. No persistStudioPending call — manual entry never creates a pending
  // generation, so there's nothing to discard.
  const finishManualSkills = () => {
    const editingCompletedBuild = completedBuildSession;
    advance(() => {
      setSkillsData(null);
      if (editingCompletedBuild) {
        returnToCompletedBuild();
      } else {
        push({ who: 'skillsdone', n: manualSkillsAdded });
        setPhase('build:sections');
        ariaSays(t('ariaStudio.chat.skillsInDone', { n: manualSkillsAdded }));
      }
    }, t('ariaStudio.chat.thinking.skillsSaved'));
  };

  // ─── Summary ───
  // Runs LAST so it can draw on the whole document. Same /coach/summary + stage chips
  // the V1 fix loop uses; same SummaryFixCard.
  const generateBuildSummary = async (stage, isReroll) => {
    if (!stage || !draftId) return;
    setSummaryBusy(true);
    try {
      const res = await CVService.coachSummary({ draftId, stage, model: genModelId });
      const draft = res.summary || '';
      setSummaryDraft(draft);
      setSummaryWasReroll(!!isReroll);
      await persistStudioPending({
        kind: 'summary',
        workflow: 'build',
        stage,
        draft,
        wasReroll: !!isReroll,
      });
      if (res.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
    } catch (e) {
      toast.error(
        e?.response?.data?.code === 'INSUFFICIENT_CREDITS'
          ? t('ariaStudio.chat.toast.summaryInsufficientCredits')
          : t('ariaStudio.chat.toast.summaryWriteFailed')
      );
    } finally {
      setSummaryBusy(false);
    }
  };

  const applyBuildSummary = async (text) => {
    setApplyingFix(true);
    try {
      const res = await applySummary(text);
      if (!res?.ok) return;
      if (!(await persistStudioPending(null))) return;
      advance(() => {
        setSummaryDraft('');
        push({ who: 'summarydone' });
        setPhase('build:done');
        ariaSays(t('ariaStudio.chat.buildSummaryDone'));
      }, t('ariaStudio.chat.thinking.summarySaved'));
    } finally {
      setApplyingFix(false);
    }
  };

  // ─── Build finish ───
  // Hand the finished MASTER off to a NEW tailoring session. A tailoring clones and owns
  // its own transcript, so this must not continue the build session — newSession unbinds
  // first and the clone happens through the normal tailor-start path.
  const tailorThisCv = async () => {
    if (!draftId) return;
    await newSession('tailor', {
      id: draftId,
      title: cvData?.title || t('ariaStudio.cvPicker.untitledCv'),
    });
  };

  // Certifications — a plain sub-list of education, no AI, no credits.
  const addCertification = async (cert) => {
    const next = [...(cvData?.certifications || []), cert];
    updateCvData({ certifications: next });
    if (draftId) {
      try {
        await CVService.saveDraft({ _id: draftId, certifications: next });
      } catch (err) {
        console.error('Failed to save certification', err);
        toast.error(t('ariaStudio.chat.toast.saveFailed'));
      }
    }
  };

  const removeCertification = async (index) => {
    const next = (cvData?.certifications || []).filter((_, i) => i !== index);
    updateCvData({ certifications: next });
    if (draftId) {
      try {
        await CVService.saveDraft({ _id: draftId, certifications: next });
      } catch (err) {
        console.error('Failed to remove certification', err);
      }
    }
  };

  // ─── Finish: get the file out ───

  // The tailored copy rendered as the pseudo-application the templates expect. Exactly
  // the conversion ResumeReview does for a draft (generateMarkdownFromDraft), so the
  // Studio's PDF and the editor's PDF are the same document.
  const printApplication = cvData
    ? {
        _id: cvData._id,
        optimizedCV: generateMarkdownFromDraft(cvData).optimizedCV,
        templateId: cvData.templateId || DEFAULT_TEMPLATE_ID,
        personalInfo: cvData.personalInfo,
        isDraft: true,
        // Drives the section labels in the rendered CV (and therefore the PDF).
        outputLang: cvData.outputLang,
      }
    : null;

  // Back out of a fix without applying anything. Closes the session so derivePhase
  // returns to the breakdown on a refresh too.
  const cancelFix = () => {
    setSummaryDraft('');
    setSummaryWasReroll(false);
    push({ who: 'fixend' });
    setPhase('results');
  };

  // ─── Project ideas ───
  //
  // The generative mirror of the entry picker: when the role wants a project and the CV
  // has none, Aria proposes three she can defend from the user's OWN CV, and one tap
  // starts the ordinary FREE focused interview on the chosen one.

  // Enough material for a GROUNDED suggestion? Deliberately the same test the server
  // runs, so the hopeless case doesn't even spend the round trip.
  const cvGroundedForIdeas = () =>
    (cvData?.experience || []).filter(hasSubstance).length > 0 ||
    (cvData?.education || []).filter(hasSubstance).length > 0 ||
    (cvData?.skills || []).filter(Boolean).length >= 3;

  // Fetch + persist. EVERY failure returns [] rather than throwing, because the caller's
  // contract is "fall through to the blank project" — a model outage must never leave
  // the projects section unreachable.
  const fetchProjectIdeas = async (context) => {
    if (!draftId) return [];
    ideasAskedRef.current = true;
    setIdeasBusy(true);
    try {
      const res = await CVService.studioProjectIdeas({ draftId });
      const ideas = Array.isArray(res?.ideas) ? res.ideas : [];
      if (res?.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      if (ideas.length) {
        setProjectIdeas(ideas);
        // PAID output — persisted immediately, so a refresh returns the list the user
        // already bought instead of quietly buying it again.
        await persistStudioPending({ kind: 'projectideas', ideas, context });
      }
      return ideas;
    } catch (err) {
      // Insufficient credits is the one failure worth naming: the user can act on it,
      // and silence would read as "Aria had no ideas" when she was never asked.
      if ([402, 403].includes(err?.response?.status)) {
        ariaSays(t('ariaStudio.projectIdeas.insufficientCredits'));
      } else if (err?.response?.data?.code !== 'NOT_ENOUGH_CV') {
        console.error('project ideas failed', err);
      }
      return [];
    } finally {
      setIdeasBusy(false);
    }
  };

  // Build-track projects hub. Offer ideas first — but fall through to today's blank
  // project on an ungrounded CV, a failed fetch or an empty result. That fallthrough is
  // what lets this ship without touching the section it fronts.
  const offerProjectIdeas = async () => {
    if (roleBusy || ideasBusy) return;
    // Feature OFF → the same fallthrough the empty-ideas case already uses: the normal
    // blank-project flow (type chip → interview), with nothing generated and nothing charged.
    if (!STUDIO_PROJECT_IDEAS_ENABLED) {
      enterSection('project');
      return;
    }
    if (!draftId || !cvGroundedForIdeas()) {
      enterSection('project');
      return;
    }
    const ideas = await fetchProjectIdeas('build');
    if (!ideas.length) {
      enterSection('project');
      return;
    }
    setPhase('build:project-ideas');
  };

  // "Build this with Aria." Creates the project under the idea's title, replays the type
  // pick as a REAL thread turn — the backend's project prompt reads the type from the
  // thread, not from a parameter — and hands over to the normal interview. No new
  // charging path and no new interview code.
  //
  // NOT named `useIdea`: rules-of-hooks reads any `useX` as a hook and rejects calling it
  // from a JSX callback.
  const buildFromIdea = async (idea, contextArg) => {
    if (!idea || roleBusy) return;
    const context = contextArg || cvData?.studioPending?.context || 'build';
    setRoleBusy('next');
    try {
      const sortId = await addProject({ title: idea.title });
      if (!sortId) return; // addProject already toasted
      setProjectIdeas(null);
      await persistStudioPending(null);

      const typeDef = PROJECT_TYPES.find((pt) => pt.key === idea.type) || PROJECT_TYPES[0];
      // pickProjectType's EXACT pair, so the type chip is skipped rather than re-asked.
      const typeTurns = [
        { who: 'user', text: t(typeDef.messageKey), selected: true },
        { who: 'projecttype', sortId, type: typeDef.key, labelKey: typeDef.labelKey },
      ];

      if (context === 'fix') {
        // A "Build this" from inside a FIX must land in the FIX loop, so finishFix still
        // closes the session and re-scores. Same marker startInterview writes.
        const fix = openFix(messages);
        push(...typeTurns, {
          who: 'fixstart',
          mode: 'coach',
          sectionKey: fix?.sectionKey || 'projects',
          sectionLabel: fix?.sectionLabel,
          missingKeywords: fix?.missingKeywords || [],
          entry: { section: 'project', sortId, title: idea.title },
        });
        setPhase('fix:coach');
      } else {
        push(...typeTurns, { who: 'pinrole', sortId, section: 'project' });
        setPhase('build:project');
      }

      // An ARIA turn, NOT a user one. The idea is a PROPOSAL: putting its one-liner in
      // the user's mouth would have Aria claiming they'd already built it.
      ariaSays(t('ariaStudio.chat.projectIdeaOpener', { title: idea.title }));
    } finally {
      setRoleBusy(null);
    }
  };

  // "None of these" — exactly the blank project they'd have got without the card.
  const startBlankProject = async (contextArg) => {
    const context = contextArg || cvData?.studioPending?.context || 'build';
    setProjectIdeas(null);
    await persistStudioPending(null);
    if (context !== 'fix') {
      enterSection('project');
      return;
    }
    if (roleBusy) return;
    setRoleBusy('next');
    try {
      const sortId = await addProject();
      if (!sortId) return;
      startInterview(
        { sortId, title: '' },
        t('ariaStudio.chat.nextLine.achievementsProject', {
          title: t('ariaStudio.chat.itFallback'),
        })
      );
    } finally {
      setRoleBusy(null);
    }
  };

  const skipProjectIdeas = async (contextArg) => {
    const context = contextArg || cvData?.studioPending?.context || 'build';
    setProjectIdeas(null);
    await persistStudioPending(null);
    if (context === 'fix') cancelFix();
    else skipSection('project', 'projectsdone');
  };

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (text.length < 2 || thinking) return;
    const next = [...messages, { who: 'user', text }];
    push({ who: 'user', text });
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // In a build session the docked input is for REAL questions — "should I include a
    // job I was only in for 3 months?" — so route it to the existing unfocused coach
    // rather than nudging the user back at a card. Crucially it's UNFOCUSED: no
    // `focus` means no build-with turn, so the pinned role is not touched by asking.
    if (draftId && phase.startsWith('build:')) {
      setThinking(true);
      try {
        const r = await CVService.coachChat({
          draftId,
          currentStepId:
            pinnedEntry && pinnedSectionKey === 'experience'
              ? 'history'
              : pinnedEntry && pinnedSectionKey === 'project'
                ? 'projects'
                : pinnedEntry && pinnedSectionKey === 'education'
                  ? 'education'
                  : phase === 'build:job' || phase === 'build:brief'
                    ? 'target_job'
                    : phase === 'build:contact'
                      ? 'heading'
                      : phase === 'build:skills'
                        ? 'skills'
                        : phase === 'build:summary'
                          ? 'summary'
                          : phase === 'build:done'
                            ? 'finalize'
                            : '',
          messages: next
            .filter((m) => m.who === 'aria' || m.who === 'user')
            .map((m) => ({ who: m.who, text: m.text })),
          model: modelId,
          // no focus → a general answer, metered by the shared daily allowance
        });
        push({ who: 'aria', text: r.reply });
        // Metered turn (flagship, or past the daily free pool) → refresh the wallet pill.
        if (r.remainingCredits != null) {
          window.dispatchEvent(new CustomEvent('credit_updated', { detail: r.remainingCredits }));
        }
      } catch (e) {
        const code = e?.response?.data?.code;
        push({
          who: 'aria',
          text:
            // Pro model, no credits — switching back to Standard is free, so say that.
            code === 'INSUFFICIENT_CREDITS'
              ? t('ariaStudio.chat.proNeedsCredits')
              : code === 'CHAT_LIMIT_REACHED'
                ? t('ariaStudio.chat.chatLimitReached')
                : t('ariaStudio.chat.chatUnreachable'),
        });
      } finally {
        setThinking(false);
      }
      return;
    }

    // Tailor intake stays card-driven; free typing gets a nudge back to the card in play.
    ariaSays(
      phase === 'results'
        ? t('ariaStudio.chat.freeTypingResults')
        : t('ariaStudio.chat.freeTypingOther')
    );
  };

  // The brief rides on the jobcard marker, so the confirm card re-renders from history
  // after a refresh without re-previewing.
  const latestJob = [...messages].reverse().find((m) => m.who === 'jobcard');
  // The live snapshot off the draft — NOT off a marker, so a free recompute updates
  // every card without rewriting history.
  const scan = cvData?.studioScan;
  // Progress is DERIVED from the live document on every render — never stored — so the
  // roadmap and the panel can't claim a section is done when it's actually empty.
  const progress = buildProgress(cvData, messages);
  const savedStudioThread = cvData?.coachChats?.studio;
  const waitingForSavedThread =
    !!draftId &&
    Array.isArray(savedStudioThread) &&
    savedStudioThread.length > 0 &&
    messages.every((message) => message._opening);
  const restoringSession = !working && (loading || waitingForSavedThread);
  const studioTransition = restoringSession ? 'restore' : openingStudio ? 'opening' : null;
  // The fix session in play, read from the markers — so it survives a refresh exactly
  // the way the phase does.
  const activeFix = openFix(messages);
  // Placeholder rows are excluded for the same reason completeness ignores them: a blank
  // entry the Studio created to hold a _sortId is not something the user can choose to
  // sharpen, and offering it as "Untitled" sends the coach at an empty document.
  const fixEntries = (cvData?.[ENTRY_SOURCE[activeFix?.sectionKey]?.list] || [])
    .filter(hasSubstance)
    .map((e) => ({
      sortId: e._sortId,
      title: e.title,
      company: e.company,
      description: e.description,
    }));
  // The projects FIX with nothing to sharpen. 1.2d gave that empty picker a builder link
  // and a dismiss; PROPOSALS are the better first answer, so the card is swapped for
  // ideas — and only while there are ideas (or a fetch in flight), so an empty result
  // falls back to the picker's own empty state rather than spinning forever.
  const fixWantsIdeas =
    activeFix?.mode === 'pick' && activeFix?.sectionKey === 'projects' && fixEntries.length === 0;
  const showFixIdeas = fixWantsIdeas && (ideasBusy || !!projectIdeas?.length);

  // Mounting IS the ask on this path — there's no row to tap. `ideasAskedRef` is what
  // keeps a PAID endpoint out of the render loop when it comes back empty (or 403).
  useEffect(() => {
    // Feature OFF → never fetch. The picker's own empty state shows instead, exactly as
    // it does today when the fetch comes back with no ideas.
    if (!STUDIO_PROJECT_IDEAS_ENABLED) return;
    if (phase !== 'fix:pick' || !fixWantsIdeas) return;
    if (ideasAskedRef.current || ideasBusy || projectIdeas) return;
    fetchProjectIdeas('fix');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, fixWantsIdeas]);

  // ─── Focus mode: publish WHICH entry Aria is working on ───
  //
  // A derived MIRROR, not a second source of truth. The interview already lives in the
  // phase and the markers; this restates it as the one thing the Live Preview needs —
  // { section, sortId } — so it can MARK that row and lock its controls. Exactly three
  // states count as "Aria is working on this entry":
  //
  //   build:<section> with a pin  → the field capture / achievements interview
  //   fix:coach with an entry     → the tailor interview
  //   fix:rewrite with a target   → the before → after rewrite
  //
  // Anything else is null, so the marker disappears the moment the interview closes —
  // a fixend, an unpin, or simply moving back to results/build:sections.
  //
  // ONE effect, over primitives. Every branch is derived from state that already
  // re-renders this component, so a single recompute is both cheaper and harder to get
  // wrong than setting focus from inside each of the handlers that open one. The deps
  // are the extracted section/sortId strings rather than the marker objects, which is
  // what keeps this from re-firing on unrelated transcript pushes — and, because a
  // useState setter is stable and the effect only runs when a dep actually changes,
  // publishing a fresh object here cannot feed back into a loop.
  const focusedPinSortId =
    String(phase).startsWith('build:') && pinnedEntry ? pinnedEntry._sortId : null;
  const focusedFix = phase === 'fix:coach' ? activeFix?.entry : null;
  const focusedRewrite = phase === 'fix:rewrite' ? rewriteTarget?.entry : null;
  const focusedFixSection = focusedFix?.section || null;
  const focusedFixSortId = focusedFix?.sortId || null;
  const focusedRewriteSection = focusedRewrite?.section || null;
  const focusedRewriteSortId = focusedRewrite?.sortId || null;
  const focusNoticeSection = focusedPinSortId
    ? pinnedSectionKey
    : focusedFixSortId
      ? focusedFixSection
      : focusedRewriteSection;
  const focusNoticeSortId = focusedPinSortId || focusedFixSortId || focusedRewriteSortId;
  const focusNoticeTitle = focusedPinSortId
    ? pinnedEntry?.title
    : focusedFixSortId
      ? focusedFix?.title
      : focusedRewrite?.title;
  const focusNoticeCompany = focusedPinSortId
    ? pinnedEntry?.company
    : focusedFixSortId
      ? focusedFix?.company
      : focusedRewrite?.company;
  const focusNoticeKey = focusNoticeSortId ? `${focusNoticeSection}:${focusNoticeSortId}` : null;
  const focusNoticeRef = useRef(null);
  const focusNoticePrimedRef = useRef(false);

  // The Live Preview already receives this focus as derived state. Mirror its START and
  // END in the transcript too, so a user can see where an Aria interview began when they
  // return to the chat. The first restored state is only primed, never re-announced.
  useEffect(() => {
    const focusNotice = focusNoticeKey
      ? {
          section: focusNoticeSection,
          sortId: focusNoticeSortId,
          title: focusNoticeTitle,
          company: focusNoticeCompany,
        }
      : null;
    if (!focusNoticePrimedRef.current) {
      if (loading) return;
      const hasSavedThread = !!draftId && (cvData?.coachChats?.studio || []).length > 0;
      if (hasSavedThread && messages.some((m) => m._opening)) return;
      focusNoticeRef.current = focusNotice;
      focusNoticePrimedRef.current = true;
      return;
    }

    const previous = focusNoticeRef.current;
    const previousKey = previous ? `${previous.section}:${previous.sortId}` : null;
    if (previousKey === focusNoticeKey) return;

    if (focusNotice) push({ who: 'focus', ...focusNotice });
    else if (previous) push({ who: 'unfocus' });
    focusNoticeRef.current = focusNotice;
  }, [
    focusNoticeKey,
    focusNoticeSection,
    focusNoticeSortId,
    focusNoticeTitle,
    focusNoticeCompany,
    loading,
    draftId,
    cvData?.coachChats?.studio,
    messages,
  ]);

  useEffect(() => {
    if (focusedPinSortId) {
      setActiveEntry?.({ section: pinnedSectionKey, sortId: focusedPinSortId });
    } else if (focusedFixSortId) {
      setActiveEntry?.({ section: focusedFixSection, sortId: focusedFixSortId });
    } else if (focusedRewriteSortId) {
      setActiveEntry?.({ section: focusedRewriteSection, sortId: focusedRewriteSortId });
    } else {
      setActiveEntry?.(null);
    }
  }, [
    focusedPinSortId,
    pinnedSectionKey,
    focusedFixSection,
    focusedFixSortId,
    focusedRewriteSection,
    focusedRewriteSortId,
    setActiveEntry,
  ]);

  // The coach brings its own input while a build-with is open, so the docked one hides
  // entirely rather than sitting there disabled and competing for attention.
  // SectionCoach brings its own input whenever it's driving — the fix loop, or the
  // achievements stage of a pinned role.
  // The coach drives a pinned EXPERIENCE or PROJECT entry through its bullet interview.
  // It must stay mounted once the entry already HAS bullets (stage 'complete'), not only
  // while it has none ('achievements'): otherwise applying the first bullet flips the
  // stage to 'complete', tears the coach down, and ends the interview after one apply —
  // the user can never add a second thing to the same role. Education is excluded: it has
  // no achievements interview, so it must not mount the coach at 'complete'.
  //
  // This also subsumes the old pendingBulletsForPin case: a paid-but-unapplied generation
  // on an entry that already has bullets is 'complete' + coachable, so the coach mounts
  // and SectionCoach's own re-sync effect restores the pending results.
  const isCoachableSection = pinnedSectionKey === 'experience' || pinnedSectionKey === 'project';
  const coachDrivesPin =
    !!pinnedEntry &&
    isCoachableSection &&
    (pinnedStage === 'achievements' || pinnedStage === 'complete');
  const coachOwnsInput = phase === 'fix:coach' || coachDrivesPin;
  // Free chat is live throughout a build (asking a question must never be blocked by a
  // card), and after a scan. The tailor intake stays card-driven.
  const freeChatAllowed = phase === 'results' || phase.startsWith('build:');
  const inputDisabled =
    !!studioTransition ||
    working ||
    reading ||
    scanning ||
    applyingFix ||
    !!roleBusy ||
    !freeChatAllowed;
  // What the section menu offers next. Driven by which DONE markers exist rather than by
  // buildProgress, because "I have no projects" is a legitimate finished state that
  // completeness can't represent — the section is closed, but it will never tick.
  const closed = (marker) => messages.some((m) => m.who === marker);
  const nextSection = !closed('experiencedone')
    ? {
        key: 'experience',
        eyebrow: progress.status.experience
          ? t('ariaStudio.studioFlow.sections.experience')
          : t('ariaStudio.chat.nextUp'),
        blurb: progress.status.experience
          ? t('ariaStudio.chat.sectionMenu.experienceBlurbMore')
          : t('ariaStudio.chat.sectionMenu.experienceBlurbFirst'),
        cta: progress.status.experience
          ? t('ariaStudio.chat.sectionMenu.experienceCtaMore')
          : t('ariaStudio.chat.sectionMenu.experienceCtaFirst'),
        start: () =>
          advance(
            () => enterSection('experience'),
            t('ariaStudio.chat.thinking.openingWorkHistory')
          ),
        // Only offer to close work history once something is actually in it.
        skip: progress.status.experience ? () => skipSection('experience', 'experiencedone') : null,
        skipLabel: t('ariaStudio.chat.sectionMenu.experienceSkipLabel'),
      }
    : !closed('projectsdone')
      ? {
          key: 'project',
          eyebrow: t('ariaStudio.chat.sectionMenu.projectsEyebrow'),
          blurb: t('ariaStudio.chat.sectionMenu.projectsBlurb'),
          cta: t('ariaStudio.chat.sectionMenu.projectsCta'),
          // Ideas FIRST, blank project second — offerProjectIdeas falls through to
          // exactly this section on an ungrounded CV, a failed fetch or no ideas.
          start: () => offerProjectIdeas(),
          skip: () => skipSection('project', 'projectsdone'),

          skipLabel: t('ariaStudio.chat.sectionMenu.projectsSkipLabel'),
        }
      : !closed('educationdone')
        ? {
            key: 'education',
            eyebrow: t('ariaStudio.studioFlow.sections.education'),
            blurb: t('ariaStudio.chat.sectionMenu.educationBlurb'),
            cta: t('ariaStudio.chat.sectionMenu.educationCta'),
            start: () => enterSection('education'),
            skip: () => skipSection('education', 'educationdone'),
            skipLabel: t('ariaStudio.chat.sectionMenu.skipForNow'),
          }
        : !closed('certsdone')
          ? {
              key: 'certs',
              eyebrow: t('ariaStudio.chat.sectionMenu.certsEyebrow'),
              blurb: t('ariaStudio.chat.sectionMenu.certsBlurb'),
              cta: t('ariaStudio.chat.sectionMenu.certsCta'),
              start: () => setPhase('build:certs'),
              skip: () => {
                push({ who: 'certsdone', skipped: true });
                ariaSays(t('ariaStudio.chat.noProblem'));
              },
              skipLabel: t('ariaStudio.chat.sectionMenu.certsSkipLabel'),
            }
          : !closed('skillsdone')
            ? {
                key: 'skills',
                eyebrow: t('ariaStudio.studioFlow.sections.skills'),
                blurb: t('ariaStudio.chat.sectionMenu.skillsBlurb'),
                cta: t('ariaStudio.chat.sectionMenu.skillsCta'),
                start: () => setPhase('build:skills'),
                skip: () => {
                  push({ who: 'skillsdone', skipped: true });
                  ariaSays(t('ariaStudio.chat.skillsSkipSaid'));
                },
                skipLabel: t('ariaStudio.chat.sectionMenu.skillsSkipLabel'),
              }
            : !closed('summarydone')
              ? {
                  key: 'summary',
                  eyebrow: t('ariaStudio.chat.sectionMenu.summaryEyebrow'),
                  blurb: t('ariaStudio.chat.sectionMenu.summaryBlurb'),
                  cta: t('ariaStudio.chat.sectionMenu.summaryCta'),
                  start: () => setPhase('build:summary'),
                  skip: () => {
                    push({ who: 'summarydone', skipped: true });
                    setPhase('build:done');
                    ariaSays(t('ariaStudio.chat.summarySkipSaid'));
                  },
                  skipLabel: t('ariaStudio.chat.sectionMenu.summarySkipLabel'),
                }
              : null;

  // A card may own the stream only once nothing else does — no restore in flight, no
  // Aria turn mid-beat, no tailor-start or scan running.
  const ready =
    !studioTransition &&
    !thinking &&
    !working &&
    !reading &&
    !scanning &&
    !roleBusy &&
    !transitionLabel;

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 bg-white dark:bg-slate-900">
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence>
          {studioTransition && (
            <motion.div
              key={`studio-${studioTransition}`}
              className="absolute inset-0 z-30 flex items-center justify-center px-6 bg-white dark:bg-slate-900"
              initial={reduce ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              role="status"
              aria-live="polite"
            >
              <div className="text-center">
                <span className="aria-orbit-slow inline-block">
                  <AriaOrbit size={studioTransition === 'opening' ? 56 : 48} working />
                </span>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {t(
                    studioTransition === 'opening'
                      ? 'ariaStudio.chat.thinking.openingStudio'
                      : 'ariaStudio.chat.thinking.pickingUp'
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* The trailing padding is part of the scrollable transcript, not the composer.
            That lets the final card (and Aria's orbit beneath it) scroll clear of the
            docked input instead of being visually pressed into its top edge. */}
        <div
          ref={chatRef}
          className="absolute inset-0 chat-scroll flex flex-col gap-5 pb-12 sm:pb-14"
        >
          {/* The role being built — pinned to the top of the SCROLL AREA, so it holds
              position as the conversation grows beneath it. Rendered from the draft
              entry, so free chat, an Aria turn, or a refresh all leave it untouched.
              Always starts collapsed so it remains a glanceable status bar and never
              competes with the active question. The user controls when it opens. */}
          {pinnedEntry && (
            <div className="sticky top-0 z-20 w-full sm:w-[94%] mx-auto pb-1.5 pt-0.5">
              <PinnedEntryCard
                key={pinnedEntry._sortId}
                entry={pinnedEntry}
                section={pinnedSectionKey}
                typePicked={!!pinnedType}
                typeLabel={(() => {
                  const found = PROJECT_TYPES.find((pt) => pt.key === pinnedType);
                  return found ? t(found.labelKey) : '';
                })()}
                busy={roleBusy}
                messagePulse={pinMessage.sortId === pinnedEntry._sortId ? pinMessage.nonce : 0}
                reviewHint={
                  reviewHint?.sortId === pinnedEntry._sortId
                    ? t(
                        reviewHint.section === 'project'
                          ? 'ariaStudio.pinnedEntry.openProjectToReview'
                          : 'ariaStudio.pinnedEntry.openRoleToReview'
                      )
                    : ''
                }
                onReviewHintOpen={dismissReviewHint}
                defaultExpanded={false}
                onNextRole={nextEntry}
                onDone={finishSection}
                // CORRECT one captured field, in place on the card. Straight through to
                // the same narrow field-overwrite the interview's own capture uses —
                // optimistic apply, {_id, <list>} save, rollback + toast on failure —
                // so a typo fix is the SAME write as the answer that made it, minus the
                // conversation. Deliberately NOT the capture path in `answer`: that one
                // also advances the stage and asks the next question, and re-asking
                // "what company?" because the user fixed the role title would restart an
                // interview they already finished.
                onFieldSave={async (patch) => {
                  const r = await applyEntryEdit(pinnedSectionKey, pinnedEntry._sortId, patch);
                  // A pencil-icon correction to the role/company/project name happens
                  // AFTER Aria has already asked for achievements against the old value —
                  // silently swapping it out from under her would leave the bullets she
                  // generates next referencing a name that's no longer on the entry.
                  // Speaking up here keeps her grounded in what's actually on the card.
                  if (r.ok && (patch.title !== undefined || patch.company !== undefined)) {
                    const value = (patch.title ?? patch.company ?? '').trim();
                    if (value) {
                      const key =
                        patch.company !== undefined
                          ? 'company'
                          : pinnedSectionKey === 'project'
                            ? 'projectTitle'
                            : 'roleTitle';
                      ariaSays(t(`ariaStudio.chat.fieldCorrected.${key}`, { value }));
                    }
                  }
                  return r;
                }}
              />
            </div>
          )}

          <AnimatePresence>
            {appliedReceipt && (
              <motion.div
                key={appliedReceipt.nonce}
                role="status"
                aria-live="polite"
                className="sticky top-14 z-30 self-center pointer-events-none max-w-[88%]"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={
                  reduce
                    ? { opacity: [0, 1, 1, 0], y: [4, 0, 0, -8] }
                    : {
                        opacity: [0, 1, 1, 0],
                        x: ['0%', '0%', '0%', '34%'],
                        y: [12, 0, 0, -48],
                        scale: [0.96, 1, 1, 0.24],
                      }
                }
                transition={{ duration: reduce ? 0.7 : 1.45, times: [0, 0.16, 0.62, 1] }}
                onAnimationComplete={finishAppliedReceipt}
              >
                <div className="rounded-full border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 shadow-lg shadow-emerald-950/10 px-3.5 py-2 flex items-center gap-2 text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px]">
                    ✓
                  </span>
                  <span className="truncate">
                    {t('ariaStudio.pinnedEntry.bulletReceipt', {
                      n: appliedReceipt.n,
                      title: appliedReceipt.title,
                    })}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.map((m, i) => {
            // Typed messages keep the strong ink bubble. Guided choices use the quieter
            // selected-answer treatment so a returning user can read how they steered Aria.
            if (m.who === 'user') {
              if (m.selected) {
                return (
                  <SelectedAnswerBubble key={i} reduce={reduce}>
                    {m.text}
                  </SelectedAnswerBubble>
                );
              }
              return (
                <motion.div
                  key={i}
                  ref={(el) => {
                    msgDomRef.current[i] = el;
                  }}
                  className="self-end max-w-[92%] bg-[rgb(242,240,240)] text-[rgb(31,31,31)] dark:bg-slate-800 dark:text-slate-50 rounded-[28px] px-7 py-5 text-[17px] leading-6 whitespace-pre-wrap"
                  {...bubbleAnim('user', reduce)}
                >
                  {m.text}
                </motion.div>
              );
            }

            // ── Persisted markers — each one re-renders a completed step from history ──

            // Mode pick — a durable user-side echo of the fork taken.
            if (m.who === 'modepick') {
              return (
                <SelectedAnswerBubble key={i} reduce={reduce}>
                  {m.mode === 'build'
                    ? t('ariaStudio.modeChooser.buildTitle')
                    : t('ariaStudio.modeChooser.tailorTitle')}
                </SelectedAnswerBubble>
              );
            }

            // Job data lives on this message (read via latestJob lookups elsewhere);
            // RoleBriefCard is the sole visible confirmation of the captured job.
            if (m.who === 'jobcard') {
              return null;
            }

            // The CV that was picked as the source.
            if (m.who === 'cvpick') {
              return (
                <SelectedAnswerBubble key={i} reduce={reduce}>
                  {m.sourceTitle}
                </SelectedAnswerBubble>
              );
            }

            // The tailored copy landed — a compact action receipt for the clone.
            if (m.who === 'tailored') {
              return (
                <StudioReceipt
                  key={i}
                  reduce={reduce}
                  title={t('ariaStudio.chat.tailoredCopyCreated')}
                  detail={m.title}
                />
              );
            }

            // The user's confirmation is an answer, not an Aria success notification.
            if (m.who === 'briefcard') {
              return (
                <SelectedAnswerBubble key={i} reduce={reduce}>
                  {t('ariaStudio.chat.jobDetailsCorrect')}
                </SelectedAnswerBubble>
              );
            }

            // A scan happened — mark the phase change without adding another bubble. The
            // RESULT itself isn't stored in the
            // transcript: the cards below render the live studioScan snapshot, so a
            // free recompute updates them without rewriting history.
            if (m.who === 'scan') {
              return (
                <StudioPhaseDivider key={i} reduce={reduce}>
                  {t('ariaStudio.chat.fitScanComplete')}
                </StudioPhaseDivider>
              );
            }

            // Focus start / end — a thin boundary showing which role or project Aria is
            // interviewing on, plus the point where that focused conversation closed.
            if (m.who === 'focus' || m.who === 'unfocus') {
              const exited = m.who === 'unfocus';
              return (
                <motion.div
                  key={i}
                  className="self-stretch my-1 flex items-center gap-2 px-1"
                  {...bubbleAnim('aria', reduce)}
                >
                  <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
                  <span className="shrink-0 flex items-center gap-1.5">
                    <span
                      className={`h-1 w-1 rounded-full ${
                        exited
                          ? 'bg-amber-400 dark:bg-amber-500'
                          : 'bg-emerald-400 dark:bg-emerald-500'
                      }`}
                    />
                    <span
                      className={`max-w-[210px] truncate text-[9px] font-semibold ${
                        exited
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {exited
                        ? t('ariaStudio.chat.focusExited')
                        : // A pinned BUILD entry has no title yet — it's captured later in
                          // the interview — so the fallback is what this crumb reads as for
                          // most of its life. "Untitled role" described that as a defect and
                          // never updated; a section-aware "New experience" describes what is
                          // actually happening. `section` rides along on the focus marker;
                          // experience is the safe default for older persisted markers that
                          // predate it.
                          `${t('ariaStudio.chat.focus')} · ${
                            m.title ||
                            t(
                              m.section === 'project'
                                ? 'ariaStudio.chat.focusNewProject'
                                : m.section === 'education'
                                  ? 'ariaStudio.chat.focusNewEducation'
                                  : 'ariaStudio.chat.focusNewExperience'
                            )
                          }${m.company ? ` · ${m.company}` : ''}`}
                    </span>
                  </span>
                  <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
                </motion.div>
              );
            }

            // Fix session boundaries — a thin hairline so scrolling the history shows
            // where a section's fix began and ended.
            if (m.who === 'fixstart' || m.who === 'fixend') {
              const ended = m.who === 'fixend';
              return (
                <motion.div
                  key={i}
                  className="self-stretch my-1 flex items-center gap-2 px-1"
                  {...bubbleAnim('aria', reduce)}
                >
                  <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
                  <span className="shrink-0 flex items-center gap-1.5">
                    <span
                      className={`w-1 h-1 rounded-full ${ended ? 'bg-amber-400' : 'bg-slate-900 dark:bg-white'}`}
                    />
                    <span
                      className={`text-[9px] font-semibold ${
                        ended
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-900/80 dark:text-white/80'
                      }`}
                    >
                      {ended
                        ? t('ariaStudio.chat.fixClosed')
                        : t('ariaStudio.chat.fixingSection', {
                            section:
                              // An entry title is the user's own content — never
                              // translated. Only the section name is resolved.
                              m.entry?.title ||
                              sectionLabel(t, { key: m.sectionKey, label: m.sectionLabel }) ||
                              t('ariaStudio.chat.sectionFallback'),
                          })}
                    </span>
                  </span>
                  <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
                </motion.div>
              );
            }

            // Applied record — durable, and deliberately score-free. It REFERENCES the
            // entry and what landed; the score lives on the snapshot, which moves on
            // every recompute. Re-reading this costs nothing: it's a receipt, not a call.
            if (m.who === 'applied') {
              const n = m.applied?.length ?? 0;
              return (
                <StudioReceipt
                  key={i}
                  reduce={reduce}
                  title={
                    m.what
                      ? t('ariaStudio.chat.addedWhat', { what: m.what })
                      : t('ariaStudio.chat.addedBullets', { count: n })
                  }
                  detail={
                    m.entry?.title || sectionLabel(t, { key: m.sectionKey, label: m.sectionLabel })
                  }
                />
              );
            }

            // Build-track markers. `buildintro` / `buildstart` are bookkeeping — they
            // record that the roadmap was accepted and the draft created — so they render
            // nothing; the conversation around them already tells that story.
            if (m.who === 'buildintro' || m.who === 'buildstart') return null;

            if (m.who === 'careerstage') {
              return (
                <SelectedAnswerBubble key={i} reduce={reduce}>
                  {m.skipped
                    ? t('ariaStudio.chat.careerStage.skip')
                    : t(`ariaStudio.chat.careerStage.options.${m.stage}`)}
                </SelectedAnswerBubble>
              );
            }

            // The job answer, including "not yet" — worth showing, because a CV built
            // without a target is a deliberate choice the user should see recorded.
            if (m.who === 'buildjobdone') {
              return (
                <SelectedAnswerBubble key={i} reduce={reduce}>
                  {m.skipped
                    ? t('ariaStudio.chat.noSpecificJobYet')
                    : t('ariaStudio.chat.jobDetailsCorrect')}
                </SelectedAnswerBubble>
              );
            }

            // A finished entry, filed into the stream. References the entry by _sortId
            // rather than snapshotting its contents, so it always reflects the CV.
            if (m.who === 'rolerecord') {
              // Resolve the list from the marker's own `section` — both producers write
              // it ('experience' | 'project' | 'education', the SECTION_LIST keys).
              // Looking only in `experience` meant EVERY project and education record
              // resolved to null: the user finished a project, Aria said she'd wrapped it
              // up, and no receipt card ever appeared — on every render and every refresh.
              // Defaulting keeps markers written before `section` existed rendering.
              const section = m.section || 'experience';
              const live = (cvData?.[SECTION_LIST[section] || 'experience'] || []).find(
                (e) => e._sortId === m.sortId
              );
              if (!live) return null; // deleted since — don't show a ghost
              const n = bulletCount(live);
              // Each section names its entries with DIFFERENT fields: education has a
              // degree and a school rather than a title and a company, and a project has
              // no second line at all. The subtitle renders only when its field actually
              // exists, so a project can't trail a bare " · ".
              const title =
                (section === 'education' ? live.degree : live.title) ||
                t(
                  section === 'project'
                    ? 'ariaStudio.chat.untitledProject'
                    : 'ariaStudio.chat.untitledRole'
                );
              const subtitle =
                section === 'education' ? live.school : section === 'project' ? '' : live.company;
              return (
                <StudioReceipt
                  key={i}
                  reduce={reduce}
                  title={`${title}${subtitle ? ` · ${subtitle}` : ''}`}
                  detail={t('ariaStudio.chat.bulletsOnCv', { count: n })}
                />
              );
            }

            if (m.who === 'contactdone') {
              return (
                <SelectedAnswerBubble key={i} reduce={reduce}>
                  {t('ariaStudio.chat.contactDetailsCorrect')}
                </SelectedAnswerBubble>
              );
            }

            // Any remaining textless item is an internal flow marker (for example,
            // unpinrole/pinrole). It must persist for refresh recovery, but it is not an
            // Aria turn and must never fall through into an empty speech bubble.
            if (!m.text) return null;

            // Aria turn — no bubble at all, just text on the page (the grey pill is
            // reserved for OUR side, matching the reference chat). Orbit mark trails
            // BELOW the text, Claude-style, rather than flagging it from the side.
            // A freshly-arrived reply types itself in like a stream; restored history
            // (see revealedRef, seeded by the rehydrate effect) renders as plain text.
            return (
              <motion.div
                key={i}
                ref={(el) => {
                  msgDomRef.current[i] = el;
                }}
                className="aria-row self-start max-w-[92%] flex flex-col items-start gap-1.5"
                {...bubbleAnim('aria', reduce)}
              >
                <span className="text-[rgb(31,31,31)] dark:text-slate-100 font-normal px-1 text-[17px] leading-6">
                  {revealedRef.current.has(i) ? (
                    m.text
                  ) : (
                    <AriaTypewriter
                      text={m.text}
                      reduce={reduce}
                      onDone={() => revealedRef.current.add(i)}
                    />
                  )}
                </span>
                <AriaOrbit size={16} className="aria-mark ml-1" />
              </motion.div>
            );
          })}

          {thinking && <AriaThinking variant="chat" />}
          {working && (
            <AriaThinking variant="draft" label={t('ariaStudio.chat.thinking.settingUpCopy')} />
          )}
          {reading && (
            <AriaThinking variant="chat" label={t('ariaStudio.chat.thinking.readingJob')} />
          )}
          {transitionLabel && <AriaThinking variant="chat" label={transitionLabel} />}
          {roleBusy && !transitionLabel && !thinking && (
            <AriaThinking variant="chat" label={t('ariaStudio.chat.thinking.notingThatDown')} />
          )}
          {scanning && (
            <AriaThinking
              variant="draft"
              label={t('ariaStudio.chat.thinking.readingCvAgainstJob')}
            />
          )}

          {/* The live card — always the LAST item in the stream, blooming from Aria's
              orbit and collapsing back into it. Never a phase-swap. */}
          <AnimatePresence>
            {ready && phase === 'mode' && <ModeChooser key="mode" onPick={pickMode} />}

            {/* ── Build track ── */}

            {ready && phase === 'build:roadmap' && (
              <BuildRoadmapCard
                key="roadmap"
                status={progress.status}
                onStart={beginBuild}
                starting={working}
              />
            )}

            {ready && phase === 'build:career-stage' && (
              <CareerStageAskCard
                key="careerstage"
                onPick={pickCareerStage}
                onSkip={skipCareerStage}
              />
            )}

            {ready && phase === 'build:job' && !buildJobOpen && (
              <TargetJobAskCard
                key="jobask"
                onYes={() => setBuildJobOpen(true)}
                onNo={buildSkipJob}
              />
            )}

            {/* Yes → the SAME capture form the tailor track uses. */}
            {ready && phase === 'build:job' && buildJobOpen && (
              <JobCaptureCard
                key="buildjob"
                initialTitle={editingJob ? latestJob?.jobTitle || '' : ''}
                initialDescription={editingJob ? latestJob?.jobDescription || '' : ''}
                model={genModelId}
                onSubmit={(job) => {
                  setBuildJobOpen(false);
                  buildCaptureJob(job);
                }}
                onCancel={() => {
                  if (editingJob) {
                    setEditingJob(false);
                    setBuildJobOpen(false);
                    setPhase('build:brief');
                  } else {
                    setBuildJobOpen(false);
                  }
                }}
              />
            )}

            {ready && phase === 'build:brief' && (
              <RoleBriefCard
                key="buildbrief"
                brief={latestJob?.brief}
                jobTitle={latestJob?.jobTitle}
                onConfirm={confirmBuildBrief}
                onEdit={editBuildBrief}
              />
            )}

            {/* The section menu — whatever is still unfinished, in builder order. */}
            {ready && phase === 'build:sections' && !pinnedEntry && nextSection && (
              <AriaCard cardKey={`sections-${nextSection.key}`} key={`sections-${nextSection.key}`}>
                <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {nextSection.eyebrow}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {nextSection.blurb}
                  </p>
                  <button
                    type="button"
                    onClick={nextSection.start}
                    disabled={roleBusy}
                    className="btn-primary w-full mt-3 py-2 text-sm disabled:opacity-50"
                  >
                    {roleBusy ? t('ariaStudio.buildRoadmap.settingUp') : nextSection.cta}
                  </button>
                  {/* Optional sections get a guilt-free out, stated plainly. */}
                  {nextSection.skip && (
                    <button
                      type="button"
                      onClick={nextSection.skip}
                      disabled={roleBusy}
                      className="w-full mt-2 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {nextSection.skipLabel}
                    </button>
                  )}
                </div>
              </AriaCard>
            )}

            {/* Projects ask their TYPE first — it changes what makes the project worth
                reading, so asking afterwards would mean re-framing answers already given. */}
            {ready && pinnedEntry && pinnedSectionKey === 'project' && pinnedStage === 'type' && (
              <ProjectTypeCard
                key={`ptype-${pinnedEntry._sortId}`}
                busy={roleBusy}
                onPick={pickProjectType}
              />
            )}

            {ready &&
              pinnedEntry &&
              pinnedSectionKey === 'experience' &&
              pinnedStage === 'entryType' && (
                <ExperienceTypeCard
                  busy={roleBusy}
                  onPick={(entryType) => captureRoleField({ entryType })}
                />
              )}

            {/* Skills — the same consent → generate → SkillsCard → applySkills flow the
                CV builder runs, grounded on the roles and projects just captured. */}
            {ready && phase === 'build:skills' && (
              <SkillsBuildCard
                key="skills"
                phase={skillsData ? 'card' : 'consent'}
                data={skillsData}
                hasJob={!!cvData?.targetJob?.description}
                existingSkills={(cvData?.skills || []).map((s) =>
                  typeof s === 'string' ? s : s.name
                )}
                busy={roleBusy === 'skills'}
                cost={costForActionTier('GENERATE_SKILLS', tierOf(genModelId)) ?? 10}
                genModelId={genModelId}
                onSelectGenModel={setGenModelId}
                chatTier={tierOf(modelId)}
                onGenerate={generateBuildSkills}
                onAdd={addPickedSkills}
                onManual={addManualSkills}
                addedCount={manualSkillsAdded}
                onDone={finishManualSkills}
                onSkip={async () => {
                  if (skillsData && !(await persistStudioPending(null))) return;
                  setSkillsData(null);
                  push({ who: 'skillsdone', skipped: true });
                  setPhase('build:sections');
                  ariaSays(t('ariaStudio.chat.skillsSkipSaid'));
                }}
              />
            )}

            {/* Summary — LAST, so it can draw on everything above it. */}
            {ready && phase === 'build:summary' && (
              <SummaryFixCard
                key="buildsummary"
                draft={summaryDraft}
                generating={summaryBusy}
                applying={applyingFix}
                wasReroll={summaryWasReroll}
                careerStage={
                  careerStage ||
                  (cvData?.studioPending?.kind === 'summary' ? cvData.studioPending.stage : null)
                }
                cost={costForActionTier('GENERATE_SUMMARY', tierOf(genModelId)) ?? 3}
                genModelId={genModelId}
                onSelectGenModel={setGenModelId}
                chatTier={tierOf(modelId)}
                onGenerate={generateBuildSummary}
                onApply={applyBuildSummary}
                onCancel={async () => {
                  if (!(await persistStudioPending(null))) return;
                  setSummaryDraft('');
                  push({ who: 'summarydone', skipped: true });
                  setPhase('build:done');
                  ariaSays(t('ariaStudio.chat.summarySkipSaid'));
                }}
              />
            )}

            {/* Build finish — CV health and contents, never a fabricated match score. */}
            {ready && phase === 'build:done' && (
              <FinishCard
                key="buildfinish"
                mode="build"
                scan={{ title: cvData?.title }}
                progress={progress}
                contents={{
                  roles: (cvData?.experience || []).length,
                  projects: (cvData?.projects || []).length,
                  skills: (cvData?.skills || []).length,
                }}
                draftId={draftId}
                onOpenEditor={() => window.open(`/resume/${draftId}`, '_blank', 'noopener')}
                onTailor={tailorThisCv}
                // Only offered when a job was actually supplied at build-start —
                // otherwise there is nothing to match against.
                onScan={cvData?.targetJob?.description ? runScan : null}
                scanCost={scanCost}
              />
            )}

            {/* Aria's three PROPOSALS, in front of the blank project. Reached only when
                the fetch actually returned ideas — every other outcome already fell
                through to enterSection('project'). */}
            {ready && phase === 'build:project-ideas' && !!projectIdeas?.length && (
              <ProjectIdeasCard
                key="buildideas"
                ideas={projectIdeas}
                onUse={(idea) => buildFromIdea(idea, 'build')}
                onStartBlank={() => startBlankProject('build')}
                onSkip={() => skipProjectIdeas('build')}
              />
            )}

            {/* Certifications — a light sub-list of education. No AI, no credits. */}
            {ready && phase === 'build:certs' && (
              <CertificationsCard
                key="certs"
                certifications={cvData?.certifications || []}
                busy={roleBusy}
                onAdd={addCertification}
                onRemove={removeCertification}
                onDone={() =>
                  advance(() => {
                    push({ who: 'certsdone' });
                    setPhase('build:sections');
                    ariaSays(t('ariaStudio.chat.certsDone'));
                  }, t('ariaStudio.chat.thinking.certsSaved'))
                }
              />
            )}

            {/* Capture — one field at a time, driven by what's still missing on the entry. */}
            {ready &&
              pinnedEntry &&
              pinnedStage &&
              pinnedStage !== 'type' &&
              pinnedStage !== 'entryType' &&
              pinnedStage !== 'achievements' &&
              pinnedStage !== 'complete' && (
                <RoleCaptureCard
                  key={`capture-${pinnedEntry._sortId}-${pinnedStage}`}
                  stage={pinnedStage}
                  entry={pinnedEntry}
                  section={pinnedSectionKey}
                  busy={roleBusy === 'field'}
                  onSubmit={captureRoleField}
                />
              )}

            {ready && phase === 'build:contact' && (
              <ContactConfirmCard
                key="contact"
                personalInfo={cvData?.personalInfo || {}}
                saving={applyingFix}
                onChange={(info) => updateCvData({ personalInfo: info })}
                onConfirm={confirmContact}
              />
            )}

            {/* "New CV" — V1 hands off to the CV builder rather than pretending to
                build in chat. The copy says so outright: an honest handoff beats a
                half-working in-chat build, and the round trip back here is the point. */}
            {ready && phase === 'build' && (
              <AriaCard cardKey="build" key="build">
                <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {t('ariaStudio.chat.buildNewCvHeading')}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {t('ariaStudio.chat.buildNewCvBody')}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPhase('mode')}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      {t('common.back')}
                    </button>
                    <a
                      href="/cv-builder/new/target-job"
                      className="btn-primary px-5 py-2 text-sm no-underline"
                    >
                      {t('ariaStudio.chat.openTheBuilder')} →
                    </a>
                  </div>
                </div>
              </AriaCard>
            )}

            {ready && phase === 'job' && (
              <JobCaptureCard
                key="job"
                initialTitle={editingJob ? latestJob?.jobTitle || '' : ''}
                initialDescription={editingJob ? latestJob?.jobDescription || '' : ''}
                model={genModelId}
                onSubmit={captureJob}
                onCancel={() => {
                  if (editingJob) {
                    setEditingJob(false);
                    setPhase('brief');
                  } else {
                    setPhase('mode');
                  }
                }}
              />
            )}

            {ready && phase === 'brief' && (
              <RoleBriefCard
                key="brief"
                brief={latestJob?.brief}
                jobTitle={latestJob?.jobTitle}
                onConfirm={confirmBrief}
                onEdit={editBrief}
              />
            )}

            {ready && phase === 'cv' && (
              <CvPickerCard
                key="cv"
                busyId={pickBusyId}
                onPick={pickCv}
                onCancel={() => setPhase('brief')}
              />
            )}

            {/* The scan offer — the one charged action, priced before it's taken. */}
            {ready && phase === 'scanoffer' && (
              <AriaCard cardKey="scanoffer" key="scanoffer">
                <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      {t('ariaStudio.chat.scanOffer.heading')}
                    </p>
                    <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      −{scanCost} cr
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {t('ariaStudio.chat.scanOffer.body')}
                  </p>
                  <button
                    type="button"
                    onClick={runScan}
                    className="btn-primary w-full mt-3 py-2 text-sm"
                  >
                    {t('ariaStudio.chat.scanOffer.cta')}
                  </button>
                </div>
              </AriaCard>
            )}

            {/* Results — the verdict, then the section-by-section breakdown. Both read
                the live snapshot, so a recompute refreshes them in place. */}
            {ready && phase === 'results' && scan && (
              <ScoreCard
                key="score"
                scan={scan}
                isDrafted={cvData?.targetJob?.source === 'ai_drafted'}
              />
            )}
            {ready && phase === 'results' && scan?.sections?.length > 0 && (
              <SectionBreakdownCard
                key="sections"
                sections={scan.sections}
                onFix={handleFix}
                onRecompute={runRecompute}
                // Which one is running drives only the LABELS; `busy` below is what
                // disables them, so neither op can be started while the other is in
                // flight and neither claims to be running when it isn't.
                recomputing={scanKind === 'recompute'}
                onRescan={runScan}
                rescanning={scanKind === 'rescan'}
                rescanCost={scanCost}
                onDismissSection={dismissSection}
                onRestoreSection={restoreSection}
                busy={applyingFix || scanning}
              />
            )}

            {/* Finish — offered whenever there's a scan, and re-rendered after every
                re-score so the before → after stays current. */}
            {ready && phase === 'results' && scan && (
              <FinishCard
                key="finish"
                scan={{ ...scan, title: cvData?.title }}
                draftId={draftId}
                onOpenEditor={() => window.open(`/resume/${draftId}`, '_blank', 'noopener')}
              />
            )}

            {/* ── The fix loop ── */}

            {/* Projects, nothing to sharpen → PROPOSALS instead of an empty picker. A
                "Build this" from here lands in the FIX loop, so finishFix still closes
                the session and re-scores. Dismiss stays available: not everyone has
                projects, and "not applicable" must not vanish because Aria had ideas. */}
            {ready && phase === 'fix:pick' && showFixIdeas && (
              <ProjectIdeasCard
                key="fixideas"
                ideas={projectIdeas || []}
                busy={ideasBusy}
                onUse={(idea) => buildFromIdea(idea, 'fix')}
                onStartBlank={() => startBlankProject('fix')}
                onSkip={() => skipProjectIdeas('fix')}
                onDismissSection={dismissSection}
              />
            )}

            {/* experience / projects → pick the entry to sharpen */}
            {ready && phase === 'fix:pick' && !showFixIdeas && (
              <EntryPickerCard
                key="fixpick"
                entries={fixEntries}
                missingKeywords={activeFix?.missingKeywords || []}
                section={activeFix?.sectionKey}
                draftId={draftId}
                onPick={pickEntry}
                onCancel={cancelFix}
                onDismissSection={dismissSection}
                busy={applyingFix}
              />
            )}

            {/* experience / projects → rewrite the entry's EXISTING bullets, before→after */}
            {ready && phase === 'fix:rewrite' && rewriteTarget && (
              <RewriteRoleCard
                key={`rewrite-${rewriteTarget.sortId}`}
                draftId={draftId}
                section={rewriteTarget.section}
                sortId={rewriteTarget.sortId}
                model={genModelId}
                rows={rewriteTarget.rows}
                onLoaded={(rows) => {
                  const next = { ...rewriteTarget, rows };
                  setRewriteTarget(next);
                  persistStudioPending(next);
                }}
                onApply={applyRewrite}
                onInterview={rewriteInterviewInstead}
                onBack={() => {
                  clearRewrite();
                  setPhase('fix:pick');
                }}
                applying={applyingFix}
              />
            )}

            {/* skills → the SAME grounded card the build track uses.

                It replaces a checklist built from the scan's raw JD terms, which put
                requirement SENTENCES ("Previous experience in a hospitality role") on the
                CV as uncategorized "skills" — not skills, and not something an ATS reads
                as one. Aria picks from THIS CV's own history instead, in real categories,
                and the free "type your own" input sits right beside her paid button. */}
            {ready && phase === 'fix:skills' && (
              <SkillsBuildCard
                key="fixskills"
                phase={fixSkillsData ? 'card' : 'consent'}
                data={fixSkillsData}
                hasJob={!!cvData?.targetJob?.description}
                existingSkills={(cvData?.skills || []).map((s) =>
                  typeof s === 'string' ? s : s.name
                )}
                busy={roleBusy === 'skills' || applyingFix}
                cost={costForActionTier('GENERATE_SKILLS', tierOf(genModelId)) ?? 10}
                genModelId={genModelId}
                onSelectGenModel={setGenModelId}
                chatTier={tierOf(modelId)}
                onGenerate={generateFixSkills}
                onAdd={addPickedFixSkills}
                onManual={addManualFixSkills}
                addedCount={fixSkillsAdded}
                onDone={finishFixSkills}
                onSkip={cancelFix}
              />
            )}

            {/* summary → stage chips, then the draft */}
            {ready && phase === 'fix:summary' && (
              <SummaryFixCard
                key="fixsummary"
                draft={summaryDraft}
                generating={summaryBusy}
                applying={applyingFix}
                wasReroll={summaryWasReroll}
                careerStage={
                  careerStage ||
                  (cvData?.studioPending?.kind === 'summary' ? cvData.studioPending.stage : null)
                }
                cost={costForActionTier('GENERATE_SUMMARY', tierOf(genModelId)) ?? 3}
                genModelId={genModelId}
                onSelectGenModel={setGenModelId}
                chatTier={tierOf(modelId)}
                onGenerate={generateSummary}
                onApply={applySummaryDraft}
                onCancel={async () => {
                  if (!(await persistStudioPending(null))) return;
                  setSummaryDraft('');
                  cancelFix();
                }}
              />
            )}

            {/* education / contact → guidance only, no AI, no charge */}
            {ready && phase === 'fix:guide' && (
              <SectionGuidanceCard
                key="fixguide"
                section={activeFix?.sectionKey}
                draftId={draftId}
                note={sectionNote(
                  t,
                  scan?.sections?.find((s) => s.key === activeFix?.sectionKey)
                )}
                onBack={cancelFix}
                onRescore={rescoreAfterGuide}
                rescoring={scanning}
              />
            )}
          </AnimatePresence>

          {/* Achievements for the pinned role — the SAME SectionCoach protocol the fix
              loop uses, pointed at this entry. One coaching path, not two: the free
              interview, the count picker, the credited generation and applyRoleBulletDiff
              all behave identically here. */}
          {coachDrivesPin && !studioTransition && !thinking && !roleBusy && !transitionLabel && (
            <SectionCoach
              key={`rolecoach-${pinnedEntry._sortId}-${buildRoundNonce}`}
              draftId={draftId}
              dockNode={coachDock}
              entry={{
                // 'project' routes coachChatTurn to its project framing (type-aware,
                // problem → role → tech → outcome → link) instead of the job one.
                section: pinnedSectionKey === 'project' ? 'project' : 'experience',
                sortId: pinnedEntry._sortId,
                title: pinnedEntry.title,
                company: pinnedEntry.company,
                entryType: pinnedEntry.entryType,
              }}
              missingKeywords={(cvData?.targetJob?.brief?.mustHaves || [])
                .map((k) => (typeof k === 'string' ? k : k?.name))
                .filter(Boolean)
                .slice(0, 4)}
              // The job's must-haves, NOT measured gaps: nothing has been scanned on the
              // build track, and this entry may already cover every one of them.
              keywordsAreGaps={false}
              messages={messages}
              onPush={push}
              onApply={async (add, remove) => {
                setTransitionLabel(t('ariaStudio.chat.thinking.bulletsSaved'));
                try {
                  const res = await applyRoleBulletDiff(
                    pinnedSectionKey === 'project' ? 'project' : 'experience',
                    pinnedEntry._sortId,
                    add,
                    remove
                  );
                  if (!res?.ok) setTransitionLabel(null); // failed — onDone won't fire, clear now
                  return res;
                } catch (e) {
                  setTransitionLabel(null);
                  throw e;
                }
              }}
              onDone={(result) => {
                setTimeout(() => {
                  setTransitionLabel(null);
                  if (result?.applied?.length) {
                    setAppliedReceipt({
                      sortId: pinnedEntry._sortId,
                      section: pinnedSectionKey,
                      title:
                        pinnedEntry.title ||
                        t(
                          pinnedSectionKey === 'project'
                            ? 'ariaStudio.chat.untitledProject'
                            : 'ariaStudio.chat.untitledRole'
                        ),
                      n: result.applied.length,
                      nonce: Date.now(),
                    });
                    // "Edit with Aria" on an already-finished build is a bounded edit,
                    // not the start of another role-building loop. The successful Apply
                    // is the completion moment: clear focus and put the completion card
                    // back immediately. In-progress builds retain the existing multi-round
                    // interview so a new role can collect more than one achievement.
                    if (completedBuildSession) {
                      returnToCompletedBuild({ unpin: true });
                      return;
                    }
                    // Keep the interview going on the SAME role. Re-pin it so the coach's
                    // turn window (and prior-answer context, which primes the next paid
                    // generation) resets to a clean round — a transcript marker, so it
                    // survives refresh. Bump the round nonce to remount the coach back into
                    // its interview (its internal phase was left on 'results'). Aria invites
                    // more; the pinned card's "next role / done" is how the user moves on.
                    push({
                      who: 'pinrole',
                      sortId: pinnedEntry._sortId,
                      section: pinnedSectionKey,
                    });
                    setBuildRoundNonce((n) => n + 1);
                    ariaSays(
                      t(
                        pinnedSectionKey === 'project'
                          ? 'ariaStudio.chat.appliedContinueProject'
                          : 'ariaStudio.chat.appliedContinueRole'
                      )
                    );
                  }
                }, 500);
              }}
              careerStage={careerStage}
              onPickCareerStage={setCareerStage}
            />
          )}

          {/* The focused build-with. Renders INTO this stream (its turns are ordinary
              aria/user messages, so they persist with everything else) and brings its
              own input, because here typing IS the interaction. */}
          {phase === 'fix:coach' && activeFix?.entry && !thinking && !scanning && (
            <SectionCoach
              key={`coach-${activeFix.entry.sortId}`}
              draftId={draftId}
              dockNode={coachDock}
              entry={activeFix.entry}
              missingKeywords={activeFix.missingKeywords || []}
              messages={messages}
              onPush={push}
              onApply={(add, remove) =>
                applyRoleBulletDiff(activeFix.entry.section, activeFix.entry.sortId, add, remove)
              }
              onDone={(result) =>
                finishFix(
                  result && {
                    entry: activeFix.entry,
                    applied: result.applied,
                    what: t('ariaStudio.chat.nBullets', { count: result.applied?.length || 0 }),
                  }
                )
              }
              careerStage={careerStage}
              onPickCareerStage={setCareerStage}
            />
          )}
        </div>
      </div>

      {/* Docked input — disabled while a card owns the stream, so the card is the focus,
          and hidden outright while the coach has its own (which docks below). */}
      {/* pb-[env(safe-area-inset-bottom)] keeps the input clear of the iOS home
          indicator; the bottom sheet is capped at 80vh so it can never cover it. */}
      <div className={`relative shrink-0 ${coachOwnsInput || studioTransition ? 'hidden' : ''}`}>
        <AriaComposer
          className="pb-[env(safe-area-inset-bottom)] relative z-20"
          inputRef={inputRef}
          value={input}
          onChange={setInput}
          onSend={send}
          disabled={inputDisabled}
          busy={thinking}
          placeholder={
            inputDisabled
              ? t('ariaStudio.chat.useCardAbove')
              : t('cvBuilder.ariaComposer.placeholder')
          }
          modelId={modelId}
          onSelectModel={selectModel}
          showModelPicker
          showModelNotice
        />
      </div>

      {/* Active-coach composer dock — a PINNED shrink-0 sibling below the scroll, mounted
          only while a coach drives (the default composer is hidden then). SectionCoach
          portals its own composer (free-note + textarea + Back/turns row) in here, so a
          focused-section input stays put and ONLY the messages scroll. Empty (zero-height)
          during the coach's picker/results phases, which have no input of their own. */}
      {coachOwnsInput && <div ref={setCoachDock} className="shrink-0" />}

      {/* Off-screen CV — the PDF path serialises a real DOM node, and a chat has none.
          Mounted only once there's something to print. */}
      {phase === 'results' && scan && (
        <StudioPrintSurface application={printApplication} userProfile={cvData?.personalInfo} />
      )}
    </div>
  );
};

export default StudioChat;
