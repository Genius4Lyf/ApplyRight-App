// @vitest-environment jsdom
//
// WHAT THIS JOB ASKS FOR, WHILE YOU ARE BEING INTERVIEWED ABOUT IT.
//
// The job description used to be read once, shown once, and then disappear into a prompt.
// From there Aria raised requirements from behind a curtain: the user could not see the
// list, so they could not agree with it, correct it, or choose from it. TargetJobStrip even
// hides itself during a role interview, and during a CALL the only thing on screen was the
// orb and its End button.
//
// Two things are asserted here that no unit test of the bar could reach:
//   · a tap in CHAT runs through the requirement HUNT (`probe`), so the server asks,
//     verifies the answer against what was really said, and writes a DURABLE "no" —
//     rather than a shallower second path that would forget it.
//   · a tap on a CALL steers instead, because there is nothing to type into; she is never
//     cut off, and the note cannot reach the transcript the bullets are built from.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import CVService from '../../services/cv.service';
import BillingService from '../../services/billing.service';
import { clearCachedEntitlement } from '../../lib/entitlementCache';
import SectionCoach from './SectionCoach';

const call = vi.hoisted(() => ({ opts: null, controller: null, secondsLeft: 100 }));

vi.mock('../../lib/ariaLive', () => ({
  END_REASONS: {
    ARIA_FINISHED: 'aria_finished',
    USER_ENDED: 'user_ended',
    TIME_UP: 'time_up',
    DROPPED: 'dropped',
  },
  isAriaLiveSupported: () => true,
  createAriaCall: vi.fn((opts) => {
    call.opts = opts;
    call.controller = {
      start: vi.fn().mockResolvedValue({ reservedSec: 120, mode: 'paid' }),
      stop: vi.fn(),
      secondsLeft: () => call.secondsLeft,
      getRemoteStream: () => null,
      getLocalStream: () => null,
      getTranscript: () => [],
      // The pass-through this feature needed. Without it on the fake, `call.steer?.()`
      // is undefined and a steering test passes while steering nothing.
      steer: vi.fn(),
      isClosed: () => false,
    };
    return call.controller;
  }),
}));

vi.mock('./AriaLiveOrb', () => ({ default: () => null }));

// The draft the coach reads its Role Brief and its declines from. SectionCoach is the only
// thing in this tree that touches the context, so it is driven directly — with REAL state,
// so that a decline written mid-turn re-renders the bar the way it does in the app.
const studio = vi.hoisted(() => ({ cvData: null }));

vi.mock('../../context/AriaStudioContext', async () => {
  const React = await import('react');
  return {
    AriaStudioProvider: ({ children }) => children,
    useAriaStudio: () => {
      const [cvData, setCvData] = React.useState(studio.cvData);
      return {
        cvData,
        updateCvData: (patch) => setCvData((current) => ({ ...current, ...patch })),
      };
    },
  };
});

vi.mock('../../services/cv.service', () => ({
  default: {
    coachChat: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    getDraftById: vi.fn(),
    generateBullets: vi.fn(),
    coachGenerateBullets: vi.fn(),
    studioRecompute: vi.fn(),
    undeclineSkills: vi.fn().mockResolvedValue({ undeclined: 1 }),
  },
}));

vi.mock('../../services/billing.service', () => ({
  default: { getEntitlement: vi.fn() },
}));

vi.mock('../../services/user.service', () => ({
  default: { getProfile: vi.fn(), updateSettings: vi.fn().mockResolvedValue({}) },
}));

vi.mock('sonner', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  toast.info = vi.fn();
  return { toast };
});

const t = (key, opts) => i18n.t(key, opts);

const entry = {
  section: 'experience',
  sortId: 'role-1',
  title: 'Technician',
  company: 'Dangote',
};
const pin = { who: 'pinrole', sortId: 'role-1', section: 'experience' };

const KEYWORDS = [
  { name: 'Permit-to-Work', importance: 'must_have' },
  { name: 'Troubleshooting', importance: 'must_have' },
];
const COVERAGE = {
  results: [
    { name: 'Permit-to-Work', covered: false },
    { name: 'Troubleshooting', covered: true },
  ],
};

