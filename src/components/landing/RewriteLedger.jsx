import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

/**
 * RewriteLedger — the before/after section below the hero.
 * An aligned-row ledger: weak "before" lines struck in red (the proofreader's
 * deletion mark), rewrites with indigo numbers, the AI as the transformation
 * agent in the centre column, and an ATS bar animating 48% → 92% on scroll-in.
 */

// Keys, not JSX: a module constant would freeze at import language, and the
// bold span has to be free to move — French word order differs from English.
// <Trans> places it wherever the translation puts <b>…</b>.
const ROWS = [
  { beforeKey: 'landing.ledger.row1Before', afterKey: 'landing.ledger.row1After' },
  { beforeKey: 'landing.ledger.row2Before', afterKey: 'landing.ledger.row2After' },
  { beforeKey: 'landing.ledger.row3Before', afterKey: 'landing.ledger.row3After' },
];

// Shared 3-column grid: [line] · [40px agent gutter] · [line].
const GRID = 'grid grid-cols-[1fr_40px_1fr] items-center gap-3 sm:gap-6';

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] } },
};

const RewriteLedger = () => {
  const { t } = useTranslation();
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
            {t('landing.ledger.kicker')}
          </p>
          <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            {t('landing.ledger.title')}
          </h2>
          <p className="text-lg leading-relaxed text-slate-600">{t('landing.ledger.subcopy')}</p>
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
              {t('landing.ledger.colBefore')}
            </p>
            <span />
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-indigo-800">
              {t('landing.ledger.colAfter')}
            </p>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={row.beforeKey}
              className={`${GRID} max-sm:!grid-cols-1 max-sm:gap-1 border-b border-slate-200 px-4 py-4 sm:px-6`}
            >
              <p className="text-[0.97rem] leading-relaxed text-slate-400 line-through decoration-red-600 decoration-2">
                <span className="hidden max-sm:inline text-[0.6rem] tracking-[0.1em] no-underline">
                  {t('landing.ledger.wasLabel')}{' '}
                </span>
                {t(row.beforeKey)}
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
              <p className="text-[0.97rem] leading-relaxed text-slate-900">
                <span className="hidden max-sm:inline text-[0.6rem] tracking-[0.1em] text-indigo-800">
                  {t('landing.ledger.nowLabel')}{' '}
                </span>
                <Trans
                  i18nKey={row.afterKey}
                  components={{ b: <b className="font-bold tabular-nums text-indigo-800" /> }}
                />
              </p>
            </div>
          ))}

          {/* Footer — ATS bar animating 48% → 92% */}
          <div className={`${GRID} max-sm:!grid-cols-1 max-sm:gap-2 bg-slate-50 px-4 py-4 sm:px-6`}>
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
                {reduce ? (
                  <span className="block h-full w-[92%] rounded-full bg-indigo-600" />
                ) : (
                  <motion.span
                    className="block h-full rounded-full bg-indigo-600"
                    initial={{ width: '0%' }}
                    whileInView={{ width: '92%' }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
                  />
                )}
              </span>
              <span className="text-[0.82rem] font-bold tabular-nums">92%</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RewriteLedger;
