// @vitest-environment jsdom
//
// WHAT A SECOND ROUND ON THE SAME ROLE CAN SEE.
//
// Applying bullets is a checkpoint, not an ending: StudioChat pushes a FRESH `pinrole`
// marker for the same entry and re-keys the coach, so the user carries on talking about
// the role they were already on.
//
// `sessionStart` scans BACKWARDS for the newest `pinrole` matching this entry, and
// `coachMessages` is everything after it. That is deliberate and load-bearing — a wider
// window primes a PAID generation with another entry's answers — but it has a consequence
// nobody chose: the second round opens on a blank transcript. Not 22 messages later, as
// the sliding window would suggest. Immediately.
//
// Observed in the wild before it was understood: a role with 40 applied bullets where
// #33–#38 are near-copies of #9–#16, because the round that wrote them had no way to know
// the earlier ones existed.
//
// These tests exist to prove that reading of the code before anything is changed on the
// strength of it.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import CVService from '../../services/cv.service';
import BillingService from '../../services/billing.service';
import { clearCachedEntitlement } from '../../lib/entitlementCache';
import SectionCoach from './SectionCoach';

vi.mock('../../lib/ariaLive', () => ({
  END_REASONS: { ARIA_FINISHED: 'a', USER_ENDED: 'b', TIME_UP: 'c', DROPPED: 'd' },
  isAriaLiveSupported: () => false,
  createAriaCall: vi.fn(),
}));
vi.mock('./AriaLiveOrb', () => ({ default: () => null }));

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
    undeclineSkills: vi.fn(),
  },
}));
vi.mock('../../services/billing.service', () => ({ default: { getEntitlement: vi.fn() } }));
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

const entry = {
  section: 'experience',
  sortId: 'role-1',
  title: 'Wireline Field Operator',
  company: 'SLB',
  // The bullets the FIRST round already put on this role.
  description:
    '• Handed off serviced equipment to specialists for FIT checks\n' +
    '• Identified and reported equipment faults immediately through the company system',
};

const pin = () => ({ who: 'pinrole', sortId: 'role-1', section: 'experience' });

// Round one: said, answered, and turned into the bullets now sitting on the entry.
const ROUND_ONE = [
  { who: 'aria', text: 'Tell me what you did at SLB.' },
  { who: 'user', text: 'I handed off serviced equipment to specialists for FIT checks.' },
  { who: 'aria', text: 'Anything else?' },
  { who: 'user', text: 'I reported equipment faults through the company system.' },
];

const DRAFT = {
  _id: 'd1',
  targetJob: {},
  experience: [{ _sortId: 'role-1', ...entry }],
  projects: [],
  coachEvidence: {},
  skillDeclines: [],
};

beforeEach(() => {
  studio.cvData = DRAFT;
  CVService.coachChat.mockResolvedValue({ reply: 'ok', intent: 'building' });
  BillingService.getEntitlement.mockResolvedValue({ ariaCall: { secondsRemaining: 0 } });
  clearCachedEntitlement();
  localStorage.setItem('user', JSON.stringify({ token: 'tok', settings: {} }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mount = (messages) =>
  render(
    <SectionCoach
      draftId="d1"
      entry={entry}
      messages={messages}
      onPush={vi.fn()}
      onApply={vi.fn()}
      onDone={vi.fn()}
      careerStage="experienced"
    />
  );

const say = async (text) => {
  const box = await screen.findByPlaceholderText(
    i18n.t('ariaStudio.sectionCoach.activityPlaceholder')
  );
  fireEvent.change(box, { target: { value: text } });
  await act(async () => {
    fireEvent.keyDown(box, { key: 'Enter' });
  });
  await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
  return CVService.coachChat.mock.calls.at(-1)[0];
};

describe('a second round on the same role', () => {
  // The control. One marker, one conversation: everything after it goes up.
  it('sends the whole conversation while there has only been one round', async () => {
    mount([pin(), ...ROUND_ONE]);
    const sent = await say('And I greased the sheaves before every rig-up.');

    expect(sent.messages).toHaveLength(ROUND_ONE.length + 1);
    expect(sent.messages.map((m) => m.text)).toContain(
      'I handed off serviced equipment to specialists for FIT checks.'
    );
  });

  // THE FINDING. A second marker for the SAME role cuts everything before it.
  it('sends NOTHING from the first round once bullets have been applied', async () => {
    mount([pin(), ...ROUND_ONE, pin()]);
    const sent = await say('I also greased the sheaves before every rig-up.');

    expect(sent.messages).toEqual([
      { who: 'user', text: 'I also greased the sheaves before every rig-up.' },
    ]);
    // Said out loud, because this is the whole point: the FIT-check answer is still on
    // screen in the transcript the user is looking at. It just is not sent.
    expect(sent.messages.map((m) => m.text).join(' ')).not.toContain('FIT checks');
  });

  // Not a sliding window running out — a hard cut. The second round starts at turn one
  // however much was said before it, which is why nothing about thread LENGTH predicts it.
  it('restarts the turn count, so the cut is immediate rather than gradual', async () => {
    mount([pin(), ...ROUND_ONE, pin()]);
    const sent = await say('Something new.');
    expect(sent.buildTurns).toBe(1);
  });

  // And the bullets that DID come out of round one are on the entry, in front of her —
  // but only as CV data, never as things she was told. Pinned so that a later fix which
  // feeds them back in has a place to record that it did.
  it('carries no record of the bullets round one already produced', async () => {
    mount([pin(), ...ROUND_ONE, pin()]);
    const sent = await say('Something new.');

    const payload = JSON.stringify(sent);
    expect(payload).not.toContain('FIT checks');
    expect(payload).not.toContain('equipment faults');
  });
});
