import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, ArrowUpDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Compact, product-grade sort/select control for toolbars.
 *
 * Unlike the native <select> it replaces, this renders a menu button with a
 * leading icon, an animated popover, checkmark on the active option, and
 * click-outside / Escape / keyboard handling — the way real apps present a
 * "Sort by" control. Reusable anywhere a small labelled picker is needed.
 *
 * @param {string} value            currently selected option key
 * @param {(key:string)=>void} onChange  called with the picked option key
 * @param {{key:string,label:string}[]} options
 * @param {string} [ariaLabel]
 * @param {string} [className]
 */
const SortSelect = ({ value, onChange, options, ariaLabel, className = '' }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.key === value);
  const resolvedAriaLabel = ariaLabel ?? t('myCvs.sort.sortByAria');

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (key) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={resolvedAriaLabel}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          open
            ? 'border-indigo-400 bg-white text-indigo-700 ring-2 ring-indigo-100 dark:border-indigo-500/50 dark:bg-slate-900 dark:text-indigo-300 dark:ring-indigo-500/20'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="hidden font-medium text-slate-400 dark:text-slate-500 sm:inline">
          {t('myCvs.sort.sortLabel')}
        </span>
        <span className="max-w-[130px] truncate">{selected?.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            className="absolute right-0 z-50 mt-1.5 w-56 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/5"
          >
            {options.map((o) => {
              const active = o.key === value;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(o.key)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{o.label}</span>
                  {active && (
                    <Check className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SortSelect;
