import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BriefcaseBusiness, Check, ChevronDown, RotateCcw } from 'lucide-react';
import { REQUIREMENT_STATE } from '../../lib/requirementRows';

// What this job asks for, while you are being interviewed about it.
//
// The job description used to be read once, shown once, and then disappear into a prompt —
// so Aria raised requirements from behind a curtain and the user could neither agree with
// the list nor choose from it. TargetJobStrip even hides itself during a role interview, so
// at the exact moment someone is being interviewed FOR a job there was nothing about that
// job on screen.
//
// Collapsed by default and silent when there is nothing to say: the default path is still
// "just talk", and ignoring this entirely must remain a complete way to use the interview.
//
// Purely presentational. It decides nothing about coverage — SectionCoach hands it rows
// built by lib/requirementRows, which join the server's own verdict to the evidence ledger.
// The same component renders during a call, which is the only reason steering a live call
// is possible at all: a call has no chat stream, so without a bar there is nothing to tap.

const NOT_ANSWERABLE_BY_TALKING = (row) => !row.qualification && !row.behavioural;

// The paper the header and the floating list share, written once so the two boxes cannot
// drift apart. Translucent and blurred on purpose: this hangs OVER the conversation, and
// the chat staying visible underneath is what makes it read as floating rather than as a
// slab that replaced the thread. Same treatment as the pinned BUILDING card.
const SHEET =
  'border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95';

