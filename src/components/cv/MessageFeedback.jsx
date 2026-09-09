import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

// 👍 / 👎 on one of Aria's replies.
//
// WHAT IT ATTACHES TO. The endpoint that produced the message minted an AICallLog id
// BEFORE making the model call and returned it as `feedbackId`. That is the only way a
// rating can land on the right row: the audit write is fire-and-forget, so there is no id
// to hand back afterwards, and "the newest call of this operation" would file a 👍 on
// whichever answer happened to come last — which, in a conversation, is almost never the
// one being rated.
//
// So NO id means NO control. A thumb that quietly goes nowhere is worse than no thumb:
// the user believes they have told us something.
//
// IT NEVER REPORTS FAILURE. Pressing it is a favour, not a task — there is nothing for
// the user to do about a failed request, and an error toast over an opinion is a rebuke
// for helping. The press is shown as taken the instant it happens, and a lost request is
// simply a rating we do not have.
//
// It is also NOT undoable-into-nothing: a second press on the same thumb is ignored, and
// pressing the other one changes the rating. Changing your mind is real; "actually I
// never had an opinion" is not something the aggregate needs.
const MessageFeedback = ({ feedbackId, className = '' }) => {
  const { t } = useTranslation();
  const [given, setGiven] = useState(null);

  if (!feedbackId) return null;

  const send = (feedback) => {
    if (given === feedback) return;
    setGiven(feedback);
    api.post('/ai-feedback', { logId: feedbackId, feedback }).catch(() => {
      // Deliberately silent — see above.
    });
  };

  const tone = (value) =>
    given === value
      ? 'text-slate-900 dark:text-white'
      : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200';

  return (
    <span className={`msg-copy inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => send('up')}
        aria-pressed={given === 'up'}
        aria-label={t('common.helpful')}
        title={t('common.helpful')}
        className={`rounded-md p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${tone('up')}`}
      >
        <ThumbsUp
          className="h-3.5 w-3.5"
          aria-hidden="true"
          // Filled once chosen, so the state survives a glance. Colour alone would not:
          // these two sit side by side and both are ink when active.
          fill={given === 'up' ? 'currentColor' : 'none'}
        />
      </button>
      <button
        type="button"
        onClick={() => send('down')}
        aria-pressed={given === 'down'}
        aria-label={t('common.notHelpful')}
        title={t('common.notHelpful')}
        className={`rounded-md p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${tone('down')}`}
      >
        <ThumbsDown
          className="h-3.5 w-3.5"
          aria-hidden="true"
          fill={given === 'down' ? 'currentColor' : 'none'}
        />
      </button>
      {given && (
        <span
          role="status"
          className="ml-1 font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500"
        >
          {t('common.feedbackThanks')}
        </span>
      )}
    </span>
  );
};

export default MessageFeedback;
