import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

/**
 * SortableItem
 *
 * Wraps a CV builder card (work history role, project, education entry) with
 * drag-and-drop reorder + explicit ↑/↓ buttons + optional delete.
 *
 * All per-card actions live in a single pill at the top-right of the card so
 * they read as one cohesive toolbar instead of two floating widgets. Earlier
 * we had the reorder controls at right-14 and a separate trash icon at right-4
 * — different y-positions, different styling, no visual connection.
 *
 * The card body should not render its own trash button; pass `onDelete` here.
 */
const SortableItem = ({ id, index, total, onMoveUp, onMoveDown, onDelete, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const isFirst = index === 0;
  const isLast = index === total - 1;

  const btnBase =
    'p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Unified toolbar: drag handle, ↑, ↓, divider, delete. Single pill, single
          shadow, consistent button sizes. Sits in the card's top-right padding. */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-md border border-slate-200/80 px-0.5 py-0.5 shadow-sm">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className={`${btnBase} cursor-grab active:cursor-grabbing touch-none`}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Move up"
          title="Move up"
          className={btnBase}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Move down"
          title="Move down"
          className={btnBase}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {onDelete && (
          <>
            <span className="w-px h-4 bg-slate-200 mx-0.5" aria-hidden="true" />
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete"
              title="Delete"
              className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
      {children}
    </div>
  );
};

export default SortableItem;
