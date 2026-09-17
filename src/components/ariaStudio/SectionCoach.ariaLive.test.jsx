// @vitest-environment jsdom
//
// WHAT HAPPENS WHEN A CALL ENDS.
//
// Ending a call used to drop straight onto the bullet-count picker, whoever ended it and
// whenever. That treated the End button as "I'm done" when it often isn't — someone walks in,
// they want to check a detail, they would rather type the rest — and it wrote thin bullets
// out of half an interview.
//
// The rule now:
//   · ARIA ended it (she recapped, asked if there was anything else, heard a yes, and called
//     finish_interview) → straight to the bullets, exactly as a typed interview does.
//   · the USER or the CLOCK ended it → ask: write the bullets from the call, or keep going
//     in chat.
//
// And before the first call of a session, a short brief on how to get a good one — unless
// the user has turned it off on their account.
//
// The transport (lib/ariaLive, WebRTC) cannot run under jsdom, so it is faked here and driven
// by hand. That is the point: these tests are about the decisions the coach makes with what
// the call reports, not about audio.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import { AriaStudioProvider } from '../../context/AriaStudioContext';
import CVService from '../../services/cv.service';
import UserService from '../../services/user.service';
import BillingService from '../../services/billing.service';
import { clearCachedEntitlement, primeEntitlement } from '../../lib/entitlementCache';
import SectionCoach from './SectionCoach';

const call = vi.hoisted(() => ({ opts: null, controller: null }));

vi.mock('../../lib/ariaLive', () => ({
  END_REASONS: { ARIA_FINISHED: 'aria_finished', USER_ENDED: 'user_ended', TIME_UP: 'time_up' },
  isAriaLiveSupported: () => true,
  createAriaCall: vi.fn((opts) => {
    call.opts = opts;
    call.controller = {
      start: vi.fn().mockResolvedValue({ reservedSec: 120, mode: 'paid' }),
      stop: vi.fn(),
      secondsLeft: () => 100,
      getRemoteStream: () => null,
      getLocalStream: () => null,
      getTranscript: () => [],
      isClosed: () => false,
    };
    return call.controller;
  }),
}));

// The orb draws on a canvas every animation frame; jsdom has no 2D context. Not what these
// tests are about.
vi.mock('./AriaLiveOrb', () => ({ default: () => null }));

vi.mock('../../services/cv.service', () => ({
  default: {
    coachChat: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    getDraftById: vi.fn(),
    generateBullets: vi.fn(),
    studioRecompute: vi.fn(),
  },
}));

vi.mock('../../services/billing.service', () => ({
  default: { getEntitlement: vi.fn() },
}));

