// @vitest-environment jsdom
//
// The card that teaches a section before you walk into it. What is worth pinning here is
// not the layout but the three promises the feature rests on:
//
//   1. The brief is ON the path, not behind a disclosure. If someone has to tap to read
//      it, the people who most need it never will — so it renders unasked.
//   2. The way on is never trapped behind the brief. The CTA sits outside the scroll
//      container, so a returning user who wants none of this can always reach it.
//   3. A section with no intro entry degrades to the plain card it was before, not to a
//      blank. `certs` is that case today and anything added to the hub later will be too.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import i18n from '../../i18n';
import { EXPERIENCE_TYPES, SECTION_INTRO } from '../../lib/sectionIntro';
import { SECTION_RESEARCH } from '../../lib/sectionResearch';
import { PROJECT_TYPES } from '../../lib/studioFlow';
import SectionIntroCard from './SectionIntroCard';

afterEach(cleanup);

const t = (key, opts) => i18n.t(key, opts);

const mount = (props = {}) =>
  render(
    <SectionIntroCard
      section="experience"
      icon="💼"
      eyebrow="Next up"
      blurb="Work history carries the most weight."
      cta="Start work history"
      onStart={vi.fn()}
      {...props}
    />
  );

const brief = () => screen.queryByRole('group', { name: t('ariaStudio.sectionIntro.briefLabel') });

// The brief is behind a "Learn more" disclosure now, so every test that reads it has to open
// it first. Queries run against a closed card would pass vacuously against no brief at all.
const learnMore = () =>
  screen.getByRole('button', { name: t('ariaStudio.sectionIntro.learnMore') });
const openBrief = () => fireEvent.click(learnMore());

