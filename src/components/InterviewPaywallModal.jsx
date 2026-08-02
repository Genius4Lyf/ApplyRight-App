import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Mic, Crown, X, ClipboardCheck, MessagesSquare, Sparkles } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

// Shown when a free user who's used their free taste taps "Start" again — the
// peak "I want to practice NOW" moment. There is one way forward: a plan. The
// one-off Practice Pass that used to anchor this modal is retired (it undercut
// every minute top-up per minute and let free users reach the scorecard without
// subscribing), so the free offer is exactly the 5-minute taste and everything
// past it — minutes, the scored review, longer sessions — comes with a plan.
const InterviewPaywallModal = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label={t('interviewPrep.interviewPaywall.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 mb-4">
          <Mic className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
          {t('interviewPrep.interviewPaywall.title')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {t('interviewPrep.interviewPaywall.subtitle')}
        </p>

        <ul className="space-y-2 mb-5">
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <MessagesSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
            <span>
              <Trans
                i18nKey="interviewPrep.interviewPaywall.item1"
                components={{ b: <span className="font-semibold" /> }}
              />
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <ClipboardCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
            <span>
              <Trans
                i18nKey="interviewPrep.interviewPaywall.item2"
                components={{ b: <span className="font-semibold" /> }}
              />
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
            <span>
              <Trans
                i18nKey="interviewPrep.interviewPaywall.item3"
                components={{ b: <span className="font-semibold" /> }}
              />
            </span>
          </li>
        </ul>

        <button
          onClick={() => navigate('/upgrade')}
          className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition-colors flex items-center justify-center gap-2"
        >
          <Crown className="w-5 h-5" /> {t('interviewPrep.interviewPaywall.seePlans')}
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
        >
          {t('interviewPrep.interviewPaywall.notNow')}
        </button>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          {t('interviewPrep.interviewPaywall.footnote')}
        </p>
      </div>
    </div>,
    document.body
  );
};

export default InterviewPaywallModal;
