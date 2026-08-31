// @vitest-environment jsdom
//
// "Prepare me for an interview" — the job analysis, run inside the chat.
//
// What these tests hold is the SHAPE OF THE REQUEST and WHAT HAPPENS TO THE MONEY. The
// analysis is the only charged step in the flow, and it is charged against exactly one of
// two CV sources; getting either wrong means a user pays for an analysis of the wrong
// document, or pays twice for the same posting.
//
// Mounted against the REAL StudioChat and the REAL provider, driven the way a person
// drives it: pick a CV, type the job, read the result.
//
// AND UNDER STRICTMODE, because the app is (main.jsx). That is not ceremony: StrictMode
// invokes every effect twice on mount, and the restore path below shipped a bug that only
// existed under exactly that — the first pass consumed the id it needed and the second
// found nothing to do, leaving a reopened analysis stuck on an empty screen behind a
// locked composer. Tests that don't mount the way production mounts cannot see it.
import React, { StrictMode, useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';

import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

vi.mock('../../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn(),
    getMyDrafts: vi.fn().mockResolvedValue([]),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    studioRecompute: vi.fn().mockResolvedValue({ studioScan: null }),
    studioScan: vi.fn(),
    studioBuildStart: vi.fn(),
    studioUploadImport: vi.fn(),
    setNoTarget: vi.fn().mockResolvedValue({ noJd: null }),
    getJobKeywords: vi.fn().mockResolvedValue({ keywords: [] }),
    studioBriefPreview: vi.fn().mockResolvedValue({ brief: null }),
    studioTailorStart: vi.fn(),
    coachChat: vi.fn(),
    studioRewriteRole: vi.fn().mockResolvedValue({ rows: [] }),
    // The prep track's own calls.
    extractJob: vi.fn(),
    analyzeFit: vi.fn(),
    getApplication: vi.fn(),
    generateCoverLetter: vi.fn(),
    generateInterviewPrep: vi.fn(),
  },
}));

// StudioChat reads the cover-letter allowance off /billing/balance, and FitScoreCard
// posts feedback. Neither is what this suite is about.
vi.mock('../../services/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: {} }), post: vi.fn() },
}));

vi.mock('sonner', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  toast.info = vi.fn();
  toast.warning = vi.fn();
  return { toast };
});

// A file input plus a multipart POST — stood in with a button that hands back the server
// payload, so every test stays aimed at what the analysis is run against.
vi.mock('../CVUploader', () => ({
  default: ({ onUploadSuccess }) => (
    <button type="button" onClick={() => onUploadSuccess(window.__UPLOAD_RESULT__)}>
      stub-upload
    </button>
  ),
}));

vi.mock('../CreditGate', () => ({
  default: ({ children }) => <>{children}</>,
}));

import CVService from '../../services/cv.service';

let ctx = null;
const Handle = () => {
  const api = useAriaStudio();
  useEffect(() => {
    ctx = api;
  });
  return null;
};

// Keyed on sessionNonce exactly as the page does (AriaStudio.jsx). That key is what makes
// a new session REMOUNT the chat — without it the chat never re-reads pendingKind and a
// "new prep session" would silently stay on whatever step it was already showing.
const Desk = () => {
  const { sessionNonce } = useAriaStudio();
  return <StudioChat key={sessionNonce} />;
};

// The whole tree, mounted the way main.jsx mounts it.
const renderStudio = () =>
  render(
    <StrictMode>
      <AriaStudioProvider>
        <Handle />
        <Desk />
      </AriaStudioProvider>
    </StrictMode>
  );

const ANALYSIS = {
  applicationId: 'a1',
  fitScore: 61,
  fitAnalysis: { overallFeedback: 'Solid.', recommendation: 'good_match' },
  actionPlan: [],
  job: { title: 'Rig Electrician', company: 'Seadrill' },
  remainingCredits: 40,
};