vi.mock('../../services/user.service', () => ({
  default: {
    getProfile: vi.fn(),
    updateSettings: vi.fn().mockResolvedValue({}),
  },
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
  title: 'Sales Assistant',
  company: 'Shoprite',
};
const pin = { who: 'pinrole', sortId: 'role-1', section: 'experience' };

beforeEach(() => {
  call.opts = null;
  call.controller = null;
  CVService.coachChat.mockResolvedValue({
    reply: 'ok',
    readyToDraft: true,
    description: 'I ran the till and trained two new starters.',
    huntOffers: [],
  });
  // Default: minutes have been BOUGHT — there is no free taste on Aria calls.
  BillingService.getEntitlement.mockResolvedValue({ ariaCall: { secondsRemaining: 600 } });
  // The balance cache is MODULE-level — it is shared across every surface on a page, which is
  // the whole point of it. That also means it survives between tests, so a test that primed it
  // would decide the next one's balance. Cleared here, and each test that cares primes it.
  clearCachedEntitlement();
  // Default: the user has NOT turned the tips off. Read from the stored user, not fetched —
  // the profile request used to sit between the tap and the brief.
  localStorage.setItem('user', JSON.stringify({ token: 'tok', settings: {} }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mount = ({ messages = [pin, { who: 'calltips' }], onPush = vi.fn() } = {}) => {
  render(
    <AriaStudioProvider>
      <SectionCoach
        draftId="d1"
        entry={entry}
        messages={messages}
        onPush={onPush}
        onApply={vi.fn()}
        onDone={vi.fn()}
        careerStage="experienced"
      />
    </AriaStudioProvider>
  );
  return { onPush };
};

const pressCall = async () => {
  fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));
  await waitFor(() => expect(call.controller?.start).toHaveBeenCalled());
};

// Something was actually said — a user turn and a reply.
const talk = () =>
  act(() => {
    call.opts.onTurn({ who: 'aria', text: 'Tell me what you did day to day.' });
    call.opts.onTurn({ who: 'user', text: 'I ran the till and trained two new starters.' });
  });

const endCall = (reason) => act(() => call.opts.onEnded({ reason, durationSec: 90 }));

describe('Aria Live — when ARIA ends the call', () => {
  it('goes straight to the bullets, forcing the wrap exactly as a finished typed interview does', async () => {
    mount();
    await pressCall();
    talk();
    endCall('aria_finished');

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalledTimes(1));
    expect(CVService.coachChat).toHaveBeenCalledWith(
      expect.objectContaining({ buildTurns: 10, studioInterview: true })
    );
    // She already asked. Asking again would be asking twice.
    expect(screen.queryByText(t('ariaStudio.ariaLive.ended.writeBullets'))).toBeNull();
  });
});

describe('Aria Live — when the USER ends the call', () => {
  it('asks what to do instead of jumping to the bullets', async () => {
    mount();
    await pressCall();
    talk();
    endCall('user_ended');

    expect(await screen.findByText(t('ariaStudio.ariaLive.ended.title'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.ended.writeBullets'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.ended.keepChatting'))).toBeTruthy();
    expect(CVService.coachChat).not.toHaveBeenCalled();
  });

  it('writes the bullets from the call when they choose to', async () => {
    mount();
    await pressCall();
    talk();
    endCall('user_ended');

    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.ended.writeBullets')));

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalledTimes(1));
    const sent = CVService.coachChat.mock.calls[0][0];
    // What gets written up is what was SAID on the call.
    expect(sent.messages).toEqual([
      { who: 'aria', text: 'Tell me what you did day to day.' },
      { who: 'user', text: 'I ran the till and trained two new starters.' },
    ]);
  });

  it('hands back to the typed interview when they choose to keep chatting', async () => {
    const { onPush } = mount();
    await pressCall();
    talk();
    endCall('user_ended');

    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.ended.keepChatting')));

    expect(onPush).toHaveBeenCalledWith({
      who: 'aria',
      text: t('ariaStudio.ariaLive.ended.carryOn'),
    });
    // Nothing is spent on a model call until they actually type.
    expect(CVService.coachChat).not.toHaveBeenCalled();
    // The card animates out of the dock, so it is still mounted for a few frames.
    await waitFor(() =>
      expect(screen.queryByText(t('ariaStudio.ariaLive.ended.writeBullets'))).toBeNull()
    );
  });

  it('says the time ran out when it was the clock, not them', async () => {
    mount();
    await pressCall();
    talk();
    endCall('time_up');

    expect(await screen.findByText(t('ariaStudio.ariaLive.ended.timeUpTitle'))).toBeTruthy();
    expect(CVService.coachChat).not.toHaveBeenCalled();
  });

  it('asks nothing about a call they hung up before saying a word', async () => {
    mount();
    await pressCall();
    act(() => call.opts.onTurn({ who: 'aria', text: 'Hi! Tell me about the role.' }));
    endCall('user_ended');

    await waitFor(() => expect(call.opts).toBeTruthy());
    expect(screen.queryByText(t('ariaStudio.ariaLive.ended.title'))).toBeNull();
    expect(CVService.coachChat).not.toHaveBeenCalled();
  });
});

describe('Aria Live — the brief before the first call', () => {
  it('shows the tips before the first call of a session', async () => {
    const { createAriaCall } = await import('../../lib/ariaLive');
    mount({ messages: [pin] });
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));

    expect(await screen.findByText(t('ariaStudio.ariaLive.tips.title'))).toBeTruthy();
    // No minutes reserved until they choose to start.
    expect(createAriaCall).not.toHaveBeenCalled();
  });

  it('does not show them twice in one session', async () => {
    const { createAriaCall } = await import('../../lib/ariaLive');
    mount({ messages: [pin, { who: 'calltips' }] });
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));

    await waitFor(() => expect(createAriaCall).toHaveBeenCalled());
    expect(screen.queryByText(t('ariaStudio.ariaLive.tips.title'))).toBeNull();
    // Already known this session. Nothing is asked of the server before the call — not the
    // profile, and not the balance either: startCall's own 402 is the gate.
    expect(UserService.getProfile).not.toHaveBeenCalled();
    expect(BillingService.getEntitlement).not.toHaveBeenCalled();
  });

  it('respects "don\'t show this again" from the account', async () => {
    const { createAriaCall } = await import('../../lib/ariaLive');
    localStorage.setItem(
      'user',
      JSON.stringify({ token: 'tok', settings: { hideAriaCallTips: true } })
    );
    mount({ messages: [pin] });
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));

    await waitFor(() => expect(createAriaCall).toHaveBeenCalled());
    expect(screen.queryByText(t('ariaStudio.ariaLive.tips.title'))).toBeNull();
    // Read from the browser, never fetched: this runs between the tap and the call starting.
    expect(UserService.getProfile).not.toHaveBeenCalled();
  });

  it('records that the tips were seen, and saves the opt-out only when ticked', async () => {
    const { onPush } = mount({ messages: [pin] });
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));
    fireEvent.click(await screen.findByLabelText(t('ariaStudio.ariaLive.tips.dontShowAgain')));
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.tips.start')));

    expect(onPush).toHaveBeenCalledWith({ who: 'calltips' });
    await waitFor(() =>
      expect(UserService.updateSettings).toHaveBeenCalledWith({ hideAriaCallTips: true })
    );
  });

  it('never opts anyone out who did not tick the box', async () => {
    mount({ messages: [pin] });
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));
    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.tips.start')));

    await waitFor(() => expect(call.controller?.start).toHaveBeenCalled());
    expect(UserService.updateSettings).not.toHaveBeenCalled();
  });
});

