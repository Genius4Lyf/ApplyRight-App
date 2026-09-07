// What the user is LOOKING AT while they type to Aria.
//
// The Studio derives a rich `phase` from the transcript, then threw almost all of it away
// on the way to the chat API: the general-chat call flattened it into a CV-builder step id
// and sent an empty string for six of the phases. So when someone sitting in front of the
// career-stage card — "Where are you in your career?", three buttons — asked "can you
// explain the three options?", the only list of anything in Aria's prompt was the CV
// SECTION list, and she explained the sections. She answered the only question she could
// see.
//
// This turns a phase into a plain description of the card on screen and the choices on it.
// It goes into the chat payload as `screen`, is bounded server-side (utils/screenContext),
// and is the thing "the three options" finally points at.
//
// Two rules hold this file together:
//
//   1. Every label comes from the SAME i18n key the card renders. Not a paraphrase, not a
//      hard-coded English copy — the identical string, so what Aria is told is what the
//      user is looking at, in the user's own language.
//   2. Never claim an option that is not on screen. A descriptor with no options is fine
//      and honest; an invented one makes Aria confidently wrong, which is worse than the
//      bug this fixes. That is why the mode chooser reads the tailoring flag and the type
//      cards are only described at the stage where they are actually up.
import { CAREER_STAGES } from './careerStages';
import { PROJECT_TYPES } from './studioFlow';
import { STUDIO_TAILORING_ENABLED } from './studioFeatures';

// ExperienceTypeCard's buttons, in render order (components/ariaStudio/ExperienceTypeCard).
const EXPERIENCE_TYPES = ['job', 'internship', 'partTime', 'volunteer', 'coursework'];

// SummaryFixCard asks the career question again with its own richer labels (label + hint),
// so it gets its own list rather than reusing CAREER_STAGES.
const SUMMARY_STAGES = ['grad', 'experienced', 'changer'];

const descriptor = (id, title, body, options = []) => ({
  id,
  title,
  body: body || '',
  options: options.filter(Boolean),
});

/**
 * The card in front of the user, or null when there is nothing to describe.
 *
 * @param {object}   a
 * @param {string}   a.phase        from derivePhase()
 * @param {Function} a.t            i18n translator — labels must be the rendered strings
 * @param {object}   [a.nextSection] the build:sections menu row ({ eyebrow, blurb, cta, skipLabel })
 * @param {string}   [a.entryStage]  roleStage() for a pinned entry: 'type' | 'form' | 'achievements' | 'complete'
 * @param {string}   [a.sectionKey]  'experience' | 'projects' | 'education' for a pinned entry
 * @returns {{id: string, title: string, body: string, options: string[]}|null}
 */
