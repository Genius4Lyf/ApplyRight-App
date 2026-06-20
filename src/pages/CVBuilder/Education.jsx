import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { GraduationCap, ArrowRight, ArrowLeft, Plus } from 'lucide-react';
import SectionTips from '../../components/SectionTips';
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

const Education = () => {
  // Safely destructure context — fallback ensures hooks below see stable
  // shapes on the first render even if the provider hasn't initialised yet.
  const context = useOutletContext();
  const { cvData, handleNext, handleBack, saving, setStepDirty, registerStepData } = context || {};

  const [education, setEducation] = useState(() => ensureIds(cvData?.education));

  // Expose this step's current data so the wizard can flush it when the user
  // jumps to another section via the step navigator.
  useEffect(() => {
    registerStepData?.(() => ({ education: education.map(({ isNew, ...rest }) => rest) }));
    return () => registerStepData?.(null);
  }, [education, registerStepData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Render guard lives below the hooks so the hook call order is stable
  // across renders (rules-of-hooks).
  if (!cvData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading education...</div>
    );
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEducation((items) => {
      const oldIndex = items.findIndex((it) => it._sortId === active.id);
      const newIndex = items.findIndex((it) => it._sortId === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const moveItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= education.length) return;
    setEducation((items) => arrayMove(items, index, target));
  };

  const addEducation = () => {
    setStepDirty?.(true);
    setEducation([
      ...education,
      { _sortId: newSortId(), degree: '', school: '', graduationDate: '', description: '', isNew: true },
    ]);
  };

  const removeEducation = (index) => {
    setStepDirty?.(true);
    const newEd = [...education];
    newEd.splice(index, 1);
    setEducation(newEd);
  };

  const handleChange = (index, field, value) => {
    setStepDirty?.(true);
    const newEd = [...education];
    newEd[index] = { ...newEd[index], [field]: value };
    setEducation(newEd);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setStepDirty?.(false);
    handleNext({ education: education.map(({ isNew, ...rest }) => rest) });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Education</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Your academic background and qualifications.
          </p>
        </div>
      </div>

      <SectionTips
        sectionKey="cvbuilder_education"
        title="Keep education tight and relevant"
        intro="Most readers spend a couple of seconds on this section."
        tips={[
          'List your most recent or highest qualification first.',
          'Honors, GPA, or thesis only if it strengthens your application — otherwise skip it.',
          'For experienced candidates (5+ years), education sits below work history.',
          "Skip the high school once you have a degree — it's implied.",
        ]}
      />

      {education.length === 0 && (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
          <p className="text-slate-500 dark:text-slate-400 mb-4">No education added.</p>
          <button
            type="button"
            onClick={addEducation}
            className="btn-secondary flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" /> Add Education
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={education.map((e) => e._sortId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {education.map((edu, index) => (
              <SortableItem
                key={edu._sortId}
                id={edu._sortId}
                index={index}
                total={education.length}
                isNew={edu.isNew}
                onMoveUp={() => moveItem(index, -1)}
                onMoveDown={() => moveItem(index, 1)}
                onDelete={() => removeEducation(index)}
              >
                <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label
                        htmlFor={`education-school-${index}`}
                        className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        School / University
                      </label>
                      <input
                        id={`education-school-${index}`}
                        type="text"
                        value={edu.school}
                        onChange={(e) => handleChange(index, 'school', e.target.value)}
                        placeholder="e.g. University of Technology"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`education-degree-${index}`}
                        className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        Degree / Major
                      </label>
                      <input
                        id={`education-degree-${index}`}
                        type="text"
                        value={edu.degree}
                        onChange={(e) => handleChange(index, 'degree', e.target.value)}
                        placeholder="e.g. BSc Computer Science"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`education-grad-${index}`}
                        className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        Graduation Date
                      </label>
                      <input
                        id={`education-grad-${index}`}
                        type="text"
                        value={edu.graduationDate}
                        onChange={(e) => handleChange(index, 'graduationDate', e.target.value)}
                        placeholder="e.g. May 2019"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label
                        htmlFor={`education-description-${index}`}
                        className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        Additional Info (Optional)
                      </label>
                      <input
                        id={`education-description-${index}`}
                        type="text"
                        value={edu.description}
                        onChange={(e) => handleChange(index, 'description', e.target.value)}
                        placeholder="e.g. Honors: Cum Laude, GPA: 3.8"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {education.length > 0 && (
        <button
          type="button"
          onClick={addEducation}
          className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Another
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
          {saving ? 'Saving...' : 'Next: Skills'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};

export default Education;
