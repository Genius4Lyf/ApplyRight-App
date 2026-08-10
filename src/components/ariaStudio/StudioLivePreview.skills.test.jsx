// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, cleanup, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// The SKILLS section, editable inline on the Live Preview sheet.
//
// Driven through StudioLivePreview rather than PreviewSkillsBlock alone, for the reason the
// rest of this suite is: the contract spans both. The block draws the groups and the
// controls, but the PARENT decides the section renders at all (`show`), and — the part most
// worth guarding — that none of it exists in 'preview', where the read-only template render
// takes over. Mounting the block directly would assert the edit affordances into existence
// in a mode that must not have them.
let mockCvData = null;
let mockReplaceSkills;
let mockApplySkills;
let mockUpdateCvData;
let mockRequestStudioCommand;
let mockSelectTemplate;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    replaceSkills: mockReplaceSkills,
    applySkills: mockApplySkills,
    updateCvData: mockUpdateCvData,
    requestStudioCommand: mockRequestStudioCommand,
    selectTemplate: mockSelectTemplate,
  }),
}));
// The block never imports sonner — these spies exist to keep it that way. A dupe add is a
// quiet no-op by design, and the cheapest way for that to regress is a well-meaning toast.
// (vi.hoisted: the factory is hoisted ABOVE this const, and CvLanguageToggle also imports
// sonner, so the mock resolves before `toastCalls` would otherwise exist.)
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

// BOTH stored shapes in one fixture, deliberately: a plain string and { name, category }
// are each on real CVs, and the string is the one that has to land in 'Uncategorized'.
// TypeScript follows React so the grouping is proved to COLLECT rather than merely to sort
// an already-contiguous list.
const skillsCv = {
  _id: 'd1',
  // Tailor session — unlocked; the build-only completeness lock is tested separately.
  studioKind: 'tailor',
  personalInfo: { fullName: 'Ada Lovelace' },
  skills: [
    { name: 'React', category: 'Frontend' },
    { name: 'Node', category: 'Backend' },
    'Algorithms',
    { name: 'TypeScript', category: 'Frontend' },
  ],
  studioScan: null,
};

// The pill is the element whose own text is the skill name; its × lives inside it.
const pill = (name) => screen.getByText(name).closest('span');
const removeSkill = (name) => fireEvent.click(within(pill(name)).getByLabelText('Remove skill'));
const openAdd = () => fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
const nameField = () => screen.getByLabelText('Skill name');
const categoryField = () => screen.getByLabelText('Category (optional)');

describe('StudioLivePreview — skills, grouped by category', () => {
  it('groups the pills under their category, collecting non-adjacent members', () => {
    mockCvData = skillsCv;
    const { container } = render(<StudioLivePreview />);

    const labels = [...container.querySelectorAll('p.font-mono')]
      .map((p) => p.textContent)
      .filter((text) => ['Frontend', 'Backend', 'Uncategorized'].includes(text));
    expect(labels).toEqual(['Frontend', 'Backend', 'Uncategorized']);

    // React and TypeScript are entries 0 and 3 on the CV — same group all the same.
    const frontend = screen.getByText('Frontend').parentElement;
    expect(within(frontend).getByText('React')).toBeTruthy();
    expect(within(frontend).getByText('TypeScript')).toBeTruthy();
    expect(within(frontend).queryByText('Node')).toBeNull();
  });

  it("labels a plain-string skill's bucket exactly as SkillsCard does", () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);

    // Not a hardcoded "Uncategorized": the SAME key SkillsCard's catLabel resolves, so the
    // two surfaces cannot drift into naming one bucket two things.
    const label = i18n.t('cvBuilder.skillsCard.uncategorized');
    const uncategorized = screen.getByText(label).parentElement;
    expect(within(uncategorized).getByText('Algorithms')).toBeTruthy();
  });

  it('localizes only the Uncategorized LABEL — free-form categories pass through', async () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    await i18n.changeLanguage('fr');

    await waitFor(() => expect(screen.getByText('Non classé')).toBeTruthy());
    // 'Frontend' is a stored, user/AI-authored category — there is nothing to translate
    // it to, and inventing one would orphan it from the value on the document.
    expect(screen.getByText('Frontend')).toBeTruthy();
    expect(screen.queryByText('Uncategorized')).toBeNull();
  });

  it('keeps the empty state when the section is scored but has no skills', () => {
    // No skills AND no scan would hide the section entirely (`show`), so the empty state
    // is only reachable with a verdict on the section — which is exactly when it matters.
    mockCvData = {
      ...skillsCv,
      skills: [],
      studioScan: { fitScore: 40, sections: [{ key: 'skills', band: 'bad', score: 20 }] },
    };
    render(<StudioLivePreview />);

    expect(screen.getByText('No skills yet.')).toBeTruthy();
    // Empty is not the same as uneditable — the way out of the empty state is still here.
    expect(screen.getByRole('button', { name: 'Add skill' })).toBeTruthy();
  });
});

