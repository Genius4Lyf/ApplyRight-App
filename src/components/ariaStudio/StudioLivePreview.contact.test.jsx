// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// THE CONTACT HEADER, editable inline on the Live Preview sheet — the last section to
// become editable from the preview.
//
// Driven through StudioLivePreview rather than PreviewContactBlock alone, for the reason
// the certifications and skills suites beside it are: the contract spans both. The block
// draws the fields and diffs them, but the PARENT decides it renders at all — and the
// part most worth guarding is the parent's: none of it exists in 'preview', where the
// read-only template takes over.
//
// What separates this suite from its siblings is the WRITE SHAPE. personalInfo is a
// SUBDOC, so a save has to name the changed fields individually or it replaces the whole
// object — taking photoUrl and nationality, which this form never shows, with it. The
// diffing assertions below are that guarantee expressed from the UI side; the
// dot-notation half lives in AriaStudioContext.test.jsx.
let mockCvData = null;
let mockUpdatePersonalInfo;
let mockReplaceCertifications;
let mockReplaceSkills;
let mockApplySkills;
let mockUpdateCvData;
let mockRequestStudioCommand;
let mockSelectTemplate;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    updatePersonalInfo: mockUpdatePersonalInfo,
    replaceCertifications: mockReplaceCertifications,
    replaceSkills: mockReplaceSkills,
    applySkills: mockApplySkills,
    updateCvData: mockUpdateCvData,
    requestStudioCommand: mockRequestStudioCommand,
    selectTemplate: mockSelectTemplate,
  }),
}));
// The block never imports sonner — these spies exist to keep it that way.
// updatePersonalInfo already toasts on a failed save, and a second toast from the form
// would double it.
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
  mockUpdatePersonalInfo = vi.fn().mockResolvedValue({ ok: true });
  mockReplaceCertifications = vi.fn().mockResolvedValue({ ok: true });
  mockReplaceSkills = vi.fn().mockResolvedValue({ ok: true });
  mockApplySkills = vi.fn().mockResolvedValue({ ok: true, added: 1 });
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
});
afterEach(() => {
  cleanup();
  mockCvData = null;
});

// photoUrl and nationality sit in the fixture ON PURPOSE: they are the two fields this
// editor must never write, and they can only be shown to survive if they're there to
// begin with. `website` is empty for the same reason in reverse — a field the user fills
// in for the FIRST time has to reach the patch.
const contactCv = {
  _id: 'd1',
  // Tailor session — unlocked regardless of completeness (the build-only lock is tested
  // separately in StudioLivePreview.test.jsx); this file is about contact editing.
  studioKind: 'tailor',
  personalInfo: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+44 7700 900000',
    linkedin: 'linkedin.com/in/ada',
    website: '',
    address: 'London, UK',
    photoUrl: 'data:image/png;base64,AAAA',
    nationality: 'British',
  },
  experience: [{ _sortId: 'a', title: 'Engineer', company: 'Acme', description: '• one' }],
  studioScan: null,
};

// THREE things on this panel answer to the name 'Edit': the view-mode toggle in the
// header bar (a toggle — it carries aria-pressed), the ✎ on each entry row (icon-only —
// it carries aria-label), and the contact header's own ✎, which is the only one that
// says "Edit" as visible TEXT. Filtering on the two attributes is what keeps this suite
// pointed at the control it's actually about; the fixture keeps an experience row
// precisely so that distinction is exercised rather than assumed.
const headerEditBtns = () =>
  screen
    .queryAllByRole('button', { name: 'Edit' })
    .filter((b) => !b.hasAttribute('aria-pressed') && !b.hasAttribute('aria-label'));
const openEdit = () => fireEvent.click(headerEditBtns()[0]);
const field = (label) => screen.getByLabelText(label);
const saveBtn = () => screen.getByRole('button', { name: 'Save' });
const cancelBtn = () => screen.getByRole('button', { name: 'Cancel' });
const type = (label, value) => fireEvent.change(field(label), { target: { value } });

describe('StudioLivePreview — the contact header renders', () => {
  it('shows the name and the joined contact line', () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    const line = screen.getByText(/ada@example\.com/);
    expect(line.textContent).toContain('+44 7700 900000');
    expect(line.textContent).toContain('London, UK');
    expect(line.textContent).toContain('linkedin.com/in/ada');
  });

  it('offers an Edit control on the header', () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);

    expect(headerEditBtns()).toHaveLength(1);
  });
});

