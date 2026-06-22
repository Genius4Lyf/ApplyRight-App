import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import billingService from '../services/billing.service';
import { toast } from 'sonner';

// Flutterwave redirects here after hosted checkout with query params:
//   ?status=successful|cancelled&tx_ref=AR-...&transaction_id=123456
// We verify server-side (the webhook may not have landed yet) and reflect the
// new entitlement, then send the user back to the dashboard.
const BillingReturn = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [state, setState] = useState('verifying'); // verifying | success | failed
  const [entitlement, setEntitlement] = useState(null);

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
        setState('success');
        toast.success('Payment confirmed — your plan is active!');
        setTimeout(() => navigate('/dashboard'), 2200);
      } else {
        setState('failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-10 text-center">
        {state === 'verifying' && (
          <>
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Confirming your payment…
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This takes a few seconds. Please don’t close this page.
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">You’re all set!</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {entitlement?.minutesRemaining != null
                ? `${entitlement.minutesRemaining} live interview minutes are ready.`
                : 'Your plan is now active.'}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              Go to dashboard
            </button>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle className="w-14 h-14 text-rose-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Payment not confirmed
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              If you were charged, it will reflect shortly — check your plan on the pricing page. You
              were not charged for a cancelled payment.
            </p>
            <button
              onClick={() => navigate('/upgrade')}
              className="mt-6 w-full py-3 rounded-xl font-bold bg-slate-900 dark:bg-indigo-600 text-white hover:opacity-90 transition-colors"
            >
              Back to plans
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BillingReturn;
