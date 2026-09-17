import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import AriaCallSettingsControls from './AriaCallSettingsControls';
import { normalizeCallSettings } from '../../lib/ariaCallSettings';

// The chip beside "Talk it through instead".
//
// It SHOWS the current choice ("Thorough · Friendly") so nobody has to open anything to know
// how the call will go — and most people never will, because the defaults are the call most
// people should have. Opening it is for the ones who know they want something different.
//
// Opens UPWARD: it lives in the composer dock at the bottom of the chat, and a popover that
// drops down would open off the bottom of the screen on a phone.
const AriaCallSettingsButton = ({ value, onChange, disabled }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = normalizeCallSettings(value);
  const base = 'ariaStudio.ariaLive.settings';

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const summary = `${t(`${base}.depth.${current.depth}.label`)} · ${t(
    `${base}.style.${current.style}.label`
  )}`;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t(`${base}.open`, { summary })}
        className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:border-white dark:hover:text-white"
      >
        <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
        {summary}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t(`${base}.title`)}
          className="absolute bottom-full left-1/2 z-40 mb-2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="mb-3 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {t(`${base}.title`)}
          </p>
          <AriaCallSettingsControls value={current} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

export default AriaCallSettingsButton;
