import React from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// Education and contact details are COMPLETENESS, not tailoring. A job description
// doesn't keyword-match a phone number, and there's nothing for a coach to interview
// you about — you either listed your degree or you didn't.
//
// So: no AI, no credits, no conversation. A short note about what's missing and a
// direct link to the step that fixes it. Building a coach loop here would be theatre.
// Keys, not text — resolved via t() at render so the runtime UI language decides.
const GUIDANCE = {
  education: {
    titleKey: 'ariaStudio.sectionGuidance.education.title',
    step: 'education',
    bodyKey: 'ariaStudio.sectionGuidance.education.body',
    ctaKey: 'ariaStudio.sectionGuidance.education.cta',
  },
  contact: {
    titleKey: 'ariaStudio.sectionGuidance.contact.title',
    step: 'heading',
    bodyKey: 'ariaStudio.sectionGuidance.contact.body',
    ctaKey: 'ariaStudio.sectionGuidance.contact.cta',
  },
};

// `onRescore` is the way OUT of the loop the CTA creates: the link opens the builder in
// a NEW TAB, so the honest user journey is "go and fix it over there, then come back" —
// and Back alone returned to a breakdown still showing the old red band, with nothing to
// tell the user how to make it catch up.
const SectionGuidanceCard = ({ section, draftId, note, onBack, onRescore, rescoring }) => {
  const { t } = useTranslation();
  const g = GUIDANCE[section];
  if (!g) return null;

  return (
    <AriaCard cardKey={`guide-${section}`}>
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t(g.titleKey)}
          </p>
          <span className="shrink-0 rounded-md bg-emerald-50 dark:bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {t('ariaStudio.certifications.noCharge')}
          </span>
        </div>

        {note && (
          <p className="mt-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
            {note}
          </p>
        )}

        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
          {t(g.bodyKey)}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onBack?.()}
            disabled={rescoring}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.back')}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {draftId && (
              <a
                href={`/cv-builder/${draftId}/${g.step}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-900 hover:text-slate-950 dark:hover:border-white dark:hover:text-white transition-colors"
              >
                {t(g.ctaKey)} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {/* Free, and therefore the PRIMARY action: the user has already done the work
                in the other tab and only needs the score to catch up with it. */}
            {onRescore && (
              <button
                type="button"
                onClick={() => onRescore()}
                disabled={rescoring}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <RefreshCw className={`w-3 h-3 ${rescoring ? 'animate-spin' : ''}`} />
                {rescoring
                  ? t('ariaStudio.sectionBreakdown.rescoring')
                  : t('ariaStudio.sectionGuidance.rescore')}
              </button>
            )}
          </div>
        </div>
      </div>
    </AriaCard>
  );
};

export default SectionGuidanceCard;
