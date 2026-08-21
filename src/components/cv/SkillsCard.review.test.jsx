// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
