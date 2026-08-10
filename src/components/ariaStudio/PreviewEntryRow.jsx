import React, { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaOrbit from '../cv/AriaOrbit';

// A template-neutral entry wrapper. The CV body always occupies the full row width;
// controls are anchored in the paper margin, so revealing them never indents a title
// or bullet. Only the drag handle stays direct — all secondary actions share one menu.
const PreviewEntryRow = ({
  id,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  onEditWithAria,
  canEditWithAria = false,
  onRemove,
  isActive = false,
  children,
}) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isActive,
  });
  const [confirming, setConfirming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (event) => {
      if (menuButtonRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const showReorder = total > 1;
  const showControls = !isActive && (showReorder || !!onEdit || !!onRemove);
  const offersAriaEdit = !!(canEditWithAria && onEditWithAria);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };
  const control =
    'inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200';
  const menuItem =
    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800';
  const visibility =
    'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';

  const choose = (action) => {
    setMenuOpen(false);
    action?.();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative -mx-1 rounded-md px-1 py-0.5 transition-colors hover:bg-slate-50/90 focus-within:bg-slate-50/90 dark:hover:bg-slate-800/45 dark:focus-within:bg-slate-800/45 ${
        isActive
          ? 'bg-slate-50/90 ring-1 ring-slate-200 dark:bg-slate-800/45 dark:ring-slate-700'
          : ''
      }`}
    >
      {showControls && !confirming && (
        <div
          className={`absolute -right-7 top-0 z-20 flex flex-col items-center gap-0.5 transition-opacity ${
            menuOpen ? 'opacity-100' : visibility
          }`}
        >
          {showReorder && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={t('common.sortable.dragToReorder')}
              title={t('common.sortable.dragToReorder')}
              className={`${control} hidden cursor-grab touch-none active:cursor-grabbing [@media(min-width:1100px)]:inline-flex`}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={t('ariaStudio.livePreview.editEntry')}
              title={t('ariaStudio.livePreview.entryActions')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={control}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[178px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                {onEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => choose(onEdit)}
                    className={menuItem}
                  >
                    <Pencil className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="flex-1">{t('ariaStudio.livePreview.editManually')}</span>
                  </button>
                )}
                {offersAriaEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => choose(onEditWithAria)}
                    className={menuItem}
                  >
                    <AriaOrbit size={12} tone="mono" />
                    <span className="flex-1">{t('ariaStudio.livePreview.editWithAria')}</span>
                  </button>
                )}

                {showReorder && (
                  <>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => choose(onMoveUp)}
                      disabled={index === 0}
                      className={menuItem}
                    >
                      <ChevronUp className="h-3 w-3 shrink-0" />
                      {t('common.sortable.moveUp')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => choose(onMoveDown)}
                      disabled={index === total - 1}
                      className={menuItem}
                    >
                      <ChevronDown className="h-3 w-3 shrink-0" />
                      {t('common.sortable.moveDown')}
                    </button>
                  </>
                )}

                {onRemove && (
                  <>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirming(true);
                      }}
                      className={`${menuItem} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40`}
                    >
                      <Trash2 className="h-3 w-3 shrink-0" />
                      {t('ariaStudio.livePreview.removeEntry')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isActive && (
        <div
          className="absolute -top-4 right-0 flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 shadow-sm dark:bg-slate-900"
          role="status"
          aria-live="polite"
        >
          <AriaOrbit size={12} tone="mono" className="shrink-0" />
          <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.livePreview.ariaIsHere')}
          </span>
        </div>
      )}

      <div className="min-w-0">
        {children}

        {confirming && (
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50/70 px-2 py-1 dark:border-rose-900 dark:bg-rose-950/30">
            <span className="font-mono text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300">
              {t('ariaStudio.livePreview.confirmRemove')}
            </span>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onRemove?.();
              }}
              className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-rose-700 transition-colors hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100"
            >
              {t('ariaStudio.livePreview.removeEntry')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewEntryRow;