describe('Aria Live — spoken turns do not spend the typed budget', () => {
  // Choosing "keep going in chat" after a long call used to hit the typed turn cap on the very
  // first message, and the server forced a wrap-up: the opposite of what was just asked for.
  const turns = (n, spoken) =>
    Array.from({ length: n }, (_, i) => [
      { who: 'aria', text: `Question ${i}`, ...(spoken ? { spoken: true } : null) },
      { who: 'user', text: `Answer ${i}`, ...(spoken ? { spoken: true } : null) },
    ]).flat();
  const nearLimit = () =>
    screen.queryByText(t('ariaStudio.sectionCoach.questionsLeft', { count: 1 }));

  it('a long call leaves the typed interview its full budget', () => {
    mount({ messages: [pin, { who: 'calltips' }, ...turns(9, true)] });
    expect(nearLimit()).toBeNull();
  });

  it('typed turns still count exactly as before', () => {
    mount({ messages: [pin, ...turns(9, false)] });
    expect(nearLimit()).toBeTruthy();
  });
});

describe('Aria Live — call settings reach the call', () => {
  const base = 'ariaStudio.ariaLive.settings';
  const chip = (depth, style) =>
    screen.getByText(`${t(`${base}.depth.${depth}.label`)} · ${t(`${base}.style.${style}.label`)}`);

  beforeEach(() => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        token: 't',
        settings: { ariaCall: { depth: 'quick', style: 'direct', voice: 'cedar', pace: 'slower' } },
      })
    );
  });
  afterEach(() => localStorage.clear());

  it('shows the saved choice beside the call button', () => {
    mount();
    expect(chip('quick', 'direct')).toBeTruthy();
  });

  it('sends the saved choice with the call', async () => {
    const { createAriaCall } = await import('../../lib/ariaLive');
    mount();
    await pressCall();
    expect(createAriaCall).toHaveBeenCalledWith(
      expect.objectContaining({
        callSettings: { depth: 'quick', style: 'direct', voice: 'cedar', pace: 'slower' },
      })
    );
  });

  it('applies a change to the very next call, and saves it to the account', async () => {
    const { createAriaCall } = await import('../../lib/ariaLive');
    mount();
    fireEvent.click(chip('quick', 'direct'));
    fireEvent.click(screen.getByText(t(`${base}.style.coach.label`)));

    expect(UserService.updateSettings).toHaveBeenCalledWith({
      ariaCall: { depth: 'quick', style: 'coach', voice: 'cedar', pace: 'slower' },
    });

    await pressCall();
    expect(createAriaCall).toHaveBeenCalledWith(
      expect.objectContaining({ callSettings: expect.objectContaining({ style: 'coach' }) })
    );
  });

  it('shows the same controls in the brief before a first call', async () => {
    mount({ messages: [pin] });
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));
    await screen.findByText(t('ariaStudio.ariaLive.tips.title'));
    expect(screen.getAllByText(t(`${base}.title`)).length).toBeGreaterThan(0);
    expect(screen.getByText(t(`${base}.depth.quick.hint`))).toBeTruthy();
  });
});

