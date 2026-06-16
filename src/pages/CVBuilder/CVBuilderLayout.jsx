import React, { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { Save, LogOut, AlertCircle, Check, AlertTriangle, Pencil } from 'lucide-react';
import { CVBuilderProvider, useCVBuilder } from '../../context/CVContext';

const CVBuilderInner = () => {
  const {
    cvData,
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
  } = useCVBuilder();

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

  // Whether a step has any meaningful content yet — same checks the Review
  // (Finalize) step uses for its section checklist, extended to every step.
  // Used to flag sections the user visited but left empty in the navigator.
  const isStepComplete = (stepId) => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Slim full-width progress strip — visible on every screen size,
              replacing the desktop-only step dots that were hidden on mobile. */}
          <div className="bg-slate-100 h-1 w-full overflow-hidden shrink-0">
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
          <div className="bg-white border-b border-slate-200 px-2 md:px-4 py-2 flex items-center gap-2 md:gap-3 shrink-0">
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
                className="hidden sm:block text-sm text-slate-800 font-medium shrink-0 w-36 sm:w-44 border-b border-indigo-400 bg-transparent outline-none pr-3 mr-1"
              />
            ) : (
              <button
                type="button"
                onClick={beginTitleEdit}
                title="Rename this CV"
                className="group/title hidden sm:flex items-center gap-1 shrink-0 max-w-[12rem] text-sm text-slate-500 hover:text-slate-800 border-r border-slate-200 pr-3 mr-1 transition-colors"
              >
                <span className="truncate">{cvData.title}</span>
                <Pencil className="w-3 h-3 shrink-0 text-slate-400 opacity-0 group-hover/title:opacity-100 transition-opacity" />
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
                    'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50',
                  warning: 'text-amber-700 hover:bg-amber-50 disabled:opacity-50',
                  todo: 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50',
                }[status];

                const badgeClass = {
                  current: 'bg-white/20 text-white',
                  complete: 'bg-emerald-100 text-emerald-700',
                  warning: 'bg-amber-100 text-amber-700',
                  todo: 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700',
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
              <span className="text-xs text-indigo-600 animate-pulse flex items-center gap-1 shrink-0">
                <Save className="w-3 h-3" />
                <span className="hidden sm:inline">Saving…</span>
              </span>
            )}
            {!saving && stepDirty && (
              <span
                className="text-xs text-amber-600 flex items-center gap-1 shrink-0"
                title="You have unsaved changes in this step"
              >
                <AlertCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Unsaved</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleExitClick}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1 shrink-0 transition-colors"
              title="Exit to My CVs (your completed steps are saved)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>

          {/* Step Content. Outer card framing kicks in only at lg+ so phones
              get the form edge-to-edge. Inner cards inside each step (role,
              project, education entries) still keep their own card styling. */}
          {/* overflow-x-hidden is required: with only overflow-y set, CSS
              computes overflow-x to `auto`, so each step's slide-in-from-right
              animation (a translateX) would create a draggable sideways scroll. */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 lg:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto bg-white min-h-[500px] p-4 sm:p-6 lg:p-8 lg:rounded-2xl lg:shadow-sm lg:border lg:border-slate-200">
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
                  tailoredFrom: cvData.tailoredFrom,
                  tailoredForJob: cvData.tailoredForJob,
                }}
              />
            </div>
          </div>
        </div>
      </div>
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