const RequirementBar = ({
  rows = [],
  onAsk,
  onUndo,
  pendingId = null,
  // The requirement most recently asked about in this interview. Its tap is disabled —
  // asking twice in a row for the same thing is the one press that can only repeat work.
  // Exactly one at a time: tapping another releases this one.
  askedId = null,
  canAsk = true,
  onCall = false,
  // Fired when the user opens the list, so whatever else is open can stand down.
  onOpen,
  // Fired on every change of state, so the backdrop behind can blur and un-blur.
  onOpenChange,
  // Bumped by the parent to close this. One-directional on purpose — it can only ever
  // collapse, never re-open, so two panels can never fight over who is showing.
  collapseSignal = 0,
}) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  // CLOSED ON ARRIVAL — the pre-flight card is what announces this now.
  //
  // It used to open itself once per mount, on the reasoning that a collapsed strip above
  // the keyboard is easy to never notice. Two things made that wrong. The "Before we
  // start" card lists the very same rows, tappable, at the very same moment — so the bar
  // opening on top of it said the same thing twice, over a conversation the user had not
  // read yet. And "once" was per MOUNT, not per interview: applying bullets remounts the
  // coach (StudioChat bumps buildRoundNonce to reset the turn window), so the panel threw
  // itself open again every single time a round of bullets landed.
  //
  // Discoverability now rests on the pulsing ring below, which keeps going until the bar
  // has been opened by hand — an invitation rather than an interruption.
  const [open, setOpen] = useState(false);
  // Until it has been opened BY HAND, the icon keeps a soft pulse. After that the user
  // knows it is there, and a control that keeps waving at someone who has already answered
  // it is just noise.
  const [everToggled, setEverToggled] = useState(false);

  // Adjusted during render rather than in an effect: this is state derived from a prop,
  // and an effect would paint the list open for a frame before closing it.
  const [seenCollapse, setSeenCollapse] = useState(collapseSignal);
  if (collapseSignal !== seenCollapse) {
    setSeenCollapse(collapseSignal);
    setOpen(false);
  }

  // JOINED — "is the list still on top of the header?", which is NOT the same question as
  // `open`, and conflating them is what made closing look broken while opening looked fine.
  //
  // Opening: `open` flips true, the header squares its top corners, and the list animates
  // in above it. Every change lands together, so it reads as one movement.
  // Closing: `open` flips false and the header instantly re-rounds and drops its shadow —
  // while the list is still 280ms from being gone. The corners popped out from under a
  // panel that was still there.
  //
  // So the header follows the ANIMATION, not the state: square while the list is present,
  // rounded again only once the exit has finished.
  // Seeded from `open`'s own initial value: a header that started `joined` while closed
  // would paint square-topped with a lifted shadow, waiting for a list that is not there.
  const [joined, setJoined] = useState(false);
  if (open && !joined) setJoined(true);

  // Report open AND close, not just open. onOpen exists so the OTHER floating panel can
  // stand down, which only ever needs the rising edge; the backdrop behind them needs both
  // edges, or it blurs the conversation and never un-blurs it. An effect rather than a call
  // inside the toggle because `open` also changes from collapseSignal and on arrival, and a
  // backdrop that missed those would be stuck on.
  //
  // The cleanup matters for the same reason it does on the pinned card: this bar lives in
  // the composer, and the composer is unmounted outright the moment the interview leaves
  // the chat phase — a bullet generation, a call starting, the coach being re-keyed after
  // bullets are applied. A bar that was open when that happened never got to report
  // `false`, so the backdrop stayed blurred with nothing floating above it.
  useEffect(() => {
    onOpenChange?.(open);
    return () => onOpenChange?.(false);
  }, [open, onOpenChange]);

  // Two kinds of requirement are real, stated by the employer, and still have no place
  // here — because this bar is only for things answerable by TALKING about your work.
  //
  // A qualification is something you HOLD. Offering it invites "did you do Mechanical
  // Engineering at this job?", a question with no sensible answer.
  //
  // A behavioural trait fails from the other side: "tell me about your communication
  // skills" can only produce the vague, undefendable answer this whole interview exists
  // to avoid. Running ten real postings through the reader found one as a must-have on
  // four of nine — it was never the rare case we assumed.
  //
  // Both are filtered, never counted, and scoring still sees them.
  const shown = rows.filter(NOT_ANSWERABLE_BY_TALKING);
  if (!shown.length) return null;

  // Counted over MUST-HAVES only, so this number and the target panel's never disagree
  // about the same job on the same screen. Nice-to-haves are still listed — they are
  // worth having — but a bonus you have not covered is not a gap.
  const mustHaves = shown.filter((r) => r.importance === 'must_have');
  const counted = mustHaves.length ? mustHaves : shown;
  const done = counted.filter((r) => r.state === REQUIREMENT_STATE.COVERED).length;

  const toggle = () => {
    setEverToggled(true);
    setOpen((wasOpen) => {
      if (!wasOpen) onOpen?.();
      return !wasOpen;
    });
  };

  const Dot = ({ row }) => (
    <span
      aria-hidden="true"
      className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
        row.state === REQUIREMENT_STATE.COVERED
          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
          : row.state === REQUIREMENT_STATE.DECLINED
            ? 'border border-dashed border-slate-300 dark:border-slate-700'
            : 'border border-slate-300 dark:border-slate-700'
      }`}
    >
      {row.state === REQUIREMENT_STATE.COVERED && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      {row.state === REQUIREMENT_STATE.DECLINED && (
        <span className="block w-1.5 h-px bg-slate-400 dark:bg-slate-500" />
      )}
    </span>
  );

  const listRows = (
    <>
      {/* The count, and the one rule that makes this list safe to use.
                    "Cover them with work you can actually defend" lived on the target
                    panel, which is now just the posting — and it belongs here far more than
                    it belonged there. This is the list someone is about to answer questions
                    against, and a checklist without that line quietly invites ticking boxes
                    you cannot back up in the room. */}
      <li className="px-0 pb-2 pt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
        <span className="font-semibold text-slate-600 dark:text-slate-300">{done}</span>{' '}
        {t('ariaStudio.jobTarget.ofTarget', { total: counted.length })}
        <span className="mt-1 block leading-relaxed">{t('ariaStudio.jobTarget.blurb')}</span>
      </li>
      {shown.map((row) => (
        <li key={row.name} className="flex items-start gap-2 py-1.5">
          <Dot row={row} />
          <span className="min-w-0 flex-1">
            <span
              className={`block text-[12px] ${
                row.state === REQUIREMENT_STATE.COVERED
                  ? 'text-slate-800 dark:text-slate-100'
                  : row.state === REQUIREMENT_STATE.DECLINED
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {row.name}
            </span>

            {/* Says WHY it ticked. A tick with no reason is just a claim. */}
            {row.state === REQUIREMENT_STATE.COVERED && row.provenAt && (
              <span className="block truncate text-[10px] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.jobTarget.provedAt', { where: row.provenAt })}
              </span>
            )}

            {/* A "no" is shown, not hidden — so you can see she heard you — and it
                        is reversible, because once it is visible an accidental one would
                        otherwise be permanent. */}
            {row.state === REQUIREMENT_STATE.DECLINED && (
              <span className="mt-0.5 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {t('ariaStudio.sectionCoach.checklist.declined')}
                </span>
                <button
                  type="button"
                  onClick={() => onUndo?.(row)}
                  aria-label={t('ariaStudio.sectionCoach.checklist.undo')}
                  className="inline-flex items-center text-slate-400 transition-colors hover:text-slate-900 dark:text-slate-500 dark:hover:text-white"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}

            {row.state === REQUIREMENT_STATE.OPEN &&
              row.requirementId &&
              (pendingId === row.requirementId ? (
                // Nothing audible happens for several seconds after a tap on a
                // call. Without this people tap again, and again.
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('ariaStudio.sectionCoach.checklist.nextUp')}
                </span>
              ) : (
                canAsk && (
                  // Already asked: the tap is spent until another is used. Left in
                  // place rather than removed, so the row does not reshuffle under
                  // the finger that just pressed it.
                  <button
                    type="button"
                    disabled={askedId === row.requirementId}
                    // THE TAP IS THE END OF THIS PANEL'S JOB — in chat.
                    //
                    // The answer to a tap lands in the thread THIS SHEET IS COVERING: the
                    // user's own "You asked · About X" bubble, then Aria's question under
                    // it. Staying open buries the reply to the press that was just made,
                    // and left people tapping a second row to make something happen.
                    //
                    // On a call it stays. There is no thread to uncover there — the
                    // "next up…" row below is the only acknowledgement a steer ever gets,
                    // and closing over it would make the tap look ignored.
                    onClick={() => {
                      if (!onCall) setOpen(false);
                      onAsk?.(row);
                    }}
                    className={`mt-0.5 text-[10px] font-semibold underline decoration-dotted underline-offset-2 transition-colors ${
                      askedId === row.requirementId
                        ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {t(
                      askedId === row.requirementId
                        ? 'ariaStudio.sectionCoach.checklist.asked'
                        : onCall
                          ? 'ariaStudio.sectionCoach.checklist.askOnCall'
                          : 'ariaStudio.sectionCoach.checklist.askMe'
                    )}
                  </button>
                )
              ))}
          </span>
        </li>
      ))}
    </>
  );

  return (
    // ATTACHED TO THE BOX YOU TYPE IN — behind it, not on top of it.
    //
    // Same centre line as the composer but deliberately NARROWER, and tucked so its bottom
    // edge disappears under the pill (the extra bottom padding is what the pill covers; it
    // paints over this as the later sibling in the dock). Matched to the pill's width it
    // read as a second, separate bar stacked above the input. Inset, it reads as one sheet
    // the input is sitting on — the thing attached to your message box.
    <div className="mx-auto w-full max-w-4xl px-3 pb-5 -mb-5 sm:px-0">
      {/* THE INSET IS THE PILL'S CORNER RADIUS — not a taste decision.
          AriaComposer is `rounded-full`, so the only FLAT part of its top edge runs between
          its two corner radii. This sheet's bottom edge is flush with that top edge (the
          pb-5/-mb-5 pair cancels out exactly; nothing overlaps), so its square bottom
          corners have to land on the flat run. Land them on the curve and the card's corner
          and the pill's shoulder cross as two separate outlines — which is what read on a
          phone as a second container sitting behind the bar, open and closed alike.
          Measured, at this app's 15px root: pill 54.5px tall → radius 27.25px, against
          mx-5 = 18.75px (crossed) and mx-8 = 30px (clears it by 2.75px). Desktop was
          already on mx-8 and looked right for exactly this reason; the phone was one step
          down. One inset at every width now, the one that clears the radius. */}
      <div className="relative mx-8">
        {/* ONLY THE HEADER TAKES UP SPACE. The list hangs off it absolutely, upwards.
            In flow, opening it grew the dock by the list's full height and shoved the whole
            conversation up the screen — the question you were answering left the view the
            moment you tapped the chevron, and the opaque sheet that replaced it read as a
            slab rather than something floating. The pinned BUILDING card solved exactly
            this and drops DOWN the same way (PinnedEntryCard: "an in-flow body grows the
            scroller's content by its full height"); this is that, mirrored.
            Translucent and blurred for the same reason it is there: the conversation stays
            visible underneath, so the list reads as floating OVER the chat rather than
            replacing it. */}
        <AnimatePresence initial={false} onExitComplete={() => setJoined(false)}>
          {open && (
            <motion.div
              key="rows"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              // bottom-full pins it to the top of the header, so growing its height opens
              // it upward into the conversation instead of downward into the composer.
              className="absolute inset-x-0 bottom-full z-20 overflow-hidden"
            >
              <div className={`overflow-hidden rounded-t-2xl border border-b-0 ${SHEET} shadow-lg`}>
                {/* Capped, because a posting with a dozen requirements would otherwise run
                    off the top of a phone with the composer still pinned below it. */}
                <ul className="max-h-[42vh] overflow-y-auto overscroll-contain px-3 py-2">
                  {listRows}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={`overflow-hidden border border-b-0 transition-[border-radius,box-shadow] duration-300 ease-out ${SHEET} ${
            // Square-topped while open: the floating list sits directly on it, and the two
            // have to read as one sheet rather than two stacked cards.
            joined ? 'rounded-none shadow-lg' : 'rounded-t-2xl shadow-sm'
          }`}
        >
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            {/* The job, in the one colour this app gives a job. It sat at slate-400 — the
              same grey as the label beside it — so the whole strip read as a caption
              rather than a control. The ring behind it breathes until the bar has been
              opened by hand, then stops for good. */}
            <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
              {!everToggled && (
                <span
                  aria-hidden="true"
                  className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-emerald-400/40 motion-reduce:animate-none"
                />
              )}
              <BriefcaseBusiness
                className="relative h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.jobTarget.eyebrow')}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-slate-500 dark:text-slate-400">
              {t('ariaStudio.sectionCoach.checklist.count', { done, total: counted.length })}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequirementBar;
