import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import AriaOrbit from '../../components/cv/AriaOrbit';
import CVService from '../../services/cv.service';
import { CAREER_STAGES } from '../../lib/careerStages';

const TargetJob = () => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // Safely destructure context — fallback ensures hooks below see stable
  // shapes on the first render even if the provider hasn't initialised yet.
  const context = useOutletContext();
  const {
    cvData,
    updateCvData,
    ensureDraft,
    resetWorkspaceScroll,
    handleNext,
    handleBack,
    saving,
    setStepDirty,
    registerStepData,
  } = context || {};

  // The JD is now captured through the coach chat (see ATSCoachPanel's target-step
  // chat) — this step just mirrors whatever targetJob the coach has stored, so
  // proceeding carries it forward.
  const [formData, setFormData] = useState(cvData?.targetJob || { title: '', description: '' });
  const [selectedStage, setSelectedStage] = useState(cvData?.careerStage || '');
  const [savingStage, setSavingStage] = useState(false);
  const [transitioningStage, setTransitioningStage] = useState(false);
  const [choiceTransition, setChoiceTransition] = useState('');
  const [showJobForm, setShowJobForm] = useState(false);
  const [roleInput, setRoleInput] = useState(cvData?.targetJob?.title || '');
  const [jdInput, setJdInput] = useState(cvData?.targetJob?.description || '');
  const [readingJob, setReadingJob] = useState(false);
  const [workspaceTransition, setWorkspaceTransition] = useState('');
  const [returningToChoice, setReturningToChoice] = useState(false);
  // Confirming the target hands off to the next step. Aria steps back to the
  // middle first so the move reads as her leading the way, not a hard cut.
  const [advancing, setAdvancing] = useState(false);
  const [jobKeywords, setJobKeywords] = useState(cvData?.targetJob?.keywords || []);
  const [jobBrief, setJobBrief] = useState(cvData?.targetJob?.brief || null);
  const hasUserEdited = useRef(false);
  const choiceTimer = useRef(null);
  const advanceTimer = useRef(null);
  const onboardingOrbitSlotRef = useRef(null);
  const workspaceOrbitSlotRef = useRef(null);
  const readingOrbitSlotRef = useRef(null);
  const advancingOrbitSlotRef = useRef(null);
  // Bumped whenever a slot element attaches. AnimatePresence mode="wait" mounts
  // the incoming pane only after the outgoing one has finished exiting, so the
  // state change that triggers a swap lands well before the slot exists — these
  // callback refs are what tell us the real target is finally in the DOM.
  const [orbitSlotEpoch, setOrbitSlotEpoch] = useState(0);
  const [orbitTarget, setOrbitTarget] = useState({ left: 0, top: 0, scale: 1, ready: false });

  useEffect(
    () => () => {
      if (choiceTimer.current) clearTimeout(choiceTimer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    []
  );

  // Sync prefilled data from CVContext (e.g. when navigating from job search, or
  // when the coach chat saves a job description).
  useEffect(() => {
    if (!hasUserEdited.current && cvData?.targetJob) {
      const { title, description } = cvData.targetJob;
      if (title || description) {
        setFormData({ title: title || '', description: description || '' });
      }
    }
  }, [cvData?.targetJob]);

  useEffect(() => {
    if (cvData?.careerStage) setSelectedStage(cvData.careerStage);
  }, [cvData?.careerStage]);

  // Expose this step's current data so the wizard can flush it when the user
  // jumps to another section via the step navigator.
  useEffect(() => {
    registerStepData?.(() => ({ targetJob: formData }));
    return () => registerStepData?.(null);
  }, [formData, registerStepData]);

  const proceed = () => {
    setStepDirty?.(false);
    handleNext({ targetJob: formData });
  };

  // Confirming the read target: let the card clear and Aria glide back to the
  // middle before the wizard swaps steps, so the handoff is a beat the user can
  // follow rather than an instant jump.
  const confirmTargetJob = () => {
    if (advancing || saving) return;
    setAdvancing(true);
    // Long enough to land the orbit (~500ms) and let the send-off line be read,
    // a touch snappier than the 2.2s "build a normal CV" send-off since the user
    // has already committed by this point.
    advanceTimer.current = setTimeout(proceed, reduceMotion ? 150 : 1800);
  };

  // A JD sent to Aria lives in cvData.targetJob.
  const hasJd = !!(cvData?.targetJob?.description || '').trim();

  const pickCareerStage = async (stage) => {
    if (savingStage) return;
    const previousStage = selectedStage;
    setSelectedStage(stage);
    updateCvData?.({ careerStage: stage });
    setSavingStage(true);
    setTransitioningStage(true);
    try {
      await Promise.all([
        (async () => {
          const draftId = await ensureDraft?.();
          if (!draftId) throw new Error('draft unavailable');
          await CVService.saveDraft({ _id: draftId, careerStage: stage });
        })(),
        new Promise((resolve) => setTimeout(resolve, reduceMotion ? 180 : 1150)),
      ]);
      // ensureDraft replaces local state with the create response, so restore the
      // selected CV-wide coaching context after that response lands.
      updateCvData?.({ careerStage: stage });
    } catch {
      setSelectedStage(previousStage);
      updateCvData?.({ careerStage: previousStage });
      toast.error(t('cvBuilder.askAria.couldntSave'));
    } finally {
      setSavingStage(false);
      setTransitioningStage(false);
    }
  };

  const openTargetJobForm = () => {
    setRoleInput(cvData?.targetJob?.title || '');
    setJdInput(cvData?.targetJob?.description || '');
    resetWorkspaceScroll?.();
    setWorkspaceTransition('to-form');
    setShowJobForm(true);
  };

  const chooseCvDirection = (choice) => {
    if (choiceTransition || saving) return;
    setChoiceTransition(choice);
    if (choice === 'tailor') {
      openTargetJobForm();
      choiceTimer.current = setTimeout(
        () => setChoiceTransition(''),
        reduceMotion ? 180 : 900
      );
      return;
    }
    choiceTimer.current = setTimeout(
      () => proceed(),
      reduceMotion ? 180 : 2200
    );
  };

  const closeTargetJobForm = () => {
    if (returningToChoice) return;
    if (choiceTimer.current) clearTimeout(choiceTimer.current);
    setChoiceTransition('');
    if (!hasJd) {
      setWorkspaceTransition('to-choice');
      setReturningToChoice(true);
      choiceTimer.current = setTimeout(
        () => {
          setShowJobForm(false);
          setReturningToChoice(false);
        },
        reduceMotion ? 80 : 240
      );
      return;
    }
    setWorkspaceTransition('to-confirmation');
    setShowJobForm(false);
  };

  const handleOnboardingBack = () => {
    if (selectedStage) {
      setSelectedStage('');
      return;
    }
    handleBack?.();
  };

  const addTargetJob = async () => {
    const title = roleInput.trim();
    const description = jdInput.trim();
    if (!title || description.length < 25) return;

    const targetJob = { ...(cvData.targetJob || {}), title, description };
    setFormData(targetJob);
    updateCvData?.({ targetJob });
    setWorkspaceTransition('to-reading');
    setShowJobForm(false);
    setReadingJob(true);

    let keywords = [];
    let brief = null;
    await Promise.all([
      (async () => {
        const [keywordResult, briefResult] = await Promise.allSettled([
          CVService.getJobKeywords({ title, description }),
          CVService.studioBriefPreview({ jobTitle: title, jobDescription: description }),
        ]);

        if (keywordResult.status === 'fulfilled') {
          const data = keywordResult.value;
          if (Array.isArray(data?.keywords)) {
            keywords = data.keywords
              .slice()
              .sort(
                (a, b) =>
                  (b.importance === 'must_have' ? 1 : 0) -
                  (a.importance === 'must_have' ? 1 : 0)
              )
              .map((item) => (typeof item === 'string' ? item : item.name))
              .filter(Boolean)
              .slice(0, 16);
          }
        }

        if (briefResult.status === 'fulfilled') brief = briefResult.value?.brief || null;
      })(),
      new Promise((resolve) => setTimeout(resolve, reduceMotion ? 180 : 2400)),
    ]);

    const completedTarget = { ...targetJob, keywords, brief };
    setFormData(completedTarget);
    setJobKeywords(keywords);
    setJobBrief(brief);
    updateCvData?.({ targetJob: completedTarget });
    setWorkspaceTransition('to-confirmation');
    setReadingJob(false);
  };

  const targetWorkspace = showJobForm || readingJob || hasJd;
  const canAddJob = roleInput.trim().length > 0 && jdInput.trim().length >= 25;
  const mustHaves = (jobBrief?.mustHaves || [])
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean)
    .slice(0, 8);
  const niceToHaves = (jobBrief?.niceToHaves || [])
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean)
    .slice(0, 5);
  const responsibilities = (jobBrief?.responsibilities || []).filter(Boolean).slice(0, 3);
  const signalCount = mustHaves.length + niceToHaves.length + responsibilities.length;

  // Stable identities, so React only runs them when the element mounts or
  // unmounts rather than on every render.
  const attachOnboardingSlot = useCallback((node) => {
    onboardingOrbitSlotRef.current = node;
    if (node) setOrbitSlotEpoch((epoch) => epoch + 1);
  }, []);
  const attachWorkspaceSlot = useCallback((node) => {
    workspaceOrbitSlotRef.current = node;
    if (node) setOrbitSlotEpoch((epoch) => epoch + 1);
  }, []);
  const attachReadingSlot = useCallback((node) => {
    readingOrbitSlotRef.current = node;
    if (node) setOrbitSlotEpoch((epoch) => epoch + 1);
  }, []);
  const attachAdvancingSlot = useCallback((node) => {
    advancingOrbitSlotRef.current = node;
    if (node) setOrbitSlotEpoch((epoch) => epoch + 1);
  }, []);

  const getActiveOrbitSlot = useCallback(
    () =>
      advancing
        ? advancingOrbitSlotRef.current
        : readingJob
          ? readingOrbitSlotRef.current
          : targetWorkspace
            ? workspaceOrbitSlotRef.current
            : onboardingOrbitSlotRef.current,
    [advancing, readingJob, targetWorkspace]
  );

  const measureOrbitSlot = useCallback(() => {
    const slot = getActiveOrbitSlot();
    if (!slot) return null;
    const rect = slot.getBoundingClientRect();
    // A slot that hasn't been laid out yet measures 0×0 — ignore it rather than
    // parking the orbit at the top-left of the viewport.
    if (!rect.width && !rect.height) return null;
    return {
      left: rect.left + rect.width / 2 - 28,
      top: rect.top + rect.height / 2 - 28,
      // The slot's own box drives the size (orbit renders at 56px), so a slot
      // can change size responsively without this needing to know about it.
      scale: rect.width / 56,
      ready: true,
    };
  }, [getActiveOrbitSlot]);

  const commitOrbitTarget = useCallback(() => {
    const next = measureOrbitSlot();
    if (!next) return;
    setOrbitTarget((current) =>
      Math.abs(current.left - next.left) < 0.5 &&
      Math.abs(current.top - next.top) < 0.5 &&
      current.scale === next.scale &&
      current.ready === next.ready
        ? current
        : next
    );
  }, [measureOrbitSlot]);

  // The pane swap runs through AnimatePresence mode="wait", so the outgoing pane
  // is fully unmounted before the incoming one mounts — layout is already final
  // by the time this runs and a single measurement is correct. (Under the old
  // mode="sync" both panes shared normal flow mid-crossfade, which parked the
  // incoming slot below its resting spot; measuring then stranded the orbit
  // there, and re-measuring every frame dragged it there and snapped it back.)
  //
  // orbitSlotEpoch is the dep that matters for a swap: the state change fires
  // this effect while the incoming slot is still unmounted, so that pass
  // measures nothing and the real move happens when the slot attaches.
  useLayoutEffect(() => {
    let frame = 0;

    commitOrbitTarget();
    // Layout keeps settling for a few hundred ms after the state change: panels
    // swap, the identity block collapses its height, centring redistributes
    // inside the min-h container (which never changes size itself, so no
    // observer fires). Follow the slot through it.
    //
    // Safe to track now only because every AnimatePresence in this step is
    // mode="wait" or popLayout — the slot is never parked at a false
    // intermediate the way it was under the old mode="sync", so this follows
    // real movement instead of chasing a wrong position and snapping back.
    const start = performance.now();
    const track = (now) => {
      commitOrbitTarget();
      if (now - start < 700) frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);

    window.addEventListener('resize', commitOrbitTarget);
    window.addEventListener('scroll', commitOrbitTarget, true);

    // Web fonts land after first paint and reflow the column the slot sits in,
    // silently invalidating the measurement. Most visible on narrow viewports,
    // where the wordmark and headings wrap differently.
    let cancelled = false;
    document.fonts?.ready
      ?.then(() => {
        if (!cancelled) commitOrbitTarget();
      })
      .catch(() => {});

    // Anything that reflows the column without firing resize or scroll — the
    // coach panel stacking under the workspace on mobile, late-loading content,
    // a heading rewrapping — moves the slot out from under the orbit.
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(commitOrbitTarget);
      const slotParent = getActiveOrbitSlot()?.parentElement;
      if (slotParent) observer.observe(slotParent);
      observer.observe(document.body);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', commitOrbitTarget);
      window.removeEventListener('scroll', commitOrbitTarget, true);
    };
  }, [
    getActiveOrbitSlot,
    commitOrbitTarget,
    orbitSlotEpoch,
    advancing,
    targetWorkspace,
    showJobForm,
    returningToChoice,
    selectedStage,
    transitioningStage,
    choiceTransition,
    savingStage,
  ]);

  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t('cvBuilder.targetJob.loading')}
      </div>
    );
  }

  // overflow-x-hidden + scrollbar-none, matching the layout's own workspace
  // scroller: `overflow-y-auto` alone leaves overflow-x computing to auto, so the
  // card's x:18 entrance flashed a horizontal scrollbar for the length of the
  // animation.
  const workspaceContent = (
      <div className="flex min-h-[560px] items-center justify-center overflow-y-auto overflow-x-hidden scrollbar-none px-4 py-10 sm:px-6 sm:py-14 lg:h-full lg:min-h-0 lg:overflow-hidden lg:py-6">
        <motion.div initial={false} className="w-full max-w-2xl">

          <AnimatePresence mode="popLayout">
            {advancing ? (
              // Handoff beat — the card clears and only Aria is left, centred at
              // full size (her working orbit is the spinner), before the wizard
              // moves on. Same shape as the "build a normal CV" send-off so both
              // ways out of this step feel like the same product.
              <motion.div
                key="handoff"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reduceMotion ? 0.05 : 0.2 }}
                className="flex min-h-72 flex-col items-center justify-center text-center"
              >
                <div ref={attachAdvancingSlot} className="h-14 w-14" aria-hidden="true" />
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reduceMotion ? 0 : 0.3,
                    duration: reduceMotion ? 0.1 : 0.32,
                    ease: 'easeOut',
                  }}
                  className="mt-5 font-heading text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100"
                >
                  {t('cvBuilder.targetJob.settingUpCv')}
                </motion.p>
              </motion.div>
            ) : showJobForm ? (
              <motion.div
                key="job-form"
                initial={false}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.3, ease: 'easeOut' }}
                className="flex flex-col items-center gap-3 lg:flex-row lg:items-start lg:gap-4"
              >
                {/* Below lg Aria sits centred above the card, so every move in
                    this step is purely vertical instead of a cramped diagonal
                    into the corner. */}
                <div
                  ref={attachWorkspaceSlot}
                  className="h-14 w-14 shrink-0 lg:mt-2 lg:h-[30px] lg:w-[30px]"
                  aria-hidden="true"
                />
                <motion.div
                  initial={{ opacity: 0, x: 18, scale: 0.99 }}
                  animate={{
                    opacity: returningToChoice ? 0 : 1,
                    x: returningToChoice ? -8 : 0,
                    scale: returningToChoice ? 0.985 : 1,
                  }}
                  transition={{
                    // The outer pane swap is mode="wait", so the onboarding pane
                    // is already gone by the time this mounts — the delay only
                    // needs to let the orbit start its move, not to wait out an
                    // overlapping pane. (It was 0.68s under the old mode="sync",
                    // which left the card's border fading in alone for ~700ms.)
                    delay: reduceMotion
                      ? 0
                      : choiceTransition === 'tailor'
                        ? 0.12
                        : workspaceTransition === 'to-form'
                          ? 0.28
                          : 0,
                    duration: 0.46,
                    ease: 'easeOut',
                  }}
                  className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm sm:p-6 lg:w-auto lg:flex-1 dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    {t('cvBuilder.targetJob.addTargetEyebrow')}
                  </p>
                  <label className="mt-5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('cvBuilder.atsCoach.jobTitleRole')}
                  </label>
                  <input
                    value={roleInput}
                    onChange={(event) => setRoleInput(event.target.value)}
                    placeholder={t('cvBuilder.atsCoach.jobTitlePlaceholder')}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-white"
                  />
                  <label className="mt-4 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('cvBuilder.atsCoach.jobDescription')}
                  </label>
                  <textarea
                    value={jdInput}
                    onChange={(event) => setJdInput(event.target.value)}
                    rows={9}
                    placeholder={t('cvBuilder.atsCoach.jobDescriptionPlaceholder')}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-white"
                  />
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={closeTargetJobForm}
                      className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      {t('common.back')}
                    </button>
                    <button
                      type="button"
                      disabled={!canAddJob}
                      onClick={addTargetJob}
                      className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
                    >
                      {t('cvBuilder.targetJob.letAriaRead')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : readingJob ? (
              <motion.div
                key="reading-job"
                variants={{
                  hidden: { opacity: 0, scale: 0.985 },
                  visible: {
                    opacity: 1,
                    scale: 1,
                    transition: {
                      delay: reduceMotion || workspaceTransition !== 'to-reading' ? 0 : 0.55,
                      duration: reduceMotion ? 0.1 : 0.32,
                      ease: 'easeOut',
                    },
                  },
                  exit: {
                    opacity: 0,
                    transition: { duration: reduceMotion ? 0.05 : 0.08 },
                  },
                }}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex min-h-72 flex-col items-center justify-center text-center"
              >
                <div ref={attachReadingSlot} className="h-[76px] w-[76px]" aria-hidden="true" />
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {t('cvBuilder.targetJob.readingTarget')}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="job-confirmation"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduceMotion || workspaceTransition !== 'to-confirmation' ? 0 : 0.5,
                  duration: reduceMotion ? 0.1 : 0.34,
                  ease: 'easeOut',
                }}
                className="flex flex-col items-center gap-3 lg:flex-row lg:items-start lg:gap-4"
              >
                <div
                  ref={attachWorkspaceSlot}
                  className="h-14 w-14 shrink-0 lg:mt-2 lg:h-[30px] lg:w-[30px]"
                  aria-hidden="true"
                />
                <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm sm:p-6 lg:w-auto lg:flex-1 dark:border-slate-800 dark:bg-slate-900">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    {t('cvBuilder.targetJob.ariaReadTitle')}
                  </p>
                  <h2 className="mt-2 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formData.title || cvData?.targetJob?.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {formData.description || cvData?.targetJob?.description}
                  </p>
                  {jobBrief && (
                    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {t('cvBuilder.targetJob.ariaReadSummary', { count: signalCount })}
                      </p>
                      {[jobBrief.seniority, jobBrief.industry].filter(Boolean).length > 0 && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {[jobBrief.seniority, jobBrief.industry].filter(Boolean).join(' · ')}
                        </p>
                      )}

                      {mustHaves.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t('cvBuilder.targetJob.coreRequirements')}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {mustHaves.map((item) => (
                              <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {responsibilities.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t('cvBuilder.targetJob.responsibilities')}
                          </p>
                          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            {responsibilities.map((item) => (
                              <li key={item} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {niceToHaves.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t('cvBuilder.targetJob.alsoValued')}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            {niceToHaves.join(' · ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {!jobBrief && jobKeywords.length > 0 && (
                    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('cvBuilder.targetJob.ariaNoticed')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {jobKeywords.map((keyword) => (
                          <span key={keyword} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={openTargetJobForm}
                      className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      {t('cvBuilder.atsCoach.edit')}
                    </button>
                    <button
                      type="button"
                      disabled={saving || advancing}
                      onClick={confirmTargetJob}
                      className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm"
                    >
                      {saving ? t('cvBuilder.common.saving') : t('cvBuilder.targetJob.looksRight')}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );

  const onboardingContent = (
    <div className="flex min-h-[560px] flex-col items-center justify-center overflow-y-auto overflow-x-hidden scrollbar-none px-4 py-16 text-center sm:py-20 lg:h-full lg:min-h-0 lg:overflow-hidden lg:py-6 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Centered greeting with the coach avatar on top — the "is there a job?"
          question is answered in the coach chat on the right. */}
      <div ref={attachOnboardingSlot} className="mb-4 h-14 w-14" aria-hidden="true" />
      {/* Aria's identity — name + what ARIA stands for (first impression on opening the builder) */}
      <motion.div
        animate={{
          height: choiceTransition ? 0 : 'auto',
          opacity: choiceTransition ? 0 : 1,
          y: choiceTransition ? -10 : 0,
        }}
        transition={{ duration: reduceMotion ? 0.1 : 0.24 }}
        className="overflow-hidden"
      >
        <h1 className="font-heading text-3xl font-bold text-slate-900 dark:text-slate-100">Aria</h1>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          {t('cvBuilder.targetJob.tagline')}
        </p>

        {/* Warm personal greeting. Career stage is captured here once because it is
            CV-wide context used by every Aria section, not part of the target-job chat. */}
        <p className="mt-5 max-w-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {t('cvBuilder.targetJob.greetingLine1')}
        </p>
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        {choiceTransition === 'normal' ? (
          <motion.div
            key="changing-direction"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-5 flex min-h-20 flex-col items-center justify-center"
          >
            <p className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
              {t('cvBuilder.targetJob.settingUpCv')}
            </p>
          </motion.div>
        ) : transitioningStage ? (
          <motion.div
            key="setting-context"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: 'easeOut' }}
            className="mt-7 flex min-h-20 flex-col items-center justify-center"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t('cvBuilder.targetJob.settingContext')}
            </p>
          </motion.div>
        ) : !selectedStage ? (
          <motion.div
            key="career-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.3, ease: 'easeOut' }}
            className="mt-7 w-full max-w-lg"
          >
            <p className="font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('cvBuilder.targetJob.careerQuestion')}
            </p>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {t('cvBuilder.targetJob.careerHint')}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {CAREER_STAGES.map((stage, index) => (
                <motion.button
                  key={stage.k}
                  type="button"
                  disabled={savingStage}
                  onClick={() => pickCareerStage(stage.k)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : index * 0.06 }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-900 hover:bg-slate-900 hover:text-white disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900"
                >
                  {t(stage.labelKey)}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : !hasJd ? (
          <motion.div
            key="target-choice"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.38, ease: 'easeOut' }}
            className="mt-7 w-full max-w-lg"
          >
            <p className="font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('cvBuilder.targetJob.greetingLine2')}
            </p>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {t('cvBuilder.targetJob.jobChoiceHint')}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {['tailor', 'normal'].map((choice, index) => (
                <motion.button
                  key={choice}
                  type="button"
                  disabled={saving}
                  onClick={() => chooseCvDirection(choice)}
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: reduceMotion ? 0 : 0.1 + index * 0.1 }}
                  className={
                    choice === 'tailor'
                      ? 'rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-700 hover:shadow-md dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
                      : 'rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 transition-all hover:-translate-y-0.5 hover:border-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-white'
                  }
                >
                  {t(
                    choice === 'tailor'
                      ? 'cvBuilder.targetJob.tailorToJob'
                      : 'cvBuilder.targetJob.buildNormalCv'
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="target-added"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 font-semibold text-slate-900 dark:text-slate-100"
          >
            {t('cvBuilder.targetJob.targetReady')}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-8 flex items-center gap-3">
        {!choiceTransition && (
          <button
            type="button"
            onClick={handleOnboardingBack}
            className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </button>
        )}
        {selectedStage && hasJd && !transitioningStage && (
          <button
            type="button"
            disabled={saving || savingStage}
            onClick={proceed}
            className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"
          >
            {saving || savingStage
              ? t('cvBuilder.common.saving')
              : t('cvBuilder.targetJob.continue')}{' '}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );

  return (
    <div className="h-full">
      {createPortal(
        <motion.div
          initial={false}
          animate={{
            left: orbitTarget.left,
            top: orbitTarget.top,
            scale:
              transitioningStage && !targetWorkspace
                ? orbitTarget.scale * 1.28
                : orbitTarget.scale,
            opacity: orbitTarget.ready ? 1 : 0,
          }}
          transition={
            reduceMotion
              ? { duration: 0.1 }
              : { type: 'spring', stiffness: 125, damping: 20, mass: 0.9 }
          }
          className="pointer-events-none fixed z-40 h-14 w-14 origin-center"
        >
          <AriaOrbit size={56} working />
        </motion.div>,
        document.body
      )}
      <AnimatePresence mode="wait" initial={false}>
        {targetWorkspace ? (
          <motion.div
            key="target-workspace"
            className="h-full"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.08 : 0.22 }}
          >
            {workspaceContent}
          </motion.div>
        ) : (
          <motion.div
            key="target-onboarding"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              delay: 0,
              duration: reduceMotion ? 0.08 : 0.22,
            }}
          >
            {onboardingContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TargetJob;
