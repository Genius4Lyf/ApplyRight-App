import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, FileText, ArrowUpRight, Loader, Lock } from 'lucide-react';
import ApplicationService from '../services/application.service';
import api from '../services/api';
import CVTemplateRenderer from './CVTemplateRenderer';

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

// Read-only, in-page CV viewer. Fetches the application's generated CV and
// renders it with the real template components — scaled to fit the screen so it
// works on mobile web and the Android WebView. Download / template-switching is
// intentionally NOT here: that lives on the full CV page (/resume/:id).
const A4_WIDTH = 794; // ~210mm @ 96dpi

const CVViewModal = ({ applicationId, isOpen, onClose }) => {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const [app, setApp] = useState(null);
  // Profile drives the CV header (name + contact). Seed from localStorage for an
  // instant header, then refine from /auth/me (the source the resume page uses).
  const [profile, setProfile] = useState(readStoredUser);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(() =>
    Math.min(1, Math.max((window.innerWidth - 16) / A4_WIDTH, 0.3))
  );
  // Derived — avoids a synchronous setState in the fetch effect.
  const loading = isOpen && !app && !error;

  // Fetch the full application (incl. optimizedCV + templateId) when opened.
  // State is only set after the await, never synchronously in the effect body.
  useEffect(() => {
    if (!isOpen || !applicationId) return undefined;
    if (app && app._id === applicationId) return undefined; // already loaded — instant reopen
    let cancelled = false;
    Promise.all([
      ApplicationService.getApplicationById(applicationId),
      api
        .get('/auth/me')
        .then((r) => r.data)
        .catch(() => null), // header still works from the localStorage seed
    ])
      .then(([data, me]) => {
        if (cancelled) return;
        setApp(data);
        if (me) setProfile(me);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load your CV');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, applicationId, app]);

  // Scale the A4 page to fit the available width (zoom keeps layout height
  // correct, so long CVs scroll instead of clipping). rAF defers the initial
  // measure out of the effect body.
  useEffect(() => {
    if (!isOpen) return undefined;
    const calc = () =>
      setScale(
        Math.min(
          1,
          Math.max(((wrapRef.current?.clientWidth || window.innerWidth) - 16) / A4_WIDTH, 0.3)
        )
      );
    const raf = requestAnimationFrame(calc);
    window.addEventListener('resize', calc);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', calc);
    };
  }, [isOpen]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const hasCV = app && app.optimizedCV;
  const openFullPage = () => navigate(`/resume/${applicationId}`);
  // No CV yet → send them to the application (History) page with this app
  // preselected, where the "Generate CV" action lives.
  const goGenerate = () => navigate(`/history?app=${applicationId}`);

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/70 backdrop-blur-sm">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            Your CV
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
            View only
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openFullPage}
            disabled={!hasCV}
            title={hasCV ? 'Open the full CV page' : 'Generate a CV first'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          >
            <span className="hidden sm:inline">Download / templates</span>
            <span className="sm:hidden">Download</span>
            {hasCV ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close CV view"
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div ref={wrapRef} className="flex-1 min-h-0 overflow-auto p-2 sm:p-4">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-white/90">
            <Loader className="w-8 h-8 animate-spin" />
            <p className="text-xs mt-2">Loading your CV…</p>
          </div>
        ) : error ? (
          <div className="max-w-sm mx-auto mt-10 bg-white dark:bg-slate-800 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
          </div>
        ) : !hasCV ? (
          <div className="max-w-sm mx-auto mt-10 bg-white dark:bg-slate-800 rounded-xl p-6 text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              No CV generated for this role yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Head to this application to generate a tailored CV, then come back to view it here.
            </p>
            <button
              type="button"
              onClick={goGenerate}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
            >
              Generate your CV
            </button>
          </div>
        ) : (
          <div
            className="bg-white shadow-2xl mx-auto"
            style={{ zoom: scale, width: `${A4_WIDTH}px` }}
          >
            <CVTemplateRenderer application={app} userProfile={profile} />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CVViewModal;
