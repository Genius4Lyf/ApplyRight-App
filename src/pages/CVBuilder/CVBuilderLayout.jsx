import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Save,
  LogOut,
  AlertCircle,
  Check,
  AlertTriangle,
  Pencil,
  Eye,
  EyeOff,
  ChevronLeft,
  Target,
  Lock,
  Crown,
} from 'lucide-react';
import { CVBuilderProvider, useCVBuilder } from '../../context/CVContext';
import ATSCoachPanel from '../../components/cv/ATSCoachPanel';
import { generateMarkdownFromDraft } from '../../utils/markdownUtils';
import CVTemplateRenderer from '../../components/CVTemplateRenderer';

const ScaledCVPreview = ({ cvData }) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { isStepComplete, steps, goToStep } = useCVBuilder();
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(0);

  const previewApplication = useMemo(() => {
    const { optimizedCV } = generateMarkdownFromDraft(cvData);
    return {
      optimizedCV,
      templateId: cvData.templateId || 'ats-clean',
    };
  }, [cvData]);

  const previewUserProfile = useMemo(() => {
    return {
      fullName: cvData.personalInfo?.fullName || '',
      email: cvData.personalInfo?.email || '',
      phone: cvData.personalInfo?.phone || '',
      linkedinUrl: cvData.personalInfo?.linkedin || '',
      portfolioUrl: cvData.personalInfo?.website || '',
      location: cvData.personalInfo?.address || '',
    };
  }, [cvData]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || !contentRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const targetWidth = 794; // Standard A4 width in pixels
      const newScale = Math.min((containerWidth - 32) / targetWidth, 1.2); // 32px padding/margin
      setScale(newScale);
      setScaledHeight(contentRef.current.clientHeight * newScale);
    };

    updateScale();

    // Use ResizeObserver for accurate sizing on container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (contentRef.current) {
      // Observe content height changes, e.g. when typing adds new lines
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [cvData]);

  const scaledWidth = 794 * scale;

  const journeySteps = steps.filter((s) => s.id !== 'finalize' && s.id !== 'target_job');
  const isJourneyComplete = journeySteps.every((s) => isStepComplete(s.id));
  const doneCount = journeySteps.filter((s) => isStepComplete(s.id)).length;
  const totalCount = journeySteps.length;

  if (!isJourneyComplete) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto p-6 flex flex-col items-center bg-slate-50 dark:bg-slate-950 custom-scrollbar relative"
      >
        <div className="w-full max-w-sm my-auto flex flex-col items-center text-center">
          {/* Locked Badge */}
          <div className="relative mb-4 group">
            <div className="absolute inset-0 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-md group-hover:blur-lg transition-all duration-300" />
            <div className="relative w-16 h-16 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-white dark:border-slate-950">
              !
            </div>
          </div>

          <h3 className="font-heading text-base font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            Live Preview Locked
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 max-w-[280px] leading-relaxed font-medium">
            Complete all sections of your CV journey to unlock the template rendering.
          </p>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1.5 mb-4 relative overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / totalCount) * 100}%` }}
            />
          </div>
          <div className="w-full flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-5">
            <span>Progress</span>
            <span>
              {doneCount} / {totalCount} Completed
            </span>
          </div>

          {/* Steps List */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800/40">
            {journeySteps.map((step, idx) => {
              const isStepDone = isStepComplete(step.id);
              const originalIndex = steps.findIndex((s) => s.id === step.id);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(originalIndex)}
                  className="w-full flex items-center justify-between p-3.5 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 group outline-none"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isStepDone
                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isStepDone ? <Check className="w-3 h-3" /> : idx + 1}
                    </span>
                    <span
                      className={`text-xs font-bold transition-colors ${
                        isStepDone
                          ? 'text-slate-600 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {!isStepDone && (
                    <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider flex items-center gap-0.5">
                      Fill In &rarr;
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden p-4 flex justify-center bg-slate-100 dark:bg-slate-900 custom-scrollbar relative"
    >
      <div
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: '794px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            left: 0,
            top: 0,
          }}
          className="bg-white shadow-xl rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[1123px] text-left"
        >
          <CVTemplateRenderer application={previewApplication} userProfile={previewUserProfile} />
        </div>
      </div>
    </div>
  );
};

