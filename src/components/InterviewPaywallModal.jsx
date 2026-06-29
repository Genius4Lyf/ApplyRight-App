import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Mic, Crown, X, ClipboardCheck, MessagesSquare, Sparkles } from 'lucide-react';
import billingService from '../services/billing.service';
import { toast } from 'sonner';

// Shown when a free user who's used their free taste taps "Start" again — the
// peak "I want to practice NOW" moment. Two ways forward:
//   - one-time ₦600 Practice Pass (5 min, a full scored solo run) — the impulse buy
//   - any paid subscription (the 3-person panel, longer sessions, sharper voices)
// Deliberately NOT shown on /upgrade: the Pass anchors low next to the plans and
// would cannibalise subscriptions, so it only lives at high-intent flow moments.
const InterviewPaywallModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const buyPass = async () => {
    setLoading(true);
    try {
      // Stash this interview page so BillingReturn sends the buyer back here (and
      // auto-starts) rather than to the dashboard — the redirect wipes React state.
      localStorage.setItem('arPostCheckout', window.location.pathname);
      const { link } = await billingService.checkout('practice_pass', 'NGN');
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
          <Mic className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
          Run a scored mock interview
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          You’ve used your free taste. For ₦1,000 do a full 10-minute mock interview that comes with
          a real scored review:
        </p>

        <ul className="space-y-2 mb-5">
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <MessagesSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">A real voice interview</span> — talk it through with
              the AI interviewer, just like the real thing.
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <ClipboardCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">A scored review</span> — your readiness score,
              per-answer feedback, and exactly what to fix.
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">No subscription</span> — one-off, pay only when you
              want to practice.
            </span>
          </li>
        </ul>

        <button
          onClick={buyPass}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Mic className="w-5 h-5" /> Practice now — ₦1,000 Pass
            </>
          )}
        </button>

        <button
          onClick={() => navigate('/upgrade')}
          className="mt-3 w-full py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
        >
          <Crown className="w-5 h-5 text-amber-500" /> Practice often — see plans
        </button>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          One-time payment via Flutterwave. After paying you’ll return here to start.
        </p>
      </div>
    </div>,
    document.body
  );
};

export default InterviewPaywallModal;
