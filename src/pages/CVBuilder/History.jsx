import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Briefcase, ArrowRight, ArrowLeft, Plus, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import SectionTips from '../../components/SectionTips';
import StepHeader from '../../components/cv/StepHeader';
import InlineExample from '../../components/InlineExample';
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
import SortableItem from '../../components/SortableItem';
import { newSortId, ensureIds } from '../../lib/sortId';

// Free users are capped at this many bullet points per role; paid users get
// unlimited. The "paid" flag is set manually from the admin panel for now
// (Admin > Users), and will become automatic once billing is integrated.
const FREE_BULLET_LIMIT = 3;
// Free users can apply at most this many suggestions at once from the free "AI
// suggestions" column. The server also returns limits.selectMax (source of
// truth, honors subscription expiry); this is the fallback. Paid users using the
// ApplyRight ATS column can apply all of them.
const FREE_SELECT_LIMIT = 3;

// Count the non-empty bullet lines in a description string. A line is a bullet
// even if it only has the "• " prefix typed, so we strip bullets/whitespace
// before checking for real content.
const countBullets = (text) =>
  (text || '').split('\n').filter((line) => line.replace(/•/g, '').trim().length > 0).length;

// Stable per-item ID for drag-and-drop. Persists with the data so order is
// stable across renders even after the auto-save round-trip.

