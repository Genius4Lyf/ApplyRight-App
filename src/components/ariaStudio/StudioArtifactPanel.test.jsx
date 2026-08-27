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

describe('Contact is not "in progress" because of an account prefill', () => {
  // Every new build session is seeded with the name/email/links from the user's ACCOUNT
  // before a single question is asked. The panel used to read that as work the user had
  // started, so Contact showed "In progress" on a session where nothing had happened yet.
  const freshBuild = {
    _id: 'd1',
    studioKind: 'build',
    // Exactly what studio build-start writes: profile details, nothing else.
    personalInfo: {
      fullName: 'Daniel Andikan Udofia',
      email: 'udofiadaniel07@gmail.com',
      linkedin: 'https://www.linkedin.com/in/daniel-udofia-271941254',
    },
    experience: [],
    projects: [],
    education: [],
    skills: [],
    professionalSummary: '',
    coachChats: { studio: [{ who: 'buildstart' }] },
  };

  const contactRow = () =>
    screen.getByText(i18n.t('ariaStudio.studioFlow.sections.contact')).closest('li');

  it('reads Not started before the user has been through the step', () => {
    mockCvData = freshBuild;
    render(<StudioArtifactPanel />);

    expect(contactRow().textContent).toContain(i18n.t('ariaStudio.studioArtifactPanel.notStarted'));
    expect(contactRow().textContent).not.toContain(
      i18n.t('ariaStudio.studioArtifactPanel.inProgress')
    );
  });

  it('does not claim to have captured details the user never gave', () => {
    mockCvData = freshBuild;
    render(<StudioArtifactPanel />);

    // Scoped to the Contact row — a fresh build has "nothing captured yet" under all six.
    expect(contactRow().textContent).toContain(
      i18n.t('ariaStudio.studioArtifactPanel.nothingCapturedYet')
    );
    expect(contactRow().textContent).not.toContain('udofiadaniel07@gmail.com');
  });

  it('turns Complete once the contact step is confirmed', () => {
    mockCvData = {
      ...freshBuild,
      coachChats: { studio: [{ who: 'buildstart' }, { who: 'contactdone' }] },
    };
    render(<StudioArtifactPanel />);

    expect(contactRow().textContent).toContain(i18n.t('ariaStudio.studioArtifactPanel.complete'));
  });

  it('shows the details once they are the user’s confirmed answer', () => {
    mockCvData = {
      ...freshBuild,
      coachChats: { studio: [{ who: 'buildstart' }, { who: 'contactdone' }] },
    };
    render(<StudioArtifactPanel />);

    expect(screen.getByText('Daniel Andikan Udofia')).toBeTruthy();
  });

  it('leaves a genuine in-progress section alone', () => {
    // Education is the one section that really can be part-way through: a certification
    // with no qualification yet counts as captured but not complete. The contact caveat
    // must not leak into it.
    mockCvData = {
      ...freshBuild,
      certifications: [{ name: 'AWS Cloud Practitioner' }],
    };
    render(<StudioArtifactPanel />);

    const row = screen.getByText(i18n.t('ariaStudio.studioFlow.sections.education')).closest('li');
    expect(row.textContent).toContain(i18n.t('ariaStudio.studioArtifactPanel.inProgress'));
  });
});