describe('SectionIntroCard — the brief', () => {
  it('stays closed until asked, so the action is not pushed down the card', () => {
    mount();

    expect(brief()).toBeNull();
    expect(screen.queryByText(t('ariaStudio.sectionIntro.experience.whatItIs'))).toBeNull();
    // …but the offer is visible without hunting for it.
    expect(learnMore()).toBeTruthy();
    expect(learnMore().getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the whole brief on one tap, and closes again', async () => {
    mount();
    openBrief();

    expect(screen.getByText(t('ariaStudio.sectionIntro.experience.whatItIs'))).toBeTruthy();
    expect(screen.getByText(t('cvBuilder.sectionResearch.history.thesis'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.sectionIntro.experience.withAria'))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: t('ariaStudio.sectionIntro.hide') }));
    // The label flips at once; the panel itself folds away, so it stays mounted for the
    // length of the exit animation rather than vanishing on the click.
    expect(learnMore().getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(brief()).toBeNull());
  });

  it('carries every rule the research corpus has for the section', () => {
    mount();
    openBrief();

    // Sourced from the CV builder's curated corpus under a DIFFERENT step id ('history'),
    // which is the whole reason SECTION_INTRO carries a `research` field.
    const { research, art } = SECTION_INTRO.experience;
    expect(research).toBe('history');
    expect(art).toBe('experience');

    const text = brief().textContent;
    const { pointCount } = SECTION_RESEARCH[research];
    expect(pointCount).toBeGreaterThan(0);
    for (let i = 0; i < pointCount; i += 1) {
      // The corpus marks emphasis with <b>, which renders as markup rather than as text.
      const rule = t(`cvBuilder.sectionResearch.${research}.points.${i}`).replace(/<[^>]+>/g, '');
      expect(text).toContain(rule);
    }
  });

  it('is keyboard-reachable, because a scroll box that is not is a WCAG failure', () => {
    mount();
    openBrief();

    expect(brief().getAttribute('tabindex')).toBe('0');
  });

  it('lets the scroll chain back to the chat at either end of the brief', () => {
    mount();
    openBrief();

    // Deliberately NOT overscroll-contain. Containment made the wheel dead-stop at the end
    // of the brief with no way to carry on; reaching a boundary should hand the scroll back
    // to the chat behind it. Re-adding it would be a silent, very annoying regression.
    expect(brief().className).not.toContain('overscroll-contain');
  });
});

describe('SectionIntroCard — the kinds of entry', () => {
  it('explains all five experience types before the picker ever asks', () => {
    mount({ section: 'experience' });
    openBrief();

    expect(screen.getByText(t('ariaStudio.sectionIntro.experience.typesLead'))).toBeTruthy();
    EXPERIENCE_TYPES.forEach((key) => {
      expect(within(brief()).getByText(t(`ariaStudio.chat.experienceType.${key}`))).toBeTruthy();
      expect(
        within(brief()).getByText(t(`ariaStudio.sectionIntro.experience.types.${key}`))
      ).toBeTruthy();
    });
  });

  it('reuses the project types rather than restating them', () => {
    mount({ section: 'project', blurb: 'Projects are worth a lot.' });
    openBrief();

    PROJECT_TYPES.forEach((pt) => {
      expect(within(brief()).getByText(t(pt.labelKey))).toBeTruthy();
      expect(within(brief()).getByText(t(pt.hintKey))).toBeTruthy();
    });
  });

  it('says nothing about types on a section that has none', () => {
    mount({ section: 'education', blurb: 'Add what you studied.' });
    openBrief();

    expect(screen.queryByText(t('ariaStudio.sectionIntro.experience.typesLead'))).toBeNull();
    // …but it is still a full brief.
    expect(screen.getByText(t('ariaStudio.sectionIntro.education.whatItIs'))).toBeTruthy();
  });
});

describe('SectionIntroCard — the way on', () => {
  it('keeps the CTA OUTSIDE the scroll container', () => {
    mount({ cta: 'Start work history' });
    openBrief();

    const cta = screen.getByRole('button', { name: 'Start work history' });
    expect(brief().contains(cta)).toBe(false);
  });

  it('starts the section when tapped', () => {
    const onStart = vi.fn();
    mount({ onStart, cta: 'Start work history' });

    fireEvent.click(screen.getByRole('button', { name: 'Start work history' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('holds the door shut while the section is being set up', () => {
    const onStart = vi.fn();
    mount({ onStart, busy: 'next' });

    const cta = screen.getByRole('button', { name: t('ariaStudio.buildRoadmap.settingUp') });
    expect(cta.disabled).toBe(true);
  });

  it('offers the skip only when the section has one', () => {
    const skip = vi.fn();
    mount({ skip, skipLabel: "That's all my roles" });
    expect(screen.getByRole('button', { name: "That's all my roles" })).toBeTruthy();

    cleanup();
    mount();
    expect(screen.queryByRole('button', { name: "That's all my roles" })).toBeNull();
  });
});

describe('SectionIntroCard — sections with no brief', () => {
  it('degrades to the plain card rather than to a blank', () => {
    // `certs` deliberately has no SECTION_INTRO entry: it is a sub-step of education, not
    // one of the sections people walk into cold.
    expect(SECTION_INTRO.certs).toBeUndefined();

    mount({ section: 'certs', eyebrow: 'Certifications · optional', cta: 'Add certifications' });

    expect(screen.getByText('Certifications · optional')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add certifications' })).toBeTruthy();
    expect(brief()).toBeNull();
    // Not even the offer — a "Learn more" that opens nothing is worse than no control.
    expect(
      screen.queryByRole('button', { name: t('ariaStudio.sectionIntro.learnMore') })
    ).toBeNull();
  });
});

describe('SectionIntroCard — the illustration', () => {
  it('shows the section art, hidden from assistive tech', () => {
    mount({ section: 'experience' });

    const art = screen.getByTestId('section-art-experience');
    expect(art.getAttribute('aria-hidden')).toBe('true');
    // Everything the drawing depicts, the brief says in words — so it never needs alt text.
    expect(art.textContent).toBe('');
  });

  it('has a distinct illustration for every section it covers', () => {
    const arts = Object.values(SECTION_INTRO).map((s) => s.art);
    expect(new Set(arts).size).toBe(arts.length);
  });
});
