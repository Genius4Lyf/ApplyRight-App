import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  ArrowRight,
  ArrowLeft,
  Plus,
  MessageCircle,
  Link as LinkIcon,
} from 'lucide-react';
import ProjectsTutorial from './ProjectsTutorial';
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

const newSortId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const ensureIds = (items) =>
  (items || []).map((item) => (item && item._sortId ? item : { ...item, _sortId: newSortId() }));

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
    externalEditNonce,
    lastAiWriteSortId,
    onAskAria,
  } = context || {};

  const [projects, setProjects] = useState(() => ensureIds(cvData?.projects));
  const [expandedId, setExpandedId] = useState(() => {
    const initial = ensureIds(cvData?.projects);
    if (initial.length === 1 && !initial[0].title) {
      return initial[0]._sortId;
    }
    return null;
  });
  const [showTutorial, setShowTutorial] = useState(false);

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

  // Re-seed local state when the ATS Coach applies a bullet rewrite from the side
  // panel (externalEditNonce bumps). This step seeds its local state once and only
  // syncs local→parent, so without this it would keep showing the pre-rewrite
  // bullets while mounted. We skip the initial mount so we never clobber typing.
  const seededOnce = useRef(false);
  useEffect(() => {
    if (!seededOnce.current) {
      seededOnce.current = true;
      return;
    }
    setProjects(ensureIds(cvData?.projects));
    // Only react to the nonce — cvData is read fresh on each coach-driven bump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEditNonce]);

  // "Aria wrote here" reveal — when Aria appends bullets to a project, auto-expand +
  // scroll to it and flag it so the card glows, the field flashes, and a pill fades.
  const [ariaWroteId, setAriaWroteId] = useState(null);
  useEffect(() => {
    if (!lastAiWriteSortId) return;
    setExpandedId(lastAiWriteSortId); // auto-expand so the bullets are visible
    setAriaWroteId(lastAiWriteSortId); // triggers the glow/ring
    const el = document.getElementById(`proj-${lastAiWriteSortId}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    const t = setTimeout(() => setAriaWroteId(null), 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEditNonce]); // fires each write (nonce bumps every time)

  // Render guard lives below the hooks so the hook call order is stable
  // across renders (rules-of-hooks).
  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading projects...</div>
    );
  }

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
      <StepHeader
        eyebrow="Projects"
        title="Projects"
        subtitle="Showcase your practical work and initiatives."
        action={
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="hidden md:inline">How ApplyRight AI Works</span>
          </button>
        }
      />

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
                  <div
                    id={`proj-${proj._sortId}`}
                    className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm relative group overflow-hidden ${
                      ariaWroteId === proj._sortId
                        ? 'aria-wrote border-indigo-400 dark:border-indigo-500'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
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
                              <div className="mb-1 flex items-center gap-2">
                                <label
                                  htmlFor={`project-description-${index}`}
                                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase"
                                >
                                  Description / Bullets
                                </label>
                                {ariaWroteId === proj._sortId && (
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 animate-in fade-in">
                                    ◉ Aria filled this in
                                  </span>
                                )}
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
                                className={`w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg h-32 focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed text-sm ${
                                  ariaWroteId === proj._sortId ? 'aria-wrote-field' : ''
                                }`}
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

                            {/* Ask Aria — a prominent bottom block with a state-aware gate hint. */}
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => onAskAria?.('project', proj)}
                                disabled={!proj.title}
                                title={
                                  proj.title
                                    ? 'Ask Aria to help with this project'
                                    : 'Add the project title first'
                                }
                                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                                  proj.title
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                                    : 'border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                <MessageCircle className="w-4 h-4" /> Ask Aria
                              </button>
                              <p className="flex-1 min-w-0 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
                                {!proj.title
                                  ? "Add the project title first — Aria won't guess it."
                                  : 'Sends this project to Aria & focuses her here.'}
                              </p>
                              <button
                                type="button"
                                onClick={() => setExpandedId(null)}
                                className="shrink-0 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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

      {/* Tutorial Modal */}
      <ProjectsTutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} user={user} />
    </form>
  );
};

export default Projects;
