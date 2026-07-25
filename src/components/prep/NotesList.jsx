import React, { useEffect, useState } from 'react';
import { Plus, FileText, Pencil, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation, Trans } from 'react-i18next';
import InterviewPrepService from '../../services/interviewPrep.service';
import NoteEditor from './NoteEditor';

// Derive a display title when the user didn't supply one — use the first
// non-empty line of the body, truncated. `untitled` is the resolved i18n
// fallback (passed in so this stays a pure module helper).
const deriveTitle = (note, untitled) => {
  if (note.title && note.title.trim()) return note.title.trim();
  const firstLine = (note.body || '').split('\n').find((l) => l.trim());
  if (!firstLine) return untitled;
  return firstLine.length > 60 ? `${firstLine.slice(0, 60).trim()}…` : firstLine.trim();
};

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Read-only view of a saved note — what you land on when reopening one, with an
// Edit button to drop into the editor.
const NoteView = ({ note, onEdit, onClose, onDelete }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 min-w-0">
          {deriveTitle(note, t('interviewPrep.notesList.untitled'))}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold"
          >
            <Pencil className="w-3.5 h-3.5" /> {t('interviewPrep.notesList.edit')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            title={t('interviewPrep.notesList.close')}
            aria-label={t('interviewPrep.notesList.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {note.body ? (
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed mt-3">
          {note.body}
        </p>
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic mt-3">
          {t('interviewPrep.notesList.noContent')}
        </p>
      )}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {note.updatedAt
            ? t('interviewPrep.notesList.updated', { when: formatTimestamp(note.updatedAt) })
            : ''}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-xs font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" /> {t('interviewPrep.notesList.delete')}
        </button>
      </div>
    </div>
  );
};

const NotesList = ({ applicationId, initialNotes = [], onChange, seed, onSeedConsumed }) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState(initialNotes);
  const [openId, setOpenId] = useState(null);
  // 'view' = read-only (default when reopening a saved note); 'edit' = editor.
  const [mode, setMode] = useState('view');
  // Local draft id used before the server has assigned one.
  const NEW_NOTE_ID = '__new__';
  // When opened with a `seed` (e.g. the "Draft your answer" CTA), the new-note
  // editor is prefilled with this starter title/body.
  const [seededDraft, setSeededDraft] = useState(null);
  const newDraft =
    openId === NEW_NOTE_ID
      ? {
          id: NEW_NOTE_ID,
          title: seededDraft?.title || '',
          body: seededDraft?.body || '',
          status: 'draft',
        }
      : null;
  const openNote = newDraft || notes.find((n) => n.id === openId);

  // Consume an incoming seed once on mount: open a prefilled new note, then tell
  // the parent to clear it so re-entering Notes doesn't reopen it.
  useEffect(() => {
    if (seed) {
      setSeededDraft({ title: seed.title || '', body: seed.body || '' });
      setOpenId(NEW_NOTE_ID);
      setMode('edit');
      onSeedConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (next) => {
    setNotes(next);
    onChange?.(next);
  };

  const handleAdd = () => {
    setSeededDraft(null);
    setOpenId(NEW_NOTE_ID);
    setMode('edit');
  };

  // First write for a brand-new note. Subsequent writes (autosave or Save)
  // route through handleUpdate against the server-assigned id.
  const handleCreate = async ({ title, body, status }) => {
    const { note } = await InterviewPrepService.createNote(applicationId, {
      title,
      body,
      status,
    });
    commit([note, ...notes]);
    setOpenId(note.id);
    return { note };
  };

  const handleUpdate =
    (noteId) =>
    async ({ title, body, status }) => {
      const { note } = await InterviewPrepService.updateNote(applicationId, noteId, {
        title,
        body,
        status,
      });
      commit(notes.map((n) => (n.id === noteId ? note : n)));
      return { note };
    };

  const handleDelete = async (noteId) => {
    if (!window.confirm(t('interviewPrep.notesList.confirmDelete'))) return;
    try {
      await InterviewPrepService.deleteNote(applicationId, noteId);
      commit(notes.filter((n) => n.id !== noteId));
      if (openId === noteId) setOpenId(null);
    } catch (e) {
      toast.error(t('interviewPrep.notesList.failedDelete'));
      console.error(e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('interviewPrep.notesList.myNotes')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('interviewPrep.notesList.autoSavesHint')}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('interviewPrep.notesList.newNote')}</span>
        </button>
      </div>

      {openNote && (
        <div className="mb-4">
          {mode === 'edit' || openNote.id === NEW_NOTE_ID ? (
            <NoteEditor
              key={openNote.id}
              note={openNote}
              onAutosave={openNote.id === NEW_NOTE_ID ? handleCreate : handleUpdate(openNote.id)}
              onSave={openNote.id === NEW_NOTE_ID ? handleCreate : handleUpdate(openNote.id)}
              onDelete={openNote.id === NEW_NOTE_ID ? null : () => handleDelete(openNote.id)}
              onCancel={() => {
                // Unsaved brand-new draft → back to the list; an existing note →
                // back to its read view.
                if (openNote.id === NEW_NOTE_ID) setOpenId(null);
                else setMode('view');
              }}
            />
          ) : (
            <NoteView
              note={openNote}
              onEdit={() => setMode('edit')}
              onClose={() => setOpenId(null)}
              onDelete={() => handleDelete(openNote.id)}
            />
          )}
        </div>
      )}

      {notes.length === 0 && !openNote ? (
        <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
          <FileText className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <Trans
              i18nKey="interviewPrep.notesList.emptyState"
              components={{ b: <span className="font-semibold" /> }}
            />
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => {
            const isOpen = openId === note.id;
            if (isOpen) return null;
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(note.id);
                    setMode('view');
                  }}
                  className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {deriveTitle(note, t('interviewPrep.notesList.untitled'))}
                        </p>
                        {note.status === 'draft' && (
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {t('interviewPrep.notesList.draft')}
                          </span>
                        )}
                      </div>
                      {note.body && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {note.body}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                        {note.updatedAt
                          ? t('interviewPrep.notesList.updated', {
                              when: formatTimestamp(note.updatedAt),
                            })
                          : t('interviewPrep.notesList.justNow')}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NotesList;
