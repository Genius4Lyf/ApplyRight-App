// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// CERTIFICATIONS, editable inline on the Live Preview sheet.
//
// Driven through StudioLivePreview rather than PreviewCertsBlock alone, for the reason the
// skills suite beside it is: the contract spans both. The block draws the lines and the
// controls, but the PARENT decides the sub-block renders at all — including the case that
// motivates this slice, a document with NO certifications, where the entry point has to
// exist anyway or the user can never add their first. And the part most worth guarding is
// the parent's: none of it exists in 'preview', where the read-only template takes over.
let mockCvData = null;
let mockReplaceCertifications;
let mockReplaceSkills;
let mockApplySkills;
let mockUpdateCvData;
let mockRequestStudioCommand;
let mockSelectTemplate;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    replaceCertifications: mockReplaceCertifications,
    replaceSkills: mockReplaceSkills,
    applySkills: mockApplySkills,
    updateCvData: mockUpdateCvData,
    requestStudioCommand: mockRequestStudioCommand,
    selectTemplate: mockSelectTemplate,
  }),
}));
// The block never imports sonner — these spies exist to keep it that way. commitList
// already toasts on a failed save, and a second toast from the form would double it.
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

// A cert with only a NAME sits in the fixture on purpose: issuer and date are optional on
// the way in, so they have to survive a round trip through a delete of one of its
// neighbours rather than being normalised into existence.
const certsCv = {
  _id: 'd1',
  // Tailor session: the completeness lock (a build-only, read-until-complete gate, tested
  // in StudioLivePreview.test.jsx) is orthogonal to the certification editing under test.
  studioKind: 'tailor',
  personalInfo: { fullName: 'Ada Lovelace' },
  education: [{ _sortId: 'e1', degree: 'BSc', school: 'State' }],
  certifications: [
    { name: 'H2S Awareness', issuer: 'OPITO', date: '2023' },
    { name: 'First Aid' },
    { name: 'Confined Space', issuer: 'City & Guilds', date: '2021' },
  ],
  studioScan: null,
};

const removeCert = (name) => fireEvent.click(screen.getByLabelText(`Remove ${name}`));
const openAdd = () => fireEvent.click(screen.getByRole('button', { name: 'Add certification' }));
const nameField = () => screen.getByLabelText('Certification');
const issuerField = () => screen.getByLabelText('Issued by');
const dateField = () => screen.getByLabelText('Year');
const addBtn = () => screen.getByRole('button', { name: 'Add', exact: true });

describe('StudioLivePreview — certifications render under Education', () => {
  it('lists each certification with its issuer and date', () => {
    mockCvData = certsCv;
    render(<StudioLivePreview />);

    expect(screen.getByText('H2S Awareness · OPITO · 2023')).toBeTruthy();
    expect(screen.getByText('Confined Space · City & Guilds · 2021')).toBeTruthy();
    // Name-only renders as just the name — no orphan separators for absent fields.
    expect(screen.getByText('First Aid')).toBeTruthy();
  });

  it('stays inside the Education section rather than becoming one of its own', () => {
    mockCvData = certsCv;
    const { container } = render(<StudioLivePreview />);

    // The sub-heading and the degree share a SectionBlock — certifications are stored
    // and rendered under Education everywhere else, and the preview must not disagree.
    const sections = [...container.querySelectorAll('section')];
    const educationSection = sections.find((s) => s.textContent.includes('BSc'));
    expect(educationSection).toBeTruthy();
    expect(educationSection.textContent).toContain('H2S Awareness');
  });
});

describe('StudioLivePreview — delete a certification', () => {
  it('replaces the array with exactly that index gone, every other one preserved', async () => {
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    removeCert('First Aid');

    await waitFor(() => expect(mockReplaceCertifications).toHaveBeenCalledTimes(1));
    // The survivors pass through UNTOUCHED — a whole-array replace is the one write that
    // could quietly rewrite the rest of the list, and the name-only cert must NOT come
    // back with issuer/date filled in with empty strings it never had.
    expect(mockReplaceCertifications).toHaveBeenCalledWith([
      { name: 'H2S Awareness', issuer: 'OPITO', date: '2023' },
      { name: 'Confined Space', issuer: 'City & Guilds', date: '2021' },
    ]);
  });

  it('deletes by INDEX, so a duplicate name loses exactly one line', async () => {
    // Two certifications can legitimately share a name (a ticket and its refresher).
    // Filtering by name would take both — index is the only identity there is here.
    mockCvData = {
      ...certsCv,
      certifications: [
        { name: 'First Aid', date: '2019' },
        { name: 'First Aid', date: '2023' },
      ],
    };
    render(<StudioLivePreview />);

    fireEvent.click(screen.getAllByLabelText('Remove First Aid')[0]);

    await waitFor(() =>
      expect(mockReplaceCertifications).toHaveBeenCalledWith([{ name: 'First Aid', date: '2023' }])
    );
  });

  it('drops the list to an empty array on the last certification', async () => {
    mockCvData = { ...certsCv, certifications: [{ name: 'H2S Awareness' }] };
    render(<StudioLivePreview />);
    removeCert('H2S Awareness');

    await waitFor(() => expect(mockReplaceCertifications).toHaveBeenCalledWith([]));
  });

  it('goes through replaceCertifications ALONE — no command channel, no AI', async () => {
    // A certification carries no _sortId and no interview, so there is nothing for
    // StudioChat to unpin first: unlike an entry delete, this needs no command.
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    removeCert('First Aid');

    await waitFor(() => expect(mockReplaceCertifications).toHaveBeenCalled());
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
    expect(mockUpdateCvData).not.toHaveBeenCalled();
  });
});

