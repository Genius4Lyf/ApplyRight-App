import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CVService from '../../services/cv.service';
import { CREDIT_COSTS } from '../../lib/credits';
import AriaCard from './AriaCard';

// The focused build-with, ported to the Studio. This is a COPY OF THE PROTOCOL from
// the CV builder's AskAriaGenerate — not of the file, which is bound to CVContext and
// must not be touched. Same server contract, same turn cap, same charge points:
//
//   free Q&A (/coach/chat, focused → intent 'building'/'ready' is FREE)
//     → readyToDraft → count picker (GENERATE_BULLET × count)
//     → /coach/generate-bullets → results with per-bullet toggles
//     → apply through the provider writer → free re-band
//
// The server converges the interview at INTERVIEW_TURN_CAP = 6, so buildTurns is
// tracked here and sent with every turn.
const TURN_CAP = 6;

// The Studio's section names vs the builder step vocabulary /coach/chat expects.
// Mapping rather than renaming keeps the existing section-specific prompts firing.
const STEP_FOR_SECTION = { experience: 'history', project: 'projects' };

const SectionCoach = ({
  draftId,
  entry, // { section: 'experience'|'project', sortId, title, company }
  missingKeywords = [],
  messages, // the SHARED studio stream — coach turns persist with everything else
  onPush, // (…msgs) => void
  onApply, // (add[], remove[]) => Promise<{ ok, found }>
  onDone, // () => void — fix finished, hand back to the breakdown
  dockNode = null, // the pinned DOM slot StudioChat provides for this composer (portal target)
}) => {
  const isProject = entry?.section === 'project';
  const REC = isProject ? 3 : 5;
  const per = CREDIT_COSTS.GENERATE_BULLET ?? 1;

  const [phase, setPhase] = useState('chat'); // chat | picking | generating | results
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [description, setDescription] = useState('');
  const [count, setCount] = useState(REC);
  const [bullets, setBullets] = useState([]);
  const [selected, setSelected] = useState(new Set([0]));
  const [applying, setApplying] = useState(false);
  const [wasFree, setWasFree] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [exampleAnswer, setExampleAnswer] = useState('');
  const [exampleOpen, setExampleOpen] = useState(false);
  const [suggestionsLabel, setSuggestionsLabel] = useState('');

  const inputRef = useRef(null);
  const buildTurnsRef = useRef(0);

  // One free re-roll is granted per charged generation — the SERVER owns that via
  // genState, so this only tracks whether the last result claimed it.
  const rerollNote = wasFree ? 'That re-roll was free.' : '';

  const send = async (text) => {
    const val = (text ?? input).trim();
    if (!val || thinking) return;

    const next = [...messages, { who: 'user', text: val }];
    onPush({ who: 'user', text: val });
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setSuggestions([]);
    setExampleAnswer('');
    setExampleOpen(false);
    setSuggestionsLabel('');
    setThinking(true);
    buildTurnsRef.current += 1;

    try {
      const r = await CVService.coachChat({
        draftId,
        currentStepId: STEP_FOR_SECTION[entry.section] || 'history',
        // Markers carry no `text`, so the filter leaves the API a clean transcript.
        messages: next
          .filter((m) => m.who === 'aria' || m.who === 'user')
          .map((m) => ({ who: m.who, text: m.text })),
        focus: { section: entry.section, sortId: entry.sortId },
        buildTurns: buildTurnsRef.current,
      });

      onPush({ who: 'aria', text: r.reply });
      setSuggestions(r.suggestions || []);
      setExampleAnswer(r.exampleAnswer || '');
      setSuggestionsLabel(r.suggestionsLabel || '');

      if (r.readyToDraft) {
        const desc =
          (r.description || '').trim() ||
          next
            .filter((m) => m.who === 'user')
            .map((m) => m.text)
            .join('. ');
        setDescription(desc);
        setTimeout(() => setPhase('picking'), 900);
      }
    } catch (e) {
      if (e?.response?.data?.code === 'CHAT_LIMIT_REACHED') {
        onPush({
          who: 'aria',
          text: "You've used today's free chats — top up credits or come back tomorrow.",
        });
      } else {
        toast.error("Couldn't reach me just now — try again.");
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
      });
      setBullets(res.bullets || []);
      setSelected(new Set((res.bullets || []).map((_, i) => i))); // all on by default
      setWasFree(!!res.wasFree);
      if (res.remainingCredits != null) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.remainingCredits }));
      }
      setPhase('results');
    } catch (e) {
      const code = e?.response?.data?.code;
      toast.error(
        code === 'INSUFFICIENT_CREDITS'
          ? 'Not enough credits — earn more or upgrade.'
          : e?.response?.data?.message || "Couldn't generate right now. Try again."
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
      onDone?.({ entry, applied: add });
    } else if (res && !res.found) {
      toast.error(`Couldn't find this ${isProject ? 'project' : 'role'} — refresh and try again.`);
    } else {
      toast.error('Saved, but syncing failed — try again.');
    }
  };

  // The coach's own composer (free-note + textarea + Back/turns row). Rendered while
  // she's interviewing. It must stay PINNED, not scroll away with the stream — so it's
  // portaled into StudioChat's docked slot (`dockNode`) rather than sitting inside the
  // scroll region. Falls back to inline only if the slot isn't attached yet (one frame).
  const composer = phase === 'chat' && (
    <div className="pt-3 pb-[env(safe-area-inset-bottom)]">
      <p className="mb-1.5 text-center font-mono text-[9px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
        This back-and-forth is free · you only pay for the draft
      </p>
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          disabled={thinking}
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
          placeholder="Type your answer…"
          className="flex-1 resize-none rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-5 py-2.5 text-[13px] leading-relaxed outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 transition-colors scrollbar-none max-h-[140px]"
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={thinking || input.trim().length < 2}
          aria-label="Send"
          className="shrink-0 px-4 h-10 flex items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-800 dark:text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onDone?.(null)}
          className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          ← Back to sections
        </button>
        {missingKeywords.length > 0 && (
          <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500 truncate">
            aiming at {missingKeywords.slice(0, 2).join(', ')}
          </span>
        )}
        <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {Math.min(buildTurnsRef.current, TURN_CAP)}/{TURN_CAP}
        </span>
      </div>
    </div>
  );

  // ─── The live card for whichever step of the build we're on ───
  return (
    <>
      {/* Answer scaffolds — role-aware starters + a sample, under Aria's follow-up.
          Only while she's actually asking something. */}
      {phase === 'chat' && !thinking && suggestions.length > 0 && (
        <div className="self-start pl-6 flex flex-col gap-1.5">
          <span className="font-mono text-[8.5px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {suggestionsLabel || 'A starter to build on'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertStarter(s)}
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
              e.g. &ldquo;{exampleAnswer}&rdquo;
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {/* Count picker — the first point anything costs, priced before the click. */}
        {phase === 'picking' && (
          <AriaCard cardKey="picking" key="picking">
            <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
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
                          Best fit
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400">
                {isProject ? 'Punchy beats padded — 3 is our pick.' : '4–5 lands best.'}
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
                  onClick={() => generate(false)}
                  className="btn-primary px-5 py-2 text-sm"
                >
                  Draft {count} · {count * per} cr
                </button>
              </div>
            </div>
          </AriaCard>
        )}

        {/* Results — per-bullet toggles, a free-re-roll offer, and Apply. */}
        {phase === 'results' && bullets.length > 0 && (
          <AriaCard cardKey="results" key="results">
            <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                Pick what&rsquo;s true
              </p>
              {rerollNote && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {rerollNote}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {bullets.map((b, i) => {
                  const on = selected.has(i);
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(i)}
                        className={`w-full text-left flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                          on
                            ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center text-[11px] font-bold ${
                            on
                              ? 'bg-emerald-500 text-white'
                              : 'border border-slate-300 dark:border-slate-600 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                          {b}
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
                  Try another angle
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={applying || selected.size === 0}
                  className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                >
                  {applying ? 'Applying…' : `Apply (${selected.size})`}
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
