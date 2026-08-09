// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// Slice 3c-i: editing a Live Preview entry MANUALLY, inline on the sheet.
//
// Driven through StudioLivePreview rather than PreviewEntryEditor in isolation, because
// the contract under test spans both: the ✎ on the row, the parent's one-at-a-time edit
// state, and the narrow patch that reaches applyEntryEdit. Mounting the editor directly
// would let the section token (the recurring 'project'-singular trap) be typed by hand in
// the test instead of threaded by the code that actually has to get it right.
let mockCvData = null;
let mockApplyEdit;
let mockReorderEntries;
let mockRequestStudioCommand;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    applyEntryEdit: mockApplyEdit,
    reorderEntries: mockReorderEntries,
    requestStudioCommand: mockRequestStudioCommand,
  }),
}));

beforeEach(() => {
  i18n.changeLanguage('en');
  mockApplyEdit = vi.fn().mockResolvedValue({ ok: true, found: true });
  mockReorderEntries = vi.fn().mockResolvedValue({ ok: true });
  mockRequestStudioCommand = vi.fn();
  // framer-motion's useReducedMotion reads matchMedia; jsdom lacks it.
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

const twoRoles = {
  _id: 'd1',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [
    {
      _sortId: 'a',
      title: 'Analyst',
      company: 'RSA',
      startDate: 'Jan 2020',
      endDate: 'Dec 2021',
      description: '• Led the notes',
    },
    { _sortId: 'b', title: 'Builder', company: 'BBC', description: '• Built it' },
  ],
  studioScan: null,
};

// Open the inline MANUAL editor on row `i`.
//
// 3c-ii turned the ✎ into a two-choice popover on experience/project rows, so reaching the
// manual editor is now two clicks there. Education has no interview to offer, so its ✎
// still goes straight in — hence the conditional rather than an unconditional second click.
const openRow = (i = 0) => {
  fireEvent.click(screen.getAllByLabelText('Edit')[i]);
  const manual = screen.queryByRole('menuitem', { name: 'Edit manually' });
  if (manual) fireEvent.click(manual);
};

const titleInput = () => screen.getByLabelText('Role');
const bulletsInput = () => screen.getByLabelText('Achievements');
const saveBtn = () => screen.getByRole('button', { name: 'Save' });

describe('StudioLivePreview — the ✎ control', () => {
  it('offers an Edit control on every entry row', () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    expect(screen.getAllByLabelText('Edit')).toHaveLength(2);
  });

  it('offers Edit on a SINGLE-entry section — editing is independent of reorder', () => {
    // The row hides its chevrons when there's nothing to reorder; being alone in a section
    // has no bearing on whether the entry can be corrected.
    mockCvData = {
      ...twoRoles,
      experience: [{ _sortId: 'only', title: 'Analyst', company: 'RSA' }],
    };
    render(<StudioLivePreview />);
    expect(screen.queryByLabelText('Move up')).toBeNull();
    expect(screen.getByLabelText('Edit')).toBeTruthy();
  });

  it('opens the editor IN PLACE — not a dialog, and the read-only row is gone', () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);

    expect(titleInput().value).toBe('Analyst');
    expect(screen.queryByRole('dialog')).toBeNull();
    // The edited row's own markup and controls are replaced wholesale, so there is no
    // grip to drag mid-edit. The OTHER row is untouched.
    expect(screen.getAllByLabelText('Edit')).toHaveLength(1);
    expect(screen.getByText(/Builder/)).toBeTruthy();
  });

  it('edits ONE row at a time — opening another closes the first', () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    expect(titleInput().value).toBe('Analyst');

    openRow(0); // the only ✎ left belongs to the other row
    expect(titleInput().value).toBe('Builder');
    expect(screen.getAllByLabelText('Role')).toHaveLength(1);
  });
});

