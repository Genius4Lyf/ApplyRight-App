import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FolderPlus, GripVertical, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useAriaStudio } from '../../context/AriaStudioContext';
import AriaOrbit from '../cv/AriaOrbit';
import { UNCATEGORIZED, skillCategoryLabel } from '../../lib/skillCategories';
import {
  moveSkill,
  renameCategory,
  skillCategories,
  skillCategory,
  skillName,
} from '../../lib/skillGroups';

// The Live Preview's SKILLS section, editable in place.
//
// Skills are the one list on the sheet with no _sortId: a skill is addressed by its NAME
// and nothing else. That fact still decides most of this component —
//
//   • no ↑/↓ and no PreviewEntryRow: there is no id to order BY, so ordering WITHIN a
//     category is out of scope rather than merely unimplemented;
//   • no focus-mode lock: Aria interviews ENTRIES, and a skill isn't one, so no pill can
//     ever be the active entry. Skills stay editable in edit mode, always;
//   • DELETE is a whole-array replace (replaceSkills) filtered by name, because position
//     is identity and the array is the only thing there is to address.
//
// MOVING a skill between categories is the one place that rule bends. A real CV can carry
// the same name in two categories (imports do), so a dragged pill is addressed by its
// INDEX — which is also what `moveSkill` needs to splice with. See lib/skillGroups.js for
// why a move repositions the element instead of just relabelling it.
//
// Three writers, deliberately different:
//   DELETE / MOVE / RENAME → replaceSkills(next) — whole-array replace. It owns the
//            optimistic apply, the rollback and the failure toast, so a failure is already
//            handled by the time it returns.
//   ADD    → applySkills([skill]) — MERGES and dedupes case-insensitively, returning
//            { ok, added }. `added: 0` means the skill was already on the CV.
//
// No recompute is fired from here. scoreSignature folds skills to their NAMES, so adding
// or deleting one already moves the signature StudioChat's auto-rescore watches — and a
// move or a rename deliberately does NOT, because a category cannot change a fit score and
// re-scoring on every drag would spend the user's credits on cosmetics.
//
// SUGGEST WITH ARIA is the one thing here that is NOT a write, and it deliberately does
// not reach for the command channel either: the block's context use stays the skills
// WRITERS. It calls `onSuggestWithAria` and the PARENT requests the command and closes the
// sheet — the same split as "Edit with Aria", which PreviewEntryRow also only ever ASKS
// for and StudioLivePreview wires.

// Skill shape helpers live in lib/skillGroups so the pure move/rename logic and this
// component can never disagree about what a category is.
const lower = (s) => (s || '').trim().toLowerCase();

const pillBase =
  'group inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 pl-2 pr-1 py-0.5 text-[11.5px] font-medium text-slate-600 dark:text-slate-300';
// The same reveal PreviewEntryRow uses: hidden until hover/focus on a device that HAS
// hover, permanently visible on touch (where there is no hover to reveal it with).
const revealOnHover =
  'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';
const field =
  'min-w-0 flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-2 py-1 text-[12px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors disabled:opacity-50';
const iconButton =
  'inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-400 transition-[opacity,color,background-color] hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200';

// A category name can be anything the user types, so it is carried whole after a fixed
// prefix rather than interpolated into a structured id.
const GROUP_PREFIX = 'skillgroup:';
const NEW_GROUP_ID = 'skillgroup:__new__';

// One droppable per category heading + its pills. The ring is the only affordance saying
// "let go here"; without it a drag over a wrapped row of pills has no target at all.
const SkillGroupDrop = ({ id, disabled, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      className={`-mx-1 rounded-lg px-1 py-0.5 transition-colors ${
        isOver ? 'bg-slate-100 ring-1 ring-slate-300 dark:bg-slate-800/70 dark:ring-slate-600' : ''
      }`}
    >
      {children}
    </div>
  );
};

