import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { X, PenTool, Eye } from 'lucide-react';
import CVUploader from '../CVUploader';
import CreditGate from '../CreditGate';
import useInterstitial from '../../hooks/useInterstitial';
import { CREDIT_COSTS } from '../../lib/credits';

// TURN AN EXISTING CV INTO A BUILDER DRAFT.
//
// This flow used to live inline on the dashboard, and was the only thing on that page
// that actually DID something rather than pointing somewhere. The dashboard is gone, so
// it moved here — into the New CV menu, beside the two other ways to start a CV, which
// is where someone looking for it would have looked first anyway.
//
// It is ported rather than rewritten: same endpoint, same price, same CV-health result
// with the same two exits, and the same i18n keys — so it stays translated in both
// languages without a single new string.
//
// A MODAL, and portaled to the body, because the menu that opens it lives inside a
// sidebar that is itself a focus-trapped drawer on a narrow screen. Hosts close that
// drawer before opening this (see useWorkspaceSidebar), so the two traps never stack —
// which is how a dialog ends up unclosable on a phone.

const bandClass = (score) =>
  score >= 75
    ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

// MOUNTED ONLY WHILE OPEN (the hook renders it conditionally), so there is no `open`
// prop and no reset effect: closing unmounts, and reopening starts at the file picker
// rather than on the last CV's score. Resetting through an effect on an `open` prop is
// the same behaviour written as a cascading render, which the lint rule is right about.
const UploadCvModal = ({ onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { triggerInterstitial } = useInterstitial();

  // The draft the upload produced, and the scan that came back with it. Null while the
  // picker is still on screen — which is what switches this between its two phases.
  const [draftId, setDraftId] = useState(null);
  const [readiness, setReadiness] = useState(null);

  // Escape closes, like every other dialog in the app. Not a full focus trap: this is a
  // portaled dialog over a page whose own drawer has already been dismissed, and the
  // trap that matters (the sidebar's) is the one we deliberately avoided nesting inside.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Keep the wallet honest everywhere at once: the navbar and the sidebar both listen for
  // this event, and localStorage is what survives a refresh.
  const updateCredits = (balance) => {
    if (balance === undefined || balance === null) return;
    window.dispatchEvent(new CustomEvent('credit_updated', { detail: balance }));
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      stored.credits = balance;
      localStorage.setItem('user', JSON.stringify(stored));
      window.dispatchEvent(new Event('userDataUpdated'));
    } catch {
      // A privacy-restricted browser still gets the live balance via the event above.
    }
  };

  const go = (path, reason, state) => {
    // The completion moment. Fire-and-forget — navigation must not wait on an ad, and
    // this is a no-op on web and for paid accounts.
    triggerInterstitial(reason);
    onClose?.();
    navigate(path, state ? { state } : undefined);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('dashboard.createModal.uploadTitle')}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        {!draftId ? (
          <>
            <div className="mb-8 text-center">
              <h3 className="font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('dashboard.setup.uploadTitle')}
              </h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                {t('dashboard.setup.uploadBody')}
              </p>
            </div>

            {/* The price BEFORE the file picker, the same way the Studio's upload card
                states it — so nobody chooses a file, waits, and only then learns the cost. */}
            <div className="pb-4 text-center">
              <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                {t('ariaStudio.buildRoadmap.uploadCost', { n: CREDIT_COSTS.CREATE_FROM_UPLOAD })}
              </span>
            </div>

            <CreditGate cost={CREDIT_COSTS.CREATE_FROM_UPLOAD}>
              <CVUploader
                endpoint="/resumes/upload-and-create"
                onUploadSuccess={(data) => {
                  if (!data?.draftId) {
                    toast.error(t('dashboard.toasts.resumeParseFailed'));
                    return;
                  }
                  setDraftId(data.draftId);
                  setReadiness(data.atsReadiness || null);
                  updateCredits(data.remainingCredits);
                }}
                onError={(errorData) => {
                  // CreditGate blocks this up front, so reaching here means the balance
                  // moved between the preflight and the click — a parallel tab spending
                  // some, usually. Say what happened rather than failing silently.
                  if (errorData?.code === 'INSUFFICIENT_CREDITS') {
                    toast.error(
                      t('jobHistory.errors.insufficientCredits', {
                        required: errorData.required,
                        current: errorData.current,
                      })
                    );
                  }
                }}
              />
            </CreditGate>
          </>
        ) : (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
              ✓ CV scanned
            </p>
            <h3 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
              {t('dashboard.health.title')}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.health.body')}
            </p>

            {readiness && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      {t('dashboard.health.scoreLabel')}
                    </p>
                    <p
                      className={`mt-1 font-heading text-lg font-bold ${bandClass(readiness.score)}`}
                    >
                      {readiness.score >= 75
                        ? t('dashboard.verdict.wellStructured')
                        : readiness.score >= 50
                          ? t('dashboard.verdict.gettingThere')
                          : t('dashboard.verdict.needsWork')}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-heading text-4xl font-bold leading-none tabular-nums ${bandClass(
                      readiness.score
                    )}`}
                  >
                    {readiness.score}
                  </span>
                </div>

                {/* Band rail — needs-work / getting-there / strong, with a marker pin. */}
                <div className="mt-4">
                  <div className="relative">
                    <div className="grid h-2 grid-cols-[50fr_25fr_25fr] gap-0.5 overflow-hidden rounded-full">
                      <span className="bg-rose-500/45" />
                      <span className="bg-amber-500/45" />
                      <span className="bg-emerald-500/45" />
                    </div>
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 h-3 w-0.5 -translate-x-1/2 rounded bg-slate-900 dark:bg-slate-100"
                      style={{ left: `${Math.max(0, Math.min(100, readiness.score))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 grid grid-cols-[50fr_25fr_25fr] gap-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                    <span>{t('dashboard.health.needsWork')}</span>
                    <span className="text-center">{t('dashboard.health.gettingThere')}</span>
                    <span className="text-right">{t('dashboard.health.strong')}</span>
                  </div>
                </div>

                {readiness.checks?.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {readiness.checks.slice(0, 6).map((check, i) => (
                      <div key={i} className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            check.passed
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                          }`}
                        >
                          {check.passed ? '✓' : '✕'}
                        </span>
                        <span
                          className={`truncate text-xs ${
                            check.passed
                              ? 'text-slate-500 dark:text-slate-400'
                              : 'font-semibold text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => go(`/cv-builder/${draftId}`, 'upload_edit_in_builder')}
                className="btn-primary w-full gap-2 rounded-xl py-3.5"
              >
                <PenTool className="h-5 w-5" /> {t('dashboard.health.editInBuilder')}
              </button>
              <button
                type="button"
                onClick={() =>
                  go(`/resume/${draftId}`, 'upload_ats_preview', { atsReadiness: readiness })
                }
                className="flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              >
                <Eye className="h-4 w-4" /> {t('dashboard.health.skipToPreview')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default UploadCvModal;
