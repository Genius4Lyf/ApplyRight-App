// @vitest-environment jsdom
//
// Switching between the two kinds of session the Studio holds.
//
// `ariaStudio:session` is the PRE-DRAFT transcript home — where a conversation lives
// before there is a draft to hang it on. A prep session never gets a draft, so its
// transcript stays there for its whole life; a CV session's belongs on the draft, in
// `coachChats.studio`.
//
// Those two facts collided. Opening a CV seeded its chat from that shared key, so it came
// up showing the last ANALYSIS — and then, finding a thread it assumed was pre-draft,
// migrated it onto the CV and saved it. The conversation on that CV was gone.
//
// So this suite is less about the display than about ownership: a session shows its own
// transcript, and never writes anyone else's onto its document.
//
// UNDER STRICTMODE, because the app is (main.jsx) and the restore path is effect-driven.
import React, { StrictMode, useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';

import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

vi.mock('../../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn(),
    getMyDrafts: vi.fn().mockResolvedValue([]),
    listCvs: vi.fn().mockResolvedValue([]),
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
    extractJob: vi.fn(),
    analyzeFit: vi.fn(),
    getApplication: vi.fn(),
    generateCoverLetter: vi.fn(),
    generateInterviewPrep: vi.fn(),
  },
}));

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

vi.mock('../CVUploader', () => ({ default: () => null }));
vi.mock('../CreditGate', () => ({ default: ({ children }) => <>{children}</> }));

import CVService from '../../services/cv.service';

let ctx = null;
const Handle = () => {
  const api = useAriaStudio();
  useEffect(() => {
    ctx = api;
  });
  return null;
};

const Desk = () => {
  const { sessionNonce } = useAriaStudio();
  return <StudioChat key={sessionNonce} />;
};

const renderStudio = () =>
  render(
    <StrictMode>
      <AriaStudioProvider>
        <Handle />
        <Desk />
      </AriaStudioProvider>
    </StrictMode>
  );

// What a finished analysis leaves behind in the shared key: its conversation, ending in
// the marker that says which Application it belongs to.
const ANALYSIS_TRANSCRIPT = [
  { who: 'prepstart' },
  { who: 'prepcv', title: 'Ernest CV' },
  { who: 'aria', text: 'Analysis chatter that belongs to the job, not to any CV.' },
  {
    who: 'prepresult',
    applicationId: 'app-9',
    jobTitle: 'Field Operator',
    company: 'QatarEnergy LNG',
  },
];

// A CV session with a conversation of its OWN, saved on the draft where it belongs.
const CV_THREAD = [
  { who: 'you', text: 'Here is my work history.' },
  { who: 'aria', text: 'Noted — this line is the CV session talking.' },
];

const DRAFT = {
  _id: 'draft-1',
  title: "Daniel's CV",
  studioKind: 'build',
  personalInfo: { fullName: 'Daniel Udofia' },
  coachChats: { studio: CV_THREAD },
};

// The analysis leaves its transcript behind exactly as the running app does.
const leaveAnalysisBehind = () =>
  localStorage.setItem('ariaStudio:session', JSON.stringify(ANALYSIS_TRANSCRIPT));

beforeEach(() => {
  window.HTMLElement.prototype.scrollTo = () => {};
  localStorage.clear();
  ctx = null;
  vi.clearAllMocks();
  CVService.getDraftById.mockResolvedValue(DRAFT);
  CVService.saveDraft.mockResolvedValue(DRAFT);
});

afterEach(() => cleanup());

