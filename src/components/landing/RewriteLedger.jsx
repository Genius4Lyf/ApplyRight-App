import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bot } from 'lucide-react';

/**
 * RewriteLedger — the before/after section below the hero.
 * An aligned-row ledger: weak "before" lines struck in red (the proofreader's
 * deletion mark), rewrites with indigo numbers, the AI as the transformation
 * agent in the centre column, and an ATS bar animating 48% → 92% on scroll-in.
 */

const ROWS = [
  {
    before: 'Responsible for the regional sales process',
    after: (
      <>
        Grew regional revenue <b className="font-bold tabular-nums text-indigo-800">42%</b> across 3
        quarters
      </>
    ),
  },
  {
    before: 'Handled customer relationships day to day',
    after: (
      <>
        Retained <b className="font-bold tabular-nums text-indigo-800">9 of 10</b> key accounts
        through a pricing overhaul
      </>
    ),
  },
  {
    before: 'Worked on improving overall sales',
    after: (
      <>
        Cut the sales cycle <b className="font-bold tabular-nums text-indigo-800">18 days</b> with a
        new qualifying flow
      </>
    ),
  },
];

// Shared 3-column grid: [line] · [40px agent gutter] · [line].
const GRID = 'grid grid-cols-[1fr_40px_1fr] items-center gap-3 sm:gap-6';

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] } },
};

const RewriteLedger = () => {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-slate-200 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1160px] px-5 sm:px-8 lg:px-12">
        <motion.div
          initial={reduce ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={reveal}
          className="mb-9 flex max-w-[48ch] flex-col gap-3"
        >
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
            The rewrite
          </p>
          <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            Watch a dead line become a callback.
          </h2>
          <p className="text-lg leading-relaxed text-slate-600">
            Same experience, retold the way recruiters and their software actually read. ApplyRight
            cuts the filler, leads with results, and lands the keywords the job asks for.
          </p>
        </motion.div>

        <motion.div
          initial={reduce ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={reveal}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_12px_34px_-20px_rgba(15,23,42,0.22)]"
        >
          {/* Column header — hidden on narrow screens */}
          <div
            className={`${GRID} hidden border-b border-slate-200 bg-slate-50 px-4 py-3.5 sm:grid sm:px-6`}
          >
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
              Before — your draft
            </p>
            <span />
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-indigo-800">
              After ApplyRight
            </p>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={i}
              className={`${GRID} max-sm:!grid-cols-1 max-sm:gap-1 border-b border-slate-200 px-4 py-4 sm:px-6`}
            >
              <p className="text-[0.97rem] leading-relaxed text-slate-400 line-through decoration-red-600 decoration-2 max-sm:before:text-[0.6rem] max-sm:before:tracking-[0.1em] max-sm:before:content-['WAS_']">
                {row.before}
              </p>
              <span
                aria-hidden="true"
                className="justify-self-center text-indigo-600 max-sm:hidden"
              >
                {i === 1 ? (
                  <Bot size={20} strokeWidth={2} />
                ) : (
                  <span className="font-mono text-sm">&rarr;</span>
                )}
              </span>
              <p className="text-[0.97rem] leading-relaxed text-slate-900 max-sm:before:text-[0.6rem] max-sm:before:tracking-[0.1em] max-sm:before:text-indigo-800 max-sm:before:content-['NOW_']">
                {row.after}
              </p>
            </div>
          ))}

          {/* Footer — ATS bar animating 48% → 92% */}
          <motion.div
            className={`${GRID} max-sm:!grid-cols-1 max-sm:gap-2 bg-slate-50 px-4 py-4 sm:px-6`}
            initial={reduce ? false : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
          >
            <span className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.05em] text-slate-400">
              ATS
              <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full w-[48%] rounded-full bg-slate-400" />
              </span>
              <span className="text-[0.82rem] font-bold tabular-nums">48%</span>
            </span>
            <span
              aria-hidden="true"
              className="justify-self-center font-mono text-sm text-indigo-600 max-sm:hidden"
            >
              &rarr;
            </span>
            <span className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.05em] text-indigo-800">
              ATS
              <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-slate-100">
                <motion.span
                  className="block h-full rounded-full bg-indigo-600"
                  variants={{
                    hidden: { width: '0%' },
                    visible: { width: '92%' },
                  }}
                  initial={reduce ? false : 'hidden'}
                  animate={reduce ? { width: '92%' } : undefined}
                  transition={reduce ? undefined : { duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
                />
              </span>
              <span className="text-[0.82rem] font-bold tabular-nums">92%</span>
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default RewriteLedger;
