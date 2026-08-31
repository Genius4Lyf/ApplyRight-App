// @vitest-environment jsdom
//
// Pasting a job link is not "filling in a field" — it is asking Aria to go and read
// something, and the card follows that through: the fields give way to her reading, and
// what comes back is presented as a RECORD rather than a form you have to check.
//
// These tests pin the three views and, more importantly, the two honesty rules that ride
// on them: a partial read says so, and a read that failed leaves you somewhere you can
// still act.
import React, { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';

// Side-effect import: initialises the app's i18n so the card renders real English copy
// rather than raw keys. Same as the other Studio suites.
import '../../i18n';
import JobCaptureCard from './JobCaptureCard';

vi.mock('../../services/cv.service', () => ({
  default: { extractJob: vi.fn(), studioDraftJobDescription: vi.fn() },
}));

import CVService from '../../services/cv.service';

const FULL_JOB = {
  _id: 'job1',
  title: 'Rig Electrician',
  company: 'Seadrill',
  description:
    '**About the role**\n\nOffshore electrical maintenance on a jack-up rig.\n\n**Requirements**\n\n- 5 years offshore\n- CompEx certified',
  descriptionQuality: 'full',
  details: {
    location: 'Lagos, NG',
    salary: 'NGN 400,000–600,000 per MONTH',
    employmentType: 'FULL_TIME',
  },
};

// Mounted under StrictMode because the app is (main.jsx) — and because this card has
// already shipped one bug that existed ONLY there: a mounted-flag set false on cleanup and
// never back to true survived StrictMode's mount → cleanup → mount, so the reveal below
// decided the component had gone away and the card sat on Aria's reading forever.
const mount = (props = {}) =>
  render(
    <StrictMode>
      <JobCaptureCard allowLink onSubmit={vi.fn()} onCancel={vi.fn()} {...props} />
    </StrictMode>
  );

const pasteLink = (url = 'https://example.com/jobs/1') => {
  fireEvent.change(document.querySelector('#studio-job-link'), { target: { value: url } });
  fireEvent.click(screen.getByRole('button', { name: 'Read it' }));
};

// The card holds Aria's reading on screen for a beat even when the request was instant
// (MIN_READING_MS), so the summary arrives later than a default findBy* will wait.
const SETTLE = { timeout: 3000 };

// Wait for the summary view specifically, rather than for a control that also exists in
// the form — otherwise a test can click the form's own Add before the result lands.
const awaitSummary = () => screen.findByText(/What I found/i, {}, SETTLE);

const fields = () => ({
  title: document.querySelector('#studio-job-title'),
  description: document.querySelector('#studio-job-description'),
  link: document.querySelector('#studio-job-link'),
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('while Aria is reading', () => {
  it('replaces the fields with her, rather than leaving them editable', async () => {
    // An edit made mid-read would be silently overwritten by the arriving result. Taking
    // the fields away is the honest version of disabling them.
    let resolve;
    CVService.extractJob.mockReturnValue(new Promise((r) => (resolve = r)));

    mount();
    pasteLink();

    await screen.findByRole('status');
    expect(fields().title).toBeNull();
    expect(fields().description).toBeNull();
    expect(fields().link).toBeNull();

    resolve(FULL_JOB);
    await awaitSummary();
  });
});

describe('what came back', () => {
  beforeEach(() => {
    CVService.extractJob.mockResolvedValue(FULL_JOB);
  });

  it('is shown as a record — role, company, and what the posting stated', async () => {
    mount();
    pasteLink();

    await awaitSummary();
    expect(screen.getByText('Rig Electrician')).toBeTruthy();
    expect(screen.getByText('Seadrill')).toBeTruthy();
    expect(screen.getByText('Lagos, NG')).toBeTruthy();
    expect(screen.getByText('NGN 400,000–600,000 per MONTH')).toBeTruthy();
    expect(screen.getByText('FULL_TIME')).toBeTruthy();
    // The description reads, it doesn't ask to be filled in.
    expect(screen.getByText(/5 years offshore/)).toBeTruthy();
    expect(fields().description).toBeNull();
  });

  it('goes back to the fields on Edit, carrying everything it found', async () => {
    mount();
    pasteLink();
    await awaitSummary();
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    await waitFor(() => expect(fields().title).toBeTruthy());
    expect(fields().title.value).toBe('Rig Electrician');
    expect(fields().description.value).toContain('CompEx certified');
    // And the link input is back too, so a wrong posting can be re-read rather than
    // retyped.
    expect(fields().link).toBeTruthy();
  });

  it('submits the read posting with its Job id, so it is not extracted twice', async () => {
    const onSubmit = vi.fn();
    mount({ onSubmit });
    pasteLink();
    await awaitSummary();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ jobTitle: 'Rig Electrician', jdSource: 'url', jobId: 'job1' })
    );
  });
});

describe('when the link only yielded a summary', () => {
  beforeEach(() => {
    CVService.extractJob.mockResolvedValue({ ...FULL_JOB, descriptionQuality: 'teaser' });
  });

  it('still shows what it got, but says it is only part of it', async () => {
    mount();
    pasteLink();

    await awaitSummary();
    expect(screen.getByText('Rig Electrician')).toBeTruthy();
    expect(screen.getByText(/Only part of it came through/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /open the posting/i })).toBeTruthy();
  });

  it('does not let the summary carry the Job id into the analysis', async () => {
    // The bug this exists to prevent: an analysis run against a two-line blurb, against a
    // stored record that claims to be the posting.
    const onSubmit = vi.fn();
    mount({ onSubmit });
    pasteLink();
    await awaitSummary();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ jobId: null }));
  });
});

describe('when the page could not be read at all', () => {
  it('returns to the fields with a guide, not a summary of nothing', async () => {
    CVService.extractJob.mockRejectedValue({ response: { status: 403 } });

    mount();
    pasteLink('https://linkedin.com/jobs/1');

    expect(await screen.findByText(/couldn't read that page/i, {}, SETTLE)).toBeTruthy();
    // The fields are back, because pasting the description in is the way forward.
    expect(fields().description).toBeTruthy();
    expect(screen.getByRole('link', { name: /open the posting/i })).toBeTruthy();
  });
});

describe('without the link path', () => {
  it('is just the form — no link input, and no way to reach the other views', () => {
    mount({ allowLink: false });

    expect(fields().link).toBeNull();
    expect(fields().title).toBeTruthy();
    expect(fields().description).toBeTruthy();
  });
});