// The typed `requirements` list is the ONLY place requirement ids live; the compact
// mustHaves array has none. Without the join by name, a row cannot be asked about at all.
const DRAFT = {
  _id: 'd1',
  targetJob: {
    brief: {
      requirements: [
        { id: 'req_ptw', name: 'Permit-to-Work', type: 'method', priority: 'must_have' },
        { id: 'req_ts', name: 'Troubleshooting', type: 'skill', priority: 'must_have' },
      ],
    },
  },
  experience: [{ _sortId: 'role-1', title: 'Technician', company: 'Dangote' }],
  projects: [],
  coachEvidence: {},
  skillDeclines: [],
};

beforeEach(() => {
  studio.cvData = DRAFT;
  call.opts = null;
  call.controller = null;
  call.secondsLeft = 100;
  CVService.coachChat.mockResolvedValue({ reply: 'ok', intent: 'building' });
  BillingService.getEntitlement.mockResolvedValue({ ariaCall: { secondsRemaining: 600 } });
  clearCachedEntitlement();
  localStorage.setItem('user', JSON.stringify({ token: 'tok', settings: {} }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mount = ({ coverage = COVERAGE, keywords = KEYWORDS, messages } = {}) => {
  const onPush = vi.fn();
  render(
    <SectionCoach
      draftId="d1"
      entry={entry}
      jobCoverage={coverage}
      jobKeywords={keywords}
      messages={messages || [pin, { who: 'calltips' }]}
      onPush={onPush}
      onApply={vi.fn()}
      onDone={vi.fn()}
      careerStage="experienced"
    />
  );
  return { onPush };
};

// The bar arrives collapsed, so this waits for it and opens it. Found by its count, which
// is unique to it — the "what this job asks for" label is deliberately shared with other
// surfaces. Tolerant of an already-open bar so it survives the default moving again.
const openBar = async (done = 1, total = 2) => {
  const count = await screen.findByText(
    t('ariaStudio.sectionCoach.checklist.count', { done, total })
  );
  const header = count.closest('button');
  if (header?.getAttribute('aria-expanded') === 'false') fireEvent.click(header);
};

const pressCall = async () => {
  fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));
  await waitFor(() => expect(call.controller?.start).toHaveBeenCalled());
};

describe('the requirement bar inside a role interview', () => {
  it('shows what this job asks for, above where you type', async () => {
    mount();
    expect(
      await screen.findByText(t('ariaStudio.sectionCoach.checklist.count', { done: 1, total: 2 }))
    ).toBeTruthy();
  });

  it('shows nothing at all when this CV has no job to aim at', async () => {
    mount({ coverage: null, keywords: [] });
    await screen.findByText(t('ariaStudio.ariaLive.talkInstead'));
    expect(screen.queryByText(t('ariaStudio.jobTarget.eyebrow'))).toBeNull();
    expect(screen.queryByText(t('ariaStudio.chat.preflight.eyebrow'))).toBeNull();
  });
});

// Said once, before the first answer, so the list is something the user agrees to rather
// than something that happens to them.
describe('the pre-flight card', () => {
  it('names what she will listen for, and offers each one', async () => {
    mount();
    expect(await screen.findByText(t('ariaStudio.chat.preflight.eyebrow'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.chat.preflight.orJustTalk'))).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Permit-to-Work' })).toBeTruthy();
  });

  it('offers only what is still open — never something already covered', async () => {
    mount();
    await screen.findByText(t('ariaStudio.chat.preflight.eyebrow'));
    expect(screen.queryByRole('button', { name: 'Troubleshooting' })).toBeNull();
  });

  it('starts the interview on that requirement when one is tapped', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Permit-to-Work' }));
    await waitFor(() =>
      expect(CVService.coachChat).toHaveBeenCalledWith(
        expect.objectContaining({ probe: { requirementId: 'req_ptw' } })
      )
    );
  });

  it('is gone once the interview has started — it is a beginning, not a menu', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Permit-to-Work' }));
    await waitFor(() =>
      expect(screen.queryByText(t('ariaStudio.chat.preflight.eyebrow'))).toBeNull()
    );
  });
});

