import { useState } from 'react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, RotateCcw, Target } from 'lucide-react';
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

const QUALIFICATIONS_ARE_NOT_SHOWN = (row) => !row.qualification;

const RequirementBar = ({
  rows = [],
  onAsk,
  onUndo,
  pendingId = null,
  canAsk = true,
  onCall = false,
}) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  // A qualification is something you HOLD, not something you did in a role. Offering it
  // here would invite "did you do Mechanical Engineering at this job?" — and it is not
  // answerable by talking, which is the only thing this bar is for.
  const shown = rows.filter(QUALIFICATIONS_ARE_NOT_SHOWN);
  if (!shown.length) return null;

  const done = shown.filter((r) => r.state === REQUIREMENT_STATE.COVERED).length;

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

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-500"
      >
        <Target
          className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.jobTarget.eyebrow')}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          {t('ariaStudio.sectionCoach.checklist.count', { done, total: shown.length })}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="rows"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
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
                          <button
                            type="button"
                            onClick={() => onAsk?.(row)}
                            className="mt-0.5 text-[10px] font-semibold text-slate-500 underline decoration-dotted underline-offset-2 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                          >
                            {t(
                              onCall
                                ? 'ariaStudio.sectionCoach.checklist.askOnCall'
                                : 'ariaStudio.sectionCoach.checklist.askMe'
                            )}
                          </button>
                        )
                      ))}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RequirementBar;
