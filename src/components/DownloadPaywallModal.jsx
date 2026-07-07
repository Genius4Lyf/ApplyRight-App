import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Download, Crown, X, FileCheck2, ScanLine, Sparkles } from 'lucide-react';
import billingService from '../services/billing.service';
import { toast } from 'sonner';

// Shown when a download is blocked (no pass / not subscribed). Two ways forward:
//   - one-time ₦750 single-download pass (Flutterwave hosted checkout)
//   - any paid subscription (unlimited downloads)
// The copy sells the real PDF over a screenshot: ATS-readable selectable text,
// crisp print quality, exact template formatting.
const DownloadPaywallModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!open) return null;

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
      } catch {
        /* non-fatal — falls back to the dashboard */
      }
      const { link } = await billingService.checkout('download_single');
      if (!link) throw new Error('No link');
      window.location.href = link; // hosted checkout; returns to /billing/return
    } catch (e) {
      console.error(e);
      toast.error('Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 mb-4">
          <Download className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
          Get the recruiter-ready PDF
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          A screenshot is just a picture — applicant tracking systems can’t read it, and it prints
          blurry. For ₦750 you get the real thing:
        </p>

        <ul className="space-y-2 mb-5">
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <ScanLine className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">ATS-readable</span> — real selectable text the hiring
              software can actually parse (screenshots get auto-rejected).
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <FileCheck2 className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">Pixel-perfect</span> — exact template formatting,
              crisp at any size, no cut-offs or fuzzy print.
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">Send-ready in one tap</span> — no retyping into
              another tool, no AI rebuild. Done in seconds.
            </span>
          </li>
        </ul>

        <button
          onClick={buySingle}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Download className="w-5 h-5" /> Pay ₦750 — download
            </>
          )}
        </button>

        <button
          onClick={() => navigate('/upgrade')}
          className="mt-3 w-full py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
        >
          <Crown className="w-5 h-5 text-amber-500" /> Go unlimited — see plans
        </button>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          One-time payment via Flutterwave. After paying you’ll return here to download.
        </p>
      </div>
    </div>,
    document.body
  );
};

export default DownloadPaywallModal;
