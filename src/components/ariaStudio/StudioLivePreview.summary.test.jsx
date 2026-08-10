// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// The SUMMARY section, editable in place on the Live Preview.
//
// Driven through StudioLivePreview rather than PreviewSummaryBlock alone, for the same
// reason the skills suite is: the contract spans both. The block draws the paragraph and
// the two controls, but the PARENT decides the section renders at all (`show`), wires the
// command channel, and — the part most worth guarding — renders NONE of it in 'preview',
// where the read-only template takes over. Mounting the block directly would assert the
// edit affordances into existence in a mode that must not have them.
//
// The two routes out are deliberately different, and the split is what these tests pin:
//   ✎ Edit          → applySummary(text)  — an inline write, start to finish.
//   Draft with Aria → a COMMAND — no write, no generation, the chat owns the rest.
let mockCvData = null;
let mockApplySummary;
let mockApplySkills;
let mockReplaceSkills;
let mockUpdateCvData;
let mockRequestStudioCommand;
let mockSelectTemplate;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    applySummary: mockApplySummary,
    applySkills: mockApplySkills,
    replaceSkills: mockReplaceSkills,
    updateCvData: mockUpdateCvData,
    requestStudioCommand: mockRequestStudioCommand,
    selectTemplate: mockSelectTemplate,
  }),
}));
// The block never imports sonner — applySummary owns the rollback AND the toast, so a
// well-meaning second toast here would double-report one failure. These spies exist to
// keep that true. (vi.hoisted: CvLanguageToggle imports sonner too, so the factory is
// hoisted above where `toastCalls` would otherwise be declared.)
const toastCalls = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastCalls }));
// Preview mode renders the production template; neither renderer is under test here.
vi.mock('../TemplatePreviewThumb', () => ({
  default: ({ templateId }) => <span data-testid={`template-thumb-${templateId}`} />,
}));
vi.mock('../CVTemplateRenderer', () => ({
  default: () => <div data-testid="production-template" />,
}));

beforeEach(() => {
  i18n.changeLanguage('en');
  mockApplySummary = vi.fn().mockResolvedValue({ ok: true });
  mockApplySkills = vi.fn().mockResolvedValue({ ok: true, added: 1 });
  mockReplaceSkills = vi.fn().mockResolvedValue({ ok: true });
  mockUpdateCvData = vi.fn();
  mockRequestStudioCommand = vi.fn();
  mockSelectTemplate = vi.fn().mockResolvedValue({ ok: true });
  Object.values(toastCalls).forEach((spy) => spy.mockClear());
  // framer-motion's useReducedMotion reads matchMedia; jsdom lacks it.
  vi.stubGlobal('matchMedia', (q) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
  // The block focuses the textarea on the next frame; jsdom has rAF, but running it
  // synchronously keeps the assertions on one tick.
  vi.stubGlobal('requestAnimationFrame', (cb) => {
    cb(0);
    return 0;
  });
});
afterEach(() => {
  cleanup();
  mockCvData = null;
});

const SUMMARY = 'Hospitality lead with eight years behind a busy front desk.';

// No experience/projects/education and a scan that scores ONLY the summary, so the summary
// is the one editable section on screen. That keeps every query below unambiguous — the
// entry rows carry their own ✎ with the same 'Edit' label.
const summaryCv = (over = {}) => ({
  _id: 'd1',
  studioKind: 'tailor', // unlocked; the build-only completeness lock is tested elsewhere
  personalInfo: { fullName: 'Ada Lovelace' },
  professionalSummary: SUMMARY,
  skills: [],
  studioScan: {
    sections: [{ key: 'summary', label: 'Summary', band: 'ok', score: 10, max: 15 }],
  },
  ...over,
});

const t = (key) => i18n.t(key);

const draftBtn = () =>
  screen.queryByRole('button', { name: t('ariaStudio.livePreview.draftSummaryWithAria') });
// Several buttons on this sheet answer to 'Edit': the view-mode toggle (the one carrying
// aria-pressed — it reports which mode is on), the contact header's ✎, and the summary's.
// The summary's is identified by the company it keeps: it shares a controls row with
// "Draft with Aria", which is the very adjacency the first test below asserts. Anchoring
// there rather than on document order means a new ✎ appearing elsewhere on the sheet
// can't be silently swapped in for this one — which is exactly what happened when the
// contact header became editable above it.
const editBtn = () => {
  const candidates = screen
    .queryAllByRole('button', { name: t('ariaStudio.livePreview.editEntry') })
    .filter((b) => !b.hasAttribute('aria-pressed'));
  const draft = draftBtn();
  if (!draft) return null;
  return candidates.find((b) => b.parentElement === draft.parentElement) || null;
};
const editor = () => screen.queryByLabelText(t('ariaStudio.livePreview.summaryPlaceholder'));
const saveBtn = () => screen.getByRole('button', { name: t('ariaStudio.livePreview.saveEdit') });
const cancelBtn = () => screen.getByRole('button', { name: t('common.cancel') });
const type = (value) => fireEvent.change(editor(), { target: { value } });

describe('StudioLivePreview — the summary in edit mode', () => {
  it('shows the summary with both controls beside it', () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);

    expect(screen.getByText(SUMMARY)).toBeTruthy();
    // Manual first, Aria second: typing your own is free and instant, hers is a paid
    // round trip. Both present, neither instead of the other.
    expect(editBtn()).toBeTruthy();
    expect(draftBtn()).toBeTruthy();
    // Nothing is open until asked for.
    expect(editor()).toBeNull();
  });

  it('renders the placeholder, still editable, when there is no summary yet', () => {
    mockCvData = summaryCv({ professionalSummary: '' });
    render(<StudioLivePreview />);

    expect(screen.getByText(t('ariaStudio.livePreview.noSummaryYet'))).toBeTruthy();
    // The empty state is exactly where these two controls matter most, so it must not be
    // the state that loses them.
    expect(editBtn()).toBeTruthy();
    expect(draftBtn()).toBeTruthy();
  });
});

