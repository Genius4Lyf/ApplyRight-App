import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Plus,
  Sparkles,
  RefreshCcw,
  Lock,
  Crown,
} from 'lucide-react';
import CVService from '../../services/cv.service';
import { toast } from 'sonner';
import HistoryTutorial from './HistoryTutorial';
import SectionTips from '../../components/SectionTips';
import JobKeywordPanel from '../../components/cv/JobKeywordPanel';
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
const newSortId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const ensureIds = (items) =>
  (items || []).map((item) => (item && item._sortId ? item : { ...item, _sortId: newSortId() }));

const History = () => {
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
  } = context || {};
  const { id: draftId } = useParams();
  const navigate = useNavigate();

  // Persist the paid AI keyword extraction back into cvData so the wizard's
  // auto-save keeps it (and the backend's charge-once check stays valid).
  const handleKeywordsEnhanced = ({ keywords, aiKeywordsHash }) => {
    updateCvData?.({
      targetJob: { ...cvData.targetJob, aiKeywords: keywords, aiKeywordsHash },
    });
  };

  // Paid users get unlimited bullets per role. Toggled from the admin panel.
  const isPaid = user?.plan === 'paid';

  const [history, setHistory] = useState(() => ensureIds(cvData?.experience));

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
  const [generatingIndex, setGeneratingIndex] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Suggestions modal state. For work history the server returns a two-tier
  // payload: { isPaid, atsTasteAvailable, ai:{...}, ats:{...,locked}, limits }.
  // Free users always see both columns: AI (selectable) on the left and a BLURRED
  // ApplyRight ATS teaser on the right. If their one-time taste is still
  // available, the ATS column shows a "Reveal" button; clicking it generates the
  // real ATS (and spends the trial). Paid users get a single unlocked ATS column.
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestionData, setSuggestionData] = useState(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  // Which column the current selection came from ('ai' | 'ats' | null). The two
  // columns are mutually exclusive: once you pick from one, the other locks until
  // you clear.
  const [selectionSource, setSelectionSource] = useState(null);
  const [suggestionTargetIndex, setSuggestionTargetIndex] = useState(null);
  // Mobile only: which column is visible. Defaults to the ATS tab so ours leads
  // (desktop shows both columns side by side regardless).
  const [activeTab, setActiveTab] = useState('ats');
  // The free user explicitly revealed their one-time real ATS this session.
  const [atsRevealed, setAtsRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  // Role + context of the open modal, so "Reveal" can request the real ATS.
  const [revealPayload, setRevealPayload] = useState(null);

  // The auto-show tutorial modal was removed in favor of the inline SectionTips
  // card rendered at the top of the form below. Modal still mounts and can be
  // opened manually via the "How AI Works" button for users who want a fuller
  // walkthrough.

  const addRole = () => {
    setStepDirty?.(true);
    setHistory([
      ...history,
      {
        _sortId: newSortId(),
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        description: '',
        isNew: true,
      },
    ]);
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

  // Render guard lives below the hooks so the hook call order is stable
  // across renders (rules-of-hooks). Returning before this point would skip
  // some of the useState/useSensor calls above on subsequent renders.
  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading history...</div>
    );
  }

  const openSuggestionsModal = (data, index, payload) => {
    setSuggestionData(data);
    setSuggestionTargetIndex(index);
    setSelectedSuggestions([]);
    setSelectionSource(null);
    setAtsRevealed(false);
    setRevealing(false);
    setRevealPayload(payload || null);
    setActiveTab('ats'); // lead with ApplyRight ATS on mobile
    setShowSuggestionsModal(true);
  };

  const handleGenerateBullets = async (index, customInput = null) => {
    const role = history[index];
    if (!role.title) {
      toast.error('Please enter a job title first.');
      return;
    }

    setGeneratingIndex(index);
    try {
      // If rewriting pasted text, include it in context
      const context = customInput
        ? `Rewrite this raw description into ATS bullets: "${customInput}". Company: ${role.company}`
        : role.company
          ? `Company: ${role.company}`
          : '';

      const data = await CVService.generateBullets(
        role.title,
        context,
        'experience',
        cvData.targetJob,
        draftId
      );

      const aiCount = data?.ai?.suggestions?.length || 0;
      const atsCount = data?.ats?.suggestions?.length || 0;
      if (aiCount > 0 || atsCount > 0) {
        openSuggestionsModal(data, index, { role: role.title, context });
      } else {
        toast.warning('No suggestions generated. Please try again.');
      }
    } catch (error) {
      console.error('Failed to gen bullets', error);
      toast.error('Failed to generate bullet points');
    } finally {
      setGeneratingIndex(null);
    }
  };

  // The user explicitly clicked "Reveal" — generate their one-time real ATS and
  // swap it into the (currently blurred) ATS column. This is where the trial is
  // spent server-side; a 409 means it was already used (show the upgrade CTA).
  const handleRevealAts = async () => {
    if (!revealPayload || revealing) return;
    setRevealing(true);
    try {
      const resp = await CVService.revealAtsTaste(
        revealPayload.role,
        revealPayload.context,
        cvData.targetJob,
        draftId
      );
      if (resp?.ats?.suggestions?.length) {
        setSuggestionData((prev) => ({
          ...prev,
          atsTasteAvailable: false,
          ats: resp.ats,
          limits: resp.limits || prev.limits,
        }));
        setAtsRevealed(true);
        setActiveTab('ats');
      } else {
        toast.warning('Could not reveal ApplyRight ATS. Please try again.');
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        // Already used (e.g. on another device) — flip to the upgrade CTA.
        setSuggestionData((prev) => ({ ...prev, atsTasteAvailable: false }));
        toast.info('Your free ApplyRight ATS preview has already been used.');
      } else {
        console.error('Reveal failed', err);
        toast.error('Failed to reveal ApplyRight ATS suggestions.');
      }
    } finally {
      setRevealing(false);
    }
  };

  // Layout / state flags:
  // - paidSuggestions → single, fully-unlocked ApplyRight ATS column (select all).
  // - atsSelectable → the ATS column shows real, selectable suggestions (paid, or
  //   a free user who just revealed their taste).
  // - tasteAvailable → free user whose one-time reveal is still available (show
  //   the "Reveal" button over the blurred teaser). Otherwise → upgrade CTA.
  const paidSuggestions = suggestionData?.isPaid === true;
  const atsSelectable = paidSuggestions || atsRevealed;
  const tasteAvailable =
    !paidSuggestions && !atsRevealed && suggestionData?.atsTasteAvailable === true;
  // limits.selectMax is null (unlimited) only for paid; fall back accordingly.
  const selectMax =
    suggestionData?.limits?.selectMax ?? (suggestionData?.ats?.suggestions?.length || 0);

  const goUpgrade = () => {
    setShowSuggestionsModal(false);
    navigate('/upgrade');
  };

  // Toggle a suggestion. The two columns are mutually exclusive: once a source is
  // chosen, the other column locks until the selection is cleared.
  const toggleSuggestionSelection = (suggestion, source) => {
    if (selectedSuggestions.includes(suggestion)) {
      const next = selectedSuggestions.filter((s) => s !== suggestion);
      setSelectedSuggestions(next);
      if (next.length === 0) setSelectionSource(null);
      return;
    }
    if (selectionSource && selectionSource !== source) {
      toast.info('Pick from one set at a time — clear your selection to switch.');
      return;
    }
    if (selectedSuggestions.length >= selectMax) {
      toast.warning(
        paidSuggestions
          ? `You can select up to ${selectMax} bullet points.`
          : `Select up to ${selectMax}.`
      );
      return;
    }
    setSelectedSuggestions([...selectedSuggestions, suggestion]);
    setSelectionSource(source);
  };

  // A selectable suggestion card. `source` is 'ai' or 'ats'; a card from the
  // non-active column is disabled while a selection exists in the other column.
  const renderSelectableCard = (suggestion, idx, source) => {
    const isSelected = selectedSuggestions.includes(suggestion);
    const disabled = selectionSource && selectionSource !== source;
    return (
      <div
        key={idx}
        onClick={() => toggleSuggestionSelection(suggestion, source)}
        className={`relative p-3 rounded-xl border-2 transition-all flex gap-3 ${
          disabled
            ? 'cursor-not-allowed opacity-40 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            : isSelected
              ? 'cursor-pointer border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/15 shadow-sm'
              : 'cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-sm'
        }`}
      >
        <div className="mt-0.5 flex-shrink-0">
          <div
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-indigo-500 border-indigo-500 text-white'
                : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
        <p
          className={`text-sm leading-relaxed ${
            isSelected
              ? 'text-indigo-900 dark:text-indigo-200 font-medium'
              : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {suggestion}
        </p>
      </div>
    );
  };

  // A blurred, non-interactive teaser card for the locked ApplyRight ATS column.
  const renderLockedCard = (suggestion, idx) => (
    <div
      key={idx}
      className="relative p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
    >
      <p className="text-sm leading-relaxed blur-sm select-none text-slate-700 dark:text-slate-300">
        {suggestion}
      </p>
    </div>
  );

  const applySelectedSuggestions = () => {
    if (selectedSuggestions.length === 0 || suggestionTargetIndex === null) return;

    // No trial bookkeeping here: the one-time ATS taste is already spent on the
    // server the moment the real suggestions were revealed (consume-on-reveal).

    const formattedBullets = selectedSuggestions.map((s) => `• ${s}`).join('\n');

    // Completely overwrite the existing description with the chosen bullets
    handleChange(suggestionTargetIndex, 'description', formattedBullets);
    toast.success('Bullets applied!');

    setShowSuggestionsModal(false);
    setSuggestionData(null);
    setSelectedSuggestions([]);
    setSelectionSource(null);
    setSuggestionTargetIndex(null);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Free users can't add a new bullet beyond the limit (editing existing
      // ones is still allowed). Paid users are unlimited.
      if (!isPaid && countBullets(history[index]?.description) >= FREE_BULLET_LIMIT) {
        toast.info(
          `Free plan allows up to ${FREE_BULLET_LIMIT} bullets per role. Upgrade to add unlimited.`
        );
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Work History</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Your experience tells your professional story.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowTutorial(true)}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden md:inline">How AI Works</span>
        </button>
      </div>

      <SectionTips
        sectionKey="cvbuilder_history"
        title="Make every role count"
        intro="Recruiters skim — your bullets do most of the work."
        tips={[
          'List your most recent role first, working backwards (reverse chronological).',
          'Start each bullet with a strong action verb (Built, Led, Reduced, Launched).',
          'Use the format <strong>Action + Context + Result</strong> — what you did, where, what changed.',
          'Add concrete numbers wherever you can: team size, %, $, users, time saved.',
          'Use the AI rewrite button after writing 2+ bullets — it sharpens what you already have.',
        ]}
      />

      <JobKeywordPanel
        floating
        targetJob={cvData?.targetJob}
        coveredText={history
          .map((r) => `${r.title || ''} ${r.company || ''} ${r.description || ''}`)
          .join(' ')}
        draftId={draftId}
        onEnhanced={handleKeywordsEnhanced}
      />

      {history.length === 0 && (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
          <p className="text-slate-500 dark:text-slate-400 mb-4">No work history added yet.</p>
          <button
            type="button"
            onClick={addRole}
            className="btn-secondary flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" /> Add First Role
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={history.map((r) => r._sortId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-8">
            {history.map((role, index) => (
              <SortableItem
                key={role._sortId}
                id={role._sortId}
                index={index}
                total={history.length}
                isNew={role.isNew}
                onMoveUp={() => moveItem(index, -1)}
                onMoveDown={() => moveItem(index, 1)}
                onDelete={() => removeRole(index)}
              >
                <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="md:col-span-1">
                      <label
                        htmlFor={`history-title-${index}`}
                        className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        Job Title
                      </label>
                      <input
                        id={`history-title-${index}`}
                        type="text"
                        value={role.title}
                        onChange={(e) => handleChange(index, 'title', e.target.value)}
                        placeholder="e.g. Senior Product Manager"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="md:col-span-1 pr-8 md:pr-0">
                      <label
                        htmlFor={`history-company-${index}`}
                        className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        Company
                      </label>
                      <input
                        id={`history-company-${index}`}
                        type="text"
                        value={role.company}
                        onChange={(e) => handleChange(index, 'company', e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`history-start-${index}`}
                        className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        Start Date
                      </label>
                      <input
                        id={`history-start-${index}`}
                        type="text"
                        value={role.startDate}
                        onChange={(e) => handleChange(index, 'startDate', e.target.value)}
                        placeholder="e.g. Jan 2020"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`history-end-${index}`}
                        className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        End Date
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={`history-end-${index}`}
                          type="text"
                          value={role.isCurrent ? 'Present' : role.endDate}
                          onChange={(e) => handleChange(index, 'endDate', e.target.value)}
                          disabled={role.isCurrent}
                          placeholder={role.isCurrent ? 'Present' : 'e.g. Dec 2023'}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-500"
                        />
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={role.isCurrent || false}
                            onChange={(e) => handleChange(index, 'isCurrent', e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            Current
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor={`history-description-${index}`}
                        className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase"
                      >
                        Description / Bullets
                      </label>
                      <button
                        type="button"
                        onClick={() => handleGenerateBullets(index, role.description)}
                        // Ensure role.description has at least 2 bullets (split by \n and filter out empty)
                        disabled={
                          generatingIndex === index ||
                          !role.title ||
                          (role.description || '').split('\n').filter((b) => b.trim().length > 2)
                            .length < 2
                        }
                        title={
                          (role.description || '').split('\n').filter((b) => b.trim().length > 2)
                            .length < 2
                            ? 'Please write at least 2 bullet points to use AI Suggestions'
                            : 'Get AI Suggestions'
                        }
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1 hover:text-indigo-800 dark:hover:text-indigo-200 disabled:opacity-50"
                      >
                        {generatingIndex === index ? (
                          <RefreshCcw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {generatingIndex === index ? 'Generating...' : 'AI Suggestions'}
                      </button>
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
                              e.target.selectionStart = e.target.selectionEnd = val.length;
                          }, 0);
                        }
                        // Block free users from adding bullets past the limit (e.g.
                        // via a multi-line paste). Edits that don't add bullets pass.
                        if (!isPaid) {
                          const next = countBullets(val);
                          if (next > FREE_BULLET_LIMIT && next > countBullets(role.description)) {
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
                      placeholder="• Achieved X by doing Y..."
                      className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg h-32 focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed text-sm"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isPaid
                          ? 'Tip: 3-5 bullets is the sweet spot. One per impact, not per task.'
                          : `Tip: 3-5 bullets is the sweet spot. ${countBullets(role.description)}/${FREE_BULLET_LIMIT} used — upgrade for unlimited.`}
                      </p>
                      <InlineExample
                        kind="bullet"
                        targetTitle={cvData.targetJob?.title || role.title}
                      />
                    </div>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {history.length > 0 && (
        <button
          type="button"
          onClick={addRole}
          className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Another Position
        </button>
      )}

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse md:flex-row justify-between gap-3 md:gap-0">
        <button
          type="button"
          onClick={handleBack}
          className="w-full md:w-auto px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium flex items-center justify-center md:justify-start gap-2 transition-colors border md:border-transparent border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="submit"
          disabled={saving}
          className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2"
        >
          {saving ? 'Saving...' : 'Next: Projects'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tutorial Modal */}
      <HistoryTutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} user={user} />

      {/* Suggestions Modal — landscape two-column on desktop (free: AI |
          ApplyRight ATS teaser), single ApplyRight ATS column for paid users.
          On mobile, free users get a tabbed view (defaults to the ATS tab). */}
      {showSuggestionsModal && suggestionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div
            className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
              paidSuggestions ? 'max-w-2xl' : 'max-w-4xl'
            }`}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center gap-2 bg-indigo-50/50 dark:bg-indigo-500/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0">
                  {paidSuggestions ? (
                    <Crown className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-2">
                    {paidSuggestions ? 'ApplyRight ATS Suggestions' : 'Bullet Suggestions'}
                    {(tasteAvailable || atsRevealed) && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        Free ATS preview
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {atsRevealed
                      ? `Compare both, then pick a side — select up to ${selectMax}.`
                      : tasteAvailable
                        ? 'Reveal ApplyRight ATS to compare — your 1 free preview.'
                        : `Select up to ${selectMax} to add to your experience.`}
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full shrink-0">
                {selectedSuggestions.length} / {selectMax}
              </div>
            </div>

            {/* Mobile tab switcher (free users — both taste & taste-used show two
                columns; paid uses a single column with no tabs) */}
            {!paidSuggestions && (
              <div className="lg:hidden flex gap-1 p-2 bg-slate-100 dark:bg-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                    activeTab === 'ai'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  AI suggestions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ats')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === 'ats'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" /> ApplyRight ATS
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900">
              {paidSuggestions ? (
                <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                  {(suggestionData.ats?.suggestions || []).map((suggestion, idx) =>
                    renderSelectableCard(suggestion, idx, 'ats')
                  )}
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 lg:divide-x divide-slate-200 dark:divide-slate-700 flex-1 min-h-0">
                  {/* Left: generic AI suggestions (selectable) */}
                  <div
                    className={`p-4 ${activeTab === 'ai' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`}
                  >
                    <span className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 shrink-0">
                      AI suggestions
                    </span>
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                      {(suggestionData.ai?.suggestions || []).map((suggestion, idx) =>
                        renderSelectableCard(suggestion, idx, 'ai')
                      )}
                    </div>
                  </div>

                  {/* Right: ApplyRight ATS — selectable during the free taste, a
                      blurred upsell teaser once the taste has been used. */}
                  <div
                    className={`p-4 ${activeTab === 'ats' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 relative`}
                  >
                    <div className="flex items-center gap-2 mb-3 shrink-0">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                        <Crown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        ApplyRight ATS
                      </span>
                      {(tasteAvailable || atsRevealed) && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                          Best choice
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-20">
                      {(suggestionData.ats?.suggestions || []).map((suggestion, idx) =>
                        atsSelectable
                          ? renderSelectableCard(suggestion, idx, 'ats')
                          : renderLockedCard(suggestion, idx)
                      )}
                    </div>
                    {/* Over the blurred teaser: a Reveal button while the free
                        trial is available, otherwise the upgrade CTA. */}
                    {!atsSelectable && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 pt-10 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-slate-900 dark:via-slate-900 to-transparent z-10 shrink-0">
                        {tasteAvailable ? (
                          <button
                            type="button"
                            onClick={handleRevealAts}
                            disabled={revealing}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md transition-colors disabled:opacity-70"
                          >
                            {revealing ? (
                              <RefreshCcw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Crown className="w-4 h-4" />
                            )}
                            {revealing ? 'Revealing…' : 'Reveal ApplyRight ATS — 1 free preview'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={goUpgrade}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md transition-colors"
                          >
                            <Lock className="w-4 h-4" /> Unlock ApplyRight ATS
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
              <div className="flex items-start gap-2 mb-3 p-2.5 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/30 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Note:</strong> AI can make mistakes or generate generic content. Review
                  and edit these to ensure they reflect your actual, verifiable experience.
                </p>
              </div>
              {atsSelectable && (
                <div className="flex items-start gap-2 mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/30 rounded-lg">
                  <Crown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                    <strong>Replace the [bracketed] figures</strong> (e.g. [X]%, [N]) with your real
                    numbers — they’re fill-in prompts, not verified stats. Real metrics are what
                    make recruiters stop and read.
                  </p>
                </div>
              )}
              {!paidSuggestions && (
                <div className="flex items-start gap-2 mb-3 p-2.5 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                  <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                    {atsRevealed ? (
                      <>
                        <strong>This was your one free ApplyRight ATS preview.</strong> Next time it
                        stays locked.{' '}
                        <button
                          type="button"
                          onClick={goUpgrade}
                          className="font-bold underline hover:no-underline"
                        >
                          Upgrade for unlimited
                        </button>{' '}
                        on every role.
                      </>
                    ) : tasteAvailable ? (
                      <>
                        <strong>Click “Reveal ApplyRight ATS”</strong> to see your one free,
                        job-tailored ATS preview next to the basic AI suggestions and compare.
                      </>
                    ) : (
                      <>
                        <strong>ApplyRight ATS suggestions</strong> are tailored to your target
                        job&apos;s keywords, ATS-optimized, and you can apply all of them.{' '}
                        <button
                          type="button"
                          onClick={goUpgrade}
                          className="font-bold underline hover:no-underline"
                        >
                          Upgrade to unlock
                        </button>
                        .
                      </>
                    )}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowSuggestionsModal(false)}
                  className="px-5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applySelectedSuggestions}
                  disabled={selectedSuggestions.length === 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Apply Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default History;