describe('StudioLivePreview — delete a skill', () => {
  it('replaces the array with exactly that skill gone, every other one preserved', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    removeSkill('Node');

    expect(mockReplaceSkills).toHaveBeenCalledTimes(1);
    const [next] = mockReplaceSkills.mock.calls[0];
    // The removed name is gone…
    expect(next.map((s) => (typeof s === 'string' ? s : s.name))).toEqual([
      'React',
      'Algorithms',
      'TypeScript',
    ]);
    // …and the survivors are passed through UNTOUCHED — same categories, and the plain
    // string still a plain string. A whole-array replace is the one write that could
    // quietly rewrite the rest of the section.
    expect(next).toEqual([
      { name: 'React', category: 'Frontend' },
      'Algorithms',
      { name: 'TypeScript', category: 'Frontend' },
    ]);
  });

  it('matches on NAME case-insensitively — skills have no _sortId to address', () => {
    mockCvData = { ...skillsCv, skills: [{ name: 'React' }, 'react', { name: 'Node' }] };
    render(<StudioLivePreview />);
    // Both spellings are the same skill to applySkills' dedupe; deleting has to agree, or
    // the section keeps a duplicate the user believes they just removed.
    removeSkill('React');

    expect(mockReplaceSkills).toHaveBeenCalledWith([{ name: 'Node' }]);
  });

  it('drops the whole section content to an empty array on the last skill', () => {
    mockCvData = { ...skillsCv, skills: [{ name: 'React', category: 'Frontend' }] };
    render(<StudioLivePreview />);
    removeSkill('React');

    expect(mockReplaceSkills).toHaveBeenCalledWith([]);
  });

  it('goes through replaceSkills ALONE — no command channel, no direct draft write', () => {
    // Skills carry no _sortId and no interview, so there is nothing for StudioChat to
    // unpin first: unlike an entry delete, this needs no command and must not send one.
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    removeSkill('Node');

    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
    expect(mockUpdateCvData).not.toHaveBeenCalled();
  });
});

describe('StudioLivePreview — add a skill', () => {
  it('applies the typed name and category', async () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: '  Vitest  ' } });
    fireEvent.change(categoryField(), { target: { value: ' Testing ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(mockApplySkills).toHaveBeenCalledWith([{ name: 'Vitest', category: 'Testing' }])
    );
  });

  it("stores 'Uncategorized' when the category is left blank", async () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Vitest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    // The STORED value, not the localized label — the bucket the builder and the picker
    // both write, so the new skill groups with the rest of them.
    await waitFor(() =>
      expect(mockApplySkills).toHaveBeenCalledWith([{ name: 'Vitest', category: 'Uncategorized' }])
    );
  });

  it('offers the categories already on the CV as a datalist, once each', () => {
    mockCvData = skillsCv;
    const { container } = render(<StudioLivePreview />);
    openAdd();

    const options = [...container.querySelectorAll('datalist option')].map((o) => o.value);
    // Frontend appears on two skills but is offered once; 'Uncategorized' is the stored
    // fallback for a BLANK field, so offering it would only invite a localized spelling
    // of it to be stored instead.
    expect(options).toEqual(['Frontend', 'Backend']);
  });

  it('submits on Enter from the name field', async () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Vitest' } });
    fireEvent.keyDown(nameField(), { key: 'Enter' });

    await waitFor(() => expect(mockApplySkills).toHaveBeenCalledTimes(1));
  });

  it('closes on Escape without writing', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Vitest' } });
    fireEvent.keyDown(nameField(), { key: 'Escape' });

    expect(screen.queryByLabelText('Skill name')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add skill' })).toBeTruthy();
    expect(mockApplySkills).not.toHaveBeenCalled();
  });

  it('clears and stays open after a successful add, for the next one', async () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Vitest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(nameField().value).toBe(''));
    expect(screen.getByLabelText('Skill name')).toBeTruthy();
  });

  it('treats a DUPE as a quiet no-op — cleared, still open, no toast', async () => {
    // applySkills dedupes by name, so { added: 0 } means the skill is already there. The
    // user's intent is satisfied; a toast would scold them for asking twice.
    mockApplySkills.mockResolvedValue({ ok: true, added: 0 });
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'React' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(nameField().value).toBe(''));
    expect(screen.getByLabelText('Skill name')).toBeTruthy();
    expect(toastCalls.error).not.toHaveBeenCalled();
    expect(toastCalls.success).not.toHaveBeenCalled();
    expect(toastCalls.info).not.toHaveBeenCalled();
  });

  it('KEEPS the typed text when the save fails — applySkills already rolled back + toasted', async () => {
    mockApplySkills.mockResolvedValue({ ok: false, added: 0 });
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: 'Vitest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(mockApplySkills).toHaveBeenCalled());
    // Clearing here would throw the user's text away on the one path they need it back.
    expect(nameField().value).toBe('Vitest');
  });

  it('refuses to write a blank name', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openAdd();

    fireEvent.change(nameField(), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Add' }).disabled).toBe(true);
    fireEvent.keyDown(nameField(), { key: 'Enter' });
    expect(mockApplySkills).not.toHaveBeenCalled();
  });
});

