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
// sonner's toast is a callable with .error/.success/.info on it, and both halves matter
// here: MOVING a skill announces itself with an Undo action (toast(...)), while a dupe ADD
// stays a quiet no-op by design — and the cheapest way for that to regress is a
// well-meaning success toast.
// (vi.hoisted: the factory is hoisted ABOVE this const, and CvLanguageToggle also imports
// sonner, so the mock resolves before `toastCalls` would otherwise exist.)
const toastCalls = vi.hoisted(() => {
  const fn = vi.fn();
  fn.error = vi.fn();
  fn.success = vi.fn();
  fn.info = vi.fn();
  return fn;
});
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
  toastCalls.mockClear();
  Object.values(toastCalls).forEach((spy) => spy.mockClear?.());
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

    const labels = [...container.querySelectorAll('[data-skill-group]')].map(
      (node) => node.textContent
    );
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

  it('DISABLES the × on the last skill, and says why', () => {
    // Skills is a required section, so the last one is not deletable. The guard is the
    // affordance itself — disabled, with the reason on it — rather than a click that
    // fails: a × that looks live and then refuses reads as a broken button.
    mockCvData = { ...skillsCv, skills: [{ name: 'React', category: 'Frontend' }] };
    render(<StudioLivePreview />);

    const reason = i18n.t('ariaStudio.livePreview.cannotEmptySkills');
    const x = within(pill('React')).getByLabelText(reason);
    // Native DOM assertions — this suite doesn't load jest-dom's custom matchers.
    expect(x.disabled).toBe(true);
    // The reason is on the title too, so hovering explains it without a screen reader.
    expect(x.getAttribute('title')).toBe(reason);
    // And the generic label is GONE, which is what makes the disabled state discoverable
    // rather than a silently dead control wearing the same name as a working one.
    expect(within(pill('React')).queryByLabelText('Remove skill')).toBeNull();

    fireEvent.click(x);
    expect(mockReplaceSkills).not.toHaveBeenCalled();
  });

  it('re-enables every × as soon as a SECOND skill exists', () => {
    // The other side of the predicate: the guard is about the last skill, not about skills.
    mockCvData = { ...skillsCv, skills: [{ name: 'React' }, { name: 'Node' }] };
    render(<StudioLivePreview />);

    ['React', 'Node'].forEach((name) => {
      expect(within(pill(name)).getByLabelText('Remove skill').disabled).toBe(false);
    });

    // …and deleting down TO one is allowed — it's emptying that isn't.
    removeSkill('Node');
    expect(mockReplaceSkills).toHaveBeenCalledWith([{ name: 'React' }]);
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

// ─── Rearranging: moving a skill between groups, and renaming a group ───
//
// Aria's grouping is wrong often enough to matter, and until now the only fix was to
// delete the skill and retype it under a different category — losing its evidence and its
// talking point along the way.
//
// Drag is exercised through the "Move to…" menu rather than through dnd-kit's pointer
// events: jsdom has no layout, so a synthetic drag measures nothing. The menu is not a
// stand-in for the real thing either — it is the path a phone user and a keyboard user
// actually take, so it is the one worth holding.
const openMenu = (name) =>
  fireEvent.click(within(pill(name)).getByLabelText(`Move ${name} to another group`));
// A group heading is a button too — that is what makes it renameable — so a destination
// has to be found INSIDE the menu or "Backend" matches two things.
const menu = () => screen.getByText('Move to').parentElement;
const moveTo = (name, destination) => {
  openMenu(name);
  fireEvent.click(within(menu()).getByRole('button', { name: destination }));
};
const groupNames = (container) =>
  [...container.querySelectorAll('[data-skill-group]')].map((node) => node.textContent);

describe('StudioLivePreview — rearranging skills', () => {
  it('offers the OTHER groups, never the one it is already in', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openMenu('React');

    expect(within(menu()).getByRole('button', { name: 'Backend' })).toBeTruthy();
    expect(within(menu()).getByRole('button', { name: 'New group…' })).toBeTruthy();
    // 'Frontend' is still on screen as React's own heading — but not as a destination.
    expect(within(menu()).queryByText('Frontend')).toBeNull();
  });

  it('moves the skill and keeps every other group where it was', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    moveTo('React', 'Backend');

    expect(mockReplaceSkills).toHaveBeenCalledTimes(1);
    const next = mockReplaceSkills.mock.calls[0][0];
    // Landed at the END of Backend, not at the front and not where it used to sit.
    expect(next.map((s) => (typeof s === 'string' ? s : s.name))).toEqual([
      'Node',
      'React',
      'Algorithms',
      'TypeScript',
    ]);
    expect(next.find((s) => s.name === 'React').category).toBe('Backend');
  });

  it('keeps the evidence a move exists to preserve', async () => {
    // The whole reason to move rather than delete-and-retype.
    mockCvData = {
      ...skillsCv,
      skills: [
        { name: 'React', category: 'Frontend', evidence: [{ refIndex: 0 }], talkingPoint: 'At X…' },
        { name: 'Node', category: 'Backend' },
      ],
    };
    render(<StudioLivePreview />);
    moveTo('React', 'Backend');

    const moved = mockReplaceSkills.mock.calls[0][0].find((s) => s.name === 'React');
    expect(moved.evidence).toEqual([{ refIndex: 0 }]);
    expect(moved.talkingPoint).toBe('At X…');
  });

  it('says so when the move empties a group, and Undo puts it back', async () => {
    // Nothing is deleted — the heading is derived, so it disappears with no other trace.
    // That is exactly why it has to be said out loud.
    mockCvData = {
      ...skillsCv,
      skills: [
        { name: 'React', category: 'Frontend' },
        { name: 'Node', category: 'Backend' },
      ],
    };
    render(<StudioLivePreview />);
    const before = mockCvData.skills;
    moveTo('Node', 'Frontend');

    await waitFor(() => expect(toastCalls).toHaveBeenCalled());
    const [message, options] = toastCalls.mock.calls[0];
    expect(message).toMatch(/Backend was empty, so it is gone/);

    options.action.onClick();
    expect(mockReplaceSkills).toHaveBeenLastCalledWith(before);
  });

  it('stays quiet about a group that survives the move', async () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    moveTo('React', 'Backend'); // Frontend still has TypeScript

    await waitFor(() => expect(toastCalls).toHaveBeenCalled());
    expect(toastCalls.mock.calls[0][0]).toBe('Moved to Backend.');
  });

  it('renames a group in place, rewriting every member', async () => {
    mockCvData = skillsCv;
    const { container } = render(<StudioLivePreview />);

    fireEvent.click(screen.getByRole('button', { name: 'Frontend' }));
    const input = screen.getByLabelText('Rename this group');
    fireEvent.change(input, { target: { value: 'Client-side' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(mockReplaceSkills).toHaveBeenCalledTimes(1));
    const next = mockReplaceSkills.mock.calls[0][0];
    expect(next.filter((s) => s.category === 'Client-side').map((s) => s.name)).toEqual([
      'React',
      'TypeScript',
    ]);
    // Nothing else moved.
    expect(groupNames(container)).toEqual(['Frontend', 'Backend', 'Uncategorized']);
  });

  it('merges when renamed onto a group that already exists, and says so', async () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);

    fireEvent.click(screen.getByRole('button', { name: 'Backend' }));
    const input = screen.getByLabelText('Rename this group');
    fireEvent.change(input, { target: { value: 'Frontend' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(toastCalls).toHaveBeenCalled());
    expect(toastCalls.mock.calls[0][0]).toBe('Merged into Frontend.');
  });

  it('abandons a rename on Escape without writing', () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);

    fireEvent.click(screen.getByRole('button', { name: 'Frontend' }));
    const input = screen.getByLabelText('Rename this group');
    fireEvent.change(input, { target: { value: 'Client-side' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockReplaceSkills).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Frontend' })).toBeTruthy();
  });

  it('starts a rename of Uncategorized from EMPTY, not from its localized label', () => {
    // 'Uncategorized' is a STORED sentinel whose display is translated. Seeding the field
    // with the label would let a French user save a category no other surface groups by.
    mockCvData = skillsCv;
    render(<StudioLivePreview />);

    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('cvBuilder.skillsCard.uncategorized') })
    );
    expect(screen.getByLabelText('Rename this group').value).toBe('');
  });

  it('names a brand-new group before moving anything into it', async () => {
    mockCvData = skillsCv;
    render(<StudioLivePreview />);
    openMenu('React');
    fireEvent.click(within(menu()).getByRole('button', { name: 'New group…' }));

    // Nothing is written until the group has a name — a blank one would silently be
    // 'Uncategorized', which is not what the user asked for.
    expect(mockReplaceSkills).not.toHaveBeenCalled();

    const input = screen.getByLabelText('Group name');
    fireEvent.change(input, { target: { value: 'Languages' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(mockReplaceSkills).toHaveBeenCalledTimes(1));
    const moved = mockReplaceSkills.mock.calls[0][0].find((s) => s.name === 'React');
    expect(moved.category).toBe('Languages');
  });

  it('hands out no rearranging affordances when the sheet is locked', () => {
    // The build-track completeness lock. The groups still READ — only the controls go.
    mockCvData = { ...skillsCv, studioKind: 'build', experience: [], education: [] };
    const { container } = render(<StudioLivePreview />);

    expect(container.querySelectorAll('[data-skill-group]').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Move React to another group')).toBeNull();
    expect(screen.queryByLabelText('Drag React to another group')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Frontend' })).toBeNull();
    expect(screen.queryByText('Drop a skill here to start a new group')).toBeNull();
  });
});
