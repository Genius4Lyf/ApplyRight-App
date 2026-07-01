import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import {
  Save,
  LogOut,
  AlertCircle,
  Check,
  AlertTriangle,
  Pencil,
  Eye,
  EyeOff,
  X,
  Sparkles,
  FileText,
  Target,
  Lock,
  Crown,
  Bot,
  MessageCircle,
} from 'lucide-react';
import { CVBuilderProvider, useCVBuilder } from '../../context/CVContext';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import ATSCoachPanel from '../../components/cv/ATSCoachPanel';
import { generateMarkdownFromDraft } from '../../utils/markdownUtils';
import { getBotNudge } from '../../utils/cvCoach';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
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

// ─── Draggable floating Coach bot (mobile) ───
// A friendly AI-bot button the user can fling to either side of the screen and
// slide up/down. Replaces the old fixed "Coach & Preview" FAB that collided with
// the global dark-mode toggle. When the coach has something new to say (the user
// moved to a new builder step while the sheet was closed), the bot pulses and
// pops a little chat bubble so it reads like an incoming message.
const FAB_SIZE = 56; // px — keep in sync with the w-14 h-14 below
const FAB_MARGIN = 16;

const CoachBotFab = ({ hasNew, message, onOpen, hidden }) => {
  const initial = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 375;
    // Default to the RIGHT edge, at the "Tips for this section" row — where the user
    // expects the coach to live — clear of the bottom-right dark-mode toggle.
    return { x: w - FAB_SIZE - FAB_MARGIN, y: 200 };
  };
  const start = initial();
  const x = useMotionValue(start.x);
  const y = useMotionValue(start.y);
  const draggedRef = useRef(false);
  // Which edge the bot is parked on — drives which way the speech bubble opens.
  const [side, setSide] = useState(
    start.x + FAB_SIZE / 2 < (typeof window !== 'undefined' ? window.innerWidth : 375) / 2
      ? 'left'
      : 'right'
  );
  const [dragging, setDragging] = useState(false);

  // Snap to the nearest vertical edge and keep the bot fully on-screen.
  const snapToEdge = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const onLeft = x.get() + FAB_SIZE / 2 < w / 2;
    const targetX = onLeft ? FAB_MARGIN : w - FAB_SIZE - FAB_MARGIN;
    const targetY = Math.min(Math.max(y.get(), FAB_MARGIN + 64), h - FAB_SIZE - FAB_MARGIN);
    const spring = { type: 'spring', stiffness: 500, damping: 32 };
    animate(x, targetX, spring);
    animate(y, targetY, spring);
    setSide(onLeft ? 'left' : 'right');
  };

  // Keep it on-screen if the viewport changes (rotation / keyboard).
  useEffect(() => {
    const onResize = () => snapToEdge();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = () => {
    // Pass the bot's current CENTRE so the coach window can grow out of exactly
    // where the bot sits (wherever the user has dragged it), not a fixed corner.
    if (!draggedRef.current) onOpen({ cx: x.get() + FAB_SIZE / 2, cy: y.get() + FAB_SIZE / 2 });
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.06}
      whileDrag={{ scale: 1.06 }}
      style={{ x, y }}
      onDragStart={() => {
        draggedRef.current = true;
        setDragging(true);
      }}
      onDragEnd={() => {
        snapToEdge();
        setDragging(false);
        // Let the click handler that fires right after pointer-up see the drag.
        setTimeout(() => {
          draggedRef.current = false;
        }, 60);
      }}
      className={`lg:hidden fixed top-0 left-0 z-40 touch-none select-none transition-opacity duration-200 ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative">
        {/* Proactive speech bubble — pops beside the bot, opening away from the edge */}
        <AnimatePresence>
          {message && !dragging && (
            <motion.div
              key={message}
              initial={{ opacity: 0, scale: 0.8, x: side === 'right' ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpen();
              }}
              style={{ transformOrigin: side === 'right' ? 'right center' : 'left center' }}
              className={`absolute top-1/2 -translate-y-1/2 w-max max-w-[200px] cursor-pointer rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 text-[11px] leading-snug font-medium px-3 py-2 shadow-xl shadow-indigo-900/20 border border-slate-200 dark:border-slate-700 ${
                side === 'right' ? 'right-full mr-3' : 'left-full ml-3'
              }`}
            >
              {message}
              {/* Little tail pointing at the bot */}
              <span
                className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${
                  side === 'right' ? '-right-1 border-t border-r' : '-left-1 border-b border-l'
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The bot button */}
        <motion.button
          type="button"
          aria-label="Open ATS Coach & Preview"
          whileTap={{ scale: 0.92 }}
          onClick={handleOpen}
          className="relative w-14 h-14 rounded-full shadow-xl shadow-indigo-900/30 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center cursor-grab active:cursor-grabbing border border-white/20"
        >
          {/* Pulsing halo while a new message waits */}
          {hasNew && (
            <span className="absolute inset-0 rounded-full bg-indigo-400/60 animate-ping" />
          )}

          <Bot className="w-7 h-7 relative z-10" />

          {/* Incoming-message badge */}
          <AnimatePresence>
            {hasNew && (
              <motion.span
                initial={{ scale: 0, opacity: 0, y: 4 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="absolute -top-1.5 -right-1.5 z-20 w-6 h-6 rounded-full bg-amber-400 text-indigo-950 flex items-center justify-center shadow-md border-2 border-white"
              >
                <MessageCircle className="w-3 h-3" fill="currentColor" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
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
    renameCv,
    updateCvData,
    exitWizard,
    stepDirty,
    setStepDirty,
    loading,
    isStepComplete,
  } = useCVBuilder();

  const [showPreview, setShowPreview] = useState(true);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('coach'); // 'coach' | 'preview'

  // Pin the page behind the coach/preview sheet so it can't scroll or jump while open.
  useBodyScrollLock(mobilePreviewOpen);
  // Drives the bot's "new message" pulse: the coach has fresh guidance for the
  // step the user just landed on, but they haven't opened the sheet to read it.
  const [coachHasNew, setCoachHasNew] = useState(true);
  // The short proactive line the bot "speaks" a few seconds after the user lands
  // on a step (null = no bubble showing).
  const [botMessage, setBotMessage] = useState(null);
  // Viewport-centre of the bot at the moment the coach was opened, so the window
  // animates OUT of the bot's position (wherever it is) instead of a fixed corner.
  const [bubbleOrigin, setBubbleOrigin] = useState(null);

  // The step the user is on now — drives the dynamic coaching and the tab
  // auto-switch below.
  const currentStepId = steps[currentStepIndex]?.id;

  // Each time the user moves to a new step while the mobile sheet is closed, the
  // coach has something new to say — light up the bot. Opening the sheet clears it.
  // Adjusted DURING RENDER (React's recommended alternative to a setState-in-effect),
  // mirroring the tab auto-switch below.
  const [coachStepSeen, setCoachStepSeen] = useState(currentStepId);
  if (currentStepId !== coachStepSeen) {
    setCoachStepSeen(currentStepId);
    if (!mobilePreviewOpen) setCoachHasNew(true);
  }

  const openMobileCoach = (origin) => {
    if (origin) setBubbleOrigin(origin);
    setMobilePreviewOpen(true);
    setCoachHasNew(false);
    setBotMessage(null); // opening the coach consumes the nudge
  };

  // ── Proactive bot nudge ──────────────────────────────────────────────────
  // A few seconds after the user lands on a NEW step (and only while the coach
  // sheet is closed), the bot pops a short, step-aware speech bubble — an invite
  // to review, a "looks done" celebration, or a quick motivation tip. Once per
  // step entry; auto-dismisses after a few seconds.
  const previewOpenRef = useRef(mobilePreviewOpen); // latest value for the timers
  previewOpenRef.current = mobilePreviewOpen;
  const hasGreetedRef = useRef(false); // first nudge of the session greets

  useEffect(() => {
    // Re-runs on genuine step change only (not on sheet open/close or re-renders).
    const showTimer = setTimeout(() => {
      if (previewOpenRef.current) return; // sheet open — say nothing
      setBotMessage(
        getBotNudge(currentStepId, liveCvData, {
          isComplete: isStepComplete(currentStepId),
          firstTime: !hasGreetedRef.current,
        })
      );
      hasGreetedRef.current = true;
    }, 3500);
    return () => clearTimeout(showTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId]);

  useEffect(() => {
    if (!botMessage) return undefined;
    const hideTimer = setTimeout(() => setBotMessage(null), 7000);
    return () => clearTimeout(hideTimer);
  }, [botMessage]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
        {/* Main Content Area / Editor Panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Slim full-width progress strip — visible on every screen size,
              replacing the desktop-only step dots that were hidden on mobile. */}
          <div className="bg-slate-100 dark:bg-slate-900 h-1 w-full overflow-hidden shrink-0">
            <div
              className="h-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{
                width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
              }}
            />
          </div>

          {/* Single compact header row: CV title (subtle, desktop only), the
              clickable step strip filling the middle, then saving/unsaved
              status and Exit on the right. The strip replaces the old static
              "Step X of N" text — clicking a step jumps straight to it, and
              goToStep auto-saves the section you're leaving first. */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 md:px-4 py-2 flex items-center gap-2 md:gap-3 shrink-0">
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
                className="hidden sm:block text-sm text-slate-800 dark:text-slate-200 font-medium shrink-0 w-36 sm:w-44 border-b border-indigo-400 bg-transparent outline-none pr-3 mr-1"
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
              className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto custom-scrollbar before:m-auto before:content-[''] after:m-auto after:content-['']"
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
                  current: 'bg-indigo-600 text-white',
                  complete:
                    'text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50',
                  warning:
                    'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/15 disabled:opacity-50',
                  todo: 'text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50',
                }[status];

                const badgeClass = {
                  current: 'bg-white/20 text-white',
                  complete:
                    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:bg-emerald-300',
                  warning: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
                  todo: 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/15 group-hover:text-indigo-700 dark:group-hover:text-indigo-300',
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
              title={showPreview ? 'Hide ATS Coach' : 'Show ATS Coach'}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPreview ? 'Hide Coach' : 'Show Coach'}</span>
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

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 lg:p-8 custom-scrollbar">
            <div className="max-w-6xl xl:max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start justify-center">
              {/* Form Card */}
              <div className="w-full lg:max-w-3xl bg-white dark:bg-slate-900 min-h-[500px] p-4 sm:p-6 lg:p-8 lg:rounded-2xl lg:shadow-sm lg:border lg:border-slate-200 dark:lg:border-slate-800 flex-1">
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
                  }}
                />
              </div>

              {/* Desktop Side Panel (ATS Coach & Live Preview) styled as a card next to it */}
              {showPreview && (
                <div className="hidden lg:flex lg:w-[380px] xl:w-[420px] shrink-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-col lg:sticky lg:top-8 h-[calc(100vh-130px)] animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* Tabs Header */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('coach')}
                      className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 outline-none ${
                        activeTab === 'coach'
                          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      ATS Coach
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 outline-none ${
                        activeTab === 'preview'
                          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-900'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Live Preview
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    {activeTab === 'coach' ? (
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        <ATSCoachPanel
                          cvData={liveCvData}
                          user={user}
                          currentStepId={currentStepId}
                          updateCvData={updateCvData}
                        />
                      </div>
                    ) : (
                      <ScaledCVPreview cvData={cvData} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating Coach bot — draggable, snaps to either side */}
      {/* Kept mounted (just hidden) while the coach is open so it remembers wherever
          the user dragged it, instead of snapping back to the default on reopen. */}
      <CoachBotFab
        hasNew={coachHasNew}
        message={botMessage}
        onOpen={openMobileCoach}
        hidden={mobilePreviewOpen}
      />

      {/* Mobile Coach & Preview — floating bubble window (Android-bubble style) */}
      <AnimatePresence>
        {mobilePreviewOpen && (
          <>
            {/* Soft scrim — dims the page but keeps the floating feel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobilePreviewOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 z-50 backdrop-blur-xs"
            />
            {/* Floating bubble window — grows OUT of the bot, doesn't fill the screen.
                The window sits at inset-x-3 (12px) / top-16 (64px), so we convert the
                bot's viewport centre into the window's local coordinates for the origin. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              style={{
                transformOrigin: bubbleOrigin
                  ? `${bubbleOrigin.cx - 12}px ${bubbleOrigin.cy - 64}px`
                  : 'top right',
              }}
              className="lg:hidden fixed inset-x-3 top-16 bottom-24 z-50 bg-slate-50 dark:bg-slate-950 rounded-3xl shadow-2xl shadow-indigo-950/40 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 ring-1 ring-black/5"
            >
              {/* Sheet Header */}
              <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    ATS Coach & Preview
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Updates in real-time
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobilePreviewOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Tabs Header */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('coach')}
                  className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 outline-none ${
                    activeTab === 'coach'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ATS Coach
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 outline-none ${
                    activeTab === 'preview'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Live Preview
                </button>
              </div>

              {/* Sheet Content */}
              <div className="flex-1 min-h-0 flex flex-col">
                {activeTab === 'coach' ? (
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <ATSCoachPanel
                      cvData={liveCvData}
                      user={user}
                      currentStepId={currentStepId}
                      updateCvData={updateCvData}
                    />
                  </div>
                ) : (
                  <ScaledCVPreview cvData={cvData} />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
