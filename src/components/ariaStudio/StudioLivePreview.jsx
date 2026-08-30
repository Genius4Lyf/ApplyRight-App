import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Eye, PencilLine } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useAriaStudio } from '../../context/AriaStudioContext';
import { BAND_TEXT, BAND_RULEBG } from '../../lib/noteStyles';
import {
  PREVIEW_ORDER,
  VERDICT_LABEL_KEY,
  bandsByKey,
  bandForKey,
  improvedKeys,
  parseBullets,
} from '../../lib/studioPreview';
import AriaOrbit from '../cv/AriaOrbit';
import CvLanguageToggle from '../cv/CvLanguageToggle';
import PreviewEntryRow from './PreviewEntryRow';
import PreviewEntryEditor from './PreviewEntryEditor';
import PreviewCertsBlock from './PreviewCertsBlock';
import PreviewLanguagesBlock from './PreviewLanguagesBlock';
import PreviewContactBlock from './PreviewContactBlock';
import PreviewSkillsBlock from './PreviewSkillsBlock';
import PreviewSummaryBlock from './PreviewSummaryBlock';
import StudioTemplatePreview from './StudioTemplatePreview';
import { cvLabel } from '../../lib/cvLabels';
import { withoutBlankEntries, hasSubstance, editorUnlocked } from '../../lib/studioFlow';

// The Live Preview — a structured, legible render of the CV built straight from cvData
// (NOT the template markdown), so it updates the instant an edit lands. Each section
// carries a left band rail + a verdict chip coloured from the persisted studioScan, so
// the document and its section-by-section verdict live in one place. The real template
// render stays on the download path (StudioPrintSurface) — this is the working view.

// One section block: the band rail down the left, a labelled header with its verdict
// chip, then the caller's content. Pulses green briefly when its band just improved.
const SectionBlock = ({ label, band, pulsing, children }) => {
  const { t } = useTranslation();
  return (
    <section className={`relative pl-4 rounded-r-md ${pulsing ? 'aria-just-fixed' : ''}`}>
      <span
        className={`absolute left-0 top-0.5 bottom-0.5 w-[3px] rounded-full ${
          BAND_RULEBG[band] || 'bg-slate-300 dark:bg-slate-600'
        }`}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          {label}
        </h3>
        {band !== 'neutral' && (
          <span
            className={`shrink-0 font-mono text-[9px] uppercase tracking-wider font-semibold ${BAND_TEXT[band]}`}
          >
            {t(VERDICT_LABEL_KEY[band])}
          </span>
        )}
      </div>
      {children}
    </section>
  );
};

