// @vitest-environment jsdom
//
// Uploading a CV into a Studio session.
//
// The claim under test is the FORK, not the file handling: once an import lands, what
// happens next is decided by the CV itself. A CV that covers enough opens the editable
// preview; one that doesn't gets said so plainly and continues as an ordinary build, with
// whatever sections DID come through already filled in. Getting that backwards would
// either lock someone out of a finished CV or hand them an editor over a half-empty one.
//
// Mounted against the REAL StudioChat and the REAL provider, and the session is restored
// from a seeded transcript — that IS the refresh path, and it puts each test directly on
// the state it is about.
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

vi.mock('../../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    studioRecompute: vi.fn().mockResolvedValue({ studioScan: null }),
    studioScan: vi.fn(),
    studioBuildStart: vi.fn(),
    studioUploadImport: vi.fn(),
    setNoTarget: vi.fn().mockResolvedValue({ noJd: null }),
    getJobKeywords: vi.fn(),
    studioBriefPreview: vi.fn(),
    studioTailorStart: vi.fn(),
    coachChat: vi.fn(),
    studioRewriteRole: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

vi.mock('sonner', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  toast.info = vi.fn();
  return { toast };
});

// The uploader is a file input plus an axios POST — neither is what this suite is about.
// Standing it in with a button that hands back a server payload keeps every test below
// aimed at the fork rather than at multipart plumbing.
vi.mock('../CVUploader', () => ({
  default: ({ onUploadSuccess }) => (
    <button type="button" onClick={() => onUploadSuccess(window.__IMPORT_RESULT__)}>
      stub-upload
    </button>
  ),
}));

// CreditGate reads a wallet hook and can render a paywall banner instead of its children.
// This suite is about what happens AFTER a successful import, so it passes through.
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

const mountStudio = async (draft) => {
  localStorage.setItem('ariaStudio:draftId', draft._id);
  CVService.getDraftById.mockResolvedValue(draft);
  render(
    <AriaStudioProvider>
      <Handle />
      <StudioChat />
    </AriaStudioProvider>
  );
  await waitFor(() => expect(ctx?.draftId).toBe(draft._id));
  return ctx;
};

const transcript = () => ctx?.cvData?.coachChats?.studio || [];
const markersOf = (who) => transcript().filter((m) => m.who === who);

// A build session that took the upload fork and has answered both opening questions —
// exactly where the upload card is asked for.
const awaitingUpload = () => ({
  _id: 'd1',
  title: 'CV for Field Operator',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  professionalSummary: '',
  experience: [],
  projects: [],
  education: [],
  skills: [],
  targetJob: { title: 'Field Operator', description: 'A long enough job description here.' },
  careerStage: 'grad',
  coachChats: {
    studio: [
      { who: 'buildintro' },
      { who: 'buildstart', draftId: 'd1' },
      { who: 'uploadintent' },
      { who: 'careerstage', stage: 'grad' },
      { who: 'buildjobdone' },
    ],
  },
});

// What comes back from a GOOD import: every required section covered.
const completeImport = () => ({
  draft: {
    ...awaitingUpload(),
    professionalSummary: 'Field operator with six years offshore.',
    experience: [{ _sortId: 'r1', title: 'Operator', description: '• Ran pressure tests' }],
    education: [{ _sortId: 'e1', degree: 'BSc', school: 'UNIBEN' }],
    skills: [{ name: 'Pressure control' }],
  },
  remainingCredits: 35,
  imported: { experience: 1, education: 1, projects: 0, skills: 1, summary: true },
});

// A THIN CV: roles and education came through, but no summary and no skills.
const thinImport = () => ({
  draft: {
    ...awaitingUpload(),
    experience: [{ _sortId: 'r1', title: 'Operator', description: '• Ran pressure tests' }],
    education: [{ _sortId: 'e1', degree: 'BSc', school: 'UNIBEN' }],
  },
  remainingCredits: 35,
  imported: { experience: 1, education: 1, projects: 0, skills: 0, summary: false },
});

const upload = () => fireEvent.click(screen.getByText('stub-upload'));

beforeEach(() => {
  ctx = null;
  localStorage.clear();
  vi.clearAllMocks();
  // jsdom has no scrollTo; the chat auto-scrolls on every message. Same stub the rest of
  // the StudioChat suites use.
  window.HTMLElement.prototype.scrollTo = () => {};
});

