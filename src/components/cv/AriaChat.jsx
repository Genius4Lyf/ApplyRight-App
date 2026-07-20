import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { getStepCoaching } from '../../utils/cvCoach';
import { suggestionsFor } from '../../lib/coachSuggestions';
import { bubbleAnim, portalCard } from '../../lib/ariaMotion';
import { CREDIT_COSTS } from '../../lib/credits';
import { useStickToBottom } from '../../hooks/useStickToBottom';
import CVService from '../../services/cv.service';
import ChatThemePicker from './ChatThemePicker';
import AriaOrbit from './AriaOrbit';
import AriaThinking from './AriaThinking';
import ResearchCard from './ResearchCard';
import SkillsCard from './SkillsCard';

// Career-stage chips for the in-chat summary flow. `k` maps 1:1 to the backend
// stage enum ('grad'|'experienced'|'changer').
const SUMMARY_STAGES = [
  { k: 'grad', label: 'Student / recent grad' },
  { k: 'experienced', label: 'Experienced' },
  { k: 'changer', label: 'Changing careers' },
];

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
  const reduce = useReducedMotion();
  // The opening is ALWAYS regenerated (never stored), so state-aware coaching stays
  // current; only the Q&A after it is persisted per step — ON the draft
  // (cvData.coachChats), so it survives navigation, refresh, and other devices.
  const opening = getStepCoaching(currentStepId, cvData).message;
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

  // In-chat summary flow (SUMMARY step only). The phase cards are rendered from state
  // (NOT stored in `messages`), so they never persist — only the final "Added ✓" is a
  // real message. Mirrors AskAriaGenerate's orbit-portal pattern.
  const isSummary = currentStepId === 'summary';
  const [sPhase, setSPhase] = useState('idle'); // 'idle'|'stage'|'generating'|'card'
  const [sText, setSText] = useState('');
  const [sStage, setSStage] = useState(null);
  const summaryCost = CREDIT_COSTS.GENERATE_SUMMARY ?? 3;
  const [sCost, setSCost] = useState(summaryCost); // display fallback; overwritten by response.cost

  // In-chat skills flow (SKILLS step only). Empty-state gated, grouped card, and a
  // PERSISTED record (who:'skillsRecord' round-trips so re-opening shows the same
  // generation — no re-charge — with already-added skills marked "on CV").
  const isSkills = currentStepId === 'skills';
  const hasContent = (cvData?.experience?.length || 0) > 0 || (cvData?.projects?.length || 0) > 0;
  const skillsCost = CREDIT_COSTS.GENERATE_SKILLS ?? 10;
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
  // once, and it doesn't dismiss the starter chips. The marker persists on the draft
  // (the persist filter keeps it) and is ignored by /coach/ask (only q is sent).
  const injectResearch = () => {
    if (thinking) return;
    setThinking(true);
    setTimeout(() => {
      setMessages((m) =>
        m.some((x) => x.who === 'research') ? m : [...m, { who: 'research', section: currentStepId }]
      );
      setThinking(false);
    }, 900);
  };

  // Draft a summary for the chosen career stage — a credited generation (each call,
  // including a re-roll, charges GENERATE_SUMMARY). The result lands as an inline card
  // (sPhase 'card'); "Use it" writes it into the ProfessionalSummary textarea.
  const generateSummary = async (stage) => {
    setSStage(stage);
    setSPhase('generating');
    try {
      const id = draftId && draftId !== 'new' ? draftId : await ensureDraft();
      if (!id) {
        setSPhase('idle');
        setMessages((m) => [
          ...m,
          { who: 'aria', text: "Hmm — I couldn't get your CV set up. Refresh and try again." },
        ]);
        return;
      }
      const r = await CVService.coachSummary({ draftId: id, stage });
      setSText(r.summary);
      setSCost(r.cost ?? sCost);
      setSPhase('card');
    } catch (e) {
      setSPhase('idle');
      if (e?.response?.status === 403 || e?.response?.status === 402) {
        setMessages((m) => [
          ...m,
          {
            who: 'aria',
            text: `You're out of credits for this — a summary draft is ${sCost} credits. Earn more or upgrade, then try again.`,
          },
        ]);
      } else {
        toast.error("Couldn't draft that — try again.");
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
        setMessages((m) => [
          ...m,
          { who: 'aria', text: "Hmm — I couldn't get your CV set up. Refresh and try again." },
        ]);
        return;
      }
      const r = await CVService.generateSkills(
        cvData.education,
        cvData.experience,
        cvData.projects,
        cvData.targetJob?.description,
        id
      );
      setSkData({ suggestions: r.suggestions || [], bestForRole: r.bestForRole || [] });
      setSkSel([]);
      setSkPhase('card');
    } catch (e) {
      setSkPhase('idle');
      if ([402, 403].includes(e?.response?.status)) {
        setMessages((m) => [
          ...m,
          {
            who: 'aria',
            text: `Finding your skills costs ${skillsCost} credits and you're short right now. Earn more or upgrade, then try again.`,
          },
        ]);
      } else {
        toast.error("Couldn't pull your skills — try again.");
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
      setMessages((m) => [
        ...m,
        { who: 'aria', text: "Hmm — I couldn't get your CV set up. Refresh and try again." },
      ]);
      setThinking(false);
      return;
    }
    try {
      const r = await CVService.askAria(id, currentStepId, q);
      setMessages((m) => [...m, { who: 'aria', text: r.answer }]);
      setFreeLeft(r.freeRemaining);
      if (r.freeRemaining === 0 && !capNoted) {
        // One-time "offer to continue on credits" note.
        setCapNoted(true);
        setMessages((m) => [
          ...m,
          {
            who: 'aria',
            text: "That's your 10 free chats for today 🙂 We can keep going — 1 credit each — or come back tomorrow, it resets.",
          },
        ]);
      }
    } catch (e) {
      if (e?.response?.data?.code === 'CHAT_LIMIT_REACHED') {
        setMessages((m) => [
          ...m,
          {
            who: 'aria',
            text: "You're out of free chats and credits for today — earn a few (watch an ad / refer a friend) or come back tomorrow. I'll still help you write bullets on a role anytime.",
          },
        ]);
      } else {
        toast.error("Couldn't reach me just now — try again.");
      }
    } finally {
      setThinking(false);
    }
  };

  const freeLine =
    freeLeft == null
      ? ''
      : freeLeft > 0
        ? `${freeLeft} free chats left today`
        : 'Free chats done today · 1 credit each';

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 p-4">
      {/* Conversation — bottom-anchored, absolute scroll layer so it can only scroll,
          never stretch the fixed frame. */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto scrollbar-none flex flex-col gap-2.5"
        >
          {messages.map((m, i) => {
            if (m.who === 'research') return <ResearchCard key={i} section={m.section} />;
            // Durable skills record — persisted, re-opens the SAME generation (no
            // re-charge) with already-added skills marked "on CV".
            if (m.who === 'skillsRecord') {
              return (
                <motion.div
                  key={i}
                  className="self-start max-w-[92%] flex items-start gap-2"
                  {...bubbleAnim('aria', reduce)}
                >
                  <AriaOrbit size={16} className="mt-2" />
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
                        Added {m.n} skill{m.n === 1 ? '' : 's'} to your CV
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Tap to review
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
                className="self-start max-w-[92%] flex items-start gap-2"
                {...bubbleAnim('aria', reduce)}
              >
                <AriaOrbit size={16} className="mt-2" />
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] leading-relaxed">
                  {m.text}
                </span>
              </motion.div>
            );
          })}

          {/* Ready-made questions — shown under the opening until the first send. */}
          {showChips && (
            <div className="flex flex-wrap gap-1.5">
              {suggestionsFor(currentStepId).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => send(chip)}
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
                📖 What research says
              </button>
              {/* Summary step: kick off Aria's in-chat, credited summary draft. */}
              {isSummary && sPhase === 'idle' && (
                <button
                  type="button"
                  onClick={() => setSPhase('stage')}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                >
                  ✍️ Draft my summary · {sCost} cr
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
                  🧰 Find my skills · {skillsCost} cr
                </button>
              )}
            </div>
          )}

          {/* Skills empty-state: no work history/projects to ground skills → coach the
              user to add one first, instead of offering the (ungroundable) generation. */}
          {isSkills && skPhase === 'idle' && !hasContent && (
            <div className="self-start max-w-[92%] flex items-start gap-2">
              <AriaOrbit size={16} className="mt-2" />
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] leading-relaxed">
                Add a role or project first — then I'll find skills you can actually back up.
              </span>
            </div>
          )}

          {/* ── In-chat summary flow (orbit-portal cards, rendered from state — never
                persisted). Stage picker → generating beat → the draft card. ── */}
          <AnimatePresence>
            {isSummary && sPhase === 'stage' && (
              <motion.div
                key="s-stage"
                className="self-start max-w-[92%] flex items-start gap-2"
                {...portalCard(reduce)}
              >
                <AriaOrbit size={16} className="mt-2" />
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 flex flex-col gap-2.5">
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                    Quick one — where are you in your career? I'll write it the way that fits.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUMMARY_STAGES.map((s) => (
                      <button
                        key={s.k}
                        type="button"
                        onClick={() => generateSummary(s.k)}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {isSummary && sPhase === 'generating' && (
              <motion.div key="s-gen" {...portalCard(reduce)}>
                <AriaThinking variant="draft" />
              </motion.div>
            )}

            {isSummary && sPhase === 'card' && (
              <motion.div
                key="s-card"
                className="self-start max-w-[94%] flex items-start gap-2"
                {...portalCard(reduce)}
              >
                <AriaOrbit size={16} className="mt-2" />
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-l-2 border-l-indigo-400 dark:border-l-indigo-500 bg-white dark:bg-slate-900/60 p-3.5 flex flex-col gap-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                    Your summary
                  </span>
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                    {sText}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await applySummary?.(sText);
                        setSPhase('idle');
                        setMessages((m) => [
                          ...m,
                          {
                            who: 'aria',
                            text: 'Added it to your summary ✓ — edit any word to make it yours.',
                          },
                        ]);
                      }}
                      className="text-xs font-semibold px-4 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                    >
                      Use it
                    </button>
                    <button
                      type="button"
                      onClick={() => generateSummary(sStage)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      ↻ Re-roll · {sCost} cr
                    </button>
                    <button
                      type="button"
                      onClick={() => setSPhase('stage')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Different stage
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
                className="self-start max-w-[92%] flex items-start gap-2"
                {...portalCard(reduce)}
              >
                <AriaOrbit size={16} className="mt-2" />
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 flex flex-col gap-2.5">
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                    I'll read your work history + projects and pull hard skills you can back up. This
                    uses {skillsCost} credits.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={generateSkills}
                      className="text-xs font-semibold px-4 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                    >
                      Find them · {skillsCost} cr
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkPhase('idle')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Not now
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
                className="self-start w-full max-w-[96%] flex items-start gap-2"
                {...portalCard(reduce)}
              >
                <AriaOrbit size={16} className="mt-2" />
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
              label={creatingDraft ? 'Setting up your CV draft…' : undefined}
            />
          )}
        </div>
      </div>

      {/* Docked input row. */}
      <div className="shrink-0">
        {freeLine && (
          <p className="mb-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {freeLine}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={(e) => {
              e.currentTarget.style.height = 'auto';
              e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask Aria anything…"
            className="flex-1 resize-none rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-5 py-2.5 text-[13px] leading-relaxed outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors scrollbar-none max-h-[140px]"
          />
          <ChatThemePicker />
          <button
            type="button"
            onClick={() => send()}
            disabled={thinking || input.trim().length < 2}
            aria-label="Send"
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-800 dark:text-white ring-1 ring-transparent dark:ring-indigo-500/30 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AriaChat;
