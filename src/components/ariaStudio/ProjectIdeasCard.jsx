import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import AriaThinking from '../cv/AriaThinking';
import { PROJECT_TYPES } from '../../lib/studioFlow';

// Aria's three project PROPOSALS — the generative mirror of the entry picker. Where
// EntryPickerCard asks "which of the things you've done shall we sharpen?", this asks
// "which of these could you build?", and one tap starts the ordinary FREE focused
// interview on the chosen idea.
//
// SHAPE is deliberately EntryPickerCard's: a wide AriaCard holding a scrolling column of
// full-width option buttons. The whole row is the action — `buildThis` is shown as the
// affordance rather than a separate button, because a row with a button inside it invites
// the "did I tap the row or the button?" hesitation that this screen can least afford.
//
// `evidence` is not decoration. It is the proof that Aria read THEIR CV rather than
// generating portfolio filler, so it renders on every row, muted, under its own eyebrow.
const ProjectIdeasCard = ({ ideas = [], busy, onUse, onStartBlank, onSkip, onDismissSection }) => {
  const { t } = useTranslation();

  if (busy) {
    return (
      <AriaCard cardKey="projectideas" wide>
        <AriaThinking variant="draft" label={t('ariaStudio.projectIdeas.generating')} />
      </AriaCard>
    );
  }

  return (
    <AriaCard cardKey="projectideas" wide>
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.projectIdeas.title')}
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">
          {t('ariaStudio.projectIdeas.intro')}
        </p>

        <div className="mt-3 flex flex-col gap-2 max-h-[340px] overflow-y-auto scrollbar-none">
          {ideas.map((idea, i) => {
            // The chip re-uses the SAME PROJECT_TYPES entry the type step would have
            // shown, so "Coursework" here and "Coursework" there are one label, not two.
            const typeDef = PROJECT_TYPES.find((pt) => pt.key === idea.type);
            return (
              <button
                // Server-generated id; the index is the last-resort key for a row that
                // somehow arrived without one.
                key={idea.id || idea.title || i}
                type="button"
                onClick={() => onUse?.(idea)}
                title={t('ariaStudio.projectIdeas.buildThis')}
                className="text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white bg-white dark:bg-slate-900 px-3 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="block text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                    {idea.title}
                  </span>
                  {typeDef && (
                    <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t(typeDef.labelKey)}
                    </span>
                  )}
                </span>

                {idea.oneLiner && (
                  <span className="mt-1 block text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {idea.oneLiner}
                  </span>
                )}

                {idea.whyItFits && (
                  <span className="mt-2 block">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {t('ariaStudio.projectIdeas.whyItFits')}
                    </span>
                    <span className="block text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {idea.whyItFits}
                    </span>
                  </span>
                )}

                {/* The "grounded in YOUR CV" proof — muted, but always present. */}
                {idea.evidence && (
                  <span className="mt-1.5 block">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('ariaStudio.projectIdeas.fromYourCv')}
                    </span>
                    <span className="block text-[12px] leading-relaxed text-slate-400 dark:text-slate-500">
                      {idea.evidence}
                    </span>
                  </span>
                )}

                <span className="mt-2 block text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  {t('ariaStudio.projectIdeas.buildThis')} →
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* None of these fit is a REAL answer, not a failure — it goes straight to the
              blank project the user would have got without this card. */}
          <button
            type="button"
            onClick={() => onStartBlank?.()}
            className="text-[14px] font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-900 hover:text-slate-950 dark:hover:border-white dark:hover:text-white transition-colors"
          >
            {t('ariaStudio.projectIdeas.startBlank')}
          </button>

          <button
            type="button"
            onClick={() => onSkip?.()}
            className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors"
          >
            {t('ariaStudio.projectIdeas.skip')}
          </button>

          {/* Kept from the empty picker this card replaces inside a FIX: not everyone has
              projects, and "not applicable" must not disappear just because Aria had
              ideas. */}
          {onDismissSection && (
            <button
              type="button"
              onClick={() => onDismissSection('projects')}
              className="text-[14px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1.5 rounded-lg transition-colors"
            >
              {t('ariaStudio.sectionBreakdown.notApplicable')}
            </button>
          )}
        </div>
      </div>
    </AriaCard>
  );
};

export default ProjectIdeasCard;
