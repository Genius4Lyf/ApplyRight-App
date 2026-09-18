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
    // The name the coach actually calls. Absent from this mock until the bullet-generation
    // failure paths got tests — so it was undefined, and nothing noticed.
    coachGenerateBullets: vi.fn(),
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

// "Write my bullets from this call" no longer writes anything on its own — it asks whether to
// write them now or let Aria check the call over first. Most existing tests want the former.
const writeNow = async () => {
  fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.ended.writeBullets')));
  fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.wrapUp.write')));
};

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

    await writeNow();

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

describe('Aria Live — when the CONNECTION drops', () => {
  // THE BUG THIS EXISTS FOR, seen on a real call: a phone lost its connection six minutes into
  // an interview. The transport error was logged and nothing else happened — the call never
  // ended, so the orb sat there looking live, the reservation was left to the server's sweep,
  // and everything that had been said was stranded with no way to ask for bullets. 379 seconds
  // spent, zero bullets written. A drop has to end the call like any other ending.
  it('offers the bullets from what was already said, rather than stranding the call', async () => {
    mount();
    await pressCall();
    talk();

    endCall('dropped');

    expect(await screen.findByText(t('ariaStudio.ariaLive.ended.droppedTitle'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.ended.writeBullets'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.ended.keepChatting'))).toBeTruthy();
  });

  it('says the connection went — not that the call is finished', async () => {
    mount();
    await pressCall();
    talk();

    endCall('dropped');

    await screen.findByText(t('ariaStudio.ariaLive.ended.droppedTitle'));
    // "Call ended" would read as though this was meant to happen.
    expect(screen.queryByText(t('ariaStudio.ariaLive.ended.title'))).toBeNull();
  });

  it('banks the transcript when they ask for the bullets, exactly as a hang-up does', async () => {
    mount();
    await pressCall();
    talk();
    endCall('dropped');

    await writeNow();

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalledTimes(1));
    expect(CVService.coachChat).toHaveBeenCalledWith(
      expect.objectContaining({ buildTurns: 10, studioInterview: true })
    );
  });

  it('explains a drop that happened before they said anything', async () => {
    const { toast } = await import('sonner');
    mount();
    await pressCall();

    endCall('dropped');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(t('ariaStudio.ariaLive.ended.droppedEmpty'))
    );
    // Nothing to write bullets from, so no card.
    expect(screen.queryByText(t('ariaStudio.ariaLive.ended.writeBullets'))).toBeNull();
  });

  it('takes the orb down — a dead call must not keep looking live', async () => {
    mount();
    await pressCall();
    talk();

    endCall('dropped');

    await waitFor(() => expect(screen.queryByText(t('ariaStudio.ariaLive.end'))).toBeNull());
    // The typed composer is back, so the interview can carry on.
    expect(screen.getByText(t('ariaStudio.ariaLive.talkInstead'))).toBeTruthy();
  });
});

describe('Aria Live — the wrap-up ends on the candidate', () => {
  // /coach/chat's contract is that the last message is the user's new turn. That is true by
  // construction when typing and false for almost every call, because Aria asks the questions
  // and so speaks last — always when the clock stops mid-question, always on a drop. The
  // mismatch 400'd the wrap-up before anything else ran, and the user was told "couldn't
  // generate bullets" having already spent the minutes on the call.
  const endOnAria = () =>
    act(() => {
      call.opts.onTurn({ who: 'aria', text: 'Tell me what you did day to day.' });
      call.opts.onTurn({ who: 'user', text: 'I kept the unit running through the operation.' });
      call.opts.onTurn({ who: 'aria', text: 'Did you ever spot something before anyone else?' });
    });

  it('trims the question nobody answered, so the transcript ends on their words', async () => {
    mount();
    await pressCall();
    endOnAria();
    endCall('aria_finished');

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
    const { messages } = CVService.coachChat.mock.calls[0][0];
    expect(messages[messages.length - 1].who).toBe('user');
    // Her earlier turns stay — they are the questions the answers belong to.
    expect(messages.filter((m) => m.who === 'aria').length).toBe(1);
    expect(messages.filter((m) => m.who === 'user').length).toBe(1);
  });

  it('banks a call the CLOCK ended mid-question, which is the common case', async () => {
    mount();
    await pressCall();
    endOnAria();
    endCall('time_up');

    await writeNow();

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalledTimes(1));
    const { messages } = CVService.coachChat.mock.calls[0][0];
    expect(messages[messages.length - 1].who).toBe('user');
  });

  it('sends nothing at all when only Aria spoke', async () => {
    mount();
    await pressCall();
    act(() => {
      call.opts.onTurn({ who: 'aria', text: 'Hello? Can you hear me?' });
    });
    endCall('aria_finished');

    await waitFor(() => expect(call.controller.stop).toHaveBeenCalled());
    expect(CVService.coachChat).not.toHaveBeenCalled();
  });
});

