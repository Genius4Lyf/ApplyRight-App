import React, { useState, useRef, useEffect } from 'react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { bubbleAnim } from '../../lib/ariaMotion';
import { CREDIT_COSTS } from '../../lib/credits';
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
  projectTypeFor,
  SECTION_LIST,
  PROJECT_TYPES,
  roleStage,
  entryProgress,
  bulletCount,
  FIX_MODE,
  ENTRY_SOURCE,
} from '../../lib/studioFlow';
import { useStickToBottom } from '../../hooks/useStickToBottom';
import { useChatTheme } from '../../hooks/useChatTheme';
import { useAriaModel } from '../../hooks/useAriaModel';
import { useAriaStudio } from '../../context/AriaStudioContext';
import { toast } from 'sonner';
import CVService from '../../services/cv.service';
import AriaComposer from '../cv/AriaComposer';
import AriaOrbit from '../cv/AriaOrbit';
import AriaThinking from '../cv/AriaThinking';
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
import SkillsFixCard from './SkillsFixCard';
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

// Aria's opening line in the Studio. Flagged `_opening` so it's regenerated on every
// mount and never persisted — same contract as the coach panel's step openers.
// Key, not text — resolved via t() where used, since this is module scope with no
// react-i18next context.
const OPENER_KEY = 'ariaStudio.chat.opener';