describe('StudioLivePreview — saving an inline edit', () => {
  it('sends EXACTLY the changed fields to applyEntryEdit', async () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);

    fireEvent.change(titleInput(), { target: { value: 'Senior Analyst' } });
    fireEvent.change(bulletsInput(), {
      target: { value: '• Led the notes\n• Shipped the engine' },
    });
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockApplyEdit).toHaveBeenCalledTimes(1));
    expect(mockApplyEdit).toHaveBeenCalledWith('experience', 'a', {
      title: 'Senior Analyst',
      description: '• Led the notes\n• Shipped the engine',
    });
    // company/startDate/endDate were never touched, so they are NOT in the patch —
    // applyEntryEdit shallow-merges, and re-sending a read value is how edits get lost.
    const patch = mockApplyEdit.mock.calls[0][2];
    expect(Object.keys(patch).sort()).toEqual(['description', 'title']);
  });

  it('closes the editor on success', async () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(titleInput(), { target: { value: 'Senior Analyst' } });
    fireEvent.click(saveBtn());

    await waitFor(() => expect(screen.queryByLabelText('Role')).toBeNull());
    expect(screen.getAllByLabelText('Edit')).toHaveLength(2);
  });

  it('keeps the editor OPEN when the save fails — the typed text is not thrown away', async () => {
    // applyEntryEdit has already rolled the list back and toasted by the time it reports
    // failure. Closing here would discard the user's words and quietly show the old entry.
    mockApplyEdit.mockResolvedValue({ ok: false, found: true, saveFailed: true });
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(titleInput(), { target: { value: 'Senior Analyst' } });
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockApplyEdit).toHaveBeenCalled());
    await waitFor(() => expect(titleInput().value).toBe('Senior Analyst'));
    expect(saveBtn()).toBeTruthy();
  });

  it('keeps the editor open when applyEntryEdit THROWS', async () => {
    mockApplyEdit.mockRejectedValue(new Error('network'));
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(titleInput(), { target: { value: 'Senior Analyst' } });
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockApplyEdit).toHaveBeenCalled());
    await waitFor(() => expect(titleInput().value).toBe('Senior Analyst'));
  });

  it('writes nothing when nothing changed', async () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.click(saveBtn());

    await waitFor(() => expect(screen.queryByLabelText('Role')).toBeNull());
    expect(mockApplyEdit).not.toHaveBeenCalled();
  });

  it('saves on Enter from a single-line field', async () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(titleInput(), { target: { value: 'Senior Analyst' } });
    fireEvent.keyDown(titleInput(), { key: 'Enter' });

    await waitFor(() => expect(mockApplyEdit).toHaveBeenCalledTimes(1));
    expect(mockApplyEdit).toHaveBeenCalledWith('experience', 'a', { title: 'Senior Analyst' });
  });

  it('does NOT hijack Enter in the bullets textarea — bullets need newlines', () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(bulletsInput(), { target: { value: '• one' } });
    fireEvent.keyDown(bulletsInput(), { key: 'Enter' });

    expect(mockApplyEdit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Achievements')).toBeTruthy(); // still open
  });
});

describe('StudioLivePreview — cancelling an inline edit', () => {
  it('Cancel discards and writes NOTHING', () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(titleInput(), { target: { value: 'Wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockApplyEdit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Role')).toBeNull();
    expect(screen.getByText(/Analyst/)).toBeTruthy(); // the original row is back
  });

  it('Escape discards and writes NOTHING', () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(titleInput(), { target: { value: 'Wrong' } });
    fireEvent.keyDown(titleInput(), { key: 'Escape' });

    expect(mockApplyEdit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Role')).toBeNull();
  });

  it('Escape from the TEXTAREA discards too', () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(bulletsInput(), { target: { value: '• nope' } });
    fireEvent.keyDown(bulletsInput(), { key: 'Escape' });

    expect(mockApplyEdit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Achievements')).toBeNull();
  });

  it('re-opening after a cancel shows the STORED value, not the discarded one', () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(titleInput(), { target: { value: 'Wrong' } });
    fireEvent.keyDown(titleInput(), { key: 'Escape' });
    openRow(0);

    expect(titleInput().value).toBe('Analyst');
  });
});

