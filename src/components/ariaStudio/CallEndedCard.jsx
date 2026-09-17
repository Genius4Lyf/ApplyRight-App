import React from 'react';
import { useTranslation } from 'react-i18next';
import { END_REASONS } from '../../lib/ariaLive';

// WHAT NOW, after a call the user ended themselves.
//
// Ending a call used to drop straight onto the bullet-count picker, which assumed the End
// button meant "I'm done, write it up". It often doesn't: someone hangs up because a person
// walked in, because they want to check a detail, or because they would rather type the
// rest. Jumping to bullets from half an interview writes thin bullets out of it.
//
// So when the call ends by the user's hand — or by the clock — they choose:
//
//   Write my bullets from this call — the transcript is banked exactly as if Aria had
//     wrapped up herself.
//   Keep going with Aria in chat — the composer comes back and the typed interview carries
//     on from the call. Every spoken turn is already in the chat, so Aria's next typed
//     question knows everything that was said, and she brings out the bullet options
//     herself when she has enough, as she always does when typing.
//
// When ARIA ends the call, this card never appears: she has already recapped, asked if there
// was anything else, and heard the user agree. Asking again would be asking twice.
const CallEndedCard = ({ reason, busy, onWriteBullets, onKeepChatting }) => {
  const { t } = useTranslation();
  const timeUp = reason === END_REASONS.TIME_UP;
  // A DROPPED call gets its own words. The choice underneath is the same one — the answers are
  // in the chat either way — but a connection that went is not a call anyone finished, and
  // saying "that's the call done" over a drop reads as the app not knowing what happened. It
  // also has a fact of its own worth stating: nothing is charged for time that was not spent.
  const dropped = reason === END_REASONS.DROPPED;
  const titleKey = dropped
    ? 'ariaStudio.ariaLive.ended.droppedTitle'
    : timeUp
      ? 'ariaStudio.ariaLive.ended.timeUpTitle'
      : 'ariaStudio.ariaLive.ended.title';

  return (
    <div
      role="group"
      aria-labelledby="call-ended-title"
      className="mb-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <p
        id="call-ended-title"
        className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100"
      >
        {t(titleKey)}
      </p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t(dropped ? 'ariaStudio.ariaLive.ended.droppedBody' : 'ariaStudio.ariaLive.ended.body')}
      </p>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onWriteBullets}
          disabled={busy}
          className="btn-primary w-full px-3 py-2 text-[13px] disabled:opacity-50 sm:w-auto"
        >
          {t('ariaStudio.ariaLive.ended.writeBullets')}
        </button>
        <button
          type="button"
          onClick={onKeepChatting}
          disabled={busy}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
        >
          {t('ariaStudio.ariaLive.ended.keepChatting')}
        </button>
      </div>
    </div>
  );
};

export default CallEndedCard;