const PreviewSkillsBlock = ({ onSuggestWithAria, readOnly = false }) => {
  const { t } = useTranslation();
  const { cvData, replaceSkills, applySkills } = useAriaStudio();
  const skills = useMemo(() => cvData?.skills || [], [cvData?.skills]);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', category: '' });
  const [busy, setBusy] = useState(false);
  // The category being renamed, and the skill waiting for a brand-new one to be named.
  const [renaming, setRenaming] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [pendingGroup, setPendingGroup] = useState(null); // { index } after a "new group" drop
  const [newGroupName, setNewGroupName] = useState('');
  const [menuFor, setMenuFor] = useState(null); // index of the pill whose menu is open
  const [dragging, setDragging] = useState(null); // { index, name } while a drag is live
  const nameRef = useRef(null);
  const renameRef = useRef(null);
  const newGroupRef = useRef(null);
  // The datalist has to be addressed by id, and this component can be mounted more than
  // once on a page (the desktop panel + the mobile sheet), so the id can't be a constant.
  const listId = `${useId()}-skill-categories`;

  // Distance/delay thresholds copied from the CV builder's reorder (History.jsx): without
  // them a drag starts on every tap and fights the panel's own scrolling on touch.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // GROUPED, in the document's own order: categories appear in the order their first
  // skill does, and skills keep their order within a category. A Map preserves insertion
  // order; a plain object would too for string keys, but only by accident of the spec.
  //
  // The INDEX travels with each item — it is what a move is addressed by, and deriving it
  // later with indexOf would find the wrong row whenever two skills share a name.
  const groups = useMemo(() => {
    const byCategory = new Map();
    skills.forEach((skill, index) => {
      const name = skillName(skill);
      if (!name) return;
      const category = skillCategory(skill);
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push({ skill, name, index });
    });
    return [...byCategory.entries()];
  }, [skills]);

  // The categories ALREADY on this CV, offered as a datalist so the user reuses one
  // instead of coining a near-duplicate ("Backend" vs "backend").
  //
  // 'Uncategorized' is deliberately NOT offered: it is the STORED fallback for a blank
  // field, and its on-screen label is localized. Listing the localized label would let a
  // French user store the category "Non classé", which no other surface groups by.
  const knownCategories = useMemo(
    () => skillCategories(skills).filter((category) => category !== UNCATEGORIZED),
    [skills]
  );

  // Escape closes whichever inline editor is open, and an outside click closes the menu.
  useEffect(() => {
    if (menuFor === null) return undefined;
    const close = (event) => {
      if (event.target?.closest?.('[data-skill-menu]')) return;
      setMenuFor(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuFor]);

  const closeAdd = () => {
    setAdding(false);
    setForm({ name: '', category: '' });
  };

  const openAdd = () => {
    setAdding(true);
    // The affordance the user clicked is replaced by the form, so focus would otherwise
    // fall back to <body>. requestAnimationFrame: the input doesn't exist yet this tick.
    window.requestAnimationFrame?.(() => nameRef.current?.focus());
  };

  // Matched on NAME, case-insensitively — the same identity applySkills dedupes by, so
  // "React" can't be deleted while "react" survives. Every OTHER skill is passed through
  // untouched (object or string, category and all): this is a whole-array replace, and
  // normalising the survivors here would silently rewrite the rest of the section.
  const remove = async (skill) => {
    if (busy) return;
    const target = lower(skillName(skill));
    setBusy(true);
    // replaceSkills rolls back and toasts on failure — there is nothing to add to that.
    await replaceSkills?.(skills.filter((s) => lower(skillName(s)) !== target));
    setBusy(false);
  };

  // Undo is the whole safety net here, and it is why a move needs no confirmation: the
  // previous array is a complete snapshot, so putting it back is one write. Same pattern
  // the entry delete uses.
  const withUndo = (message, previous) =>
    toast(message, {
      action: {
        label: t('ariaStudio.livePreview.undo'),
        onClick: () => replaceSkills?.(previous),
      },
    });

  const commitMove = async (index, category) => {
    if (busy) return;
    const result = moveSkill(skills, index, category);
    // Already there, or nothing to move. Silent — the user's intent is satisfied.
    if (!result) return;
    const previous = skills;
    setBusy(true);
    const { ok } = (await replaceSkills?.(result.next)) || {};
    setBusy(false);
    if (ok === false) return;
    // The emptied group is worth saying out loud precisely BECAUSE nothing was deleted:
    // the heading is derived, so it disappears with no other trace.
    withUndo(
      result.emptied
        ? t('ariaStudio.livePreview.skillMovedEmptied', {
            category: skillCategoryLabel(result.to, t),
            emptied: skillCategoryLabel(result.emptied, t),
          })
        : t('ariaStudio.livePreview.skillMoved', {
            category: skillCategoryLabel(result.to, t),
          }),
      previous
    );
  };

  const commitRename = async () => {
    const from = renaming;
    const to = renameDraft;
    setRenaming(null);
    setRenameDraft('');
    if (busy || !from) return;
    const result = renameCategory(skills, from, to);
    if (!result) return;
    const previous = skills;
    setBusy(true);
    const { ok } = (await replaceSkills?.(result.next)) || {};
    setBusy(false);
    if (ok === false) return;
    // A plain rename is self-evident — the heading changed in front of them. A MERGE is
    // not: two groups became one, and that is worth both saying and being able to undo.
    if (result.merged) {
      withUndo(
        t('ariaStudio.livePreview.categoriesMerged', {
          category: skillCategoryLabel(result.to, t),
        }),
        previous
      );
    }
  };

  const startRename = (category) => {
    setMenuFor(null);
    setRenaming(category);
    // Uncategorized is a STORED sentinel with a localized display. Seeding the field with
    // that label would let a French user save the category "Non classé", which no other
    // surface groups by — so renaming it starts from empty.
    setRenameDraft(category === UNCATEGORIZED ? '' : category);
    window.requestAnimationFrame?.(() => renameRef.current?.select());
  };

  const startNewGroup = (index) => {
    setMenuFor(null);
    setPendingGroup({ index });
    setNewGroupName('');
    window.requestAnimationFrame?.(() => newGroupRef.current?.focus());
  };

  const commitNewGroup = async () => {
    const target = pendingGroup;
    const name = newGroupName.trim();
    if (!target || !name) return;
    setPendingGroup(null);
    setNewGroupName('');
    await commitMove(target.index, name);
  };

  const onDragEnd = ({ active, over }) => {
    setDragging(null);
    if (!over) return;
    const index = Number(String(active.id).split(':')[1]);
    if (!Number.isInteger(index)) return;
    if (over.id === NEW_GROUP_ID) {
      startNewGroup(index);
      return;
    }
    if (!String(over.id).startsWith(GROUP_PREFIX)) return;
    commitMove(index, String(over.id).slice(GROUP_PREFIX.length));
  };

  const submit = async () => {
    if (busy) return;
    const name = form.name.trim();
    if (!name) return;
    // Blank category → the STORED fallback, so a skill added without one lands in the
    // same bucket the builder and the picker use rather than a fourth spelling of "none".
    const category = form.category.trim() || UNCATEGORIZED;
    setBusy(true);
    const result = await applySkills?.([{ name, category }]);
    setBusy(false);
    // A DUPE is a quiet no-op. applySkills dedupes by name, so `added: 0` means the skill
    // is already on the CV — the user's intent is satisfied and a toast would scold them
    // for it. Clear the field and stay open; the section behind the form already shows
    // the pill they were asking for.
    //
    // A FAILED save is the opposite: applySkills has rolled back and toasted, so the text
    // stays put to retry with rather than being thrown away.
    if (result?.ok === false) return;
    setForm({ name: '', category: '' });
    // Stays OPEN after a success — skills arrive in handfuls, and reopening the form for
    // each one would cost a click per skill. Escape / Cancel is the way out.
    nameRef.current?.focus();
  };

  // Escape closes from either field, stopped from bubbling so it doesn't also close the
  // sheet this preview lives in. Enter commits — both fields are single-line, and a
  // category typed but never submitted is the likeliest way to lose one.
  const keyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeAdd();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submit();
  };

  // Escape must not reach the sheet from the inline editors either.
  const editorKeyDown = (commit, cancel) => (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      cancel();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    commit();
  };

  const set = (key) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // A CV needs at least one skill, so the last pill's × is disabled with the reason rather
  // than removed — same "show why it's blocked" rule the required entry rows follow. Skills
  // carry no _sortId, so "the last one" is simply a length check on the whole array.
  const isLastSkill = skills.length <= 1;
  const removeSkillLabel = isLastSkill
    ? t('ariaStudio.livePreview.cannotEmptySkills')
    : t('ariaStudio.livePreview.removeSkill');
  const canRearrange = !readOnly && groups.length > 0;

  // One draggable pill. Drag is never the ONLY way to move it: the menu beside the handle
  // does the same job, which is what makes this usable on a phone (these pills are ~24px
  // tall) and reachable without a pointer at all.
  const SkillPill = ({ item, category }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `skill:${item.index}`,
      disabled: readOnly || busy,
    });
    const menuOpen = menuFor === item.index;
    const destinations = knownCategories.filter((row) => lower(row) !== lower(category));
    if (category !== UNCATEGORIZED && skills.some((s) => skillCategory(s) === UNCATEGORIZED)) {
      destinations.push(UNCATEGORIZED);
    }

    return (
      <span ref={setNodeRef} className={`relative ${pillBase} ${isDragging ? 'opacity-40' : ''}`}>
        {!readOnly && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={t('ariaStudio.livePreview.dragSkill', { name: item.name })}
            title={t('ariaStudio.livePreview.dragSkill', { name: item.name })}
            className={`${iconButton} -ml-0.5 cursor-grab touch-none active:cursor-grabbing ${revealOnHover}`}
          >
            <GripVertical className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        )}
        {item.name}
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuFor(menuOpen ? null : item.index);
              }}
              disabled={busy}
              data-skill-menu=""
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={t('ariaStudio.livePreview.moveSkillTo', { name: item.name })}
              title={t('ariaStudio.livePreview.moveSkillTo', { name: item.name })}
              className={`${iconButton} ${revealOnHover}`}
            >
              <FolderPlus className="h-2.5 w-2.5" aria-hidden="true" />
            </button>
            {menuOpen && (
              <span
                data-skill-menu=""
                className="absolute right-0 top-[calc(100%+4px)] z-30 flex min-w-[168px] flex-col rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  {t('ariaStudio.livePreview.moveTo')}
                </span>
                {destinations.map((destination) => (
                  <button
                    key={destination}
                    type="button"
                    onClick={() => {
                      setMenuFor(null);
                      commitMove(item.index, destination);
                    }}
                    className="rounded px-2 py-1 text-left text-[11.5px] text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {skillCategoryLabel(destination, t)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => startNewGroup(item.index)}
                  className="rounded px-2 py-1 text-left text-[11.5px] font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                >
                  {t('ariaStudio.livePreview.newGroup')}
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(item.skill)}
              disabled={busy || isLastSkill}
              aria-label={removeSkillLabel}
              title={removeSkillLabel}
              className={`${iconButton} ${revealOnHover}`}
            >
              <X className="h-2.5 w-2.5" aria-hidden="true" />
            </button>
          </>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-2.5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => {
          const index = Number(String(active.id).split(':')[1]);
          setDragging({ index, name: skillName(skills[index]) });
        }}
        onDragCancel={() => setDragging(null)}
        onDragEnd={onDragEnd}
      >
        {groups.length ? (
          groups.map(([category, items]) => (
            <SkillGroupDrop
              key={category}
              id={`${GROUP_PREFIX}${category}`}
              disabled={readOnly || busy}
            >
              {/* The same mono micro-label the other sub-headings on the sheet use
                  (certifications), so a category reads as part of the document rather
                  than as a control — until you click it. */}
              {renaming === category ? (
                <input
                  ref={renameRef}
                  type="text"
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={editorKeyDown(commitRename, () => {
                    setRenaming(null);
                    setRenameDraft('');
                  })}
                  disabled={busy}
                  aria-label={t('ariaStudio.livePreview.renameCategory')}
                  placeholder={t('ariaStudio.livePreview.categoryNamePlaceholder')}
                  /* Bare editable text, not a boxed field: an in-place rename should look
                     like the thing it is renaming. */
                  className="w-full max-w-[16rem] bg-transparent font-mono text-[9px] uppercase tracking-[0.12em] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                />
              ) : readOnly ? (
                <p
                  data-skill-group={category}
                  className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500"
                >
                  {skillCategoryLabel(category, t)}
                </p>
              ) : (
                <button
                  type="button"
                  data-skill-group={category}
                  onClick={() => startRename(category)}
                  title={t('ariaStudio.livePreview.renameCategory')}
                  className="rounded font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
                >
                  {skillCategoryLabel(category, t)}
                </button>
              )}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <SkillPill key={`${category}-${item.index}`} item={item} category={category} />
                ))}
              </div>
            </SkillGroupDrop>
          ))
        ) : (
          <p className="text-[12px] italic text-slate-400 dark:text-slate-500">
            {t('ariaStudio.livePreview.noSkillsYet')}
          </p>
        )}

        {/* Splitting a badly-grouped category is the main reason anyone rearranges these,
            and without somewhere to drop a skill it would mean deleting and retyping it. */}
        {canRearrange && (
          <NewGroupDrop
            disabled={busy}
            pending={!!pendingGroup}
            inputRef={newGroupRef}
            value={newGroupName}
            onChange={setNewGroupName}
            onCommit={commitNewGroup}
            onCancel={() => {
              setPendingGroup(null);
              setNewGroupName('');
            }}
            editorKeyDown={editorKeyDown}
          />
        )}

        {/* What is actually under the cursor. Without it the pill just vanishes on
            pick-up and there is nothing to aim with. */}
        <DragOverlay>
          {dragging ? (
            <span className={`${pillBase} shadow-lg ring-1 ring-slate-300 dark:ring-slate-600`}>
              {dragging.name}
            </span>
          ) : null}
        </DragOverlay>
      </DndContext>

      {readOnly ? null : adding ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={set('name')}
            onKeyDown={keyDown}
            disabled={busy}
            aria-label={t('ariaStudio.livePreview.skillNamePlaceholder')}
            placeholder={t('ariaStudio.livePreview.skillNamePlaceholder')}
            className={`${field} basis-[8rem]`}
          />
          {/* A text input WITH a datalist, not a <select>: the categories on a CV are
              free-form (Aria generates them, the user invents them), so the field has to
              accept a new one while still offering the ones already in use. */}
          <input
            type="text"
            list={listId}
            value={form.category}
            onChange={set('category')}
            onKeyDown={keyDown}
            disabled={busy}
            aria-label={t('ariaStudio.livePreview.skillCategoryPlaceholder')}
            placeholder={t('ariaStudio.livePreview.skillCategoryPlaceholder')}
            className={`${field} basis-[8rem]`}
          />
          <datalist id={listId}>
            {knownCategories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !form.name.trim()}
            className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {t('ariaStudio.jobCapture.add')}
          </button>
          <button
            type="button"
            onClick={closeAdd}
            disabled={busy}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11.5px] font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            {t('ariaStudio.livePreview.addSkill')}
          </button>
          {/* Beside "Add skill", not instead of it: typing your own is free and instant,
              Aria's suggestions are a paid round-trip, and the cheap option stays first.
              Rendered only when the parent wired a handler — the preview mounts in tests
              and stories without the command channel, and an affordance that silently
              does nothing is worse than one that isn't there. */}
          {onSuggestWithAria && (
            <button
              type="button"
              onClick={onSuggestWithAria}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-[11.5px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100"
            >
              <AriaOrbit size={11} tone="mono" className="shrink-0" />
              {t('ariaStudio.livePreview.suggestSkillsWithAria')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// The "new group" target, and the name it asks for once something lands on it. Split out
// so the droppable hook is not conditional on `pending`.
const NewGroupDrop = ({
  disabled,
  pending,
  inputRef,
  value,
  onChange,
  onCommit,
  onCancel,
  editorKeyDown,
}) => {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: NEW_GROUP_ID, disabled });

  if (pending) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={editorKeyDown(onCommit, onCancel)}
          aria-label={t('ariaStudio.livePreview.categoryNamePlaceholder')}
          placeholder={t('ariaStudio.livePreview.categoryNamePlaceholder')}
          className={`${field} basis-[10rem]`}
        />
        <button
          type="button"
          onClick={onCommit}
          disabled={!value.trim()}
          className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          {t('ariaStudio.jobCapture.add')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t('common.cancel')}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border border-dashed px-2 py-1.5 text-[11px] font-medium transition-colors ${
        isOver
          ? 'border-slate-400 bg-slate-100 text-slate-700 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-200'
          : 'border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500'
      }`}
    >
      {t('ariaStudio.livePreview.dropForNewGroup')}
    </div>
  );
};

export default PreviewSkillsBlock;
