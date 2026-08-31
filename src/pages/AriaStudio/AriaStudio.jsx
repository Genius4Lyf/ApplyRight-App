import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PanelLeft, FilePen, ListChecks, Briefcase } from 'lucide-react';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import { useStudioLayout, studioMainAttrs } from '../../hooks/useStudioLayout';
import { editorUnlocked, editorJustUnlocked } from '../../lib/studioFlow';
import { useAriaModel } from '../../hooks/useAriaModel';
import { useJobCoverage } from '../../hooks/useJobCoverage';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT } from '../../lib/noteStyles';
import { STUDIO_TAILORING_ENABLED } from '../../lib/studioFeatures';
import CVService from '../../services/cv.service';
import AriaOrbit from '../../components/cv/AriaOrbit';
import StudioChat from '../../components/ariaStudio/StudioChat';
import StudioArtifactPanel from '../../components/ariaStudio/StudioArtifactPanel';
import JobTargetPanel from '../../components/ariaStudio/JobTargetPanel';
import StudioLivePreview from '../../components/ariaStudio/StudioLivePreview';
import ModelPicker from '../../components/ModelPicker';
import SessionRail from '../../components/ariaStudio/SessionRail';
import StudioOverlay from '../../components/ariaStudio/StudioOverlay';
import DeleteSessionModal from '../../components/ariaStudio/DeleteSessionModal';
import StudioWelcomeGuide from '../../components/ariaStudio/StudioWelcomeGuide';
import EditModeUnlockedGuide from '../../components/ariaStudio/EditModeUnlockedGuide';
import TargetJobStrip from '../../components/ariaStudio/TargetJobStrip';

const STUDIO_WELCOME_GUIDE_KEY = 'ariaStudio:welcome-guide-seen:v1';
const STUDIO_EDIT_GUIDE_KEY = 'ariaStudio:edit-mode-guide-seen:v1';
// How long the "edit mode unlocked" nudge sits on the toggle before fading. Long
// enough to be read after looking away from the chat, short enough that it never
// becomes furniture over the header.
const EDIT_UNLOCK_NUDGE_MS = 6000;

