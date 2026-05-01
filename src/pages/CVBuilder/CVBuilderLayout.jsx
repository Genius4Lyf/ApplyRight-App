import React from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { Save } from 'lucide-react';
import { CVBuilderProvider, useCVBuilder } from '../../context/CVContext';

const CVBuilderInner = () => {
  const {
    cvData,
    currentStep,
    currentStepIndex,
    steps,
    saving,
    user,
    handleNext,
    handleBack,
    updateCvData,
    loading,
  } = useCVBuilder();

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

          {/* Compact header row — title (subtle) on the left, step indicator
              centered, saving state on the right. ~36px tall vs the old ~80px. */}
          <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-2 flex items-center gap-3 shrink-0">
            <p className="text-xs md:text-sm text-slate-500 truncate flex-1 min-w-0">
              {cvData.title}
            </p>
            <p className="text-xs md:text-sm font-semibold text-slate-700 shrink-0">
              <span className="text-indigo-600">Step {currentStepIndex + 1}</span>
              <span className="text-slate-400"> of {steps.length}</span>
              <span className="hidden sm:inline text-slate-500 font-normal"> · {currentStep?.label}</span>
            </p>
            {saving && (
              <span className="text-xs text-indigo-600 animate-pulse flex items-center gap-1 shrink-0">
                <Save className="w-3 h-3" />
                <span className="hidden sm:inline">Saving…</span>
              </span>
            )}
          </div>

          {/* Step Content. Outer card framing kicks in only at lg+ so phones
              get the form edge-to-edge. Inner cards inside each step (role,
              project, education entries) still keep their own card styling. */}
          <div className="flex-1 overflow-y-auto p-2 lg:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto bg-white min-h-[500px] p-3 lg:p-8 lg:rounded-2xl lg:shadow-sm lg:border lg:border-slate-200">
              <Outlet context={{ cvData, handleNext, handleBack, saving, user, updateCvData, tailoredFrom: cvData.tailoredFrom, tailoredForJob: cvData.tailoredForJob }} />
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