describe('StudioLivePreview — the summary, manual edit', () => {
  it('opens a textarea seeded from the current summary', () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);

    fireEvent.click(editBtn());

    // Seeded, so an edit starts from what's there rather than from a blank box the user
    // would have to retype the whole paragraph into.
    expect(editor().value).toBe(SUMMARY);
    // The editor REPLACES the paragraph and the controls — one summary, one state at a
    // time. Pinned to the <p> selector because a textarea's value IS its text content, so
    // an unscoped text query would match the editor itself and never fail.
    expect(screen.queryByText(SUMMARY, { selector: 'p' })).toBeNull();
    expect(draftBtn()).toBeNull();
  });

  it('opens EMPTY when there is no summary yet — not seeded with the placeholder', () => {
    mockCvData = summaryCv({ professionalSummary: '' });
    render(<StudioLivePreview />);

    fireEvent.click(editBtn());

    // The placeholder is a label for absence, not content. Seeding it would put Aria's
    // words in the user's CV the moment they pressed Save.
    expect(editor().value).toBe('');
  });

  it('saves the typed text through applySummary, trimmed, and closes', async () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);
    fireEvent.click(editBtn());

    type('  Front-of-house lead who runs a calm, fast desk.  ');
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockApplySummary).toHaveBeenCalledTimes(1));
    expect(mockApplySummary).toHaveBeenCalledWith(
      'Front-of-house lead who runs a calm, fast desk.'
    );
    // The write goes through the provider's writer alone — no second path to the draft.
    expect(mockUpdateCvData).not.toHaveBeenCalled();
    await waitFor(() => expect(editor()).toBeNull());
  });

  it('keeps the editor open — with the typed text — when the save fails', async () => {
    mockApplySummary.mockResolvedValue({ ok: false });
    mockCvData = summaryCv();
    render(<StudioLivePreview />);
    fireEvent.click(editBtn());

    type('A summary that never lands.');
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockApplySummary).toHaveBeenCalledTimes(1));
    // applySummary has already rolled back and toasted. Closing on top of that would
    // throw the user's text away and show them the OLD summary as if nothing happened.
    expect(editor()).toBeTruthy();
    expect(editor().value).toBe('A summary that never lands.');
    // And the failure is reported once, by the writer — not again from here.
    expect(toastCalls.error).not.toHaveBeenCalled();
  });

  it('discards on Cancel — no write', () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);
    fireEvent.click(editBtn());
    type('Half a thought');

    fireEvent.click(cancelBtn());

    expect(mockApplySummary).not.toHaveBeenCalled();
    expect(editor()).toBeNull();
    expect(screen.getByText(SUMMARY)).toBeTruthy();
  });

  it('discards on Escape — no write', () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);
    fireEvent.click(editBtn());
    type('Half a thought');

    fireEvent.keyDown(editor(), { key: 'Escape' });

    expect(mockApplySummary).not.toHaveBeenCalled();
    expect(editor()).toBeNull();
    expect(screen.getByText(SUMMARY)).toBeTruthy();
  });

  it('re-seeds from the summary on the NEXT open, so a cancelled edit leaves nothing behind', () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);
    fireEvent.click(editBtn());
    type('Abandoned draft');
    fireEvent.click(cancelBtn());

    fireEvent.click(editBtn());

    expect(editor().value).toBe(SUMMARY);
  });

  it('does NOT save on Enter — the summary is prose, so a newline stays a newline', () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);
    fireEvent.click(editBtn());
    type('First line.');

    fireEvent.keyDown(editor(), { key: 'Enter' });

    // Nothing is bound to Enter, so the browser's own newline is what happens; Save is the
    // button. Hijacking it would make a paragraph break impossible to type.
    expect(mockApplySummary).not.toHaveBeenCalled();
    expect(editor()).toBeTruthy();
  });
});

