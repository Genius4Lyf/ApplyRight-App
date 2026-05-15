import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, FileWarning, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import InterviewPrepService from '../../services/interviewPrep.service';

// Detects whether a generated CV exists for the application's linked job and
// surfaces either:
//   - a Pull-from-CV action when one exists,
//   - a Generate-CV nudge when none has been generated for this role yet.
// Stays silent for CV-only applications, already-synced prep, or when the
// user has dismissed the banner this session.
const LinkedCVBanner = ({ applicationId, isCvOnly, onPulled }) => {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [pulling, setPulling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isCvOnly) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await InterviewPrepService.detectGeneratedCV(applicationId);
        if (!cancelled) setInfo(data);
      } catch (e) {
        console.error('Linked CV detect failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, isCvOnly]);

  if (isCvOnly || dismissed || !info) return null;

  // No tailored CV yet for this role — point the user at the ApplyRight
  // workflow on the dashboard where they can generate one. Without a CV we
  // can't enrich prep with skills + talking points, so this is the unblock.
  if (!info.exists) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0">
            <FileWarning className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">No tailored CV for this role yet</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Generate one from the dashboard to pull skills, evidence, and talking points into your
              prep.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
          >
            Generate CV
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // CV exists and prep is already synced with it — nothing to surface.
  if (info.alreadySynced) return null;

  const handlePull = async () => {
    setPulling(true);
    try {
      await InterviewPrepService.saveSkills(applicationId);
      toast.success('Pulled skills & talking points from your CV');
      setDismissed(true);
      onPulled?.();
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to pull from CV';
      toast.error(msg);
    } finally {
      setPulling(false);
    }
  };

  const hasExistingPrep = !info.alreadySynced && info.skillCount;
  const headline = hasExistingPrep
    ? 'Your tailored CV has updates'
    : 'A tailored CV exists for this role';
  const subline = hasExistingPrep
    ? `Refresh prep with ${info.skillCount} skill${info.skillCount === 1 ? '' : 's'} + talking points from the latest CV.`
    : `Pull ${info.skillCount} skill${info.skillCount === 1 ? '' : 's'} with evidence and talking points into your prep.`;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-200 rounded-xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-white border border-indigo-200 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{headline}</p>
          <p className="text-xs text-slate-600 mt-0.5">{subline}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handlePull}
          disabled={pulling}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {pulling ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Pulling…
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              {hasExistingPrep ? 'Refresh from CV' : 'Pull from CV'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default LinkedCVBanner;
