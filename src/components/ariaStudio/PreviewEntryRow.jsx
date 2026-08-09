import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaOrbit from '../cv/AriaOrbit';

// One reorderable entry inside the Live Preview sheet.
//
// Deliberately NOT the builder's SortableItem: that one is dressed for large white cards
// (absolute action pill, 40px hit targets, a Settings/X trigger) and would shout over a
// 680px sheet set in 12.5px type. This is the same dnd-kit contract at sheet scale — a
// grip, two chevrons, a ✎ and a trash in muted slate, and nothing else.
//
// The row is a flex pair — control cluster, then the caller's entry markup untouched —
// so the cluster occupies its own column instead of overlaying the title or the date.
//
// DELETE IS A REQUEST, NOT A WRITE. `onRemove` fires the studio command channel; it never
// calls removeEntry from here. Deleting the entry Aria is mid-interview on has to unpin
// BEFORE the entry leaves cvData, and only StudioChat can order that — see the deleteEntry
// effect there.
//
// EDIT IS THE PARENT'S STATE, NOT THIS ROW'S. `onEdit` only announces the intent; the row
// never mounts an editor itself. That's what keeps ONE row editing at a time, and it keeps
// the dnd wrapper from wrapping a live form — the parent swaps this whole row out for the
// editor, so the grip can't be dragged mid-edit because it isn't rendered.
//
// TWO WAYS TO EDIT, ONE ✎. `onEdit` is the manual inline editor; `onEditWithAria` hands the
// entry to the interview through the command channel. The ✎ opens a two-choice menu when
// both are on offer, and stays a direct shortcut to the manual editor when only one is.
//
// `canEditWithAria` is TOLD to the row, never derived here. Only experience and projects
// have an Aria-interview flow (ENTRY_SOURCE has no education key — education's fix has
// always been guidance-only), and that is a fact about the SECTION. Re-deriving section
// semantics from inside a row is how the 'project'-singular class of bug spreads.
//
// `isActive` — Aria is interviewing on THIS entry (focus mode, published from StudioChat).
// The row is then MARKED and LOCKED: every control is replaced by a quiet "Aria is working
// on this" marker, so the entry can't be reordered, hand-edited or deleted out from under
// a live interview. The CONTENT stays exactly as it was — the whole point is to SEE the
// entry Aria is discussing while she discusses it.
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
  // Hiding the grip already removes the drag listeners from the DOM, so a locked row can't
  // be dragged. Disabling the sortable too is belt-and-braces: dnd-kit itself then refuses
  // to start a drag on this id, whatever a future layout does with the handle.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isActive,
  });

  // Every entry rendered here HAS content — the preview's lists are withoutBlankEntries-
  // filtered, so a placeholder row never reaches this component. That's why there is no
  // "blank deletes immediately" path: every delete is a real loss, so every delete
  // confirms. The confirm is ON THE ROW, not in a modal — a modal is the right weight for
  // deleting a whole CV, not one of five roles.
  const [confirming, setConfirming] = useState(false);

  // The ✎'s two-choice menu. Only ever opened when there are genuinely two choices —
  // education has no interview to route into, so its ✎ stays a direct shortcut rather
  // than a menu with one item in it.
  const [menuOpen, setMenuOpen] = useState(false);
  const editBtnRef = useRef(null);
  const menuRef = useRef(null);
  const offersAriaEdit = !!(canEditWithAria && onEditWithAria);

  // Dismiss like every other small menu in the app: outside pointer-down, or Escape.
  // Listeners are only attached while it's open, so a sheet of twenty rows isn't twenty
  // live document listeners.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (event) => {
      if (editBtnRef.current?.contains(event.target)) return;
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

  // A section with one entry has nothing to reorder — rendering those controls there would
  // be two dead buttons per row. Edit and delete are offered regardless: a section's LAST
  // entry is exactly the one a user may want gone, and a lone entry is just as editable as
  // one of five.
  const showReorder = total > 1;

  // LOCKED while Aria is on this entry. Gating the whole cluster (rather than each control)
  // is what makes the lock total: no grip to drag, no chevrons, no ✎, no trash — one
  // condition, so a control added later can't quietly escape it.
  const showControls = !isActive && (showReorder || !!onEdit || !!onRemove);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  // 24px targets: quiet enough for the sheet, still the WCAG 2.5.8 minimum.
  const ctrl =
    'inline-flex items-center justify-center h-6 w-6 rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

  // The question is "does this device hover", not "how wide is the viewport": a touch
  // screen has no hover to reveal anything with, so the cluster is ALWAYS visible there
  // and only fades in on pointer devices. The reveal rules are scoped INSIDE the same
  // media query as the hide, so they win on specificity rather than on source order.
  const clusterVisibility =
    'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';

  return (
    <div ref={setNodeRef} style={style} className="group relative flex items-start gap-1.5">
      {showControls && (
        <div
          className={`shrink-0 flex items-center gap-0.5 transition-opacity ${
            // While confirming, the cluster stays put but the row below owns the decision.
            confirming ? 'opacity-100' : clusterVisibility
          }`}
        >
          {showReorder && (
            <>
              {/* The grip is desktop-only. Below PANEL_MIN (1100px) the preview IS a bottom
                  sheet, and a drag there fights the sheet's own scroll — so the chevrons are
                  the reorder path at those widths. An arbitrary media variant keeps this in
                  CSS; no JS breakpoint state to sync. */}
              <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label={t('common.sortable.dragToReorder')}
                title={t('common.sortable.dragToReorder')}
                className={`${ctrl} hidden [@media(min-width:1100px)]:inline-flex cursor-grab active:cursor-grabbing touch-none`}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={index === 0}
                aria-label={t('common.sortable.moveUp')}
                title={t('common.sortable.moveUp')}
                className={ctrl}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={index === total - 1}
                aria-label={t('common.sortable.moveDown')}
                title={t('common.sortable.moveDown')}
                className={ctrl}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {/* The ✎ asks WHICH kind of edit when there are two, and goes straight to the
              manual editor when there is only one (education). Either way the row only
              reports the intent — the parent owns what "editing" then looks like. */}
          {onEdit && !confirming && (
            <div className="relative">
              <button
                type="button"
                ref={editBtnRef}
                onClick={() => (offersAriaEdit ? setMenuOpen((v) => !v) : onEdit())}
                aria-label={t('ariaStudio.livePreview.editEntry')}
                title={t('ariaStudio.livePreview.editEntry')}
                aria-haspopup={offersAriaEdit ? 'menu' : undefined}
                aria-expanded={offersAriaEdit ? menuOpen : undefined}
                className={ctrl}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {/* Anchored to the ✎ rather than portalled to the viewport, so it can't
                  drift away from its row while the sheet scrolls. Sheet-scaled type and
                  the same card treatment as the app's other small menus. */}
              {offersAriaEdit && menuOpen && (
                <div
                  ref={menuRef}
                  role="menu"
                  className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-[164px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-1"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Pencil className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="flex-1">{t('ariaStudio.livePreview.editManually')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditWithAria();
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <AriaOrbit size={12} tone="mono" />
                    <span className="flex-1">{t('ariaStudio.livePreview.editWithAria')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {/* First tap arms the confirm below rather than deleting — muted at rest, rose
              on hover, so the destructive one reads differently from the reorder pair. */}
          {onRemove && !confirming && (
            <button
              type="button"
              onClick={() => {
                // The ✎ unmounts while the confirm is armed, so a menu left open would
                // outlive its own anchor.
                setMenuOpen(false);
                setConfirming(true);
              }}
              aria-label={t('ariaStudio.livePreview.removeEntry')}
              title={t('ariaStudio.livePreview.removeEntry')}
              className={`${ctrl} hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {/* The marker that REPLACES the cluster. Same slot, so the row doesn't jump when the
          controls go — and quiet by design: a mono micro-label and the Aria mark, at the
          same weight as the sheet's other affordances. The CONTENT beside it is untouched,
          because seeing the entry Aria is discussing is the whole point of focus mode. */}
      {isActive && (
        <div className="shrink-0 flex items-center gap-1 pt-[1px]" role="status" aria-live="polite">
          <AriaOrbit size={12} tone="mono" className="shrink-0" />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {t('ariaStudio.livePreview.ariaIsHere')}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        {children}

        {/* The two-state confirm, inline and compact. Kept UNDER the entry so arming it
            never reflows the row above (which would move the button out from under the
            pointer mid-decision). */}
        {confirming && (
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 px-2 py-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300">
              {t('ariaStudio.livePreview.confirmRemove')}
            </span>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onRemove?.();
              }}
              className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 px-1.5 py-0.5 rounded transition-colors"
            >
              {t('ariaStudio.livePreview.removeEntry')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-1.5 py-0.5 rounded transition-colors"
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
