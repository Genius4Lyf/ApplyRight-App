import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AriaLoader from '../components/ui/AriaLoader';
import { useNavigate } from 'react-router-dom';
import CVUploader from '../components/CVUploader';
import CVService from '../services/cv.service';
import useInterstitial from '../hooks/useInterstitial';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Plus,
  Upload as UploadIcon,
  FileSearch,
  PenTool,
  Trash2,
  Eye,
  X,
  PlayCircle,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import AriaOrbit from '../components/cv/AriaOrbit';
import GlobalBanner from '../components/GlobalBanner';
import CreditGate from '../components/CreditGate';
import { CREDIT_COSTS } from '../lib/credits';
import { getCompletionStatus } from '../lib/cvCompleteness';
import { signalReady } from '../utils/splash';
import { useTranslation, Trans } from 'react-i18next';
import { toast } from 'sonner';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { triggerInterstitial } = useInterstitial();

  // 'create-upload' is the ONLY workflow this page still runs inline — turning an
  // uploaded CV into a draft. The job-analysis workflow that used to live here ('upload')
  // is Aria Studio's now, so the card below navigates instead of expanding.
  const [workflowMode, setWorkflowMode] = useState(null);

  // True until the first drafts fetch resolves. Drives the dashboard skeleton
  // and also gates the Capacitor splash (via signalReady) on mobile so the app
  // doesn't flash an empty dashboard between splash-hide and first paint.
  const [initialLoading, setInitialLoading] = useState(true);
  // After ~6s of the first load still running, own the likelihood that a cold
  // backend is waking — so the wait reads as "working", not "hung".
  const [slowWake, setSlowWake] = useState(false);
  useEffect(() => {
    if (!initialLoading) {
      setSlowWake(false);
      return;
    }
    const id = setTimeout(() => setSlowWake(true), 6000);
    return () => clearTimeout(id);
  }, [initialLoading]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [scanSuccessDraftId, setScanSuccessDraftId] = useState(null);
  const [scanATSReadiness, setScanATSReadiness] = useState(null);
  // Scanning indicator below was wired to a setter that was removed when the
  // upload-and-create flow went async; keeping the variable as a constant
  // preserves the (currently dead) loading branch in case it's resurrected.
  const scanning = false;

  // How many CVs are finished enough to design and download. This page stopped listing
  // CVs when the workspace sidebar became their home, but it still fetches them (see
  // loadDrafts — the request times the skeleton), and it was throwing the body away.
  // So the count is free: no extra request, no extra latency.
  const [finishedCvs, setFinishedCvs] = useState(0);

  // Get user from local storage
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  useEffect(() => {
    loadDrafts({ initial: true });
  }, []);

  // Fetched for its TIMING, not its contents: this page no longer lists CVs (the CV
  // workspace sidebar is their home), but the first resolve is what lifts the skeleton and
  // releases the native splash — so it has to be a real request, not a guess at how long
  // one takes. The LEAN list, for the same reason the sidebar uses it: a whole-draft fetch
  // ships megabytes to time a spinner.
  const loadDrafts = async ({ initial = false } = {}) => {
    try {
      // 'all', not the default 'builder' scope: builder EXCLUDES CVs born in Aria, and
      // those are precisely the ones the studio lists. Counting the narrow set here would
      // advertise a smaller number than the studio then shows.
      const list = await CVService.listCvs('all');
      setFinishedCvs(
        (Array.isArray(list) ? list : []).filter((cv) => getCompletionStatus(cv).isComplete).length
      );
    } catch (error) {
      console.error('Failed to load drafts', error);
    } finally {
      if (initial) {
        setInitialLoading(false);
        signalReady();
      }
    }
  };

  const confirmDelete = async () => {
    try {
      await CVService.deleteDraft(draftToDelete._id);
      toast.success(t('dashboard.toasts.cvDeleted'));
      setDeleteModalOpen(false);
      setDraftToDelete(null);
      loadDrafts(); // Reload the list
    } catch (error) {
      console.error('Failed to delete draft', error);
      toast.error(t('dashboard.toasts.cvDeleteFailed'));
    }
  };

  // Helper to update credits globally (Navbar + Local State)
  const updateCredits = (newBalance) => {
    // 1. Dispatch event for Navbar
    window.dispatchEvent(new CustomEvent('credit_updated', { detail: newBalance }));

    // 2. Update local state
    setUser((prev) => ({ ...prev, credits: newBalance }));

    // 3. Update local storage (so it persists on refresh)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    currentUser.credits = newBalance;
    localStorage.setItem('user', JSON.stringify(currentUser));
  };

  // New: Insufficient Credits Modal
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(0);

  const handleInsufficientCredits = (required, current) => {
    setRequiredCredits(required);
    // Sync real balance from backend into local state
    if (current !== undefined) {
      updateCredits(current);
    }
    setShowCreditModal(true);
  };

  const getStatusMessage = () =>
    user.firstName
      ? t('dashboard.greeting', { name: user.firstName })
      : t('dashboard.greetingNoName');

  const getRecommendedAction = () => {
    if (!user.currentStatus) return t('dashboard.recommendedDefault');
    const field = user.education?.discipline || t('dashboard.yourField');
    const byStatus = {
      student: t('dashboard.recommendedStudent', { field }),
      graduate: t('dashboard.recommendedGraduate', { field }),
      professional: t('dashboard.recommendedProfessional'),
      other: t('dashboard.recommendedOther'),
    };
    return byStatus[user.currentStatus] || byStatus.other;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <GlobalBanner />

      <main
        className={`flex-1 max-w-5xl mx-auto w-full px-4 relative ${
          workflowMode ? 'pt-8 pb-12' : 'py-12'
        }`}
      >
        {!workflowMode && initialLoading && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <AriaLoader size={40} label={t('dashboard.loading.sr')} />
            {slowWake && (
              <p className="max-w-sm px-6 text-center text-sm text-slate-500 dark:text-slate-400 animate-in fade-in duration-500">
                {t('dashboard.loading.wakingUp')}
              </p>
            )}
          </div>
        )}

        {/* Welcome heading — only on the dashboard landing state. Once the
            user picks a workflow we hide it so the upload/job inputs aren't
            pushed below the fold by ~180px of intro copy. */}
        {!workflowMode && !initialLoading && (
          <div className="max-w-3xl mx-auto mb-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('dashboard.workspace')}
            </p>
            <h1 className="mt-2 font-heading text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {getStatusMessage()}
            </h1>
            <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              {getRecommendedAction()}
            </p>

            {/* The one profile nudge, and it lives BELOW the page's own title rather than
              above it. The slot over an H1 belongs to messages about the system — an
              outage, a payment problem — which is what GlobalBanner is for; a suggestion
              about your account is content, and it reads as content here.

              A line, not a card: it competes with nothing, and it disappears the moment
              onboarding is done, which is why it needs no dismiss. An X on a nudge you
              can finish is an invitation to hide the task rather than do it. */}
            {!user.onboardingCompleted && (
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                <span>{t('dashboard.banner.completeBody')}</span>
                <button
                  type="button"
                  onClick={() => navigate('/onboarding')}
                  className="inline-flex items-center gap-1 font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:decoration-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-white dark:focus-visible:ring-white"
                >
                  {t('dashboard.banner.completeCta')}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </p>
            )}
          </div>
        )}

        {/* Aria Studio — the hero launcher. Sits above the two pillars because it's the
            one place where Aria does the work FOR you rather than alongside you. Flat
            hairline card; the left rule is ink, not indigo — indigo is reserved for
            interactive accent (focus rings, links), never decoration. */}
        {!workflowMode && !initialLoading && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-xl rounded-l-none border border-slate-200 dark:border-slate-800 border-l-[6px] border-l-slate-900 dark:border-l-white bg-white dark:bg-slate-900 shadow-card p-6 md:p-7 flex flex-col md:flex-row md:items-center gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <AriaOrbit size={18} />
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {t('dashboard.studio.kicker')}
                  </p>
                </div>
                <h2 className="mt-2.5 font-heading text-2xl md:text-[26px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {t('dashboard.studio.title')}
                </h2>
                <p className="mt-2 text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  {t('dashboard.studio.body')}
                </p>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/aria-studio')}
                  className="btn-primary gap-2 px-5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                >
                  {t('dashboard.studio.cta')} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Two ways in — aim a CV at a job, or build one. Flat editorial cards; the
            flagship Tailor card carries a single ink top-accent + "Recommended" chip.
            Consistent across web and the Android/Capacitor build — we're removing
            paralysis, not removing choice.

            There WAS a second pillar here, "Interview practice", offering a live mock
            straight off the dashboard with no analysis behind it. It is gone: an
            interview rehearsed against a job nothing has read is a rehearsal against
            nothing, and the tailor path reaches the same live mock having studied the
            role first. With one group left, the "Your application" eyebrow and its rule
            went too — a label on a section only means something when there is a second
            section to be told apart from. */}
        {!workflowMode && !initialLoading && (
          <div className="space-y-10 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section>
              <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4">
                {/* Tailor my CV — the flagship */}
                <div
                  onClick={() => navigate('/aria-studio', { state: { start: 'prep' } })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.currentTarget.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={t('dashboard.tailorCard.aria')}
                  className="rounded-xl rounded-t-none border border-slate-200 dark:border-slate-800 border-t-[3px] border-t-slate-900 dark:border-t-white bg-white dark:bg-slate-900 shadow-card p-6 cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <div className="flex items-center justify-between gap-2 mb-4">
                    {/* A document being EXAMINED. The card used to show an upload
                        arrow, left over from when it began by asking for a file — it now
                        begins in Aria's chat, where uploading is one of two ways to hand
                        over a CV, not the action itself. Its own CTA says "Check your
                        CV", so the icon says the same verb.

                        It also has to pair with PenTool on the card beside it: same
                        document family, opposite verbs — examine one, make one. A target
                        or a gauge would have read as an unrelated object next to a pen. */}
                    <FileSearch className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <span className="inline-flex items-center rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                      {t('dashboard.tailorCard.chip')}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('dashboard.tailorCard.title')}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                    <Trans
                      i18nKey="dashboard.tailorCard.body"
                      components={{
                        f: <span className="font-bold italic text-slate-700 dark:text-slate-200" />,
                      }}
                    />
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {t('dashboard.tailorCard.cta')} <ArrowRight className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      {t('dashboard.tailorCard.poweredBy')}
                    </span>
                  </div>
                </div>

                {/* Build a new CV */}
                <div
                  onClick={() => setShowCreateOptions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowCreateOptions(true);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={t('dashboard.buildCard.aria')}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-6 cursor-pointer flex flex-col transition-colors hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <PenTool className="w-5 h-5 text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t('dashboard.buildCard.title')}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                    {t('dashboard.buildCard.body')}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t('dashboard.buildCard.cta')} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </section>

            {/* The finishing end. Deliberately NOT a third card in the row above: those
                two are about STARTING (aim a CV at a job, or write one), that row was
                cut from three to two on purpose, and a document you have already
                written is a different question — what should it look like, and can I
                have the PDF. So it reads as a door rather than a choice: one hairline
                row, no card shadow, subordinate to everything above it.

                Hidden at zero. The studio only ever lists finished CVs, so an empty
                one is a door into an empty room — worse than no door, and the two
                cards above are already the answer to "I have nothing yet". */}
            {finishedCvs > 0 && (
              <button
                type="button"
                onClick={() => navigate('/cv-studio')}
                className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-colors hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <FolderOpen className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                    {t('dashboard.studioCard.title', { count: finishedCvs })}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {t('dashboard.studioCard.body')}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500" />
              </button>
            )}
          </div>
        )}

        {/* Create Options Modal */}
        {showCreateOptions &&
          createPortal(
            /* Bottom-sheet on mobile, centered card on desktop. Compact
             horizontal-row options on mobile (icon left, content right);
             stacked grid on desktop. */
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pb-[env(safe-area-inset-bottom)] sm:p-4 sm:pb-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setShowCreateOptions(false)}
                  aria-label={t('common.close')}
                  className="absolute top-3 right-3 p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="px-5 pt-7 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
                  <h3 className="font-heading text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 sm:mb-2 sm:text-center">
                    {t('dashboard.createModal.title')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 sm:text-center">
                    {t('dashboard.createModal.subtitle')}
                  </p>
                </div>

                <div className="px-5 pb-5 sm:px-8 sm:pb-8 flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-6">
                  {/* Start from Scratch */}
                  <button
                    type="button"
                    onClick={() => navigate('/cv-builder/new')}
                    className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-0 p-4 sm:p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 sm:mb-3" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base sm:mb-2">
                        {t('dashboard.createModal.scratchTitle')}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-snug">
                        {t('dashboard.createModal.scratchBody')}
                      </p>
                    </div>
                  </button>

                  {/* Upload Existing */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateOptions(false);
                      setWorkflowMode('create-upload');
                      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                    }}
                    className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-0 p-4 sm:p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition-colors"
                  >
                    <UploadIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 sm:mb-3" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:flex-col sm:gap-1 sm:items-center">
                        <h4 className="font-heading font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base sm:mb-1">
                          {t('dashboard.createModal.uploadTitle')}
                        </h4>
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] uppercase tracking-[0.1em] rounded shrink-0">
                          15 cr
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-snug sm:mt-1">
                        {t('dashboard.createModal.uploadBody')}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* My Recent CVs widget was removed — the CV workspace sidebar is now the canonical
            home for CV listings (linked from the Navbar and mobile bottom
            nav). Keeping it here duplicated the surface and competed with
            the workflow cards above it on the landing screen. */}

        {/* Create from Upload Workflow */}
        {workflowMode === 'create-upload' && (
          <div className="animate-in fade-in zoom-in-95 duration-300 max-w-2xl mx-auto">
            <button
              onClick={() => setWorkflowMode(null)}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> {t('dashboard.backToDashboard')}
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-card border border-slate-200 dark:border-slate-700 p-8">
              <div className="text-center mb-8">
                <h3 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {t('dashboard.setup.uploadTitle')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {t('dashboard.setup.uploadBody')}
                </p>
              </div>

              {scanning ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <AriaLoader inline size={56} label="Scanning your CV…" className="mb-6" />
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 animate-pulse">
                    {t('dashboard.setup.scanning')}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">
                    {t('dashboard.setup.scanningBody')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center pb-4">
                    <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] uppercase tracking-[0.1em] rounded border border-amber-200 dark:border-amber-500/30">
                      15 cr
                    </span>
                  </div>
                  <CreditGate cost={CREDIT_COSTS.CREATE_FROM_UPLOAD}>
                    <CVUploader
                      endpoint="/resumes/upload-and-create"
                      onUploadSuccess={(data) => {
                        if (data.draftId) {
                          setScanSuccessDraftId(data.draftId);
                          setScanATSReadiness(data.atsReadiness || null);
                          if (data.remainingCredits !== undefined) {
                            updateCredits(data.remainingCredits);
                          }
                        } else {
                          toast.error(t('dashboard.toasts.resumeParseFailed'));
                        }
                      }}
                      onError={(errorData) => {
                        if (errorData.code === 'INSUFFICIENT_CREDITS') {
                          handleInsufficientCredits(errorData.required, errorData.current);
                        }
                      }}
                    />
                  </CreditGate>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scan Success Modal */}
        {scanSuccessDraftId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
              {/* Header — editorial: mono eyebrow → serif title → muted subcopy */}
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                ✓ CV scanned
              </p>
              <h3 className="mt-1 font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('dashboard.health.title')}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {t('dashboard.health.body')}
              </p>

              {/* CV Health Score */}
              {scanATSReadiness && (
                <div className="mt-5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        {t('dashboard.health.scoreLabel')}
                      </p>
                      <p
                        className={`mt-1 font-heading text-lg font-bold ${
                          scanATSReadiness.score >= 75
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : scanATSReadiness.score >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {scanATSReadiness.score >= 75
                          ? t('dashboard.verdict.wellStructured')
                          : scanATSReadiness.score >= 50
                            ? t('dashboard.verdict.gettingThere')
                            : t('dashboard.verdict.needsWork')}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-heading text-4xl font-bold leading-none tabular-nums ${
                        scanATSReadiness.score >= 75
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : scanATSReadiness.score >= 50
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {scanATSReadiness.score}
                    </span>
                  </div>

                  {/* Band rail — needs-work / getting-there / strong, with a marker pin */}
                  <div className="mt-4">
                    <div className="relative">
                      <div className="grid grid-cols-[50fr_25fr_25fr] gap-0.5 h-2 rounded-full overflow-hidden">
                        <span className="bg-rose-500/45" />
                        <span className="bg-amber-500/45" />
                        <span className="bg-emerald-500/45" />
                      </div>
                      <span
                        aria-hidden="true"
                        className="absolute -top-0.5 h-3 w-0.5 -translate-x-1/2 rounded bg-slate-900 dark:bg-slate-100"
                        style={{
                          left: `${Math.max(0, Math.min(100, scanATSReadiness.score))}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 grid grid-cols-[50fr_25fr_25fr] gap-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                      <span>{t('dashboard.health.needsWork')}</span>
                      <span className="text-center">{t('dashboard.health.gettingThere')}</span>
                      <span className="text-right">{t('dashboard.health.strong')}</span>
                    </div>
                  </div>

                  {/* Checks — clean two-column grid, failed ones emphasized */}
                  {scanATSReadiness.checks?.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {scanATSReadiness.checks.slice(0, 6).map((check, i) => (
                        <div key={i} className="flex items-center gap-2 min-w-0">
                          <span
                            className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              check.passed
                                ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {check.passed ? '✓' : '✕'}
                          </span>
                          <span
                            className={`text-xs truncate ${
                              check.passed
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-slate-900 dark:text-slate-100 font-semibold'
                            }`}
                          >
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    // Completion moment after CV upload+convert. Fire-and-forget
                    // — don't block navigation on ad load. No-op on web/paid.
                    triggerInterstitial('upload_edit_in_builder');
                    navigate(`/cv-builder/${scanSuccessDraftId}`);
                  }}
                  className="w-full btn-primary py-3.5 rounded-xl gap-2"
                >
                  <PenTool className="w-5 h-5" /> Review & edit in builder
                </button>
                <button
                  onClick={() => {
                    triggerInterstitial('upload_ats_preview');
                    navigate(`/resume/${scanSuccessDraftId}`, {
                      state: { atsReadiness: scanATSReadiness },
                    });
                  }}
                  className="w-full text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-1.5 py-2"
                >
                  <Eye className="w-4 h-4" /> Skip to preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-4 mb-5 sm:mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100/50 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mb-3 sm:mb-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-1.5 sm:mb-2 font-heading">
                    {t('dashboard.deleteCv.title')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('dashboard.deleteCv.body', {
                      title: draftToDelete?.title || t('dashboard.untitledCv'),
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDraftToDelete(null);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/10 hover:shadow-rose-500/20 transition-all active:scale-[0.98]"
                >
                  {t('dashboard.deleteCv.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Insufficient Credits Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center relative">
            <button
              onClick={() => setShowCreditModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-805 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-5">
              <AriaOrbit size={20} />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 font-heading">
              {t('dashboard.insufficientCredits')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              You need{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {requiredCredits} A.I credits
              </span>{' '}
              to perform this action, but you only have{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {user.credits || 0}
              </span>
              .
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/credits')}
                className="w-full btn-primary py-3 rounded-xl text-sm gap-2"
              >
                <AriaOrbit size={16} tone="mono" /> Get More A.I Credits
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  OR
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <button
                onClick={() => navigate('/credits')} // For now direct to store where ad option lives
                className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4 text-amber-500" /> Watch Ad for Free A.I Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
