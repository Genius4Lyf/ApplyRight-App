import React, { useRef, useState } from 'react';
import { PencilLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';
import AriaOrbit from '../cv/AriaOrbit';

// The Live Preview's SUMMARY section, editable in place.
//
// The summary is a SINGLE FIELD, and that one fact decides this component's shape the way
// "a skill has no _sortId" decides PreviewSkillsBlock's —
//
//   • no list, no drag, no ↑/↓, no PreviewEntryRow: there is one paragraph and nothing to
//     order it against;
//   • "one editor at a time" needs no lifting to the parent (as `editingSortId` does for
//     the three entry lists) — a single boolean here IS the whole invariant;
//   • no focus-mode lock: Aria interviews ENTRIES, and the summary isn't one, so it can
//     never be the active entry and stays editable in edit mode, always.
//
// Two routes out, deliberately different — the same split the skills section draws:
//   MANUAL → applySummary(text) — an inline write. It owns the optimistic apply, the
//            rollback and the toast, so a failure is already handled by the time it
//            returns; all that's left here is whether to close.
//   ARIA   → onDraftWithAria() — NOT a write and NOT a generation. It calls the parent,
//            which requests the command and closes the sheet, exactly as "Edit with Aria"
//            is only ever ASKED for by a row and wired by StudioLivePreview. The chat owns
//            the career-stage question, the consent, the charge and the phase.
//
// No recompute is fired from here. scoreSignature includes the summary text, so an edit
// already moves the signature StudioChat's auto-rescore watches.

// The same reveal PreviewEntryRow and the skills pills use: hidden until hover/focus on a
// device that HAS hover, permanently visible on touch (where there is no hover to reveal
// it with).
const revealOnHover =
  'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';
const quietButton =
  'inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-[11.5px] font-medium text-slate-500 transition-[opacity,color,border-color] hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100';
const field =
  'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-1 text-[12.5px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors disabled:opacity-50';

// `readOnly` is the parent's completeness lock: an incomplete BUILD session shows its
// document but hands out no affordances. Only the two triggers go — the paragraph (and
// its "no summary yet" placeholder) still renders, because seeing the summary appear is
// the point of the panel.
const PreviewSummaryBlock = ({ onDraftWithAria, readOnly = false }) => {
  const { t } = useTranslation();
  const { cvData, applySummary } = useAriaStudio();
  const summary = (cvData?.professionalSummary || '').trim();

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  // SEEDED ONCE, at the moment the editor opens — never from a render. cvData re-renders
  // constantly here (an Aria turn, an autosave, an externalEditNonce bump), and re-seeding
  // on any of those would wipe half-typed text mid-sentence.
  const openEdit = () => {
    setText(cvData?.professionalSummary || '');
    setEditing(true);
    // The ✎ that opened this is replaced by the editor, so focus would otherwise fall back
    // to <body>. requestAnimationFrame: the textarea doesn't exist yet this tick.
    window.requestAnimationFrame?.(() => textareaRef.current?.focus());
  };

  const closeEdit = () => {
    setEditing(false);
    setText('');
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    let result;
    try {
      result = await applySummary?.(text.trim());
    } catch {
      // applySummary already catches its own save failures, so this is belt-and-braces: an
      // unexpected throw must not close the editor and take the user's text with it.
      result = { ok: false };
    }
    setSaving(false);
    // On failure applySummary has already rolled the summary back and toasted. Staying open
    // keeps the user's text on screen to retry with — closing would throw it away and the
    // sheet would silently show the old summary as though nothing had been typed.
    if (result?.ok) closeEdit();
  };

  // Escape discards and closes, stopped from bubbling so it doesn't also close the sheet
  // this preview lives in. Enter is deliberately NOT bound: the summary is PROSE, so a
  // paragraph break has to stay a paragraph break — Save is the button.
  const keyDown = (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    closeEdit();
  };

  if (editing) {
    return (
      <div className="space-y-1.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={keyDown}
          disabled={saving}
          rows={Math.min(8, Math.max(3, text.split('\n').length + 1))}
          aria-label={t('ariaStudio.livePreview.summaryPlaceholder')}
          placeholder={t('ariaStudio.livePreview.summaryPlaceholder')}
          className={`${field} resize-y leading-relaxed`}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            onKeyDown={keyDown}
            disabled={saving}
            className="btn-primary px-3 py-1 text-[11px] disabled:opacity-50"
          >
            {t('ariaStudio.livePreview.saveEdit')}
          </button>
          <button
            type="button"
            onClick={closeEdit}
            onKeyDown={keyDown}
            disabled={saving}
            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-1.5 py-1 rounded transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      {summary ? (
        <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
          {summary}
        </p>
      ) : (
        <p className="text-[12px] italic text-slate-400 dark:text-slate-500">
          {t('ariaStudio.livePreview.noSummaryYet')}
        </p>
      )}
      {!readOnly && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={openEdit} className={`${quietButton} ${revealOnHover}`}>
            <PencilLine className="h-3 w-3 shrink-0" aria-hidden="true" />
            {t('ariaStudio.livePreview.editEntry')}
          </button>
          {/* Beside the manual ✎, not instead of it: typing your own is free and instant,
              Aria's draft is a paid round-trip, and the cheap option stays first. Rendered
              only when the parent wired a handler — the preview mounts in tests and stories
              without the command channel, and an affordance that silently does nothing is
              worse than one that isn't there. */}
          {onDraftWithAria && (
            <button
              type="button"
              onClick={onDraftWithAria}
              className={`${quietButton} ${revealOnHover}`}
            >
              <AriaOrbit size={11} tone="mono" className="shrink-0" />
              {t('ariaStudio.livePreview.draftSummaryWithAria')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PreviewSummaryBlock;
