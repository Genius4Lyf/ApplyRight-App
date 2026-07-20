import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { bubbleAnim, portalCard } from '../../lib/ariaMotion';
import { CREDIT_COSTS } from '../../lib/credits';
import CVService from '../../services/cv.service';
import { getStepCoaching } from '../../utils/cvCoach';
import { suggestionsFor } from '../../lib/coachSuggestions';
import { useStickToBottom } from '../../hooks/useStickToBottom';
import ChatThemePicker from './ChatThemePicker';
import AriaOrbit from './AriaOrbit';
import AriaThinking from './AriaThinking';
import ResearchCard from './ResearchCard';

// Human-facing labels for the inferred company type (the enum lives in the backend
// Role Brief). Drives the infer+confirm chip on the "Aria's read" strip.
const COMPANY_TYPE_LABELS = {
  startup: 'Startup',
  enterprise: 'Big company',
  agency: 'Agency',
  nonprofit: 'Nonprofit',
  government: 'Public sector',
  smb: 'Small business',
};

// Aria's generation spine (Chunk 5a–5c): chat (free build-with mini-interview) →
// [consent, free only] → choose count → generate → review (+ free re-roll) → apply
// (emerald confirm) → follow-up loop. Rendered in the coach body when a role/project
// is focused ("Ask Aria"). The conversation is deterministic + FREE — only the final
// generation is credited. Paid subscribers skip the consent gate.
const AskAriaGenerate = ({
  focusedEntry,
  currentStepId,
  cvData,
  updateCvData,
  draftId,
  ensureDraft,
  applyRoleBulletDiff,
  aiByStep,
  setAiByStep,
  isPaid,
  onClearFocus,
}) => {
  const reduce = useReducedMotion();

  const focused = !!focusedEntry;
  const isProject = focusedEntry?.section === 'project';

  // Section-aware recommended count + per-bullet cost (shown before /auth/config
  // hydrates, thanks to the credits.js default).
  const REC = isProject ? 3 : 5;
  const per = CREDIT_COSTS.GENERATE_BULLET ?? 1;

  // Openers — general (per-step coaching) vs focused (role/project build-with).
  const generalOpener = getStepCoaching(currentStepId, cvData).message;
  const focusOpener = (e) =>
    e.section === 'project'
      ? `Let's turn ${e.title || 'this project'} into a strong entry. Quick one first — what kind of project is it?`
      : `Let's sharpen ${e.title || 'this role'}${e.company ? ` at ${e.company}` : ''}. Tell me one thing you actually did there.`;

  const [phase, setPhase] = useState('chat'); // 'chat'|'picking'|'consent'|'generating'|'results'
  const [description, setDescription] = useState('');
  const [count, setCount] = useState(REC);
  const [bullets, setBullets] = useState([]);
  // A live toggle record over the generated bullets (indices):
  //  appliedSet — which are currently IN the CV; selected — checked in the open card.
  const [appliedSet, setAppliedSet] = useState(new Set()); // in the CV
  const [selected, setSelected] = useState(new Set([0])); // checked (first pre-checked)
  const [opened, setOpened] = useState(false); // applied at least once
  const [applying, setApplying] = useState(false);
  const [wasFree, setWasFree] = useState(false); // last result was a free re-roll

  // Toggle state resets happen at the two NEW-generation points (generate/reroll) and
  // when focusing a fresh role — NOT off [bullets], so re-opening a persisted record
  // (which sets bullets from the marker) no longer wipes its applied selection.

  // ONE persistent per-section thread — general Q&A + focused build-with in the same
  // conversation (routed through /coach/chat). Seeded from the draft (cvData.coachChats),
  // so it survives step navigation, refresh, and other devices.
  const savedQA = cvData?.coachChats?.[currentStepId] || [];
  // Always lead with the (regenerated) opener — it's `_opening: true`, so the persist
  // effect strips it and it's never double-saved. The saved thread follows it.
  const [messages, setMessages] = useState([
    { who: 'aria', text: generalOpener, _opening: true },
    ...savedQA,
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false); // ensureDraft in-flight → pin "Setting up…"
  const [freeLeft, setFreeLeft] = useState(null);
  // Starter-question chips — only while this section chat is fresh (nothing said yet)
  // and unfocused. Any engagement (send, or focusing a role) drops them for good.
  const [showChips, setShowChips] = useState(savedQA.length === 0);
  // Role-aware answer scaffolds under Aria's build-with follow-up (from /coach/chat):
  // tap-to-start starters + a toggleable sample answer. Cleared on send, refreshed
  // with each new question.
  const [suggestions, setSuggestions] = useState([]);
  const [exampleAnswer, setExampleAnswer] = useState('');
  const [exampleOpen, setExampleOpen] = useState(false);
  // Aria's per-question lead-in over the scaffolds (e.g. "A number you might have:").
  const [suggestionsLabel, setSuggestionsLabel] = useState('');
  // For a focused PROJECT, ask the project type upfront (chips) before interviewing.
  // Dismissed once the user picks a chip OR types any answer; reset on focus change.
  const [projectTypePicked, setProjectTypePicked] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null); // the results card, so we can scroll its TOP into view
  const buildTurnsRef = useRef(0); // per-role build-with turn counter (backend turn cap)
  const builtEntryRef = useRef(null); // {section,sortId} the current bullets were built for — so Apply works after Exit
  const recordEntryRef = useRef(null); // {section,sortId,...} of a RE-OPENED record — so apply/reroll target its role
  // Keep the stream pinned to newest — messages, the thinking orbit, and the example
  // reveal. Phase is handled separately below (results shows its TOP, not the bottom).
  useStickToBottom(chatRef, [messages, thinking, exampleOpen], reduce);

  // Phase-scroll: the results card shows its TOP (header + first bullets in view, scroll
  // DOWN to Apply); the small picker/consent/generating cards keep the bottom in view.
  useEffect(() => {
    const sc = chatRef.current;
    if (!sc) return;
    if (phase === 'results') {
      const t = setTimeout(() => {
        const el = resultsRef.current;
        if (!el) return;
        const top = Math.max(0, el.offsetTop - 8);
        if (reduce) sc.scrollTop = top;
        else sc.scrollTo({ top, behavior: 'smooth' });
      }, 140);
      return () => clearTimeout(t);
    }
    if (phase === 'picking' || phase === 'consent' || phase === 'generating') {
      const t = setTimeout(() => {
        sc.scrollTop = sc.scrollHeight;
      }, 60);
      return () => clearTimeout(t);
    }
  }, [phase, reduce]);

  // Persist this section's Q&A to the draft (never the regenerated opening, never the
  // markers), so it survives navigation, refresh, and other devices. Pass ONLY this
  // section's key — updateCvData deep-merges functionally off the latest state, so a
  // fresh section writing `{ [id]: [] }` can't clobber another section's saved thread.
  useEffect(() => {
    updateCvData({
      coachChats: {
        [currentStepId]: messages.filter((x) => !x._opening && x.who !== 'added'),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Consent to spend is remembered per-CV (coachState is per-draft), so a student
  // who picked "Always allow" once isn't re-prompted on this CV.
  const alwaysAllow = !!aiByStep?._ariaAlwaysAllow;

  // "Aria's read" — the Role Brief. Seeded from cvData if present, else fetched
  // once on mount (only when a target JD exists). Grounds every generation.
  const [brief, setBrief] = useState(cvData.targetJob?.brief || null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (brief || !(cvData.targetJob?.description || '').trim()) return;
    let cancelled = false;
    CVService.getBrief(draftId)
      .then((r) => {
        if (!cancelled) setBrief(r?.brief || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmType = async (type) => {
    setConfirming(true);
    try {
      const r = await CVService.setCompanyType(draftId, type);
      setBrief((b) => ({
        ...(b || {}),
        ...(r?.brief || {}),
        companyType: type,
        companyTypeConfirmed: true,
      }));
    } catch {
      toast.error("Couldn't save that — try again.");
    } finally {
      setConfirming(false);
    }
  };

  const pickerNote = isProject ? 'Punchy beats padded — 3 is our pick.' : '4–5 lands best.';

  // "Sharpen another" / "Start over" — DON'T wipe the thread; just return to chat
  // and append a fresh prompt to keep the conversation going.
  const resetToChat = () => {
    setPhase('chat');
    setDescription('');
    setBullets([]); // the [bullets] effect resets the toggle record (appliedSet/selected/…)
    setWasFree(false);
    buildTurnsRef.current = 0;
    setMessages((m) => [
      ...m,
      {
        who: 'aria',
        text: focused ? 'Anything else you did here? I can draft another.' : generalOpener,
      },
    ]);
  };

  // Focus continuity — clicking Ask Aria (null→role) or switching roles appends the
  // new role's opener to the SAME thread; clearing the chip keeps every message.
  const lastFocusRef = useRef(focusedEntry?.sortId ?? null);
  useEffect(() => {
    const cur = focusedEntry?.sortId ?? null;
    const prev = lastFocusRef.current;
    if (cur === prev) return; // no real change (incl. initial mount)
    lastFocusRef.current = cur;
    buildTurnsRef.current = 0;
    setShowChips(false);
    // Drop a small inline marker so scrolling the history shows the boundaries of a
    // focus: "Focus · Role" where it began (above that role's opener), and "Focus mode
    // exited" where it was cleared. Only FOCUSING resets the generation state — CLEARING
    // leaves bullets/phase/appliedSet/description intact so the record marker survives.
    if (cur) {
      setProjectTypePicked(false); // a newly-focused project asks its type again
      setPhase('chat');
      setBullets([]);
      setAppliedSet(new Set());
      setSelected(new Set([0]));
      setOpened(false);
      setDescription('');
      setMessages((m) => [
        ...m,
        { who: 'focus', title: focusedEntry.title, company: focusedEntry.company },
        { who: 'aria', text: focusOpener(focusedEntry) },
      ]);
    } else if (prev) {
      setMessages((m) => [...m, { who: 'unfocus' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedEntry?.sortId]);

  // Drop the "what research says" lecture card into the thread — no AI call, added
  // once, and it doesn't dismiss the other starter chips. The marker persists on the
  // draft (the persist filter keeps it) and is ignored by the chat API.
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

  // A unified chat turn via /coach/chat: send the whole thread as memory (markers
  // stripped). The backend answers a general question OR runs the focused build-with;
  // on a focused 'ready' it hands back the description → the picker → credited draft.
  const send = async (text) => {
    const val = (text ?? input).trim();
    if (!val || thinking) return;
    const next = [...messages, { who: 'user', text: val }];
    setMessages(next);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setShowChips(false);
    setProjectTypePicked(true); // any send (chip or typed) dismisses the project-type chips
    setSuggestions([]);
    setExampleAnswer('');
    setExampleOpen(false);
    setSuggestionsLabel('');
    setThinking(true);
    if (focused) buildTurnsRef.current += 1;
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
      const r = await CVService.coachChat({
        draftId: id,
        currentStepId,
        messages: next
          .filter((m) => m.who === 'aria' || m.who === 'user')
          .map((m) => ({ who: m.who, text: m.text })),
        focus: focused ? { section: focusedEntry.section, sortId: focusedEntry.sortId } : undefined,
        buildTurns: buildTurnsRef.current,
      });
      setMessages((m) => [...m, { who: 'aria', text: r.reply }]);
      setFreeLeft(r.freeRemaining);
      setSuggestions(r.suggestions || []);
      setExampleAnswer(r.exampleAnswer || '');
      setSuggestionsLabel(r.suggestionsLabel || '');
      if (r.readyToDraft && focused) {
        const desc =
          (r.description || '').trim() ||
          next
            .filter((m) => m.who === 'user')
            .map((m) => m.text)
            .join('. '); // fallback
        setDescription(desc);
        setTimeout(() => setPhase('picking'), 900); // → count picker → credited draft
      }
    } catch (e) {
      if (e?.response?.data?.code === 'CHAT_LIMIT_REACHED') {
        setMessages((m) => [
          ...m,
          {
            who: 'aria',
            text: "You've used today's free chats — top up credits or come back tomorrow.",
          },
        ]);
      } else {
        toast.error("Couldn't reach me just now — try again.");
      }
    } finally {
      setThinking(false);
    }
  };

  // Tap a starter → drop it into the box, editable (never auto-sent). Caret lands on
  // the "___" placeholder if present, else at the end, so they finish their own words.
  const useStarter = (text) => {
    setInput(text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const i = text.indexOf('___');
      if (i >= 0) el.setSelectionRange(i, i + 3);
      else el.setSelectionRange(text.length, text.length);
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    });
  };

  // Paid users (or those who chose "Always allow" on this CV) generate straight
  // through; free users hit the consent gate first.
  const startGenerate = () => {
    if (!isPaid && !alwaysAllow) setPhase('consent');
    else generate();
  };

  const generate = async () => {
    builtEntryRef.current = { section: focusedEntry.section, sortId: focusedEntry.sortId };
    setPhase('generating');
    try {
      const res = await CVService.coachGenerateBullets({
        draftId,
        section: focusedEntry.section,
        sortId: focusedEntry.sortId,
        description: description.trim(),
        count,
      });
      setBullets(res.bullets || []);
      setAppliedSet(new Set());
      setSelected(new Set([0]));
      setOpened(false);
      setWasFree(false);
      setPhase('results');
    } catch (e) {
      const code = e?.response?.data?.code;
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error('Not enough credits — earn more or upgrade.');
      } else {
        toast.error(e?.response?.data?.message || "Couldn't generate right now. Try again.");
      }
      setPhase('picking');
    }
  };

  // Free re-roll — a fresh angle on the same request. The backend re-grants one
  // free re-roll per charged generation (wasFree reflects whether this one was).
  const reroll = async () => {
    // Target a RE-OPENED record's role when unfocused, else the focused/built role.
    const target = focusedEntry || recordEntryRef.current || builtEntryRef.current;
    if (!target) return;
    builtEntryRef.current = { section: target.section, sortId: target.sortId };
    setPhase('generating');
    try {
      const res = await CVService.coachGenerateBullets({
        draftId,
        section: target.section,
        sortId: target.sortId,
        description: description.trim(),
        count,
        reroll: true,
      });
      setBullets(res.bullets || []);
      setAppliedSet(new Set());
      setSelected(new Set([0]));
      setOpened(false);
      setWasFree(!!res.wasFree);
      setPhase('results');
    } catch (e) {
      toast.error(e?.response?.data?.message || "Couldn't re-roll. Try again.");
      setPhase('results');
    }
  };

  // Toggle one generated bullet's checked state in the open card.
  const toggle = (i) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // Land the applied state back in the conversation: an emerald "added" chip + a
  // single inline, re-openable record marker, then return to 'chat'. Markers use a
  // `who` other than aria/user, so the interview API silently ignores them.
  const landInStream = (addCount) => {
    const e = focusedEntry || recordEntryRef.current || builtEntryRef.current;
    const rec = {
      who: 'record',
      entry: e ? { section: e.section, sortId: e.sortId, title: e.title, company: e.company } : null,
      bullets: [...bullets],
      applied: [...selected], // the indices just applied (selected == applied here)
    };
    setMessages((m) => [
      // Replace only THIS role's record, so two different roles' records coexist.
      ...m.filter((x) => !(x.who === 'record' && x.entry?.sortId === e?.sortId)),
      ...(addCount ? [{ who: 'added', n: addCount }] : []),
      rec,
    ]);
    buildTurnsRef.current = 0; // a new build-with round starts fresh against the turn cap
    setPhase('chat');
  };

  // Reconcile the CV against the current checks: add newly-checked, remove
  // newly-unchecked. A no-op diff just lands the record without a network call.
  const apply = async () => {
    const add = [...selected].filter((i) => !appliedSet.has(i)).map((i) => bullets[i]);
    const remove = [...appliedSet].filter((i) => !selected.has(i)).map((i) => bullets[i]);
    if (!add.length && !remove.length) {
      setOpened(true);
      landInStream(0);
      return;
    }
    // focusedEntry is null once the user Exits — fall back to a RE-OPENED record's
    // role, else the role the current bullets were built for, so Apply still targets
    // the right entry from a re-opened (even persisted) record.
    const target = focusedEntry || recordEntryRef.current || builtEntryRef.current;
    if (!target) return;
    setApplying(true);
    const res = await applyRoleBulletDiff(target.section, target.sortId, add, remove);
    setApplying(false);
    if (res.ok) {
      setAppliedSet(new Set(selected));
      setOpened(true);
      landInStream(add.length);
    } else if (!res.found) {
      toast.error("Couldn't find this role — refresh and try again.");
    } else {
      toast.error('Saved changes, but syncing failed — try again.');
    }
  };

  // Aria message bubble wrapper — her orbit mark to the left of a card/bubble body.
  // Optional `ref` forwards to the DOM node (framer-motion forwards refs) so a caller
  // can scroll a specific card into view.
  const ariaWrap = (key, body, ref) => (
    <motion.div
      ref={ref}
      key={key}
      className="self-start max-w-[92%] flex items-start gap-2"
      {...portalCard(reduce)}
    >
      <AriaOrbit size={16} className="mt-2" />
      {body}
    </motion.div>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4">
      {/* "Aria's read" — the Role Brief, with the infer+confirm company-type chip.
          Non-blocking: sits above the stream, shown only when a JD produced a
          brief. Confirm once → it sharpens every generation. No JD → no strip. */}
      {brief && (brief.role || brief.company) && (
        <div className="shrink-0 mb-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-indigo-500 dark:text-indigo-400">
            Aria&apos;s read
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate">
            {[brief.role, brief.company, brief.seniority && `${brief.seniority} level`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {brief.companyTypeConfirmed ? (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {COMPANY_TYPE_LABELS[brief.companyType] || 'Company'} · confirmed ✓
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                What kind of place is it? (I guessed — tap to confirm)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(COMPANY_TYPE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={confirming}
                    onClick={() => confirmType(key)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                      brief.companyType === key
                        ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {label}
                    {brief.companyType === key ? ' · my guess' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* The conversation — ALWAYS mounted; picker/consent/generating/results bloom
          in as the last item in this same scroll stream (never a phase-swap). */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={chatRef}
          className="absolute inset-0 overflow-y-auto scrollbar-none flex flex-col gap-2.5"
        >
          {messages.map((m, i) => {
            // User turn — right-aligned ink bubble.
            if (m.who === 'user') {
              return (
                <motion.div
                  key={i}
                  className="self-end max-w-[92%] bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                  {...bubbleAnim('user', reduce)}
                >
                  {m.text}
                </motion.div>
              );
            }
            // Focus start / end — a thin editorial hairline divider marking where the
            // focused build-with conversation began (above that role's opener) and where
            // it was exited, so scrolling the history shows the boundaries of a focus.
            if (m.who === 'focus' || m.who === 'unfocus') {
              const exited = m.who === 'unfocus';
              return (
                <motion.div
                  key={i}
                  className="self-stretch my-1 flex items-center gap-2 px-1"
                  {...bubbleAnim('aria', reduce)}
                >
                  <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
                  <span className="shrink-0 flex items-center gap-1.5">
                    <span
                      className={`w-1 h-1 rounded-full ${
                        exited
                          ? 'bg-amber-400 dark:bg-amber-500'
                          : 'bg-emerald-400 dark:bg-emerald-500'
                      }`}
                    />
                    {exited ? (
                      <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                        Focus mode exited
                      </span>
                    ) : (
                      <span className="max-w-[180px] truncate text-[9px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
                        Focus ·{' '}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {m.title}
                          {m.company ? ` · ${m.company}` : ''}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/60" />
                </motion.div>
              );
            }
            // "Added" confirmation — a centered emerald chip.
            if (m.who === 'added') {
              return (
                <motion.div
                  key={i}
                  className="self-center rounded-full border border-emerald-500/35 bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400 px-3 py-1 text-[12px] font-semibold"
                  {...bubbleAnim('aria', reduce)}
                >
                  ✓ Added {m.n} bullet{m.n === 1 ? '' : 's'} to your description
                </motion.div>
              );
            }
            // Inline record — tap to re-open the suggestions (re-pick / re-apply).
            // Self-contained + persisted: renders and re-opens from ITS OWN snapshot
            // (m.entry/m.bullets/m.applied), so it survives navigation + refresh.
            if (m.who === 'record') {
              const cnt = m.applied?.length ?? 0;
              return (
                <motion.div
                  key={i}
                  className="self-start max-w-[92%] flex items-start gap-2"
                  {...bubbleAnim('aria', reduce)}
                >
                  <AriaOrbit size={16} className="mt-2" />
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setBullets(m.bullets || []);
                        setAppliedSet(new Set(m.applied || []));
                        setSelected(new Set(m.applied || []));
                        setOpened(true);
                        recordEntryRef.current = m.entry || null;
                        setPhase('results');
                      }}
                      className="w-full text-left rounded-2xl border border-slate-200 dark:border-slate-800 border-l-2 border-l-emerald-400 dark:border-l-emerald-500 bg-slate-50 dark:bg-slate-800/40 p-3 flex items-center gap-2.5"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[13px] font-bold">
                        ✓
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                          Aria wrote {cnt} bullet{cnt === 1 ? '' : 's'} to this{' '}
                          {m.entry?.section === 'project' ? 'project' : 'role'}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Tap to review, add or remove
                        </span>
                      </span>
                      <span className="shrink-0 text-slate-400 dark:text-slate-500 text-lg leading-none">
                        ›
                      </span>
                    </button>
                    {/* Role-actions — only while focused; the record card itself stays
                        tappable after Exit so past bullets remain editable. */}
                    {focused && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={resetToChat}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Sharpen another
                        </button>
                        <button
                          type="button"
                          onClick={() => onClearFocus?.()}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                        >
                          Done with this role
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            }
            // Research lecture card — chip-triggered, re-rendered from the section id.
            if (m.who === 'research') {
              return <ResearchCard key={i} section={m.section} />;
            }
            // Aria turn — orbit + slate bubble.
            return (
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

          {/* Starter questions — only on a fresh, unfocused section chat. */}
          {phase === 'chat' && showChips && !focused && (
            <div className="self-start flex flex-wrap gap-1.5 pl-6">
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
            </div>
          )}

          {/* Project-type chips — a focused PROJECT's first turn asks its type. The
              pick is sent as a normal user message, so the thread stays type-aware. */}
          {focused && isProject && !projectTypePicked && phase === 'chat' && !thinking && (
            <div className="self-start pl-6 flex flex-wrap gap-1.5">
              {[
                ['Course / academic', 'This is a course / academic project.'],
                ['Personal / side', 'This is a personal / side project.'],
                ['Work / client', 'This was a work / client project.'],
              ].map(([label, msg]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setProjectTypePicked(true);
                    send(msg);
                  }}
                  className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Role-aware answer scaffolds — under Aria's build-with follow-up. Tap a
              dashed starter to drop an EDITABLE opener into the box (never auto-sent);
              "Show me an example" toggles a sample answer. Focused build-with only. */}
          {focused && phase === 'chat' && !thinking && suggestions.length > 0 && (
            <div className="self-start pl-6 flex flex-col gap-1.5">
              <span className="font-mono text-[8.5px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {suggestionsLabel || 'A starter to build on'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => useStarter(s)}
                    className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-dashed border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
                {exampleAnswer && (
                  <button
                    type="button"
                    onClick={() => setExampleOpen((o) => !o)}
                    className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {exampleOpen ? 'Hide example' : 'Show me an example'}
                  </button>
                )}
              </div>
              {exampleOpen && exampleAnswer && (
                <div className="mt-0.5 max-w-[92%] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-[12px] text-slate-600 dark:text-slate-300 italic">
                  e.g. “{exampleAnswer}”
                </div>
              )}
            </div>
          )}

          {thinking && (
            <AriaThinking
              variant="chat"
              label={creatingDraft ? 'Setting up your CV draft…' : undefined}
            />
          )}

          {/* The action cards bloom from / collapse into Aria's orbit, inline. */}
          <AnimatePresence>
            {phase === 'picking' &&
              ariaWrap(
                'pick',
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    How many bullets?
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[3, 4, 5, 6].map((n) => {
                      const active = count === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCount(n)}
                          className={`relative flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors ${
                            active
                              ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white bg-slate-50 dark:bg-slate-800'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {n}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {n * per} cr
                          </span>
                          {n === REC && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5">
                              Best fit
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400">
                    {pickerNote}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPhase('chat')}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={startGenerate}
                      className="btn-primary px-5 py-2 text-sm"
                    >
                      Generate {count} bullets · {count * per} cr
                    </button>
                  </div>
                </div>
              )}

            {phase === 'consent' &&
              ariaWrap(
                'cons',
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 text-[13px] font-bold">
                      ¢
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
                        Writing this uses {count * per} credits
                      </h4>
                      <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                        If the first draft misses, your next angle&apos;s on me.
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                        Free credits come from watching an ad or referring a friend.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={generate}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      Just this once
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiByStep?.((m) => ({ ...m, _ariaAlwaysAllow: true }));
                        generate();
                      }}
                      className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
                    >
                      Always allow
                      <span className="font-mono text-[9px] uppercase tracking-wide bg-white/20 dark:bg-slate-900/20 px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                    </button>
                  </div>
                </div>
              )}

            {phase === 'generating' && <AriaThinking key="gen" variant="draft" />}

            {phase === 'results' &&
              ariaWrap(
                'res',
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-l-2 border-l-emerald-400 dark:border-l-emerald-500 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      Aria drafted {bullets.length}
                    </p>
                    <span
                      className={`font-mono text-[10px] ${
                        wasFree
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-500/80 dark:text-amber-400/70'
                      }`}
                    >
                      {wasFree ? '· re-roll · free' : `· ${count * per} cr`}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
                    {opened
                      ? 'In your CV — check to add, uncheck to remove.'
                      : isProject
                        ? 'Here are a few ways to frame it — pick what fits. Add more than one if you like.'
                        : 'You told me about one thing — pick the version that fits. Add more than one if you like.'}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {bullets.map((b, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggle(i)}
                        className={`w-full text-left flex gap-2.5 p-2.5 rounded-xl border transition-colors ${
                          selected.has(i)
                            ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${
                            selected.has(i)
                              ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {selected.has(i) ? '✓' : ''}
                        </span>
                        <span className="text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">
                          {String(b)
                            .replace(/^[•\-*\s]+/, '')
                            .trim()}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    {opened ? (
                      <button
                        type="button"
                        onClick={() => setPhase('chat')}
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={reroll}
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        ↻ Try another angle
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={apply}
                      disabled={applying}
                      className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                    >
                      {applying ? 'Applying…' : `Apply (${selected.size})`}
                    </button>
                  </div>
                </div>,
                resultsRef
              )}
          </AnimatePresence>
        </div>
      </div>

      {/* Docked input — always mounted; dimmed + disabled while an action card owns
          the stream (phase !== 'chat'), so the card is the focus. */}
      <div className="shrink-0 pt-3">
        {freeLeft != null && (
          <p className="mb-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {freeLeft > 0
              ? `${freeLeft} free chats left today`
              : 'Free chats done today · 1 credit each'}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            disabled={phase !== 'chat'}
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
            placeholder={focused ? 'Type your answer…' : 'Ask Aria anything…'}
            className={`flex-1 resize-none rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-5 py-2.5 text-[13px] leading-relaxed outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors scrollbar-none max-h-[140px] ${
              phase !== 'chat' ? 'opacity-50' : ''
            }`}
          />
          <ChatThemePicker />
          <button
            type="button"
            onClick={() => send()}
            disabled={phase !== 'chat' || thinking || input.trim().length < 2}
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

export default AskAriaGenerate;
