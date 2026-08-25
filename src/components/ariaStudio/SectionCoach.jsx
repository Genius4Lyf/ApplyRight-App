import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CVService from '../../services/cv.service';
import { tierOf, costForActionTier } from '../../lib/models';
import { useAriaModel } from '../../hooks/useAriaModel';
import { useGenerationModel } from '../../hooks/useGenerationModel';
import { useAriaStudio } from '../../context/AriaStudioContext';
import AriaComposer from '../cv/AriaComposer';
import AriaThinking from '../cv/AriaThinking';
import AriaCard from './AriaCard';
import GenerationModelRow from '../cv/GenerationModelRow';

// The focused build-with, ported to the Studio. This is a COPY OF THE PROTOCOL from
// the CV builder's AskAriaGenerate — not of the file, which is bound to CVContext and
// must not be touched. Same server contract, same turn cap, same charge points:
//
//   free Q&A (/coach/chat, focused → intent 'building'/'ready' is FREE)
//     → readyToDraft → count picker (GENERATE_BULLET × count)
//     → /coach/generate-bullets → results with per-bullet toggles
//     → apply through the provider writer → free re-band
//
// Studio allows enough turns to unpack several activities one at a time.
// tracked here and sent with every turn.
const TURN_CAP = 10;

// The Studio's section names vs the builder step vocabulary /coach/chat expects.
// Mapping rather than renaming keeps the existing section-specific prompts firing.
const STEP_FOR_SECTION = { experience: 'history', project: 'projects' };