describe('StudioLivePreview — "Draft with Aria" on the summary', () => {
  it('sends draftSummary for the SECTION, with no sortId, and writes nothing', () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);

    fireEvent.click(draftBtn());

    // A section-level command, exactly like suggestSkills: the null sortId is what the
    // chat's entry-level branches are guarded against falling into.
    expect(mockRequestStudioCommand).toHaveBeenCalledTimes(1);
    expect(mockRequestStudioCommand).toHaveBeenCalledWith('draftSummary', 'summary', null);
    // A REQUEST, not a generation. Nothing is written and nothing is bought from here.
    expect(mockApplySummary).not.toHaveBeenCalled();
    expect(mockUpdateCvData).not.toHaveBeenCalled();
  });

  it('closes the SHEET after handing over, so the chat it just opened is visible', () => {
    mockCvData = summaryCv();
    const onClose = vi.fn();
    render(<StudioLivePreview isSheet onClose={onClose} />);

    fireEvent.click(draftBtn());

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('draftSummary', 'summary', null);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays OPEN on the inline desktop panel', () => {
    mockCvData = summaryCv();
    const onClose = vi.fn();
    render(<StudioLivePreview isSheet={false} onClose={onClose} />);

    fireEvent.click(draftBtn());

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('draftSummary', 'summary', null);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('StudioLivePreview — none of it exists in preview mode', () => {
  it('drops both controls for the template render', () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);
    expect(editBtn()).toBeTruthy();
    expect(draftBtn()).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: t('ariaStudio.livePreview.previewMode') }));

    // Preview is the document as it will be downloaded; a ✎ is not part of that document.
    expect(screen.getByTestId('production-template')).toBeTruthy();
    expect(editBtn()).toBeNull();
    expect(draftBtn()).toBeNull();
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
  });

  it('leaves an open editor behind when the user switches to preview', () => {
    mockCvData = summaryCv();
    render(<StudioLivePreview />);
    fireEvent.click(editBtn());
    type('Never saved');

    fireEvent.click(screen.getByRole('button', { name: t('ariaStudio.livePreview.previewMode') }));

    expect(editor()).toBeNull();
    expect(mockApplySummary).not.toHaveBeenCalled();
  });
});
