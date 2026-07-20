import React, { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import AriaOrbit from './AriaOrbit';

const DRAFT_WORDS = [
  'Reading the role…',
  'Finding what recruiters want…',
  'Drafting your bullets…',
  'Sharpening the verbs…',
  'Polishing…',
];

// Aria's working indicator — her orbit spins (it only spins while working) beside a status word.
// 'chat' = a steady "Thinking…"; 'draft' = cycles the CV-flavoured phrases. Reduced motion → one word, no cycle.
// An optional `label` pins a fixed word (e.g. "Setting up your CV draft…"), overriding both.
export default function AriaThinking({ variant = 'chat', label }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const cycling = variant === 'draft' && !reduce && !label;
  useEffect(() => {
    if (!cycling) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % DRAFT_WORDS.length), 1100);
    return () => clearInterval(id);
  }, [cycling]);
  const word =
    label ||
    (variant === 'draft' ? (reduce ? 'Drafting your bullets…' : DRAFT_WORDS[i]) : 'Thinking…');
  return (
    <div className="self-start flex items-center gap-2">
      <AriaOrbit size={16} working />
      <span key={word} className="text-[12px] text-slate-400 dark:text-slate-500 aria-word-fade">
        {word}
      </span>
    </div>
  );
}
