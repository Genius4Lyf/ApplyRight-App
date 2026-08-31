import React, { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

// What deleting a row actually destroys depends entirely on which kind it is, so the
// confirm does too:
//
//   TAILORING   → a disposable copy, regenerable in two minutes from its source. Plain
//                 delete, named so they know which one.
//   BUILD       → the master CV they may have spent twenty minutes writing. Deleting it
//                 from a hover trash icon would be a trap, so the SAFE option
//                 ("Remove from Studio" — keeps the CV, drops it from the rail) is the
//                 default, with the real delete demoted to a secondary destructive action.
//   APPLICATION → a job analysis. It costs credits to run again, which is worth saying,
//                 but it holds no writing of the user's — so a plain delete, and no
//                 "remove from Studio": an analysis has no life outside the Studio to be
//                 removed to.
//
// The asymmetry is deliberate: the three objects genuinely differ in value, and a single
// uniform confirm would either over-warn on copies or under-warn on masters.
const DeleteSessionModal = ({ session, busy, onCancel, onRemove, onDelete }) => {
  const { t } = useTranslation();
  // Escape closes it. On DOCUMENT, not the scrim: an onKeyDown on an unfocused div
  // never fires, so the handler would have looked right and done nothing.
  useEffect(() => {
    if (!session) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [session, onCancel]);

  if (!session) return null;

  const isBuild = session.kind === 'build';
  const isApplication = session.kind === 'application';
  const name = session.jobTitle || session.title || t('ariaStudio.deleteSession.untitledSession');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 dark:bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-delete-title"
    >
      {/* Scrim — a real button so dismissing by clicking outside is keyboard- and
          screen-reader-coherent rather than a click handler on a plain div. */}
      <button
        type="button"
        aria-label={t('common.cancel')}
        onClick={onCancel}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="studio-delete-title"
              className="text-xl font-bold text-slate-900 dark:text-slate-100"
            >
              {isBuild
                ? t('ariaStudio.deleteSession.removeThisCv')
                : isApplication
                  ? t('ariaStudio.deleteSession.deleteThisAnalysis')
                  : t('ariaStudio.deleteSession.deleteThisTailoring')}
            </h3>

            {isApplication ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <Trans
                  i18nKey="ariaStudio.deleteSession.applicationBody"
                  values={{ name }}
                  components={{
                    b: <span className="font-semibold text-slate-800 dark:text-slate-100" />,
                  }}
                />{' '}
                {t('ariaStudio.deleteSession.cannotUndo')}
              </p>
            ) : isBuild ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <Trans
                  i18nKey="ariaStudio.deleteSession.buildBody"
                  values={{ name }}
                  components={{
                    b: <span className="font-semibold text-slate-800 dark:text-slate-100" />,
                  }}
                />
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <Trans
                  i18nKey="ariaStudio.deleteSession.tailorBody"
                  values={{ name }}
                  components={{
                    b: <span className="font-semibold text-slate-800 dark:text-slate-100" />,
                  }}
                />
                {session.sourceTitle ? (
                  <>
                    {' '}
                    <Trans
                      i18nKey="ariaStudio.deleteSession.originalNotAffected"
                      values={{ source: session.sourceTitle }}
                      components={{
                        b: <span className="font-semibold text-slate-800 dark:text-slate-100" />,
                      }}
                    />
                  </>
                ) : null}{' '}
                {t('ariaStudio.deleteSession.cannotUndo')}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {/* Build: the SAFE action leads. */}
          {isBuild && (
            <button
              type="button"
              onClick={() => onRemove?.(session)}
              disabled={busy}
              className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
            >
              {busy === 'remove'
                ? t('ariaStudio.deleteSession.removing')
                : t('ariaStudio.deleteSession.removeKeepCv')}
            </button>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="btn-secondary flex-1 py-2.5 text-sm disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(session)}
              disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              {busy === 'delete'
                ? t('ariaStudio.deleteSession.deleting')
                : isBuild
                  ? t('ariaStudio.deleteSession.deleteEntirely')
                  : isApplication
                    ? t('common.delete')
                    : t('ariaStudio.deleteSession.deleteOnly')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteSessionModal;
