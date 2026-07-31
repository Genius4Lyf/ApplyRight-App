import { describe, expect, it } from 'vitest';
import { CV_SECTIONS, getCompletionStatus } from './cvCompleteness';

const REQUIRED_CV = {
  personalInfo: { fullName: 'Ada Lovelace' },
  professionalSummary: 'Analytical engineer.',
  experience: [{ title: 'Engineer' }],
  education: [{ degree: 'BSc' }],
  skills: [{ name: 'Analysis' }],
  projects: [],
};

describe('getCompletionStatus', () => {
  it('treats projects as optional for completion and preview access', () => {
    const status = getCompletionStatus(REQUIRED_CV);

    expect(status.isComplete).toBe(true);
    expect(status.percent).toBe(100);
    expect(status.completedCount).toBe(5);
    expect(status.totalCount).toBe(5);
    expect(status.missing).not.toContain('Projects');
  });

  it('keeps projects in the section catalogue for surfaces that display them', () => {
    expect(CV_SECTIONS.find((section) => section.key === 'projects')).toMatchObject({
      optional: true,
    });
  });
});
