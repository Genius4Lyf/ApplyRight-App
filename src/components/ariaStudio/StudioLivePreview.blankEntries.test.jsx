// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// "ADD MANUALLY" MUST NOT LEAVE A ROW BEHIND.
//
// Reported from production: a user tapped add-a-role a few times, changed their mind, and
// ended up with four blocks in their rendered CV reading "Role / Company | -" that they
// could not get rid of.
//
// Two things made that possible. The add persists a REAL, blank entry immediately, so an
// abandoned one survives a refresh. And the only cleanup — closeEdit's prune — was bypassed
// by every handover that set the open-editor id directly: a second "Add manually", another
// row's ✎, and unmounting the panel. Four taps, four persisted blanks.
//
// The rows were then invisible exactly where they could have been deleted, because this
// panel filters placeholders out at read time while the rendered CV did not.
let mockCvData = null;
let mockAddRole;
let mockRemoveEntry;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    activeEntry: null,
    applyEntryEdit: vi.fn().mockResolvedValue({ ok: true, found: true }),
    reorderEntries: vi.fn().mockResolvedValue({ ok: true }),
    requestStudioCommand: vi.fn(),
    addRole: mockAddRole,
    addProject: vi.fn(),
    addEducation: vi.fn(),
    removeEntry: mockRemoveEntry,
    updateCvData: vi.fn(),
  }),
}));

const BLANK = { _sortId: 'new-1', title: '', company: '', description: '' };

beforeEach(() => {
  i18n.changeLanguage('en');
  mockAddRole = vi.fn().mockResolvedValue('new-1');
  mockRemoveEntry = vi.fn().mockResolvedValue({ ok: true, removed: BLANK, index: 1 });
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

// One real role plus the blank the first "Add manually" just persisted, which is the state
// the panel is in while its editor is open on that blank.
const draftWithBlank = {
  _id: 'd1',
  studioKind: 'tailor', // unlocked; the build completeness lock is tested elsewhere
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [
    { _sortId: 'exp-a', title: 'Analyst', company: 'RSA', description: '• Led the notes' },
    BLANK,
  ],
  projects: [],
  education: [{ _sortId: 'edu-a', degree: 'BSc', school: 'UCL' }],
  studioScan: null,
};

const addManually = () =>
  screen.getAllByText(i18n.t('ariaStudio.livePreview.addManually'))[0].closest('button');

describe('an abandoned blank is never left in the document', () => {
  it('prunes the open blank when a SECOND add is started', async () => {
    // The bug, at its simplest: tap "Add manually" twice. The first blank was persisted
    // and then orphaned, because opening the second editor set the id directly.
    mockAddRole = vi.fn().mockResolvedValueOnce('new-1').mockResolvedValueOnce('new-2');
    mockCvData = draftWithBlank;
    render(<StudioLivePreview />);

    fireEvent.click(addManually());
    await waitFor(() => expect(mockAddRole).toHaveBeenCalledTimes(1));
    expect(mockRemoveEntry).not.toHaveBeenCalled(); // nothing to prune yet

    fireEvent.click(addManually());

    await waitFor(() => expect(mockRemoveEntry).toHaveBeenCalledWith('experience', 'new-1'));
  });

  it('prunes it when the panel is closed entirely', async () => {
    // A fourth route to the same orphan, and the one closeEdit could never have caught:
    // the component is already gone by the time it would have run.
    mockCvData = draftWithBlank;
    const { unmount } = render(<StudioLivePreview />);

    fireEvent.click(addManually());
    await waitFor(() => expect(mockAddRole).toHaveBeenCalled());
    mockRemoveEntry.mockClear();

    unmount();

    expect(mockRemoveEntry).toHaveBeenCalledWith('experience', 'new-1');
  });

  it('leaves a row that has something in it ALONE', async () => {
    // The prune must key on content, not on newness. A row someone has actually typed into
    // is theirs, and deleting it on the way past would be far worse than the blank.
    mockAddRole = vi.fn().mockResolvedValueOnce('new-1').mockResolvedValueOnce('new-2');
    mockCvData = {
      ...draftWithBlank,
      experience: [
        draftWithBlank.experience[0],
        { _sortId: 'new-1', title: 'Warehouse Assistant', company: '', description: '' },
      ],
    };
    render(<StudioLivePreview />);

    fireEvent.click(addManually());
    await waitFor(() => expect(mockAddRole).toHaveBeenCalledTimes(1));
    fireEvent.click(addManually());
    await waitFor(() => expect(mockAddRole).toHaveBeenCalledTimes(2));

    expect(mockRemoveEntry).not.toHaveBeenCalled();
  });
});
