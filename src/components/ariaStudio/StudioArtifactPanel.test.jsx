// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import StudioArtifactPanel from './StudioArtifactPanel';

let mockCvData = null;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({ cvData: mockCvData }),
}));

const completeBuild = {
  _id: 'd1',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace', email: 'ada@example.com' },
  experience: [{ _sortId: 'e1', title: 'Engineer', description: '• Built a system' }],
  projects: [{ _sortId: 'p1', title: 'Portfolio', description: '• Shipped it' }],
  education: [{ _sortId: 'ed1', degree: 'BSc', school: 'UNILAG' }],
  skills: ['JavaScript'],
  professionalSummary: 'Product-minded engineer.',
  coachChats: { studio: [{ who: 'contactdone' }] },
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockCvData = completeBuild;
});

afterEach(cleanup);

describe('StudioArtifactPanel completion action', () => {
  it('unlocks View CV at the bottom of CV Health after every build section is complete', () => {
    const onViewCv = vi.fn();
    render(<StudioArtifactPanel onViewCv={onViewCv} />);

    fireEvent.click(screen.getByRole('button', { name: 'View CV' }));
    expect(onViewCv).toHaveBeenCalledTimes(1);
  });

  it('keeps View CV locked until the build is complete', () => {
    mockCvData = { ...completeBuild, professionalSummary: '' };
    render(<StudioArtifactPanel onViewCv={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'View CV' })).toBeNull();
  });
});
