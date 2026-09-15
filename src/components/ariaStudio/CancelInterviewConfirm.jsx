import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, CircleSlash } from 'lucide-react';

// STOPPING AN INTERVIEW IS A DECISION ABOUT A ROLE, SO IT ASKS.
//
// Cancel used to take effect on the click. That was wrong in both directions: a misfire
// silently deleted a role Aria had just created, and there was no way to stop the
// interview while KEEPING a role that already had bullets on it.
//
// Two shapes, decided by whether the role has any bullets yet:
//
//   NO BULLETS — the role would sit on the CV as a heading with nothing under it, which
//   is the "Role / Company | -" bug by another route. It goes, and the dialog says so
//   plainly before it does, because the user may have typed a title they would rather
//   keep.
//
//   HAS BULLETS — their choice. Keep is the primary action and the safe one: those
//   bullets were written from their own answers, and some of them cost credits.
//
// Rendered through a portal because Cancel is reachable from the chat AND from the edit
// panel, which on a phone is a full-width sheet covering the chat entirely. An inline
// card would be invisible from one of its own triggers.
const CancelInterviewConfirm = ({
  open,
  entryTitle = '',
  bullets = 0,
  onKeep,
  onDelete,
  onBack,
}) => {
  const { t } = useTranslation();
  if (!open || typeof document === 'undefined') return null;

  const hasBullets = bullets > 0;
  const name = entryTitle.trim() || t('ariaStudio.cancelInterview.thisRole');

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('ariaStudio.cancelInterview.title')}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              hasBullets
                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
            }`}
          >
            {hasBullets ? <CircleSlash className="h-6 w-6" /> : <Trash2 className="h-6 w-6" />}
          </div>

          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('ariaStudio.cancelInterview.title')}
          </h3>

          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            {hasBullets
              ? t('ariaStudio.cancelInterview.bodyWithBullets', { name, count: bullets })
              : t('ariaStudio.cancelInterview.bodyEmpty', { name })}
          </p>

          {/* Stacked, not side by side: three choices in a row on a phone gives three
              cramped targets and hides which one is safe. */}
          <div className="flex w-full flex-col gap-2">
            {hasBullets && (
              <button
                type="button"
                onClick={onKeep}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {t('ariaStudio.cancelInterview.keep')}
              </button>
            )}

            <button
              type="button"
              onClick={onDelete}
              className={
                hasBullets
                  ? 'w-full rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40'
                  : 'w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700'
              }
            >
              {hasBullets
                ? t('ariaStudio.cancelInterview.deleteInstead')
                : t('ariaStudio.cancelInterview.deleteAndStop')}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {t('ariaStudio.cancelInterview.goBack')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CancelInterviewConfirm;
