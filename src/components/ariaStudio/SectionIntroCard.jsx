import React, { useId, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CardEyebrow from './CardEyebrow';
import { CAREER_STAGES } from '../../lib/careerStages';
import { EXPERIENCE_TYPES, introFor } from '../../lib/sectionIntro';
import { SECTION_RESEARCH } from '../../lib/sectionResearch';
import { PROJECT_TYPES } from '../../lib/studioFlow';

// THE BRIEF THAT TEACHES A SECTION BEFORE YOU WALK INTO IT.
//
// The section hand-off used to be three lines: eyebrow, blurb, CTA. That is plenty for
// someone who already knows how a CV works, and nothing at all for the student this app is
// built for — "Add a project" arriving with no answer to what counts as a project, why
// anyone reads the section, or what a good one looks like.
//
// So the same hand-off now carries an illustration and a brief you can scroll: what the
// section IS, why it carries weight, the rules that make it good, the kinds of entry that
// belong in it, and how to get the best out of Aria while you are in there. The action
// stays pinned underneath, so a returning user who needs none of this just taps it and goes.
//
// The brief sits behind a "Learn more" disclosure, closed by default. It was open at first,
// on the reasoning that opt-in education is education the people who need it most skip —
// but seen in place, a lecture unfolding between every section and its button is a wall,
// and it pushed the action itself down the card. The headline and blurb still say what the
// section is without opening anything; the disclosure is for the person who wants the rest.
//
// Most of the copy is not new: `thesis`, the rule bullets and the before/after pull are the
// curated research corpus that already backs the CV builder's "what research says" card
// (see sectionIntro.js for why the step ids differ). Only `whatItIs` and `withAria` are
// written for this surface.

// The brief on its own, so every surface that needs it — the section hub, the target-job
// ask, and the career-stage question, each a "before you walk in" moment — shares one
// implementation rather than three that drift.
export const SectionIntroBrief = ({ section }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);
  const bodyId = useId();
  const intro = introFor(section);
  if (!intro) return null;

  // The research corpus is optional: career stage is not a CV section and has none, so it
  // renders as definition + choices + working note with no thesis, rules or pull block.
  const shape = intro.research ? SECTION_RESEARCH[intro.research] : null;
  const base = intro.research ? `cvBuilder.sectionResearch.${intro.research}` : null;
  const introBase = `ariaStudio.sectionIntro.${section}`;
  const points = shape
    ? Array.from({ length: shape.pointCount }, (_, i) => t(`${base}.points.${i}`))
    : [];
  const before = shape?.hasBeforeAfter ? t(`${base}.before`) : null;
  const after = shape?.hasBeforeAfter ? t(`${base}.after`) : null;
  const example = shape?.hasExample ? t(`${base}.example`) : null;

  // The kinds of entry that belong in this section, explained but NOT offered — the real
  // pickers keep their own place once the section is open. Projects already ship a
  // label+hint pair per type; experience ships labels only, so its hints are new.
  const typeRows =
    intro.types === 'experience'
      ? EXPERIENCE_TYPES.map((key) => ({
          key,
          label: t(`ariaStudio.chat.experienceType.${key}`),
          hint: t(`${introBase}.types.${key}`),
        }))
      : intro.types === 'project'
        ? PROJECT_TYPES.map((pt) => ({ key: pt.key, label: t(pt.labelKey), hint: t(pt.hintKey) }))
        : intro.types === 'careerStage'
          ? CAREER_STAGES.map((s) => ({
              key: s.k,
              label: t(s.labelKey),
              hint: t(`${introBase}.types.${s.k}`),
            }))
          : [];

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Bring the revealed panel into view on open, the way AnswerExamples does — expanding
    // something below the fold otherwise looks like nothing happened. `block: 'nearest'`
    // so it only moves the view if it has to.
    if (next) {
      requestAnimationFrame(() => bodyRef.current?.scrollIntoView?.({ block: 'nearest' }));
    }
  };

  return (
    <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        // The header sits on the card's own paper — the hairline border is what separates
        // it. A filled grey bar read as a second surface stacked inside the card.
        className="flex w-full items-center justify-between gap-3 bg-white px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/40"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {open ? t('ariaStudio.sectionIntro.hide') : t('ariaStudio.sectionIntro.learnMore')}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Height-animated so the panel grows and folds instead of snapping. `initial={false}`
          stops it playing an open animation on first paint for a card that mounts expanded. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="brief"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              id={bodyId}
              ref={bodyRef}
              // A scroll container unreachable by keyboard is a WCAG 2.1.1 failure — it has to
              // take focus for arrows and PageDown to move it.
              //
              // NOTE: no `overscroll-contain` here, deliberately. Containment was the first
              // instinct — stop a flick inside the brief from running away with the chat — but
              // in use it reads as the page jamming: you reach the end of the brief and the
              // wheel simply stops, with no way to carry on without moving the pointer off the
              // panel. Default chaining hands the scroll back to the chat at either boundary,
              // which is what a reader expects.
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              role="group"
              aria-label={t('ariaStudio.sectionIntro.briefLabel')}
              className="custom-scrollbar border-t border-slate-200 dark:border-slate-800 p-3 max-h-[min(38vh,300px)] overflow-y-auto focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600 flex flex-col gap-3"
            >
              {/* What it is, in one sentence. */}
              <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                {t(`${introBase}.whatItIs`)}
              </p>

              {/* Why it carries weight — the research corpus's one-line takeaway. Guarded: with
              no corpus entry `base` is null, and an unguarded t() would print the literal
              string "null.thesis" on screen. */}
              {shape && (
                <p className="font-serif text-[14px] leading-snug text-slate-800 dark:text-slate-100">
                  {t(`${base}.thesis`)}
                </p>
              )}

              {/* The rules that make it good. */}
              <ul className="flex flex-col gap-1.5">
                {points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-[7px] shrink-0 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                    <span
                      className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 [&_b]:font-semibold [&_b]:text-slate-800 dark:[&_b]:text-slate-100"
                      // Trusted static content from the locale files — enables <b>.
                      dangerouslySetInnerHTML={{ __html: pt }}
                    />
                  </li>
                ))}
              </ul>

              {/* The kinds of entry, so the picker that follows is never a cold choice. */}
              {typeRows.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {t(`${introBase}.typesLead`)}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {typeRows.map((row) => (
                      <li key={row.key} className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">
                          {row.label}
                        </span>
                        <span className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                          {row.hint}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* A before→after contrast where the corpus has one, else a single example. */}
              {before || after ? (
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800/60 px-3 py-2.5 flex flex-col gap-1.5">
                  {before && (
                    <p className="flex items-start gap-2 text-[12px] leading-relaxed text-rose-600/90 dark:text-rose-400/90">
                      <span className="mt-px shrink-0 font-semibold">✗</span>
                      <span className="line-through decoration-rose-400/50">{before}</span>
                    </p>
                  )}
                  {after && (
                    <p className="flex items-start gap-2 text-[12px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                      <span className="mt-px shrink-0 font-semibold">✓</span>
                      <span>{after}</span>
                    </p>
                  )}
                </div>
              ) : example ? (
                <div className="rounded-xl bg-slate-900 dark:bg-white px-3.5 py-3">
                  <p className="flex items-start gap-2 text-[12.5px] font-medium leading-relaxed text-white dark:text-slate-900">
                    <span className="mt-px shrink-0 font-semibold">✓</span>
                    <span>{example}</span>
                  </p>
                </div>
              ) : null}

              {/* How to get the best out of Aria in here — the one thing no CV guide covers. */}
              <div className="flex flex-col gap-1">
                <CardEyebrow>{t('ariaStudio.sectionIntro.withAriaLabel')}</CardEyebrow>
                <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {t(`${introBase}.withAria`)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// The decorative illustration band. Everything it depicts, the brief says in words, so it
// is hidden from assistive tech and carries no alt text. Delivered as a CSS background
// (see index.css) so only the active theme's variant is ever fetched.
export const SectionIntroArt = ({ art }) =>
  art ? (
    <div
      aria-hidden="true"
      data-testid={`section-art-${art}`}
      className={`section-art section-art-${art}`}
    />
  ) : null;

// A section with no SECTION_INTRO entry — `certs`, and anything added to the hub later —
// falls back to exactly the card that was here before, art band and brief both omitted. It
// degrades to the old behaviour rather than to a blank.
const SectionIntroCard = ({
  section,
  icon,
  eyebrow,
  blurb,
  cta,
  onStart,
  busy = false,
  skip = null,
  skipLabel = '',
}) => {
  const { t } = useTranslation();
  const intro = introFor(section);

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <SectionIntroArt art={intro?.art} />

      <div className="p-5">
        <CardEyebrow icon={icon}>{eyebrow}</CardEyebrow>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
          {blurb}
        </p>

        <SectionIntroBrief section={section} />

        {/* Pinned under the brief, never inside it — the way on is always in reach. */}
        <button
          type="button"
          onClick={onStart}
          disabled={!!busy}
          className="btn-primary w-full mt-3 py-2 text-sm disabled:opacity-50"
        >
          {busy ? t('ariaStudio.buildRoadmap.settingUp') : cta}
        </button>

        {/* Optional sections get a guilt-free out, stated plainly. */}
        {skip && (
          <button
            type="button"
            onClick={skip}
            disabled={!!busy}
            className="w-full mt-2 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {skipLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default SectionIntroCard;
