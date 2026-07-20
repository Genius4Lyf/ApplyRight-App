import React, { useState, useRef, useEffect } from 'react';
import { Contrast } from 'lucide-react';
import { useChatTheme } from '../../hooks/useChatTheme';

// The 5 chat backgrounds, in picker order. `swatch` is the mini-preview class.
const THEMES = [
  { key: 'studio', label: 'Studio', swatch: 'aria-swatch-studio' },
  { key: 'paper', label: 'Paper', swatch: 'aria-swatch-paper' },
  { key: 'slate', label: 'Slate', swatch: 'aria-swatch-slate' },
  { key: 'grid', label: 'Grid', swatch: 'aria-swatch-grid' },
  { key: 'ledger', label: 'Ledger', swatch: 'aria-swatch-ledger' },
  { key: 'campus', label: 'Campus', swatch: 'aria-swatch-campus' },
];

// A small round palette button that toggles a swatch popover ABOVE it. Reskins the
// shared Aria-chat background (persisted per user via useChatTheme). Sits in the
// docked input row, between the textarea and the send button.
const ChatThemePicker = () => {
  const [theme, setTheme] = useChatTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Chat background"
        title="Chat background"
        className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Contrast className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute bottom-12 right-0 z-20 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pb-1.5">
            Chat background
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTheme(t.key);
                  setOpen(false);
                }}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`w-full h-9 rounded-lg border ${t.swatch} ${
                    theme === t.key
                      ? 'border-indigo-500 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold ${
                    theme === t.key
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatThemePicker;