// A body list whose entries can be re-ordered — by drag on a pointer device, or by the
// ↑/↓ chevrons anywhere. Both paths end in ONE call: reorderEntries(section, ids).
//
// ⚠ `section` is the SECTION_LIST vocabulary, where the projects key is SINGULAR:
// { experience:'experience', PROJECT:'projects', education:'education' }. Passing
// 'projects' resolves to no list key and the reorder silently no-ops — so the projects
// list below passes 'project'.
//
// No recompute is triggered here, deliberately. Re-ordering changes neither a section's
// text nor its entry count, and scanSections joins entry text order-independently, so a
// reorder is score-neutral.
//
// DELETE takes the same `section` token but a different route: the row's Remove control
// REQUESTS a deleteEntry command rather than calling removeEntry here. Deleting the entry
// Aria is mid-interview on has to unpin BEFORE the entry leaves cvData, or StudioChat's
// self-heal fires its own "pin cleared" line and races the save — and only StudioChat can
// order that. A delete DOES move the score, but auto-recompute is a later slice; the score
// refreshes on the next manual re-score.
//
// EDIT is a third route again: a MANUAL, in-place edit that writes through applyEntryEdit
// from inside PreviewEntryEditor. No command channel — nothing has to unpin for a field to
// change, so there is no ordering problem for StudioChat to arbitrate. The editor takes
// the SAME `section` token ('project' singular) and REPLACES the row entirely, which is
// how the grip stops being draggable mid-edit: it isn't rendered.
//
// EDIT WITH ARIA is the delete route, not the edit route: it REQUESTS a command, because
// dropping the user into the interview means pinning an entry / setting a rewrite target,
// and the transcript is StudioChat's to write. `canEditWithAria` gates whether the row
// even offers it — education has no interview to route into.
//
// FOCUS MODE is the return path of that same wire. `activeEntry` is read HERE rather than
// threaded down from the panel, because this component already reads the context and every
// one of the three lists renders through it — one lookup instead of three props that must
// be kept in step. The match is on _sortId alone: ids are unique across the whole document,
// so the entry Aria is on can only ever be one row, in one list.
const ReorderableList = ({
  section,
  entries,
  className,
  editingSortId,
  onEdit,
  onCloseEdit,
  onEditWithAria,
  canEditWithAria = false,
  readOnly = false,
  children,
}) => {
  const { t } = useTranslation();
  const { reorderEntries, requestStudioCommand, activeEntry } = useAriaStudio();

  // The builder's sensor config, unchanged: a 5px drag threshold so a click still reads
  // as a click, a 200ms hold on touch so a scroll isn't hijacked, and keyboard support.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // `entries` is the DISPLAYED (blank-filtered) list, which is exactly what reorderEntries
  // wants: it appends any hidden placeholder rows last rather than treating "absent from
  // the order" as a delete.
  const commit = (next) =>
    reorderEntries?.(
      section,
      next.map((e) => e._sortId)
    );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = entries.findIndex((e) => e._sortId === active.id);
    const to = entries.findIndex((e) => e._sortId === over.id);
    if (from === -1 || to === -1) return;
    commit(arrayMove(entries, from, to));
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;
    commit(arrayMove(entries, index, target));
  };

  // A required section may never be emptied: experience and education must each keep at
  // least one entry. `entries` is already the blank-filtered displayed list, so its length
  // IS the substantive count — the last real row is exactly the one whose delete is blocked.
  // Projects is not required, so its rows stay removable to empty (Phase 3 adds the re-add).
  const requiredSection = section === 'experience' || section === 'education';
  const canRemove = !(requiredSection && entries.length <= 1);
  const removeReason = requiredSection
    ? t(
        section === 'experience'
          ? 'ariaStudio.livePreview.cannotEmptyExperience'
          : 'ariaStudio.livePreview.cannotEmptyEducation'
      )
    : '';

  // `readOnly` guards the editor branch as well as the row's controls: the lock can land
  // WHILE an editor is open (an edit that empties a section un-completes the CV), and a
  // live form inside a read-only document would be the one way back in.
  const rows = entries.map((entry, index) =>
    entry._sortId === editingSortId && !readOnly ? (
      // In the entry's own slot, inside this same SectionBlock — the document keeps
      // its shape while one entry becomes editable.
      <PreviewEntryEditor
        key={entry._sortId}
        section={section}
        entry={entry}
        onClose={onCloseEdit}
      />
    ) : (
      <PreviewEntryRow
        key={entry._sortId}
        id={entry._sortId}
        index={index}
        total={entries.length}
        onMoveUp={() => move(index, -1)}
        onMoveDown={() => move(index, 1)}
        // The row only ASKS; the parent owns which entry is open, so one edit at a
        // time and no editor inside the dnd wrapper.
        onEdit={() => onEdit?.(entry._sortId)}
        // Told, not derived: the row never decides which sections have an
        // interview. Same `section` token again — 'project' singular.
        canEditWithAria={canEditWithAria}
        onEditWithAria={() => onEditWithAria?.(section, entry._sortId)}
        // Same `section` token the reorder uses — 'project' singular for projects.
        onRemove={() => requestStudioCommand?.('deleteEntry', section, entry._sortId)}
        // The last role/degree can't be deleted — the row renders its Remove disabled
        // with `removeReason` on hover rather than hiding it.
        canRemove={canRemove}
        removeReason={removeReason}
        // Aria is on THIS row: the row marks itself and drops every control.
        isActive={!!activeEntry && entry._sortId === activeEntry.sortId}
        readOnly={readOnly}
      >
        {children(entry)}
      </PreviewEntryRow>
    )
  );

  // No DndContext at all when locked — not a disabled one. The rows carry no grip to start
  // a drag from, so the wrapper would only be listening for gestures nothing can begin.
  if (readOnly) return <div className={className}>{rows}</div>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={entries.map((e) => e._sortId)} strategy={verticalListSortingStrategy}>
        <div className={className}>{rows}</div>
      </SortableContext>
    </DndContext>
  );
};