const SAVED_CV = { _id: 'd1', title: 'Ernest CV', personalInfo: { fullName: 'Ernest' } };

// Start a prep session the way the rail does, and wait for the CV step to land.
const startPrep = async () => {
  renderStudio();
  await waitFor(() => expect(ctx).toBeTruthy());
  await ctx.newSession('prep');
  await screen.findByText(SAVED_CV.title);
};

// In a prep session the submit button SPENDS CREDITS, so it is labelled for what it does
// ("Analyze · 10 cr") rather than "Add". Matched loosely so a price change doesn't break
// every test in the file.
const ANALYZE = /analyze/i;

// Fill the job form and submit it. The ids are the form's own, so this drives the same
// inputs a person types into rather than a test-only seam.
const captureJob = async (container, { title = 'Rig Electrician', description } = {}) => {
  const jd = description ?? 'Offshore electrical maintenance on a jack-up rig, 5 years.';
  fireEvent.change(container.querySelector('#studio-job-title'), { target: { value: title } });
  fireEvent.change(container.querySelector('#studio-job-description'), {
    target: { value: jd },
  });
  fireEvent.click(screen.getByRole('button', { name: ANALYZE }));
};

beforeEach(() => {
  // jsdom has no scrollTo; the chat auto-scrolls on every message. Same stub the rest of
  // the StudioChat suites use.
  window.HTMLElement.prototype.scrollTo = () => {};
  localStorage.clear();
  ctx = null;
  vi.clearAllMocks();
  CVService.getMyDrafts.mockResolvedValue([SAVED_CV]);
  CVService.extractJob.mockResolvedValue({ _id: 'job1', title: 'Rig Electrician' });
  CVService.analyzeFit.mockResolvedValue(ANALYSIS);
});

afterEach(() => {
  cleanup();
});

describe('the analysis is run against exactly one CV', () => {
  it('sends draftCVId for a CV picked off the profile', async () => {
    await startPrep();
    fireEvent.click(screen.getByText(SAVED_CV.title));

    await screen.findByRole('button', { name: ANALYZE });
    await captureJob(document);

    await waitFor(() => expect(CVService.analyzeFit).toHaveBeenCalledTimes(1));
    expect(CVService.analyzeFit).toHaveBeenCalledWith({ jobId: 'job1', draftCVId: 'd1' });
    // Never both: the server picks its source from whichever id it is handed.
    expect(CVService.analyzeFit.mock.calls[0][0].resumeId).toBeUndefined();
  });

  it('sends resumeId for an uploaded CV, and creates no draft on the way', async () => {
    window.__UPLOAD_RESULT__ = { _id: 'r9', fileName: 'ernest-cv.pdf' };
    await startPrep();
    fireEvent.click(screen.getByText('stub-upload'));

    await screen.findByRole('button', { name: ANALYZE });
    await captureJob(document);

    await waitFor(() => expect(CVService.analyzeFit).toHaveBeenCalledTimes(1));
    expect(CVService.analyzeFit).toHaveBeenCalledWith({ jobId: 'job1', resumeId: 'r9' });
    // The whole point of the cheap upload: nothing is created until the user asks for it.
    expect(CVService.studioUploadImport).not.toHaveBeenCalled();
    expect(CVService.studioBuildStart).not.toHaveBeenCalled();
  });
});