describe('Aria Live — before spending credits on an unfinished call', () => {
  // Every call that reaches this card was INTERRUPTED — hung up, timed out, or dropped — so
  // Aria was usually mid-question. Writing bullets from that is a one-way, paid door, and
  // pressing it used to go straight through.
  it('asks whether to write now or let Aria check the call over first', async () => {
    mount();
    await pressCall();
    talk();
    endCall('user_ended');

    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.ended.writeBullets')));

    expect(await screen.findByText(t('ariaStudio.ariaLive.wrapUp.title'))).toBeTruthy();
    // Nothing spent yet.
    expect(CVService.coachChat).not.toHaveBeenCalled();
  });

  it('"write them now" forces the wrap-up, exactly as before', async () => {
    mount();
    await pressCall();
    talk();
    endCall('user_ended');
    await writeNow();

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
    expect(CVService.coachChat).toHaveBeenCalledWith(expect.objectContaining({ buildTurns: 10 }));
  });

  it('"check with Aria" asks an ordinary turn instead of forcing a draft', async () => {
    CVService.coachChat.mockResolvedValue({
      reply: 'One more thing — what changed because you did that?',
      readyToDraft: false,
    });
    const { onPush } = mount();
    await pressCall();
    talk();
    endCall('user_ended');

    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.ended.writeBullets')));
    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.wrapUp.ask')));

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
    const sent = CVService.coachChat.mock.calls[0][0];
    // NOT the turn cap — that is what forces a draft out of half an interview.
    expect(sent.buildTurns).toBeLessThan(10);
    // Her question lands in the chat and the typed interview carries on.
    expect(onPush).toHaveBeenCalledWith(
      expect.objectContaining({
        who: 'aria',
        text: 'One more thing — what changed because you did that?',
      })
    );
  });

  it('goes to the bullets anyway when Aria says the call covered enough', async () => {
    const { onPush } = mount();
    await pressCall();
    talk();
    endCall('user_ended');

    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.ended.writeBullets')));
    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.wrapUp.ask')));

    // The default mock answers readyToDraft: true.
    await waitFor(() =>
      expect(screen.getByText(t('cvBuilder.askAria.howManyBullets'))).toBeTruthy()
    );
    expect(onPush).not.toHaveBeenCalledWith(expect.objectContaining({ who: 'aria', text: 'ok' }));
  });
});

describe('Aria Live — when the wrap-up is refused', () => {
  const failWith = (status, code) => {
    const err = new Error('nope');
    err.response = { status, data: code ? { code } : {} };
    CVService.coachChat.mockRejectedValue(err);
  };

  const failedWrapUp = async () => {
    mount();
    await pressCall();
    talk();
    endCall('user_ended');
    await writeNow();
  };

  it('names a credit problem and offers to fix it, instead of one red toast', async () => {
    failWith(403, 'INSUFFICIENT_CREDITS');
    await failedWrapUp();

    expect(await screen.findByText(t('ariaStudio.ariaLive.recovery.credits.title'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.recovery.getCredits'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.recovery.continueChat'))).toBeTruthy();
  });

  it('does NOT try to sell anything when the problem is the daily limit', async () => {
    failWith(402, 'BUILD_LIMIT_REACHED');
    await failedWrapUp();

    expect(await screen.findByText(t('ariaStudio.ariaLive.recovery.limit.title'))).toBeTruthy();
    // Buying credits would not help today, so it is not offered.
    expect(screen.queryByText(t('ariaStudio.ariaLive.recovery.getCredits'))).toBeNull();
    expect(screen.getByText(t('ariaStudio.ariaLive.recovery.continueChat'))).toBeTruthy();
  });

  it('offers a retry for a network failure, because a second press may well work', async () => {
    failWith(500);
    await failedWrapUp();

    expect(await screen.findByText(t('ariaStudio.ariaLive.recovery.network.title'))).toBeTruthy();
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.recovery.tryAgain')));
    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalledTimes(2));
  });

  it('takes them to credits from the card', async () => {
    failWith(403, 'INSUFFICIENT_CREDITS');
    const onGetMinutes = vi.fn();
    render(
      <AriaStudioProvider>
        <SectionCoach
          draftId="d1"
          entry={entry}
          messages={[pin, { who: 'calltips' }]}
          onPush={vi.fn()}
          onApply={vi.fn()}
          onDone={vi.fn()}
          careerStage="experienced"
          onGetMinutes={onGetMinutes}
        />
      </AriaStudioProvider>
    );
    await pressCall();
    talk();
    endCall('user_ended');
    await writeNow();

    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.recovery.getCredits')));
    expect(onGetMinutes).toHaveBeenCalled();
  });

  it('reads their own words back when they carry on in chat — with no model call', async () => {
    failWith(403, 'INSUFFICIENT_CREDITS');
    const { onPush } = mount();
    await pressCall();
    talk();
    endCall('user_ended');
    await writeNow();

    CVService.coachChat.mockClear();
    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.recovery.continueChat')));

    // The LAST Aria message — the spoken turns are in there too, and they came first.
    const recap = onPush.mock.calls
      .map((c) => c[0])
      .filter((m) => m?.who === 'aria' && m.text)
      .at(-1);
    expect(recap.text).toContain(t('ariaStudio.ariaLive.recap.heard'));
    // Their sentence, quoted back.
    expect(recap.text).toContain('I ran the till and trained two new starters');
    // THE POINT: this is the moment they have no credits, so it cannot need the model.
    expect(CVService.coachChat).not.toHaveBeenCalled();
    // And the card steps aside so the composer is usable again (it animates out).
    await waitFor(() =>
      expect(screen.queryByText(t('ariaStudio.ariaLive.recovery.credits.title'))).toBeNull()
    );
  });
});

