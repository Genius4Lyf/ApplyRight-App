import React from 'react';
import { Layers, Rows3 } from 'lucide-react';

/**
 * Small segmented control for switching between the stacked "Deck" view and a
 * flat "List" view. Flat pill with a hairline border; the active segment is a
 * solid slate-900 (white in dark mode) pill. Keyboard accessible via a tablist.
 *
 * Collapses to icon-only under ~380px so it never crowds a stacked header row.
 *
 * Pass `className` (e.g. "w-full") to stretch it; the segments split evenly.
 *
 * @param {{ value: 'deck'|'list', onChange: (v: 'deck'|'list') => void, className?: string }} props
 */
export default function ViewToggle({ value = 'deck', onChange, className = '' }) {
  const options = [
    { key: 'deck', label: 'Deck', Icon: Layers },
    { key: 'list', label: 'List', Icon: Rows3 },
  ];

  return (
    <div
      role="tablist"
      aria-label="View mode"
      className={`inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {options.map((opt) => {
        const { key, label } = opt;
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => onChange?.(key)}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
              active
                ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <opt.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden min-[380px]:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
