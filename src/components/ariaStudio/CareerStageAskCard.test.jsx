// @vitest-environment jsdom
//
// Career stage is the most consequential tap in the whole build and, until this brief, the
// least legible one: the answer re-coaches every section after it — what counts as evidence,
// whether Aria pushes for a number, how high a bullet may claim to have reached — and the
// card said only "this helps ARIA coach you in the right way".
//
// So what is pinned here is not the layout but that the card EXPLAINS ITS OWN CONSEQUENCES:
// every stage the user can pick says what changes, and the one fact that cannot be recovered
// by skipping is stated on screen.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import i18n from '../../i18n';
import { CAREER_STAGES } from '../../lib/careerStages';
import CareerStageAskCard from './CareerStageAskCard';

afterEach(cleanup);

const t = (key, opts) => i18n.t(key, opts);
const brief = () => screen.queryByRole('group', { name: t('ariaStudio.sectionIntro.briefLabel') });
const openBrief = () =>
  fireEvent.click(screen.getByRole('button', { name: t('ariaStudio.sectionIntro.learnMore') }));

const mount = (props = {}) =>
  render(<CareerStageAskCard onPick={vi.fn()} onSkip={vi.fn()} {...props} />);

describe('CareerStageAskCard — explaining the choice', () => {
  it('says what changes for EVERY stage on offer', () => {
    mount();
    openBrief();

    // Not a sample: every stage the card offers has to be accounted for, or someone picks
    // the one option nobody bothered to explain.
    expect(CAREER_STAGES.length).toBeGreaterThan(0);
    CAREER_STAGES.forEach((s) => {
      expect(
        within(brief()).getByText(t(`ariaStudio.sectionIntro.career_stage.types.${s.k}`))
      ).toBeTruthy();
    });
  });

  it('renders a brief even though career stage has no research corpus entry', () => {
    mount();
    openBrief();

    // It is a question, not a CV section, so there is no cvBuilder.sectionResearch row for
    // it — the brief has to degrade to definition + choices + working note rather than
    // refusing to render.
    expect(brief()).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.sectionIntro.career_stage.whatItIs'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.sectionIntro.career_stage.withAria'))).toBeTruthy();
    // With no corpus entry there is no thesis to show — and emphatically not the unresolved
    // key, which is what an unguarded t(`${base}.thesis`) renders when base is null.
    expect(brief().textContent).not.toContain('null.thesis');
  });

  it('warns that skipping can never reach "changing careers"', () => {
    mount();
    openBrief();

    // inferCareerStage reads stage off the shape of the CV and returns only 'grad' or
    // 'experienced' — 'changer' is unreachable that way. Someone who skips because they
    // assume Aria will work it out silently loses the coaching they most needed.
    const note = t('ariaStudio.sectionIntro.career_stage.withAria');
    expect(note.toLowerCase()).toContain('changing careers');
    expect(screen.getByText(note)).toBeTruthy();
  });
});

describe('CareerStageAskCard — the choice still works', () => {
  it('offers every stage as a button and reports the picked key', () => {
    const onPick = vi.fn();
    mount({ onPick });

    openBrief();
    CAREER_STAGES.forEach((s) => {
      const btn = screen.getByRole('button', { name: t(s.labelKey) });
      expect(btn).toBeTruthy();
      // The brief explains the stages; the buttons are what actually sets one.
      expect(brief().contains(btn)).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: t(CAREER_STAGES[0].labelKey) }));
    expect(onPick).toHaveBeenCalledWith(CAREER_STAGES[0].k);
  });

  it('keeps the skip', () => {
    const onSkip = vi.fn();
    mount({ onSkip });

    fireEvent.click(screen.getByRole('button', { name: t('ariaStudio.chat.careerStage.skip') }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('shows the illustration, hidden from assistive tech', () => {
    mount();

    const art = screen.getByTestId('section-art-career-stage');
    expect(art.getAttribute('aria-hidden')).toBe('true');
  });
});