describe('tapping a requirement in chat', () => {
  it('runs through the HUNT, so the answer is verified and a no is remembered', async () => {
    mount();
    await openBar();
    fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.checklist.askMe')));

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
    // The id is what makes this the hunt and not just a sentence about the same words.
    expect(CVService.coachChat).toHaveBeenCalledWith(
      expect.objectContaining({
        probe: expect.objectContaining({ requirementId: expect.any(String) }),
        focus: { section: 'experience', sortId: 'role-1' },
      })
    );
  });

  it('marks the tap as a choice, not something the user typed', async () => {
    const { onPush } = mount();
    await openBar();
    fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.checklist.askMe')));

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
    const pushed = onPush.mock.calls.flat().find((m) => m?.who === 'user');
    expect(pushed.selected).toBe(true);
    expect(pushed.text).toContain('Permit-to-Work');
  });

  // THE BUBBLE IS THE USER SPEAKING.
  //
  // It used to push Aria's own invitation back as their words — "Ask me about this:
  // Permit-to-Work" — under an eyebrow reading RESPONDED TO ARIA INTERVIEW. One is the
  // control's caption, the other is a system event; neither is a thing a person says, and
  // what they actually did was ask for a topic. Reported from use, and the old assertion
  // (`text` merely CONTAINS the requirement name) passed happily through the bad copy.
  describe('what the tap says in the transcript', () => {
    const tapped = async () => {
      const { onPush } = mount();
      await openBar();
      fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.checklist.askMe')));
      await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
      return onPush.mock.calls.flat().find((m) => m?.who === 'user');
    };

    it('speaks in the user voice, naming the requirement', async () => {
      const pushed = await tapped();
      expect(pushed.text).toBe(
        t('ariaStudio.sectionCoach.checklist.askedMessage', { name: 'Permit-to-Work' })
      );
    });

    it("never echoes the control's own caption back as the user's words", async () => {
      const pushed = await tapped();
      expect(pushed.text).not.toContain(t('ariaStudio.sectionCoach.checklist.askMe'));
    });

    it('carries an eyebrow saying the user ASKED, not that they answered', async () => {
      const pushed = await tapped();
      expect(pushed.eyebrowKey).toBe('ariaStudio.sectionCoach.checklist.askedEyebrow');
      expect(t(pushed.eyebrowKey)).not.toBe(t('ariaStudio.chat.respondedToAriaInterview'));
    });
  });

  it("shows a declined requirement as 'you said no' the moment the server says so", async () => {
    CVService.coachChat.mockResolvedValue({
      reply: 'Understood — I won’t ask again.',
      intent: 'building',
      probeResult: { requirementId: 'req_x', name: 'Permit-to-Work', status: 'declined' },
    });
    mount();
    await openBar();
    fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.checklist.askMe')));
    // The tap closes the bar — what it produced lands in the thread the bar was covering.
    // The refusal is a durable record, so it is waiting the next time the list is opened.
    await waitFor(() =>
      expect(screen.queryByText(t('ariaStudio.sectionCoach.checklist.declined'))).toBeNull()
    );
    await openBar(1, 2);

    expect(await screen.findByText(t('ariaStudio.sectionCoach.checklist.declined'))).toBeTruthy();
  });
});

describe('tapping a requirement on a call', () => {
  it('steers her instead of sending a message — there is nothing to type into', async () => {
    mount();
    await pressCall();
    act(() => call.opts.onState?.('listening'));

    await openBar();
    fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.checklist.askOnCall')));

    expect(call.controller.steer).toHaveBeenCalledWith(expect.stringContaining('Permit-to-Work'));
    // A steer is NOT a turn. Nothing may reach /coach/chat from a tap.
    expect(CVService.coachChat).not.toHaveBeenCalled();
  });

  it('says next up straight away, because nothing audible happens for seconds', async () => {
    mount();
    await pressCall();
    act(() => call.opts.onState?.('listening'));

    await openBar();
    fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.checklist.askOnCall')));

    expect(await screen.findByText(t('ariaStudio.sectionCoach.checklist.nextUp'))).toBeTruthy();
  });

  it('offers no tap while the call is still connecting', async () => {
    // The data channel may not be open yet; a steer sent then is dropped silently and
    // reports nothing back, so the control must not be there to press.
    mount();
    await pressCall();

    await openBar();
    expect(screen.queryByText(t('ariaStudio.sectionCoach.checklist.askOnCall'))).toBeNull();
    // The list is still readable — only the action goes.
    expect(screen.getByText('Permit-to-Work')).toBeTruthy();
  });

  it('withdraws the tap inside the last 75 seconds, where the wrap-up nudge lives', async () => {
    call.secondsLeft = 70;
    mount();
    await pressCall();
    act(() => call.opts.onState?.('listening'));
    // The countdown polls every second.
    await waitFor(
      () => {
        expect(screen.queryByText(t('ariaStudio.ariaLive.talkInstead'))).toBeNull();
      },
      { timeout: 2000 }
    );

    await openBar();
    expect(screen.queryByText(t('ariaStudio.sectionCoach.checklist.askOnCall'))).toBeNull();
  });
});