const SectionCoach = ({
  draftId,
  entry, // { section: 'experience'|'project', sortId, title, company }
  missingKeywords = [],
  // Whether `missingKeywords` are MEASURED GAPS (the fix loop, straight off the section
  // scan) or just the job's must-haves (the build track, where nothing has been scored
  // yet). Only the first can honestly be called "aiming at": on the build track the
  // entry may already cover every term listed, and claiming to aim at something the CV
  // has had all along is the kind of small invented progress that teaches people to
  // distrust the rest of the read. Defaults true — the fix loop is the caller that
  // supplies real gaps.
  keywordsAreGaps = true,
  messages = [], // the SHARED studio stream — coach turns persist with everything else
  onPush, // (…msgs) => void
  onApply, // (add[], remove[]) => Promise<{ ok, found }>
  onDone, // () => void — fix finished, hand back to the breakdown
  dockNode = null, // the pinned DOM slot StudioChat provides for this composer (portal target)
  careerStage = null, // picked stage, lifted to StudioChat so it persists across roles
  // Kept for API symmetry with StudioChat's CareerStageAskCard, which now owns the
  // pick; SectionCoach only reads `careerStage`.
  // eslint-disable-next-line no-unused-vars
  onPickCareerStage, // (k) => void — lifts the pick to the parent
}) => {
  const { t } = useTranslation();
  const isProject = entry?.section === 'project';
  // Mirrors the backend: a non-'job' experience entry type (internship/part-time/
  // volunteering/coursework) is coached gently even in an experienced session, so the
  // defensive metric-strip on Aria's reply/suggestions/example also applies here.
  const entryLevelType =
    entry?.section === 'experience' && !!entry?.entryType && entry.entryType !== 'job';
  const isGradCareer = careerStage === 'grad' || entryLevelType;
  const { cvData, updateCvData } = useAriaStudio();
  // The charged generation still waiting on THIS entry, or null. One pending card is
  // shared by the whole Studio session, so it's matched on section + sortId.
  const pendingGeneration = cvData?.studioPending;
  const restored =
    pendingGeneration?.kind === 'bullets' &&
    pendingGeneration.section === entry?.section &&
    pendingGeneration.sortId === entry?.sortId
      ? pendingGeneration
      : null;

  // The session's Aria model. The coach owns the docked composer while it drives, so its
  // picker has to write through to the same per-draft choice as StudioChat's.
  const { modelId, selectModel } = useAriaModel({ draftId, cvData, updateCvData });

  // The GENERATION model — independent of the chat model above. A per-user
  // localStorage preference, defaulting to whatever the chat model is.
  const { genModelId, setGenModelId } = useGenerationModel(modelId);

  const REC = isProject ? 4 : 6;
  // Priced at the GENERATION model's tier, not the chat model's — Pro must be
  // quoted (and charged) the flagship rate.
  const per = costForActionTier('GENERATE_BULLET', tierOf(genModelId)) ?? 1;

  const [phase, setPhase] = useState(restored ? 'results' : 'chat'); // chat | picking | generating | results
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [description, setDescription] = useState(restored?.description || '');
  const [count, setCount] = useState(restored?.count || REC);
  const [bullets, setBullets] = useState(restored?.bullets || []);
  const [bulletDetails, setBulletDetails] = useState(restored?.bulletDetails || []);
  const [selected, setSelected] = useState(
    new Set((restored?.bullets || []).map((_, index) => index))
  );
  const [applying, setApplying] = useState(false);
  const [wasFree, setWasFree] = useState(!!restored?.wasFree);
  const [suggestions, setSuggestions] = useState([]);
  const [exampleAnswer, setExampleAnswer] = useState('');
  const [exampleOpen, setExampleOpen] = useState(false);
  const inputRef = useRef(null);
  const exampleRef = useRef(null);

  // Re-sync when a pending generation lands AFTER this mounted.
  //
  // The initialisers above read `studioPending` exactly once, so they only catch it when
  // the draft is already in context at mount. Often it isn't — the pin resolves from the
  // transcript, StudioChat remounts wholesale on sessionNonce, and the draft arrives on
  // its own fetch. On those orderings already-PAID-FOR bullets were dropped on the floor
  // and the card fell back to a fresh interview. Mirrors the skills/summary re-sync
  // StudioChat already runs for the same reason.
  useEffect(() => {
    if (!restored?.bullets?.length) return;
    // Never stomp what's on screen: a live result, or a re-roll still in flight.
    if (bullets.length || phase === 'generating') return;
    setBullets(restored.bullets);
    setBulletDetails(restored.bulletDetails || []);
    setSelected(new Set(restored.bullets.map((_, index) => index)));
    setDescription(restored.description || '');
    setCount(restored.count || REC);
    setWasFree(!!restored.wasFree);
    setPhase('results');
  }, [restored, bullets.length, phase, REC]);

  // The marker that OPENED this coach session — the entry's own `pinrole` in a build, or
  // the `fixstart` that aimed the coach at it in the fix loop. BOTH tracks have to be
  // matched here: the fix loop never writes a `pinrole`, so a pin-only search finds
  // nothing on that path and every window derived from it silently spans everything.
  const sessionStart = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m?.who === 'pinrole' && m.sortId === entry?.sortId) return i;
      if (m?.who === 'fixstart' && m.mode === 'coach' && m.entry?.sortId === entry?.sortId)
        return i;
    }
    return -1;
  })();

  // The visible Studio transcript spans every entry; the coach only ever sees THIS
  // session. Scoped from the marker that started it, in either track.
  //
  // This is the payload POSTed to /coach/chat, so the window is not cosmetic: a wider one
  // primes a PAID generation with another entry's answers, and the model duly attributes
  // that entry's achievements to this one. (It also makes a fresh entry read as
  // mid-conversation, suppressing its opening suggestions and example.)
  const coachMessages = sessionStart >= 0 ? messages.slice(sessionStart + 1) : messages;

  // Turns already spent on THIS coach session — DERIVED from the restored transcript
  // rather than counted in a ref. The ref reset to 0 on every refresh, so Aria reopened
  // the interview at turn one (and misreported the cap) even though the whole Q&A was
  // sitting right there in the stream. Never counted from the whole transcript: the
  // backend turns `buildTurns` into a hard "wrap this up now", so over-counting would end
  // an interview on turn one.
  const turnsTaken =
    sessionStart >= 0 ? messages.slice(sessionStart + 1).filter((m) => m.who === 'user').length : 0;

  useEffect(() => {
    if (!exampleOpen) return undefined;
    const frame = requestAnimationFrame(() => {
      exampleRef.current?.scrollIntoView({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'nearest',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [exampleOpen]);

  // One free re-roll is granted per charged generation — the SERVER owns that via
  // genState, so this only tracks whether the last result claimed it.
  const rerollNote = wasFree ? t('ariaStudio.sectionCoach.rerollWasFree') : '';

  const persistPending = async (pending) => {
    updateCvData({ studioPending: pending });
    try {
      await CVService.saveDraft({ _id: draftId, studioPending: pending });
      return true;
    } catch (err) {
      console.error('Failed to persist pending bullet generation', err);
      toast.error(t('ariaStudio.chat.toast.saveFailed'));
      return false;
    }
  };

  const send = async (text) => {
    const val = (text ?? input).trim();
    if (!val || thinking) return;

    const next = [...coachMessages, { who: 'user', text: val }];
    onPush({ who: 'user', text: val });
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setSuggestions([]);
    setExampleAnswer('');
    setExampleOpen(false);
    setThinking(true);

    try {
      const r = await CVService.coachChat({
        draftId,
        currentStepId: STEP_FOR_SECTION[entry.section] || 'history',
        // Markers carry no `text`, so the filter leaves the API a clean transcript.
        messages: next
          .filter((m) => m.who === 'aria' || m.who === 'user')
          .map((m) => ({ who: m.who, text: m.text })),
        focus: { section: entry.section, sortId: entry.sortId },
        buildTurns: turnsTaken + 1,
        studioInterview: true,
        model: modelId,
        // Ride the picked stage along (undefined → backend infers from the draft).
        stage: careerStage,
      });

      // The selected career stage must win even if the provider slips back into its
      // experienced-role framing. Keep students/recent grads away from invented or
      // metric-shaped prompts at this final presentation boundary.
      const metricPrompt =
        /\b(?:efficiency|downtime|revenue|percentage|metric)s?\b|\bby\s+_+|\d+(?:\.\d+)?\s?%|\$\s?\d/i;
      const reply = r.readyToDraft
        ? t('ariaStudio.sectionCoach.readyForBullets')
        : isGradCareer && metricPrompt.test(r.reply || '')
          ? t('ariaStudio.sectionCoach.gradFollowUp')
          : r.reply;
      const safeSuggestions = isGradCareer
        ? (r.suggestions || []).filter((s) => !metricPrompt.test(s))
        : r.suggestions || [];
      const safeExample =
        isGradCareer && metricPrompt.test(r.exampleAnswer || '') ? '' : r.exampleAnswer || '';
      onPush({ who: 'aria', text: reply });
      setSuggestions(safeSuggestions);
      setExampleAnswer(safeExample);
      // A metered turn (flagship build-with, or general chat past the daily pool)
      // returns the post-charge balance — keep the wallet pill live without a refresh.
      if (r.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: r.remainingCredits }));
      }

      if (r.readyToDraft) {
        const desc =
          (r.description || '').trim() ||
          next
            .filter((m) => m.who === 'user')
            .map((m) => m.text)
            .join('. ');
        setDescription(desc);
        // Aria has enough truthful material; move directly to the bullet-count choice.
        setPhase('picking');
      }
    } catch (e) {
      if (e?.response?.data?.code === 'INSUFFICIENT_CREDITS') {
        // Pro model, no credits — the way out is switching back to Standard, not only topping up.
        onPush({
          who: 'aria',
          text: t('ariaStudio.chat.proNeedsCredits'),
        });
      } else if (e?.response?.data?.code === 'CHAT_LIMIT_REACHED') {
        onPush({
          who: 'aria',
          text: t('ariaStudio.chat.chatLimitReached'),
        });
      } else if (e?.response?.data?.code === 'BUILD_LIMIT_REACHED') {
        onPush({
          who: 'aria',
          text: t('ariaStudio.chat.buildLimitReached'),
        });
      } else if (e?.response?.status === 404) {
        // The entry was deleted WHILE this turn was in flight — the Live Preview's Remove,
        // or another tab. The backend answers 404 "that role is no longer in your CV" with
        // no `code`, so it's matched on status. Say what happened and close cleanly:
        // onDone(null) is the "backed out, nothing applied" contract, which early-returns
        // before any recompute. A red toast would be wrong — nothing failed, and the
        // deletion was almost certainly deliberate.
        onPush({ who: 'aria', text: t('ariaStudio.sectionCoach.entryGone') });
        onDone?.(null);
      } else {
        toast.error(t('ariaStudio.chat.chatUnreachable'));
      }
    } finally {
      setThinking(false);
    }
  };

  // Tap a starter → drop it into the box, EDITABLE and never auto-sent. The caret
  // lands on the "___" placeholder so the user finishes it in their own words —
  // the point is to unblock them, not to put words in their mouth.
  const insertStarter = (text) => {
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

  const toggleExample = () => {
    setExampleOpen((open) => !open);
  };

  const generate = async (reroll = false) => {
    setPhase('generating');
    try {
      const res = await CVService.coachGenerateBullets({
        draftId,
        section: entry.section,
        sortId: entry.sortId,
        description: description.trim(),
        count,
        reroll,
        model: genModelId,
      });
      setBullets(res.bullets || []);
      setBulletDetails(res.bulletDetails || []);
      setSelected(new Set((res.bullets || []).map((_, i) => i))); // all on by default
      setWasFree(!!res.wasFree);
      await persistPending({
        kind: 'bullets',
        section: entry.section,
        sortId: entry.sortId,
        description: description.trim(),
        count,
        bullets: res.bullets || [],
        bulletDetails: res.bulletDetails || [],
        wasFree: !!res.wasFree,
      });
      if (res.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      setPhase('results');
    } catch (e) {
      const code = e?.response?.data?.code;
      toast.error(
        code === 'INSUFFICIENT_CREDITS'
          ? t('cvBuilder.askAria.notEnoughCredits')
          : e?.response?.data?.message || t('cvBuilder.askAria.couldntGenerate')
      );
      setPhase(reroll ? 'results' : 'picking');
    }
  };

  const toggle = (i) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const apply = async () => {
    const add = [...selected].map((i) => bullets[i]).filter(Boolean);
    if (!add.length) return;
    setApplying(true);
    const res = await onApply(add, []);
    setApplying(false);
    if (res?.ok) {
      if (!(await persistPending(null))) return;
      onDone?.({ entry, applied: add });
    } else if (res && !res.found) {
      toast.error(
        t('cvBuilder.askAria.couldntFind', {
          kind: isProject ? t('cvBuilder.common.project') : t('cvBuilder.common.role'),
        })
      );
    } else {
      toast.error(t('cvBuilder.askAria.syncFailed'));
    }
  };

  // The coach's own composer (floating free-status + textarea + Back/turns row). Rendered while
  // she's interviewing. It must stay PINNED, not scroll away with the stream — so it's
  // portaled into StudioChat's docked slot (`dockNode`) rather than sitting inside the
  // scroll region. Falls back to inline only if the slot isn't attached yet (one frame).
  const composer = phase === 'chat' && (
    <div className="relative shrink-0 pb-[env(safe-area-inset-bottom)]">
      <AriaComposer
        className=""
        inputRef={inputRef}
        value={input}
        onChange={setInput}
        onSend={send}
        disabled={thinking}
        busy={thinking}
        placeholder="Tell ARIA..."
        modelId={modelId}
        onSelectModel={selectModel}
        showModelPicker
        showModelNotice
        footer={
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onDone?.(null)}
              className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              ← {t('ariaStudio.sectionCoach.backToSections')}
            </button>
            {missingKeywords.length > 0 && (
              <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500 truncate">
                {t(
                  keywordsAreGaps
                    ? 'ariaStudio.sectionCoach.aimingAt'
                    : 'ariaStudio.sectionCoach.jobAsksFor',
                  { keywords: missingKeywords.slice(0, 2).join(', ') }
                )}
              </span>
            )}
            <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {Math.min(turnsTaken, TURN_CAP)}/{TURN_CAP}
            </span>
          </div>
        }
      />
    </div>
  );

  // ─── The live card for whichever step of the build we're on ───
  return (
    <>
      {/* A sent answer is already in the stream; make the model round-trip visible so
          the composer never looks stalled while Aria is preparing her follow-up. */}
      {phase === 'chat' && thinking && <AriaThinking variant="chat" />}

      {/* Answer scaffolds — role-aware starters + a sample, under Aria's follow-up.
          Only while she's actually asking something. */}
      {phase === 'chat' && !thinking && suggestions.length > 0 && (
        <div className="self-start pl-6 flex flex-col gap-1.5 mb-3">
          <span className="font-mono text-[8.5px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t('ariaStudio.sectionCoach.clickableImpact')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertStarter(s)}
                className="text-[13px] sm:text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-dashed border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors"
              >
                {s}
              </button>
            ))}
            {exampleAnswer && (
              <button
                type="button"
                onClick={toggleExample}
                className="text-[13px] sm:text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {exampleOpen
                  ? t('cvBuilder.askAria.hideExample')
                  : t('cvBuilder.askAria.showExample')}
              </button>
            )}
          </div>
          {exampleOpen && exampleAnswer && (
            <div
              ref={exampleRef}
              className="mt-0.5 max-w-[92%] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-[13px] sm:text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 italic"
            >
              {t('cvBuilder.askAria.exampleFormat', { answer: exampleAnswer })}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {/* Count picker — the first point anything costs, priced before the click. */}
        {phase === 'picking' && (
          <AriaCard cardKey="picking" key="picking">
            <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {t('cvBuilder.askAria.howManyBullets')}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
                {[3, 4, 5, 6, 8].map((n) => {
                  const active = count === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`relative flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors ${
                        active
                          ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white bg-slate-50 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
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
                          {t('cvBuilder.askAria.bestFit')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3">
                <GenerationModelRow
                  action={isProject ? 'project' : 'experience'}
                  value={genModelId}
                  onSelect={setGenModelId}
                  chatTier={tierOf(modelId)}
                  unit="each"
                />
              </div>
              <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400">
                {isProject
                  ? t('cvBuilder.askAria.pickerNoteProject')
                  : t('cvBuilder.askAria.pickerNoteRole')}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPhase('chat')}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={() => generate(false)}
                  className="btn-primary px-5 py-2 text-sm"
                >
                  {t('ariaStudio.sectionCoach.draftCount', { n: count, cr: count * per })}
                </button>
              </div>
            </div>
          </AriaCard>
        )}

        {phase === 'generating' && (
          <AriaThinking variant="draft" label={t('ariaStudio.sectionCoach.generatingBullets')} />
        )}

        {/* Results — per-bullet toggles, a free-re-roll offer, and Apply. */}
        {phase === 'results' && bullets.length > 0 && (
          <AriaCard cardKey="results" key="results">
            <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.sectionCoach.pickWhatsTrue')}
              </p>
              {rerollNote && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {rerollNote}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {bullets.map((b, i) => {
                  const on = selected.has(i);
                  const detail = bulletDetails[i];
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(i)}
                        className={`w-full text-left flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                          on
                            ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span
                          className={`shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center text-[11px] font-bold ${
                            on
                              ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'border border-slate-300 dark:border-slate-600 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                          <span className="block">{b}</span>
                          {!!detail?.evidence?.length && (
                            <span className="mt-1.5 block text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
                              {t('ariaStudio.sectionCoach.supportedBy', {
                                evidence: detail.evidence
                                  .slice(0, 2)
                                  .map((item) => item.claim)
                                  .join(' · '),
                              })}
                            </span>
                          )}
                          {!!detail?.requirements?.length && (
                            <span className="mt-1 block font-mono text-[9px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                              {t('ariaStudio.sectionCoach.matchesRequirements', {
                                requirements: detail.requirements
                                  .map((item) => item.name)
                                  .join(', '),
                              })}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => generate(true)}
                  disabled={applying}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('ariaStudio.sectionCoach.tryAnotherAngle')}
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={applying || selected.size === 0}
                  className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                >
                  {applying
                    ? t('cvBuilder.askAria.applying')
                    : t('cvBuilder.askAria.applyN', { n: selected.size })}
                </button>
              </div>
            </div>
          </AriaCard>
        )}
      </AnimatePresence>

      {/* The coach's own input lives in the DOCKED slot (StudioChat's dockNode), so it
          stays pinned while the messages scroll. Inline fallback covers the one frame
          before the slot attaches (or if StudioChat provided none). */}
      {composer ? (dockNode ? createPortal(composer, dockNode) : composer) : null}
    </>
  );
};

export default SectionCoach;
