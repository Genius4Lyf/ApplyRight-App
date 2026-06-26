import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ArrowRight, ArrowLeft, Plus, Award, X } from 'lucide-react';
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
  // Certifications & training share this step (no separate wizard step). Empty
  // rows are dropped on save so a half-typed entry never persists.
  const [certifications, setCertifications] = useState(() => cvData?.certifications || []);
  const [expandedId, setExpandedId] = useState(() => {
    const initial = ensureIds(cvData?.education);
    if (initial.length === 1 && !initial[0].school && !initial[0].degree) {
      return initial[0]._sortId;
    }
    return null;
  });

  const cleanCertifications = (rows) => rows.filter((c) => (c.name || '').trim());

  // Expose this step's current data so the wizard can flush it when the user
  // jumps to another section via the step navigator.
  useEffect(() => {
    registerStepData?.(() => ({
      education: education.map(({ isNew, ...rest }) => rest),
      certifications: cleanCertifications(certifications),
    }));
    return () => registerStepData?.(null);
  }, [education, certifications, registerStepData]);

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
    const newId = newSortId();
    setEducation([
      ...education,
      { _sortId: newId, degree: '', school: '', graduationDate: '', description: '', isNew: true },
    ]);
    setExpandedId(newId);
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

  const addCertification = () => {
    setStepDirty?.(true);
    setCertifications((c) => [...c, { name: '', issuer: '', date: '' }]);
  };

  const removeCertification = (index) => {
    setStepDirty?.(true);
    setCertifications((c) => c.filter((_, i) => i !== index));
  };

  const handleCertChange = (index, field, value) => {
    setStepDirty?.(true);
    setCertifications((c) => c.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setStepDirty?.(false);
    handleNext({
      education: education.map(({ isNew, ...rest }) => rest),
      certifications: cleanCertifications(certifications),
    });
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
            {education.map((edu, index) => {
              const isExpanded = expandedId === edu._sortId;
              return (
                <SortableItem
                  key={edu._sortId}
                  id={edu._sortId}
                  index={index}
                  total={education.length}
                  isNew={edu.isNew}
                  onMoveUp={() => moveItem(index, -1)}
                  onMoveDown={() => moveItem(index, 1)}
                  onDelete={() => removeEducation(index)}
                  isExpanded={isExpanded}
                  onToggleExpand={() => setExpandedId(isExpanded ? null : edu._sortId)}
                >
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group overflow-hidden">
                    {/* Collapsed Header / Summary View */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : edu._sortId)}
                      className="p-4 md:p-5 pr-28 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          <GraduationCap className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                            {edu.degree || 'Untitled Qualification'}
                            {edu.school && (
                              <span className="text-slate-500 dark:text-slate-400 font-normal">
                                {' '}
                                • {edu.school}
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {edu.graduationDate || '—'}
                          </p>
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
                                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
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
                                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
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
                                  onChange={(e) =>
                                    handleChange(index, 'graduationDate', e.target.value)
                                  }
                                  placeholder="e.g. May 2019"
                                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
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
                                  onChange={(e) =>
                                    handleChange(index, 'description', e.target.value)
                                  }
                                  placeholder="e.g. Honors: Cum Laude, GPA: 3.8"
                                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
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

      {education.length > 0 && (
        <button
          type="button"
          onClick={addEducation}
          className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Another
        </button>
      )}

      {/* Certifications & Training — optional sub-section of this step. Renders
          into the CV after Education. High value for licence-gated roles. */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
            <Award className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              Certifications &amp; Training{' '}
              <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-snug">
              Licences, certificates, and professional training — often the gating requirement for
              trades, operations, and healthcare roles.
            </p>
          </div>
        </div>

        {certifications.length > 0 && (
          <div className="space-y-2">
            {certifications.map((cert, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch">
                <input
                  type="text"
                  value={cert.name}
                  onChange={(e) => handleCertChange(index, 'name', e.target.value)}
                  placeholder="Certification (e.g. NEBOSH IGC, PMP)"
                  className="flex-[2] p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
                <input
                  type="text"
                  value={cert.issuer}
                  onChange={(e) => handleCertChange(index, 'issuer', e.target.value)}
                  placeholder="Issuer (e.g. NEBOSH)"
                  className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
                <input
                  type="text"
                  value={cert.date}
                  onChange={(e) => handleCertChange(index, 'date', e.target.value)}
                  placeholder="Year"
                  className="sm:w-24 p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeCertification(index)}
                  aria-label="Remove certification"
                  className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 self-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addCertification}
          className="text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 inline-flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add certification
        </button>
      </div>

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
