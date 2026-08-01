import React, { useEffect, useState } from 'react';
import AriaLoader from '../ui/AriaLoader';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CVService from '../../services/cv.service';
import { CREDIT_COSTS } from '../../lib/credits';

// Inline "tighten your summary" modal for the CV Studio. Edit the professional
// summary directly, or ask the AI to rewrite it shorter (charges 1 credit; paid
// tiers draw from their allowance). Editorial styling: flat hairline card,
// font-mono eyebrow, font-heading title — no gradients/glows.
const LONG_HINT = 320; // chars beyond which we nudge the count amber

const SummaryTrim = ({ open, currentSummary, onApply, onClose }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(currentSummary || '');
  const [proposal, setProposal] = useState(null); // AI rewrite awaiting a decision
  const [loading, setLoading] = useState(false);

  // Reset local state each time the modal opens.
  useEffect(() => {
    if (open) {
      setText(currentSummary || '');
      setProposal(null);
      setLoading(false);
    }
  }, [open, currentSummary]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const trimmed = text.trim();
  const overLong = text.length > LONG_HINT;
  const applyDisabled = trimmed === '' || trimmed === (currentSummary || '').trim();

  const handleTighten = async () => {
    if (loading || !trimmed) return;
    setLoading(true);
    try {
      const data = await CVService.tightenSummary(text);
      setProposal(typeof data?.tightened === 'string' ? data.tightened : '');
      // Keep the wallet pill in sync (backend never charges on failure).
      if (typeof data?.remainingCredits === 'number') {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: data.remainingCredits }));
      }
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 503) {
        toast.error(t('cvBuilder.summaryTrim.aiUnavailable'));
      } else if (status === 403 && code === 'INSUFFICIENT_CREDITS') {
        toast.error(t('cvBuilder.summaryTrim.notEnoughCredits'));
      } else {
        toast.error(t('cvBuilder.summaryTrim.couldntTighten'));
      }
    } finally {
      setLoading(false);
    }
  };

  const useProposal = () => {
    if (typeof proposal === 'string') setText(proposal);
    setProposal(null);
  };

  const handleApply = () => {
    onApply(trimmed);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        role="dialog"
        aria-label={t('cvBuilder.summaryTrim.title')}
        className="relative w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('cvBuilder.summaryTrim.eyebrow')}
        </p>
        <h3 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('cvBuilder.summaryTrim.title')}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('cvBuilder.summaryTrim.subtitle')}
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={t('cvBuilder.summaryTrim.placeholder')}
          className="mt-4 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-[16px] sm:text-sm leading-relaxed text-slate-900 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
          <span className="text-slate-400 dark:text-slate-500">
            {t('cvBuilder.summaryTrim.aim')}
          </span>
          <span
            className={
              overLong
                ? 'text-amber-600 dark:text-amber-400 tabular-nums'
                : 'text-slate-400 dark:text-slate-500 tabular-nums'
            }
          >
            {t('cvBuilder.summaryTrim.charCount', { n: text.length })}
          </span>
        </div>

        {/* Tighten with AI */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleTighten}
            disabled={loading || !trimmed}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            {loading ? (
              <>
                <AriaLoader inline tone="mono" size={16} label="" />{' '}
                {t('cvBuilder.summaryTrim.tightening')}
              </>
            ) : (
              <>
                {t('cvBuilder.summaryTrim.tightenWithAi')}
                <span className="inline-flex items-center rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                  {t('cvBuilder.common.creditChip', { n: CREDIT_COSTS.TIGHTEN_SUMMARY })}
                </span>
              </>
            )}
          </button>
        </div>

        {/* AI proposal — thin neutral left-accent, editable-on-accept */}
        {proposal !== null && (
          <div className="mt-4 border-l-2 border-slate-300 dark:border-slate-600 pl-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('cvBuilder.summaryTrim.suggestedRewrite')}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {proposal || t('cvBuilder.summaryTrim.emptyRewrite')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={useProposal}
                disabled={!proposal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white disabled:opacity-60 text-xs font-semibold px-3 py-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> {t('cvBuilder.summaryTrim.useThis')}
              </button>
              <button
                type="button"
                onClick={() => setProposal(null)}
                className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs font-semibold px-3 py-1.5 transition-colors"
              >
                {t('cvBuilder.summaryTrim.keepMine')}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-semibold px-4 py-2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applyDisabled}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold px-4 py-2 transition-colors"
          >
            {t('cvBuilder.summaryTrim.apply')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SummaryTrim;
