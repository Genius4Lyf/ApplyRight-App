// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// LANGUAGES, editable inline on the Live Preview sheet.
//
// There was no languages field anywhere before this: not on the draft, not in the markdown,
// and nowhere in the UI. Three of the ~19 templates scraped a "- **Languages:** …" line out
// of the SKILLS section in case the AI happened to write one there; the other sixteen
// ignored it entirely.
//
// Driven through StudioLivePreview rather than the block alone, for the reason the certs
// and skills suites beside it are: the contract spans both. The block draws the lines and
// the controls, but the PARENT decides the sub-block renders at all — including the case
// that motivates it, a document with NO languages, where the entry point has to exist or
// the user can never add their first.
let mockCvData = null;
let mockReplaceLanguages;
let mockReplaceCertifications;
let mockReplaceSkills;
let mockApplySkills;
let mockUpdateCvData;
let mockRequestStudioCommand;
let mockSelectTemplate;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    replaceLanguages: mockReplaceLanguages,
    replaceCertifications: mockReplaceCertifications,
    replaceSkills: mockReplaceSkills,
    applySkills: mockApplySkills,
    updateCvData: mockUpdateCvData,
    requestStudioCommand: mockRequestStudioCommand,
    selectTemplate: mockSelectTemplate,
  }),
}));
const toastCalls = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastCalls }));
vi.mock('../TemplatePreviewThumb', () => ({
  default: ({ templateId }) => <span data-testid={`template-thumb-${templateId}`} />,
}));
vi.mock('../CVTemplateRenderer', () => ({
  default: () => <div data-testid="production-template" />,
}));

beforeEach(() => {
  i18n.changeLanguage('en');
  mockReplaceLanguages = vi.fn().mockResolvedValue({ ok: true });
  mockReplaceCertifications = vi.fn().mockResolvedValue({ ok: true });
  mockReplaceSkills = vi.fn().mockResolvedValue({ ok: true });
  mockApplySkills = vi.fn().mockResolvedValue({ ok: true, added: 1 });
  mockUpdateCvData = vi.fn();
  mockRequestStudioCommand = vi.fn();
  mockSelectTemplate = vi.fn().mockResolvedValue({ ok: true });
  Object.values(toastCalls).forEach((spy) => spy.mockClear());
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

const cvWith = (languages) => ({
  _id: 'd1',
  // Tailor session — unlocked; the build-only completeness lock is tested separately.
  studioKind: 'tailor',
  personalInfo: { fullName: 'Ada Lovelace' },
  // The block lives under Education, beside certifications — so that section has to
  // exist for it to render at all.
  education: [{ _sortId: 'e1', degree: 'BSc', school: 'State' }],
  skills: [{ name: 'React', category: 'Frontend' }],
  languages,
  studioScan: null,
});

const openAdd = () => fireEvent.click(screen.getByRole('button', { name: 'Add language' }));

describe('StudioLivePreview — languages', () => {
  it('offers the entry point on a CV that has none', () => {
    // The whole reason the block renders unconditionally. Gating it on languages.length
    // would leave someone with no way to add their first.
    mockCvData = cvWith([]);
    render(<StudioLivePreview />);

    expect(screen.getByRole('button', { name: 'Add language' })).toBeTruthy();
  });

  it('adds a language with its level', async () => {
    mockCvData = cvWith([]);
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'French' } });
    fireEvent.change(screen.getByLabelText('Level (optional)'), {
      target: { value: 'Professional' },
    });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('ariaStudio.certifications.add') }));

    await waitFor(() => expect(mockReplaceLanguages).toHaveBeenCalledTimes(1));
    expect(mockReplaceLanguages).toHaveBeenCalledWith([{ name: 'French', level: 'Professional' }]);
  });

  it('accepts a language with NO level — a bare name is a real entry', async () => {
    mockCvData = cvWith([]);
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'Yoruba' } });
    fireEvent.keyDown(screen.getByLabelText('Language'), { key: 'Enter' });

    await waitFor(() => expect(mockReplaceLanguages).toHaveBeenCalledTimes(1));
    expect(mockReplaceLanguages).toHaveBeenCalledWith([{ name: 'Yoruba', level: '' }]);
  });

  it('refuses a one-character name', () => {
    // A typo, not a language — the same threshold the certifications block holds.
    mockCvData = cvWith([]);
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'F' } });
    expect(
      screen.getByRole('button', { name: i18n.t('ariaStudio.certifications.add') }).disabled
    ).toBe(true);
  });

  it('removes by INDEX, so two entries sharing a name do not both go', async () => {
    mockCvData = cvWith([
      { name: 'French', level: 'Native' },
      { name: 'French', level: 'Written only' },
    ]);
    render(<StudioLivePreview />);

    fireEvent.click(screen.getAllByLabelText('Remove French')[0]);

    await waitFor(() => expect(mockReplaceLanguages).toHaveBeenCalledTimes(1));
    expect(mockReplaceLanguages).toHaveBeenCalledWith([{ name: 'French', level: 'Written only' }]);
  });

  it('lets the LAST language go — a CV with none is a normal CV', async () => {
    // Unlike skills, which keep a floor of one. Nothing here is required.
    mockCvData = cvWith([{ name: 'French', level: 'Native' }]);
    render(<StudioLivePreview />);

    const remove = screen.getByLabelText('Remove French');
    expect(remove.disabled).toBe(false);
    fireEvent.click(remove);

    await waitFor(() => expect(mockReplaceLanguages).toHaveBeenCalledWith([]));
  });

  it('keeps the typed text when the save fails', async () => {
    // replaceLanguages has already rolled back and toasted; throwing the input away here
    // would cost the user their work on the one path they need it back.
    mockReplaceLanguages = vi.fn().mockResolvedValue({ ok: false });
    mockCvData = cvWith([]);
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'French' } });
    fireEvent.keyDown(screen.getByLabelText('Language'), { key: 'Enter' });

    await waitFor(() => expect(mockReplaceLanguages).toHaveBeenCalled());
    expect(screen.getByLabelText('Language').value).toBe('French');
  });

  it('shows the lines but no controls when the sheet is locked', () => {
    mockCvData = {
      ...cvWith([{ name: 'French', level: 'Native' }]),
      // The lock is a BUILD session that is not content-complete. Education stays
      // populated: it is the section that HOSTS this block, so emptying it would prove
      // nothing about the lock.
      studioKind: 'build',
      experience: [],
      professionalSummary: '',
    };
    render(<StudioLivePreview />);

    expect(screen.getByText(/French/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add language' })).toBeNull();
    expect(screen.queryByLabelText('Remove French')).toBeNull();
  });

  it('renders nothing at all when locked AND empty', () => {
    // A bare heading over blank space says nothing. The only reason this block renders
    // unconditionally is the affordance the lock removes.
    mockCvData = {
      ...cvWith([]),
      studioKind: 'build',
      experience: [],
      education: [],
    };
    render(<StudioLivePreview />);

    expect(screen.queryByText('Languages')).toBeNull();
  });
});
