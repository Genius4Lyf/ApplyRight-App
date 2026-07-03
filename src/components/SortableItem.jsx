import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, Trash2, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SortableItem
 *
 * Wraps a CV builder card (work history role, project, education entry) with
 * drag-and-drop reorder + explicit ↑/↓ buttons + optional delete.
 *
 * All per-card actions live in a single action pill at the top-right of the card,
 * hidden behind a trigger button. When clicked, the actions slide out horizontally.
 */
const SortableItem = ({
  id,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  isNew,
  isExpanded,
  onToggleExpand,
  children,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const [isOpen, setIsOpen] = useState(isNew || false);

  useEffect(() => {
    if (isNew) {
      setIsOpen(true);
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Icon buttons get a ≥40px hit area on touch (from ~26px) so reorder/delete
  // are actually tappable; the compact desktop density is restored from `sm`.
  const btnBase =
    'inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-1.5 rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Sliding action drawer container */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        {onToggleExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Edit'}
          </button>
        )}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0, scale: 0.95 }}
              animate={{ width: 'auto', opacity: 1, scale: 1 }}
              exit={{ width: 0, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              style={{ originX: 1 }}
              className="flex items-center gap-0.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-md border border-slate-200/80 dark:border-slate-700 px-0.5 py-0.5 shadow-sm overflow-hidden whitespace-nowrap"
            >
              <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
                title="Drag to reorder"
                className={`${btnBase} cursor-grab active:cursor-grabbing touch-none`}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={isFirst}
                aria-label="Move up"
                title="Move up"
                className={btnBase}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={isLast}
                aria-label="Move down"
                title="Move down"
                className={btnBase}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {onDelete && (
                <>
                  <span
                    className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    aria-label="Delete"
                    title="Delete"
                    className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-1.5 rounded text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action button trigger */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Hide actions' : 'Show actions'}
          title={isOpen ? 'Hide actions' : 'Show actions'}
          className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-center"
        >
          {isOpen ? <X className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
        </button>
      </div>
      {children}
    </div>
  );
};

export default SortableItem;
