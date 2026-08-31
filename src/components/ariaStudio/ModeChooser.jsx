import React from 'react';
import { ArrowRight, FilePlus2, Target, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import { STUDIO_TAILORING_ENABLED } from '../../lib/studioFeatures';

// The Studio's first fork: what are we here to do?
//
// Two doors. BUILD creates a brand-new CV in-chat. PREP analyses a CV you already have
// against a job you're going for, and hands back the three things worth doing about the
// result. They are deliberately unequal: building is the longer, more common piece of
// work, so it keeps the full composition and prep sits beneath it as a second offer
// rather than a matching tile — a 50/50 split would imply they take the same kind of
// time.
//
// Tailoring is a third mode behind STUDIO_TAILORING_ENABLED; with the flag off
// pickMode('tailor') stays wired up but unreachable.
const ModeChooser = ({ onPick }) => {
  const { t } = useTranslation();

  // With tailoring disabled, this is not really a choice: it is the opening moment of
  // the build conversation. Giving it its own composition makes the Studio feel like it
  // is ready to help someone begin, rather than presenting a lone item in a menu.
  if (!STUDIO_TAILORING_ENABLED) {
    const steps = [
      t('ariaStudio.modeChooser.buildStepOne'),
      t('ariaStudio.modeChooser.buildStepTwo'),
      t('ariaStudio.modeChooser.buildStepThree'),
    ];

    return (
      <AriaCard cardKey="mode">
        <section className="w-full min-w-0 overflow-hidden rounded-2xl rounded-tl-md border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          <div className="relative border-b border-slate-100 px-5 pb-5 pt-5 pr-16 dark:border-slate-800 sm:px-6 sm:pb-6 sm:pt-6 sm:pr-[5.5rem]">
            <span className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950 sm:right-6 sm:top-6">
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.modeChooser.buildEyebrow')}
            </p>
            <h2 className="mt-1.5 text-[22px] font-bold tracking-[-0.03em] text-slate-950 dark:text-white">
              {t('ariaStudio.modeChooser.buildTitle')}
            </h2>
            <p className="mt-2 max-w-[34rem] text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t('ariaStudio.modeChooser.buildBody')}
            </p>
          </div>

          <div className="px-5 py-4 dark:bg-slate-950/30 sm:px-6">
            <ol
              className="grid gap-2.5 sm:grid-cols-3 sm:gap-3"
              aria-label={t('ariaStudio.modeChooser.buildStepsLabel')}
            >
              {steps.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-2.5 text-[12px] font-medium leading-snug text-slate-600 dark:text-slate-300"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => onPick('build')}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 active:translate-y-0 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:focus-visible:ring-white dark:focus-visible:ring-offset-slate-900 sm:w-auto sm:min-w-52"
            >
              {t('ariaStudio.modeChooser.buildCta')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.modeChooser.buildNote')}
            </p>
          </div>

          {/* The second door. Inside the same card, on a tinted footer: it is the other
              half of one offer, not a competing card. */}
          <button
            type="button"
            onClick={() => onPick('prep')}
            className="group flex w-full items-center gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 text-left transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-800/50 dark:focus-visible:ring-white sm:px-6"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold tracking-[-0.01em] text-slate-950 dark:text-white">
                {t('ariaStudio.modeChooser.prepTitle')}
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t('ariaStudio.modeChooser.prepBody')}
              </span>
            </span>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500"
              aria-hidden="true"
            />
          </button>
        </section>
      </AriaCard>
    );
  }

  return (
    <AriaCard cardKey="mode">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.modeChooser.whatAreWeDoing')}
        </p>

        {STUDIO_TAILORING_ENABLED && (
          <button
            type="button"
            onClick={() => onPick('tailor')}
            className="mt-3 w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-100 bg-white dark:bg-slate-900 p-3.5 flex items-start gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100"
          >
            {/* Decorative — it illustrates the mode, it isn't an action. Neutral chip,
                matching the builder's entry cards (Education's GraduationCap). */}
            <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                {t('ariaStudio.modeChooser.tailorTitle')}
              </span>
              <span className="block mt-0.5 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t('ariaStudio.modeChooser.tailorBody')}
              </span>
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onPick('build')}
          className="mt-2 w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-100 bg-white dark:bg-slate-900 p-3.5 flex items-start gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100"
        >
          <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
            <FilePlus2 className="w-4 h-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-slate-800 dark:text-slate-100">
              {t('ariaStudio.modeChooser.buildTitle')}
            </span>
            <span className="block mt-0.5 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t('ariaStudio.modeChooser.buildBody')}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onPick('prep')}
          className="mt-2 w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-100 bg-white dark:bg-slate-900 p-3.5 flex items-start gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100"
        >
          <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-slate-800 dark:text-slate-100">
              {t('ariaStudio.modeChooser.prepTitle')}
            </span>
            <span className="block mt-0.5 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t('ariaStudio.modeChooser.prepBody')}
            </span>
          </span>
        </button>
      </div>
    </AriaCard>
  );
};

export default ModeChooser;