export function screenContext({
  phase,
  t,
  nextSection = null,
  entryStage = null,
  sectionKey = 'experience',
}) {
  if (!phase || typeof t !== 'function') return null;

  switch (phase) {
    case 'mode':
      return descriptor('mode', t('ariaStudio.modeChooser.whatAreWeDoing'), '', [
        t('ariaStudio.modeChooser.buildCta'),
        // Only offered while the flag is on — see ModeChooser, which drops it entirely.
        STUDIO_TAILORING_ENABLED ? t('ariaStudio.modeChooser.tailorTitle') : null,
        t('ariaStudio.modeChooser.prepTitle'),
      ]);

    case 'build:roadmap':
      return descriptor(
        'build-roadmap',
        t('ariaStudio.buildRoadmap.heresThePlan'),
        t('ariaStudio.buildRoadmap.sixSections'),
        [t('ariaStudio.buildRoadmap.startBuilding'), t('ariaStudio.buildRoadmap.uploadTitle')]
      );

    // The card that started all this.
    case 'build:career-stage':
      return descriptor(
        'career-stage',
        t('ariaStudio.chat.careerStage.heading'),
        t('ariaStudio.chat.careerStage.body'),
        [...CAREER_STAGES.map((s) => t(s.labelKey)), t('ariaStudio.chat.careerStage.skip')]
      );

    case 'build:job':
      return descriptor(
        'target-job-ask',
        t('ariaStudio.targetJobAsk.oneThingFirst'),
        t('ariaStudio.targetJobAsk.areYouAiming'),
        [t('ariaStudio.targetJobAsk.yesIHaveOne'), t('ariaStudio.targetJobAsk.notYet')]
      );

    case 'build:brief':
      return descriptor(
        'role-brief',
        t('ariaStudio.roleBrief.ariasRead'),
        t('ariaStudio.roleBrief.investigationNote'),
        [t('ariaStudio.chat.jobDetailsCorrect')]
      );

    case 'build:contact':
      // A form, not a choice — no options, and saying so is the honest answer to "what is
      // this asking me for?".
      return descriptor(
        'contact',
        t('ariaStudio.contactConfirm.howReachYou'),
        t('ariaStudio.contactConfirm.yourDetails')
      );

    case 'build:upload':
      return descriptor(
        'upload',
        t('ariaStudio.chat.upload.eyebrow'),
        t('ariaStudio.chat.upload.prompt'),
        [t('ariaStudio.chat.upload.submit'), t('ariaStudio.chat.upload.typeInstead')]
      );

    case 'build:sections':
      // The between-sections menu. Its copy is built per row in StudioChat, so it is passed
      // in rather than re-derived here — re-deriving would be a second source of truth for
      // the one card whose text changes every time.
      return nextSection
        ? descriptor('section-menu', nextSection.eyebrow || '', nextSection.blurb || '', [
            nextSection.cta,
            nextSection.skipLabel,
          ])
        : null;

    case 'build:skills':
      return descriptor(
        'skills',
        t('ariaStudio.chat.sectionMenu.skillsCta'),
        t('ariaStudio.chat.sectionMenu.skillsBlurb')
      );

    case 'build:summary':
      return descriptor(
        'summary',
        t('ariaStudio.chat.sectionMenu.summaryCta'),
        t('ariaStudio.chat.sectionMenu.summaryBlurb')
      );

    case 'build:done':
      return descriptor('finish', t('ariaStudio.chat.buildSummaryDone'));

    case 'scanoffer':
      return descriptor(
        'scan-offer',
        t('ariaStudio.chat.scanOffer.heading'),
        t('ariaStudio.chat.scanOffer.body'),
        [t('ariaStudio.chat.scanOffer.cta')]
      );

    // The summary rewrite asks the career question again, with its own longer labels.
    case 'fix:summary':
      return descriptor(
        'summary-stage',
        t('ariaStudio.summaryFix.whereAreYou'),
        '',
        SUMMARY_STAGES.map(
          (k) =>
            `${t(`ariaStudio.summaryFix.stages.${k}.label`)} — ${t(
              `ariaStudio.summaryFix.stages.${k}.hint`
            )}`
        )
      );

    default:
      break;
  }

  // Pinned-entry phases. Only the TYPE step puts a list of choices on screen; the rest is
  // a form or Aria's own questions, so those get a title and no options.
  if (phase === 'build:experience' || phase === 'build:project' || phase === 'build:education') {
    if (entryStage === 'type' && phase === 'build:experience') {
      return descriptor(
        'experience-type',
        t('ariaStudio.chat.experienceType.heading'),
        t('ariaStudio.chat.experienceType.body'),
        EXPERIENCE_TYPES.map((k) => t(`ariaStudio.chat.experienceType.${k}`))
      );
    }
    if (entryStage === 'type' && phase === 'build:project') {
      return descriptor(
        'project-type',
        t('ariaStudio.projectType.whatKind'),
        '',
        PROJECT_TYPES.map((p) => `${t(p.labelKey)} — ${t(p.hintKey)}`)
      );
    }
    return descriptor(
      `entry-${sectionKey}`,
      t(
        `ariaStudio.chat.sectionOpener.${phase === 'build:project' ? 'project' : phase === 'build:education' ? 'education' : 'experience'}`
      )
    );
  }

  return null;
}

/**
 * The same job for the CV BUILDER, which has pages rather than cards.
 *
 * Only one builder page puts a set of choices in front of the user the way a Studio card
 * does: the Target Job step asks the identical career question before anything else, and
 * shows it exactly while no stage has been picked yet. Every other step is a form, and the
 * step id the builder already sends describes those perfectly well.
 *
 * Note the option list here is the three stages with NO skip — the builder page has no
 * skip button, and rule 2 at the top of this file says never to claim one that is not there.
 */
export function builderScreenContext({ currentStepId, cvData, t }) {
  if (typeof t !== 'function') return null;
  if (currentStepId !== 'target_job' || cvData?.careerStage) return null;
  return descriptor(
    'career-stage',
    t('cvBuilder.targetJob.careerQuestion'),
    t('cvBuilder.targetJob.careerHint'),
    CAREER_STAGES.map((s) => t(s.labelKey))
  );
}

/**
 * The CV-builder step id that best names the SECTION a Studio phase sits in.
 *
 * Lifted out of the inline ternary that used to live in StudioChat's send handler. The
 * empty string is a real answer, not a gap: on the roadmap, the career-stage card or the
 * between-sections menu the user is not inside any section, and the backend's "your CV"
 * fallback says exactly that. What was missing before was never the step — it was the
 * card, which screenContext now supplies.
 */
export function stepIdForPhase(phase) {
  switch (phase) {
    case 'build:job':
    case 'build:brief':
      return 'target_job';
    case 'build:contact':
      return 'heading';
    case 'build:experience':
      return 'history';
    case 'build:project':
      return 'projects';
    case 'build:education':
      return 'education';
    case 'build:skills':
      return 'skills';
    case 'build:summary':
      return 'summary';
    case 'build:done':
      return 'finalize';
    default:
      return '';
  }
}
