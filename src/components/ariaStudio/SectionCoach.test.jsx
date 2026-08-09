// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, waitFor, fireEvent } from '@testing-library/react';
import i18n from '../../i18n';
import { AriaStudioProvider } from '../../context/AriaStudioContext';
import SectionCoach from './SectionCoach';

/**
 * THE IN-FLIGHT DELETE — /coach/chat 404.
 *
 * The user is mid-interview on a role and deletes that same role from the Live Preview
 * while a turn is still in flight. The backend can no longer resolve the entry and answers
 * 404 "That role is no longer in your CV" (no `code`, so it's matched on status alone).
 *
 * That is NOT a failure worth a red toast — the deletion was deliberate. The coach should
 * say what happened and close cleanly via onDone(null), the "backed out, nothing applied"
 * contract that finishFix early-returns on.
 */

vi.mock('../../services/cv.service', () => ({
  default: {
    coachChat: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    getDraftById: vi.fn(),
    generateBullets: vi.fn(),
    studioRecompute: vi.fn(),
  },
}));

vi.mock('sonner', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  toast.info = vi.fn();
  return { toast };
});

import CVService from '../../services/cv.service';
import { toast } from 'sonner';

const entry = { section: 'experience', sortId: 'role-1', title: 'Engineer', company: 'Acme' };

const setup = (props = {}) => {
  const onPush = vi.fn();
  const onDone = vi.fn();
  render(
    <AriaStudioProvider>
      <SectionCoach
        draftId="d1"
        entry={entry}
        messages={[]}
        onPush={onPush}
        onApply={vi.fn()}
        onDone={onDone}
        careerStage="mid"
        {...props}
      />
    </AriaStudioProvider>
  );
  return { onPush, onDone };
};

// Type into the composer and hit send. fireEvent, not user-event — the latter isn't a
// dependency of this project, and a change + click is all the composer needs.
const send = (text) => {
  fireEvent.change(
    screen.getByPlaceholderText(i18n.t('ariaStudio.sectionCoach.activityPlaceholder')),
    { target: { value: text } }
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('ariaStudio.sectionCoach.send') }));
};

describe('SectionCoach — entry deleted while a turn is in flight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('pushes entryGone and closes with onDone(null) on a 404, with no error toast', async () => {
    CVService.coachChat.mockRejectedValueOnce({ response: { status: 404 } });

    const { onPush, onDone } = setup();
    send('I led the migration');

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    // Said what happened, in Aria's voice, using the real locale string.
    const pushed = onPush.mock.calls.flat();
    expect(
      pushed.some(
        (m) => m?.who === 'aria' && m?.text === i18n.t('ariaStudio.sectionCoach.entryGone')
      )
    ).toBe(true);

    // Clean close: null is "backed out, nothing applied".
    expect(onDone).toHaveBeenCalledWith(null);

    // And NOT the generic error path.
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('still uses the generic error toast for a non-404 failure', async () => {
    CVService.coachChat.mockRejectedValueOnce({ response: { status: 500 } });

    const { onDone } = setup();
    send('I led the migration');

    // A real failure keeps its toast, and does NOT close the coach.
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onDone).not.toHaveBeenCalled();
  });
});