// Phase-0 transcript home. Retired the moment a draft exists: the array migrates into
// `cvData.coachChats.studio` (identical shape) and the context autosave takes over.
const LS_KEY = 'ariaStudio:session';

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
  const [chatTheme] = useChatTheme();
  const {
    draftId,
    cvData,
    setCvData,
    updateCvData,
    loading,
    applyRoleBulletDiff,
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
  } = useAriaStudio();

  // The session's Aria model — the SAME per-draft choice the Studio header picker and
  // the builder's coach chat show; the composer's picker writes through this.
  const { modelId, selectModel } = useAriaModel({ draftId, cvData, updateCvData });

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
  const [reviewHint, setReviewHint] = useState(null);
  // Generated skill suggestions awaiting a pick, or null. Transient: the ANSWER (what
  // was added) lives on the CV, so a refresh returns to the consent card rather than
  // showing suggestions the user never paid attention to.
  const [skillsData, setSkillsData] = useState(null);

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
    if (pending?.kind === 'skills') setSkillsData(pending.data || null);
    if (pending?.kind === 'summary') {
      setSummaryDraft(pending.draft || '');
      setSummaryWasReroll(!!pending.wasReroll);
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

  useStickToBottom(
    chatRef,
    [messages, thinking, working, reading, transitionLabel, phase, editingJob],
    reduce
  );

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
  // The project type lives in the transcript (that's where the backend's project prompt
  // reads it from), so it resolves the same way the pin does.
  const pinnedType = pinnedEntry ? projectTypeFor(messages, pinnedEntry._sortId) : null;
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

  // Self-clear a pin whose entry has gone — deleted in the CV builder, or in another tab.
  // Without this the card would keep accepting answers for a role that no longer exists.
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
  const captureJob = async ({ jobTitle, jobDescription }) => {
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
    push({ who: 'jobcard', jobTitle, jobDescription, keywords, brief });
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

  // ─── Step 5: the scan — the one charged action in the flow ───
  const runScan = async () => {
    if (scanning || !draftId) return;
    setScanning(true);
    try {
      const res = await CVService.studioScan(draftId, modelId);
      // The snapshot lives on the draft; mirror it into context so every card and the
      // artifact panel read one source of truth.
      updateCvData({ studioScan: res.studioScan });
      if (res.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      push({ who: 'scan', at: res.studioScan?.scannedAt });
      setPhase('results');
      ariaSays(t('ariaStudio.chat.scanDone'));
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
    }
  };

  // Free deterministic re-score. No AI, no charge — so it can run after every edit.
  // Returns the new snapshot so callers can report a delta.
  const runRecompute = async () => {
    if (!draftId) return null;
    setScanning(true);
    try {
      const res = await CVService.studioRecompute(draftId);
      updateCvData({ studioScan: res.studioScan });
      return res.studioScan;
    } catch (err) {
      console.error('studio recompute failed', err);
      toast.error(t('ariaStudio.chat.toast.recomputeFailed'));
      return null;
    } finally {
      setScanning(false);
    }
  };

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
      ariaSays(
        section.missingKeywords?.length
          ? t('ariaStudio.chat.fixPickWithKeywords', {
              section: section.label.toLowerCase(),
              keywords: section.missingKeywords.slice(0, 3).join(', '),
            })
          : t('ariaStudio.chat.fixPickNoKeywords', { section: section.label.toLowerCase() })
      );
    } else if (mode === 'skills') {
      ariaSays(t('ariaStudio.chat.fixSkills'));
    } else if (mode === 'summary') {
      ariaSays(t('ariaStudio.chat.fixSummary'));
    }
  };

  // An entry was chosen → open the focused build-with on it. The opener names the
  // gaps so Aria's first question is already targeted; the Role Brief on the tailored
  // copy grounds the rest server-side, so the JD is never re-sent.
  const pickEntry = (entry) => {
    const fix = openFix(messages);
    const src = ENTRY_SOURCE[fix?.sectionKey] || ENTRY_SOURCE.experience;
    const gaps = fix?.missingKeywords || [];
    push(
      {
        who: 'fixstart',
        mode: 'coach',
        sectionKey: fix?.sectionKey,
        sectionLabel: fix?.sectionLabel,
        missingKeywords: gaps,
        entry: {
          section: src.focusSection,
          sortId: entry.sortId,
          title: entry.title,
          company: entry.company,
        },
      },
      {
        who: 'aria',
        text: gaps.length
          ? t('ariaStudio.chat.pickEntryWithGaps', {
              title: entry.title,
              gaps: gaps.slice(0, 2).join(t('ariaStudio.chat.and')),
            })
          : t('ariaStudio.chat.pickEntryNoGaps', { title: entry.title }),
      }
    );
    setPhase('fix:coach');
  };

  // Close a fix: land the applied record, re-band for free, and report the movement.
  // The record REFERENCES the entry and what was applied — never the score, which
  // would go stale the moment the next recompute runs.
  const finishFix = async (result) => {
    setScanning(true);
    const fix = openFix(messages);
    push({ who: 'fixend' });

    if (!result) {
      // Backed out without applying anything — nothing to re-score.
      setScanning(false); // early exit — runRecompute() (which normally clears this) never runs
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
    const after = snap?.sections?.find((s) => s.key === fix?.sectionKey);

    if (after && before) {
      const moved = after.score - before.score;
      const bandChanged = after.band !== before.band;
      const bandNote = bandChanged
        ? t(
            before.band === 'bad'
              ? 'ariaStudio.chat.outOfTheRedNote'
              : 'ariaStudio.chat.intoTheGreenNote'
          )
        : '.';
      push({
        who: 'aria',
        text:
          moved > 0
            ? t('ariaStudio.chat.fixMovedScore', {
                section: fix.sectionLabel,
                from: before.score,
                to: after.score,
                bandNote,
              })
            : t('ariaStudio.chat.fixSavedNoMove', { section: fix.sectionLabel }),
      });
    }
    setPhase('results');
  };

  // Skills come straight off the scan — no generation, no charge.
  const applyScanSkills = async (names) => {
    if (!names?.length) return;
    setApplyingFix(true);
    try {
      const res = await applySkills(names.map((name) => ({ name, category: 'Uncategorized' })));
      if (!res?.ok) return;
      await finishFix({
        what: t('ariaStudio.chat.nSkills', { n: res?.added ?? names.length }),
        applied: names,
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
    try {
      const res = await CVService.coachSummary({ draftId, stage, model: modelId });
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
          targetJob: { title: jobTitle, description: jobDescription },
          ...(autoTitle ? { title: autoTitle } : {}),
        });
      } catch (err) {
        console.error('Failed to save the build target job', err);
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
    const list = SECTION_LIST[pinnedSection(messages)] || 'experience';
    // Updating the live entry changes `pinnedStage`, which would otherwise mount the
    // next capture card before Aria's acknowledgement starts. Keep that swap behind
    // the same short "noting this down" beat used by the other card transitions.
    setTransitionLabel(t('ariaStudio.chat.thinking.notingThatDown'));
    setRoleBusy('field');
    try {
      const previous = cvData[list] || [];
      const next = previous.map((e) =>
        e._sortId === pinnedEntry._sortId ? { ...e, ...patch } : e
      );
      updateCvData({ [list]: next });
      if (draftId) {
        try {
          await CVService.saveDraft({ _id: draftId, [list]: next });
        } catch (err) {
          console.error('Failed to save entry field', err);
          updateCvData({ [list]: previous });
          toast.error(t('ariaStudio.chat.toast.saveFailed'));
          return;
        }
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

  const finishSection = () => {
    if (roleBusy) return;
    const section = pinnedSectionKey;
    const list = SECTION_LIST[section] || 'experience';
    // An untouched entry would otherwise sit in the CV as an empty row forever — and,
    // worse, tick its section in the completeness view.
    const isBlank = pinnedEntry && entryProgress(pinnedEntry, section).done === 0;
    if (!isBlank && pinnedEntry) {
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
      push({ who: 'unpinrole' }, { who: DONE_MARKER[section] });
      setPhase('build:sections');
      ariaSays(
        section === 'experience'
          ? t('ariaStudio.chat.finishSection.experience')
          : section === 'project'
            ? t('ariaStudio.chat.finishSection.project')
            : t('ariaStudio.chat.finishSection.education')
      );
    }, t('ariaStudio.chat.thinking.sectionWrappedUp'));
  };

  // The project type — sent as an ordinary user turn, because that's where the backend's
  // project prompt reads it from, plus a marker so the chips don't re-ask on refresh.
  const pickProjectType = (type) => {
    if (!pinnedEntry) return;
    advance(() => {
      push(
        { who: 'user', text: t(type.messageKey) },
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
        modelId
      );
      const data = { suggestions: r.suggestions || [], bestForRole: r.bestForRole || [] };
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
            cost: CREDIT_COSTS.GENERATE_SKILLS ?? 10,
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
    const res = await applySkills(picked);
    if (!res?.ok) return;
    if (!(await persistStudioPending(null))) return;
    advance(() => {
      setSkillsData(null);
      push({ who: 'skillsdone', n: res?.added ?? picked.length });
      setPhase('build:sections');
      ariaSays(t('ariaStudio.chat.skillsInDone', { n: res?.added ?? picked.length }));
    }, t('ariaStudio.chat.thinking.skillsSaved'));
  };

  // Free manual entry — comma-separated, straight through applySkills. Nobody should
  // have to spend credits to list skills they already know they have.
  const addManualSkills = async (text) => {
    const names = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) return;
    setRoleBusy('skills');
    try {
      const res = await applySkills(names.map((name) => ({ name, category: 'Uncategorized' })));
      if (res?.ok && res.added) ariaSays(t('ariaStudio.chat.manualSkillsAdded', { n: res.added }));
    } finally {
      setRoleBusy(null);
    }
  };

  // ─── Summary ───
  // Runs LAST so it can draw on the whole document. Same /coach/summary + stage chips
  // the V1 fix loop uses; same SummaryFixCard.
  const generateBuildSummary = async (stage, isReroll) => {
    if (!stage || !draftId) return;
    setSummaryBusy(true);
    try {
      const res = await CVService.coachSummary({ draftId, stage, model: modelId });
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
  const fixEntries = (cvData?.[ENTRY_SOURCE[activeFix?.sectionKey]?.list] || []).map((e) => ({
    sortId: e._sortId,
    title: e.title,
    company: e.company,
    description: e.description,
  }));
  // The coach brings its own input while a build-with is open, so the docked one hides
  // entirely rather than sitting there disabled and competing for attention.
  // SectionCoach brings its own input whenever it's driving — the fix loop, or the
  // achievements stage of a pinned role.
  const coachOwnsInput = phase === 'fix:coach' || (!!pinnedEntry && pinnedStage === 'achievements');
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
          start: () => enterSection('project'),
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
    <div className={`flex-1 min-h-0 flex flex-col p-4 aria-theme-${chatTheme}`}>
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence>
          {studioTransition && (
            <motion.div
              key={`studio-${studioTransition}`}
              className="absolute inset-0 z-30 flex items-center justify-center bg-white px-6 dark:bg-slate-900"
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
        <div
          ref={chatRef}
          className="absolute inset-0 overflow-y-auto scrollbar-none flex flex-col gap-2.5"
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
            // User turn — right-aligned ink bubble.
            if (m.who === 'user') {
              return (
                <motion.div
                  key={i}
                  className="self-end max-w-[92%] bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                  {...bubbleAnim('user', reduce)}
                >
                  {m.text}
                </motion.div>
              );
            }

            // ── Persisted markers — each one re-renders a completed step from history ──

            // Mode pick — a compact user-side echo of the fork taken.
            if (m.who === 'modepick') {
              return (
                <motion.div
                  key={i}
                  className="self-end rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3.5 py-1.5 text-[12px] font-semibold"
                  {...bubbleAnim('user', reduce)}
                >
                  {m.mode === 'build'
                    ? t('ariaStudio.modeChooser.buildTitle')
                    : t('ariaStudio.modeChooser.tailorTitle')}
                </motion.div>
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
                <motion.div
                  key={i}
                  className="self-end max-w-[92%] bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] font-semibold"
                  {...bubbleAnim('user', reduce)}
                >
                  {m.sourceTitle}
                </motion.div>
              );
            }

            // The tailored copy landed — a durable emerald record of the clone.
            if (m.who === 'tailored') {
              return (
                <motion.div
                  key={i}
                  className="self-start max-w-[92%] flex items-start gap-2"
                  {...bubbleAnim('aria', reduce)}
                >
                  <AriaOrbit size={16} className="mt-2" />
                  <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 border-l-2 border-l-emerald-400 dark:border-l-emerald-500 bg-slate-50 dark:bg-slate-800/40 p-3.5 flex items-center gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[13px] font-bold">
                      ✓
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                        {t('ariaStudio.chat.tailoredCopyCreated')}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {m.title}
                      </span>
                    </span>
                  </div>
                </motion.div>
              );
            }

            // Brief confirmed — a centered emerald chip, same vocabulary as "Added".
            if (m.who === 'briefcard') {
              return (
                <motion.div
                  key={i}
                  className="self-center rounded-full border border-emerald-500/35 bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 px-3 py-1 text-[12px] font-semibold"
                  {...bubbleAnim('aria', reduce)}
                >
                  ✓ {t('ariaStudio.chat.readConfirmed')}
                </motion.div>
              );
            }

            // A scan happened — a centered chip. The RESULT itself isn't stored in the
            // transcript: the cards below render the live studioScan snapshot, so a
            // free recompute updates them without rewriting history.
            if (m.who === 'scan') {
              return (
                <motion.div
                  key={i}
                  className="self-center rounded-full border border-slate-900/35 bg-slate-900/[0.08] text-slate-900 dark:border-white/35 dark:bg-white/10 dark:text-white px-3 py-1 text-[12px] font-semibold"
                  {...bubbleAnim('aria', reduce)}
                >
                  ✓ {t('ariaStudio.chat.scannedAgainstJob')}
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
                              m.entry?.title ||
                              m.sectionLabel ||
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
                <motion.div
                  key={i}
                  className="self-start max-w-[92%] flex items-start gap-2"
                  {...bubbleAnim('aria', reduce)}
                >
                  <AriaOrbit size={16} className="mt-2" />
                  <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 border-l-2 border-l-emerald-400 dark:border-l-emerald-500 bg-slate-50 dark:bg-slate-800/40 p-3.5 flex items-center gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[13px] font-bold">
                      ✓
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                        {m.what
                          ? t('ariaStudio.chat.addedWhat', { what: m.what })
                          : t('ariaStudio.chat.addedBullets', { count: n })}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {m.entry?.title || m.sectionLabel}
                      </span>
                    </span>
                  </div>
                </motion.div>
              );
            }

            // Build-track markers. `buildintro` / `buildstart` are bookkeeping — they
            // record that the roadmap was accepted and the draft created — so they render
            // nothing; the conversation around them already tells that story.
            if (m.who === 'buildintro' || m.who === 'buildstart') return null;

            // The job answer, including "not yet" — worth showing, because a CV built
            // without a target is a deliberate choice the user should see recorded.
            if (m.who === 'buildjobdone') {
              if (!m.skipped) return null; // the jobcard above already shows the job
              return (
                <motion.div
                  key={i}
                  className="self-end rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3.5 py-1.5 text-[12px] font-semibold"
                  {...bubbleAnim('user', reduce)}
                >
                  {t('ariaStudio.chat.noSpecificJobYet')}
                </motion.div>
              );
            }

            // A finished role, filed into the stream. References the entry by _sortId
            // rather than snapshotting its contents, so it always reflects the CV.
            if (m.who === 'rolerecord') {
              const live = (cvData?.experience || []).find((e) => e._sortId === m.sortId);
              if (!live) return null; // deleted since — don't show a ghost
              const n = bulletCount(live);
              return (
                <motion.div
                  key={i}
                  className="self-start max-w-[92%] flex items-start gap-2"
                  {...bubbleAnim('aria', reduce)}
                >
                  <AriaOrbit size={16} className="mt-2" />
                  <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 border-l-2 border-l-emerald-400 bg-slate-50 dark:bg-slate-800/40 p-3 flex items-center gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[13px] font-bold">
                      ✓
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {live.title || t('ariaStudio.chat.untitledRole')}
                        {live.company ? ` · ${live.company}` : ''}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        {t('ariaStudio.chat.bulletsOnCv', { count: n })}
                      </span>
                    </span>
                  </div>
                </motion.div>
              );
            }

            if (m.who === 'contactdone') {
              return (
                <motion.div
                  key={i}
                  className="self-center rounded-full border border-emerald-500/35 bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 px-3 py-1 text-[12px] font-semibold"
                  {...bubbleAnim('aria', reduce)}
                >
                  ✓ {t('ariaStudio.chat.contactConfirmed')}
                </motion.div>
              );
            }

            // Any remaining textless item is an internal flow marker (for example,
            // unpinrole/pinrole). It must persist for refresh recovery, but it is not an
            // Aria turn and must never fall through into an empty speech bubble.
            if (!m.text) return null;

            // Aria turn — orbit + slate bubble.
            return (
              <motion.div
                key={i}
                className="self-start max-w-[92%] flex items-start gap-2"
                {...bubbleAnim('aria', reduce)}
              >
                <AriaOrbit size={16} className="mt-2" />
                <span className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] leading-relaxed">
                  {m.text}
                </span>
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
                <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {nextSection.eyebrow}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
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
                onGenerate={generateBuildSkills}
                onAdd={addPickedSkills}
                onManual={addManualSkills}
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
                <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {t('ariaStudio.chat.buildNewCvHeading')}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
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
                <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
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
            {ready && phase === 'results' && scan && <ScoreCard key="score" scan={scan} />}
            {ready && phase === 'results' && scan?.sections?.length > 0 && (
              <SectionBreakdownCard
                key="sections"
                sections={scan.sections}
                onFix={handleFix}
                onRecompute={runRecompute}
                recomputing={scanning}
                onRescan={runScan}
                rescanning={scanning}
                rescanCost={scanCost}
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

            {/* experience / projects → pick the entry to sharpen */}
            {ready && phase === 'fix:pick' && (
              <EntryPickerCard
                key="fixpick"
                entries={fixEntries}
                missingKeywords={activeFix?.missingKeywords || []}
                onPick={pickEntry}
                onCancel={cancelFix}
              />
            )}

            {/* skills → free checklist straight off the scan */}
            {ready && phase === 'fix:skills' && (
              <SkillsFixCard
                key="fixskills"
                missingSkills={scan?.missingSkills || []}
                onApply={applyScanSkills}
                onCancel={cancelFix}
                applying={applyingFix}
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
                note={scan?.sections?.find((s) => s.key === activeFix?.sectionKey)?.note}
                onBack={cancelFix}
              />
            )}
          </AnimatePresence>

          {/* Achievements for the pinned role — the SAME SectionCoach protocol the fix
              loop uses, pointed at this entry. One coaching path, not two: the free
              interview, the count picker, the credited generation and applyRoleBulletDiff
              all behave identically here. */}
          {pinnedEntry &&
            pinnedStage === 'achievements' &&
            !thinking &&
            !roleBusy &&
            !transitionLabel && (
              <SectionCoach
                key={`rolecoach-${pinnedEntry._sortId}`}
                draftId={draftId}
                dockNode={coachDock}
                entry={{
                  // 'project' routes coachChatTurn to its project framing (type-aware,
                  // problem → role → tech → outcome → link) instead of the job one.
                  section: pinnedSectionKey === 'project' ? 'project' : 'experience',
                  sortId: pinnedEntry._sortId,
                  title: pinnedEntry.title,
                  company: pinnedEntry.company,
                }}
                missingKeywords={(cvData?.targetJob?.brief?.mustHaves || [])
                  .map((k) => (typeof k === 'string' ? k : k?.name))
                  .filter(Boolean)
                  .slice(0, 4)}
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
      <AriaComposer
        className={`shrink-0 pt-3 pb-[env(safe-area-inset-bottom)] ${
          coachOwnsInput || studioTransition ? 'hidden' : ''
        }`}
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
      />

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
