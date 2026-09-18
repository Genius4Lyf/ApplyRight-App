import React from 'react';
import { useTranslation } from 'react-i18next';

// THE CALL HAPPENED. THE WRAP-UP DIDN'T.
//
// This stands where a red toast used to. A toast was wrong twice over: it said one thing
// ("couldn't generate bullets") for four unrelated problems, and it was gone by the time
// anyone looked up — leaving a paid call sitting in the chat with no visible way forward.
//
// Every route out of here keeps the conversation. Nothing that was said is lost by picking any
// of them, and the card says so, because the fear at this moment is that the minutes were
// wasted.
//
//   credits — they can fix this. Buying is the first button, and carrying on in chat is free.
//   limit   — they cannot fix this today, so DO NOT offer to sell them anything. Chat only.
//   network — a second attempt is genuinely likely to work, so try again leads.
//   gone     — the role was deleted mid-call. There is nothing to write bullets onto.
//
// "Continue in chat" is on every one of them: the typed interview costs nothing, reads every
// spoken turn, and is the answer whenever the paid path is blocked.
const CallRecoveryCard = ({ reason = 'network', busy, onGetCredits, onContinueChat, onRetry }) => {
  const { t } = useTranslation();
  const base = `ariaStudio.ariaLive.recovery.${reason}`;

  const secondary =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto';

  return (
    <div
      role="group"
      aria-labelledby="call-recovery-title"
      className="mb-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <p
        id="call-recovery-title"
        className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100"
      >
        {t(`${base}.title`)}
      </p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t(`${base}.body`)}
      </p>

      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        {reason === 'credits' && (
          <button
            type="button"
            onClick={onGetCredits}
            disabled={busy}
            className="btn-primary w-full px-3 py-2 text-[13px] disabled:opacity-50 sm:w-auto"
          >
            {t('ariaStudio.ariaLive.recovery.getCredits')}
          </button>
        )}
        {reason === 'network' && (
          <button
            type="button"
            onClick={onRetry}
            disabled={busy}
            className="btn-primary w-full px-3 py-2 text-[13px] disabled:opacity-50 sm:w-auto"
          >
            {t('ariaStudio.ariaLive.recovery.tryAgain')}
          </button>
        )}
        {/* Never absent. Whatever else is or is not possible, typing always is. */}
        <button type="button" onClick={onContinueChat} disabled={busy} className={secondary}>
          {t('ariaStudio.ariaLive.recovery.continueChat')}
        </button>
      </div>
    </div>
  );
};

export default CallRecoveryCard;