describe('opening a CV after an analysis', () => {
  it('shows the CV’s own conversation, not the analysis’s', async () => {
    leaveAnalysisBehind();
    renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.loadSession('draft-1');

    expect(await screen.findByText(/this line is the CV session talking/i)).toBeTruthy();
    expect(screen.queryByText(/belongs to the job, not to any CV/i)).toBeNull();
  });

  it('does not go fetching the analysis when you switch to it', async () => {
    // The spinning orbit. A stale `prepresult` marker in the shared key was read as
    // "restore this analysis" no matter which kind of session was being opened.
    //
    // Measured ACROSS the switch, not from zero: mounting cold with that transcript still
    // in place IS a prep session being restored, and restoring it is correct — that is
    // what a refresh mid-analysis has to do. The bug is the fetch that the switch to a CV
    // sets off.
    leaveAnalysisBehind();
    CVService.getApplication.mockResolvedValue({
      _id: 'app-9',
      jobId: { title: 'Field Operator' },
    });

    renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    const beforeSwitch = CVService.getApplication.mock.calls.length;

    await ctx.loadSession('draft-1');
    await screen.findByText(/this line is the CV session talking/i);

    expect(CVService.getApplication.mock.calls.length).toBe(beforeSwitch);
  });

  it('never writes the analysis onto the CV', async () => {
    // THE one that matters. The transcript was migrated onto the draft and autosaved, so
    // the CV's real conversation was overwritten on the server — no history, no recovery.
    leaveAnalysisBehind();
    renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.loadSession('draft-1');
    await screen.findByText(/this line is the CV session talking/i);

    // Give the debounced autosave every chance to fire.
    await new Promise((r) => setTimeout(r, 60));

    const wrote = CVService.saveDraft.mock.calls.map(([payload]) =>
      JSON.stringify(payload?.coachChats?.studio || [])
    );
    for (const written of wrote) {
      expect(written).not.toMatch(/belongs to the job, not to any CV/);
      expect(written).not.toMatch(/prepresult/);
    }
  });
});

// A draft that was ALREADY damaged, before the guards above existed: the analysis
// transcript is genuinely its saved thread now, so nothing about clean session-switching
// can help it. It has to be taken back off the document.
const DAMAGED_DRAFT = {
  _id: 'draft-2',
  title: "Daniel's CV",
  studioKind: 'build',
  // Content-complete on the shared rule (cvCompleteness): name, summary, experience,
  // education, skills. This is the reported case — a CV that was FINISHED.
  personalInfo: { fullName: 'Daniel Udofia' },
  professionalSummary: 'Recent graduate with foundational experience in electrical work.',
  experience: [{ title: 'Haulage Maintenance Officer', company: 'Matrix Energy' }],
  education: [{ school: 'University of Uyo' }],
  skills: ['Wiring design', 'Circuit assembly'],
  coachChats: { studio: ANALYSIS_TRANSCRIPT, target_job: [{ who: 'aria', text: 'Builder Q&A.' }] },
};

describe('a draft already carrying someone else’s analysis', () => {
  it('does not show it', async () => {
    CVService.getDraftById.mockResolvedValue(DAMAGED_DRAFT);
    renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.loadSession('draft-2');

    // Waited on a POSITIVE signal first. `waitFor` on an absence passes on its very first
    // tick — before the draft has even loaded — so it would hold whether or not anything
    // was repaired.
    await waitFor(() => expect(ctx.cvData?._id).toBe('draft-2'));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByText(/belongs to the job, not to any CV/i)).toBeNull();
    expect(screen.queryByText(/Field Operator/i)).toBeNull();
  });

  it('takes it off the record, so it is gone on every device and not just this one', async () => {
    // Repairing only the view would leave the damage on the draft, to be re-read forever
    // and re-sent to the next browser the user opens. The autosave writes the repair back.
    CVService.getDraftById.mockResolvedValue(DAMAGED_DRAFT);
    renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.loadSession('draft-2');

    await waitFor(
      () => {
        const wrote = CVService.saveDraft.mock.calls.find(
          ([payload]) => payload?._id === 'draft-2' && payload?.coachChats
        );
        expect(wrote).toBeTruthy();
        expect(wrote[0].coachChats.studio).toEqual([]);
        // The builder's own conversations are a different key on the same object and are
        // not this bug's business — a repair that dropped them would be a second one.
        expect(wrote[0].coachChats.target_job).toEqual([{ who: 'aria', text: 'Builder Q&A.' }]);
      },
      { timeout: 3000 }
    );
  });

  it('opens on the finished CV, not on "start building"', async () => {
    // The repair leaves the CV with no transcript, and the phase rules keyed the whole
    // build track off a `buildstart` MARKER — which the repair had just removed. So a
    // finished CV fell through to the mode chooser, and then to the roadmap, offering to
    // start building something that was already built. The rules read the DOCUMENT now.
    CVService.getDraftById.mockResolvedValue(DAMAGED_DRAFT);
    renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.loadSession('draft-2');

    await waitFor(() => expect(ctx.studioPhase).toBe('build:done'));
  });

  it('never paints the mode chooser on the way there', async () => {
    // The flicker. The phase used to be decided in an EFFECT, so the first paint showed
    // the default — "create a CV / prepare me for a job" — for one frame before the real
    // phase landed. Every phase this session ever holds is recorded; 'mode' must not be
    // among them.
    CVService.getDraftById.mockResolvedValue(DAMAGED_DRAFT);
    const seen = [];
    const Recorder = () => {
      const { studioPhase } = useAriaStudio();
      seen.push(studioPhase);
      return null;
    };
    render(
      <StrictMode>
        <AriaStudioProvider>
          <Handle />
          <Recorder />
          <Desk />
        </AriaStudioProvider>
      </StrictMode>
    );
    await waitFor(() => expect(ctx).toBeTruthy());
    // Measured ACROSS the switch only. A cold start with no session really does open on
    // the mode chooser — that is the screen, not a flash — so the phases from before the
    // click would swamp the thing being measured.
    seen.length = 0;
    await ctx.loadSession('draft-2');
    await waitFor(() => expect(seen).toContain('build:done'));

    expect(seen).not.toContain('mode');
  });

  it('leaves a healthy draft’s thread alone and does not rewrite it', async () => {
    renderStudio(); // getDraftById returns the healthy DRAFT
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.loadSession('draft-1');
    await screen.findByText(/this line is the CV session talking/i);

    await new Promise((r) => setTimeout(r, 1000));
    const chatWrites = CVService.saveDraft.mock.calls.filter(([payload]) => payload?.coachChats);
    expect(chatWrites).toEqual([]);
  });
});

