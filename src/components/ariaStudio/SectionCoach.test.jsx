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

/**
 * THE ENTRY-LEVEL ENTRY TYPE — an internship inside an 'experienced' session.
 *
 * The session stage says "experienced", but the ENTRY is an internship. The backend now
 * coaches that gently (any non-'job' experience type resolves to the grad prompt), and this
 * component's defensive strip has to agree with it. If the two disagree, a provider that
 * slips back into metric framing gets its QUESTION stripped server-side while a metric
 * STARTER CHIP sails through the client — and the user is still being asked for revenue
 * figures from an internship, just by a button instead of a sentence.
 *
 * The strip is only ever a backstop for that slip, so the mock returns exactly it.
 */
describe('SectionCoach — gentle coaching follows the ENTRY TYPE, not just the session stage', () => {
  const SLIP = {
    reply: 'What percentage did you improve efficiency by?',
    suggestions: ['I improved efficiency by ___%', 'I was trusted with ___'],
    exampleAnswer: 'Cut processing time by 30% by rebuilding the intake sheet',
    readyToDraft: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    CVService.coachChat.mockResolvedValue(SLIP);
  });
  afterEach(cleanup);

  const pushedTexts = (onPush) => onPush.mock.calls.flat().map((m) => m?.text);

  it('strips the metric reply, starter and example for an internship in an experienced session', async () => {
    const { onPush } = setup({
      entry: { ...entry, title: 'Operations Intern', entryType: 'internship' },
      careerStage: 'experienced',
    });
    send('I shadowed the ops team and ran the daily handover');

    await waitFor(() => expect(onPush.mock.calls.length).toBeGreaterThan(1));

    // 1. The REPLY is swapped for the gentle follow-up, not passed through.
    expect(pushedTexts(onPush)).toContain(i18n.t('ariaStudio.sectionCoach.gradFollowUp'));
    expect(pushedTexts(onPush)).not.toContain(SLIP.reply);

    // 2. The metric STARTER is filtered out; the safe one survives — the strip must not
    //    take the whole rail down and leave the user staring at a blank prompt.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'I was trusted with ___' })).toBeTruthy()
    );
    expect(screen.queryByRole('button', { name: 'I improved efficiency by ___%' })).toBeNull();

    // 3. No worked EXAMPLE: its toggle only renders when one survived the strip.
    expect(
      screen.queryByRole('button', { name: i18n.t('cvBuilder.askAria.showExample') })
    ).toBeNull();
  });

  it("REGRESSION: a real 'job' in the same session keeps the metric framing", async () => {
    // The narrowing this must NOT cause. An experienced professional's actual job is
    // exactly where the metric question belongs, so nothing here is touched.
    const { onPush } = setup({
      entry: { ...entry, entryType: 'job' },
      careerStage: 'experienced',
    });
    send('I led the migration');

    await waitFor(() => expect(onPush.mock.calls.length).toBeGreaterThan(1));

    expect(pushedTexts(onPush)).toContain(SLIP.reply);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'I improved efficiency by ___%' })).toBeTruthy()
    );
    expect(
      screen.getByRole('button', { name: i18n.t('cvBuilder.askAria.showExample') })
    ).toBeTruthy();
  });

  it('leaves an entry with no captured type to the session stage alone', async () => {
    // Older entries carry no entryType at all — they must behave exactly as before.
    const { onPush } = setup({ careerStage: 'experienced' });
    send('I led the migration');

    await waitFor(() => expect(onPush.mock.calls.length).toBeGreaterThan(1));
    expect(pushedTexts(onPush)).toContain(SLIP.reply);
  });

  it('GUARD: a project entry is unaffected — project types are a different vocabulary', async () => {
    // 'course' | 'personal' | 'work' are PROJECT types, not experience ones, so they must
    // never be read as an entry-level experience type. Only careerStage softens a project.
    const { onPush } = setup({
      entry: { section: 'project', sortId: 'p1', title: 'Route planner', entryType: 'course' },
      careerStage: 'experienced',
    });
    send('I built a route planner for the depot');

    await waitFor(() => expect(onPush.mock.calls.length).toBeGreaterThan(1));
    expect(pushedTexts(onPush)).toContain(SLIP.reply);
  });

  it("still strips for a 'grad' session on a plain job — the stage path is intact", async () => {
    const { onPush } = setup({ entry: { ...entry, entryType: 'job' }, careerStage: 'grad' });
    send('I helped rebuild the intake sheet');

    await waitFor(() => expect(onPush.mock.calls.length).toBeGreaterThan(1));
    expect(pushedTexts(onPush)).toContain(i18n.t('ariaStudio.sectionCoach.gradFollowUp'));
  });
});