describe('Aria Live — the call knows which entry it is about', () => {
  it('sends the sortId, so the server can find what was already said', async () => {
    const { createAriaCall } = await import('../../lib/ariaLive');
    mount();
    await pressCall();

    expect(createAriaCall).toHaveBeenCalledWith(
      expect.objectContaining({ sortId: 'role-1', section: 'experience' })
    );
  });
});

describe('Aria Live — when writing the bullets is refused', () => {
  // The SECOND place a paid interview can dead-end. The wrap-up got a card; this one still
  // ended in a toast that read the same whether they were out of credits, over the day's
  // limit, or offline — and was gone by the time anyone looked up, leaving the picker sitting
  // there as though the press had not registered.
  const reachPicker = async () => {
    mount();
    await pressCall();
    talk();
    endCall('aria_finished');
    await screen.findByText(t('cvBuilder.askAria.howManyBullets'));
  };

  const failGenerate = (status, code) => {
    const err = new Error('nope');
    err.response = { status, data: code ? { code } : {} };
    CVService.coachGenerateBullets.mockRejectedValue(err);
  };

  it('names a credit problem at the picker, and offers to fix it', async () => {
    failGenerate(403, 'INSUFFICIENT_CREDITS');
    await reachPicker();

    fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.draftCount', { n: 6, cr: 6 })));

    expect(await screen.findByText(t('ariaStudio.ariaLive.recovery.credits.title'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.recovery.getCredits'))).toBeTruthy();
    // The count controls stay usable — a smaller number may well be affordable.
    expect(screen.getByText(t('cvBuilder.askAria.howManyBullets'))).toBeTruthy();
  });

  it('does not try to sell anything when it is the daily limit', async () => {
    failGenerate(402, 'BUILD_LIMIT_REACHED');
    await reachPicker();

    fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.draftCount', { n: 6, cr: 6 })));

    expect(await screen.findByText(t('ariaStudio.ariaLive.recovery.limit.title'))).toBeTruthy();
    expect(screen.queryByText(t('ariaStudio.ariaLive.recovery.getCredits'))).toBeNull();
  });

  it('hands them back to the chat with the interview intact', async () => {
    failGenerate(500);
    await reachPicker();

    fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.draftCount', { n: 6, cr: 6 })));
    fireEvent.click(await screen.findByText(t('ariaStudio.ariaLive.recovery.continueChat')));

    // Back in the interview, able to type — nothing that was said is lost.
    expect(await screen.findByText(t('ariaStudio.ariaLive.talkInstead'))).toBeTruthy();
  });

  it('clears the card on a second, successful attempt', async () => {
    failGenerate(500);
    await reachPicker();
    fireEvent.click(screen.getByText(t('ariaStudio.sectionCoach.draftCount', { n: 6, cr: 6 })));
    await screen.findByText(t('ariaStudio.ariaLive.recovery.network.title'));

    CVService.coachGenerateBullets.mockResolvedValue({ bullets: ['Ran the till.'] });
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.recovery.tryAgain')));

    await waitFor(() =>
      expect(screen.queryByText(t('ariaStudio.ariaLive.recovery.network.title'))).toBeNull()
    );
  });
});