describe('StudioLivePreview — add a certification', () => {
  it('appends { name, issuer, date }, trimmed, keeping the existing ones', async () => {
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: '  Working at Height  ' } });
    fireEvent.change(issuerField(), { target: { value: ' NEBOSH ' } });
    fireEvent.change(dateField(), { target: { value: ' 2024 ' } });
    fireEvent.click(addBtn());

    await waitFor(() =>
      expect(mockReplaceCertifications).toHaveBeenCalledWith([
        ...certsCv.certifications,
        { name: 'Working at Height', issuer: 'NEBOSH', date: '2024' },
      ])
    );
  });

  it('allows a NAME-ONLY certification — issuer and date are optional', async () => {
    mockCvData = { ...certsCv, certifications: [] };
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Working at Height' } });
    fireEvent.click(addBtn());

    // Demanding the awarding body would cost the user the entry; the empty strings keep
    // the shape the build flow and the builder both write.
    await waitFor(() =>
      expect(mockReplaceCertifications).toHaveBeenCalledWith([
        { name: 'Working at Height', issuer: '', date: '' },
      ])
    );
  });

  it('refuses a blank name, and a one-character one — matching CertificationsCard', () => {
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: '   ' } });
    expect(addBtn().disabled).toBe(true);
    fireEvent.keyDown(nameField(), { key: 'Enter' });

    // > 1 character, the same threshold the build-flow card enforces — the two capture
    // surfaces must not disagree on what counts as a certification.
    fireEvent.change(nameField(), { target: { value: 'A' } });
    expect(addBtn().disabled).toBe(true);
    fireEvent.keyDown(nameField(), { key: 'Enter' });

    expect(mockReplaceCertifications).not.toHaveBeenCalled();
  });

  it('submits on Enter from the name field', async () => {
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Working at Height' } });
    fireEvent.keyDown(nameField(), { key: 'Enter' });

    await waitFor(() => expect(mockReplaceCertifications).toHaveBeenCalledTimes(1));
  });

  it('closes on Escape without writing', () => {
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Working at Height' } });
    fireEvent.keyDown(nameField(), { key: 'Escape' });

    expect(screen.queryByLabelText('Certification')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add certification' })).toBeTruthy();
    expect(mockReplaceCertifications).not.toHaveBeenCalled();
  });

  it('clears and stays open after a successful add, for the next one', async () => {
    // Certifications arrive in batches — a ticket, its refresher and the medical — so
    // reopening the form for each would cost a click apiece.
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Working at Height' } });
    fireEvent.change(issuerField(), { target: { value: 'NEBOSH' } });
    fireEvent.click(addBtn());

    await waitFor(() => expect(nameField().value).toBe(''));
    expect(issuerField().value).toBe('');
    expect(screen.getByLabelText('Certification')).toBeTruthy();
  });

  it('KEEPS the typed text when the save fails — the writer already rolled back + toasted', async () => {
    mockReplaceCertifications.mockResolvedValue({ ok: false });
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Working at Height' } });
    fireEvent.click(addBtn());

    await waitFor(() => expect(mockReplaceCertifications).toHaveBeenCalled());
    // Clearing here would throw the user's text away on the one path they need it back.
    expect(nameField().value).toBe('Working at Height');
    // And the block adds no toast of its own — commitList has already shown one.
    expect(toastCalls.error).not.toHaveBeenCalled();
  });
});

describe('StudioLivePreview — the entry point with ZERO certifications', () => {
  // The bug this slice fixes: the old sub-block rendered only when
  // `certifications.length > 0`, so a CV without any had no way to gain its first.
  it('offers "Add certification" in edit mode even when there are none', () => {
    mockCvData = { ...certsCv, certifications: [] };
    render(<StudioLivePreview />);

    expect(screen.getByRole('button', { name: 'Add certification' })).toBeTruthy();
  });

  it('writes the first certification into an empty list', async () => {
    mockCvData = { ...certsCv, certifications: [] };
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'H2S Awareness' } });
    fireEvent.click(addBtn());

    await waitFor(() =>
      expect(mockReplaceCertifications).toHaveBeenCalledWith([
        { name: 'H2S Awareness', issuer: '', date: '' },
      ])
    );
  });

  it('is absent from preview mode, where an empty section simply does not appear', () => {
    mockCvData = { ...certsCv, certifications: [] };
    render(<StudioLivePreview />);
    expect(screen.getByRole('button', { name: 'Add certification' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.queryByRole('button', { name: 'Add certification' })).toBeNull();
  });
});

describe('StudioLivePreview — certification editing is EDIT MODE only', () => {
  it('renders no certification controls in preview, where the template takes over', () => {
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    // Present in edit…
    expect(screen.getByLabelText('Remove H2S Awareness')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add certification' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    // …and gone in preview: the template is the document as it will be downloaded, and a
    // × beside a certification is not part of that document.
    expect(screen.getByTestId('production-template')).toBeTruthy();
    expect(screen.queryByLabelText('Remove H2S Awareness')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add certification' })).toBeNull();
    expect(screen.queryByLabelText('Certification')).toBeNull();
  });

  it('leaves an open add form behind when the user switches to preview', () => {
    mockCvData = certsCv;
    render(<StudioLivePreview />);
    openAdd();
    fireEvent.change(nameField(), { target: { value: 'Working at Height' } });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.queryByLabelText('Certification')).toBeNull();
    expect(mockReplaceCertifications).not.toHaveBeenCalled();
  });
});
