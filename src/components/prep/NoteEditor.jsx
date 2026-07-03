import React, { useEffect, useRef, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';

const AUTOSAVE_DELAY_MS = 3000;

// Inline note editor. Calls `onAutosave` after a 3s pause in typing with a
// draft payload, and `onSave` when the user explicitly hits Save. `onDelete`
// is omitted for the brand-new-note case (caller controls).
const NoteEditor = ({ note, onAutosave, onSave, onDelete, onCancel }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [status, setStatus] = useState(note?.status || 'draft');
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);
  const lastSentRef = useRef({ title: note?.title || '', body: note?.body || '' });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Debounced autosave on title/body change.
  useEffect(() => {
    if (!onAutosave) return;
    if (title === lastSentRef.current.title && body === lastSentRef.current.body) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const result = await onAutosave({ title, body, status: 'draft' });
        lastSentRef.current = { title, body };
        setStatus('draft');
        setSavedAt(new Date());
        if (result?.note?.id && !note?.id) {
          // Caller upgraded a local draft into a persisted note — let parent
          // swap us into edit mode by re-passing the note. Nothing to do here.
        }
      } catch (e) {
        console.error('Note autosave failed', e);
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_DELAY_MS);
  }, [title, body, onAutosave, note?.id, status]);

  const handleSave = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    try {
      setSaving(true);
      await onSave({ title, body, status: 'saved' });
      lastSentRef.current = { title, body };
      setStatus('saved');
      setSavedAt(new Date());
    } catch (e) {
      console.error('Note save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const savedHint = (() => {
    if (saving) return 'Saving…';
    if (status === 'saved' && savedAt) return 'Saved · just now';
    if (status === 'draft' && savedAt) return 'Draft saved · just now';
    if (status === 'draft' && (title || body)) return 'Editing — auto-saves in 3s';
    return null;
  })();

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title (optional)"
          className="flex-1 text-[16px] sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none bg-transparent"
        />
        {savedHint && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {status === 'saved' && !saving && (
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
            )}
            {savedHint}
          </span>
        )}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        ref={(el) => el && note?.id === '__new__' && el.focus()}
        placeholder="Jot down anything you want to remember — STAR stories, follow-ups, things to research…"
        className="w-full text-[16px] sm:text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder-slate-400 resize-y"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (!title.trim() && !body.trim())}
          className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          Save
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <span className="inline-flex items-center gap-1">
              <X className="w-3.5 h-3.5" />
              Close
            </span>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto px-3 py-2 rounded-lg text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-sm font-medium inline-flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default NoteEditor;
