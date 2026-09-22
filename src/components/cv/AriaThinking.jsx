import React, { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AriaOrbit from './AriaOrbit';

// Module-level constant → i18n KEYS, resolved via t() at render (see the CV Builder
// i18n note in lib/plans.js / TierCard.jsx).
const DRAFT_WORD_KEYS = [
  'cvBuilder.ariaThinking.draft.0',
  'cvBuilder.ariaThinking.draft.1',
  'cvBuilder.ariaThinking.draft.2',
  'cvBuilder.ariaThinking.draft.3',
  'cvBuilder.ariaThinking.draft.4',
];

// THE CHAT LADDER — a wait that reports progress instead of repeating itself.
//
// 'chat' used to be one unchanging "Thinking…" for however long the turn took. Three
// seconds and thirteen seconds looked identical, so the only thing the indicator ever
// told anyone was "still slow" — and a word that never changes is read, after a beat, as
// a spinner that has hung.
//
// These are the stages a turn actually goes through: the answer is read, it is put
// against the draft that came with it, and a reply is composed. It CLIMBS and then HOLDS
// — never loops. Wrapping back to "Thinking…" would say the work had started over.
//
// The last rung is deliberately not "almost there". On an unusually slow turn that is the
// one rung anybody sits on, and a promise that keeps not arriving is worse than the
// silence it replaced. It says the honest thing instead: still going.
//
// Index 0 is the original key, so the first frame is still the exact word it always was.
const CHAT_STEP_KEYS = [
  'cvBuilder.ariaThinking.thinking',
  'cvBuilder.ariaThinking.chat.1',
  'cvBuilder.ariaThinking.chat.2',
  'cvBuilder.ariaThinking.chat.3',
  'cvBuilder.ariaThinking.chat.4',
];
// Slower than the draft cycle (1100ms). That one is decorative motion during a long
// generation; this one claims a step was FINISHED, so it must not outrun the work.
const CHAT_STEP_MS = 1700;

// Aria's working indicator — her orbit spins (it only spins while working) beside a status word.
// 'chat' = climbs the stage ladder above; 'draft' = cycles the CV-flavoured phrases.
// Reduced motion → one word, no cycle and no climb.
// An optional `label` pins a fixed word (e.g. "Setting up your CV draft…"), overriding both.
export default function AriaThinking({ variant = 'chat', label }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const cycling = variant === 'draft' && !reduce && !label;
  const stepping = variant === 'chat' && !reduce && !label;
  useEffect(() => {
    if (cycling) {
      const id = setInterval(() => setI((n) => (n + 1) % DRAFT_WORD_KEYS.length), 1100);
      return () => clearInterval(id);
    }
    if (stepping) {
      // Counted out here rather than inside the updater: the updater has to stay pure,
      // and stopping the timer at the top rung is a side effect.
      let step = 0;
      const id = setInterval(() => {
        step += 1;
        setI(step);
        if (step >= CHAT_STEP_KEYS.length - 1) clearInterval(id);
      }, CHAT_STEP_MS);
      return () => clearInterval(id);
    }
    return undefined;
  }, [cycling, stepping]);
  const word =
    label ||
    (variant === 'draft'
      ? reduce
        ? t('cvBuilder.ariaThinking.draft.2')
        : t(DRAFT_WORD_KEYS[i])
      : t(CHAT_STEP_KEYS[Math.min(i, CHAT_STEP_KEYS.length - 1)]));
  return (
    // `aria-row` so this owns Aria's mark while it's the last thing in the stream —
    // which is exactly the turn where the mark should be spinning.
    <div className="aria-row self-start flex items-center gap-2">
      <AriaOrbit size={16} working className="aria-mark" />
      <span key={word} className="text-[12px] text-slate-400 dark:text-slate-500 aria-word-fade">
        {word}
      </span>
    </div>
  );
}
