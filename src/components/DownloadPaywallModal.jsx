import React, { useState } from 'react';
import AriaLoader from './ui/AriaLoader';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Download, Crown, X, FileCheck2, ScanLine, Sparkles, ShieldCheck } from 'lucide-react';
import billingService from '../services/billing.service';
import { toast } from 'sonner';
import { formatNgn, formatUsd, DOWNLOAD_PASS } from '../lib/plans';
import useBillingRegion from '../hooks/useBillingRegion';

// Shown when a download is blocked (no pass / not subscribed). Two ways forward:
//   - one-time single-download pass (DOWNLOAD_PASS, Flutterwave hosted checkout)
//   - any paid subscription (unlimited downloads)
// The copy sells the real PDF over a screenshot: ATS-readable selectable text,
// crisp print quality, exact template formatting.
const DownloadPaywallModal = ({ open, onClose, templateId }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { currency: regionCurrency, showToggle, resolved, overrideToNigeria } = useBillingRegion();
  // The user's explicit toggle pick, if any — takes priority over the resolved
  // region. Derived (not effect-synced): null before resolve means the price
  // renders as a skeleton instead of possibly snapping currency mid-load.
  const [manualCurrency, setManualCurrency] = useState(null);
  const currency = manualCurrency ?? (resolved ? regionCurrency : null);

  const handleNigeriaOverride = () => {
    overrideToNigeria();
    setManualCurrency('NGN');
  };

  if (!open) return null;

  const priceReady = currency != null;
  const price = !priceReady
    ? null
    : currency === 'USD'
      ? formatUsd(DOWNLOAD_PASS.priceUsd)
      : formatNgn(DOWNLOAD_PASS.priceNgn);

  const buySingle = async () => {
    setLoading(true);
    try {
      // Stash where we are so BillingReturn sends the user back to this exact CV
      // page (with ?paid=1) after paying, instead of the dashboard. The download
      // page auto-fires the download on return — this is a one-time pass, so we
      // deliver the PDF immediately rather than making them hunt for it again.
      try {
        localStorage.setItem('arPostCheckout', window.location.pathname);
        localStorage.setItem('arCheckoutIntent', 'download');
        localStorage.setItem('arCheckoutOrigin', window.location.pathname);
        if (templateId) localStorage.setItem('arCheckoutTemplateId', templateId);
      } catch {
        /* non-fatal — falls back to the dashboard */
      }
      const { link } = await billingService.checkout('download_single', currency);
      if (!link) throw new Error('No link');
      window.location.href = link; // hosted checkout; returns to /billing/return
    } catch (e) {
      console.error(e);
      toast.error(t('billing.common.checkoutFailed'));
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 mb-4">
          <Download className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
          {t('billing.downloadPaywall.title')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {priceReady ? (
            t('billing.downloadPaywall.subtitle', { price })
          ) : (
            <span className="inline-block h-4 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse align-middle" />
          )}
        </p>

        {/* Currency toggle — NG or unresolved geo only; foreign visitors get
            the quiet "Paying from Nigeria?" escape hatch instead. */}
        {resolved && showToggle && (
          <div className="flex justify-center gap-1 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-full w-fit mx-auto">
            <button
              type="button"
              onClick={() => setManualCurrency('NGN')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                currency === 'NGN'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t('billing.common.currencyNgn')}
            </button>
            <button
              type="button"
              onClick={() => setManualCurrency('USD')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                currency === 'USD'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t('billing.common.currencyUsd')}
            </button>
          </div>
        )}
        {resolved && !showToggle && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={handleNigeriaOverride}
              className="text-sm text-slate-500 hover:underline underline-offset-2"
            >
              {t('billing.common.payingFromNigeria')}
            </button>
          </div>
        )}

        <ul className="space-y-2 mb-5">
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <ScanLine className="w-4 h-4 text-slate-900 dark:text-slate-100 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">{t('billing.downloadPaywall.atsTitle')}</span>{' '}
              {t('billing.downloadPaywall.atsBody')}
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <FileCheck2 className="w-4 h-4 text-slate-900 dark:text-slate-100 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">{t('billing.downloadPaywall.crispTitle')}</span>{' '}
              {t('billing.downloadPaywall.crispBody')}
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-slate-900 dark:text-slate-100 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">{t('billing.downloadPaywall.fastTitle')}</span>{' '}
              {t('billing.downloadPaywall.fastBody')}
            </span>
          </li>
        </ul>

        <button
          onClick={buySingle}
          disabled={loading || !priceReady}
          className="w-full py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? (
            <AriaLoader inline tone="mono" size={16} label={t('billing.common.starting')} />
          ) : priceReady ? (
            <>
              <Download className="w-5 h-5" /> {t('billing.downloadPaywall.payCta', { price })}
            </>
          ) : (
            <AriaLoader inline tone="mono" size={16} label={t('billing.common.starting')} />
          )}
        </button>

        <button
          onClick={() => navigate('/upgrade')}
          className="mt-3 w-full py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
        >
          <Crown className="w-5 h-5 text-amber-500" /> {t('billing.downloadPaywall.unlimitedCta')}
        </button>

        <div className="flex items-start gap-2 mt-4 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <Trans
              i18nKey="billing.common.paymentTrustNote"
              components={{
                mail: (
                  <a
                    href="mailto:careers@applyright.com.ng"
                    className="underline hover:no-underline"
                  />
                ),
              }}
            />
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DownloadPaywallModal;
