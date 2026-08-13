import React, { useCallback, useEffect, useState } from 'react';
import AriaLoader from '../components/ui/AriaLoader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import billingService from '../services/billing.service';
import { toast } from 'sonner';

// Flutterwave redirects here after hosted checkout with query params:
//   ?status=successful|cancelled&tx_ref=AR-...&transaction_id=123456
// We verify server-side (the webhook may not have landed yet) and reflect the
// new entitlement, then send the user back to the dashboard.
const BillingReturn = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [state, setState] = useState('verifying'); // verifying | success | failed
  const [entitlement, setEntitlement] = useState(null);

  // Where to send the user after a successful payment. A flow that stashed a path
  // (e.g. the live-interview Practice Pass) returns there with ?paid=1 so the page
  // can pick up + auto-start; everything else lands on the dashboard. Read once.
  const [returnTo] = useState(() => {
    try {
      return localStorage.getItem('arPostCheckout') || null;
    } catch {
      return null;
    }
  });
  // What kind of purchase this was, so we can tailor the copy (a CV-download pass
  // reads very differently from a subscription or interview minutes). Read once.
  const [intent] = useState(() => {
    try {
      return localStorage.getItem('arCheckoutIntent') || null;
    } catch {
      return null;
    }
  });
  const isDownloadReturn = intent === 'download';
  // Where to send the user after a FAILED/cancelled payment — the exact page the
  // checkout was started from, stashed at every checkout call site. Separate from
  // `returnTo` above (which is deliberately unset for some success flows). Read once.
  const [failedReturnTo] = useState(() => {
    try {
      return localStorage.getItem('arCheckoutOrigin') || null;
    } catch {
      return null;
    }
  });

  const successPath = (() => {
    if (!returnTo) return '/dashboard';
    const hashIndex = returnTo.indexOf('#');
    const pathAndQuery = hashIndex === -1 ? returnTo : returnTo.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : returnTo.slice(hashIndex);
    const separator = pathAndQuery.includes('?') ? '&' : '?';
    return `${pathAndQuery}${separator}paid=1${hash}`;
  })();
  const isInterviewReturn = !!returnTo && returnTo.includes('/mock');
  const isWorkspaceReturn =
    !!returnTo && (returnTo.startsWith('/cv-builder/') || returnTo.startsWith('/aria-studio'));
  const goToSuccess = useCallback(() => {
    try {
      localStorage.removeItem('arPostCheckout');
      localStorage.removeItem('arCheckoutIntent');
      localStorage.removeItem('arCheckoutOrigin');
    } catch {
      /* non-fatal */
    }
    navigate(successPath);
  }, [navigate, successPath]);

  useEffect(() => {
    const status = params.get('status');
    const txRef = params.get('tx_ref');
    const transactionId = params.get('transaction_id');

    if (status === 'cancelled' || !txRef) {
      setState('failed');
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await billingService.pollVerifyUntilSettled({ txRef, transactionId });
      if (cancelled) return;

      if (result?.status === 'successful') {
        // Reflect new tier/plan in the stored user so gated UI updates immediately.
        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          if (result.entitlement) {
            stored.tier = result.entitlement.tier;
            stored.plan = result.entitlement.plan || stored.plan;
            localStorage.setItem('user', JSON.stringify(stored));
            window.dispatchEvent(new Event('credit_updated'));
            window.dispatchEvent(new Event('entitlement_updated'));
          }
        } catch {
          /* non-fatal */
        }
        setEntitlement(result.entitlement);

        // A paid CV download returns straight to CV Studio. Studio owns the file
        // handoff and waits for its rendered preview before starting the download.
        if (isDownloadReturn) {
          goToSuccess();
          return;
        }

        setState('success');
        toast.success(t('billing.return.toastPlan'));
        setTimeout(goToSuccess, 2200);
      } else {
        setState('failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, goToSuccess, isDownloadReturn, t]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 sm:p-10 text-center">
        {state === 'verifying' && (
          <>
            <AriaLoader
              inline
              size={48}
              label={t('billing.return.verifyingTitle')}
              className="mb-4"
            />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('billing.return.verifyingTitle')}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('billing.return.verifyingBody')}
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t('billing.return.successTitle')}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isDownloadReturn
                ? t('billing.return.successDownload')
                : isInterviewReturn
                  ? t('billing.return.successInterview', {
                      n: entitlement?.minutesRemaining ?? '',
                    })
                  : entitlement?.minutesRemaining
                    ? t('billing.return.successMinutes', { n: entitlement.minutesRemaining })
                    : t('billing.return.successPlan')}
            </p>
            <button
              onClick={goToSuccess}
              className="mt-6 w-full py-3 rounded-xl font-bold bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:opacity-90 transition-colors"
            >
              {isDownloadReturn
                ? t('billing.return.ctaDownload')
                : isInterviewReturn
                  ? t('billing.return.ctaInterview')
                  : isWorkspaceReturn
                    ? t('billing.return.backToOrigin')
                    : t('billing.return.ctaDashboard')}
            </button>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle className="w-14 h-14 text-rose-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('billing.return.failedTitle')}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('billing.return.failedBody')}
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('arCheckoutOrigin');
                  localStorage.removeItem('arCheckoutTemplateId');
                } catch {
                  /* non-fatal */
                }
                navigate(failedReturnTo || '/upgrade');
              }}
              className="mt-6 w-full py-3 rounded-xl font-bold bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:opacity-90 transition-colors"
            >
              {failedReturnTo ? t('billing.return.backToOrigin') : t('billing.return.backToPlans')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BillingReturn;
