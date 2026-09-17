// @vitest-environment jsdom
//
// TELLING PEOPLE THE CALL EXISTS — once, and once only.
//
// "Talk it through instead" is a quiet link under the composer, and it appears at the exact
// moment the user is reading Aria's first question and starting to type an answer. A feature
// introduced that way is a feature nobody discovers, and minutes nobody buys.
//
// So it is announced deliberately, at one moment: the entry form has just been submitted, the
// interview is about to start, and the choice between typing and talking is live and unmade.
//
// These tests hold the two halves of "once":
//   · WHERE — the build track only. Reopening a finished role to fix its bullets is not a
//     first impression, and neither is a section that cannot be called about at all.
//   · HOW OFTEN — exactly one showing per ACCOUNT, recorded the moment it is displayed rather
//     than when a button is pressed. Escape and a reload are both "I have been told".
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import { AriaStudioProvider } from '../../context/AriaStudioContext';
import UserService from '../../services/user.service';
import SectionCoach from './SectionCoach';

const live = vi.hoisted(() => ({ supported: true }));

vi.mock('../../lib/ariaLive', () => ({
  END_REASONS: { ARIA_FINISHED: 'aria_finished', USER_ENDED: 'user_ended', TIME_UP: 'time_up' },
  isAriaLiveSupported: () => live.supported,
  createAriaCall: vi.fn(),
}));

vi.mock('./AriaLiveOrb', () => ({ default: () => null }));

vi.mock('../../services/cv.service', () => ({
  default: {
    coachChat: vi.fn().mockResolvedValue({ reply: 'ok' }),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    getDraftById: vi.fn(),
    generateBullets: vi.fn(),
    studioRecompute: vi.fn(),
  },
}));

vi.mock('../../services/billing.service', () => ({
  default: { getEntitlement: vi.fn().mockResolvedValue({ ariaCall: { secondsRemaining: 0 } }) },
}));

vi.mock('../../services/user.service', () => ({
  default: {
    getProfile: vi.fn().mockResolvedValue({ settings: {} }),
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

const t = (key) => i18n.t(key);
const title = () => t('ariaStudio.ariaLive.intro.title');

const entry = {
  section: 'experience',
  sortId: 'role-1',
  title: 'Sales Assistant',
  company: 'Shoprite',
};

// The stored user is where the "have they been told" flag is read from — no profile fetch on
// mount, because a coach mounts for every entry of every build.
const storeUser = (settings) =>
  localStorage.setItem('user', JSON.stringify({ token: 'tok', settings }));

beforeEach(() => {
  live.supported = true;
  storeUser({});
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

const mount = (props = {}) => {
  const onGetMinutes = vi.fn();
  render(
    <AriaStudioProvider>
      <SectionCoach
        draftId="d1"
        entry={entry}
        messages={[{ who: 'pinrole', sortId: 'role-1', section: 'experience' }]}
        onPush={vi.fn()}
        onApply={vi.fn()}
        onDone={vi.fn()}
        careerStage="experienced"
        onGetMinutes={onGetMinutes}
        announceCall
        {...props}
      />
    </AriaStudioProvider>
  );
  return { onGetMinutes };
};

describe('the call announcement — when it appears', () => {
  it('announces the call when the build interview opens and the account has never been told', async () => {
    mount();

    expect(await screen.findByText(title())).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.intro.getMinutes'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.ariaLive.intro.keepTyping'))).toBeTruthy();
  });

  it('never announces again once the account has seen it', () => {
    storeUser({ seenAriaCallIntro: true });
    mount();

    expect(screen.queryByText(title())).toBeNull();
  });

  it('stays out of the FIX track — reopening a finished role is not a first impression', () => {
    mount({ announceCall: false });

    expect(screen.queryByText(title())).toBeNull();
  });

  it('stays out of sections that cannot be called about at all', () => {
    mount({ entry: { ...entry, section: 'education' } });

    expect(screen.queryByText(title())).toBeNull();
  });

  it('stays out where calls are unsupported — announcing a button that never renders', () => {
    live.supported = false;
    mount();

    expect(screen.queryByText(title())).toBeNull();
  });

  it('says nothing when the stored user cannot be read — showing an advert twice is worse', () => {
    localStorage.setItem('user', '{not json');
    mount();

    expect(screen.queryByText(title())).toBeNull();
  });
});

describe('the call announcement — once means once', () => {
  it('records it on the ACCOUNT the moment it is displayed, before any button is pressed', async () => {
    mount();

    await screen.findByText(title());
    await waitFor(() =>
      expect(UserService.updateSettings).toHaveBeenCalledWith({ seenAriaCallIntro: true })
    );
  });

  it('records nothing when it never showed', () => {
    storeUser({ seenAriaCallIntro: true });
    mount();

    expect(UserService.updateSettings).not.toHaveBeenCalled();
  });
});

describe('the call announcement — the two doors', () => {
  it('sends them to buy minutes, and closes', async () => {
    const { onGetMinutes } = mount();
    await screen.findByText(title());

    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.intro.getMinutes')));

    expect(onGetMinutes).toHaveBeenCalled();
    // AWAITED: the dialog animates out, so it is still in the document for the frames that
    // takes. The assertion is that it goes, not that it vanishes between two statements.
    await waitFor(() => expect(screen.queryByText(title())).toBeNull());
  });

  it('gets out of the way for someone who would rather type', async () => {
    const { onGetMinutes } = mount();
    await screen.findByText(title());

    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.intro.keepTyping')));

    await waitFor(() => expect(screen.queryByText(title())).toBeNull());
    expect(onGetMinutes).not.toHaveBeenCalled();
    // The interview it was covering is still there, waiting to be typed into.
    expect(screen.getByText(t('ariaStudio.ariaLive.talkInstead'))).toBeTruthy();
  });

  it('closes on Escape — and that still counts as having been told', async () => {
    mount();
    await screen.findByText(title());

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText(title())).toBeNull());
    expect(UserService.updateSettings).toHaveBeenCalledWith({ seenAriaCallIntro: true });
  });
});
