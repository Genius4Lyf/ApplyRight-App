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

// Aria's working indicator — her orbit spins (it only spins while working) beside a status word.
// 'chat' = a steady "Thinking…"; 'draft' = cycles the CV-flavoured phrases. Reduced motion → one word, no cycle.
// An optional `label` pins a fixed word (e.g. "Setting up your CV draft…"), overriding both.
export default function AriaThinking({ variant = 'chat', label }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const cycling = variant === 'draft' && !reduce && !label;
  useEffect(() => {
    if (!cycling) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % DRAFT_WORD_KEYS.length), 1100);
    return () => clearInterval(id);
  }, [cycling]);
  const word =
    label ||
    (variant === 'draft'
      ? reduce
        ? t('cvBuilder.ariaThinking.draft.2')
        : t(DRAFT_WORD_KEYS[i])
      : t('cvBuilder.ariaThinking.thinking'));
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
