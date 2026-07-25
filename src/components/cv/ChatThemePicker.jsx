import React, { useState, useRef, useEffect } from 'react';
import { Contrast } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatTheme } from '../../hooks/useChatTheme';

// The 5 chat backgrounds, in picker order. `swatch` is the mini-preview class.
// `labelKey` is an i18n key resolved via t() at render (module-level constant).
const THEMES = [
  { key: 'studio', labelKey: 'cvBuilder.chatThemePicker.themes.studio', swatch: 'aria-swatch-studio' },
  { key: 'paper', labelKey: 'cvBuilder.chatThemePicker.themes.paper', swatch: 'aria-swatch-paper' },
  { key: 'slate', labelKey: 'cvBuilder.chatThemePicker.themes.slate', swatch: 'aria-swatch-slate' },
  { key: 'grid', labelKey: 'cvBuilder.chatThemePicker.themes.grid', swatch: 'aria-swatch-grid' },
  { key: 'ledger', labelKey: 'cvBuilder.chatThemePicker.themes.ledger', swatch: 'aria-swatch-ledger' },
  { key: 'campus', labelKey: 'cvBuilder.chatThemePicker.themes.campus', swatch: 'aria-swatch-campus' },
];

// A small round palette button that toggles a swatch popover ABOVE it. Reskins the
// shared Aria-chat background (persisted per user via useChatTheme). Sits in the
// composer's control row, between the model picker and the send button.
// `compact` is that in-composer size: a borderless 32px ghost button matching the
// ModelPicker trigger beside it, rather than the standalone 40px bordered circle.
const ChatThemePicker = ({ compact = false }) => {
  const { t } = useTranslation();
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
        aria-label={t('cvBuilder.chatThemePicker.chatBackground')}
        title={t('cvBuilder.chatThemePicker.chatBackground')}
        className={`shrink-0 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${
          compact ? 'w-9 h-9' : 'w-10 h-10 border border-slate-200 dark:border-slate-700'
        }`}
      >
        <Contrast className="w-4 h-4" />
      </button>

      {open && (
        <div
          className={`absolute right-0 z-20 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-2 ${
            compact ? 'bottom-10' : 'bottom-12'
          }`}
        >
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pb-1.5">
            {t('cvBuilder.chatThemePicker.chatBackground')}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEMES.map((th) => (
              <button
                key={th.key}
                type="button"
                onClick={() => {
                  setTheme(th.key);
                  setOpen(false);
                }}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`w-full h-9 rounded-lg border ${th.swatch} ${
                    theme === th.key
                      ? 'border-indigo-500 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold ${
                    theme === th.key
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t(th.labelKey)}
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
