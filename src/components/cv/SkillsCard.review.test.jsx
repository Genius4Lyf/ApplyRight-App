// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SkillsCard from './SkillsCard';
import i18n from '../../i18n';

const proven = {
  name: 'Wireline Equipment',
  category: 'Operations',
  reason: 'Demonstrated while preparing equipment at SLB.',
  evidence: [
    {
      type: 'experience',
      refIndex: 0,
      sourceLabel: 'Wireline Operator at SLB',
      snippet: 'Prepared wireline equipment for field operations.',
    },
  ],
};

describe('SkillsCard evidence review', () => {
  it('replaces Best for this role with Core skills when there is no JD', () => {
    render(
      <SkillsCard
        reviewGroups={{
          mode: 'profile',
          core: [proven],
          additional: [],
          confirmation: [],
          gaps: [],
        }}
      />
    );

    expect(screen.getByText(i18n.t('cvBuilder.skillsCard.coreSkills'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('cvBuilder.skillsCard.bestForRole'))).toBeNull();
  });

  it('keeps JD gaps locked and makes a plausible skill addable only after confirmation', () => {
    const onAdd = vi.fn();
    render(
      <SkillsCard
        reviewGroups={{
          mode: 'job',
          important: [proven],
          additional: [],
          confirmation: [
            {
              name: 'Microsoft Excel',
              category: 'Tools & Software',
              reason: 'Your weekly reports make this reasonable to confirm.',
              evidence: [],
            },
          ],
          gaps: [{ name: 'Wireline Safety Certification' }],
        }}
        onAdd={onAdd}
      />
    );

    expect(screen.getByText('Wireline Safety Certification')).toBeTruthy();
    fireEvent.click(screen.getByText(i18n.t('cvBuilder.skillsCard.confirmation.direct')));
    fireEvent.click(screen.getByText(i18n.t('cvBuilder.skillsCard.addNToCv', { n: 1 })));

    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Microsoft Excel',
        explicitlyConfirmed: true,
        confirmationStatus: 'direct',
      }),
    ]);
  });
});

describe('SkillsCard — a gap chip opens the cross-history hunt', () => {
  const gapGroups = {
    mode: 'job',
    important: [],
    additional: [],
    confirmation: [],
    gaps: [
      {
        name: 'Triage',
        requirementId: 'req_triage',
        evidenceStatus: 'not_demonstrated',
        reason: 'The employer asks for this, but it is not demonstrated in your CV.',
      },
    ],
  };

  // This suite has no RTL auto-cleanup, and RTL's queries resolve against document.body
  // even when destructured from a render result — so without this an "it renders nothing"
  // assertion finds the PREVIOUS test's button and fails for entirely the wrong reason.
  afterEach(cleanup);

  // The dead end this opens up: the card used to say a gap "cannot be added from this
  // screen" and stop there — at the exact moment the user is most motivated to act.
  it('offers to look elsewhere, and hands back the requirement id', () => {
    const onProveSkill = vi.fn();
    const { getByText } = render(
      <SkillsCard reviewGroups={gapGroups} onProveSkill={onProveSkill} />
    );

    fireEvent.click(getByText(i18n.t('cvBuilder.skillsCard.lookElsewhere')));

    expect(onProveSkill).toHaveBeenCalledWith('req_triage', 'Triage');
    // The copy invites a search rather than declaring a dead end.
    expect(getByText(i18n.t('cvBuilder.skillsCard.gapsIntroHunt'))).toBeTruthy();
  });

  it('stays read-only on a surface with no chat to host the hunt', () => {
    const { getByText, queryByText } = render(<SkillsCard reviewGroups={gapGroups} />);

    expect(queryByText(i18n.t('cvBuilder.skillsCard.lookElsewhere'))).toBeNull();
    expect(getByText(i18n.t('cvBuilder.skillsCard.gapsIntro'))).toBeTruthy();
    // The gap itself is still shown either way — an honest gap is worth knowing about.
    expect(getByText('Triage')).toBeTruthy();
  });

  it('does not offer the hunt for a gap with no requirement to hunt for', () => {
    const onProveSkill = vi.fn();
    const { queryByText } = render(
      <SkillsCard
        reviewGroups={{
          ...gapGroups,
          gaps: [{ name: 'Triage', evidenceStatus: 'not_demonstrated' }],
        }}
        onProveSkill={onProveSkill}
      />
    );

    expect(queryByText(i18n.t('cvBuilder.skillsCard.lookElsewhere'))).toBeNull();
  });
});
