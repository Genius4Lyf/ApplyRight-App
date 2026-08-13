import React, { useEffect, useRef, useState, useMemo } from 'react';
import AriaLoader from '../../components/ui/AriaLoader';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  ChevronUp,
  X,
  Target,
  Lock,
  Crown,
} from 'lucide-react';
import { CVBuilderProvider, useCVBuilder } from '../../context/CVContext';
import ATSCoachPanel from '../../components/cv/ATSCoachPanel';
import { generateMarkdownFromDraft } from '../../utils/markdownUtils';
import CVTemplateRenderer from '../../components/CVTemplateRenderer';
import AriaOrbit from '../../components/cv/AriaOrbit';
import WorkspaceCreditBalance from '../../components/WorkspaceCreditBalance';

const ScaledCVPreview = ({ cvData }) => {
  const { t } = useTranslation();
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
  const requiredJourneySteps = journeySteps.filter((s) => s.id !== 'projects');
  const isJourneyComplete = requiredJourneySteps.every((s) => isStepComplete(s.id));
  const doneCount = requiredJourneySteps.filter((s) => isStepComplete(s.id)).length;
  const totalCount = requiredJourneySteps.length;

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
            {t('cvBuilder.layout.livePreviewLocked')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 max-w-[280px] leading-relaxed font-medium">
            {t('cvBuilder.layout.completeToUnlock')}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1.5 mb-4 relative overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / totalCount) * 100}%` }}
            />
          </div>
          <div className="w-full flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-5">
            <span>{t('cvBuilder.layout.progress')}</span>
            <span>{t('cvBuilder.layout.completed', { done: doneCount, total: totalCount })}</span>
          </div>

          {/* Steps List */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800/40">
            {requiredJourneySteps.map((step, idx) => {
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
                      {t('cvBuilder.layout.fillIn')}
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
  const { t } = useTranslation();
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
    ensureDraft,
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
  // Mobile Aria starts as a compact dock and expands into a conversation sheet.
  // read/chat, up to ~85vh) or down to a small peek — so they balance the CV form
  // visualViewport keeps the top edge stable while the bottom contracts above the
  // software keyboard instead of jumping or being covered.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDragY, setDrawerDragY] = useState(0);
  const [drawerDragging, setDrawerDragging] = useState(false);
  // Animate the open/close toggle, then drop to snap-tracking so keyboard-driven
  // visualViewport resizes move the sheet instantly (no 420ms chase behind the keyboard).
  const [animateDrawer, setAnimateDrawer] = useState(false);
  useEffect(() => {
    setAnimateDrawer(true);
    const id = setTimeout(() => setAnimateDrawer(false), 460);
    return () => clearTimeout(id);
  }, [drawerOpen]);
  const [mobileViewport, setMobileViewport] = useState(() => ({
    height:
      typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 800,
    offsetTop: typeof window !== 'undefined' ? (window.visualViewport?.offsetTop ?? 0) : 0,
  }));
  const dragRef = useRef(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateViewport = () => {
      setMobileViewport({
        height: viewport?.height ?? window.innerHeight,
        offsetTop: viewport?.offsetTop ?? 0,
      });
    };
    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  const viewportBottom = mobileViewport.height + mobileViewport.offsetTop;
  const sheetTop =
    typeof window !== 'undefined' ? Math.max(12, Math.round(window.innerHeight * 0.2)) : 120;
  const expandedDrawerH = Math.max(180, Math.min(720, viewportBottom - sheetTop - 10));

  const onDragStart = (e) => {
    if (!drawerOpen) return;
    dragRef.current = { y: e.clientY, dy: 0 };
    setDrawerDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e) => {
    if (!dragRef.current) return;
    const dy = Math.max(0, e.clientY - dragRef.current.y);
    dragRef.current.dy = dy;
    setDrawerDragY(dy);
  };
  const onDragEnd = (e) => {
    if (!dragRef.current) return;
    const shouldClose = dragRef.current.dy > 84;
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setDrawerDragging(false);
    setDrawerDragY(0);
    if (shouldClose) setDrawerOpen(false);
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

  // Past "peek" the drawer is effectively a full-screen chat — the CV form behind it
  // is no longer a usable scroll target, so lock the document the same way
  // AriaStudio's full-screen chat does. Restores whatever overflow value was there
  // before (never blindly clears it — another surface may own the lock too).
  const drawerExpanded = !isDesktop && drawerOpen;
  useEffect(() => {
    if (!drawerExpanded) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [drawerExpanded]);

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
      entryType: entry.entryType || '',
    });
    setActiveTab('coach');
    setShowPreview(true); // ensure desktop rail open
    setDrawerOpen(true);
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
  const workspaceScrollRef = useRef(null);
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
      const ok = window.confirm(t('cvBuilder.layout.confirmExit'));
      if (!ok) return;
    }
    exitWizard();
  };

  // Note: isStepComplete is now retrieved from the unified CVBuilderContext

  if (loading) {
    return <AriaLoader fullscreen size={32} label={t('cvBuilder.layout.loadingCv')} />;
  }

  return (
    <div className="h-dvh overflow-hidden bg-transparent flex flex-col">
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
                aria-label={t('cvBuilder.layout.cvNameLabel')}
                className="hidden sm:block text-sm text-slate-800 dark:text-slate-200 font-medium shrink-0 w-36 sm:w-44 bg-transparent border-0 outline-none p-0 mr-1"
              />
            ) : (
              <button
                type="button"
                onClick={beginTitleEdit}
                title={t('cvBuilder.layout.renameCv')}
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
                  current: t('cvBuilder.layout.titleCurrent', { label: step.label }),
                  complete: t('cvBuilder.layout.titleComplete', { label: step.label }),
                  warning: t('cvBuilder.layout.titleWarning', { label: step.label }),
                  todo: t('cvBuilder.layout.titleTodo', { label: step.label }),
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
                    <span className="inline whitespace-nowrap">{step.label}</span>
                  </button>
                );
              })}
            </nav>

            {saving && (
              <span className="text-xs text-indigo-600 dark:text-indigo-300 animate-pulse flex items-center gap-1 shrink-0">
                <Save className="w-3 h-3" />
                <span className="hidden sm:inline">{t('cvBuilder.common.saving')}</span>
              </span>
            )}
            {!saving && stepDirty && (
              <span
                className="text-xs text-amber-600 dark:text-amber-300 flex items-center gap-1 shrink-0"
                title={t('cvBuilder.layout.unsavedTitle')}
              >
                <AlertCircle className="w-3 h-3" />
                <span className="hidden sm:inline">{t('cvBuilder.layout.unsaved')}</span>
              </span>
            )}
            <WorkspaceCreditBalance onBeforeNavigate={flushDraft} />
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="hidden lg:flex text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded-md items-center gap-1.5 shrink-0 transition-colors"
              title={showPreview ? t('cvBuilder.layout.hideAria') : t('cvBuilder.layout.showAria')}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>
                {showPreview ? t('cvBuilder.layout.hideAria') : t('cvBuilder.layout.showAria')}
              </span>
            </button>
            <button
              type="button"
              onClick={handleExitClick}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded-md flex items-center gap-1 shrink-0 transition-colors"
              title={t('cvBuilder.layout.exitTitle')}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('cvBuilder.layout.exit')}</span>
            </button>
          </div>

          {/* Step Content — full-height split: clean workspace + flush coach rail */}
          <div className="flex-1 flex min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Workspace — scrollable, no card. Bottom padding on mobile so the
                form clears the resting coach drawer (≈ its peek height). */}
            <div
              ref={workspaceScrollRef}
              className={`flex-1 min-h-0 overflow-x-hidden scrollbar-none pb-[104px] lg:pb-0 ${
                currentStepId === 'target_job'
                  ? 'overflow-y-auto lg:overflow-hidden'
                  : 'overflow-y-auto'
              }`}
            >
              <div
                className={`max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-10 ${
                  currentStepId === 'target_job' ? 'lg:h-full' : ''
                }`}
              >
                <Outlet
                  context={{
                    cvData,
                    handleNext,
                    handleBack,
                    saving,
                    user,
                    updateCvData,
                    ensureDraft,
                    resetWorkspaceScroll: () => {
                      if (workspaceScrollRef.current) workspaceScrollRef.current.scrollTop = 0;
                    },
                    setStepDirty,
                    registerStepData,
                    isStepComplete,
                    tailoredFrom: cvData.tailoredFrom,
                    tailoredForJob: cvData.tailoredForJob,
                    focusedEntry,
                    onAskAria: askAria,
                    ariaDrawerOpen: drawerExpanded,
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
                      {t('cvBuilder.layout.livePreview')}
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
        <>
          <button
            type="button"
            aria-label="Close Aria"
            tabIndex={drawerOpen ? 0 : -1}
            onClick={() => setDrawerOpen(false)}
            className={`lg:hidden fixed inset-0 z-[9998] bg-slate-950/40 backdrop-blur-[3px] transition-[opacity,backdrop-filter] duration-300 ${
              drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />

          <div
            className={`lg:hidden fixed left-3 right-3 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-[0_12px_40px_rgba(15,23,42,0.24)] flex flex-col ${
              drawerOpen ? 'z-[9999]' : 'z-40'
            }`}
            style={{
              height: drawerOpen ? expandedDrawerH : 64,
              top: drawerOpen
                ? Math.max(sheetTop, mobileViewport.offsetTop + 8)
                : window.innerHeight - 76,
              borderRadius: drawerOpen ? 28 : 32,
              transform: `translate3d(0, ${drawerDragY}px, 0)`,
              paddingBottom: drawerOpen ? 'env(safe-area-inset-bottom)' : 0,
              transition: drawerDragging
                ? 'none'
                : animateDrawer
                  ? 'height 420ms cubic-bezier(0.22, 1, 0.36, 1), top 420ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 300ms ease, transform 300ms cubic-bezier(0.22, 1, 0.36, 1)'
                  : 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Aria chat"
              className={`absolute inset-0 z-10 flex items-center gap-3 px-4 text-left transition-all duration-200 ${
                drawerOpen ? 'opacity-0 pointer-events-none scale-[0.98]' : 'opacity-100 scale-100'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <AriaOrbit size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                  Ask Aria
                </span>
                <span className="block truncate text-[11px] text-slate-400 dark:text-slate-500">
                  Get help with this CV
                </span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ChevronUp className="h-4 w-4" />
              </span>
            </button>

            <div
              className={`relative z-20 shrink-0 h-[58px] flex items-center px-4 transition-opacity duration-200 ${
                drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div
                className="absolute inset-x-0 top-0 h-7 flex justify-center cursor-ns-resize touch-none"
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
              >
                <span className="mt-2 h-1 w-8 rounded-full bg-slate-400 dark:bg-slate-600" />
              </div>
              <span className="mt-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <AriaOrbit size={20} />
              </span>
              <div className="mt-3 ml-2.5 min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Aria</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Your CV assistant</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close Aria"
                className="mt-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              aria-hidden={!drawerOpen}
              className={`flex-1 min-h-0 flex flex-col overflow-hidden border-t border-slate-100 dark:border-slate-800 transition-opacity duration-200 ${
                drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none invisible'
              }`}
            >
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
                    {t('cvBuilder.layout.livePreview')}
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
        </>
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
