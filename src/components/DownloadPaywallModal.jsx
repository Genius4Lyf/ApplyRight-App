import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Download, Crown, X } from 'lucide-react';
import billingService from '../services/billing.service';
import { toast } from 'sonner';

// Shown when a download is blocked (free taste used up). Two ways forward:
//   - one-time ₦500 single-download pass (Flutterwave hosted checkout)
//   - any paid subscription (unlimited downloads)
const DownloadPaywallModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const buySingle = async () => {
    setLoading(true);
    try {
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
          Download this CV
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          You’ve used your free download. Grab this CV as a clean PDF for ₦500, or go unlimited with
          a plan.
        </p>

        <button
          onClick={buySingle}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Download className="w-5 h-5" /> Pay ₦500 — download
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
