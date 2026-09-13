import React, { useEffect } from 'react';
import { History } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

// "Pick up where you left off?"
//
// A page load used to re-bind the last draft on its own, which dropped you back into the
// middle of a conversation you may have reloaded to get OUT of. Now the Studio comes up at
// its home and asks.
//
// THE FRAMING MATTERS MORE THAN THE BUTTONS. Nothing here is destructive and the copy has
// to say so plainly, or "Start fresh" reads as "throw my CV away". Declining only stops
// the Studio pointing at that draft; the CV, and the whole conversation on it, stay on the
// server and in the CV list either way.
//
// Continuing is the default action and takes the primary button: it is what someone who
// refreshed by accident wants, and it is the answer that costs nothing to change your
// mind about.
const ResumeSessionModal = ({ session, busy, onResume, onDismiss }) => {
  const { t } = useTranslation();

  // Escape declines. On DOCUMENT rather than the dialog: an onKeyDown on an unfocused div
  // never fires, so the handler would have looked right and done nothing.
  useEffect(() => {
    if (!session) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [session, onDismiss]);

  if (!session) return null;

  const name = session.title || t('ariaStudio.resumeSession.untitled');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-resume-title"
    >
      {/* Scrim — a real button, so dismissing by clicking outside is keyboard- and
          screen-reader-coherent rather than a click handler on a plain div. */}
      <button
        type="button"
        aria-label={t('ariaStudio.resumeSession.startFresh')}
        onClick={onDismiss}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <History className="h-6 w-6 text-slate-700 dark:text-slate-200" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="studio-resume-title"
              className="text-xl font-bold text-slate-900 dark:text-slate-100"
            >
              {t('ariaStudio.resumeSession.title')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <Trans
                i18nKey="ariaStudio.resumeSession.body"
                values={{ name }}
                components={{
                  b: <span className="font-semibold text-slate-800 dark:text-slate-100" />,
                }}
              />
            </p>
            {/* The reassurance is the point of this modal, not a footnote to it. */}
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {t('ariaStudio.resumeSession.safeEitherWay')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            disabled={busy}
            className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
          >
            {busy ? t('ariaStudio.resumeSession.opening') : t('ariaStudio.resumeSession.continue')}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="btn-secondary w-full py-2.5 text-sm disabled:opacity-50"
          >
            {t('ariaStudio.resumeSession.startFresh')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeSessionModal;
