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
let mockAddProject;
let mockRemoveEntry;
let mockApplyEntryEdit;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    activeEntry: null,
    applyEntryEdit: mockApplyEntryEdit,
    reorderEntries: vi.fn().mockResolvedValue({ ok: true }),
    requestStudioCommand: vi.fn(),
    addRole: mockAddRole,
    addProject: mockAddProject,
    addEducation: vi.fn(),
    removeEntry: mockRemoveEntry,
    updateCvData: vi.fn(),
  }),
}));

const BLANK = { _sortId: 'new-1', title: '', company: '', description: '' };

beforeEach(() => {
  i18n.changeLanguage('en');
  mockAddRole = vi.fn().mockResolvedValue('new-1');
  mockAddProject = vi.fn().mockResolvedValue('new-p1');
  mockRemoveEntry = vi.fn().mockResolvedValue({ ok: true, removed: BLANK, index: 1 });
  mockApplyEntryEdit = vi.fn().mockResolvedValue({ ok: true, found: true });
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

// THE OTHER HALF OF THAT PRUNE: it must not eat a row that was just SAVED.
//
// Reported from production, and the mirror image of the orphan above: add a role or a
// project manually, type into it, press Save — and the entry is gone. The save itself was
// fine. The prune on the way out read `cvData` from the render closure, which one tick
// after the write still holds the row as it was BEFORE the patch: blank. So it deleted it.
//
// Note what the fixture does NOT do: it never updates mockCvData after the save. That is
// the real sequencing — the editor calls onClose synchronously once applyEntryEdit
// resolves, before React has re-rendered the parent with the written values — and it is
// exactly the condition the bug needed.
describe('a row that was just saved is never pruned', () => {
  it('keeps a manually added ROLE that was filled in and saved', async () => {
    mockCvData = draftWithBlank;
    render(<StudioLivePreview />);

    fireEvent.click(addManually());
    await waitFor(() => expect(mockAddRole).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'Warehouse Assistant' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockApplyEntryEdit).toHaveBeenCalled());
    expect(mockApplyEntryEdit).toHaveBeenCalledWith('experience', 'new-1', {
      title: 'Warehouse Assistant',
    });
    expect(mockRemoveEntry).not.toHaveBeenCalled();
  });

  it('keeps a manually added PROJECT — the case with no required-section net under it', async () => {
    // Experience survived the bug whenever the section had another real role, because
    // removeEntry refuses to empty a required section. Projects are not required, so there
    // was nothing to stop the delete and the row vanished every time.
    mockCvData = {
      ...draftWithBlank,
      projects: [{ _sortId: 'new-p1', title: '', link: '', description: '' }],
    };
    render(<StudioLivePreview />);

    fireEvent.click(
      screen.getAllByText(i18n.t('ariaStudio.livePreview.addManually'))[1].closest('button')
    );
    await waitFor(() => expect(mockAddProject).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'Market scraper' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockApplyEntryEdit).toHaveBeenCalled());
    expect(mockApplyEntryEdit).toHaveBeenCalledWith('project', 'new-p1', {
      title: 'Market scraper',
    });
    expect(mockRemoveEntry).not.toHaveBeenCalled();
  });

  it('still prunes when the save was a NO-OP — a bullet marker is not content', async () => {
    // The first-bullet seed puts "• " in the box on focus. Someone who focuses it, types
    // nothing and saves has written nothing, so the blank row must still go: the patch
    // comes back empty, no write is spent, and the prune runs as it always did.
    mockCvData = draftWithBlank;
    render(<StudioLivePreview />);

    fireEvent.click(addManually());
    await waitFor(() => expect(mockAddRole).toHaveBeenCalled());

    const bullets = screen.getByLabelText('Achievements');
    fireEvent.focus(bullets);
    await waitFor(() => expect(bullets.value).toBe('• '));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockRemoveEntry).toHaveBeenCalledWith('experience', 'new-1'));
    expect(mockApplyEntryEdit).not.toHaveBeenCalled();
  });
});

// THE FIRST BULLET, before it is typed into rather than after.
describe('the bullet marker is visible from the first keystroke', () => {
  it('seeds "• " when an empty achievements box is focused', async () => {
    mockCvData = draftWithBlank;
    render(<StudioLivePreview />);
    fireEvent.click(addManually());
    await waitFor(() => expect(mockAddRole).toHaveBeenCalled());

    const bullets = screen.getByLabelText('Achievements');
    expect(bullets.value).toBe('');
    fireEvent.focus(bullets);
    await waitFor(() => expect(bullets.value).toBe('• '));

    // And the Enter marker is still the NEXT line's, not a second one on this line.
    fireEvent.change(bullets, { target: { value: '• Picked 400 orders a day' } });
    bullets.setSelectionRange(bullets.value.length, bullets.value.length);
    fireEvent.keyDown(bullets, { key: 'Enter' });
    expect(bullets.value).toBe('• Picked 400 orders a day\n• ');
  });

  it('leaves a box that already has text alone', async () => {
    mockCvData = draftWithBlank;
    render(<StudioLivePreview />);
    // Row 0 is the real role, whose description is already '• Led the notes'.
    fireEvent.click(screen.getAllByLabelText('Edit')[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit manually' }));

    const bullets = screen.getByLabelText('Achievements');
    fireEvent.focus(bullets);
    expect(bullets.value).toBe('• Led the notes');
  });
});
