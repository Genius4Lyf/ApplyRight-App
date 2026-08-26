// @vitest-environment jsdom
//
// A gap chip whose hunt has already been answered must stop offering another one.
//
// These review groups are a snapshot from the last skills generation, so they know
// nothing about a hunt run since. Without this the chip a user has just answered still
// reads "Look for this" — and on a DECLINE that means re-asking a question they answered
// with a clear no, which is the one promise the whole hunt mechanism makes.
//
// A DEFERRED hunt is different: nothing was proven, so trying again is legitimate and
// the offer stays.
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SkillsCard from './SkillsCard';
import i18n from '../../i18n';

afterEach(cleanup);

const GAPS = {
  mode: 'job',
  core: [],
  additional: [],
  confirmation: [],
  gaps: [{ name: 'Yardi Voyager', requirementId: 'req_a' }],
};

const LOOK = () => i18n.t('cvBuilder.skillsCard.lookElsewhere');

describe('SkillsCard — a settled hunt closes its gap chip', () => {
  it('offers the hunt while the requirement is unanswered', () => {
    render(<SkillsCard reviewGroups={GAPS} onProveSkill={vi.fn()} />);
    expect(screen.getByText(LOOK())).toBeTruthy();
  });

  it('stops offering it — and says so — once the user has said no', () => {
    const onProveSkill = vi.fn();
    render(
      <SkillsCard
        reviewGroups={GAPS}
        onProveSkill={onProveSkill}
        huntedRequirements={{ req_a: 'declined' }}
      />
    );

    expect(screen.queryByText(LOOK())).toBeNull();
    expect(screen.getByText(i18n.t('cvBuilder.skillsCard.hunted.declined'))).toBeTruthy();
    // The requirement itself stays visible — it is still an honest gap.
    expect(screen.getByText(/Yardi Voyager/)).toBeTruthy();
  });

  it('stops offering it once the hunt CONFIRMED it', () => {
    render(
      <SkillsCard
        reviewGroups={GAPS}
        onProveSkill={vi.fn()}
        huntedRequirements={{ req_a: 'confirmed' }}
      />
    );

    expect(screen.queryByText(LOOK())).toBeNull();
    expect(screen.getByText(i18n.t('cvBuilder.skillsCard.hunted.confirmed'))).toBeTruthy();
  });

  it('KEEPS the offer when the hunt was deferred — nothing was proven', () => {
    const onProveSkill = vi.fn();
    render(
      <SkillsCard
        reviewGroups={GAPS}
        onProveSkill={onProveSkill}
        huntedRequirements={{ req_a: 'deferred' }}
      />
    );

    fireEvent.click(screen.getByText(LOOK()));
    expect(onProveSkill).toHaveBeenCalledWith('req_a', 'Yardi Voyager');
  });

  it('only settles the requirement that was actually answered', () => {
    const two = {
      ...GAPS,
      gaps: [
        { name: 'Yardi Voyager', requirementId: 'req_a' },
        { name: 'Budget forecasting', requirementId: 'req_b' },
      ],
    };
    render(
      <SkillsCard
        reviewGroups={two}
        onProveSkill={vi.fn()}
        huntedRequirements={{ req_a: 'declined' }}
      />
    );

    // One chip settled, the other still open.
    expect(screen.getAllByText(LOOK())).toHaveLength(1);
  });

  it('is unchanged on a surface with no chat to host a hunt', () => {
    render(<SkillsCard reviewGroups={GAPS} huntedRequirements={{}} />);
    expect(screen.queryByText(LOOK())).toBeNull();
    expect(screen.getByText(/Yardi Voyager/)).toBeTruthy();
  });
});