const Bullets = ({ description }) => {
  const bullets = parseBullets(description);
  if (!bullets.length) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {bullets.map((b, i) => (
        <li
          key={i}
          className="relative pl-3.5 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 before:content-['•'] before:absolute before:left-0 before:text-slate-400 dark:before:text-slate-500"
        >
          {b}
        </li>
      ))}
    </ul>
  );
};

// The quiet "add another" footer under an entry-section's list: a label plus two ghost
// buttons, Add manually / Build with Aria. Same shape in all three entry sections, so it
// lives once here rather than three times inline.
const AddEntryFooter = ({ labelKey, onAddManually, onAddWithAria }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
        {t(labelKey)}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onAddManually}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t('ariaStudio.livePreview.addManually')}
        </button>
        <button
          type="button"
          onClick={onAddWithAria}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t('ariaStudio.livePreview.buildWithAria')}
        </button>
      </div>
    </div>
  );
};

// `isSheet` says HOW this preview is mounted, not how wide the window is: on the bottom
// sheet the chat is behind the preview, so handing an entry to Aria has to close it or
// the user is staring at the document while she asks her first question. On the inline
// desktop panel both stay open — that's the whole payoff.
const StudioLivePreview = ({ onClose, isSheet = false }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const {
    cvData,
    updateCvData,
    requestStudioCommand,
    activeEntry,
    addRole,
    addProject,
    addEducation,
    removeEntry,
  } = useAriaStudio();
  const scan = cvData?.studioScan;

  // ── Hand an entry to Aria. ──
  //
  // A REQUEST, never a write: StudioChat owns the transcript and the phase, so it's the
  // one that pins the entry (build) or sets the rewrite target (tailor). Same command
  // channel, same `section` vocabulary as deleteEntry — 'project' singular.
  const editWithAria = (section, sortId) => {
    requestStudioCommand?.('editWithAria', section, sortId);
    if (isSheet) onClose?.();
  };

  // ── Hand the SKILLS section to Aria. ──
  //
  // Same command channel, same close-on-mobile rule, no sortId (a skill carries none):
  // the payload's `null` sortId is what keeps it out of the editWithAria/deleteEntry
  // branches, which are both guarded on their own `type`. Nothing is generated here —
  // StudioChat routes the command to build:skills or the fix:skills flow and owns the
  // consent, the charge and the phase.
  const suggestSkills = () => {
    requestStudioCommand?.('suggestSkills', 'skills', null);
    if (isSheet) onClose?.();
  };

  // ── Hand the SUMMARY section to Aria. ──
  //
  // Same command channel, same close-on-mobile rule, no sortId (the summary is a single
  // field, not an entry row): the payload's `null` sortId is what keeps it out of the
  // editWithAria/deleteEntry branches, exactly as it does for suggestSkills. Nothing is
  // generated here — StudioChat routes the command to build:summary or the fix:summary
  // flow and owns the career stage, the consent, the charge and the phase.
  const draftSummary = () => {
    requestStudioCommand?.('draftSummary', 'summary', null);
    if (isSheet) onClose?.();
  };

  // ── Add a new entry, manually or with Aria. ──
  //
  // Same `section` vocabulary as everywhere else on this sheet ('experience' | 'project' |
  // 'education'). Manual creates a real (blank) entry straight away and opens its inline
  // editor in the same slot the row would have used; Aria routes through the command
  // channel like every other hand-off here, so StudioChat owns the pin and the interview.
  const addManually = async (section) => {
    const create =
      section === 'project' ? addProject : section === 'education' ? addEducation : addRole;
    const sortId = await create();
    if (sortId) setEditingSortId(sortId);
  };
  const addWithAria = (section) => {
    requestStudioCommand?.('addEntry', section, null);
    if (isSheet) onClose?.();
  };

  // ── Which entry is being edited, ONE at a time. ──
  //
  // It lives up here rather than in each row because "one open editor" is a property of
  // the sheet, not of a row: two rows can't both hold it, and the row that opened it is
  // the row the editor replaces. A _sortId is unique across the whole document, so a
  // single value is enough to address any entry in any of the three lists.
  const [editingSortId, setEditingSortId] = useState(null);
  // An entry that closes still blank was an abandoned "Add manually" — an EXISTING entry
  // is never blank, so this only ever catches a just-created one — and a lingering blank
  // row would sit there as a phantom "Add" the user never finished. Prune it on close.
  const closeEdit = () => {
    const sortId = editingSortId;
    if (sortId) {
      const lists = [
        ['experience', cvData?.experience],
        ['project', cvData?.projects],
        ['education', cvData?.education],
      ];
      for (const [token, list] of lists) {
        const entry = (list || []).find((e) => e._sortId === sortId);
        if (entry) {
          if (!hasSubstance(entry)) removeEntry?.(token, sortId);
          break;
        }
      }
    }
    setEditingSortId(null);
  };
  const [viewMode, setViewMode] = useState('edit');

  // The lock outranks the manual editor. If Aria takes over the entry that was mid-edit,
  // drop the form and let the row show the marker instead — an entry she just began
  // interviewing on shouldn't sit in a half-typed manual form. Cannot loop: the effect
  // only fires while the two ids genuinely differ, and the set it triggers makes the
  // next render's condition false.
  useEffect(() => {
    if (activeEntry && activeEntry.sortId === editingSortId) setEditingSortId(null);
  }, [activeEntry, editingSortId]);

  // ── "See it change" pulse: when a re-band improves a section, glow it once. ──
  const [pulsing, setPulsing] = useState({});
  const prevBandsRef = useRef(bandsByKey(scan)); // seed with current so the first render never pulses
  useEffect(() => {
    const next = bandsByKey(scan);
    const gained = improvedKeys(prevBandsRef.current, next);
    prevBandsRef.current = next;
    if (!gained.length || reduce) return undefined;
    setPulsing((p) => ({ ...p, ...Object.fromEntries(gained.map((k) => [k, true])) }));
    const t = setTimeout(
      () => setPulsing((p) => ({ ...p, ...Object.fromEntries(gained.map((k) => [k, false])) })),
      1200
    );
    return () => clearTimeout(t);
    // Keyed on the serialised bands, so a recompute that only moves a band fires this,
    // but an unrelated cvData change (which doesn't touch scan) does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(bandsByKey(scan)), reduce]);

  const info = cvData?.personalInfo || {};
  const capturedCv = withoutBlankEntries(cvData);

  // ── The completeness lock. ──
  //
  // A build session's document is READ-ONLY until the CV is actually complete. The sheet
  // still renders — watching it fill in is the whole point of this panel — but nothing on
  // it can be edited, reordered or deleted, and the view toggle goes with it.
  //
  // Gated on `capturedCv`, NOT on cvData, for the same reason buildProgress is: the
  // Studio persists a blank row before /coach can write into it by _sortId, so the raw
  // document reads as complete the instant a section is STARTED. Filtering the
  // placeholders out first keeps one definition of "complete" and refuses to count an
  // empty row as work.
  //
  // Tailor sessions arrive with a finished CV in hand, so they are never locked.
  //
  // The rule now lives in studioFlow.editorUnlocked, shared with the Studio header — whose
  // live dot ADVERTISES this editor. Two copies of "is it unlocked?" is how the dot ends
  // up blinking at a panel that is still read-only.
  const isBuildSession = cvData?.studioKind === 'build';
  const canEdit = editorUnlocked(cvData);

  const experience = capturedCv.experience || [];
  const projects = capturedCv.projects || [];
  const education = capturedCv.education || [];
  const certifications = cvData?.certifications || [];
  const skills = cvData?.skills || [];
  const summary = (cvData?.professionalSummary || '').trim();
  const skillNames = skills.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
  // NOTE: the joined contact line moved INTO PreviewContactBlock along with the header it
  // labels. `info` stays because hasAnything still asks it whether the CV has a name yet.

  // A freshly "Add manually"-created entry is blank, so `capturedCv`'s blank-filter drops
  // it from the displayed list — and with it, its own inline editor, the one place it can
  // be filled in. Splice the entry BEING edited back in, straight off the raw cvData, so
  // its editor still has a slot to render into even before it has anything in it.
  const rawFor = (key) => cvData?.[key] || [];
  const withNewEntry = (filtered, key) => {
    if (!editingSortId || filtered.some((e) => e._sortId === editingSortId)) return filtered;
    const extra = rawFor(key).find((e) => e._sortId === editingSortId);
    return extra ? [...filtered, extra] : filtered;
  };

  const bandOfKey = (key) => bandForKey(scan, key);
  // Render a body section only when it has content OR the scan has an opinion on it — an
  // empty, unscored section would just be a bare label.
  const show = (key, hasContent) => hasContent || bandOfKey(key) !== 'neutral';

  // The sheet is gated on having a DOCUMENT, not on having a scan. A build session has
  // no scan by definition, and gating on one hid the CV from exactly the people watching
  // it get written. Without a scan every band is 'neutral' — grey rail, no verdict chip —
  // so the same sheet renders honestly as a plain document.
  const hasAnything = !!(
    summary ||
    experience.length ||
    projects.length ||
    education.length ||
    skillNames.length ||
    (info.fullName || '').trim()
  );
  // An empty BUILD session hasn't got a scan to run, so "Run a scan…" would be advice it
  // can't take — it's told its CV will appear here as it's built instead.
  const emptyStateKey = isBuildSession
    ? 'ariaStudio.livePreview.emptyStateBuild'
    : 'ariaStudio.livePreview.emptyState';

  // This panel builds sections structurally from cvData (not from the localized
  // markdown), so its labels don't get translated for free — route each through
  // cvLabel so the section headings track the CV-language toggle. The short-form
  // labels ("Summary"/"Experience"/"Contact") have their own entries in the table.
  const docLang = cvData?.outputLang || 'en';
  const label = (name) => cvLabel(name, docLang);

  // The lock outranks whatever the toggle was last left on. A session can go BACK to
  // incomplete — an edit that empties a section does it — and a user sitting in 'preview'
  // when that happens would be stranded there, the toggle that got them in having just
  // been removed.
  const effectiveView = canEdit ? viewMode : 'edit';

  return (
    <aside className="h-full min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.livePreview.heading')}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {cvData?.title || t('ariaStudio.livePreview.yourCv')}
          </p>
        </div>
        {/* No toggle at all while locked: 'preview' renders the FINISHED document, and a
            build session that hasn't got one yet has nothing to show there. */}
        {canEdit && (
          <div
            className="shrink-0 inline-flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
            aria-label={t('ariaStudio.livePreview.viewMode')}
          >
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              aria-pressed={viewMode === 'edit'}
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10.5px] font-semibold transition-[background-color,color,box-shadow] ${
                viewMode === 'edit'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <PencilLine className="h-3 w-3" aria-hidden="true" />
              {t('ariaStudio.livePreview.editMode')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              disabled={!hasAnything || !!editingSortId}
              aria-pressed={viewMode === 'preview'}
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10.5px] font-semibold transition-[background-color,color,box-shadow] disabled:cursor-not-allowed disabled:opacity-40 ${
                viewMode === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Eye className="h-3 w-3" aria-hidden="true" />
              {t('ariaStudio.livePreview.previewMode')}
            </button>
          </div>
        )}
        {/* The language this CV is WRITTEN in — drives Aria's writing and the
            section labels on the downloaded document. */}
        {cvData?._id && (
          <CvLanguageToggle
            compact
            draftId={cvData._id}
            value={cvData.outputLang}
            onChange={(next) => updateCvData({ outputLang: next })}
            className="shrink-0"
          />
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('ariaStudio.livePreview.closePreview')}
            className="shrink-0 -mr-1 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {!hasAnything ? (
        /* Empty state — there is no document yet to render. Reuses the shared AriaOrbit
           and the global slow-orbit keyframes (same as the artifact panel). */
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div className="max-w-[240px] text-center">
            <span className="aria-orbit-slow inline-block">
              <AriaOrbit size={44} working />
            </span>
            <p className="mt-4 text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t(emptyStateKey)}
            </p>
          </div>
        </div>
      ) : (
        <div className="h-0 flex-1 min-h-0">
          {effectiveView === 'edit' ? (
            <div className="h-full overflow-y-auto overscroll-contain scrollbar-none p-4 sm:p-6">
              {/* The paper sheet — a themed surface, not a hard white A4 in dark mode. */}
              <div className="mx-auto max-w-[680px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_28px_-14px_rgba(15,23,42,0.18)] dark:shadow-[0_16px_40px_-24px_rgba(0,0,0,.55)] p-6 sm:p-8 space-y-6">
                {/* Says WHY there is nothing to touch. One muted line at the top of the
                    sheet, in the same helper voice as the rest of the panel — an
                    explanation, not a warning. */}
                {!canEdit && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {t('ariaStudio.livePreview.lockedHint')}
                  </p>
                )}
                {/* Contact header */}
                <SectionBlock
                  label={label('Contact')}
                  band={bandOfKey('contact')}
                  pulsing={pulsing.contact}
                >
                  {/* EDIT-MODE ONLY, like the summary and skills blocks below it: this
                      whole branch is the 'edit' one, and 'preview' renders the read-only
                      template instead. The header owns its own block rather than going
                      through ReorderableList for the same reason the summary does — it
                      is a single SUBDOC, so there is no list to order, no _sortId to
                      address and nothing focus mode can lock. It reads its own values
                      and its own writer from the context, so nothing has to be threaded
                      through here. */}
                  <PreviewContactBlock readOnly={!canEdit} />
                </SectionBlock>

                {/* Body sections, in the CV's real order. */}
                {PREVIEW_ORDER.filter((k) => k !== 'contact').map((key) => {
                  if (key === 'summary') {
                    if (!show('summary', !!summary)) return null;
                    return (
                      <SectionBlock
                        key="summary"
                        label={label('Summary')}
                        band={bandOfKey('summary')}
                        pulsing={pulsing.summary}
                      >
                        {/* EDIT-MODE ONLY, like the skills block beside it: this whole
                        branch is the 'edit' one, and 'preview' renders the read-only
                        template instead. The summary owns its own block rather than
                        going through ReorderableList — it is a single FIELD, so there is
                        no list to order, no _sortId to address and nothing focus mode can
                        lock. The placeholder moves inside it, next to the text it stands
                        in for.

                        "Draft with Aria" is wired from HERE, not from inside the block:
                        the command channel and the sheet-close are the parent's job,
                        exactly as onSuggestWithAria and onEditWithAria are. */}
                        <PreviewSummaryBlock onDraftWithAria={draftSummary} readOnly={!canEdit} />
                      </SectionBlock>
                    );
                  }
                  if (key === 'experience') {
                    if (!show('experience', experience.length > 0)) return null;
                    return (
                      <SectionBlock
                        key="experience"
                        label={label('Experience')}
                        band={bandOfKey('experience')}
                        pulsing={pulsing.experience}
                      >
                        <ReorderableList
                          section="experience"
                          entries={withNewEntry(experience, 'experience')}
                          className="space-y-3"
                          editingSortId={editingSortId}
                          onEdit={setEditingSortId}
                          onCloseEdit={closeEdit}
                          canEditWithAria
                          onEditWithAria={editWithAria}
                          readOnly={!canEdit}
                        >
                          {(r) => (
                            <>
                              {/* Title/company own the FULL row width, date on its own line
                              below — matching Education's stacked pattern. A side-by-side
                              row here squeezed the date into a shrink-0 column that fought
                              the entry controls' reserved right-padding on a narrow phone,
                              wrapping a long title/company across several ragged lines. */}
                              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                                {r.title || t('ariaStudio.studioFlow.fields.experience.title')}
                                {r.company ? (
                                  <span className="font-normal text-slate-500 dark:text-slate-400">
                                    {' '}
                                    · {r.company}
                                  </span>
                                ) : null}
                              </p>
                              {(r.startDate || r.endDate || r.isCurrent) && (
                                <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                                  {r.startDate || ''}
                                  {r.startDate || r.endDate || r.isCurrent ? ' – ' : ''}
                                  {r.isCurrent
                                    ? t('ariaStudio.pinnedEntry.present')
                                    : r.endDate || ''}
                                </p>
                              )}
                              <Bullets description={r.description} />
                            </>
                          )}
                        </ReorderableList>
                        {canEdit && (
                          <AddEntryFooter
                            labelKey="ariaStudio.livePreview.addRole"
                            onAddManually={() => addManually('experience')}
                            onAddWithAria={() => addWithAria('experience')}
                          />
                        )}
                      </SectionBlock>
                    );
                  }
                  if (key === 'projects') {
                    if (!canEdit && !show('projects', projects.length > 0)) return null;
                    return (
                      <SectionBlock
                        key="projects"
                        label={label('Projects')}
                        band={bandOfKey('projects')}
                        pulsing={pulsing.projects}
                      >
                        {/* 'project', SINGULAR — the SECTION_LIST key. 'projects' would
                        resolve to no list and no-op silently. */}
                        <ReorderableList
                          section="project"
                          entries={withNewEntry(projects, 'projects')}
                          className="space-y-3"
                          editingSortId={editingSortId}
                          onEdit={setEditingSortId}
                          onCloseEdit={closeEdit}
                          canEditWithAria
                          onEditWithAria={editWithAria}
                          readOnly={!canEdit}
                        >
                          {(p) => (
                            <>
                              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                                {p.title || t('ariaStudio.studioFlow.fields.project.title')}
                              </p>
                              <Bullets description={p.description} />
                            </>
                          )}
                        </ReorderableList>
                        {canEdit && (
                          <AddEntryFooter
                            labelKey="ariaStudio.livePreview.addProject"
                            onAddManually={() => addManually('project')}
                            onAddWithAria={() => addWithAria('project')}
                          />
                        )}
                      </SectionBlock>
                    );
                  }
                  if (key === 'skills') {
                    if (!show('skills', skillNames.length > 0)) return null;
                    return (
                      <SectionBlock
                        key="skills"
                        label={label('Skills')}
                        band={bandOfKey('skills')}
                        pulsing={pulsing.skills}
                      >
                        {/* EDIT-MODE ONLY, like everything else on this sheet: the whole
                        branch this lives in is the 'edit' one, and the 'preview' branch
                        renders the read-only template instead. Skills own their own block
                        rather than going through ReorderableList — they carry no _sortId,
                        so there is nothing to reorder by and nothing focus mode can lock.
                        The empty state moves inside it, next to the groups it replaces.

                        The suggest affordance is wired from HERE, not from inside the
                        block: the command channel and the sheet-close are the parent's
                        job, exactly as onEditWithAria is passed down to the rows rather
                        than requested by them. */}
                        <PreviewSkillsBlock onSuggestWithAria={suggestSkills} readOnly={!canEdit} />
                      </SectionBlock>
                    );
                  }
                  if (key === 'education') {
                    if (!show('education', education.length > 0 || certifications.length > 0))
                      return null;
                    return (
                      <SectionBlock
                        key="education"
                        label={label('Education')}
                        band={bandOfKey('education')}
                        pulsing={pulsing.education}
                      >
                        <div className="space-y-2">
                          <ReorderableList
                            section="education"
                            entries={withNewEntry(education, 'education')}
                            className="space-y-2"
                            editingSortId={editingSortId}
                            onEdit={setEditingSortId}
                            onCloseEdit={closeEdit}
                            // Explicitly FALSE, not merely omitted: education has no entry
                            // interview to hand a degree to (ENTRY_SOURCE covers experience
                            // and projects only), so its ✎ is the manual editor, full stop.
                            canEditWithAria={false}
                            readOnly={!canEdit}
                          >
                            {(e) => (
                              <>
                                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                                  {e.degree || t('ariaStudio.studioFlow.fields.education.degree')}
                                  {e.school ? (
                                    <span className="font-normal text-slate-500 dark:text-slate-400">
                                      {' '}
                                      · {e.school}
                                    </span>
                                  ) : null}
                                </p>
                                {e.graduationDate && (
                                  <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                    {e.graduationDate}
                                  </p>
                                )}
                                <Bullets description={e.description} />
                              </>
                            )}
                          </ReorderableList>
                          {canEdit && (
                            <AddEntryFooter
                              labelKey="ariaStudio.livePreview.addEducation"
                              onAddManually={() => addManually('education')}
                              onAddWithAria={() => addWithAria('education')}
                            />
                          )}
                          {/* Certifications are NOT reorderable — they carry no _sortId,
                          so there's nothing to address one by and index is identity.
                          They stay UNDER Education, where the builder stores them and
                          the template renders them; the block only makes them editable.

                          UNCONDITIONAL, unlike the read-only list it replaces: this whole
                          branch is the 'edit' one, and a "no certifications yet" document
                          is exactly the one that needs the "Add certification" affordance.
                          Gating it on `certifications.length` would leave a user with no
                          way to add their first. The 'preview' branch renders the
                          read-only template instead, where an empty section simply
                          doesn't appear. */}
                          <PreviewCertsBlock readOnly={!canEdit} />

                          {/* Languages sits with certifications for the same reasons:
                          both are short, optional, carry no _sortId, and are typed rather
                          than generated. Neither is in PREVIEW_ORDER — that list is the
                          sections the SCAN reads, and languages is not scored. */}
                          <PreviewLanguagesBlock readOnly={!canEdit} />
                        </div>
                      </SectionBlock>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-0">
              <StudioTemplatePreview />
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default StudioLivePreview;
