import React, { useState, useRef, useEffect } from 'react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getStepCoaching } from '../../utils/cvCoach';
import { suggestionsFor } from '../../lib/coachSuggestions';
import { bubbleAnim, portalCard } from '../../lib/ariaMotion';
import { tierOf, costForActionTier } from '../../lib/models';
import { useStickToBottom } from '../../hooks/useStickToBottom';
import { useAriaModel } from '../../hooks/useAriaModel';
import { useGenerationModel } from '../../hooks/useGenerationModel';
import CVService from '../../services/cv.service';
import AriaComposer from './AriaComposer';
import AriaOrbit from './AriaOrbit';
import AriaThinking from './AriaThinking';
import ResearchCard from './ResearchCard';
import SkillsCard from './SkillsCard';
import GenerationModelRow from './GenerationModelRow';

// The persistent Aria chat — replaces the old scripted CoachCard on every non-target
// step. Opens with the step's coaching line, offers ready-made suggestion chips, and
// keeps an always-docked input wired to /coach/ask (10/day free, then 1 credit each).
// Parent keys this by currentStepId, so it remounts per step → seeds THIS step's saved
// Q&A (from cvData.coachChats on the draft) beneath a freshly-regenerated opening. Each
// section keeps its own chat; nothing accumulates across steps.
const AriaChat = ({
  draftId,
  currentStepId,
  cvData,
  updateCvData,
  ensureDraft,
  applySummary,
  applySkills,
}) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  // The opening is ALWAYS regenerated (never stored), so state-aware coaching stays
  // current; only the Q&A after it is persisted per step — ON the draft
  // (cvData.coachChats), so it survives navigation, refresh, and other devices.
  const opening = getStepCoaching(t, currentStepId, cvData).message;
  const savedQA = cvData?.coachChats?.[currentStepId] || [];

  const [messages, setMessages] = useState([
    { who: 'aria', text: opening, _opening: true },
    ...savedQA,
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [freeLeft, setFreeLeft] = useState(null);
  const [showChips, setShowChips] = useState(savedQA.length === 0);
  const [capNoted, setCapNoted] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false); // ensureDraft in-flight → pin "Setting up…"

  // The Aria CHAT model for this CV — same per-draft choice the Studio shows.
  const { modelId, selectModel } = useAriaModel({ draftId, cvData, updateCvData });
  // The GENERATION model — independent of the chat model above. A per-user
  // localStorage preference, defaulting to whatever the chat model is.
  const { genModelId, setGenModelId } = useGenerationModel(modelId);

  // In-chat summary flow (SUMMARY step only). The phase cards are rendered from state
  // (NOT stored in `messages`), so they never persist — only the final "Added ✓" is a
  // real message. Mirrors AskAriaGenerate's orbit-portal pattern.
  const isSummary = currentStepId === 'summary';
  const [sPhase, setSPhase] = useState('idle'); // 'idle'|'generating'|'card'
  const [sText, setSText] = useState('');
  const [sStage, setSStage] = useState(null);
  // Priced at the GENERATION model's tier, not the chat model's. Derived, not state — a
  // useState snapshot here would go stale the moment the user switches tiers mid-flow.
  const summaryCost = costForActionTier('GENERATE_SUMMARY', tierOf(genModelId)) ?? 3;

  // In-chat skills flow (SKILLS step only). Empty-state gated, grouped card, and a
  // PERSISTED record (who:'skillsRecord' round-trips so re-opening shows the same
  // generation — no re-charge — with already-added skills marked "on CV").
  const isSkills = currentStepId === 'skills';
  const hasContent = (cvData?.experience?.length || 0) > 0 || (cvData?.projects?.length || 0) > 0;
  const skillsCost = costForActionTier('GENERATE_SKILLS', tierOf(genModelId)) ?? 10;
  const [skPhase, setSkPhase] = useState('idle'); // 'idle'|'consent'|'generating'|'card'
  const [skData, setSkData] = useState(null); // { suggestions, bestForRole }
  const [skSel, setSkSel] = useState([]); // initialSelected for a re-opened record

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  useStickToBottom(scrollRef, [messages, thinking, sPhase, skPhase], reduce);

  // Persist just this step's Q&A (never the regenerated opening) to the draft, so
  // returning to the section — even after a refresh or on another device — restores
  // exactly what was said here. Pass ONLY this step's key — updateCvData deep-merges
  // functionally off the latest state, so it can't clobber another section's thread.
  useEffect(() => {
    updateCvData({
      coachChats: {
        [currentStepId]: messages.filter((x) => !x._opening),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Drop the "what research says" lecture card into the thread — no AI call, added
  // once, and dismisses the starter chips like a real question would. The marker
  // persists on the draft (the persist filter keeps it) and is ignored by /coach/ask
  // (only q is sent).
  const injectResearch = () => {
    if (thinking) return;
    setShowChips(false);
    setThinking(true);
    setTimeout(() => {
      setMessages((m) =>
        m.some((x) => x.who === 'research')
          ? m
          : [...m, { who: 'research', section: currentStepId }]
      );
      setThinking(false);
    }, 900);
  };

  // Draft a summary using the CV-wide career stage captured at builder entry. Each call,
  // including a re-roll, charges GENERATE_SUMMARY). The result lands as an inline card
  // (sPhase 'card'); "Use it" writes it into the ProfessionalSummary textarea.
  const generateSummary = async (stage) => {
    setSStage(stage);
    setSPhase('generating');
    try {
      const id = draftId && draftId !== 'new' ? draftId : await ensureDraft();
      if (!id) {
        setSPhase('idle');
        setMessages((m) => [...m, { who: 'aria', text: t('cvBuilder.common.couldntSetup') }]);
        return;
      }
      const r = await CVService.coachSummary({ draftId: id, stage, model: genModelId });
      setSText(r.summary);
      setSPhase('card');
    } catch (e) {
      setSPhase('idle');
      if (e?.response?.status === 403 || e?.response?.status === 402) {
        setMessages((m) => [
          ...m,
          { who: 'aria', text: t('cvBuilder.ariaChat.outOfSummaryCredits', { n: summaryCost }) },
        ]);
      } else {
        toast.error(t('cvBuilder.ariaChat.couldntDraft'));
      }
    }
  };

  // Pull hard skills from the CV's work history + projects — a credited generation
  // (skillsGenCache avoids a double-charge on the same profile). Lands as a grouped
  // card; picks flow into the CV via applySkills.
  const generateSkills = async () => {
    setSkPhase('generating');
    try {
      const id = draftId === 'new' ? await ensureDraft() : draftId;
      if (!id) {
        setSkPhase('idle');
        setMessages((m) => [...m, { who: 'aria', text: t('cvBuilder.common.couldntSetup') }]);
        return;
      }
      const r = await CVService.generateSkills(
        cvData.education,
        cvData.experience,
        cvData.projects,
        cvData.targetJob?.description,
        id,
        genModelId
      );
      setSkData({ suggestions: r.suggestions || [], bestForRole: r.bestForRole || [] });
      setSkSel([]);
      setSkPhase('card');
    } catch (e) {
      setSkPhase('idle');
      if ([402, 403].includes(e?.response?.status)) {
        setMessages((m) => [
          ...m,
          { who: 'aria', text: t('cvBuilder.ariaChat.skillsShort', { n: skillsCost }) },
        ]);
      } else {
        toast.error(t('cvBuilder.ariaChat.couldntPullSkills'));
      }
    }
  };

  const handleAddSkills = async (picked) => {
    const res = await applySkills?.(picked);
    const added = (picked || []).map((p) => p.name);
    setMessages((m) => [
      ...m.filter((x) => x.who !== 'skillsRecord'), // one live record per section
      {
        who: 'skillsRecord',
        suggestions: skData?.suggestions || [],
        bestForRole: skData?.bestForRole || [],
        added: [...new Set([...(skSel || []), ...added])],
        n: res?.added ?? added.length,
      },
    ]);
    setSkPhase('idle');
  };

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    setMessages((m) => [...m, { who: 'user', text: q }]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setShowChips(false);
    setThinking(true);
    // Actively CREATE the draft on demand (shared with builder-entry, no duplicate)
    // and use its real id — so an eager click the instant the builder opens works.
    // While it's creating, the working indicator reads "Setting up your CV draft…".
    const needsCreate = !draftId || draftId === 'new';
    if (needsCreate) setCreatingDraft(true);
    const id = await ensureDraft();
    setCreatingDraft(false);
    if (!id) {
      setMessages((m) => [...m, { who: 'aria', text: t('cvBuilder.common.couldntSetup') }]);
      setThinking(false);
      return;
    }
    try {
      const r = await CVService.askAria(id, currentStepId, q, modelId);
      setMessages((m) => [...m, { who: 'aria', text: r.answer }]);
      setFreeLeft(r.freeRemaining);
      // Metered turn (flagship, or past the daily free pool) → refresh the wallet pill.
      if (r.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: r.remainingCredits }));
      }
      if (r.freeRemaining === 0 && !capNoted) {
        // One-time "offer to continue on credits" note.
        setCapNoted(true);
        setMessages((m) => [...m, { who: 'aria', text: t('cvBuilder.ariaChat.tenFreeChats') }]);
      }
    } catch (e) {
      if (e?.response?.data?.code === 'CHAT_LIMIT_REACHED') {
        setMessages((m) => [...m, { who: 'aria', text: t('cvBuilder.ariaChat.outOfChats') }]);
      } else {
        toast.error(t('cvBuilder.common.couldntReach'));
      }
    } finally {
      setThinking(false);
    }
  };

  const freeLine =
    freeLeft == null
      ? ''
      : freeLeft > 0
        ? t('cvBuilder.common.freeChatsLeft', { n: freeLeft })
        : t('cvBuilder.common.freeChatsDone');

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 p-4">
      {/* Conversation — bottom-anchored, absolute scroll layer so it can only scroll,
          never stretch the fixed frame. */}
      <div className="flex-1 min-h-0 relative">
        <div ref={scrollRef} className="absolute inset-0 chat-scroll flex flex-col gap-2.5">
          {messages.map((m, i) => {
            if (m.who === 'research') return <ResearchCard key={i} section={m.section} />;
            // Durable skills record — persisted, re-opens the SAME generation (no
            // re-charge) with already-added skills marked "on CV".
            if (m.who === 'skillsRecord') {
              return (
                <motion.div
                  key={i}
                  className="aria-row self-start max-w-[92%] flex items-start gap-2"
                  {...bubbleAnim('aria', reduce)}
                >
                  <AriaOrbit size={16} className="aria-mark mt-2" />
                  <button
                    type="button"
                    onClick={() => {
                      setSkData({ suggestions: m.suggestions, bestForRole: m.bestForRole });
                      setSkSel(m.added || []);
                      setSkPhase('card');
                    }}
                    className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 border-l-2 border-l-emerald-400 dark:border-l-emerald-500 bg-slate-50 dark:bg-slate-800/40 p-3 flex items-center gap-2.5"
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[13px] font-bold">
                      ✓
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                        {t('cvBuilder.ariaChat.addedSkills', { count: m.n })}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        {t('cvBuilder.ariaChat.tapToReview')}
                      </span>
                    </span>
                    <span className="shrink-0 text-slate-400 dark:text-slate-500 text-lg leading-none">
                      ›
                    </span>
                  </button>
                </motion.div>
              );
            }
            return m.who === 'user' ? (
              <motion.div
                key={i}
                className="self-end max-w-[92%] bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                {...bubbleAnim('user', reduce)}
              >
                {m.text}
              </motion.div>
            ) : (
              <motion.div
                key={i}
                className="aria-row self-start max-w-[92%] flex items-start gap-2"
                {...bubbleAnim('aria', reduce)}
              >
                <AriaOrbit size={16} className="aria-mark mt-2" />
                <span className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] leading-relaxed">
                  {m.text}
                </span>
              </motion.div>
            );
          })}

          {/* Ready-made questions — shown under the opening until the first send. */}
          {showChips && (
            <div className="flex flex-wrap gap-1.5 pl-6">
              {suggestionsFor(t, currentStepId).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => send(chip)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  {chip}
                </button>
              ))}
              <button
                type="button"
                onClick={injectResearch}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                📖 {t('cvBuilder.researchCard.whatResearchSays')}
              </button>
              {/* Summary step: kick off Aria's in-chat, credited summary draft. */}
              {isSummary && sPhase === 'idle' && (
                <button
                  type="button"
                  onClick={() => generateSummary(cvData?.careerStage)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                >
                  {t('cvBuilder.ariaChat.draftSummaryChip', { n: summaryCost })}
                </button>
              )}
              {/* Skills step: kick off Aria's in-chat skills search — only with content
                  to ground it (a role or project); otherwise a coaching line, no chip. */}
              {isSkills && skPhase === 'idle' && hasContent && (
                <button
                  type="button"
                  onClick={() => setSkPhase('consent')}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                >
                  {t('cvBuilder.ariaChat.findSkillsChip', { n: skillsCost })}
                </button>
              )}
            </div>
          )}

          {/* Skills empty-state: no work history/projects to ground skills → coach the
              user to add one first, instead of offering the (ungroundable) generation. */}
          {isSkills && skPhase === 'idle' && !hasContent && (
            <div className="aria-row self-start max-w-[92%] flex items-start gap-2">
              <AriaOrbit size={16} className="aria-mark mt-2" />
              <span className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] leading-relaxed">
                {t('cvBuilder.ariaChat.skillsEmpty')}
              </span>
            </div>
          )}

          {/* ── In-chat summary flow (orbit-portal cards, rendered from state — never
                persisted). The CV-wide stage is reused automatically. ── */}
          <AnimatePresence>
            {isSummary && sPhase === 'generating' && (
              <motion.div key="s-gen" {...portalCard(reduce)}>
                <AriaThinking variant="draft" />
              </motion.div>
            )}

            {isSummary && sPhase === 'card' && (
              <motion.div
                key="s-card"
                className="aria-row self-start max-w-[94%] flex items-start gap-2"
                {...portalCard(reduce)}
              >
                <AriaOrbit size={16} className="aria-mark mt-2" />
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-l-2 border-l-indigo-400 dark:border-l-indigo-500 bg-white dark:bg-slate-900/60 p-3.5 flex flex-col gap-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                    {t('cvBuilder.ariaChat.yourSummary')}
                  </span>
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                    {sText}
                  </p>
                  <GenerationModelRow
                    action="summary"
                    value={genModelId}
                    onSelect={setGenModelId}
                    chatTier={tierOf(modelId)}
                    unit="flat"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await applySummary?.(sText);
                        setSPhase('idle');
                        setMessages((m) => [
                          ...m,
                          { who: 'aria', text: t('cvBuilder.ariaChat.summaryApplied') },
                        ]);
                      }}
                      className="text-xs font-semibold px-4 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                    >
                      {t('cvBuilder.ariaChat.useIt')}
                    </button>
                    <button
                      type="button"
                      onClick={() => generateSummary(sStage)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {t('cvBuilder.ariaChat.reroll', { n: summaryCost })}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── In-chat skills flow (orbit-portal cards from state — never persisted;
                only the "✓ Added" record is a real, durable message). ── */}
          <AnimatePresence>
            {isSkills && skPhase === 'consent' && (
              <motion.div
                key="sk-consent"
                className="aria-row self-start max-w-[92%] flex items-start gap-2"
                {...portalCard(reduce)}
              >
                <AriaOrbit size={16} className="aria-mark mt-2" />
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 flex flex-col gap-2.5">
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                    {t('cvBuilder.ariaChat.skillsConsent', { n: skillsCost })}
                  </p>
                  <GenerationModelRow
                    action="skills"
                    value={genModelId}
                    onSelect={setGenModelId}
                    chatTier={tierOf(modelId)}
                    unit="flat"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={generateSkills}
                      className="text-xs font-semibold px-4 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                    >
                      {t('cvBuilder.ariaChat.findThem', { n: skillsCost })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkPhase('idle')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {t('cvBuilder.ariaChat.notNow')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {isSkills && skPhase === 'generating' && (
              <motion.div key="sk-gen" {...portalCard(reduce)}>
                <AriaThinking variant="draft" />
              </motion.div>
            )}

            {isSkills && skPhase === 'card' && skData && (
              <motion.div
                key="sk-card"
                className="aria-row self-start w-full max-w-[96%] flex items-start gap-2"
                {...portalCard(reduce)}
              >
                <AriaOrbit size={16} className="aria-mark mt-2" />
                <div className="min-w-0 flex-1">
                  <SkillsCard
                    suggestions={skData.suggestions}
                    bestForRole={skData.bestForRole}
                    existingSkills={(cvData.skills || []).map((s) =>
                      typeof s === 'string' ? s : s.name
                    )}
                    initialSelected={skSel}
                    onAdd={handleAddSkills}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {thinking && (
            <AriaThinking
              variant="chat"
              label={creatingDraft ? t('cvBuilder.common.settingUp') : undefined}
            />
          )}
        </div>
      </div>

      {/* Docked composer — shared with every other Aria surface. */}
      <AriaComposer
        className="shrink-0"
        inputRef={inputRef}
        value={input}
        onChange={setInput}
        onSend={send}
        busy={thinking}
        modelId={modelId}
        onSelectModel={selectModel}
        note={
          freeLine ? (
            <p className="mb-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {freeLine}
            </p>
          ) : null
        }
      />
    </div>
  );
};

export default AriaChat;
