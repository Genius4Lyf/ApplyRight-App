import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  ArrowRight,
  ArrowLeft,
  Plus,
  Sparkles,
  RefreshCcw,
  Link as LinkIcon,
  Lock,
} from 'lucide-react';
import CVService from '../../services/cv.service';
import { toast } from 'sonner';
import ProjectsTutorial from './ProjectsTutorial';
import SectionTips from '../../components/SectionTips';
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

const newSortId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const ensureIds = (items) =>
  (items || []).map((item) => (item && item._sortId ? item : { ...item, _sortId: newSortId() }));

// Free users can apply up to this many of the AI rewrite options at once; paid
// users can apply all. Both see all 10 options (no blur, no paywall on viewing).
const FREE_SELECT_LIMIT = 3;

const Projects = () => {
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

  const navigate = useNavigate();
  // Paid users can apply all AI rewrite options; free users are capped.
  const isPaid = user?.plan === 'paid';

  const [projects, setProjects] = useState(() => ensureIds(cvData?.projects));
  const [expandedId, setExpandedId] = useState(() => {
    const initial = ensureIds(cvData?.projects);
    if (initial.length === 1 && !initial[0].title) {
      return initial[0]._sortId;
    }
    return null;
  });
  const [generatingIndex, setGeneratingIndex] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // AI Rewrite suggestions modal — single column, all 10 options visible &
  // selectable; free users apply up to FREE_SELECT_LIMIT, paid apply all.
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestionsList, setSuggestionsList] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [suggestionTargetIndex, setSuggestionTargetIndex] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setProjects((items) => {
      const oldIndex = items.findIndex((it) => it._sortId === active.id);
      const newIndex = items.findIndex((it) => it._sortId === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const moveItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= projects.length) return;
    setProjects((items) => arrayMove(items, index, target));
  };

  // Auto-show modal removed in favor of inline SectionTips card. The modal
  // still mounts and can be opened manually via the "How AI Works" button.

  const addProject = () => {
    setStepDirty?.(true);
    const newId = newSortId();
    setProjects([
      ...projects,
      { _sortId: newId, title: '', link: '', description: '', isNew: true },
    ]);
    setExpandedId(newId);
  };

  const removeProject = (index) => {
    setStepDirty?.(true);
    const newProjects = [...projects];
    newProjects.splice(index, 1);
    setProjects(newProjects);
  };

  const handleChange = (index, field, value) => {
    setStepDirty?.(true);
    const newProjects = [...projects];
    newProjects[index] = { ...newProjects[index], [field]: value };
    setProjects(newProjects);
  };

  // Auto-prepend https:// to link fields on blur if user entered a bare domain
  const handleLinkBlur = (index) => {
    const link = projects[index]?.link;
    if (!link) return;
    const trimmed = link.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      handleChange(index, 'link', `https://${trimmed}`);
    }
  };

  // Auto-sync to parent context for persistence
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (updateCvData) {
        const cleanedProjects = projects.map(({ isNew, ...rest }) => rest);
        updateCvData({ projects: cleanedProjects });
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [projects, updateCvData]);

  // Expose this step's current data so the wizard can flush it when the user
  // jumps to another section via the step navigator.
  useEffect(() => {
    registerStepData?.(() => ({ projects: projects.map(({ isNew, ...rest }) => rest) }));
    return () => registerStepData?.(null);
  }, [projects, registerStepData]);

  // Render guard lives below the hooks so the hook call order is stable
  // across renders (rules-of-hooks).
  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading projects...</div>
    );
  }

  const handleGenerateBullets = async (index) => {
    const proj = projects[index];
    if (!proj.title) {
      toast.error('Please enter a project title first.');
      return;
    }

    const textToRewrite = proj.description;
    const lineCount = textToRewrite
      ? textToRewrite.split('\n').filter((line) => line.trim().length > 5).length
      : 0;

    if (lineCount < 3) {
      toast.error('Please write at least 3 bullet points before rewriting.');
      return;
    }

    setGeneratingIndex(index);
    try {
      const context = `Rewrite/Improve these bullet points: "${textToRewrite}". Project Link: ${proj.link}`;

      const { suggestions = [] } = await CVService.generateBullets(
        proj.title,
        context,
        'project',
        cvData.targetJob?.description
      );

      if (suggestions && suggestions.length > 0) {
        setSuggestionsList(suggestions);
        setSelectedSuggestions([]);
        setSuggestionTargetIndex(index);
        setShowSuggestionsModal(true);
      } else {
        toast.warning('No suggestions generated. Please try again.');
      }
    } catch (error) {
      console.error('Failed to gen bullets', error);
      toast.error('Failed to generate project details');
    } finally {
      setGeneratingIndex(null);
    }
  };

  // Free users apply up to FREE_SELECT_LIMIT; paid users apply all options.
  const selectMax = isPaid ? suggestionsList.length : FREE_SELECT_LIMIT;

  const goUpgrade = () => {
    setShowSuggestionsModal(false);
    navigate('/upgrade');
  };

  const toggleSuggestionSelection = (suggestion) => {
    if (selectedSuggestions.includes(suggestion)) {
      setSelectedSuggestions(selectedSuggestions.filter((s) => s !== suggestion));
      return;
    }
    if (selectedSuggestions.length >= selectMax) {
      toast.warning(
        isPaid
          ? `You can select up to ${selectMax}.`
          : `Free plan: pick up to ${selectMax}. Upgrade to apply all.`
      );
      return;
    }
    setSelectedSuggestions([...selectedSuggestions, suggestion]);
  };

  const applySelectedSuggestions = () => {
    if (selectedSuggestions.length === 0 || suggestionTargetIndex === null) return;
    const formattedBullets = selectedSuggestions.map((s) => `• ${s}`).join('\n');
    handleChange(suggestionTargetIndex, 'description', formattedBullets);
    toast.success('Bullets applied!');
    setShowSuggestionsModal(false);
    setSuggestionsList([]);
    setSelectedSuggestions([]);
    setSuggestionTargetIndex(null);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + '\n• ' + value.substring(end);
      handleChange(index, 'description', newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 3;
      }, 0);
    }
  };

  const handleFocus = (index) => {
    const proj = projects[index];
    if (!proj.description || proj.description.trim() === '') {
      handleChange(index, 'description', '• ');
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setStepDirty?.(false);
    handleNext({ projects: projects.map(({ isNew, ...rest }) => rest) });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Projects</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Showcase your practical work and initiatives.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowTutorial(true)}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden md:inline">How ApplyRight AI Works</span>
        </button>
      </div>

      <SectionTips
        sectionKey="cvbuilder_projects"
        title="Projects show what you do when nobody's asking"
        intro="Even small side projects matter — they show initiative."
        tips={[
          "Pick projects relevant to the role you're targeting; cut the rest.",
          'Each description: what it is, who used it, the most concrete outcome (users, downloads, impact).',
          'If it was a team project, name your specific contribution — what <em>you</em> built or led.',
          'Add a link if you have one — GitHub, live demo, write-up, anything.',
          "Don't list languages here — your Skills section already covers that.",
        ]}
      />

      {projects.length === 0 && (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
          <p className="text-slate-500 dark:text-slate-400 mb-4">No projects added yet.</p>
          <button
            type="button"
            onClick={addProject}
            className="btn-secondary flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" /> Add First Project
          </button>
          <div className="mt-4">
            <button
              type="submit"
              className="text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 underline underline-offset-4"
            >
              Skip this section
            </button>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={projects.map((p) => p._sortId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-8">
            {projects.map((proj, index) => {
              const isExpanded = expandedId === proj._sortId;
              return (
                <SortableItem
                  key={proj._sortId}
                  id={proj._sortId}
                  index={index}
                  total={projects.length}
                  isNew={proj.isNew}
                  onMoveUp={() => moveItem(index, -1)}
                  onMoveDown={() => moveItem(index, 1)}
                  onDelete={() => removeProject(index)}
                  isExpanded={isExpanded}
                  onToggleExpand={() => setExpandedId(isExpanded ? null : proj._sortId)}
                >
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group overflow-hidden">
                    {/* Collapsed Header / Summary View */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : proj._sortId)}
                      className="p-4 md:p-5 pr-28 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          <PenTool className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                            {proj.title || 'Untitled Project'}
                            {proj.link && (
                              <span className="text-slate-500 dark:text-slate-400 font-normal">
                                {' '}
                                • {proj.link}
                              </span>
                            )}
                          </h4>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
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
                              <div>
                                <label
                                  htmlFor={`project-title-${index}`}
                                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                                >
                                  Project Title
                                </label>
                                <input
                                  id={`project-title-${index}`}
                                  type="text"
                                  value={proj.title}
                                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                                  placeholder="e.g. Portfolio Website"
                                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`project-link-${index}`}
                                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                                >
                                  Link (Optional)
                                </label>
                                <div className="relative">
                                  <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                  <input
                                    id={`project-link-${index}`}
                                    type="text"
                                    value={proj.link}
                                    onChange={(e) => handleChange(index, 'link', e.target.value)}
                                    onBlur={() => handleLinkBlur(index)}
                                    placeholder="github.com/your-project"
                                    className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label
                                  htmlFor={`project-description-${index}`}
                                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase"
                                >
                                  Description / Bullets
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateBullets(index)}
                                  disabled={generatingIndex === index || !proj.title}
                                  className="text-xs font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1 hover:text-indigo-800 dark:hover:text-indigo-200 disabled:opacity-50"
                                >
                                  {generatingIndex === index ? (
                                    <RefreshCcw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                  {generatingIndex === index ? 'Rewriting...' : 'AI Rewrite'}
                                </button>
                              </div>
                              <textarea
                                id={`project-description-${index}`}
                                value={proj.description}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (val.length === 1 && !val.startsWith('•')) {
                                    val = '• ' + val;
                                    setTimeout(() => {
                                      if (e.target)
                                        e.target.selectionStart = e.target.selectionEnd =
                                          val.length;
                                    }, 0);
                                  }
                                  handleChange(index, 'description', val);
                                }}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onFocus={() => handleFocus(index)}
                                placeholder="• Developed a full-stack app using..."
                                className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg h-32 focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed text-sm"
                              />
                              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Tip: 1-3 short bullets is enough. Lead with what it does, not how
                                  you built it.
                                </p>
                                <InlineExample
                                  kind="project"
                                  targetTitle={cvData.targetJob?.title}
                                />
                              </div>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setExpandedId(null)}
                                className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              >
                                Done
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

      {projects.length > 0 && (
        <button
          type="button"
          onClick={addProject}
          className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Another Project
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
          {saving ? 'Saving...' : 'Next: Education'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* AI Rewrite Suggestions Modal — all 10 options visible & selectable;
          free users apply up to 3, paid users apply all. */}
      {showSuggestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center gap-2 bg-indigo-50/50 dark:bg-indigo-500/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                    AI Rewrite
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pick the best {selectMax} to add to your project.
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full shrink-0">
                {selectedSuggestions.length} / {selectMax}
              </div>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 space-y-2">
              {suggestionsList.map((suggestion, idx) => {
                const isSelected = selectedSuggestions.includes(suggestion);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleSuggestionSelection(suggestion)}
                    className={`relative p-3 rounded-xl border-2 transition-all flex gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/15 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-sm'
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
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
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
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-start gap-2 mb-3 p-2.5 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/30 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Note:</strong> AI can make mistakes. Review and edit these to ensure they
                  reflect your real work.
                </p>
              </div>
              {!isPaid && (
                <div className="flex items-start gap-2 mb-3 p-2.5 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                    <strong>Free plan:</strong> apply up to {FREE_SELECT_LIMIT} options.{' '}
                    <button
                      type="button"
                      onClick={goUpgrade}
                      className="font-bold underline hover:no-underline"
                    >
                      Upgrade
                    </button>{' '}
                    to apply all {suggestionsList.length}.
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

      {/* Tutorial Modal */}
      <ProjectsTutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} user={user} />
    </form>
  );
};

export default Projects;
