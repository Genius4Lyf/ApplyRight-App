// @vitest-environment jsdom
//
// The skills section used to read the user's own words back to them: a CV saying
// "Plumber — fixed pipes" produced "fixing pipes", because every skill had to cite a line
// of the profile. These two components are what turns that into a conversation — Aria now
// brings what people in the user's OWN roles normally know, and ASKS.
//
// The safety property under test throughout: a role-typical skill is a QUESTION. It never
// reaches the CV until the user says they did it.
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SkillsCard from './SkillsCard';
import SkillsGenerationOptions, {
  SKILL_COUNTS,
  SKILL_COUNT_DEFAULT,
} from './SkillsGenerationOptions';
import i18n from '../../i18n';

const t = (key, opts) => i18n.t(key, opts);

const soldering = {
  name: 'Soldering copper joints',
  category: 'Pipework',
  reason: 'Standard for domestic plumbing installs.',
  question: 'Plumbers usually solder copper joints. Did you?',
  evidence: [],
  typicalFor: 'exp0',
  typicalForLabel: 'Plumber',
  evidenceStatus: 'plausible',
};

const proven = {
  name: 'Pipe repair',
  category: 'Pipework',
  reason: 'Demonstrated at Ace Ltd.',
  evidence: [
    { type: 'experience', refIndex: 0, sourceLabel: 'Plumber at Ace Ltd', snippet: 'Fixed pipes.' },
  ],
};

const renderCard = (props = {}) =>
  render(
    <SkillsCard
      reviewGroups={{
        mode: 'profile',
        core: [proven],
        additional: [],
        confirmation: [soldering],
        gaps: [],
      }}
      {...props}
    />
  );

afterEach(cleanup);

describe('a skill typical of the user’s role', () => {
  it('says which role it is typical of', () => {
    // Without this the skill appears from nowhere. "Typical for Plumber" is what lets
    // someone place it and judge it honestly.
    renderCard();

    expect(
      screen.getByText(t('cvBuilder.skillsCard.typicalFor', { role: 'Plumber' }))
    ).toBeTruthy();
    expect(screen.getByText(/Plumbers usually solder copper joints/)).toBeTruthy();
  });

  it('is NOT addable until the user says they did it', () => {
    const onAdd = vi.fn();
    renderCard({ onAdd });

    // Nothing is selected, so there is nothing to add — the question is genuinely a gate,
    // not a pre-ticked suggestion the user has to notice and remove.
    const add = screen.getByRole('button', { name: t('cvBuilder.skillsCard.addToCv') });
    expect(add.disabled).toBe(true);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('lands as self-confirmed, never as CV-proven, once they do', () => {
    // The distinction the whole design rests on: the user vouched for this, the CV did not.
    const onAdd = vi.fn();
    renderCard({ onAdd });

    fireEvent.click(
      screen.getByRole('button', { name: t('cvBuilder.skillsCard.confirmation.direct') })
    );
    fireEvent.click(
      screen.getByRole('button', { name: t('cvBuilder.skillsCard.addNToCv', { n: 1 }) })
    );

    const added = onAdd.mock.calls[0][0].find((row) => row.name === 'Soldering copper joints');
    expect(added).toBeTruthy();
    expect(added.explicitlyConfirmed).toBe(true);
    expect(added.confirmationStatus).toBe('direct');
  });

  it('remembers a "no" so it is not asked again', () => {
    const onDecline = vi.fn();
    renderCard({ onDecline });

    fireEvent.click(
      screen.getByRole('button', { name: t('cvBuilder.skillsCard.confirmation.no') })
    );

    expect(onDecline).toHaveBeenCalledWith([{ name: 'Soldering copper joints', level: 'never' }]);
  });

  it('treats "only encountered it" as an answer too', () => {
    // It is a softer no, but it is still a no: the question has been asked and settled.
    const onDecline = vi.fn();
    renderCard({ onDecline });

    fireEvent.click(
      screen.getByRole('button', { name: t('cvBuilder.skillsCard.confirmation.encountered') })
    );

    expect(onDecline).toHaveBeenCalledWith([
      { name: 'Soldering copper joints', level: 'encountered' },
    ]);
  });

  it('reports nothing when the user says yes', () => {
    const onDecline = vi.fn();
    renderCard({ onDecline });

    fireEvent.click(
      screen.getByRole('button', { name: t('cvBuilder.skillsCard.confirmation.direct') })
    );

    expect(onDecline).not.toHaveBeenCalled();
  });
});

describe('the generation controls', () => {
  it('offers 10/15/20 and stops there', () => {
    // 25 is deliberately absent: past twenty a skills section reads as keyword stuffing
    // and every weak entry dilutes the strong ones beside it.
    render(<SkillsGenerationOptions count={SKILL_COUNT_DEFAULT} modelId="gpt-4o-mini" />);

    expect(SKILL_COUNTS).toEqual([10, 15, 20]);
    SKILL_COUNTS.forEach((n) => expect(screen.getByText(String(n))).toBeTruthy());
    expect(screen.queryByText('25')).toBeNull();
  });

  it('marks 15 as the best fit and shows the current pick as pressed', () => {
    render(<SkillsGenerationOptions count={20} modelId="gpt-4o-mini" />);

    expect(
      screen.getByText(t('cvBuilder.askAria.bestFit')).closest('button').textContent
    ).toContain('15');
    expect(screen.getByText('20').closest('button').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('10').closest('button').getAttribute('aria-pressed')).toBe('false');
  });

  it('reports the pick', () => {
    const onCount = vi.fn();
    render(<SkillsGenerationOptions count={15} onCount={onCount} modelId="gpt-4o-mini" />);

    fireEvent.click(screen.getByText('20').closest('button'));
    expect(onCount).toHaveBeenCalledWith(20);
  });

  it('says plainly that the number is a ceiling', () => {
    // Otherwise a user who asks for 20 and gets 11 counts them and concludes it is broken.
    render(<SkillsGenerationOptions count={15} modelId="gpt-4o-mini" />);

    expect(screen.getByText(t('cvBuilder.skillsOptions.ceilingNote'))).toBeTruthy();
  });
});

describe('the second pass', () => {
  it('does not ask about a skill already on the CV', () => {
    // The server filters these too, but these groups can be a cached snapshot from
    // before the user added the skill — and being asked "did you do this?" about your
    // own CV is exactly the kind of thing that costs trust in the whole section.
    renderCard({ existingSkills: ['Soldering copper joints'] });

    expect(screen.queryByText(/Plumbers usually solder copper joints/)).toBeNull();
    expect(screen.queryByText(t('cvBuilder.skillsCard.needsConfirmation'))).toBeNull();
  });

  it('still asks about the ones they do not have', () => {
    renderCard({ existingSkills: ['Something else entirely'] });

    expect(screen.getByText(/Plumbers usually solder copper joints/)).toBeTruthy();
  });
});
