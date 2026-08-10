// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// Slice 3c-ii: the ✎ becomes a two-choice popover, and the Aria choice REQUESTS the
// interview through the command channel instead of opening the inline editor.
//
// Driven through StudioLivePreview rather than PreviewEntryRow in isolation, for the same
// reason 3c-i is: the contract under test spans both. The row owns the popover, but the
// PARENT owns the two facts that are easy to get wrong — the `section` token each list
// sends ('project' singular, the recurring trap) and whether education is offered the Aria
// choice at all. Mounting the row directly would let the test hand-write both.
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

// One entry per section, so a row's ✎ is unambiguous and the education row can be found
// by its own label rather than by counting past the others.
const oneOfEach = {
  _id: 'd1',
  studioKind: 'tailor', // unlocked; the build-only completeness lock is tested elsewhere
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
  ],
  projects: [{ _sortId: 'proj-a', title: 'Difference Engine', description: '• Built it' }],
  education: [{ _sortId: 'edu-a', degree: 'BSc Maths', school: 'UCL', graduationDate: '2019' }],
  studioScan: null,
};

const editBtns = () => screen.getAllByLabelText(i18n.t('ariaStudio.livePreview.editEntry'));
const manualChoice = () =>
  screen.queryByRole('menuitem', { name: i18n.t('ariaStudio.livePreview.editManually') });
const ariaChoice = () =>
  screen.queryByRole('menuitem', { name: i18n.t('ariaStudio.livePreview.editWithAria') });

// Row order follows the rendered sections: experience, then projects, then education.
const EXPERIENCE_ROW = 0;
const PROJECT_ROW = 1;
const EDUCATION_ROW = 2;

describe('StudioLivePreview — the ✎ two-choice popover', () => {
  it('offers BOTH manual and Aria on an experience row', () => {
    mockCvData = oneOfEach;
    render(<StudioLivePreview />);

    // Closed until asked — the ✎ is still one control, not two buttons per row.
    expect(ariaChoice()).toBeNull();

    fireEvent.click(editBtns()[EXPERIENCE_ROW]);

    expect(manualChoice()).toBeTruthy();
    expect(ariaChoice()).toBeTruthy();
    // And nothing has happened yet: opening the menu is not choosing from it.
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Role')).toBeNull();
  });

  it('offers BOTH on a project row', () => {
    mockCvData = oneOfEach;
    render(<StudioLivePreview />);
    fireEvent.click(editBtns()[PROJECT_ROW]);

    expect(manualChoice()).toBeTruthy();
    expect(ariaChoice()).toBeTruthy();
  });

  // The whole point of the education carve-out. ENTRY_SOURCE has no education key — its
  // fix has always been guidance-only — so there is no interview to offer, and a menu
  // with one item in it would be worse than no menu.
  it('skips the popover on an education row and opens the MANUAL editor directly', async () => {
    mockCvData = oneOfEach;
    render(<StudioLivePreview />);
    fireEvent.click(editBtns()[EDUCATION_ROW]);
    fireEvent.click(manualChoice());

    // Straight into the editor, on the education fields.
    await waitFor(() => expect(screen.getByLabelText('Qualification')).toBeTruthy());

    expect(ariaChoice()).toBeNull();
    expect(manualChoice()).toBeNull();
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
  });

  it('"Edit manually" still opens the inline editor — 3c-i is untouched', async () => {
    mockCvData = oneOfEach;
    render(<StudioLivePreview />);
    fireEvent.click(editBtns()[EXPERIENCE_ROW]);
    fireEvent.click(manualChoice());

    await waitFor(() => expect(screen.getByLabelText('Role')).toBeTruthy());
    // The manual path is local state, never a command.
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
  });

  it('closes on Escape without choosing anything', async () => {
    mockCvData = oneOfEach;
    render(<StudioLivePreview />);
    fireEvent.click(editBtns()[EXPERIENCE_ROW]);
    expect(ariaChoice()).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(ariaChoice()).toBeNull());
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Role')).toBeNull();
  });
});

describe('StudioLivePreview — "Edit with Aria" requests the interview', () => {
  it('sends editWithAria with the experience section token and the entry _sortId', () => {
    mockCvData = oneOfEach;
    render(<StudioLivePreview />);
    fireEvent.click(editBtns()[EXPERIENCE_ROW]);
    fireEvent.click(ariaChoice());

    expect(mockRequestStudioCommand).toHaveBeenCalledTimes(1);
    expect(mockRequestStudioCommand).toHaveBeenCalledWith('editWithAria', 'experience', 'exp-a');
    // A REQUEST, not a write: the preview never edits or pins anything itself.
    expect(mockApplyEdit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Role')).toBeNull();
  });

  // The 'project'-singular trap, guarded explicitly: the list is `projects`, the section
  // token is 'project' — same vocabulary deleteEntry and ENTRY_SOURCE.focusSection use.
  it('sends the SINGULAR "project" token from the projects list', () => {
    mockCvData = oneOfEach;
    render(<StudioLivePreview />);
    fireEvent.click(editBtns()[PROJECT_ROW]);
    fireEvent.click(ariaChoice());

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('editWithAria', 'project', 'proj-a');
  });

  it('closes the menu once a choice is made', async () => {
    mockCvData = oneOfEach;
    render(<StudioLivePreview />);
    fireEvent.click(editBtns()[EXPERIENCE_ROW]);
    fireEvent.click(ariaChoice());

    await waitFor(() => expect(ariaChoice()).toBeNull());
  });
});

describe('StudioLivePreview — handing over on the bottom SHEET', () => {
  // On mobile the preview covers the chat, so the interview it just asked for would be
  // invisible behind it. isSheet is about HOW it's mounted, not the viewport width.
  it('closes itself after handing over when isSheet', () => {
    mockCvData = oneOfEach;
    const onClose = vi.fn();
    render(<StudioLivePreview isSheet onClose={onClose} />);

    fireEvent.click(editBtns()[EXPERIENCE_ROW]);
    fireEvent.click(ariaChoice());

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('editWithAria', 'experience', 'exp-a');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The desktop payoff: the panel and the chat both stay open, so the user watches the
  // entry change as they answer.
  it('stays OPEN on the inline panel', () => {
    mockCvData = oneOfEach;
    const onClose = vi.fn();
    render(<StudioLivePreview isSheet={false} onClose={onClose} />);

    fireEvent.click(editBtns()[EXPERIENCE_ROW]);
    fireEvent.click(ariaChoice());

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('editWithAria', 'experience', 'exp-a');
    expect(onClose).not.toHaveBeenCalled();
  });

  // A manual edit happens IN the sheet, so closing it would throw away the editor the
  // user just opened.
  it('does NOT close the sheet for a manual edit', async () => {
    mockCvData = oneOfEach;
    const onClose = vi.fn();
    render(<StudioLivePreview isSheet onClose={onClose} />);

    fireEvent.click(editBtns()[EXPERIENCE_ROW]);
    fireEvent.click(manualChoice());

    await waitFor(() => expect(screen.getByLabelText('Role')).toBeTruthy());
    expect(onClose).not.toHaveBeenCalled();
  });
});
