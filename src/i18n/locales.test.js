import { describe, it, expect } from 'vitest';
import en from './locales/en.json';
import fr from './locales/fr.json';

// Walk an object into a flat list of dot-paths → leaf string.
const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, path, out);
    else out[path] = v;
  }
  return out;
};

// The _convention blocks are documentation, not UI strings, and differ by design.
const strip = (o) => {
  const { _convention, ...rest } = o;
  void _convention;
  return rest;
};

const EN = flatten(strip(en));
const FR = flatten(strip(fr));
const placeholders = (s) => (String(s).match(/\{\{\s*\w+\s*\}\}/g) || []).sort();

describe('locale files', () => {
  it('fr.json mirrors en.json exactly — no missing keys', () => {
    expect(Object.keys(EN).filter((k) => !(k in FR))).toEqual([]);
  });

  it('fr.json has no keys that en.json lacks (en is the source of truth)', () => {
    expect(Object.keys(FR).filter((k) => !(k in EN))).toEqual([]);
  });

  it('every value is a non-empty string', () => {
    const bad = [];
    for (const [file, table] of [
      ['en', EN],
      ['fr', FR],
    ]) {
      for (const [k, v] of Object.entries(table)) {
        if (typeof v !== 'string' || !v.trim()) bad.push(`${file}:${k}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('interpolation placeholders match between locales', () => {
    const mismatched = Object.keys(EN).filter(
      (k) => JSON.stringify(placeholders(EN[k])) !== JSON.stringify(placeholders(FR[k]))
    );
    expect(mismatched).toEqual([]);
  });

  it('any {{count}} key declares both plural forms in both locales', () => {
    // i18next reserves `count` for pluralization: a bare key using {{count}} is
    // never resolved, so it must be declared as <key>_one and <key>_other.
    const offenders = [];
    for (const [file, table] of [
      ['en', EN],
      ['fr', FR],
    ]) {
      for (const [k, v] of Object.entries(table)) {
        if (!String(v).includes('{{count}}')) continue;
        if (!/_(one|other)$/.test(k)) {
          offenders.push(`${file}:${k} uses {{count}} without a plural suffix`);
          continue;
        }
        const base = k.replace(/_(one|other)$/, '');
        for (const form of ['_one', '_other']) {
          if (!(base + form in table)) offenders.push(`${file}:${base}${form} missing`);
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it('French copy is not left as untranslated English', () => {
    // A leaf identical in both files is suspicious unless it is deliberately
    // language-neutral (brand, symbols, numeric formats, the language names).
    const ALLOWED_IDENTICAL = new Set([
      'common.appName',
      'common.passwordPlaceholder',
      'common.language.en',
      'common.language.fr',
      'auth.forgot.otpPlaceholder',
      'auth.register.referralPlaceholder',
      'nav.account.minutesShort',
      // Round 2 — genuinely identical in French, not missed translations:
      'footer.colGuides', // "Guides" is the same word in French
      'footer.contact', // "Contact" is the same word in French
      'dashboard.studio.kicker', // "Aria Studio" — product name
      'dashboard.interviewCard.chip', // "Pro" — tier name, kept in English
      'landing.vignettes.compareLabel', // "CV A vs CV B" — labels + a Latin abbreviation
      'landing.vignettes.askTabAria', // "Aria" — product name (see dashboard.studio.kicker)
      // Round 2 (billing) — genuinely language-neutral, not missed translations:
      'billing.common.currencyNgn', // "₦ NGN" — currency symbol + ISO code
      'billing.common.currencyUsd', // "$ USD" — currency symbol + ISO code
      'billing.plans.agentYearly.label', // "Odogwu" — Nigerian honorific used as a plan name
      'billing.upgrade.minUnit', // "min" — same abbreviation for minutes in French
      // Round 3 (CV Builder) — genuinely language-neutral, not missed translations:
      'cvBuilder.common.creditChip', // "{{n}} cr" — "cr" is the same credit abbreviation in French
      'cvBuilder.genModel.flatCost', // "{{n}} cr" — same credit abbreviation (see cvBuilder.common.creditChip)
      'cvBuilder.heading.chipLinkedin', // "LinkedIn" — brand name
      'cvBuilder.chatThemePicker.themes.campus', // "Campus" — same word in French
      'cvBuilder.askAria.companyType.startup', // "Startup" — the loanword is standard in French
      'cvBuilder.skills.proBadge', // "Pro" — tier name, kept in English (see dashboard.interviewCard.chip)
      'cvBuilder.heading.chipPhoto', // "Photo" — same word in French (its siblings ARE translated)
      'cvBuilder.modelPicker.tierLight', // "Standard" — same word in French
      'cvBuilder.modelPicker.tierFlagship', // "Pro" — tier name, kept in English (see cvBuilder.skills.proBadge)
      'cvBuilder.cvHealth.sections.certifications.title', // "Certifications" — same word in French
      'cvBuilder.coach.stepNames.finalize', // "CV" — same abbreviation in French
      'cvBuilder.sectionResearch.heading.example', // a sample contact line — name, email and URLs only
      // Round 4 (Interview Prep) — genuinely language-neutral, not missed translations:
      'interviewPrep.preCallBrief.themes.leadership', // "Leadership" — the loanword is standard in French
      'interviewPrep.practice.star.situation', // "Situation" — identical STAR-method label in French
      'interviewPrep.practice.star.action', // "Action" — identical STAR-method label in French
      'interviewPrep.detail.typeBadge.intro', // "Intro" — same abbreviation in French
      'interviewPrep.detail.typeBadge.motivation', // "Motivation" — same word in French
      'interviewPrep.detail.tabs.questions', // "Questions" — same word in French
      'interviewPrep.detail.tabs.notes', // "Notes" — same word in French
      'interviewPrep.detail.questionsTab.eyebrow', // "Questions" — same word in French
      'interviewPrep.detail.essentialsSection.twoCr', // "2 cr" — the credit abbreviation is the same in French
      // Prompt C (Interview Prep components) — genuinely language-neutral:
      'interviewPrep.storyBank.themes.leadership', // "Leadership" — the loanword is standard in French
      'interviewPrep.storyBank.star.situation', // "Situation" — identical STAR-method label in French
      'interviewPrep.storyBank.star.action', // "Action" — identical STAR-method label in French
      'interviewPrep.bodyLanguage.tips.1.title', // "Posture" — same word in French
      'interviewPrep.calmKit.pause', // "Pause" — same word in French
      'interviewPrep.practiceRunner.labelQuestion', // "Question" — same word in French
      'interviewPrep.audioPlayer.pause', // "Pause" — same word in French
      // Prompt B (MockInterviewPage) — genuinely language-neutral:
      'interviewPrep.mock.types.intro', // "Intro" — same abbreviation in French
      'interviewPrep.mock.types.motivation', // "Motivation" — same word in French
      'interviewPrep.mock.types.question', // "Question" — same word in French
      'interviewPrep.mock.intro.statsQuestions', // "Questions" — same word in French
      'interviewPrep.mock.intro.minutesApprox', // "~{{n}} min" — units, language-neutral
      'interviewPrep.mock.endModal.spentMinutes', // "{{n}} min" — units, language-neutral
      // Prompt E (HowToAceYourInterview) — genuinely language-neutral:
      'howToAce.star.situationTitle', // "Situation" — identical STAR-method label in French
      'howToAce.star.actionTitle', // "Action" — identical STAR-method label in French
      'howToAce.rubric.d3Label', // "Structure (STAR)" — the acronym stays as-is in French
      'howToAce.rubric.bandAlmostRange', // "45 – 74" — a number range, language-neutral
      // Aria Studio Prompt A (studioFlow + cards) — genuinely language-neutral:
      'ariaStudio.studioFlow.sections.contact', // "Contact" — same word in French
      'ariaStudio.studioFlow.fields.experience.dates', // "Dates" — same word in French
      'ariaStudio.studioFlow.fields.education.description', // "Notes" — same word in French
      'ariaStudio.studioArtifactPanel.sections', // "Sections" — same word in French
      'ariaStudio.common.outOf100', // "/ 100" — a number format, language-neutral
      'ariaStudio.certifications.fieldCertification', // "Certification" — same word in French
      'ariaStudio.studioArtifactPanel.certifications', // "Certifications" — same word in French
      'ariaStudio.livePreview.certifications', // "Certifications" — same word in French
      'ariaStudio.contactConfirm.fields.email.label', // "Email" — same word in French
      'ariaStudio.contactConfirm.fields.linkedin.label', // "LinkedIn" — brand name
      'ariaStudio.contactConfirm.fields.linkedin.placeholder', // "linkedin.com/in/…" — a URL format
      'ariaStudio.sessionRail.sessions', // "Sessions" — same word in French
      'ariaStudio.scoreCard.bandPossible', // "Possible" — same word in French
      'ariaStudio.chat.sectionFallback', // "section" — same word in French
      'ariaStudio.desk.title', // "Aria Studio" — brand name
      'ariaStudio.desk.outOf100', // "/100" — a number format, language-neutral
      'ariaStudio.buildRoadmap.uploadCost', // "{{n}} cr" — the credit chip's abbreviation, language-neutral
      'ariaStudio.welcomeGuide.guide', // "Guide" — same word in French (un guide)
      'onboarding.welcome.steps.0.type', // "MOTIVATION" — same word in French
      'onboarding.welcome.steps.2.type', // "GUIDE" — same word in French
      'fitScoreCard.liftPts', // "+{{lift}} pts" — abbreviation format, language-neutral
      'fitScoreCard.levels.junior', // "Junior" — same word in French
      'fitScoreCard.levels.senior', // "Senior" — same word in French
      'fitScoreCard.levels.staff', // "Staff" — same word in French
      'fitScoreCard.levels.lead', // "Lead" — same word in French (tech job title)
      'fitScoreCard.levels.principal', // "Principal" — same word in French
      'fitScoreCard.levels.manager', // "Manager" — same word in French
      'fitScoreCard.levels.vp', // "VP" — same abbreviation in French
      // Landing-page word morph and CV demos — brand fragments, proper names, and technical names:
      'landing.hero.introMorphApply',
      'landing.hero.introMorphThe',
      'landing.hero.introMorphRight',
      'landing.hero.introMorphWay',
      'landing.journey.roleCvs.customerService.name',
      'landing.journey.roleCvs.sales.name',
      'landing.journey.roleCvs.data.name',
      'landing.journey.roleCvs.data.skills',
      'landing.journey.roleCvs.data.certification',
      'landing.journey.roleCvs.admin.name',
      'landing.journey.roleCvs.finance.name',
      'landing.journey.roleCvs.finance.certification',
      // The closing CTA repeats the hero's word morph: "the" and "way." expand in, so the
      // resting state reads "ApplyRight" — the wordmark. Same case as introMorph* above,
      // so the fragments stay English. (landing.cta.applyRightWay holds the translated
      // full sentence; it is currently unrendered.)
      'landing.cta.applyWord',
      'landing.cta.theWord',
      'landing.cta.rightWord',
      'landing.cta.wayWord',
      'landing.journey.interviewInterviewerName', // "Amaka Okafor" — a person's name
    ]);
    const same = Object.keys(EN).filter((k) => EN[k] === FR[k] && !ALLOWED_IDENTICAL.has(k));
    expect(same).toEqual([]);
  });
});
