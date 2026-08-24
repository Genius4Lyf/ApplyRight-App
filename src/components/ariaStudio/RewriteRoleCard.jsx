import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AriaCard from './AriaCard';
import AriaThinking from '../cv/AriaThinking';
import CVService from '../../services/cv.service';

// The TAILOR path's answer to a weak role. The bullets already exist — re-interviewing the
// user to write them again from scratch is the slowest thing in the flow, and it throws
// away work they already did. This card rewrites what's there, shows it before → after,
// and lets them keep the lines they like in one tap.
//
// Three row shapes come back, and they are deliberately NOT interchangeable:
//   changed   — a real rewrite. Toggleable, selected by default.
//   unchanged — already strong for this job. Shown once (no pointless before/after twins)
//               and NOT selectable: applying it would be a no-op write.
//   blocked   — cannot be sharpened without inventing a fact. There is no `after` to
//               accept, so it isn't selectable either; it names what's missing and points
//               at the interview, which is the only honest way to supply a fact.
//
// The rows are a PAID result. They're handed up via onLoaded so the parent can persist
// them on the draft — a refresh that lost them would mean paying for the same rewrite
// twice.
const RewriteRoleCard = ({
  draftId,
  section,
  sortId,
  model,
  rows: savedRows,
  onLoaded,
  onApply,
  onInterview,
  onBack,
  applying = false,
}) => {
  const { t } = useTranslation();

  // Rehydrated rows short-circuit the fetch entirely — that's the whole point of
  // persisting them.
  const [rows, setRows] = useState(() => savedRows || null);
  const [loading, setLoading] = useState(() => !savedRows);
  const [cost, setCost] = useState(null);
  const [charged, setCharged] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  // React 18 StrictMode double-mounts in dev. Without this guard that's two model calls
  // and two charges for one card.
  const fetched = useRef(!!savedRows);

  const selectAllChanged = (list) =>
    setSelected(
      new Set(list.map((r, i) => (r.changed && !r.blocked ? i : -1)).filter((i) => i >= 0))
    );

  const run = useCallback(
    async (isReroll) => {
      setLoading(true);
      try {
        const res = await CVService.studioRewriteRole({ draftId, section, sortId, model });
        const list = res?.rows || [];
        setRows(list);
        setCost(res?.cost ?? null);
        setCharged(!!res?.charged);
        selectAllChanged(list);
        onLoaded?.(list);
      } catch (err) {
        const code = err?.response?.data?.code;
        if (code === 'INSUFFICIENT_CREDITS')
          toast.error(
            t('ariaStudio.chat.notEnoughCredits', t('cvBuilder.askAria.notEnoughCredits'))
          );
        else if (code === 'NOTHING_TO_REWRITE') {
          // No bullets to sharpen — the interview is the right tool, so say so and go.
          onInterview?.();
          return;
        } else toast.error(err?.response?.data?.message || t('cvBuilder.askAria.couldntGenerate'));
        if (!isReroll) onBack?.();
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draftId, section, sortId, model]
  );

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    run(false);
  }, [run]);

  if (loading)
    return (
      <AriaCard cardKey="rewriterole">
        <AriaThinking variant="draft" label={t('ariaStudio.rewriteRole.generating')} />
      </AriaCard>
    );

  const list = rows || [];
  const changedRows = list.filter((r) => r.changed && !r.blocked);
  const blockedRows = list.filter((r) => r.blocked);
  const nothingToDo = changedRows.length === 0 && blockedRows.length === 0;
  const rerollCost = cost ?? 1;

  const toggle = (i) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const apply = () => {
    const idx = [...selected].filter((i) => list[i]?.changed && !list[i]?.blocked);
    onApply?.(
      idx.map((i) => list[i].after),
      idx.map((i) => list[i].before)
    );
  };

  return (
    <AriaCard cardKey="rewriterole">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.rewriteRole.title')}
          </p>
          {/* The price badge appears ONLY when a credit was actually spent. The server
              returns charged:false when every bullet came back unchanged (no work, no
              charge), and a "−1 cr" chip over that result would claim a charge that never
              happened. */}
          {charged && (
            <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              −{cost ?? 1} cr
            </span>
          )}
        </div>

        <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
          {nothingToDo
            ? t('ariaStudio.rewriteRole.nothingToImprove')
            : t('ariaStudio.rewriteRole.intro')}
        </p>

        <div className="mt-3 space-y-2">
          {list.map((row, i) => {
            // Unchanged: ONE line, not a before/after pair of the same sentence.
            if (!row.blocked && !row.changed)
              return (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 p-2.5"
                >
                  <p className="font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {t('ariaStudio.rewriteRole.unchanged')}
                  </p>
                  <p className="mt-1 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {row.before}
                  </p>
                </div>
              );

            // Blocked: a missing FACT, so there is nothing to accept. Never an `after`.
            if (row.blocked)
              return (
                <div
                  key={i}
                  className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-2.5"
                >
                  <p className="font-mono text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {t('ariaStudio.rewriteRole.blocked', { reason: row.blockedReason || '' })}
                  </p>
                  <p className="mt-1 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {row.before}
                  </p>
                </div>
              );

            const on = selected.has(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                className={`w-full text-left flex gap-2.5 p-2.5 rounded-xl border transition-colors ${
                  on
                    ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${
                    on
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t('ariaStudio.rewriteRole.nowLabel')}
                  </span>
                  <span className="block text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">
                    {row.before}
                  </span>
                  <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {t('ariaStudio.rewriteRole.sharperLabel')}
                  </span>
                  <span className="block text-[16px] leading-relaxed text-slate-800 dark:text-slate-100">
                    {row.after}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onInterview}
              className="text-[14px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t('ariaStudio.rewriteRole.interviewInstead')}
            </button>
            {/* A blocked row is missing a FACT. Only the interview can add one, so that's
                where this goes too — a second reroll would just block again. */}
            {blockedRows.length > 0 && (
              <button
                type="button"
                onClick={onInterview}
                className="text-[14px] font-semibold px-3 py-1.5 rounded-full border border-dashed border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
              >
                {t('ariaStudio.rewriteRole.addDetails')}
              </button>
            )}
            {!nothingToDo && (
              <button
                type="button"
                onClick={() => run(true)}
                className="text-[14px] font-semibold px-3 py-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
              >
                {t('ariaStudio.rewriteRole.tryAnother', { cost: rerollCost })}
              </button>
            )}
          </div>

          {nothingToDo ? (
            <button
              type="button"
              onClick={onBack}
              className="text-[14px] font-semibold px-3 py-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            >
              {t('common.back')}
            </button>
          ) : (
            <button
              type="button"
              onClick={apply}
              disabled={applying || selected.size === 0}
              className="btn-primary px-5 py-2 text-[16px] disabled:opacity-50"
            >
              {applying
                ? t('ariaStudio.rewriteRole.applying')
                : t('ariaStudio.rewriteRole.applyN', { n: selected.size })}
            </button>
          )}
        </div>
      </div>
    </AriaCard>
  );
};

export default RewriteRoleCard;