describe('Aria Live — no free taste: you need minutes to call', () => {
  it('goes straight to "get minutes" with nothing bought — no brief, no call attempt', async () => {
    const { createAriaCall } = await import('../../lib/ariaLive');
    BillingService.getEntitlement.mockResolvedValue({ ariaCall: { secondsRemaining: 0 } });
    mount({ messages: [pin] });

    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));

    expect(await screen.findByText(t('ariaStudio.ariaLive.outOfMinutes'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.getMinutes'))).toBeTruthy();
    // Reading a whole brief for a call you cannot make would be the worst order of events.
    expect(screen.queryByText(t('ariaStudio.ariaLive.tips.title'))).toBeNull();
    expect(UserService.getProfile).not.toHaveBeenCalled();
    expect(createAriaCall).not.toHaveBeenCalled();
  });

  it('treats a missing Aria balance as zero, not as permission', async () => {
    const { createAriaCall } = await import('../../lib/ariaLive');
    BillingService.getEntitlement.mockResolvedValue({});
    mount({ messages: [pin] });

    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));

    expect(await screen.findByText(t('ariaStudio.ariaLive.outOfMinutes'))).toBeTruthy();
    expect(createAriaCall).not.toHaveBeenCalled();
  });

  it('still tries the call if the balance check itself fails — the server is the real gate', async () => {
    BillingService.getEntitlement.mockRejectedValue(new Error('network'));
    mount();

    await pressCall();

    expect(call.controller.start).toHaveBeenCalled();
  });

  it('keeps typing available from the out-of-minutes card', async () => {
    BillingService.getEntitlement.mockResolvedValue({ ariaCall: { secondsRemaining: 0 } });
    mount({ messages: [pin] });

    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));
    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.keepTyping')));

    await waitFor(() =>
      expect(screen.queryByText(t('ariaStudio.ariaLive.outOfMinutes'))).toBeNull()
    );
  });
});

describe('Aria Live — the press has to be instant', () => {
  it('uses the balance the page already fetched, rather than asking again', async () => {
    // The sidebar's wallet fetches /billing/entitlement on every page load. Awaiting a second
    // copy of it between the tap and the brief is what made this feel slow — seconds of a tap
    // doing nothing, on a server that had gone to sleep.
    primeEntitlement({ ariaCall: { secondsRemaining: 600 } });
    mount({ messages: [pin] });

    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));

    // Synchronously, in the same tick as the click — no findBy, no waiting.
    expect(screen.getByText(t('ariaStudio.ariaLive.tips.title'))).toBeTruthy();
    expect(BillingService.getEntitlement).not.toHaveBeenCalled();
  });

  it('still refuses a call the cached balance cannot pay for', async () => {
    primeEntitlement({ ariaCall: { secondsRemaining: 0 } });
    const { createAriaCall } = await import('../../lib/ariaLive');
    mount({ messages: [pin] });

    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));

    expect(screen.getByText(t('ariaStudio.ariaLive.outOfMinutes'))).toBeTruthy();
    expect(screen.queryByText(t('ariaStudio.ariaLive.tips.title'))).toBeNull();
    expect(createAriaCall).not.toHaveBeenCalled();
  });

  it('falls back to one request when nothing has primed the cache', async () => {
    mount({ messages: [pin] });

    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.talkInstead')));

    expect(await screen.findByText(t('ariaStudio.ariaLive.tips.title'))).toBeTruthy();
    expect(BillingService.getEntitlement).toHaveBeenCalledTimes(1);
  });
});
