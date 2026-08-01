import React from 'react';
import { motion } from 'framer-motion';
import { Check, EyeOff, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TemplatePreviewThumb from '../TemplatePreviewThumb';
import { TEMPLATES, WEEKLY_TRENDING_TEMPLATE_IDS } from '../../data/templates';

const MotionSection = motion.section;
const MotionButton = motion.button;

const BEST_CHOICES = WEEKLY_TRENDING_TEMPLATE_IDS.map((id) =>
  TEMPLATES.find((template) => template.id === id)
).filter(Boolean);

const StudioBestChoices = ({ selectedTemplate, isUnlocked, onSelect, onKeepShowing, onHide }) => {
  const { t } = useTranslation();

  return (
    <MotionSection
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      aria-label={t('cvStudio.bestChoices.ariaLabel')}
      className="border-b border-slate-200 pb-5 dark:border-slate-800"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {t('cvStudio.bestChoices.eyebrow')}
      </p>
      <h3 className="mt-1 font-heading text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
        {t('cvStudio.bestChoices.title')}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('cvStudio.bestChoices.subtitle')}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {BEST_CHOICES.map((template, index) => {
          const selected = selectedTemplate === template.id;
          const locked = !isUnlocked(template.id);
          const spansRow = index === BEST_CHOICES.length - 1 && BEST_CHOICES.length % 2 === 1;

          return (
            <MotionButton
              key={template.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + index * 0.05, duration: 0.28 }}
              whileHover={{ y: -3 }}
              onClick={() => onSelect(template.id)}
              aria-pressed={selected}
              className={`${spansRow ? 'col-span-2' : ''} group overflow-hidden rounded-lg border text-left transition-colors ${
                selected
                  ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white'
                  : 'border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'
              }`}
            >
              <span className="relative flex justify-center overflow-hidden border-b border-slate-200 bg-white dark:border-slate-700">
                <TemplatePreviewThumb templateId={template.id} width={spansRow ? 150 : 112} />
                {locked && <span className="absolute inset-0 bg-white/35 dark:bg-slate-900/45" />}
                <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-slate-900/90 px-1.5 py-1 font-mono text-[8px] font-bold uppercase tracking-wide text-white">
                  {locked ? (
                    <>
                      <Lock className="h-2.5 w-2.5" /> {template.cost} CR
                    </>
                  ) : (
                    t('cvStudio.bestChoices.available')
                  )}
                </span>
              </span>
              <span
                className={`flex items-center gap-2 px-2.5 py-2 ${
                  selected ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {template.name}
                </span>
                {selected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-slate-900 dark:text-white" />
                )}
              </span>
            </MotionButton>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed="true"
          onClick={onKeepShowing}
          className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-900"
        >
          <Check className="h-3 w-3" /> {t('cvStudio.bestChoices.keepShowing')}
        </button>
        <button
          type="button"
          onClick={onHide}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <EyeOff className="h-3 w-3" /> {t('cvStudio.bestChoices.dontShow')}
        </button>
      </div>
    </MotionSection>
  );
};

export default StudioBestChoices;