describe('while the analysis runs', () => {
  it('says what it is doing, rather than leaving a dead screen', async () => {
    // Several seconds of nothing reads as a hang. The narration is the passes the server
    // genuinely makes, so it informs rather than just spins.
    let resolve;
    CVService.analyzeFit.mockReturnValue(new Promise((r) => (resolve = r)));

    await startPrep();
    fireEvent.click(screen.getByText(SAVED_CV.title));
    await screen.findByRole('button', { name: ANALYZE });
    await captureJob(document);

    expect(await screen.findByText(/Reading your CV/i)).toBeTruthy();
    // The form goes — nothing on it is actionable while a charged call is in flight.
    // `waitFor` because the outgoing card collapses into Aria's orbit on the way out
    // (AriaCard's portal exit), so it is still in the DOM for a beat after the new one
    // arrives. That overlap is the motion language, not a bug.
    await waitFor(() => expect(document.querySelector('#studio-job-description')).toBeNull());

    resolve(ANALYSIS);
    await waitFor(() => expect(screen.queryByText(/Reading your CV/i)).toBeNull());
  });

  it('names the price on the button that spends it', async () => {
    await startPrep();
    fireEvent.click(screen.getByText(SAVED_CV.title));

    const button = await screen.findByRole('button', { name: ANALYZE });
    // A button that costs credits and doesn't say so is the one thing a credit UI must
    // never ship.
    expect(button.textContent).toMatch(/\d+\s*cr/i);
  });
});