const History = () => {
  const { t } = useTranslation();
  // Safely destructure context
  const context = useOutletContext();
  const {
    cvData,
    handleNext,
    handleBack,
    saving,
    updateCvData,
    user,
    setStepDirty,
    registerStepData,
    externalEditNonce,
    lastAiWriteSortId,
    onAskAria,
  } = context || {};
  const navigate = useNavigate();

  // Length-context hand-off from the CV Studio length coach (?trim=1): show a
  // dismissible "trimming to fit" banner with a "back to preview" return.
  const [searchParams] = useSearchParams();
  const trimming = searchParams.get('trim') === '1';
  const [trimBannerDismissed, setTrimBannerDismissed] = useState(false);

  // Paid users get unlimited bullets per role. Toggled from the admin panel.
  const isPaid = user?.plan === 'paid';

  const [history, setHistory] = useState(() => ensureIds(cvData?.experience));
  const [expandedId, setExpandedId] = useState(() => {
    const initial = ensureIds(cvData?.experience);
    if (initial.length === 1 && !initial[0].title && !initial[0].company) {
      return initial[0]._sortId;
    }
    return null;
  });

  // Sensors: pointer for mouse/trackpad, touch with a small activation distance
  // so vertical scrolling on mobile isn't accidentally hijacked by a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setHistory((items) => {
      const oldIndex = items.findIndex((it) => it._sortId === active.id);
      const newIndex = items.findIndex((it) => it._sortId === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const moveItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= history.length) return;
    setHistory((items) => arrayMove(items, index, target));
  };
  const addRole = () => {
    setStepDirty?.(true);
    const newId = newSortId();
    setHistory([
      ...history,
      {
        _sortId: newId,
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        description: '',
        isNew: true,
      },
    ]);
    setExpandedId(newId);
  };

  const removeRole = (index) => {
    setStepDirty?.(true);
    const newHistory = [...history];
    newHistory.splice(index, 1);
    setHistory(newHistory);
  };

  const handleChange = (index, field, value) => {
    setStepDirty?.(true);
    const newHistory = [...history];
    newHistory[index] = { ...newHistory[index], [field]: value };
    setHistory(newHistory);
  };

  // Auto-sync to parent context for persistence
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (updateCvData) {
        const cleanedHistory = history.map(({ isNew, ...rest }) => rest);
        updateCvData({ experience: cleanedHistory });
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [history, updateCvData]);

  // Expose this step's current data so the wizard can flush it when the user
  // jumps to another section via the step navigator.
  useEffect(() => {
    registerStepData?.(() => ({ experience: history.map(({ isNew, ...rest }) => rest) }));
    return () => registerStepData?.(null);
  }, [history, registerStepData]);

  // Re-seed local state when the ATS Coach applies a bullet rewrite from the side
  // panel (externalEditNonce bumps). This step seeds its local state once and only
  // syncs local→parent, so without this it would keep showing the pre-rewrite
  // bullets while mounted. We skip the initial mount (local state is already
  // seeded) so an ordinary mount never clobbers in-progress typing.
  const seededOnce = useRef(false);
  useEffect(() => {
    if (!seededOnce.current) {
      seededOnce.current = true;
      return;
    }
    setHistory(ensureIds(cvData?.experience));
    // Only react to the nonce — cvData is read fresh on each coach-driven bump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEditNonce]);

  // "Aria wrote here" reveal — when Aria appends bullets to a role, auto-expand +
  // scroll to it and flag it so the card glows, the field flashes, and a pill fades.
  const [ariaWroteId, setAriaWroteId] = useState(null);
  useEffect(() => {
    if (!lastAiWriteSortId) return;
    setExpandedId(lastAiWriteSortId); // auto-expand so the bullets are visible
    setAriaWroteId(lastAiWriteSortId); // triggers the glow/ring
    const el = document.getElementById(`hist-${lastAiWriteSortId}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    const t = setTimeout(() => setAriaWroteId(null), 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEditNonce]); // fires each write (nonce bumps every time)

  // Render guard lives below the hooks so the hook call order is stable
  // across renders (rules-of-hooks). Returning before this point would skip
  // some of the useState/useSensor calls above on subsequent renders.
  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t('cvBuilder.history.loading')}
      </div>
    );
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Free users can't add a new bullet beyond the limit (editing existing
      // ones is still allowed). Paid users are unlimited.
      if (!isPaid && countBullets(history[index]?.description) >= FREE_BULLET_LIMIT) {
        toast.info(t('cvBuilder.history.bulletLimit', { n: FREE_BULLET_LIMIT }));
        return;
      }

      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      // Insert new line with bullet
      const newValue = value.substring(0, start) + '\n• ' + value.substring(end);

      handleChange(index, 'description', newValue);

      // Move cursor to after the new bullet (need timeout or effect for React render cycle, but usually works ok if direct state update)
      // We'll use a small timeout to set selection range after render
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 3; // \n + • + space = 3 chars
      }, 0);
    }
  };

  const handleFocus = (index) => {
    const role = history[index];
    if (!role.description || role.description.trim() === '') {
      handleChange(index, 'description', '• ');
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setStepDirty?.(false);
    handleNext({ experience: history.map(({ isNew, ...rest }) => rest) });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500"
    >
      {/* Length-context banner — arrived here from the CV Studio length coach. */}
      {trimming && !trimBannerDismissed && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
                {t('cvBuilder.history.trimEyebrow')}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {t('cvBuilder.history.trimBody')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTrimBannerDismissed(true)}
              aria-label={t('cvBuilder.history.dismiss')}
              className="shrink-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t('cvBuilder.history.backToPreview')}
            </button>
          </div>
        </div>
      )}

      <StepHeader
        eyebrow={t('cvBuilder.history.eyebrow')}
        title={t('cvBuilder.history.title')}
        subtitle={t('cvBuilder.history.subtitle')}
      />

      <SectionTips
        sectionKey="cvbuilder_history"
        title={t('cvBuilder.history.tips.title')}
        intro={t('cvBuilder.history.tips.intro')}
        tips={[
          t('cvBuilder.history.tips.list.0'),
          t('cvBuilder.history.tips.list.1'),
          t('cvBuilder.history.tips.list.2'),
          t('cvBuilder.history.tips.list.3'),
          t('cvBuilder.history.tips.list.4'),
        ]}
      />

      {history.length === 0 && (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {t('cvBuilder.history.empty')}
          </p>
          <button
            type="button"
            onClick={addRole}
            className="btn-secondary flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" /> {t('cvBuilder.history.addFirst')}
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={history.map((r) => r._sortId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-8">
            {history.map((role, index) => {
              const isExpanded = expandedId === role._sortId;
              return (
                <SortableItem
                  key={role._sortId}
                  id={role._sortId}
                  index={index}
                  total={history.length}
                  isNew={role.isNew}
                  onMoveUp={() => moveItem(index, -1)}
                  onMoveDown={() => moveItem(index, 1)}
                  onDelete={() => removeRole(index)}
                  isExpanded={isExpanded}
                  onToggleExpand={() => setExpandedId(isExpanded ? null : role._sortId)}
                >
                  <div
                    id={`hist-${role._sortId}`}
                    className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm relative group overflow-hidden ${
                      ariaWroteId === role._sortId
                        ? 'aria-wrote border-indigo-400 dark:border-indigo-500'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {/* Collapsed Header / Summary View */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : role._sortId)}
                      className="p-4 md:p-5 pr-28 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                          <Briefcase className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                            {role.title || t('cvBuilder.history.untitledRole')}
                            {role.company && (
                              <span className="text-slate-500 dark:text-slate-400 font-normal">
                                {' '}
                                • {role.company}
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {role.startDate || '—'} –{' '}
                            {role.isCurrent ? t('cvBuilder.history.present') : role.endDate || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="border-t border-slate-100 dark:border-slate-700 overflow-hidden"
                        >
                          <div className="p-4 md:p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-1">
                                <label
                                  htmlFor={`history-title-${index}`}
                                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                                >
                                  {t('cvBuilder.history.jobTitle')}
                                </label>
                                <input
                                  id={`history-title-${index}`}
                                  type="text"
                                  value={role.title}
                                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                                  placeholder={t('cvBuilder.history.phTitle')}
                                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div className="md:col-span-1 pr-8 md:pr-0">
                                <label
                                  htmlFor={`history-company-${index}`}
                                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                                >
                                  {t('cvBuilder.history.company')}
                                </label>
                                <input
                                  id={`history-company-${index}`}
                                  type="text"
                                  value={role.company}
                                  onChange={(e) => handleChange(index, 'company', e.target.value)}
                                  placeholder={t('cvBuilder.history.phCompany')}
                                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`history-start-${index}`}
                                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                                >
                                  {t('cvBuilder.history.startDate')}
                                </label>
                                <input
                                  id={`history-start-${index}`}
                                  type="text"
                                  value={role.startDate}
                                  onChange={(e) => handleChange(index, 'startDate', e.target.value)}
                                  placeholder={t('cvBuilder.history.phStart')}
                                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`history-end-${index}`}
                                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                                >
                                  {t('cvBuilder.history.endDate')}
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    id={`history-end-${index}`}
                                    type="text"
                                    value={
                                      role.isCurrent ? t('cvBuilder.history.present') : role.endDate
                                    }
                                    onChange={(e) => handleChange(index, 'endDate', e.target.value)}
                                    disabled={role.isCurrent}
                                    placeholder={
                                      role.isCurrent
                                        ? t('cvBuilder.history.present')
                                        : t('cvBuilder.history.phEnd')
                                    }
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-500"
                                  />
                                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <input
                                      type="checkbox"
                                      checked={role.isCurrent || false}
                                      onChange={(e) =>
                                        handleChange(index, 'isCurrent', e.target.checked)
                                      }
                                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-xs text-slate-600 dark:text-slate-300">
                                      {t('cvBuilder.history.current')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="mb-1 flex items-center gap-2">
                                <label
                                  htmlFor={`history-description-${index}`}
                                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase"
                                >
                                  {t('cvBuilder.common.descriptionBullets')}
                                </label>
                                {ariaWroteId === role._sortId && (
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 animate-in fade-in">
                                    {t('cvBuilder.common.ariaFilledIn')}
                                  </span>
                                )}
                              </div>
                              <textarea
                                id={`history-description-${index}`}
                                value={role.description}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  // Auto-bullet on first character input if it's not already a bullet
                                  if (val.length === 1 && !val.startsWith('•')) {
                                    val = '• ' + val;
                                    // Need to adjust cursor in next tick
                                    setTimeout(() => {
                                      if (e.target)
                                        e.target.selectionStart = e.target.selectionEnd =
                                          val.length;
                                    }, 0);
                                  }
                                  // Block free users from adding bullets past the limit (e.g.
                                  // via a multi-line paste). Edits that don't add bullets pass.
                                  if (!isPaid) {
                                    const next = countBullets(val);
                                    if (
                                      next > FREE_BULLET_LIMIT &&
                                      next > countBullets(role.description)
                                    ) {
                                      toast.info(
                                        `Free plan allows up to ${FREE_BULLET_LIMIT} bullets per role. Upgrade to add unlimited.`
                                      );
                                      return;
                                    }
                                  }
                                  handleChange(index, 'description', val);
                                }}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onFocus={() => handleFocus(index)}
                                placeholder={t('cvBuilder.history.phDescription')}
                                className={`w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg h-32 focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed text-sm ${
                                  ariaWroteId === role._sortId ? 'aria-wrote-field' : ''
                                }`}
                              />
                              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {isPaid
                                    ? t('cvBuilder.history.tipPaid')
                                    : t('cvBuilder.history.tipFree', {
                                        used: countBullets(role.description),
                                        limit: FREE_BULLET_LIMIT,
                                      })}
                                </p>
                                <InlineExample
                                  kind="bullet"
                                  targetTitle={cvData.targetJob?.title || role.title}
                                />
                              </div>
                            </div>

                            {/* Ask Aria — a prominent bottom block with a state-aware gate hint. */}
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => onAskAria?.('experience', role)}
                                disabled={!role.title}
                                title={
                                  role.title
                                    ? t('cvBuilder.history.askAriaTitle')
                                    : t('cvBuilder.history.addTitleFirst')
                                }
                                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                                  role.title
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                                    : 'border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                <MessageCircle className="w-4 h-4" /> {t('cvBuilder.common.askAria')}
                              </button>
                              <p
                                className={`flex-1 min-w-0 text-[12px] leading-snug ${
                                  role.title && !role.company
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {!role.title
                                  ? t('cvBuilder.history.hintNoTitle')
                                  : !role.company
                                    ? t('cvBuilder.history.hintNoCompany')
                                    : t('cvBuilder.history.hintReady')}
                              </p>
                              <button
                                type="button"
                                onClick={() => setExpandedId(null)}
                                className="shrink-0 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              >
                                {t('cvBuilder.common.done')}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {history.length > 0 && (
        <button
          type="button"
          onClick={addRole}
          className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> {t('cvBuilder.history.addAnother')}
        </button>
      )}

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse md:flex-row justify-between gap-3 md:gap-0">
        <button
          type="button"
          onClick={handleBack}
          className="w-full md:w-auto px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium flex items-center justify-center md:justify-start gap-2 transition-colors border md:border-transparent border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2"
        >
          {saving ? t('cvBuilder.common.saving') : t('cvBuilder.history.nextProjects')}{' '}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};

export default History;
