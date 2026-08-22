// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import TargetJobStrip from './TargetJobStrip';

let mockCvData;
let mockUpdateTargetJob;
let mockStudioPhase;

vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    draftId: mockCvData?._id || null,
    studioPhase: mockStudioPhase,
    updateTargetJob: mockUpdateTargetJob,
  }),
}));

const toastCalls = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastCalls }));

afterEach(cleanup);

beforeEach(() => {
  i18n.changeLanguage('en');
  mockCvData = {
    _id: 'draft-1',
    targetJob: {
      title: 'Wireline Field Operator',
      description: 'Prepare equipment and support safe wireline operations at the rig.',
      brief: { role: 'Wireline Field Operator' },
    },
  };
  mockUpdateTargetJob = vi.fn().mockResolvedValue({ ok: true, changed: true });
  mockStudioPhase = 'build:brief';
  toastCalls.success.mockClear();
});

describe('TargetJobStrip', () => {
  it('keeps the target job distinct and opens a prefilled editor', () => {
    render(<TargetJobStrip model="gpt-4o-mini" />);

    expect(screen.getByText('Wireline Field Operator')).toBeTruthy();
    expect(screen.getByText('JD added')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByLabelText('Target role').value).toBe('Wireline Field Operator');
    expect(screen.getByLabelText('Job description').value).toContain('Prepare equipment');
  });

  it('saves through the coordinated target-job writer', async () => {
    render(<TargetJobStrip model="claude-sonnet-5" />);
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.change(screen.getByLabelText('Target role'), {
      target: { value: 'Senior Wireline Operator' },
    });
    fireEvent.change(screen.getByLabelText('Job description'), {
      target: {
        value:
          'Seeking a senior wireline operator with pressure-control, reporting, and Excel experience.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /save and reread/i }));

    await waitFor(() => expect(mockUpdateTargetJob).toHaveBeenCalledTimes(1));
    expect(mockUpdateTargetJob).toHaveBeenCalledWith({
      jobTitle: 'Senior Wireline Operator',
      jobDescription:
        'Seeking a senior wireline operator with pressure-control, reporting, and Excel experience.',
      model: 'claude-sonnet-5',
    });
    await waitFor(() => expect(toastCalls.success).toHaveBeenCalled());
  });

  it('becomes an Add JD action when the draft has no job description', () => {
    mockCvData = { _id: 'draft-1', targetJob: { title: 'Field Operator', description: '' } };
    render(<TargetJobStrip model="gpt-4o-mini" />);

    expect(screen.getByText('No job description')).toBeTruthy();
    expect(screen.getByRole('button', { name: /add jd/i })).toBeTruthy();
  });

  it('stays hidden until the target-job card has been completed', () => {
    mockCvData = { _id: 'draft-1', targetJob: {} };
    mockStudioPhase = 'build:job';
    const { container } = render(<TargetJobStrip model="gpt-4o-mini" />);

    expect(container.firstChild).toBeNull();
  });

  it.each(['build:experience', 'build:project', 'build:project-ideas'])(
    'hides during the active %s workflow',
    (phase) => {
      mockStudioPhase = phase;
      const { container } = render(<TargetJobStrip model="gpt-4o-mini" />);

      expect(container.firstChild).toBeNull();
    }
  );
});