describe('the charged step', () => {
  it('charges once and broadcasts the new balance', async () => {
    const events = [];
    const listener = (e) => events.push(e.detail);
    window.addEventListener('credit_updated', listener);

    await startPrep();
    fireEvent.click(screen.getByText(SAVED_CV.title));
    await screen.findByRole('button', { name: ANALYZE });
    await captureJob(document);

    await waitFor(() => expect(CVService.analyzeFit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(events).toContain(40));
    window.removeEventListener('credit_updated', listener);
  });

  it('returns to the job form when credits run short, with nothing lost', async () => {
    CVService.analyzeFit.mockRejectedValue({
      response: { status: 403, data: { code: 'INSUFFICIENT_CREDITS' } },
    });

    await startPrep();
    fireEvent.click(screen.getByText(SAVED_CV.title));
    await screen.findByRole('button', { name: ANALYZE });
    await captureJob(document);

    // The form is back — a failed analysis must not strand anyone on a dead step.
    await waitFor(() => expect(screen.getByRole('button', { name: ANALYZE })).toBeTruthy());
    expect(ctx.applicationId).toBeNull();
  });
});

describe('a job read from a link', () => {
  // Reaching the link input: a prep session, a CV chosen, the job form open.
  const openJobForm = async () => {
    await startPrep();
    fireEvent.click(screen.getByText(SAVED_CV.title));
    await screen.findByRole('button', { name: ANALYZE });
  };

  // The card holds Aria's reading on screen for a beat even when the request was instant
  // (MIN_READING_MS), so this waits for the SUMMARY rather than for the request — clicking
  // on before it lands would hit the form's own Add.
  const readLink = async (job) => {
    fireEvent.change(document.querySelector('#studio-job-link'), {
      target: { value: 'https://example.com/jobs/1' },
    });
    CVService.extractJob.mockResolvedValue(job);
    fireEvent.click(screen.getByRole('button', { name: 'Read it' }));
    await waitFor(() => expect(CVService.extractJob).toHaveBeenCalledTimes(1));
    await screen.findByText(/What I found/i, {}, { timeout: 3000 });
  };

  const FULL_JOB = {
    _id: 'joblink',
    title: 'Rig Electrician',
    company: 'Seadrill',
    description: 'Offshore electrical maintenance on a jack-up rig, 5 years of it.',
    descriptionQuality: 'full',
    details: { location: 'Lagos, NG', salary: 'NGN 400,000–600,000 per MONTH' },
  };

  it('is not extracted a second time on submit', async () => {
    // A full read already created the Job. Extracting again would scrape the same posting
    // twice and leave a duplicate record behind.
    await openJobForm();
    await readLink(FULL_JOB);

    fireEvent.click(screen.getByRole('button', { name: ANALYZE }));

    await waitFor(() => expect(CVService.analyzeFit).toHaveBeenCalledTimes(1));
    expect(CVService.extractJob).toHaveBeenCalledTimes(1);
    expect(CVService.analyzeFit).toHaveBeenCalledWith({ jobId: 'joblink', draftCVId: 'd1' });
  });

  it('shows what the posting said about itself', async () => {
    await openJobForm();
    await readLink(FULL_JOB);

    // The proof the read worked — and the facts someone would otherwise scroll to find.
    expect(await screen.findByText('Lagos, NG')).toBeTruthy();
    expect(screen.getByText('NGN 400,000–600,000 per MONTH')).toBeTruthy();
  });

  it('offers a way forward when the link only yielded a summary', async () => {
    await openJobForm();
    await readLink({ ...FULL_JOB, descriptionQuality: 'teaser' });

    // Not an apology — two ways on. Either gets the user to the same place.
    expect(screen.getByText(/Only part of it came through/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /open the posting/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /generate a typical role profile/i })).toBeTruthy();
  });

  it('does NOT let a summary carry the Job id into the analysis', async () => {
    // The bug this exists to prevent: analysing a two-line blurb as though it were the
    // job description, against a stored record that says otherwise.
    await openJobForm();
    await readLink({ ...FULL_JOB, descriptionQuality: 'teaser' });

    CVService.extractJob.mockResolvedValue({ _id: 'jobretyped', title: 'Rig Electrician' });
    fireEvent.click(screen.getByRole('button', { name: ANALYZE }));

    await waitFor(() => expect(CVService.analyzeFit).toHaveBeenCalledTimes(1));
    // Re-extracted from the text actually on screen, so the stored Job matches what was
    // analysed.
    expect(CVService.extractJob).toHaveBeenCalledTimes(2);
    expect(CVService.analyzeFit).toHaveBeenCalledWith({ jobId: 'jobretyped', draftCVId: 'd1' });
  });

  it('guides rather than dead-ends when the page could not be read at all', async () => {
    await openJobForm();
    fireEvent.change(document.querySelector('#studio-job-link'), {
      target: { value: 'https://linkedin.com/jobs/1' },
    });
    CVService.extractJob.mockRejectedValue({ response: { status: 403 } });
    fireEvent.click(screen.getByRole('button', { name: 'Read it' }));

    expect(await screen.findByText(/couldn't read that page/i, {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByRole('link', { name: /open the posting/i })).toBeTruthy();
  });
});

describe('building a CV from the result', () => {
  it('carries the job into the new session so it is never asked for twice', async () => {
    CVService.studioBuildStart.mockResolvedValue({
      draftId: 'd2',
      draft: { _id: 'd2', studioKind: 'build' },
      brief: null,
    });

    await startPrep();
    fireEvent.click(screen.getByText(SAVED_CV.title));
    await screen.findByRole('button', { name: ANALYZE });
    await captureJob(document);

    // The result, and its first action.
    const start = await screen.findByRole('button', { name: 'Start' });
    fireEvent.click(start);

    // The build session opens on its roadmap; accepting it is what creates the draft.
    const begin = await screen.findByRole('button', { name: 'Start building' });
    fireEvent.click(begin);

    await waitFor(() => expect(CVService.studioBuildStart).toHaveBeenCalledTimes(1));
    expect(CVService.studioBuildStart.mock.calls[0][0]).toMatchObject({
      jobTitle: 'Rig Electrician',
      jobDescription: 'Offshore electrical maintenance on a jack-up rig, 5 years.',
    });
  });
});

// ─── Getting an analysis back on screen ───
//
// The bug these exist for: the transcript survives a refresh (it lives in localStorage
// before a draft exists) but `prepApp` is component state and did not — so the flow
// derived its way to the results step and then rendered NOTHING, because it had no
// analysis to render. From the outside that looks exactly like the work being lost.
describe('an analysis already in play', () => {
  const RESULT_TRANSCRIPT = [
    { who: 'prepstart' },
    { who: 'prepcv', title: 'Ernest CV' },
    { who: 'prepjob', jobTitle: 'Rig Electrician', jobDescription: 'Offshore work.' },
    { who: 'prepresult', applicationId: 'a1', jobTitle: 'Rig Electrician', company: 'Seadrill' },
  ];

  const STORED_APPLICATION = {
    _id: 'a1',
    fitScore: 61,
    fitAnalysis: { overallFeedback: 'Solid.', recommendation: 'good_match' },
    actionPlan: [],
    jobId: { title: 'Rig Electrician', company: 'Seadrill', description: 'Offshore work.' },
    draftCVId: 'd1',
  };

  // Mount the way a RELOAD does: no declared kind, the transcript already in localStorage.
  const mountAfterRefresh = () => {
    localStorage.setItem('ariaStudio:session', JSON.stringify(RESULT_TRANSCRIPT));
    renderStudio();
  };

  beforeEach(() => {
    CVService.getApplication.mockResolvedValue(STORED_APPLICATION);
  });

  it('comes back after a refresh, instead of leaving an empty results step', async () => {
    mountAfterRefresh();

    // Fetched from the id on the transcript's own marker — the one that matches the
    // conversation being shown.
    await waitFor(() => expect(CVService.getApplication).toHaveBeenCalledWith('a1'));
    expect(await screen.findByText(/What next/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /start/i })).toBeTruthy();
  });

  it('keeps the transcript it restored rather than rewriting it', async () => {
    // A refresh already has the conversation. Replacing it would throw away the user's own
    // history to say the same thing back to them.
    mountAfterRefresh();
    await screen.findByText(/What next/i);

    const rebuilt = JSON.parse(localStorage.getItem('ariaStudio:session') || '[]');
    expect(rebuilt.filter((m) => m.who === 'prepresult')).toHaveLength(1);
    expect(rebuilt.some((m) => m.who === 'prepcv' && m.title === 'Ernest CV')).toBe(true);
  });

  it('reopens from Recents, rebuilding the conversation from the record', async () => {
    renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.openApplication('a1');

    await waitFor(() => expect(CVService.getApplication).toHaveBeenCalledWith('a1'));
    expect(await screen.findByText(/What next/i)).toBeTruthy();
    // Rebuilt, not restored: there is no saved transcript for a prep session to restore.
    expect(screen.getByText('Rig Electrician')).toBeTruthy();
  });

  it('lands somewhere usable when the analysis is gone', async () => {
    // Deleted elsewhere, or a network blip. A results step with no result is a dead end.
    CVService.getApplication.mockRejectedValue({ response: { status: 404 } });
    mountAfterRefresh();

    // It has to have TRIED — otherwise this test would pass just as well against the bug
    // it exists to catch, where nothing was ever fetched.
    await waitFor(() => expect(CVService.getApplication).toHaveBeenCalledWith('a1'));
    // Back to the CV step, which is a place you can act from.
    expect(await screen.findByText(SAVED_CV.title)).toBeTruthy();
    expect(ctx.applicationId).toBeNull();
  });
});

describe('the composer', () => {
  // Queried by placeholder, not by role: the job step's own title and description fields
  // are textboxes too, and this has to tell the chat's input apart from the form's.
  const composer = () => screen.queryByPlaceholderText(/use the card above|ask aria/i);

  it('is absent for the whole prep session', async () => {
    const { container } = renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.newSession('prep');
    await screen.findByText(SAVED_CV.title);

    // Step one: pick a CV. Nothing to type.
    expect(composer()).toBeNull();

    fireEvent.click(screen.getByText(SAVED_CV.title));
    await waitFor(() => expect(container.querySelector('#studio-job-title')).toBeTruthy());
    expect(composer()).toBeNull();

    await captureJob(container);

    // …and the results, where the three actions are cards too.
    await screen.findByText(/What next/i);
    expect(composer()).toBeNull();
  });

  it('is still there in a build session', async () => {
    // The guard. A prep session is the exception, not the new rule — take the composer
    // away from a build and Aria has no way to be spoken to at all.
    renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.newSession('build');

    await waitFor(() => expect(composer()).toBeTruthy());
  });
});