describe('StudioLivePreview — the isCurrent pair', () => {
  it('clears the end date and sends both keys when the role becomes current', async () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.click(screen.getByLabelText('Current role'));

    // The sheet prints "Present" in that slot, so the end date field is emptied AND
    // disabled — it would otherwise be a control with no visible effect.
    const [, endDate] = screen.getAllByLabelText('Dates');
    expect(endDate.value).toBe('');
    expect(endDate.disabled).toBe(true);

    fireEvent.click(saveBtn());
    await waitFor(() => expect(mockApplyEdit).toHaveBeenCalled());
    expect(mockApplyEdit).toHaveBeenCalledWith('experience', 'a', {
      endDate: '',
      isCurrent: true,
    });
  });

  it('edits the two dates as free-text strings', async () => {
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    const [startDate] = screen.getAllByLabelText('Dates');
    fireEvent.change(startDate, { target: { value: 'Summer 2019' } });
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockApplyEdit).toHaveBeenCalled());
    expect(mockApplyEdit).toHaveBeenCalledWith('experience', 'a', {
      startDate: 'Summer 2019',
    });
  });
});

describe('StudioLivePreview — the other two lists', () => {
  it("passes 'project' SINGULAR — the SECTION_LIST gotcha", async () => {
    // SECTION_LIST is { experience, project, education }; 'projects' resolves to no list
    // key, so the edit would be reported as saved and land nowhere.
    mockCvData = {
      _id: 'd1',
      studioKind: 'build',
      personalInfo: { fullName: 'Ada' },
      projects: [{ _sortId: 'p1', title: 'Notes engine', description: '• proj' }],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'Notes engine v2' } });
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockApplyEdit).toHaveBeenCalled());
    expect(mockApplyEdit).toHaveBeenCalledWith('project', 'p1', { title: 'Notes engine v2' });
    expect(mockApplyEdit.mock.calls[0][0]).toBe('project'); // NOT 'projects'
    // Projects show a title and bullets on the sheet — and so, exactly those here.
    expect(screen.queryByLabelText('Current role')).toBeNull();
  });

  it('edits an education entry under its own token and fields', async () => {
    mockCvData = {
      _id: 'd1',
      studioKind: 'build',
      personalInfo: { fullName: 'Ada' },
      education: [{ _sortId: 'edu-a', degree: 'BSc', school: 'UNILAG', graduationDate: '2019' }],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    openRow(0);
    // School is offered, because the sheet prints it.
    expect(screen.getByLabelText('School').value).toBe('UNILAG');

    fireEvent.change(screen.getByLabelText('Qualification'), {
      target: { value: 'BSc Mathematics' },
    });
    fireEvent.change(screen.getByLabelText('Finished'), { target: { value: '2020' } });
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockApplyEdit).toHaveBeenCalled());
    // ...but it was never touched, so it stays out of the patch.
    expect(mockApplyEdit).toHaveBeenCalledWith('education', 'edu-a', {
      degree: 'BSc Mathematics',
      graduationDate: '2020',
    });
  });

  it('leaves SKILLS alone — pills carry no _sortId to address', () => {
    mockCvData = { ...twoRoles, skills: ['Algorithms', 'Analysis'] };
    render(<StudioLivePreview />);
    // Two experience rows, and nothing editable on the two skill pills.
    expect(screen.getAllByLabelText('Edit')).toHaveLength(2);
  });
});

describe('StudioLivePreview — an edit is not a recompute', () => {
  it('does NOT send a studio command — the inline editor writes directly', async () => {
    // Unlike delete, a field edit has nothing to unpin, so it needs no command channel;
    // and auto-recompute after an edit belongs to a later slice.
    mockCvData = twoRoles;
    render(<StudioLivePreview />);
    openRow(0);
    fireEvent.change(titleInput(), { target: { value: 'Senior Analyst' } });
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockApplyEdit).toHaveBeenCalled());
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
    expect(mockReorderEntries).not.toHaveBeenCalled();
  });
});