describe('StudioLivePreview — skills editing is EDIT MODE only', () => {
  it('renders no skill controls in preview, where the template render takes over', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    // Present in edit…
    expect(screen.getAllByLabelText('Remove skill').length).toBe(4);
    expect(screen.getByRole('button', { name: 'Add skill' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    // …and gone in preview: the template is the document as it will be downloaded, and a
    // × on a pill is not part of that document.
    expect(screen.getByTestId('production-template')).toBeTruthy();
    expect(screen.queryByLabelText('Remove skill')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add skill' })).toBeNull();
    expect(screen.queryByLabelText('Skill name')).toBeNull();
  });

  it('leaves an open add form behind when the user switches to preview', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openAdd();
    fireEvent.change(nameField(), { target: { value: 'Vitest' } });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.queryByLabelText('Skill name')).toBeNull();
    expect(mockApplySkills).not.toHaveBeenCalled();
  });
});

// The one AI affordance in the section, and the one that must NOT behave like the rest of
// it. Manual add/delete are inline writes; this ROUTES — same split as "Edit with Aria" on
// an entry row, where the preview only ever asks and StudioChat owns the phase.
const suggestBtn = () =>
  screen.queryByRole('button', { name: i18n.t('ariaStudio.livePreview.suggestSkillsWithAria') });

describe('StudioLivePreview — "Suggest skills with Aria"', () => {
  it('sends suggestSkills for the SECTION, with no sortId, and writes nothing', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);

    fireEvent.click(suggestBtn());

    // A skill is addressed by name, so there is no entry id to carry — and the null is
    // what the chat's other command branches are guarded against falling into.
    expect(mockRequestStudioCommand).toHaveBeenCalledTimes(1);
    expect(mockRequestStudioCommand).toHaveBeenCalledWith('suggestSkills', 'skills', null);
    // A REQUEST, not a generation: nothing is added to the CV from the preview.
    expect(mockApplySkills).not.toHaveBeenCalled();
    expect(mockReplaceSkills).not.toHaveBeenCalled();
    expect(mockUpdateCvData).not.toHaveBeenCalled();
  });

  it('sits beside "Add skill" — the free route stays available', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);

    expect(suggestBtn()).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add skill' })).toBeTruthy();
  });

  it('is gone in preview, like every other control in the section', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    expect(suggestBtn()).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(suggestBtn()).toBeNull();
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
  });

  it('closes the SHEET after handing over, so the chat it just opened is visible', () => {
    mockCvData = skillsCv;
    const onClose = vi.fn();
    render(<StudioLivePreview isSheet onClose={onClose} />);

    fireEvent.click(suggestBtn());

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('suggestSkills', 'skills', null);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays OPEN on the inline desktop panel', () => {
    mockCvData = skillsCv;
    const onClose = vi.fn();
    render(<StudioLivePreview isSheet={false} onClose={onClose} />);

    fireEvent.click(suggestBtn());

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('suggestSkills', 'skills', null);
    expect(onClose).not.toHaveBeenCalled();
  });
});
