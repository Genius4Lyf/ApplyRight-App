import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// PICKED A SIDEBAR TEMPLATE, AND THE CV RUNS LONG.
//
// A sidebar cannot paginate: buildPrintHtml pins it so Chrome repeats it on every page,
// which means a two-page CV prints the same rail twice with different text beside it. It
// is not broken, but it is rarely what anyone wants, and until now nothing said so.
//
// Fires ONCE, on a deliberate pick, and never on arrival — a standing complaint about a
// template someone already chose is nagging. It computes NOTHING: `pageCount` is handed in
// from the page, and every remedy here is a handler LengthCoach already owns (lib/cvDesignAts
// says LengthCoach owns the page-count opinion, and this does not add a second one).
//
// `fitState` drives the second act. "Trim it to one page" runs the fit ladder, which on
// these templates is weaker than usual — the text-size rung is inert on any sidebar
// template (supportsTypeScale) — so when it cannot fit, the dialog stays open and offers
// the two content-level trims instead of silently doing nothing.
const SidebarFitWarning = ({
  open,
  pageCount,
  templateName,
  fitState = 'idle', // 'idle' | 'partial'
  onContinue,
  onFitOnePage,
  onShortenSummary,
  onTrimRoles,
  canTrimSummary = false,
  canTrimRoles = false,
  onPickAnother,
  onClose,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const partial = fitState === 'partial';

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        role="dialog"
        aria-label={t('cvStudio.sidebarFit.title')}
        className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('cvStudio.sidebarFit.eyebrow')}
        </p>
        <h3 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('cvStudio.sidebarFit.title')}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {/* `pages`, not `count`: i18next reserves `count` for pluralisation and would
              leave a bare key unresolved. This dialog only ever appears at two pages or
              more, so the plural wording is always right. */}
          {partial
            ? t('cvStudio.sidebarFit.fitPartial', { pages: pageCount })
            : t('cvStudio.sidebarFit.body', { templateName, pages: pageCount })}
        </p>

        <div className="mt-5 space-y-2">
          {/* After a fit that could not get there, the two CONTENT trims take over — the
              same ones the length coach offers, because a CV that will not compress has to
              lose words, not points of leading. */}
          {partial ? (
            <>
              {canTrimSummary && (
                <button
                  type="button"
                  onClick={onShortenSummary}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {t('cvStudio.lengthCoach.shortenSummary')}
                </button>
              )}
              {canTrimRoles && (
                <button
                  type="button"
                  onClick={onTrimRoles}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t('cvStudio.lengthCoach.trimRoles')}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onFitOnePage}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {t('cvStudio.sidebarFit.fit')}
            </button>
          )}

          <button
            type="button"
            onClick={onPickAnother}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('cvStudio.sidebarFit.pickAnother')}
          </button>

          {/* Deliberately the quietest control and never removed: the layout is a taste
              call, and someone who wants a two-page sidebar CV is allowed to have one. */}
          <button
            type="button"
            onClick={onContinue}
            className="w-full px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {t('cvStudio.sidebarFit.continue')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SidebarFitWarning;
