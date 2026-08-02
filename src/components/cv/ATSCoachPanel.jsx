import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import CVService from '../../services/cv.service';
import { computeCvHealth, healthColor } from '../../utils/cvHealth';
import { roleMatch } from '../../utils/roleMatch';
import { useCVBuilder } from '../../context/CVContext';
import { bubbleAnim, portalCard } from '../../lib/ariaMotion';
import { suggestionsFor } from '../../lib/coachSuggestions';
import { useStickToBottom } from '../../hooks/useStickToBottom';
import { useChatTheme } from '../../hooks/useChatTheme';
import { useAriaModel } from '../../hooks/useAriaModel';
import AriaComposer from './AriaComposer';
import AskAriaGenerate from './AskAriaGenerate';
import AriaChat from './AriaChat';
import AriaOrbit from './AriaOrbit';
import AriaThinking from './AriaThinking';
import ResearchCard from './ResearchCard';
import { CAREER_STAGES } from '../../lib/careerStages';

// ─── CV Health score ring (free, live) — also reused for the Job Match headline ───
const ScoreRing = ({ score, size = 88 }) => {
  const { ring, text } = healthColor(score);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          stroke={ring}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-extrabold ${text}`} style={{ fontSize: Math.round(size * 0.26) }}>
          {score}
        </span>
        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">/ 100</span>
      </div>
    </div>
  );
};

// Target-step — the job is captured through an inline role+description FORM Aria
// conjures (not a chat textarea). Adding it saves to cvData.targetJob and returns an
// editable summary card with the keywords Aria noticed; "Continue →" advances to Work
// History. Starter questions answer live via /coach/chat (unfocused, ephemeral). The
// "skipped" choice persists in coachState; the saved job survives reload.
const TargetChat = ({
  cvData,
  updateCvData,
  skipped,
  onSkip,
  onAdvance,
  ack,
  setAck,
  draftId,
  ensureDraft,
  careerStage,
  onPickCareerStage,
}) => {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [roleInput, setRoleInput] = useState('');
  const [jdInput, setJdInput] = useState('');
  const [reading, setReading] = useState(false); // "Reading the job…" indicator
  const [descExpanded, setDescExpanded] = useState(false); // read-more on the summary
  const [skipAck, setSkipAck] = useState(false); // reassurance before auto-advancing
  // Q&A (+ the 'research' marker) persists ON the draft (cvData.coachChats.target_job),
  // so it survives leaving the step, refresh, and other devices — like the other chats.
  const savedQa = cvData?.coachChats?.target_job || [];
  const [qa, setQa] = useState(savedQa); // starter-question Q&A [{who,text}] + research marker
  const [qThinking, setQThinking] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false); // ensureDraft in-flight → pin "Setting up…"
  const [showChips, setShowChips] = useState(savedQa.length === 0);
  const [savingCareerStage, setSavingCareerStage] = useState(false);

  // The Aria model for this CV — the inert row still offers the pick, so the choice is
  // reachable from the Target step like every other one.
  const { modelId, selectModel } = useAriaModel({ draftId, cvData, updateCvData });

  const desc = (cvData.targetJob?.description || '').trim();
  const sent = !!desc;
  const descIsLong = desc.length > 160 || desc.split('\n').length > 3;
  const role = (cvData.targetJob?.title || '').trim();
  const kws = cvData.targetJob?.keywords || ack?.kws || [];
  const canAdd = roleInput.trim().length > 0 && jdInput.trim().length >= 25;

  const reduce = useReducedMotion();
  const scrollRef = useRef(null);
  useStickToBottom(scrollRef, [sent, reading, ack, skipAck, qa, qThinking, formOpen], reduce);

  // Persist the Q&A to the draft. Pass ONLY this section's key — updateCvData
  // deep-merges functionally, so it can't clobber another section's saved thread.
  useEffect(() => {
    updateCvData({ coachChats: { target_job: qa } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qa]);

  // Skip → acknowledge warmly, then auto-advance to the next step after a beat.
  const handleSkip = () => {
    onSkip?.();
    setSkipAck(true);
    setTimeout(() => onAdvance?.(), 1200);
  };

  const pickCareerStage = async (stage) => {
    if (savingCareerStage) return;
    setSavingCareerStage(true);
    try {
      await onPickCareerStage?.(stage);
    } catch {
      toast.error(t('cvBuilder.askAria.couldntSave'));
    } finally {
      setSavingCareerStage(false);
    }
  };

  const openForm = () => {
    setRoleInput(role); // prefill on Edit
    setJdInput(desc);
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);

  // Add → save the job, then "read" it with the FREE deterministic keyword path (no
  // AI flag → no credit charge), holding the reading indicator for a beat (~1.3s).
  const addJob = async () => {
    const r = roleInput.trim();
    const d = jdInput.trim();
    if (!r || d.length < 25) return;
    updateCvData?.({ targetJob: { ...(cvData.targetJob || {}), title: r, description: d } });
    setFormOpen(false);
    setReading(true);
    let k = [];
    await Promise.all([
      (async () => {
        try {
          const data = await CVService.getJobKeywords({ description: d });
          // Stay free: if the backend ever flags a charge, ignore the keywords.
          if (!data?.charged && Array.isArray(data?.keywords)) {
            k = data.keywords
              .slice()
              .sort(
                (a, b) =>
                  (b.importance === 'must_have' ? 1 : 0) - (a.importance === 'must_have' ? 1 : 0)
              )
              .map((x) => x.name)
              .filter(Boolean)
              .slice(0, 3);
          }
        } catch {
          k = [];
        }
      })(),
      new Promise((res) => setTimeout(res, 1300)),
    ]);
    setAck?.({ kws: k });
    if (k.length) {
      updateCvData?.({
        targetJob: { ...(cvData.targetJob || {}), title: r, description: d, keywords: k },
      });
    }
    setReading(false);
  };

  // Drop the "what research says" lecture card into the Q&A — no AI call, added once.
  // Lives in the ephemeral qa array (the marker has no text, so /coach/chat ignores it).
  const injectResearch = () => {
    if (qThinking) return;
    setQThinking(true);
    setTimeout(() => {
      setQa((m) =>
        m.some((x) => x.who === 'research') ? m : [...m, { who: 'research', section: 'target_job' }]
      );
      setQThinking(false);
    }, 900);
  };

  // Starter-question chip → live answer via /coach/chat (unfocused, general). The
  // exchange is ephemeral (not persisted) — this step's saved state is the job itself.
  const askQuestion = async (q) => {
    if (qThinking) return;
    setShowChips(false);
    const next = [...qa, { who: 'user', text: q }];
    setQa(next);
    setQThinking(true);
    // Actively CREATE the draft on demand (shared with builder-entry, no duplicate)
    // and use its real id — so an eager click the instant the builder opens works.
    // While it's creating, the working indicator reads "Setting up your CV draft…".
    const needsCreate = !draftId || draftId === 'new';
    if (needsCreate) setCreatingDraft(true);
    const id = await ensureDraft();
    setCreatingDraft(false);
    if (!id) {
      setQa((m) => [...m, { who: 'aria', text: t('cvBuilder.common.couldntSetup') }]);
      setQThinking(false);
      return;
    }
    try {
      const rr = await CVService.coachChat({
        draftId: id,
        currentStepId: 'target_job',
        messages: next,
        focus: undefined,
        model: modelId,
      });
      setQa((m) => [...m, { who: 'aria', text: rr.reply }]);
      // Metered turn (flagship, or past the daily free pool) → refresh the wallet pill.
      if (rr.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: rr.remainingCredits }));
      }
    } catch (e) {
      const code = e?.response?.data?.code;
      setQa((m) => [
        ...m,
        {
          who: 'aria',
          text:
            // Pro model, no credits — switching back to Standard is free, so say that.
            code === 'INSUFFICIENT_CREDITS'
              ? t('cvBuilder.common.proNeedsCredits')
              : code === 'CHAT_LIMIT_REACHED'
                ? t('cvBuilder.common.freeChatsUsed')
                : t('cvBuilder.common.couldntReach'),
        },
      ]);
    } finally {
      setQThinking(false);
    }
  };

  return (
    <section className="flex flex-col flex-1 min-h-0 p-4">
      {/* No header — the CV-builder hero introduces Aria; this opens straight into
          the conversation, consistent with AriaChat. There's no chat textarea on this
          step: the job comes from the form, questions from the starter chips. */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto scrollbar-none flex flex-col gap-2.5"
        >
          {/* Greeting */}
          <motion.div
            className="self-start max-w-[92%] flex items-start gap-2"
            {...bubbleAnim('aria', reduce)}
          >
            <AriaOrbit size={16} className="mt-2" />
            <span className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-800 dark:text-slate-100">
              {t('cvBuilder.atsCoach.greeting')}
            </span>
          </motion.div>

          {/* Career stage belongs to the whole CV, so collect it once before the
              target job and work-history steps begin — never while coaching a role. */}
          {!careerStage && (
            <motion.div
              className="self-start max-w-[92%] flex items-start gap-2"
              {...bubbleAnim('aria', reduce)}
            >
              <AriaOrbit size={16} className="mt-2" />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-md px-3.5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t('cvBuilder.ariaChat.stagePrompt')}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {CAREER_STAGES.map((stage) => (
                    <button
                      key={stage.k}
                      type="button"
                      disabled={savingCareerStage}
                      onClick={() => pickCareerStage(stage.k)}
                      className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors disabled:opacity-50"
                    >
                      {t(stage.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* (a) Live starter-question Q&A. */}
          {qa.map((m, i) => {
            if (m.who === 'research') return <ResearchCard key={i} section={m.section} />;
            return m.who === 'user' ? (
              <motion.div
                key={i}
                className="self-end max-w-[92%] bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] leading-relaxed"
                {...bubbleAnim('user', reduce)}
              >
                {m.text}
              </motion.div>
            ) : (
              <motion.div
                key={i}
                className="self-start max-w-[92%] flex items-start gap-2"
                {...bubbleAnim('aria', reduce)}
              >
                <AriaOrbit size={16} className="mt-2" />
                <span className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-800 dark:text-slate-100">
                  {m.text}
                </span>
              </motion.div>
            );
          })}
          {qThinking && (
            <AriaThinking
              variant="chat"
              label={creatingDraft ? t('cvBuilder.common.settingUp') : undefined}
            />
          )}

          {/* (b) "Reading the job…" while Aria reads the freshly-added JD. */}
          {reading && (
            <div className="self-start flex items-center gap-2">
              <AriaOrbit size={16} working />
              <span className="text-[12px] text-slate-400 dark:text-slate-500">
                {t('cvBuilder.atsCoach.readingJob')}
              </span>
            </div>
          )}

          {/* (c) Summary card — the saved job returns to the chat, editable. */}
          {sent && !formOpen && !reading && (
            <motion.div
              className="self-start max-w-[92%] flex items-start gap-2"
              {...bubbleAnim('aria', reduce)}
            >
              <AriaOrbit size={16} className="mt-2" />
              <div className="w-full min-w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-md p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {t('cvBuilder.atsCoach.yourTargetJob')}
                  </p>
                  <button
                    type="button"
                    onClick={openForm}
                    className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {t('cvBuilder.atsCoach.edit')}
                  </button>
                </div>
                {role && (
                  <p className="mt-1.5 font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
                    {role}
                  </p>
                )}
                <div
                  className={`mt-1 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap ${
                    descExpanded ? '' : 'line-clamp-3'
                  }`}
                >
                  {desc}
                </div>
                {descIsLong && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {descExpanded
                      ? t('cvBuilder.atsCoach.showLess')
                      : t('cvBuilder.atsCoach.readMore')}
                  </button>
                )}
                {kws.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                      <Trans
                        i18nKey="cvBuilder.atsCoach.leansOn"
                        values={{ kws: kws.join(', ') }}
                        components={{
                          b: <span className="font-semibold text-slate-900 dark:text-slate-100" />,
                        }}
                      />
                    </p>
                  </div>
                )}
                <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                  {t('cvBuilder.atsCoach.lookRight')}
                </p>
                <button
                  type="button"
                  onClick={() => onAdvance?.()}
                  className="btn-primary w-full mt-2 py-2 text-sm"
                >
                  {t('cvBuilder.atsCoach.continue')}
                </button>
              </div>
            </motion.div>
          )}

          {/* (d) The role+description form — blooms from Aria's orbit. Centered as a
              proper modal (not pinned to the chat column's width) so there's real room
              to paste a full job description; responsive from mobile up. */}
          <AnimatePresence>
            {formOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <button
                  type="button"
                  aria-label={t('common.back')}
                  className="absolute inset-0 cursor-default"
                  onClick={closeForm}
                />
                <motion.div
                  className="relative w-full max-w-lg flex items-start gap-2"
                  {...portalCard(reduce)}
                >
                  <AriaOrbit size={16} className="mt-2 shrink-0" />
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-md p-4 sm:p-5 w-full max-h-[85vh] overflow-y-auto">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      {t('cvBuilder.atsCoach.addYourTargetJob')}
                    </p>
                    <label className="mt-3 block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t('cvBuilder.atsCoach.jobTitleRole')}
                    </label>
                    <input
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      placeholder={t('cvBuilder.atsCoach.jobTitlePlaceholder')}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-3.5 py-2 text-[13px] outline-none focus:border-slate-900 dark:focus:border-slate-100 focus:ring-1 focus:ring-slate-900/20 dark:focus:ring-slate-100/20 transition-colors"
                    />
                    <label className="mt-3 block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t('cvBuilder.atsCoach.jobDescription')}
                    </label>
                    <textarea
                      value={jdInput}
                      onChange={(e) => setJdInput(e.target.value)}
                      rows={8}
                      placeholder={t('cvBuilder.atsCoach.jobDescriptionPlaceholder')}
                      className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-3.5 py-2 text-[13px] leading-relaxed outline-none focus:border-slate-900 dark:focus:border-slate-100 focus:ring-1 focus:ring-slate-900/20 dark:focus:ring-slate-100/20 transition-colors scrollbar-none"
                    />
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={closeForm}
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        {t('common.back')}
                      </button>
                      <button
                        type="button"
                        onClick={addJob}
                        disabled={!canAdd}
                        className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                      >
                        {t('cvBuilder.atsCoach.add')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* (e) Pill row — Add a job description + starter questions + Skip. */}
          {!sent && !formOpen && !skipAck && (
            <div className="self-start flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={openForm}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {t('cvBuilder.atsCoach.addJobDescriptionPill')}
              </button>
              {showChips &&
                suggestionsFor(t, 'target_job').map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => askQuestion(chip)}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              <button
                type="button"
                onClick={injectResearch}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                📖 {t('cvBuilder.researchCard.whatResearchSays')}
              </button>
              {!skipped && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('cvBuilder.atsCoach.skipForNow')}
                </button>
              )}
            </div>
          )}

          {/* (f) Aria's reassurance after skipping — shown before advancing. */}
          {skipAck && (
            <motion.div
              className="self-start max-w-[92%] flex items-start gap-2"
              {...bubbleAnim('aria', reduce)}
            >
              <AriaOrbit size={16} className="mt-2" />
              <span className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-800 dark:text-slate-100">
                {t('cvBuilder.atsCoach.skipReassurance')}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Docked composer — visual parity with the other sections' chats, but INERT:
          this step is driven by the form + starter chips, not free typing. The control
          row stays live, so the model and chat background are switchable here too. */}
      <AriaComposer
        className="shrink-0 mt-2"
        inert
        placeholder={t('cvBuilder.atsCoach.inertPlaceholder')}
        sendAriaLabel={t('cvBuilder.atsCoach.inertSendLabel')}
        modelId={modelId}
        onSelectModel={selectModel}
      />
    </section>
  );
};

const ATSCoachPanel = ({
  cvData,
  user,
  currentStepId,
  updateCvData,
  onShowPreview,
  focusedEntry,
  onClearFocus,
}) => {
  const { t } = useTranslation();
  const { id: draftId } = useParams();
  const [chatTheme] = useChatTheme();
  const health = useMemo(() => computeCvHealth(t, cvData), [t, cvData]);

  // Coach conversation (per-step replies + interaction) is cached in the builder
  // context, so leaving the panel — e.g. closing the mobile coach bubble or flipping
  // to the Preview tab — and returning restores it instead of re-fetching.
  const {
    coachState: aiByStep,
    setCoachState: setAiByStep,
    applyRoleBulletDiff,
    applySummary,
    applySkills,
    goToStep,
    steps,
    ensureDraft,
  } = useCVBuilder();

  // 3-tab coach hub: Aria (chat/build-with) · CV Health (live completeness) · Role
  // Match (JD keyword coverage). Aria keeps today's content; Chunk C reworks it.
  const [coachTab, setCoachTab] = useState('aria'); // 'aria' | 'health' | 'match'

  // Aria's Role Brief — seeded from cvData, else fetched once (for Role Match + Aria
  // context). No target JD → stays null and Role Match shows its empty state.
  const [brief, setBrief] = useState(cvData.targetJob?.brief || null);
  useEffect(() => {
    if (brief || !(cvData.targetJob?.description || '').trim()) return;
    let off = false;
    CVService.getBrief(draftId, cvData?.studioModelId)
      .then((r) => {
        if (!off) setBrief(r?.brief || null);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reduce = useReducedMotion();

  // Live, deterministic Role Match (free). health is computed above.
  const match = useMemo(() => roleMatch(brief, cvData), [brief, cvData]);
  const hasJd = !!(cvData.targetJob?.description || '').trim();

  // "Ask Aria" on a role focuses it — snap to the Aria tab so the build-with flow
  // is visible even if the student was reading CV Health or Role Match.
  useEffect(() => {
    if (focusedEntry) setCoachTab('aria');
  }, [focusedEntry]);

  const isPaidHint = user?.plan === 'paid';

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* 3-tab hub switch — Aria (chat) · CV Health (live score) · Role Match
          (JD coverage). Compact single-line pill + a Preview control at the end. */}
      <div className="shrink-0 px-4 pt-3">
        <div className="flex items-center gap-2">
          {/* the 3-tab segmented pill — now single-line + compact, takes the remaining width */}
          <div className="flex-1 flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
            {[
              { key: 'aria', label: 'Aria', sub: t('cvBuilder.atsCoach.tabAriaSub') },
              { key: 'health', label: t('cvBuilder.atsCoach.cvHealth'), sub: `${health.score}` },
              {
                key: 'match',
                label: t('cvBuilder.atsCoach.roleMatchShort'),
                sub: match
                  ? `${match.coverage}%`
                  : hasJd
                    ? '—'
                    : t('cvBuilder.atsCoach.addJdShort'),
              },
            ].map((tab) => {
              const active = coachTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCoachTab(tab.key)}
                  className={`flex-1 min-w-0 whitespace-nowrap overflow-hidden rounded-lg px-2 py-1.5 flex items-center justify-center gap-1.5 transition-colors ${
                    active
                      ? 'bg-white dark:bg-slate-900 shadow-sm'
                      : 'hover:bg-white/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <span
                    className={`truncate text-[11px] font-bold ${
                      active
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                  <span
                    className={`truncate shrink-0 font-mono text-[8px] uppercase tracking-wide tabular-nums ${
                      active
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {tab.sub}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Preview — a control at the END of the row, NOT a tab. Uses the existing onShowPreview. */}
          {onShowPreview && (
            <button
              type="button"
              onClick={onShowPreview}
              title={t('cvBuilder.atsCoach.previewCv')}
              className="shrink-0 w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Aria pane (chat / build-with) — today's coach content unchanged ─── */}
      {coachTab === 'aria' && (
        <div className={`flex-1 min-h-0 flex flex-col aria-theme-${chatTheme}`}>
          {/* Focus MODE header — Aria is locked onto a specific role/project (bound via
              "Ask Aria" from Work History / Projects). Pinned, with an ink left-accent
              to read as an active mode + a labeled Exit; height-collapses away on clear. */}
          <AnimatePresence>
            {focusedEntry && (
              <motion.div
                key="focus-mode"
                initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
                className="shrink-0 overflow-hidden"
              >
                <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 border-l-2 border-l-slate-900 dark:border-l-slate-100 px-3 py-2">
                  <AriaOrbit size={16} />
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] font-bold text-slate-900 dark:text-slate-100">
                    {t('cvBuilder.common.focus')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px]">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {focusedEntry.title}
                    </span>
                    {focusedEntry.company ? (
                      <span className="text-slate-400 dark:text-slate-500">
                        {' '}
                        · {focusedEntry.company}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={onClearFocus}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    {t('cvBuilder.atsCoach.exit')}{' '}
                    <span className="text-[10px] leading-none">✕</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ONE persistent per-section chat. The wrapper is keyed by currentStepId
              ONLY — changing STEP reseeds that section's thread, but focusing a role
              ("Ask Aria") does NOT remount, so the conversation survives. History &
              Projects use the unified build-with chat (focus optional); other steps
              use the general AriaChat; the Target step keeps its one-time JD capture. */}
          <AnimatePresence mode="wait">
            {/* Opacity-only cross-fade on step change — NEVER scale the whole panel. */}
            <motion.div
              key={currentStepId || 'intro'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 flex flex-col"
            >
              {currentStepId === 'target_job' ? (
                // The Target step captures the job through an inline form Aria conjures
                // and returns an editable summary card. Skip choice persists in coachState.
                <TargetChat
                  cvData={cvData}
                  updateCvData={updateCvData}
                  draftId={draftId}
                  ensureDraft={ensureDraft}
                  skipped={!!aiByStep._targetSkipped}
                  onSkip={() => setAiByStep((m) => ({ ...m, _targetSkipped: true }))}
                  onAdvance={() => {
                    const idx = steps.findIndex((s) => s.id === currentStepId);
                    if (idx >= 0 && idx < steps.length - 1) goToStep(idx + 1);
                  }}
                  ack={aiByStep._targetAck}
                  setAck={(v) => setAiByStep((m) => ({ ...m, _targetAck: v }))}
                  careerStage={cvData?.careerStage}
                  onPickCareerStage={async (stage) => {
                    updateCvData({ careerStage: stage });
                    setAiByStep((m) => ({ ...m, _careerStage: stage }));
                    try {
                      const id = await ensureDraft();
                      if (!id) throw new Error('draft unavailable');
                      await CVService.saveDraft({ _id: id, careerStage: stage });
                      updateCvData({ careerStage: stage });
                    } catch (error) {
                      updateCvData({ careerStage: '' });
                      setAiByStep((m) => ({ ...m, _careerStage: '' }));
                      throw error;
                    }
                  }}
                />
              ) : currentStepId === 'history' || currentStepId === 'projects' ? (
                // The unified build-with chat — general Q&A + focused build-with in ONE
                // persistent thread. Does NOT remount on focus (thread survives).
                <AskAriaGenerate
                  currentStepId={currentStepId}
                  focusedEntry={focusedEntry}
                  cvData={cvData}
                  updateCvData={updateCvData}
                  draftId={draftId}
                  ensureDraft={ensureDraft}
                  applyRoleBulletDiff={applyRoleBulletDiff}
                  aiByStep={aiByStep}
                  setAiByStep={setAiByStep}
                  isPaid={isPaidHint}
                  onClearFocus={onClearFocus}
                />
              ) : (
                // The general Aria chat on every other step.
                <AriaChat
                  draftId={draftId}
                  currentStepId={currentStepId}
                  cvData={cvData}
                  updateCvData={updateCvData}
                  ensureDraft={ensureDraft}
                  applySummary={applySummary}
                  applySkills={applySkills}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* ─── CV Health pane — live completeness score + section checklist ─── */}
      {coachTab === 'health' && (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-4 space-y-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={health.score} size={72} />
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {t('cvBuilder.atsCoach.cvHealth')}
              </p>
              <p className="font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
                {health.score >= 85
                  ? t('cvBuilder.atsCoach.healthStandout')
                  : health.score >= 70
                    ? t('cvBuilder.atsCoach.healthGettingStrong')
                    : health.score >= 50
                      ? t('cvBuilder.atsCoach.healthComingTogether')
                      : t('cvBuilder.atsCoach.healthJustStarting')}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {health.sections.map((s) => {
              const done = s.status === 'complete';
              const unmet = (s.requirements || []).find((r) => !r.met)?.label;
              return (
                <div
                  key={s.id}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      done
                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {done ? '✓' : '!'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                      {s.title}
                    </p>
                    {!done && unmet && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {unmet}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Role Match pane — deterministic JD keyword coverage ─── */}
      {coachTab === 'match' && (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-4">
          {!hasJd ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
              <span className="text-3xl">🎯</span>
              <p className="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                {t('cvBuilder.atsCoach.noJobYet')}
              </p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                {t('cvBuilder.atsCoach.noJobBody')}
              </p>
              <button
                type="button"
                onClick={() => {
                  const i = (steps || []).findIndex((s) => s.id === 'target_job');
                  if (i >= 0) goToStep?.(i);
                }}
                className="btn-primary px-4 py-2 text-sm"
              >
                {t('cvBuilder.atsCoach.addJd')}
              </button>
            </div>
          ) : !match ? (
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              {t('cvBuilder.atsCoach.readingJob')}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={match.coverage} size={72} />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {t('cvBuilder.atsCoach.roleMatch')}
                  </p>
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {[match.role, match.company]
                      .filter(Boolean)
                      .join(` ${t('cvBuilder.common.at')} `) ||
                      t('cvBuilder.atsCoach.yourTargetRole')}
                  </p>
                </div>
              </div>

              {match.matched.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400 mb-1.5">
                    {t('cvBuilder.atsCoach.matched')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.matched.map((k) => (
                      <span
                        key={k}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {match.missing.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400 mb-1.5">
                    {t('cvBuilder.atsCoach.missing')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.missing.map((k) => (
                      <span
                        key={k}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ATSCoachPanel;
