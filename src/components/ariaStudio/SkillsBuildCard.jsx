import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SkillsCard from '../cv/SkillsCard';
import GenerationModelRow from '../cv/GenerationModelRow';
import AriaCard from './AriaCard';
import { UNCATEGORIZED, skillCategoryLabel } from '../../lib/skillCategories';

// Skills for a build session — the SAME flow the CV builder's AriaChat runs: consent →
// CVService.generateSkills → SkillsCard → applySkills. The picking UI IS SkillsCard,
// imported directly rather than rebuilt, so grouping, "best for this role" and the
// per-skill detail popover behave identically on both surfaces.
//
// It runs after work history and projects because it READS them: the generation is
// grounded in what the user has already described, not invented from a job title.
const SkillsBuildCard = ({
  phase, // 'consent' | 'card'
  data, // { suggestions, bestForRole }
  existingSkills = [],
  hasJob,
  cost, // resolved credit cost — priced by the caller off the GENERATION model's tier
  genModelId,
  onSelectGenModel,
  chatTier,
  onGenerate,
  onAdd,
  onManual,
  onSkip,
  onDone,
  addedCount = 0,
  busy,
}) => {
  const { t } = useTranslation();
  const [manualName, setManualName] = useState('');
  const [manualCategory, setManualCategory] = useState(UNCATEGORIZED);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingNewCategory, setCreatingNewCategory] = useState(false);
  const categories = [
    UNCATEGORIZED,
    ...Array.from(
      new Set(
        existingSkills
          .map((skill) => (typeof skill === 'string' ? UNCATEGORIZED : skill?.category))
          .filter(Boolean)
          .filter((category) => category !== UNCATEGORIZED)
      )
    ),
  ];

  const addManualSkill = () => {
    const name = manualName.trim();
    const newCategory = newCategoryName.trim();
    const category = creatingNewCategory ? newCategory : manualCategory;
    if (!name || !category) return;
    onManual?.({ name, category });
    setManualName('');
    if (creatingNewCategory) {
      setManualCategory(newCategory);
      setNewCategoryName('');
      setCreatingNewCategory(false);
    }
  };

  if (phase === 'card' && data) {
    return (
      <AriaCard cardKey="skillscard" wide>
        <div className="min-w-0 flex-1">
          <SkillsCard
            suggestions={data.suggestions}
            bestForRole={data.bestForRole}
            existingSkills={existingSkills}
            onAdd={onAdd}
          />
        </div>
      </AriaCard>
    );
  }

  return (
    <AriaCard cardKey="skillsconsent">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[17px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.studioFlow.sections.skills')}
          </p>
          <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            −{cost} cr
          </span>
        </div>

        <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
          {hasJob ? t('ariaStudio.skillsBuild.bodyWithJob') : t('ariaStudio.skillsBuild.bodyNoJob')}
        </p>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <GenerationModelRow
            action="skills"
            value={genModelId}
            onSelect={onSelectGenModel}
            chatTier={chatTier}
            unit="flat"
          />
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={busy}
          className="btn-primary w-full mt-3 py-2 text-[16px] disabled:opacity-50"
        >
          {busy
            ? t('ariaStudio.skillsBuild.readingCv')
            : t('ariaStudio.skillsBuild.findMySkills', { cost })}
        </button>

        {/* Free alternative, offered plainly rather than buried — nobody should feel
            they have to spend credits to list skills they already know they have. */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            {t('ariaStudio.skillsBuild.typeYourselfFree')}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            {creatingNewCategory ? (
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t('cvBuilder.skills.categoryName')}
                aria-label={t('cvBuilder.skills.categoryName')}
                className="sm:w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
              />
            ) : (
              <select
                value={manualCategory}
                onChange={(e) => {
                  if (e.target.value === '__new__') setCreatingNewCategory(true);
                  else setManualCategory(e.target.value);
                }}
                aria-label={t('cvBuilder.skills.categoryName')}
                className="sm:w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 px-3 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {skillCategoryLabel(category, t)}
                  </option>
                ))}
                <option value="__new__">{t('cvBuilder.skills.newCategory')}</option>
              </select>
            )}
            <input
              id="studio-skills-manual"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addManualSkill();
                }
              }}
              placeholder={t('cvBuilder.skills.addSkillPlaceholder')}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
            />
            <button
              type="button"
              onClick={addManualSkill}
              disabled={!manualName.trim() || (creatingNewCategory && !newCategoryName.trim()) || busy}
              className="shrink-0 text-[14px] font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {t('ariaStudio.jobCapture.add')}
            </button>
          </div>
          <p className="mt-1 text-[10.5px] text-slate-400 dark:text-slate-500">
            {creatingNewCategory
              ? t('cvBuilder.skills.giveCategoryName')
              : t('cvBuilder.skills.pressEnter').replace(/<[^>]*>/g, '')}
          </p>
        </div>

        {addedCount > 0 ? (
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="btn-secondary w-full mt-3 py-2 text-[16px] disabled:opacity-50"
          >
            {t('ariaStudio.skillsBuild.doneNextSection')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="w-full mt-3 text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('ariaStudio.skillsBuild.skipForNow')}
          </button>
        )}
      </div>
    </AriaCard>
  );
};

export default SkillsBuildCard;