const CVBuilderInner = () => {
  const {
    cvData,
    liveCvData,
    currentStepIndex,
    visitedSteps,
    steps,
    saving,
    user,
    handleNext,
    handleBack,
    goToStep,
    registerStepData,
    flushDraft,
    renameCv,
    updateCvData,
    exitWizard,
    stepDirty,
    setStepDirty,
    loading,
    isStepComplete,
    externalEditNonce,
    lastAiWriteSortId,
  } = useCVBuilder();

  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState('coach'); // 'coach' | 'preview'

  // The step the user is on now — drives the dynamic coaching and the tab
  // auto-switch below.
  const currentStepId = steps[currentStepIndex]?.id;

  // ── Draggable mobile coach drawer ────────────────────────────────────────────
  // The coach lives in an always-present bottom drawer the student drags up (to
  // read/chat, up to ~85vh) or down to a small peek — so they balance the CV form
  // against the conversation. Height is a plain px value driven by the drag handle.
  const DRAWER_MIN = 140;
  const drawerMax = () => Math.round(window.innerHeight * 0.85);
  const [drawerH, setDrawerH] = useState(260); // resting "peek"
  const dragRef = useRef(null);
  const onDragStart = (e) => {
    dragRef.current = { y: e.clientY, h: drawerH };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e) => {
    if (!dragRef.current) return;
    const h = dragRef.current.h + (dragRef.current.y - e.clientY);
    setDrawerH(Math.max(DRAWER_MIN, Math.min(drawerMax(), h)));
  };
  const onDragEnd = () => {
    dragRef.current = null;
  };

  // The role/project Aria is focused on (bound via "Ask Aria" from Work History /
  // Projects). Drives the coach's focus bar; the build-with flow reads it in Chunk 5.
  const [focusedEntry, setFocusedEntry] = useState(null);

  // Reactive desktop flag (1024px = Tailwind `lg`). We mount only ONE ATSCoachPanel —
  // the desktop rail OR the mobile drawer, never both — so a hidden duplicate can't
  // fire its focus effect + persist a stale [opener] thread over the visible chat.
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // "Ask Aria" from a role/project: bind her focus + bring the coach forward. Flush
  // the draft to the DB first (fire-and-forget) so the role's _sortId exists server-
  // side — the build-with chat resolves the focused role by _sortId, and without this
  // a role edited on the current step (not yet persisted) would 404 "role not found".
  const askAria = (section, entry) => {
    flushDraft?.();
    setFocusedEntry({
      section,
      sortId: entry._sortId,
      title: entry.title || '',
      company: entry.company || '',
    });
    setActiveTab('coach');
    setShowPreview(true); // ensure desktop rail open
    setDrawerH((h) => Math.max(h, Math.round(window.innerHeight * 0.6))); // raise mobile drawer
  };

  // Coach the user through every building step, then hand them the live preview
  // the moment they reach Review (finalize) for a "here's your finished CV" moment.
  // Adjust the tab DURING RENDER when the step changes (React's recommended
  // alternative to a setState-in-effect) so a manual tab click still sticks while
  // the user stays on the same step.
  const [tabStepId, setTabStepId] = useState(currentStepId);
  if (currentStepId !== tabStepId) {
    setTabStepId(currentStepId);
    setActiveTab(currentStepId === 'finalize' ? 'preview' : 'coach');
  }

  // Browser-level guard against accidental tab close / refresh / back-button
  // when the current step has unsaved typing. Browsers ignore the custom
  // message and show their own generic prompt — that's fine; we just need the
  // confirm to fire.
  useEffect(() => {
    if (!stepDirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [stepDirty]);

  // Inline CV-title editing. Click the title to edit; Enter or blur saves,
  // Escape cancels (skipSave flag stops the blur handler from saving on cancel).
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
  const beginTitleEdit = () => {
    setTitleDraft(cvData.title || '');
    setEditingTitle(true);
  };
  const commitTitleEdit = () => {
    if (skipTitleSave.current) {
      skipTitleSave.current = false;
    } else {
      renameCv(titleDraft);
    }
    setEditingTitle(false);
  };

  // Keep the active step pill in view as the user moves through the wizard —
  // on narrow screens later steps would otherwise sit off the right edge.
  const navRef = useRef(null);
  useEffect(() => {
    const active = navRef.current?.querySelector('[aria-current="step"]');
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [currentStepIndex]);

  const handleExitClick = () => {
    if (stepDirty) {
      const ok = window.confirm(
        'You have unsaved changes in this step. Exit anyway? Your previously-completed steps are saved.'
      );
      if (!ok) return;
    }
    exitWizard();
  };

  // Note: isStepComplete is now retrieved from the unified CVBuilderContext

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-slate-50 dark:bg-slate-900 flex flex-col">
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Main Content Area / Editor Panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
          {/* Segmented step rail — one tick per step. Filled up to the current
              step, muted ahead. Replaces the old percentage strip (which implied
              smooth position between discrete steps). */}
          <div className="flex gap-1 px-3 md:px-4 pt-2 w-full shrink-0" aria-hidden="true">
            {steps.map((step, i) => (
              <span
                key={step.id}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= currentStepIndex
                    ? 'bg-slate-900 dark:bg-white'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Single compact header row: CV title (subtle, desktop only), the
              clickable step strip filling the middle, then saving/unsaved
              status and Exit on the right. The strip replaces the old static
              "Step X of N" text — clicking a step jumps straight to it, and
              goToStep auto-saves the section you're leaving first. */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 md:px-4 py-2 flex items-center gap-2 md:gap-3 shrink-0">
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
              {currentStepIndex + 1} / {steps.length}
            </span>
            {editingTitle ? (
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
                aria-label="CV name"
                className="hidden sm:block text-sm text-slate-800 dark:text-slate-200 font-medium shrink-0 w-36 sm:w-44 bg-transparent border-0 outline-none p-0 mr-1"
              />
            ) : (
              <button
                type="button"
                onClick={beginTitleEdit}
                title="Rename this CV"
                className="group/title hidden sm:flex items-center gap-1 shrink-0 max-w-[12rem] text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 border-r border-slate-200 dark:border-slate-800 pr-3 mr-1 transition-colors"
              >
                <span className="truncate">{cvData.title}</span>
                <Pencil className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500 opacity-0 group-hover/title:opacity-100 transition-opacity" />
              </button>
            )}

            <nav
              ref={navRef}
              className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-none before:m-auto before:content-[''] after:m-auto after:content-['']"
            >
              {steps.map((step, index) => {
                const isCurrent = index === currentStepIndex;
                const complete = isStepComplete(step.id);
                const visited = visitedSteps?.has(index);
                // Four states: the step you're on, a filled-in step, a step you
                // visited but left empty (warning), and one you haven't reached.
                let status;
                if (isCurrent) status = 'current';
                else if (complete) status = 'complete';
                else if (visited) status = 'warning';
                else status = 'todo';

                const pillClass = {
                  current: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
                  complete:
                    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50',
                  warning:
                    'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/15 disabled:opacity-50',
                  todo: 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50',
                }[status];

                const badgeClass = {
                  current: 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900',
                  complete:
                    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                  warning: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
                  todo: 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-200',
                }[status];

                const title = {
                  current: `${step.label} (current)`,
                  complete: `${step.label} — done · click to edit`,
                  warning: `${step.label} — looks empty · click to complete`,
                  todo: `Go to ${step.label} — saves this section first`,
                }[status];

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(index)}
                    disabled={saving || isCurrent}
                    aria-current={isCurrent ? 'step' : undefined}
                    title={title}
                    className={`group flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed ${pillClass}`}
                  >
                    <span
                      className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0 ${badgeClass}`}
                    >
                      {status === 'complete' ? (
                        <Check className="w-3 h-3" />
                      ) : status === 'warning' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={`whitespace-nowrap ${isCurrent ? 'inline' : 'hidden md:inline'}`}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {saving && (
              <span className="text-xs text-indigo-600 dark:text-indigo-300 animate-pulse flex items-center gap-1 shrink-0">
                <Save className="w-3 h-3" />
                <span className="hidden sm:inline">Saving…</span>
              </span>
            )}
            {!saving && stepDirty && (
              <span
                className="text-xs text-amber-600 dark:text-amber-300 flex items-center gap-1 shrink-0"
                title="You have unsaved changes in this step"
              >
                <AlertCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Unsaved</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="hidden lg:flex text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded-md items-center gap-1.5 shrink-0 transition-colors"
              title={showPreview ? 'Hide Aria' : 'Show Aria'}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPreview ? 'Hide Aria' : 'Show Aria'}</span>
            </button>
            <button
              type="button"
              onClick={handleExitClick}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded-md flex items-center gap-1 shrink-0 transition-colors"
              title="Exit to My CVs (your completed steps are saved)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>

          {/* Step Content — full-height split: clean workspace + flush coach rail */}
          <div className="flex-1 flex min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Workspace — scrollable, no card. Bottom padding on mobile so the
                form clears the resting coach drawer (≈ its peek height). */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none pb-[280px] lg:pb-0">
              <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-10">
                <Outlet
                  context={{
                    cvData,
                    handleNext,
                    handleBack,
                    saving,
                    user,
                    updateCvData,
                    setStepDirty,
                    registerStepData,
                    isStepComplete,
                    tailoredFrom: cvData.tailoredFrom,
                    tailoredForJob: cvData.tailoredForJob,
                    focusedEntry,
                    onAskAria: askAria,
                    externalEditNonce,
                    lastAiWriteSortId,
                  }}
                />
              </div>
            </div>

            {/* Coach — flush full-height right rail, divider only. Desktop-only mount
                so the mobile drawer's panel isn't live in parallel. */}
            {isDesktop && showPreview && (
              <div className="hidden lg:flex w-[400px] xl:w-[440px] shrink-0 flex-col min-h-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                {/* Back bar — only in preview mode; the coach-mode entry to preview
                    is now the book icon in the coach header. */}
                {activeTab === 'preview' && (
                  <div className="flex items-center px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('coach')}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Aria
                    </button>
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      Live preview
                    </span>
                  </div>
                )}

                {/* Card Content */}
                <div className="flex-1 min-h-0 flex flex-col">
                  {activeTab === 'coach' ? (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <ATSCoachPanel
                        cvData={liveCvData}
                        user={user}
                        currentStepId={currentStepId}
                        updateCvData={updateCvData}
                        onShowPreview={() => setActiveTab('preview')}
                        focusedEntry={focusedEntry}
                        onClearFocus={() => setFocusedEntry(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                      <ScaledCVPreview cvData={cvData} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile coach drawer — drag the handle up to read/chat (up to ~85vh) or down to
          a small peek, so the student balances the CV form against the conversation.
          The form scrolls behind it. Mounted only on mobile (!isDesktop) so it isn't
          live in parallel with the desktop rail — a hidden duplicate would clobber
          coachChats on focus. */}
      {!isDesktop && (
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)] flex flex-col"
          style={{ height: drawerH, paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
        {/* Drag handle */}
        <div
          className="py-2.5 flex justify-center cursor-ns-resize touch-none shrink-0"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Slim preview toggle — Coach ↔ Live preview. Coach→preview is the book
              icon inside the coach header; preview→coach is this back bar. */}
          {activeTab === 'preview' && (
            <div className="flex items-center px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('coach')}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Aria
              </button>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                Live preview
              </span>
            </div>
          )}

          {activeTab === 'coach' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <ATSCoachPanel
                cvData={liveCvData}
                user={user}
                currentStepId={currentStepId}
                updateCvData={updateCvData}
                onShowPreview={() => setActiveTab('preview')}
                focusedEntry={focusedEntry}
                onClearFocus={() => setFocusedEntry(null)}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <ScaledCVPreview cvData={cvData} />
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
};

const CVBuilderLayout = () => {
  return (
    <CVBuilderProvider>
      <CVBuilderInner />
    </CVBuilderProvider>
  );
};

export default CVBuilderLayout;
