// @vitest-environment jsdom
//
// THE COMPOSER BAR under a section interview. It used to carry three unlike things in one
// row — a nav link, the job's keywords, and a turn counter — and two of them were wrong:
//
//   · "← Back to sections" called onDone(null). The FIX loop acts on that (finishFix
//     early-returns to the breakdown); the BUILD track's handler does everything inside
//     `if (result?.applied?.length)`, so on the build track the button did nothing at all.
//     It now has its own prop and is simply not rendered where there is nothing to go back
//     to — the build track exits through the pinned card's "next role" / "done".
//
//   · The keyword line was the job's must-haves on the build track: the same two terms under
//     every role for the whole build, not measured and not entry-specific. Only the fix loop
//     has real gaps, and the composer is the ONLY place they are ever shown (the "Fixing
//     Experience" divider names the section and stops). So it moved out of the chrome row
//     into the note above the input, complete rather than truncated to two.
//
// A separate file from SectionCoach.test.jsx, which carries pre-existing failures unrelated
// to any of this — same convention as SkillsCard.hunted.test.jsx beside SkillsCard.review.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import { AriaStudioProvider } from '../../context/AriaStudioContext';
import SectionCoach from './SectionCoach';

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

afterEach(cleanup);

const entry = { section: 'experience', sortId: 'role-1', title: 'Engineer', company: 'Acme' };

const setup = (props = {}) => {
  const onDone = vi.fn();
  const view = render(
    <AriaStudioProvider>
      <SectionCoach
        draftId="d1"
        entry={entry}
        messages={[]}
        onPush={vi.fn()}
        onApply={vi.fn()}
        onDone={onDone}
        careerStage="experienced"
        {...props}
      />
    </AriaStudioProvider>
  );
  return { onDone, ...view };
};

const BACK = () => `← ${i18n.t('ariaStudio.sectionCoach.backToSections')}`;

describe('SectionCoach composer — the back button follows onBack, not onDone', () => {
  it('renders no back button on a surface that did not supply one', () => {
    // The build track. Its exits live on the pinned card; a button here did nothing.
    setup();
    expect(screen.queryByText(BACK())).toBeNull();
  });

  it('renders it and calls onBack when the surface can go back', () => {
    const onBack = vi.fn();
    const { onDone } = setup({ onBack });

    fireEvent.click(screen.getByText(BACK()));

    expect(onBack).toHaveBeenCalledTimes(1);
    // The overload is gone: backing out no longer pretends to be a finished interview.
    expect(onDone).not.toHaveBeenCalled();
  });

});

// The turn budget belongs to the AI CONVERSATION, not the CV — the server turns it into a
// hard "wrap this up now". As a permanent "1/10" it read like a score, and it now sits next
// to a real progress number in the top bar. So it only speaks near the limit.
describe('SectionCoach composer — the turn budget is a wrap-up warning, not a counter', () => {
  // Turns are DERIVED from the transcript, not counted in a ref: user messages after the
  // marker that opened this coach session (`pinrole` on the build track).
  const withTurns = (n) => [
    { who: 'pinrole', sortId: entry.sortId, section: 'experience' },
    ...Array.from({ length: n }, (_, i) => [
      { who: 'aria', text: `q${i}` },
      { who: 'user', text: `a${i}` },
    ]).flat(),
  ];

  const left = (n) => i18n.t('ariaStudio.sectionCoach.questionsLeft', { count: n });

  it('says nothing early on', () => {
    setup({ messages: withTurns(2) });
    expect(screen.queryByText(/question/i)).toBeNull();
  });

  it('warns once the limit is close', () => {
    setup({ messages: withTurns(7) });
    expect(screen.getByText(left(3))).toBeTruthy();
  });

  it('counts down, and uses the singular on the last one', () => {
    setup({ messages: withTurns(9) });
    expect(screen.getByText(left(1))).toBeTruthy();
    expect(left(1)).not.toMatch(/questions/);
  });

  it('never goes negative if the transcript runs past the cap', () => {
    setup({ messages: withTurns(14) });
    expect(screen.getByText(left(0))).toBeTruthy();
  });

  it('renders no footer row at all when there is nothing to put in it', () => {
    // Build track, early turns: no back button and no warning. An empty flex row would
    // still occupy vertical space under the input.
    const { container } = setup({ messages: withTurns(1) });
    expect(container.querySelector('[data-coach-footer]')).toBeNull();
  });

  it('renders the row again as soon as it has something to say', () => {
    const { container } = setup({ messages: withTurns(8) });
    expect(container.querySelector('[data-coach-footer]')).not.toBeNull();
  });
});

describe('SectionCoach composer — the gap line', () => {
  const GAPS = ['Kubernetes', 'Terraform', 'GraphQL'];

  it('names every gap, not the first two', () => {
    // The old footer sliced to 2, so a section marked down for three terms only ever
    // admitted to two of them.
    setup({ missingKeywords: GAPS });

    expect(
      screen.getByText(i18n.t('ariaStudio.sectionCoach.aimingAt', { keywords: GAPS.join(', ') }))
    ).toBeTruthy();
  });

  it('renders nothing at all when there are no measured gaps', () => {
    // The build track's case, now that it passes none.
    setup();
    expect(screen.queryByText(/Aiming at/i)).toBeNull();
  });

  it('sits ABOVE the input, not in the footer row with the counter', () => {
    setup({ missingKeywords: GAPS, onBack: vi.fn() });

    const line = screen.getByText(
      i18n.t('ariaStudio.sectionCoach.aimingAt', { keywords: GAPS.join(', ') })
    );
    const back = screen.getByText(BACK());

    // Document order is the assertion: the gap line precedes the footer's controls.
    expect(line.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // ...and it is its own line, not a sibling squeezed in beside them.
    expect(line.parentElement).not.toBe(back.parentElement);
  });
});