afterEach(() => {
  cleanup();
  delete window.__IMPORT_RESULT__;
});

// One step EARLIER: the job question is still on screen, not yet answered. This is the
// live path into the upload card, and it is a different code path from the seeded
// transcripts below — those restore the phase through derivePhase (the refresh path),
// while answering the question in-session jumps straight to a phase in code.
//
// Regression suite for a shipped bug: both job answers hardcoded a jump to the contact
// step, so anyone who reached the upload fork by actually using the app sailed straight
// past the upload card. Only a page reload revealed it. Every test in this block drives
// the real buttons.
const atJobQuestion = () => {
  const draft = awaitingUpload();
  draft.targetJob = {};
  draft.coachChats.studio = draft.coachChats.studio.filter((m) => m.who !== 'buildjobdone');
  return draft;
};

describe('reaching the upload card by answering the job question', () => {
  it('asks for the file after "not yet, build a stronger CV"', async () => {
    await mountStudio(atJobQuestion());

    fireEvent.click(await screen.findByText(i18n.t('ariaStudio.targetJobAsk.notYet')));

    expect(await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'))).toBeTruthy();
  });

  it('does not flash the question back while the answer is saving', async () => {
    // `advance` drops its "noting that down" label after 700ms and only THEN runs the
    // callback — which here is async. Without a busy flag held across the await, React
    // repaints mid-flight and the question the user just answered reappears for a beat
    // before the upload card arrives. Holding the save open pins that exact window.
    let releaseSave;
    CVService.setNoTarget.mockReturnValue(
      new Promise((resolve) => {
        releaseSave = resolve;
      })
    );

    await mountStudio(atJobQuestion());
    fireEvent.click(await screen.findByText(i18n.t('ariaStudio.targetJobAsk.notYet')));

    // Past the transition label, still waiting on the network.
    await new Promise((r) => setTimeout(r, 1000));
    expect(screen.queryByText(i18n.t('ariaStudio.targetJobAsk.areYouAiming'))).toBeNull();
    expect(screen.queryByText(i18n.t('ariaStudio.targetJobAsk.notYet'))).toBeNull();

    releaseSave({ noJd: null });
    expect(await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'))).toBeTruthy();
  });

  it('still goes to contact when the session never asked to upload', async () => {
    const scratch = atJobQuestion();
    scratch.coachChats.studio = scratch.coachChats.studio.filter((m) => m.who !== 'uploadintent');
    await mountStudio(scratch);

    fireEvent.click(await screen.findByText(i18n.t('ariaStudio.targetJobAsk.notYet')));

    await waitFor(() => expect(markersOf('buildjobdone').length).toBe(1));
    expect(screen.queryByText(i18n.t('ariaStudio.chat.upload.prompt'))).toBeNull();
  });

  it('does not re-ask for a file once one has been dealt with', async () => {
    // A user who declined the upload and then went back to change the job answer must not
    // be handed the card a second time.
    const draft = atJobQuestion();
    draft.coachChats.studio.push({ who: 'uploaddone', skipped: true });
    await mountStudio(draft);

    fireEvent.click(await screen.findByText(i18n.t('ariaStudio.targetJobAsk.notYet')));

    await waitFor(() => expect(markersOf('buildjobdone').length).toBe(1));
    expect(screen.queryByText(i18n.t('ariaStudio.chat.upload.prompt'))).toBeNull();
  });
});

describe('the Studio upload step', () => {
  it('asks for the file where the contact step would otherwise be', async () => {
    await mountStudio(awaitingUpload());

    expect(await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'))).toBeTruthy();
    // The contact form must NOT be up — that step comes after the file, not instead of it.
    expect(screen.queryByText(i18n.t('ariaStudio.chat.upload.typeInstead'))).toBeTruthy();
  });

  it('states the price before the file picker, not after it', async () => {
    await mountStudio(awaitingUpload());

    await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'));
    expect(
      screen.getAllByText(i18n.t('ariaStudio.buildRoadmap.uploadCost', { n: 15 })).length
    ).toBeGreaterThan(0);
  });

  it('opens the editor when the imported CV covers enough', async () => {
    window.__IMPORT_RESULT__ = completeImport();
    await mountStudio(awaitingUpload());
    await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'));

    upload();

    await waitFor(() => expect(markersOf('uploaddone').length).toBe(1));
    expect(markersOf('uploaddone')[0].enough).toBe(true);
    // The CV is bound, which is what unlocks StudioLivePreview's editor.
    await waitFor(() => expect(ctx.cvData.experience.length).toBe(1));
    expect(ctx.cvData.professionalSummary).toBeTruthy();
  });

  it('says what is missing and keeps building when the CV is short', async () => {
    window.__IMPORT_RESULT__ = thinImport();
    await mountStudio(awaitingUpload());
    await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'));

    upload();

    await waitFor(() => expect(markersOf('uploaddone').length).toBe(1));
    expect(markersOf('uploaddone')[0].enough).toBe(false);
    // The two sections that did NOT arrive are named — and the ones that did are not.
    // Aria's lines are typed out a character at a time, so this waits for the finished
    // sentence rather than whatever half of it has landed.
    const line = await screen.findByText(/Summary, Skills/);
    expect(line.textContent).not.toMatch(/Education/);
    expect(line.textContent).not.toMatch(/Experience/);
    // What DID come through is kept, not thrown away.
    expect(ctx.cvData.experience.length).toBe(1);
  });

  it('records what an import actually brought in', async () => {
    window.__IMPORT_RESULT__ = completeImport();
    await mountStudio(awaitingUpload());
    await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'));

    upload();

    // A paid import leaves a receipt the user can scroll back to.
    expect(await screen.findByText(i18n.t('ariaStudio.chat.upload.receipt'))).toBeTruthy();
    expect(markersOf('uploaddone')[0].imported.experience).toBe(1);
  });

  it('refreshes the credit balance from the server, not from a local guess', async () => {
    window.__IMPORT_RESULT__ = completeImport();
    const seen = [];
    const listener = (e) => seen.push(e.detail);
    window.addEventListener('credit_updated', listener);

    await mountStudio(awaitingUpload());
    await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'));
    upload();

    await waitFor(() => expect(seen).toContain(35));
    window.removeEventListener('credit_updated', listener);
  });

  it('does not strand a user who has no file to give', async () => {
    await mountStudio(awaitingUpload());
    await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'));

    fireEvent.click(screen.getByText(i18n.t('ariaStudio.chat.upload.typeInstead')));

    await waitFor(() => expect(markersOf('uploaddone').length).toBe(1));
    expect(markersOf('uploaddone')[0].skipped).toBe(true);
    // Nothing charged, nothing imported — and the upload card is gone for good.
    expect(CVService.studioUploadImport).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText(i18n.t('ariaStudio.chat.upload.prompt'))).toBeNull()
    );
  });

  it('does not lose the conversation when the server copy is behind', async () => {
    // The transcript autosave is DEBOUNCED, so the draft the import returns can carry an
    // older coachChats than the client is holding — here, one that predates the job
    // answer. Binding it must not take the conversation backwards: the markers are the
    // Studio's only memory of where the user is, and losing `uploadintent`/`buildjobdone`
    // would drop them back onto a step they already finished.
    const stale = completeImport();
    stale.draft.coachChats = { studio: [{ who: 'buildintro' }, { who: 'buildstart' }] };
    window.__IMPORT_RESULT__ = stale;

    await mountStudio(awaitingUpload());
    await screen.findByText(i18n.t('ariaStudio.chat.upload.prompt'));

    upload();

    await waitFor(() => expect(markersOf('uploaddone').length).toBe(1));
    expect(markersOf('uploadintent').length).toBe(1);
    expect(markersOf('buildjobdone').length).toBe(1);
    expect(markersOf('careerstage').length).toBe(1);
  });

  it('never asks for a file in an ordinary build session', async () => {
    const scratch = awaitingUpload();
    scratch.coachChats.studio = scratch.coachChats.studio.filter((m) => m.who !== 'uploadintent');
    await mountStudio(scratch);

    await waitFor(() => expect(ctx?.cvData?._id).toBe('d1'));
    expect(screen.queryByText(i18n.t('ariaStudio.chat.upload.prompt'))).toBeNull();
  });
});
