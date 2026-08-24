// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import EntryCaptureCard from './EntryCaptureCard';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(cleanup);

describe('EntryCaptureCard — experience', () => {
  it('renders title, company and dates together on one card', () => {
    render(<EntryCaptureCard section="experience" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Role')).toBeTruthy();
    expect(screen.getByLabelText('Company')).toBeTruthy();
    expect(screen.getByLabelText('Started')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'I still work here' })).toBeTruthy();
    // Achievements is a separate, AI-mediated step — not on this card.
    expect(screen.queryByLabelText('Achievements')).toBeNull();
  });

  it('blocks submit until title, company and a start date are all filled', () => {
    render(<EntryCaptureCard section="experience" onSubmit={vi.fn()} />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Field Engineer' } });
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Baker Hughes' } });
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Started'), { target: { value: 'Mar 2021' } });
    expect(save.disabled).toBe(false);
  });

  it('submits every scalar field in ONE call', () => {
    const onSubmit = vi.fn();
    render(<EntryCaptureCard section="experience" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Field Engineer' } });
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Baker Hughes' } });
    fireEvent.change(screen.getByLabelText('Started'), { target: { value: 'Mar 2021' } });
    fireEvent.change(screen.getByLabelText('Ended'), { target: { value: 'Aug 2024' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Field Engineer',
      company: 'Baker Hughes',
      startDate: 'Mar 2021',
      endDate: 'Aug 2024',
      isCurrent: false,
    });
  });

  it('clears the end date and sends isCurrent when "still work here" is checked', () => {
    const onSubmit = vi.fn();
    render(<EntryCaptureCard section="experience" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Field Engineer' } });
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Baker Hughes' } });
    fireEvent.change(screen.getByLabelText('Started'), { target: { value: 'Mar 2021' } });
    fireEvent.change(screen.getByLabelText('Ended'), { target: { value: 'Aug 2024' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'I still work here' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ endDate: '', isCurrent: true })
    );
  });

  it('seeds from an entry already partly captured under the old per-field flow', () => {
    render(
      <EntryCaptureCard
        section="experience"
        entry={{ _sortId: 'a', title: 'Field Engineer', company: '', startDate: '' }}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Role').value).toBe('Field Engineer');
    expect(screen.getByLabelText('Company').value).toBe('');
  });
});

describe('EntryCaptureCard — project', () => {
  it('renders title and an optional link field', () => {
    render(<EntryCaptureCard section="project" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Project')).toBeTruthy();
    expect(screen.getByLabelText('Link (Optional)')).toBeTruthy();
  });

  it('allows submit with the link left blank', () => {
    const onSubmit = vi.fn();
    render(<EntryCaptureCard section="project" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'Notes engine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Notes engine', link: '' });
  });

  it('auto-prepends https:// to a bare domain on blur', () => {
    render(<EntryCaptureCard section="project" onSubmit={vi.fn()} />);
    const link = screen.getByLabelText('Link (Optional)');

    fireEvent.change(link, { target: { value: 'github.com/ada/notes' } });
    fireEvent.blur(link);

    expect(link.value).toBe('https://github.com/ada/notes');
  });

  it('does not double-prepend a link that already has a protocol', () => {
    const onSubmit = vi.fn();
    render(<EntryCaptureCard section="project" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'Notes engine' } });
    fireEvent.change(screen.getByLabelText('Link (Optional)'), {
      target: { value: 'https://notes.app' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Notes engine', link: 'https://notes.app' });
  });
});

describe('EntryCaptureCard — education', () => {
  it('renders degree, school, graduation date and an optional CGPA field', () => {
    render(<EntryCaptureCard section="education" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Qualification')).toBeTruthy();
    expect(screen.getByLabelText('School')).toBeTruthy();
    expect(screen.getByLabelText('Finished')).toBeTruthy();
    expect(screen.getByLabelText('CGPA / Grade')).toBeTruthy();
  });

  it('blocks submit until degree, school and graduation date are filled, CGPA excluded', () => {
    render(<EntryCaptureCard section="education" onSubmit={vi.fn()} />);
    const save = screen.getByRole('button', { name: 'Save' });

    fireEvent.change(screen.getByLabelText('Qualification'), {
      target: { value: 'BSc Computer Science' },
    });
    fireEvent.change(screen.getByLabelText('School'), {
      target: { value: 'University of Lagos' },
    });
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Finished'), { target: { value: '2019' } });
    expect(save.disabled).toBe(false);
  });

  it('allows submit with CGPA left blank, and includes it when filled', () => {
    const onSubmit = vi.fn();
    render(<EntryCaptureCard section="education" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Qualification'), {
      target: { value: 'BSc Computer Science' },
    });
    fireEvent.change(screen.getByLabelText('School'), {
      target: { value: 'University of Lagos' },
    });
    fireEvent.change(screen.getByLabelText('Finished'), { target: { value: '2019' } });
    fireEvent.change(screen.getByLabelText('CGPA / Grade'), { target: { value: '4.5/5.0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      degree: 'BSc Computer Science',
      school: 'University of Lagos',
      graduationDate: '2019',
      cgpa: '4.5/5.0',
    });
  });
});
