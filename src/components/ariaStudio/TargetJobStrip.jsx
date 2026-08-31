import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { BriefcaseBusiness, PencilLine, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAriaStudio } from '../../context/AriaStudioContext';

const MIN_JD_LENGTH = 25;

// Permanent document context: this is intentionally a thin status line, not another
// card in the conversation. It distinguishes the job this CV targets from whichever
// past role Aria is currently interviewing the user about.
const TargetJobStrip = ({ model }) => {
  const { t } = useTranslation();
  const { cvData, draftId, studioPhase, updateTargetJob } = useAriaStudio();
  const targetJob = cvData?.targetJob || {};
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setTitle(targetJob.title || targetJob.brief?.role || '');
    setDescription(targetJob.description || '');
    setOpen(true);
  };

  const capturedTarget = Boolean(
    String(targetJob.title || targetJob.brief?.role || targetJob.description || '').trim()
  );
  const beforeTargetCapture =
    !studioPhase ||
    ['mode', 'job', 'build:roadmap', 'build:career-stage', 'build:job'].includes(studioPhase);
  const buildRoleOrProjectActive = [
    'build:experience',
    'build:project',
    'build:project-ideas',
  ].includes(studioPhase);

  if (!draftId || !capturedTarget || beforeTargetCapture || buildRoleOrProjectActive) return null;

  const hasJd = Boolean(String(targetJob.description || '').trim());
  const role = targetJob.brief?.role || targetJob.title || t('ariaStudio.targetJobStrip.noRole');
  const canSave = title.trim() && description.trim().length >= MIN_JD_LENGTH && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const result = await updateTargetJob({
      jobTitle: title.trim(),
      jobDescription: description.trim(),
      model,
    });
    setSaving(false);
    if (!result?.ok) return;
    setOpen(false);
    toast.success(
      result.changed
        ? t('ariaStudio.targetJobStrip.updatedNotice')
        : t('ariaStudio.targetJobStrip.noChanges')
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="relative z-[5] flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/35 sm:px-4"
      >
        <BriefcaseBusiness
          className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
          aria-hidden="true"
        />
        <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 sm:inline">
          {t('ariaStudio.targetJobStrip.label')}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">
          {role}
        </span>
        <span
          className={`hidden shrink-0 text-[10px] sm:inline ${
            hasJd ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {hasJd ? t('ariaStudio.targetJobStrip.jdAdded') : t('ariaStudio.targetJobStrip.noJd')}
        </span>
        <button
          type="button"
          onClick={openEditor}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <PencilLine className="h-3 w-3" aria-hidden="true" />
          {hasJd ? t('ariaStudio.targetJobStrip.edit') : t('ariaStudio.targetJobStrip.add')}
        </button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) setOpen(false);
            }}
          >
            <motion.section
              initial={{ opacity: 0, y: 18, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.99 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="target-job-editor-title"
              className="flex max-h-[92svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-slate-700"
            >
              <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    {t('ariaStudio.targetJobStrip.label')}
                  </p>
                  <h2
                    id="target-job-editor-title"
                    className="mt-1 text-lg font-bold text-slate-900 dark:text-white"
                  >
                    {hasJd
                      ? t('ariaStudio.targetJobStrip.editorTitleEdit')
                      : t('ariaStudio.targetJobStrip.editorTitleAdd')}
                  </h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {t('ariaStudio.targetJobStrip.editorHelp')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setOpen(false)}
                  disabled={saving}
                  aria-label={t('common.close')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div>
                  <label
                    htmlFor="studio-target-role"
                    className="text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    {t('ariaStudio.targetJobStrip.roleLabel')}
                  </label>
                  <input
                    id="studio-target-role"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={saving}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-white dark:focus:border-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="studio-target-jd"
                      className="text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                    >
                      {t('ariaStudio.targetJobStrip.jdLabel')}
                    </label>
                    <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
                      {description.trim().length}
                    </span>
                  </div>
                  <textarea
                    id="studio-target-jd"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={saving}
                    rows={13}
                    placeholder={t('ariaStudio.targetJobStrip.jdPlaceholder')}
                    className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-800 outline-none transition-colors focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-white"
                  />
                  {description.trim().length > 0 && description.trim().length < MIN_JD_LENGTH && (
                    <p className="mt-1 text-[10.5px] text-amber-600 dark:text-amber-400">
                      {t('ariaStudio.targetJobStrip.jdTooShort', { count: MIN_JD_LENGTH })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
                <p className="hidden max-w-sm text-[10.5px] leading-relaxed text-slate-400 dark:text-slate-500 sm:block">
                  {t('ariaStudio.targetJobStrip.preserveNotice')}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                    className="px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:text-white"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={!canSave}
                    className="btn-primary min-w-[144px] px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving
                      ? t('ariaStudio.targetJobStrip.rereading')
                      : t('ariaStudio.targetJobStrip.saveAndReread')}
                  </button>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TargetJobStrip;