// The Studio desk. Three panes at full width — sessions · conversation · artifact —
// collapsing to ONE pane on a phone, where the rail becomes a drawer and the artifact
// panel a bottom sheet. Mobile isn't a fallback here: the chat goes full-bleed and the
// score stays in the top bar at every width, because on a phone the top bar is the only
// thing always on screen.
const StudioDesk = () => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cvData,
    draftId,
    applicationId,
    loadSession,
    openApplication,
    newSession,
    flushChats,
    sessionNonce,
    renameCv,
    updateCvData,
  } = useAriaStudio();

  // The session's Aria model — the same per-draft choice the chat composers write to.
  const { modelId, selectModel } = useAriaModel({ draftId, cvData, updateCvData });

  const layout = useStudioLayout();
  const { closePreview, setPanelOverlay } = layout;
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  // The session awaiting a delete confirm, and which action is in flight.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(null);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  // The one-time teaching moment, and the lightweight recurring one. They are
  // deliberately exclusive: the modal IS the notification the first time, so firing the
  // pill underneath it would be the same news told twice.
  const [showEditGuide, setShowEditGuide] = useState(false);
  const [unlockNudge, setUnlockNudge] = useState(false);

  // This is deliberately a one-time orientation. It explains the boundary between
  // Studio (improve what's already there) and Builder (add structured CV entries)
  // before someone starts looking for an "add role" control in the live preview.
  useEffect(() => {
    try {
      setShowWelcomeGuide(!window.localStorage.getItem(STUDIO_WELCOME_GUIDE_KEY));
    } catch {
      setShowWelcomeGuide(true);
    }
  }, []);

  // Dismissing it is what marks it seen — including via Escape or the backdrop. Someone
  // who closed it has been told; re-teaching them on the next CV would be nagging.
  const completeEditGuide = useCallback(() => {
    setShowEditGuide(false);
    try {
      window.localStorage.setItem(STUDIO_EDIT_GUIDE_KEY, '1');
    } catch {
      // A privacy-restricted browser still gets the guide dismissed for this visit.
    }
  }, []);

  const completeWelcomeGuide = useCallback(() => {
    setShowWelcomeGuide(false);
    try {
      window.localStorage.setItem(STUDIO_WELCOME_GUIDE_KEY, '1');
    } catch {
      // A privacy-restricted browser can still dismiss the guide for this visit.
    }
  }, []);

  const scan = cvData?.studioScan;
  const score = scan?.fitScore;
  const band = bandOf(score);

  // Live "how much of this job can my CV defend yet?". Free, no AI, no charge, and it
  // writes nothing — see useJobCoverage. Present whenever a brief with must-haves exists,
  // which on the build track is from the moment the JD is read.
  const {
    coverage: jobCoverage,
    keywords: jobKeywords,
    ready: hasJobTarget,
  } = useJobCoverage(cvData);
  // ONE pill, never two. A scanned tailoring keeps its fit score exactly as before; the
  // tracker is for the build track, which never scans and so has shown nothing at all.
  const showJobTracker = score == null && hasJobTarget;

  // Refresh the rail. Re-run whenever the bound session changes so a brand-new
  // tailoring appears in the list the moment it's created.
  const refreshSessions = useCallback(async () => {
    try {
      const res = await CVService.studioSessions();
      setSessions(res?.sessions || []);
    } catch (err) {
      console.error('Failed to load studio sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // Re-run on either binding: a brand-new analysis has to appear in Recents the moment
  // it exists, exactly as a new CV session does.
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions, draftId, applicationId]);

  // This page is `fixed inset-0` (own full-screen scroll region), but the document
  // behind it is still scrollable — on mobile that's what let a chat's exhausted
  // scroll chain drag the whole page along with it. Lock html+body while mounted.
  //
  // Goes through the SHARED counter-based lock (not an ad hoc save/restore of
  // style.overflow) because this page's own mobile rail drawer and bottom sheet
  // (StudioOverlay) lock the same body independently — two uncoordinated lockers
  // racing on unmount is exactly what left the page frozen after "Home" while a
  // sheet was open: whichever one unwound LAST clobbered the other's restore.
  useBodyScrollLock(true);

  // Arrived with a session already decided. Three ways that happens, all consumed ONCE
  // (the router state is cleared) so a refresh doesn't restart the session:
  //
  //   start: 'prep'   → the home page's card, which now leads here instead of unfolding
  //                     a workflow of its own.
  //   seedSource      → a tailoring whose source CV is already chosen.
  //   openApplication → an analysis to reopen, from a link outside the Studio.
  //
  // Each STARTS A NEW SESSION rather than resuming the remembered one: arriving through a
  // door that names what you came to do should not drop you back into last week's CV.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    const seed = location.state?.seedSource;
    const reopen = location.state?.openApplication;
    const start = location.state?.start;
    if (!seed?.id && !reopen && !start) return;
    seededRef.current = true;
    window.history.replaceState({}, '');
    if (reopen) openApplication(reopen);
    else if (start) newSession(start);
    else newSession('tailor', seed);
  }, [location.state, newSession, openApplication]);

  // The unsaved tail of a conversation is the easiest thing in this design to lose —
  // the autosave is debounced, so a tab close mid-sentence would drop it.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushChats();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushChats);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushChats);
    };
  }, [flushChats]);

  // CV agents need an active plan to create CVs (402 NEED_AGENT_SUB). The page owns the
  // router, so routing to the plans lives here rather than in the provider or the chat.
  const handlePaywall = () => {
    toast.error(t('ariaStudio.desk.toast.agentPlanRequired'));
    navigate('/upgrade');
  };

  // Recents holds two kinds of row, and they open two different ways: a CV session binds
  // a draft, an analysis binds an Application and rebuilds its conversation from the
  // record. The row itself says which, so the rail hands over the whole session rather
  // than just an id.
  const openSession = async (session) => {
    layout.setRailOverlay(false);
    if (session.kind === 'application') {
      // Deliberately NOT short-circuited on "it is already the active one". The provider
      // remembers the binding across a refresh but the chat's copy of the analysis does
      // not survive with it, so the row a user clicks to recover from that is exactly the
      // one an equality check would refuse. Reopening is a single GET; correctness is
      // worth more than saving it.
      await openApplication(session._id);
      return;
    }
    await loadSession(session._id);
  };

  // "New CV" now opens a real build session in the Studio rather than handing off to the
  // CV builder — newSession('build') unbinds and lands the chat on the roadmap, which
  // creates the draft once the user commits to starting.
  const startSession = async (kind) => {
    layout.setRailOverlay(false);
    await newSession(kind);
  };

  // Deleting the ACTIVE session has to unbind first, or the provider stays pointed at a
  // draft that no longer exists and every autosave 404s. The same applies to an analysis:
  // a bound applicationId pointing at a deleted record would 404 the next reopen.
  const finishRemoval = async (session) => {
    if (session._id === draftId || session._id === applicationId) {
      await newSession(STUDIO_TAILORING_ENABLED ? 'tailor' : 'build');
    }
    setPendingDelete(null);
    setDeleteBusy(null);
    await refreshSessions();
  };

  // Renaming from a Recents row — the only place a session can be renamed now that the
  // header no longer carries an editable title. Works on any row, not just the active
  // one, so a build session's name can be fixed without opening it first.
  const renameSession = async (session, rawTitle) => {
    const title = (rawTitle || '').trim();
    if (!title || title === (session.title || '')) return;
    if (session._id === draftId) {
      await renameCv(title);
    } else {
      try {
        await CVService.saveDraft({ _id: session._id, title });
      } catch (err) {
        console.error('Failed to rename session', err);
        toast.error(
          t('ariaStudio.desk.toast.renameFailed', { defaultValue: 'Could not save the new name.' })
        );
        return;
      }
    }
    await refreshSessions();
  };

  const removeFromStudio = async (session) => {
    setDeleteBusy('remove');
    try {
      await CVService.studioRemoveSession(session._id);
      toast.success(t('ariaStudio.desk.toast.removedFromStudio'));
      await finishRemoval(session);
    } catch (err) {
      console.error('Failed to remove session', err);
      toast.error(t('ariaStudio.desk.toast.removeFailed'));
      setDeleteBusy(null);
    }
  };

  const deleteSession = async (session) => {
    setDeleteBusy('delete');
    try {
      // Two collections behind one list — an analysis is an Application, not a DraftCV.
      if (session.kind === 'application') {
        await CVService.deleteApplication(session._id);
      } else {
        await CVService.deleteDraft(session._id);
      }
      toast.success(t('ariaStudio.desk.toast.deleted'));
      await finishRemoval(session);
    } catch (err) {
      console.error('Failed to delete session', err);
      toast.error(t('ariaStudio.desk.toast.deleteFailed'));
      setDeleteBusy(null);
    }
  };

  const railProps = {
    sessions,
    loading: loadingSessions,
    // One of the two is always null — a session is either a document or an analysis.
    activeId: draftId || applicationId,
    onSelect: openSession,
    onRename: renameSession,
    onDelete: (s) => {
      layout.setRailOverlay(false);
      setPendingDelete(s);
    },
    onNewTailoring: () => startSession('tailor'),
    onNewCv: () => startSession('build'),
    onNewPrep: () => startSession('prep'),
    onOpenGuide: () => {
      // A guide is a foreground surface; on a phone it must replace, not sit beside,
      // the sessions drawer that launched it.
      layout.setRailOverlay(false);
      setShowWelcomeGuide(true);
    },
    onBeforeCreditStore: flushChats,
  };

  // Select a right-panel view. On a sheet width both open as the bottom sheet; inline,
  // clicking the ACTIVE view toggles it closed (so the chat can own the room). Opening
  // the wide preview auto-collapses the rail — that rule lives in the hook's setPanelView.
  const selectView = (view) => {
    if (layout.panelUsesSheet) {
      layout.setPanelView(view);
      layout.setPanelOverlay(true);
      return;
    }
    // Toggling OFF the wide preview returns to the default working view (insights + rail
    // restored), not a bare chat. Insights toggles off to null (chat-only) as before.
    if (layout.panelView === view) {
      if (view === 'preview') layout.closePreview();
      else layout.setPanelView(null);
      return;
    }
    layout.setPanelView(view);
  };
  // Tapping the score chip goes straight to the section verdicts (insights view).
  const openPanel = () => selectView('insights');
  // The job tracker opens its OWN view — what the job asks for, ticked off — rather than
  // the section verdicts. The two answer different questions: insights is organised by the
  // user's CV, this is organised by the employer's list.
  const openTarget = () => selectView('target');

  // The Preview toggle appears once a draft is bound (build OR tailor). Before that it
  // stays hidden — the mode chooser has no bound document to preview.
  const canPreview = !!cvData?._id;
  // A remembered view must not leak into a session that cannot show it: 'preview' before a
  // draft is bound, and 'target' on a CV with no job to target (a no-JD build, or a session
  // opened before one was set). Both fall back to insights rather than an empty panel.
  const rememberedView = layout.panelView;
  const panelView =
    (rememberedView === 'preview' && !canPreview) || (rememberedView === 'target' && !hasJobTarget)
      ? 'insights'
      : rememberedView;

  // The green dot means THE EDITOR IS READY — your CV has its core sections and every
  // line in the preview is now yours to change.
  //
  // It deliberately does NOT mean "the panel is open". The moment that matters most is the
  // one where the panel is CLOSED and the user has no idea anything changed: on a phone
  // there is no room to open it beside the chat at all, so the blinking dot on the toggle
  // is the only thing that says "there's something here now". Gating it on visibility
  // would hide it exactly when it has something to say.
  //
  // Shared gate with the panel itself (studioFlow.editorUnlocked), so the dot can never
  // advertise an editor that would still be read-only when tapped.
  const editorReady = canPreview && editorUnlocked(cvData);

  // A remembered Preview preference must not leak into a session that can't show it yet.
  // Once canPreview is true (cvData._id exists) the effect short-circuits and the panel
  // preference can be 'preview' for both build and tailor.
  useEffect(() => {
    if (canPreview || layout.panelView !== 'preview') return;
    closePreview();
    setPanelOverlay(false);
  }, [canPreview, layout.panelView, closePreview, setPanelOverlay]);

  // When the editor UNLOCKS, open the preview — Aria says "I've opened the editor on the
  // right", and she should be telling the truth rather than describing a button.
  //
  // Three things this is careful about:
  //
  //  1. ONLY ON THE TRANSITION. Opening a session whose CV was already complete must not
  //     override the panel the user chose last time. The ref remembers per-draft, so a
  //     session switch can't be mistaken for an unlock either.
  //  2. INLINE WIDTHS ONLY. On a phone the panel is a full-screen sheet, so auto-opening
  //     would bury the message the user is still reading. There the blinking dot carries
  //     it instead — which is why the dot is not gated on the panel being visible.
  //  3. `setPanelView`, not `selectView` — this is not a toggle. selectView would CLOSE
  //     the preview if it happened to be the current view already.
  const editorReadyRef = useRef({ draftId: null, ready: null });
  useEffect(() => {
    if (!canPreview) return; // no document yet — nothing to judge
    const previous = editorReadyRef.current;
    const current = { draftId, ready: editorReady };
    editorReadyRef.current = current;
    if (!editorJustUnlocked(previous, current)) return;

    // Say what happened, not just show it. The auto-open below only fires at inline
    // widths, so on a phone this is the entire announcement; on desktop it names the
    // panel that just appeared, which is otherwise a silent layout change.
    let seenEditGuide = true;
    try {
      seenEditGuide = !!window.localStorage.getItem(STUDIO_EDIT_GUIDE_KEY);
    } catch {
      seenEditGuide = false;
    }
    if (seenEditGuide) setUnlockNudge(true);
    else setShowEditGuide(true);

    if (!layout.panelInline) return;
    layout.setPanelView('preview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPreview, draftId, editorReady, layout.panelInline]);

  // One shot, like the bullet-apply pulse it is modelled on: it announces a transition,
  // and the permanent green dot is what carries the ongoing state afterwards.
  useEffect(() => {
    if (!unlockNudge) return undefined;
    const timer = window.setTimeout(() => setUnlockNudge(false), EDIT_UNLOCK_NUDGE_MS);
    return () => window.clearTimeout(timer);
  }, [unlockNudge]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
      <main
        className="studio-main flex-1 min-h-0 w-full max-w-[1600px] mx-auto px-0 sm:px-4 sm:py-4 flex gap-4 min-w-0"
        {...studioMainAttrs({
          panelView,
          panelInline: layout.panelInline,
          railInline: layout.railInline,
        })}
      >
        {/* Sessions — inline only when there's room and the user hasn't collapsed it. */}
        {layout.railInline && (
          <div className="w-[248px] shrink-0 min-h-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <SessionRail {...railProps} />
          </div>
        )}

        {/* Conversation — full-bleed on a phone, so the chat owns the screen. On desktop
            it's a flex column whose grow ratio is negotiated with the preview via the
            main row's data-attrs (see .studio-col rules in index.css). */}
        <div className="studio-col-chat min-w-0 min-h-0 flex flex-col sm:rounded-xl sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* `relative z-10` keeps the header above the transcript that scrolls beneath
              it. The old `studio-mobile-header` hook is gone with the blurred fade it
              existed to position. */}
          <div className="relative z-10 shrink-0 flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-2.5 sm:border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() =>
                layout.isMobile ? layout.setRailOverlay(true) : layout.setRailOpen(!layout.railOpen)
              }
              aria-label={
                layout.railInline
                  ? t('ariaStudio.desk.hideSessions')
                  : t('ariaStudio.desk.showSessions')
              }
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <AriaOrbit size={20} className="shrink-0" />

            <div className="min-w-0 flex-1 flex items-center">
              {/* Model picker lives here now — no header title/subtitle to edit or read;
                  renaming a CV happens from its row in the Recents rail instead. */}
              {draftId && (
                <ModelPicker value={modelId} onSelect={selectModel} align="left" studio />
              )}
            </div>

            {/* The score stays in the top bar at EVERY width — on a phone it's the only
                thing permanently on screen, and it's the number people come back for. */}
            {score != null && (
              <button
                type="button"
                onClick={openPanel}
                aria-label={t('ariaStudio.desk.fitScoreAria', { score })}
                className="shrink-0 inline-flex items-baseline gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span
                  className={`font-heading text-[15px] font-bold tabular-nums ${BAND_TEXT[band]}`}
                >
                  {score}
                </span>
                <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
                  {t('ariaStudio.desk.outOf100')}
                </span>
              </button>
            )}

            {/* The job tracker — the build track's answer to the score pill above. Shows
                how many of the job's MUST-HAVES the CV can defend so far, from the moment
                the JD is read. Deliberately ink and not a band colour: 0 of 4 at the start
                of a build is a to-do list, and painting it red would call an unfinished CV
                a bad one. */}
            {showJobTracker && (
              <button
                type="button"
                onClick={openTarget}
                aria-label={t('ariaStudio.jobTarget.pillAria', {
                  done: jobCoverage?.mustHaveCovered ?? 0,
                  total: jobCoverage?.mustHaveTotal ?? 0,
                })}
                title={t('ariaStudio.jobTarget.eyebrow')}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span className="font-heading text-[15px] font-bold tabular-nums text-slate-900 dark:text-white">
                  {jobCoverage?.mustHaveCovered ?? 0}
                </span>
                <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
                  /{jobCoverage?.mustHaveTotal ?? 0}
                </span>
              </button>
            )}

            {/* View switch — the WIDE Live preview vs the NARROW insights. Active view
                gets the neutral active-state (matching the other header toggles); the
                score pill stays to their right. */}
            <div className="relative shrink-0 flex items-center gap-1">
              {canPreview && (
                <button
                  type="button"
                  onClick={() => selectView('preview')}
                  aria-pressed={panelView === 'preview'}
                  aria-label={
                    editorReady
                      ? t('ariaStudio.livePreview.headingEditable')
                      : t('ariaStudio.livePreview.heading')
                  }
                  className={`inline-flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                    panelView === 'preview'
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {/* The dot sits ON the icon, not beside the label — the label is hidden
                      below md, and that is exactly the width where "your CV is editable
                      now" is hardest to notice. aria-hidden: the state is already in the
                      button's label, so announcing the dot too would just be noise. */}
                  <span className="relative inline-flex shrink-0">
                    <FilePen className="w-5 h-5" />
                    {editorReady && (
                      <span
                        aria-hidden="true"
                        className="studio-live-dot absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950"
                      />
                    )}
                  </span>
                  <span className="hidden md:inline">{t('ariaStudio.livePreview.heading')}</span>
                </button>
              )}

              {/* The recurring nudge. role="status" rather than an alert: it is news, not
                  a problem, and a screen reader should hear it without being interrupted. */}
              <AnimatePresence>
                {unlockNudge && (
                  <motion.button
                    type="button"
                    key="unlock-nudge"
                    role="status"
                    onClick={() => {
                      setUnlockNudge(false);
                      selectView('preview');
                    }}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute right-0 top-full z-30 mt-1.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-800 shadow-lg dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                  >
                    <span
                      className="studio-live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    {t('ariaStudio.livePreview.editModeUnlocked')}
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => selectView('insights')}
                aria-pressed={panelView === 'insights'}
                aria-label={t('ariaStudio.desk.insights')}
                title={t('ariaStudio.desk.sectionVerdicts')}
                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                  panelView === 'insights'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <ListChecks className="w-5 h-5" />
              </button>
            </div>
          </div>

          <TargetJobStrip model={modelId} />

          {/* Remounted per session — a stale phase or in-flight coach state from the
              previous session must never bleed into the next one. */}
          <StudioChat key={sessionNonce} onPaywall={handlePaywall} onNavigate={navigate} />
        </div>

        {/* Right panel — inline only at the widest layout. The WIDE Live preview shares
            the room with the chat (studio-col); the NARROW insights keeps its fixed width. */}
        {layout.panelInline &&
          (panelView === 'preview' ? (
            <div className="studio-col-panel min-h-0">
              <StudioLivePreview
                onClose={() => layout.closePreview()}
                isSheet={layout.panelUsesSheet}
              />
            </div>
          ) : panelView === 'target' ? (
            <div className="w-[320px] shrink-0 min-h-0">
              <JobTargetPanel
                coverage={jobCoverage}
                keywords={jobKeywords}
                onClose={() => layout.setPanelView(null)}
              />
            </div>
          ) : (
            <div className="w-[320px] shrink-0 min-h-0">
              <StudioArtifactPanel
                onClose={() => layout.setPanelView(null)}
                onViewCv={() => selectView('preview')}
              />
            </div>
          ))}

        {/* Slim reopen tab, so a collapsed panel is never lost — reopens the insights view. */}
        {!layout.panelInline && !layout.panelUsesSheet && (
          <button
            type="button"
            onClick={() => layout.setPanelView('insights')}
            aria-label={t('ariaStudio.desk.showPanel')}
            className="shrink-0 self-center w-6 py-6 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
          >
            <span className="block [writing-mode:vertical-rl] rotate-180 font-mono text-[9px] uppercase tracking-[0.16em]">
              {t('ariaStudio.desk.panel')}
            </span>
          </button>
        )}
      </main>

      {/* ── Mobile presentations ── */}
      <StudioOverlay
        open={layout.railOverlay}
        onClose={() => layout.setRailOverlay(false)}
        side="left"
        label={t('ariaStudio.desk.studioSessions')}
      >
        <SessionRail {...railProps} />
      </StudioOverlay>

      <StudioOverlay
        open={layout.panelOverlay}
        onClose={() => layout.setPanelOverlay(false)}
        side="bottom"
        label={
          panelView === 'preview'
            ? t('ariaStudio.livePreview.heading')
            : panelView === 'target'
              ? t('ariaStudio.jobTarget.eyebrow')
              : t('ariaStudio.desk.tailoredCopy')
        }
      >
        {panelView === 'preview' ? (
          <StudioLivePreview
            onClose={() => layout.setPanelOverlay(false)}
            isSheet={layout.panelUsesSheet}
          />
        ) : panelView === 'target' ? (
          <JobTargetPanel
            coverage={jobCoverage}
            keywords={jobKeywords}
            onClose={() => layout.setPanelOverlay(false)}
          />
        ) : (
          <StudioArtifactPanel
            bare
            onClose={() => layout.setPanelOverlay(false)}
            onViewCv={() => selectView('preview')}
          />
        )}
      </StudioOverlay>

      <DeleteSessionModal
        session={pendingDelete}
        busy={deleteBusy}
        onCancel={() => setPendingDelete(null)}
        onRemove={removeFromStudio}
        onDelete={deleteSession}
      />

      <StudioWelcomeGuide open={showWelcomeGuide} onComplete={completeWelcomeGuide} />

      {/* Held back behind the welcome guide rather than dropped: a brand-new user who
          finishes a CV while the orientation is still open should still be told. */}
      <EditModeUnlockedGuide
        open={showEditGuide && !showWelcomeGuide}
        onOpenPreview={() => {
          completeEditGuide();
          layout.setPanelView('preview');
        }}
        onComplete={completeEditGuide}
      />
    </div>
  );
};

// Aria Studio — the standalone agentic chat where Aria tailors a COPY of your CV to a
// job. Deliberately not a CV-builder step: it owns its own document via
// AriaStudioProvider and never touches CVContext.
const AriaStudio = () => (
  <AriaStudioProvider>
    <StudioDesk />
  </AriaStudioProvider>
);

export default AriaStudio;