describe('opening a CV that still has its conversation', () => {
  it('paints the conversation on the FIRST frame, never the welcome message first', async () => {
    // The flicker. The transcript used to be seeded in an effect, and an effect cannot run
    // until after the first paint — so opening a saved CV showed Aria's welcome message,
    // then replaced it with the conversation a frame later. Nothing was broken by it; it
    // just looked broken, every single time a session was opened.
    //
    // Frames are tagged with the session they belong to, because the frames from BEFORE
    // the switch are a different session and legitimately show something else.
    const frames = [];
    const Recorder = () => {
      const { sessionNonce } = useAriaStudio();
      // No dependency array: one entry per commit, read after the DOM is updated.
      useEffect(() => {
        frames.push({ nonce: sessionNonce, text: document.body.textContent || '' });
      });
      return null;
    };

    render(
      <StrictMode>
        <AriaStudioProvider>
          <Handle />
          <Desk />
          <Recorder />
        </AriaStudioProvider>
      </StrictMode>
    );
    await waitFor(() => expect(ctx).toBeTruthy());
    const before = ctx.sessionNonce;

    await ctx.loadSession('draft-1');
    await waitFor(() => expect(frames.some((f) => f.nonce !== before)).toBe(true));

    const opened = frames.filter((f) => f.nonce !== before);
    expect(opened.length).toBeGreaterThan(0);
    for (const frame of opened) {
      expect(frame.text).toMatch(/this line is the CV session talking/);
    }
  });
});

describe('the paths that must keep working', () => {
  it('still restores a real analysis when one is actually opened', async () => {
    CVService.getApplication.mockResolvedValue({
      _id: 'app-9',
      fitScore: 61,
      fitAnalysis: { overallFeedback: 'Solid.', recommendation: 'good_match' },
      actionPlan: [],
      jobId: { title: 'Field Operator', company: 'QatarEnergy LNG', description: 'Offshore.' },
    });

    renderStudio();
    await waitFor(() => expect(ctx).toBeTruthy());
    await ctx.openApplication('app-9');

    await waitFor(() => expect(CVService.getApplication).toHaveBeenCalledWith('app-9'));
    expect(await screen.findByText(/What next/i)).toBeTruthy();
  });

  it('still rehydrates a CV session from its draft on a cold refresh', async () => {
    // No pendingKind, no click — the remembered draft id is all the app has to go on.
    localStorage.setItem('ariaStudio:draftId', 'draft-1');
    renderStudio();

    expect(await screen.findByText(/this line is the CV session talking/i)).toBeTruthy();
  });
});