describe('StudioLivePreview — editing the contact header', () => {
  it('seeds every field, offers the shared photo uploader, and leaves nationality alone', () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    expect(field('Full name').value).toBe('Ada Lovelace');
    expect(field('Email').value).toBe('ada@example.com');
    expect(field('Phone').value).toBe('+44 7700 900000');
    expect(field('LinkedIn').value).toBe('linkedin.com/in/ada');
    expect(field('Portfolio / website').value).toBe('');
    expect(field('Location').value).toBe('London, UK');
    expect(screen.queryByLabelText(/nationality/i)).toBeNull();
    expect(screen.getByLabelText(/photo/i)).toBeTruthy();
  });

  it('can remove the saved photo without resending the other contact fields', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockUpdatePersonalInfo).toHaveBeenCalledTimes(1));
    expect(mockUpdatePersonalInfo).toHaveBeenCalledWith({ photoUrl: '' });
  });

  it('sends ONLY the changed field — a one-field edit is a one-key patch', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    type('Email', 'ada@lovelace.dev');
    fireEvent.click(saveBtn());

    // THE point of the whole slice: the untouched fields are absent, so the writer's
    // dot-notation $set can't clobber the siblings it never names.
    await waitFor(() => expect(mockUpdatePersonalInfo).toHaveBeenCalledTimes(1));
    expect(mockUpdatePersonalInfo).toHaveBeenCalledWith({ email: 'ada@lovelace.dev' });
    expect(Object.keys(mockUpdatePersonalInfo.mock.calls[0][0])).toEqual(['email']);
  });

  it('sends several changed fields together, and TRIMS them', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    type('Full name', '  Ada King-Lovelace  ');
    // A field that was EMPTY and is now filled must reach the patch — the diff is against
    // the seed, not against emptiness.
    type('Portfolio / website', 'ada.dev');
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockUpdatePersonalInfo).toHaveBeenCalled());
    expect(mockUpdatePersonalInfo).toHaveBeenCalledWith({
      fullName: 'Ada King-Lovelace',
      website: 'ada.dev',
    });
  });

  it('CLEARING a field sends the empty string rather than dropping it from the patch', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    type('Phone', '');
    fireEvent.click(saveBtn());

    // Deleting a phone number is an EDIT. Omitting it because it's falsy would silently
    // leave the old number on the document.
    await waitFor(() => expect(mockUpdatePersonalInfo).toHaveBeenCalled());
    expect(mockUpdatePersonalInfo).toHaveBeenCalledWith({ phone: '' });
  });

  it('writes NOTHING when Save is pressed with no changes', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    fireEvent.click(saveBtn());

    // Opening the editor and thinking better of it is not an edit — and the form still
    // closes, so it doesn't look stuck.
    await waitFor(() => expect(screen.queryByLabelText('Email')).toBeNull());
    expect(mockUpdatePersonalInfo).not.toHaveBeenCalled();
  });

  it('ignores whitespace-only changes — retyping the same value with padding is not an edit', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    type('Full name', '  Ada Lovelace  ');
    fireEvent.click(saveBtn());

    await waitFor(() => expect(screen.queryByLabelText('Full name')).toBeNull());
    expect(mockUpdatePersonalInfo).not.toHaveBeenCalled();
  });

  it('closes on a successful save', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    type('Email', 'ada@lovelace.dev');
    fireEvent.click(saveBtn());

    await waitFor(() => expect(screen.queryByLabelText('Email')).toBeNull());
    expect(headerEditBtns()).toHaveLength(1);
  });

  it('stays OPEN with the typed values when the save is rejected', async () => {
    mockCvData = contactCv;
    mockUpdatePersonalInfo.mockResolvedValueOnce({ ok: false });
    render(<StudioLivePreview />);
    openEdit();

    type('Email', 'ada@lovelace.dev');
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockUpdatePersonalInfo).toHaveBeenCalled());
    // The writer has already rolled back and toasted. Closing would throw the user's
    // typing away and show the old details as though nothing had happened.
    expect(field('Email').value).toBe('ada@lovelace.dev');
    // ...and no SECOND toast from the form on top of the writer's.
    expect(toastCalls.error).not.toHaveBeenCalled();
  });

  it('Cancel discards without writing', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    type('Full name', 'Someone Else');
    fireEvent.click(cancelBtn());

    expect(mockUpdatePersonalInfo).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Full name')).toBeNull();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
  });

  it('Escape discards without writing', () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    type('Full name', 'Someone Else');
    fireEvent.keyDown(field('Full name'), { key: 'Escape' });

    expect(mockUpdatePersonalInfo).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Full name')).toBeNull();
  });

  it('re-opening after a cancel re-seeds from the document, not from the discarded typing', () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();
    type('Full name', 'Someone Else');
    fireEvent.click(cancelBtn());

    openEdit();

    expect(field('Full name').value).toBe('Ada Lovelace');
  });

  it('Enter in a field submits', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    type('Phone', '+44 7700 900999');
    fireEvent.keyDown(field('Phone'), { key: 'Enter' });

    // Every field here is single-line, so Enter has no newline to mean instead.
    await waitFor(() => expect(mockUpdatePersonalInfo).toHaveBeenCalledTimes(1));
    expect(mockUpdatePersonalInfo).toHaveBeenCalledWith({ phone: '+44 7700 900999' });
  });

  it('never asks Aria — the contact header has no AI path', async () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();

    type('Email', 'ada@lovelace.dev');
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockUpdatePersonalInfo).toHaveBeenCalled());
    // A name and a phone number are FACTS the user already knows: there is nothing to
    // generate, so no command is requested and no credit is ever spent here.
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
  });

  it('edits an EMPTY contact header, seeding blanks rather than crashing', async () => {
    mockCvData = { ...contactCv, personalInfo: { fullName: 'Ada Lovelace' } };
    render(<StudioLivePreview />);
    openEdit();

    expect(field('Email').value).toBe('');
    type('Email', 'ada@example.com');
    fireEvent.click(saveBtn());

    await waitFor(() => expect(mockUpdatePersonalInfo).toHaveBeenCalled());
    expect(mockUpdatePersonalInfo).toHaveBeenCalledWith({ email: 'ada@example.com' });
  });
});

describe('StudioLivePreview — contact editing is EDIT MODE only', () => {
  const toPreview = () => fireEvent.click(screen.getByRole('button', { name: /preview/i }));

  it('drops the header Edit control in preview mode', () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    expect(headerEditBtns()).toHaveLength(1);

    toPreview();

    // The production template renders instead — a document, with nothing to click. The
    // mode toggle's own 'Edit' survives, of course; the header's ✎ does not.
    expect(screen.getByTestId('production-template')).toBeTruthy();
    expect(headerEditBtns()).toHaveLength(0);
  });

  it('closes an OPEN contact editor when switching to preview', () => {
    mockCvData = contactCv;
    render(<StudioLivePreview />);
    openEdit();
    expect(field('Email')).toBeTruthy();

    toPreview();

    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(mockUpdatePersonalInfo).not.toHaveBeenCalled();
  });
});
