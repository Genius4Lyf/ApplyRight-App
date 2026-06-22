import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  FileText,
  Briefcase,
  Mic,
  Crown,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import CVUploader from '../components/CVUploader';
import JobLinkInput from '../components/JobLinkInput';
import UpgradeModal from '../components/UpgradeModal';
import CVService from '../services/cv.service';
import InterviewPrepService from '../services/interviewPrep.service';
import billingService from '../services/billing.service';

/**
 * Standalone "Interview Me" flow.
 *
 * A separate, paid-only entry point that skips the full ApplyRight analysis
 * (no fit score, no CV optimization, no cover letter) and takes the user
 * straight from CV + job description into the live mock interview. It reuses
 * the existing interview/realtime machinery — it just creates the lightweight
 * Application behind the scenes via POST /analysis/direct-interview.
 */
const InterviewStart = () => {
  const navigate = useNavigate();

  const [entitlement, setEntitlement] = useState(null);
  const [entLoading, setEntLoading] = useState(true);

  const [cvMode, setCvMode] = useState('saved'); // 'saved' | 'upload'
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [uploadedResume, setUploadedResume] = useState(null);

  const [job, setJob] = useState(null);

  const [starting, setStarting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ent = await billingService.getEntitlement();
        if (!cancelled) setEntitlement(ent);
      } catch {
        /* server stays the source of truth — let the gate fall to the API */
      } finally {
        if (!cancelled) setEntLoading(false);
      }
      try {
        const list = await CVService.getMyDrafts();
        if (!cancelled) {
          const arr = Array.isArray(list) ? list : [];
          setDrafts(arr);
          // If the user has no saved CVs, default the picker to the upload tab.
          if (arr.length === 0) setCvMode('upload');
        }
      } catch {
        if (!cancelled) setCvMode('upload');
      } finally {
        if (!cancelled) setDraftsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isFreeTier = !!entitlement && entitlement.tier === 'free';
  const resumeId = cvMode === 'upload' ? uploadedResume?._id : null;
  const draftCVId = cvMode === 'saved' ? selectedDraftId : null;
  const cvChosen = !!resumeId || !!draftCVId;
  const canStart = cvChosen && !!job?._id && !starting;

  const handleStart = async () => {
    if (!canStart) return;
    setStarting(true);
    try {
      const { applicationId } = await InterviewPrepService.startDirectInterview({
        resumeId,
        draftCVId,
        jobId: job._id,
      });
      // Land on the interview-prep hub for this session — the user reviews their
      // questions, skills and stories there, then launches the live mock from it.
      navigate(`/interview-prep/${applicationId}`);
    } catch (err) {
      const code = err.response?.data?.code;
      if (err.response?.status === 403 && code === 'TIER_REQUIRED') {
        setShowUpgrade(true);
      } else if (code === 'NO_CV_GROUNDING') {
        toast.error(
          'This CV needs at least one work experience entry (role and company) before we can interview you.'
        );
      } else {
        toast.error(err.response?.data?.message || 'Could not start the interview. Try again.');
      }
      setStarting(false);
    }
  };

  // ── Paid-only gate ──
  if (!entLoading && isFreeTier) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-8 pb-16">
          <BackLink navigate={navigate} />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto mb-5">
              <Crown className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Direct interviews are a Pro feature
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              Jump straight into a live, voice-based mock interview against any job description — no
              full analysis required. Upgrade to unlock it.
            </p>
            <button
              onClick={() => navigate('/upgrade')}
              className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-lg btn-primary font-semibold"
            >
              <Sparkles className="w-5 h-5" /> Upgrade to Pro
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-8 pb-32 md:pb-16">
        <BackLink navigate={navigate} />

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Interview Me
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Skip the analysis — go straight to a live interview against a job.
              </p>
            </div>
          </div>
          {entitlement && entitlement.tier !== 'free' && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {Math.round((entitlement.secondsRemaining || 0) / 60)} interview minutes remaining
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1 — choose CV */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Step 1 · Your CV
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pick a saved CV or upload one
                </p>
              </div>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg mb-5">
              <button
                type="button"
                onClick={() => setCvMode('saved')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  cvMode === 'saved'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Saved CV
              </button>
              <button
                type="button"
                onClick={() => setCvMode('upload')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  cvMode === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Upload
              </button>
            </div>

            {cvMode === 'saved' ? (
              draftsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : drafts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                  No saved CVs yet — switch to <strong>Upload</strong> to use a PDF.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-none pr-1">
                  {drafts.map((d) => {
                    const selected = selectedDraftId === d._id;
                    const label = d.title || d.personalInfo?.fullName || 'Untitled CV';
                    return (
                      <button
                        key={d._id}
                        type="button"
                        onClick={() => setSelectedDraftId(d._id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          selected
                            ? 'border-indigo-400 dark:border-indigo-500/60 bg-indigo-50 dark:bg-indigo-500/15 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20 hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:bg-white dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {label}
                        </span>
                        {selected && <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )
            ) : uploadedResume ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    Resume uploaded
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 truncate">
                    {uploadedResume.parsedData?.experience?.[0]?.role || 'Ready to interview'}
                  </p>
                </div>
                <button
                  onClick={() => setUploadedResume(null)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline shrink-0"
                >
                  Change
                </button>
              </div>
            ) : (
              <CVUploader onUploadSuccess={setUploadedResume} />
            )}
          </section>

          {/* Step 2 — job description (required) */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 sm:p-6">
            {job ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Step 2 · Target job
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      We'll tailor the interview to this role
                    </p>
                  </div>
                </div>
                <JobAcknowledgement job={job} onChange={() => setJob(null)} />
              </div>
            ) : (
              <JobLinkInput onJobExtracted={setJob} />
            )}
          </section>
        </div>

        {/* Start bar */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {!cvChosen
              ? 'Choose a CV to continue.'
              : !job
                ? 'Add the job description to continue.'
                : "You're ready — let's begin."}
          </p>
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg font-semibold transition-all ${
              canStart
                ? 'btn-primary'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {starting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Preparing your interview…
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" /> Start interview
              </>
            )}
          </button>
        </div>
      </main>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => navigate('/upgrade')}
        userPlan={isFreeTier ? 'free' : 'paid'}
      />
    </div>
  );
};

// Acknowledge what we detected in the job description so the user trusts the
// interview is tailored. Pulls the AI-extracted analysis off the job (skills by
// importance, seniority, min experience), falling back to raw keywords.
const JobAcknowledgement = ({ job, onChange }) => {
  const analysis = job.analysis || {};
  const skills = (Array.isArray(analysis.skills) ? analysis.skills : [])
    .filter((s) => s && s.name)
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .map((s) => s.name);
  const keywords = Array.isArray(job.keywords) ? job.keywords.filter(Boolean) : [];
  const topSkills = (skills.length ? skills : keywords).slice(0, 8);

  const seniority =
    analysis.seniority && analysis.seniority !== 'unknown'
      ? analysis.seniority.charAt(0).toUpperCase() + analysis.seniority.slice(1)
      : null;
  const minYears = analysis.experience?.minYears;

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {job.title || 'Job added'}
            {job.company ? ` · ${job.company}` : ''}
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Here's what we picked up from this role
          </p>
        </div>
        <button
          onClick={onChange}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline shrink-0"
        >
          Change
        </button>
      </div>

      {(seniority || minYears) && (
        <div className="flex flex-wrap gap-2">
          {seniority && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
              {seniority} level
            </span>
          )}
          {minYears > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
              {minYears}+ yrs experience
            </span>
          )}
        </div>
      )}

      {topSkills.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Key skills they'll probe
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map((name) => (
              <span
                key={name}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        We'll tailor your interview questions around these.
      </p>
    </div>
  );
};

const BackLink = ({ navigate }) => (
  <button
    onClick={() => navigate('/dashboard')}
    className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center mb-6 transition-colors"
  >
    <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
  </button>
);

export default InterviewStart;
