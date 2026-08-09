import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
import { cvLabel } from '../../lib/cvLabels';
import { withoutBlankEntries } from '../../lib/studioFlow';

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
  children,
}) => {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={entries.map((e) => e._sortId)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {entries.map((entry, index) =>
            entry._sortId === editingSortId ? (
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
                // Aria is on THIS row: the row marks itself and drops every control.
                isActive={!!activeEntry && entry._sortId === activeEntry.sortId}
              >
                {children(entry)}
              </PreviewEntryRow>
            )
          )}
        </div>
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

// `isSheet` says HOW this preview is mounted, not how wide the window is: on the bottom
// sheet the chat is behind the preview, so handing an entry to Aria has to close it or
// the user is staring at the document while she asks her first question. On the inline
// desktop panel both stay open — that's the whole payoff.
const StudioLivePreview = ({ onClose, isSheet = false }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { cvData, updateCvData, requestStudioCommand, activeEntry } = useAriaStudio();
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

  // ── Which entry is being edited, ONE at a time. ──
  //
  // It lives up here rather than in each row because "one open editor" is a property of
  // the sheet, not of a row: two rows can't both hold it, and the row that opened it is
  // the row the editor replaces. A _sortId is unique across the whole document, so a
  // single value is enough to address any entry in any of the three lists.
  const [editingSortId, setEditingSortId] = useState(null);
  const closeEdit = () => setEditingSortId(null);

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
  const experience = capturedCv.experience || [];
  const projects = capturedCv.projects || [];
  const education = capturedCv.education || [];
  const certifications = cvData?.certifications || [];
  const skills = cvData?.skills || [];
  const summary = (cvData?.professionalSummary || '').trim();
  const skillNames = skills.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
  const contactLine = [info.email, info.phone, info.address, info.linkedin, info.website]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join('  ·  ');

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
  const isBuildSession = cvData?.studioKind === 'build';
  const emptyStateKey = isBuildSession
    ? 'ariaStudio.livePreview.emptyStateBuild'
    : 'ariaStudio.livePreview.emptyState';

  // This panel builds sections structurally from cvData (not from the localized
  // markdown), so its labels don't get translated for free — route each through
  // cvLabel so the section headings track the CV-language toggle. The short-form
  // labels ("Summary"/"Experience"/"Contact") have their own entries in the table.
  const docLang = cvData?.outputLang || 'en';
  const label = (name) => cvLabel(name, docLang);

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
        <div className="h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none p-4 sm:p-6">
          {/* The paper sheet — a themed surface, not a hard white A4 in dark mode. */}
          <div className="mx-auto max-w-[680px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_28px_-14px_rgba(15,23,42,0.18)] dark:shadow-[0_16px_40px_-24px_rgba(0,0,0,.55)] p-6 sm:p-8 space-y-6">
            {/* Contact header */}
            <SectionBlock
              label={label('Contact')}
              band={bandOfKey('contact')}
              pulsing={pulsing.contact}
            >
              <div className="flex items-center gap-3">
                {info.photoUrl && (
                  <img
                    src={info.photoUrl}
                    alt={t('ariaStudio.contactConfirm.photoPreviewAlt')}
                    className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">
                    {(info.fullName || '').trim() || t('ariaStudio.livePreview.yourName')}
                  </p>
                  {contactLine && (
                    <p className="mt-1 break-words text-[12px] text-slate-500 dark:text-slate-400">
                      {contactLine}
                    </p>
                  )}
                </div>
              </div>
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
                    {summary ? (
                      <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {summary}
                      </p>
                    ) : (
                      <p className="text-[12px] italic text-slate-400 dark:text-slate-500">
                        {t('ariaStudio.livePreview.noSummaryYet')}
                      </p>
                    )}
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
                      entries={experience}
                      className="space-y-3"
                      editingSortId={editingSortId}
                      onEdit={setEditingSortId}
                      onCloseEdit={closeEdit}
                      canEditWithAria
                      onEditWithAria={editWithAria}
                    >
                      {(r) => (
                        <>
                          <div className="flex items-baseline justify-between gap-3">
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
                              <span className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                                {r.startDate || ''}
                                {r.startDate || r.endDate || r.isCurrent ? ' – ' : ''}
                                {r.isCurrent
                                  ? t('ariaStudio.pinnedEntry.present')
                                  : r.endDate || ''}
                              </span>
                            )}
                          </div>
                          <Bullets description={r.description} />
                        </>
                      )}
                    </ReorderableList>
                  </SectionBlock>
                );
              }
              if (key === 'projects') {
                if (!show('projects', projects.length > 0)) return null;
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
                      entries={projects}
                      className="space-y-3"
                      editingSortId={editingSortId}
                      onEdit={setEditingSortId}
                      onCloseEdit={closeEdit}
                      canEditWithAria
                      onEditWithAria={editWithAria}
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
                    {skillNames.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {skillNames.map((s, i) => (
                          <span
                            key={`${s}-${i}`}
                            className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] italic text-slate-400 dark:text-slate-500">
                        {t('ariaStudio.livePreview.noSkillsYet')}
                      </p>
                    )}
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
                        entries={education}
                        className="space-y-2"
                        editingSortId={editingSortId}
                        onEdit={setEditingSortId}
                        onCloseEdit={closeEdit}
                        // Explicitly FALSE, not merely omitted: education has no entry
                        // interview to hand a degree to (ENTRY_SOURCE covers experience
                        // and projects only), so its ✎ is the manual editor, full stop.
                        canEditWithAria={false}
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
                      {/* Certifications are NOT reorderable this slice — they carry no
                          _sortId, so there's nothing to address one by. */}
                      {certifications.length > 0 && (
                        <div className="pt-1">
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                            {t('ariaStudio.livePreview.certifications')}
                          </p>
                          <div className="mt-1 space-y-1">
                            {certifications.map((certificate, index) => (
                              <p
                                key={`${certificate.name}-${index}`}
                                className="text-[12px] text-slate-600 dark:text-slate-300"
                              >
                                {certificate.name}
                                {certificate.issuer ? ` · ${certificate.issuer}` : ''}
                                {certificate.date ? ` · ${certificate.date}` : ''}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionBlock>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

export default StudioLivePreview;
