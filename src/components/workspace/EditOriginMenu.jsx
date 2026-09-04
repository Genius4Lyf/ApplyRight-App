import React, { useEffect, useRef, useState } from 'react';
import { PenTool, PenLine, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import AriaOrbit from '../cv/AriaOrbit';

// "Edit" in the CV Studio, where the question is not WHETHER to edit but WHERE.
//
// A CV in the studio was written in one of two places — a conversation with Aria, or the
// step-by-step builder — and the two hold genuinely different things. Aria owns the
// transcript that produced the words; the builder owns the structured entries. Sending an
// Aria CV into the builder loses the conversation you would carry on from, and sending a
// builder CV into Aria hands her a document with no history to pick up. So Edit opens
// where the CV was made, and nowhere else.
//
// Both rows are drawn, and the one that does not apply is DISABLED rather than absent.
// That is the whole point of the menu: a single button that silently went one way or the
// other would leave someone wondering whether the other place exists. Shown-and-locked,
// with the reason under it, answers "why can't I edit this in the builder?" in the place
// the question gets asked. It is also how the two surfaces get named to someone who has
// only ever used one of them.
//
// Two presentations, one definition of the rows, because the desktop toolbar and the
// phone action bar are the same menu and must not drift:
//   presentation="menu"  — a popover anchored under the trigger (desktop toolbar)
//   presentation="sheet" — a bottom sheet (the mobile action bar, matching Download)
const EditOriginMenu = ({
  origin,
  onEditWithAria,
  onEditInBuilder,
  presentation = 'menu',
  className = '',
  triggerClassName = '',
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  // Anything that is not explicitly Aria's is the builder's. Origin comes from
  // DraftCV.studioKind, which is only ever set by a Studio session — so an upload, a
  // generated CV and a typed one all land on 'builder', which is exactly where all three
  // are in fact edited. Defaulting the unknown case to the builder rather than to nothing
  // is what keeps Edit working on a record that predates the marker.
  const ariaBuilt = origin === 'aria';

  const rows = [
    {
      key: 'aria',
      icon: <AriaOrbit size={15} className="mt-0.5 shrink-0" />,
      label: t('workspace.editMenu.aria'),
      hint: ariaBuilt ? t('workspace.editMenu.hint.aria') : t('workspace.editMenu.locked.aria'),
      enabled: ariaBuilt,
      run: onEditWithAria,
    },
    {
      key: 'builder',
      icon: (
        <PenLine className="mt-0.5 h-[15px] w-[15px] shrink-0 text-slate-400 dark:text-slate-500" />
      ),
      label: t('workspace.editMenu.builder'),
      hint: ariaBuilt
        ? t('workspace.editMenu.locked.builder')
        : t('workspace.editMenu.hint.builder'),
      enabled: !ariaBuilt,
      run: onEditInBuilder,
    },
  ];

  const pick = (row) => {
    if (!row.enabled) return;
    setOpen(false);
    row.run?.();
  };

  const isSheet = presentation === 'sheet';

  const items = rows.map((row) => (
    <button
      key={row.key}
      type="button"
      role="menuitem"
      disabled={!row.enabled}
      aria-disabled={!row.enabled}
      onClick={() => pick(row)}
      className={`flex w-full items-start gap-2.5 text-left transition-colors ${
        isSheet ? 'px-5 py-3.5' : 'px-3 py-2'
      } ${
        row.enabled
          ? 'hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800'
          : // Not `disabled:opacity-50` over the whole row: at 50% the reason line — the
            // one thing a locked row exists to say — goes under the contrast floor. The
            // label greys out, the reason stays readable.
            'cursor-not-allowed'
      }`}
    >
      <span className={row.enabled ? '' : 'opacity-40'}>{row.icon}</span>
      <span className="min-w-0">
        <span
          className={`block text-[13px] font-semibold ${
            row.enabled
              ? 'text-slate-800 dark:text-slate-100'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {row.label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {row.hint}
        </span>
      </span>
    </button>
  ));

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={t('workspace.editMenu.ariaLabel')}
      className={triggerClassName}
    >
      <PenTool className="w-4 h-4" />
      <span>{t('workspace.editMenu.trigger')}</span>
      {isSheet && open ? (
        <ChevronUp className="w-3.5 h-3.5" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5" />
      )}
    </button>
  );

  if (isSheet) {
    return (
      <div ref={ref} className={className}>
        {trigger}
        {open && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-slate-200 bg-white pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
              {items}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {items}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EditOriginMenu;
