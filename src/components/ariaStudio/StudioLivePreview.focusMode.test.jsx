// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, cleanup, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// Slice 3e — the RECEIVING end of focus mode: the preview marks the row Aria is on and
// LOCKS it, so the entry she's mid-interview about can't be dragged, reordered, hand-edited
// or deleted out from under her.
//
// Driven through StudioLivePreview rather than PreviewEntryRow alone, for the reason the
// rest of this suite is: the contract spans both. The row draws the marker, but the PARENT
// decides which row is active (matching on _sortId across all three lists) and owns the
// manual editor the lock has to win against. Mounting the row directly would let the test
// hand-write the very thing under test.
let mockCvData = null;
let mockActiveEntry = null;
let mockApplyEdit;
let mockReorderEntries;
let mockRequestStudioCommand;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    activeEntry: mockActiveEntry,
    applyEntryEdit: mockApplyEdit,
    reorderEntries: mockReorderEntries,
    requestStudioCommand: mockRequestStudioCommand,
  }),
}));

beforeEach(() => {
  i18n.changeLanguage('en');
  mockActiveEntry = null;
  mockApplyEdit = vi.fn().mockResolvedValue({ ok: true, found: true });
  mockReorderEntries = vi.fn().mockResolvedValue({ ok: true });
  mockRequestStudioCommand = vi.fn();
  vi.stubGlobal('matchMedia', (q) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
});
afterEach(() => {
  cleanup();
  mockCvData = null;
});

// TWO experience entries, so the reorder controls are rendered at all (a lone entry has
// nothing to reorder) and the locked row can be compared against an untouched sibling in
// the same list. A project as well, to prove the match is by _sortId across every list.
const draft = {
  _id: 'd1',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [
    {
      _sortId: 'exp-a',
      title: 'Analyst',
      company: 'RSA',
      startDate: 'Jan 2020',
      endDate: 'Dec 2021',
      description: '• Led the notes',
    },
    { _sortId: 'exp-b', title: 'Engineer', company: 'Acme', description: '• Shipped one' },
  ],
  projects: [{ _sortId: 'proj-a', title: 'Difference Engine', description: '• Built it' }],
  studioScan: null,
};

const MARKER = () => i18n.t('ariaStudio.livePreview.ariaIsHere');
const marks = () => screen.queryAllByText(MARKER());
// The row is the marker's own container — no counting past sections to find it.
const activeRow = () => screen.getByText(MARKER()).closest('.group');

const grips = () => screen.queryAllByLabelText(i18n.t('common.sortable.dragToReorder'));
const pencils = () => screen.queryAllByLabelText(i18n.t('ariaStudio.livePreview.editEntry'));

describe('StudioLivePreview — marking the entry Aria is on', () => {
  it('marks NOTHING when no interview is open', () => {
    mockCvData = draft;
    render(<StudioLivePreview />);

    expect(marks()).toHaveLength(0);
    // Every row is fully operable: three entries, three ✎ / trash.
    expect(pencils()).toHaveLength(3);
  });

  it('marks exactly the matching row', () => {
    mockCvData = draft;
    mockActiveEntry = { section: 'experience', sortId: 'exp-a' };
    render(<StudioLivePreview />);

    expect(marks()).toHaveLength(1);
    expect(within(activeRow()).getByText(/Analyst/)).toBeTruthy();
  });

  // sortId alone addresses a row — ids are unique across the whole document — so the same
  // match has to work in the projects list, not just the first one rendered.
  it('marks a PROJECT row just as well', () => {
    mockCvData = draft;
    mockActiveEntry = { section: 'project', sortId: 'proj-a' };
    render(<StudioLivePreview />);

    expect(marks()).toHaveLength(1);
    expect(within(activeRow()).getByText(/Difference Engine/)).toBeTruthy();
  });

  // The whole point: the user must still SEE the entry Aria is discussing while she
  // discusses it. Only the controls go.
  it('leaves the row CONTENT fully visible', () => {
    mockCvData = draft;
    mockActiveEntry = { section: 'experience', sortId: 'exp-a' };
    render(<StudioLivePreview />);

    const row = activeRow();
    expect(within(row).getByText(/Analyst/)).toBeTruthy();
    expect(within(row).getByText(/RSA/)).toBeTruthy();
    expect(within(row).getByText('Led the notes')).toBeTruthy();
    expect(within(row).getByText(/Jan 2020/)).toBeTruthy();
  });
});

describe('StudioLivePreview — locking the active row', () => {
  it('drops the ENTIRE control cluster on that row', () => {
    mockCvData = draft;
    mockActiveEntry = { section: 'experience', sortId: 'exp-a' };
    render(<StudioLivePreview />);

    const row = activeRow();
    // The grip is what dnd-kit hangs its drag listeners on — no grip, no drag.
    expect(within(row).queryByLabelText(i18n.t('common.sortable.dragToReorder'))).toBeNull();
    expect(within(row).queryByLabelText(i18n.t('common.sortable.moveUp'))).toBeNull();
    expect(within(row).queryByLabelText(i18n.t('common.sortable.moveDown'))).toBeNull();
    expect(within(row).queryByLabelText(i18n.t('ariaStudio.livePreview.editEntry'))).toBeNull();
    expect(within(row).queryByLabelText(i18n.t('ariaStudio.livePreview.removeEntry'))).toBeNull();
  });

  it('leaves every OTHER row untouched', () => {
    mockCvData = draft;
    mockActiveEntry = { section: 'experience', sortId: 'exp-a' };
    render(<StudioLivePreview />);

    // One of the two experience rows keeps its reorder controls; both remaining entries
    // keep their ✎ and trash.
    expect(grips()).toHaveLength(1);
    expect(pencils()).toHaveLength(2);

    // And the sibling is still fully operable — its ✎ opens, not a locked no-op.
    fireEvent.click(pencils()[0]);
    expect(
      screen.queryByRole('menuitem', { name: i18n.t('ariaStudio.livePreview.editManually') })
    ).toBeTruthy();
    expect(
      screen.queryByRole('menuitem', { name: i18n.t('ariaStudio.livePreview.removeEntry') })
    ).toBeTruthy();
  });

  it('unmarks and unlocks the instant the interview closes', () => {
    mockCvData = draft;
    mockActiveEntry = { section: 'experience', sortId: 'exp-a' };
    const { rerender } = render(<StudioLivePreview />);
    expect(marks()).toHaveLength(1);

    mockActiveEntry = null;
    rerender(<StudioLivePreview />);

    expect(marks()).toHaveLength(0);
    expect(pencils()).toHaveLength(3);
    expect(grips()).toHaveLength(2);
  });
});

describe('StudioLivePreview — the lock outranks the manual editor', () => {
  // An entry Aria has just taken over shouldn't sit in a half-typed manual form: the two
  // would be writing the same fields from different places.
  it('kicks the row OUT of the inline editor when it becomes active', async () => {
    mockCvData = draft;
    // rerender, NOT a second render: editingSortId is this component's own state, and a
    // fresh mount would have no editor open to kick out — the test would pass vacuously.
    const { rerender } = render(<StudioLivePreview />);

    // Open the manual editor on the first experience row.
    fireEvent.click(pencils()[0]);
    fireEvent.click(
      screen.getByRole('menuitem', { name: i18n.t('ariaStudio.livePreview.editManually') })
    );
    await waitFor(() => expect(screen.getByLabelText('Role')).toBeTruthy());

    // Aria takes that same entry.
    mockActiveEntry = { section: 'experience', sortId: 'exp-a' };
    rerender(<StudioLivePreview />);

    // The editor is gone and the row is back, marked and locked.
    await waitFor(() => expect(screen.queryByLabelText('Role')).toBeNull());
    expect(marks()).toHaveLength(1);
    expect(within(activeRow()).getByText(/Analyst/)).toBeTruthy();
    // Nothing was written on the way out — the lock closes the form, it doesn't submit it.
    expect(mockApplyEdit).not.toHaveBeenCalled();
  });

  // A DIFFERENT row going active is none of the editor's business.
  it('leaves an unrelated open editor alone', async () => {
    mockCvData = draft;
    const { rerender } = render(<StudioLivePreview />);

    fireEvent.click(pencils()[0]);
    fireEvent.click(
      screen.getByRole('menuitem', { name: i18n.t('ariaStudio.livePreview.editManually') })
    );
    await waitFor(() => expect(screen.getByLabelText('Role')).toBeTruthy());

    mockActiveEntry = { section: 'project', sortId: 'proj-a' };
    rerender(<StudioLivePreview />);

    expect(screen.getByLabelText('Role')).toBeTruthy();
    expect(marks()).toHaveLength(1);
  });
});
