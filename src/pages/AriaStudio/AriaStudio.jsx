import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { PanelLeft, Pencil, Eye, ListChecks } from 'lucide-react';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import { useStudioLayout, studioMainAttrs } from '../../hooks/useStudioLayout';
import { useAriaModel } from '../../hooks/useAriaModel';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT } from '../../lib/noteStyles';
import { STUDIO_TAILORING_ENABLED } from '../../lib/studioFeatures';
import CVService from '../../services/cv.service';
import AriaOrbit from '../../components/cv/AriaOrbit';
import StudioChat from '../../components/ariaStudio/StudioChat';
import StudioArtifactPanel from '../../components/ariaStudio/StudioArtifactPanel';
import StudioLivePreview from '../../components/ariaStudio/StudioLivePreview';
import ModelPicker from '../../components/ModelPicker';
import SessionRail from '../../components/ariaStudio/SessionRail';
import StudioOverlay from '../../components/ariaStudio/StudioOverlay';
import DeleteSessionModal from '../../components/ariaStudio/DeleteSessionModal';
import StudioWelcomeGuide from '../../components/ariaStudio/StudioWelcomeGuide';

const STUDIO_WELCOME_GUIDE_KEY = 'ariaStudio:welcome-guide-seen:v1';

// The Studio desk. Three panes at full width — sessions · conversation · artifact —
// collapsing to ONE pane on a phone, where the rail becomes a drawer and the artifact
// panel a bottom sheet. Mobile isn't a fallback here: the chat goes full-bleed and the
// score stays in the top bar at every width, because on a phone the top bar is the only
// thing always on screen.
const StudioDesk = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cvData,
    draftId,
    loadSession,
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

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions, draftId]);

  // This page is `fixed inset-0` (own full-screen scroll region), but the document
  // behind it is still scrollable — on mobile that's what let a chat's exhausted
  // scroll chain drag the whole page along with it. Lock html+body while mounted,
  // and restore whatever was there before (never blindly clear it: something else,
  // e.g. a modal, may have locked it first and still owns the unlock).
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Arrived from an analysis with a source CV already decided — open a tailor
  // session with it pre-selected, so Aria doesn't ask which CV to use. Consumed
  // once (the state is cleared) so a refresh doesn't restart the session.
  const seededRef = useRef(false);
  useEffect(() => {
    const seed = location.state?.seedSource;
    if (!seed?.id || seededRef.current) return;
    seededRef.current = true;
    window.history.replaceState({}, '');
    newSession('tailor', seed);
  }, [location.state, newSession]);

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

  const openSession = async (id) => {
    layout.setRailOverlay(false);
    await loadSession(id);
  };

  // "New CV" now opens a real build session in the Studio rather than handing off to the
  // CV builder — newSession('build') unbinds and lands the chat on the roadmap, which
  // creates the draft once the user commits to starting.
  const startSession = async (kind) => {
    layout.setRailOverlay(false);
    await newSession(kind);
  };

  // Deleting the ACTIVE session has to unbind first, or the provider stays pointed at a
  // draft that no longer exists and every autosave 404s.
  const finishRemoval = async (session) => {
    if (session._id === draftId) await newSession(STUDIO_TAILORING_ENABLED ? 'tailor' : 'build');
    setPendingDelete(null);
    setDeleteBusy(null);
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
      await CVService.deleteDraft(session._id);
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
    activeId: draftId,
    onSelect: openSession,
    onDelete: (s) => {
      layout.setRailOverlay(false);
      setPendingDelete(s);
    },
    onNewTailoring: () => startSession('tailor'),
    onNewCv: () => startSession('build'),
    onOpenGuide: () => setShowWelcomeGuide(true),
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

  const isBuildSession = cvData?.studioKind === 'build';
  // The Preview toggle appears once a draft is bound (build OR tailor). Before that it
  // stays hidden — the mode chooser has no bound document to preview. This replaces the
  // old isTailorSession gate, whose only three uses were the ones below; a tailor session
  // always has an _id, so that path is unchanged.
  const canPreview = !!cvData?._id;
  const panelView = !canPreview && layout.panelView === 'preview' ? 'insights' : layout.panelView;

  // A remembered Preview preference must not leak into a session that can't show it yet.
  // Once canPreview is true (cvData._id exists) the effect short-circuits and the panel
  // preference can be 'preview' for both build and tailor.
  useEffect(() => {
    if (canPreview || layout.panelView !== 'preview') return;
    closePreview();
    setPanelOverlay(false);
  }, [canPreview, layout.panelView, closePreview, setPanelOverlay]);

  const headingTitle = isBuildSession
    ? cvData?.title || t('ariaStudio.desk.newCv')
    : cvData?.tailoredForJob?.title ||
      cvData?.targetJob?.title ||
      cvData?.title ||
      t('ariaStudio.desk.title');
  // A build session isn't tailoring anything, so it must not claim to be. Falls back to
  // the kind's own description rather than the tailor strapline.
  const headingSub =
    [
      cvData?.targetJob?.brief?.company,
      cvData?.tailoredFromTitle &&
        t('ariaStudio.sessionRail.fromSource', { source: cvData.tailoredFromTitle }),
    ]
      .filter(Boolean)
      .join(' · ') ||
    (isBuildSession ? t('ariaStudio.desk.buildingWithAria') : t('ariaStudio.desk.tailorToJob'));

  // Inline title editing for BUILD sessions — mirrors the CV builder's header rename
  // (click → focused input; Enter or blur saves; Escape cancels). A tailor session's
  // heading is its job title, not cvData.title, so it stays read-only for now.
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef(null);
  const skipTitleSave = useRef(false);
  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);
  // Switching sessions mid-edit must not carry the open editor into the next one.
  useEffect(() => {
    setEditingTitle(false);
  }, [draftId]);
  const beginTitleEdit = () => {
    setTitleDraft(cvData?.title || '');
    setEditingTitle(true);
  };
  const commitTitleEdit = async () => {
    setEditingTitle(false);
    if (skipTitleSave.current) {
      skipTitleSave.current = false;
      return;
    }
    const next = (titleDraft || '').trim();
    if (!next || next === (cvData?.title || '')) return; // no real change → nothing to refresh
    await renameCv(next);
    await refreshSessions(); // the rail row reflects the new name immediately
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-transparent">
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
        <div className="studio-col-chat min-w-0 min-h-0 flex flex-col sm:rounded-xl border-y sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
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
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <AriaOrbit size={18} className="shrink-0 hidden sm:block" />

            <div className="min-w-0 flex-1">
              {isBuildSession && editingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitTitleEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      skipTitleSave.current = true;
                      e.currentTarget.blur();
                    }
                  }}
                  aria-label={t('ariaStudio.desk.cvName')}
                  className="w-full max-w-[18rem] text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-tight bg-transparent border-0 outline-none p-0"
                />
              ) : isBuildSession ? (
                <button
                  type="button"
                  onClick={beginTitleEdit}
                  title={t('ariaStudio.desk.renameCv')}
                  className="group/title flex items-center gap-1 max-w-full text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-tight hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <span className="truncate">{headingTitle}</span>
                  <Pencil className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                </button>
              ) : (
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                  {headingTitle}
                </p>
              )}
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 truncate">
                {headingSub}
              </p>
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

            {/* Model picker — which model powers this session's chat/tailoring. Only once
                there's a real draft to persist the choice onto. */}
            {draftId && <ModelPicker value={modelId} onSelect={selectModel} align="right" />}

            {/* View switch — the WIDE Live preview vs the NARROW insights. Active view
                gets the neutral active-state (matching the other header toggles); the
                score pill stays to their right. */}
            <div className="shrink-0 flex items-center gap-1">
              {canPreview && (
                <button
                  type="button"
                  onClick={() => selectView('preview')}
                  aria-pressed={panelView === 'preview'}
                  aria-label={t('ariaStudio.livePreview.heading')}
                  className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-semibold transition-colors ${
                    panelView === 'preview'
                      ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden md:inline">{t('ariaStudio.livePreview.heading')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => selectView('insights')}
                aria-pressed={panelView === 'insights'}
                aria-label={t('ariaStudio.desk.insights')}
                title={t('ariaStudio.desk.sectionVerdicts')}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                  panelView === 'insights'
                    ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ListChecks className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Remounted per session — a stale phase or in-flight coach state from the
              previous session must never bleed into the next one. */}
          <StudioChat key={sessionNonce} onPaywall={handlePaywall} />
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
            : t('ariaStudio.desk.tailoredCopy')
        }
      >
        {panelView === 'preview' ? (
          <StudioLivePreview
            onClose={() => layout.setPanelOverlay(false)}
            isSheet={layout.panelUsesSheet}
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
