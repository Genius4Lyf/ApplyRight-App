// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// The component reads its CV from the Studio context — drive it through a mutable stub so
// each test controls cvData (and can mutate the scan to prove the pulse).
//
// Both bindings are read INSIDE the hook body, not in the factory scope, so the hoisted
// vi.mock never touches them before they're initialised.
let mockCvData = null;
let mockReorderEntries;
let mockRequestStudioCommand;
let mockRemoveEntry;
let mockSelectTemplate;
let mockAddRole;
let mockAddProject;
let mockAddEducation;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    reorderEntries: mockReorderEntries,
    // The preview may only REQUEST a delete. removeEntry is exposed here purely so the
    // test below can prove the preview never reaches for it.
    requestStudioCommand: mockRequestStudioCommand,
    removeEntry: mockRemoveEntry,
    selectTemplate: mockSelectTemplate,
    addRole: mockAddRole,
    addProject: mockAddProject,
    addEducation: mockAddEducation,
  }),
}));
vi.mock('../TemplatePreviewThumb', () => ({
  default: ({ templateId }) => <span data-testid={`template-thumb-${templateId}`} />,
}));
vi.mock('../CVTemplateRenderer', () => ({
  default: ({ application }) => (
    <div data-testid="production-template">{application.templateId}</div>
  ),
}));

// framer-motion's useReducedMotion reads matchMedia; jsdom lacks it. Return "not reduced"
// so the pulse effect is allowed to run.
beforeEach(() => {
  i18n.changeLanguage('en');
  mockReorderEntries = vi.fn().mockResolvedValue({ ok: true });
  mockRequestStudioCommand = vi.fn();
  mockRemoveEntry = vi.fn();
  mockSelectTemplate = vi.fn().mockResolvedValue({ ok: true });
  mockAddRole = vi.fn().mockResolvedValue('new-role');
  mockAddProject = vi.fn().mockResolvedValue('new-project');
  mockAddEducation = vi.fn().mockResolvedValue('new-edu');
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

const withScan = (sections) => ({
  _id: 'd1',
  title: 'My CV',
  personalInfo: {
    fullName: 'Ada Lovelace',
    email: 'ada@x.com',
    photoUrl: 'data:image/jpeg;base64,photo',
  },
  professionalSummary: 'Analytical engine pioneer.',
  experience: [
    { _sortId: 'e1', title: 'Analyst', company: 'RSA', description: '• Led the notes' },
    { _sortId: 'blank-role', title: '', company: '', description: '' },
  ],
  projects: [],
  skills: ['Algorithms'],
  education: [],
  certifications: [{ name: 'Cloud Fundamentals', issuer: 'ApplyRight', date: '2026' }],
  studioScan: { fitScore: 60, sections },
});

describe('StudioLivePreview — Edit / Preview modes', () => {
  it('opens the production template view and routes template choices through the draft writer', () => {
    mockCvData = {
      _id: 'd1',
      title: 'My CV',
      templateId: 'ats-clean',
      personalInfo: { fullName: 'Ada Lovelace' },
      experience: [{ _sortId: 'e1', title: 'Analyst', company: 'RSA' }],
      studioScan: null,
    };
    render(<StudioLivePreview />);

    const editMode = screen
      .getAllByRole('button', { name: 'Edit' })
      .find((button) => button.hasAttribute('aria-pressed'));
    expect(editMode?.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByText('Choose a template')).toBeTruthy();
    expect(screen.getByTestId('production-template').textContent).toBe('ats-clean');
    fireEvent.click(screen.getByRole('option', { name: 'Student ATS' }));
    expect(mockSelectTemplate).toHaveBeenCalledWith('student-ats');
  });
});

describe('StudioLivePreview — empty state', () => {
  it('shows the run-a-scan prompt for an EMPTY TAILOR session', () => {
    mockCvData = { _id: 'd1', title: 'My CV', personalInfo: {}, studioScan: null };
    render(<StudioLivePreview />);
    expect(screen.getByText(/Run a scan and your CV lights up here/i)).toBeTruthy();
  });

  it('shows the BUILD copy for an empty build session — "run a scan" is advice it can\'t take', () => {
    mockCvData = {
      _id: 'd1',
      title: 'My CV',
      studioKind: 'build',
      personalInfo: {},
      studioScan: null,
    };
    render(<StudioLivePreview />);
    expect(screen.getByText(/Your CV will take shape here as you build it/i)).toBeTruthy();
    expect(screen.queryByText(/Run a scan/i)).toBeNull();
  });

  it('treats a draft of only BLANK placeholder entries as empty', () => {
    // The Studio seeds empty rows before Aria writes into them; a sheet of empty
    // headings is not a document.
    mockCvData = {
      _id: 'd1',
      studioKind: 'build',
      personalInfo: { fullName: '   ' },
      professionalSummary: '   ',
      experience: [{ _sortId: 'blank', title: '', company: '', description: '' }],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    expect(screen.getByText(/Your CV will take shape here as you build it/i)).toBeTruthy();
  });
});

describe('StudioLivePreview — ungated for build sessions (no scan)', () => {
  // The regression this slice fixes: the whole sheet used to be gated on `!scan`, so a
  // build session — which has no scan BY DEFINITION — could never see its own CV.
  const buildCv = {
    _id: 'd1',
    title: 'My CV',
    studioKind: 'build',
    personalInfo: { fullName: 'Ada Lovelace', email: 'ada@x.com' },
    professionalSummary: 'Analytical engine pioneer.',
    experience: [
      { _sortId: 'e1', title: 'Analyst', company: 'RSA', description: '• Led the notes' },
    ],
    education: [{ _sortId: 'edu-1', degree: 'BSc Mathematics', school: 'UNILAG' }],
    skills: ['Algorithms'],
    studioScan: null,
  };

  it('renders the document with NO scan present', () => {
    mockCvData = buildCv;
    render(<StudioLivePreview />);
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Analytical engine pioneer.')).toBeTruthy();
    expect(screen.getByText('Led the notes')).toBeTruthy();
    expect(screen.getByText(/BSc Mathematics/)).toBeTruthy();
    expect(screen.getByText('Algorithms')).toBeTruthy();
    expect(screen.queryByText(/Run a scan/i)).toBeNull();
  });

  it('shows NO verdict chips without a scan — every band is neutral', () => {
    mockCvData = buildCv;
    render(<StudioLivePreview />);
    for (const verdict of ['Strong', 'Needs work', 'Weak']) {
      expect(screen.queryByText(verdict)).toBeNull();
    }
  });

  it('renders a GREY rail for every section when unscored', () => {
    mockCvData = buildCv;
    const { container } = render(<StudioLivePreview />);
    const rails = container.querySelectorAll('section > span[aria-hidden="true"]');
    expect(rails.length).toBeGreaterThan(0);
    // A neutral (unscored) band paints BAND_RULEBG.neutral = bg-slate-400. bg-slate-300 is
    // only the SectionBlock fallback for an unknown band, which 'neutral' never triggers.
    for (const rail of rails) expect(rail.className).toMatch(/bg-slate-400/);
  });

  it('renders the sheet off a single field — a name alone is a document', () => {
    mockCvData = { _id: 'd1', studioKind: 'build', personalInfo: { fullName: 'Ada' } };
    render(<StudioLivePreview />);
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.queryByText(/take shape here/i)).toBeNull();
  });

  it('keys education rows on _sortId — the backend prerequisite for this slice', () => {
    // Education entries only became individually addressable once DraftCV declared
    // _sortId; before that the ids were stripped on save and every row keyed on undefined.
    mockCvData = {
      ...buildCv,
      education: [
        { _sortId: 'edu-a', degree: 'BSc', school: 'UNILAG' },
        { _sortId: 'edu-b', degree: 'MSc', school: 'UI' },
      ],
    };
    render(<StudioLivePreview />);
    expect(screen.getByText(/BSc/)).toBeTruthy();
    expect(screen.getByText(/MSc/)).toBeTruthy();
  });
});

describe('StudioLivePreview — section bands from the scan', () => {
  it('renders the document with each section verdict from studioScan', () => {
    mockCvData = withScan([
      { key: 'summary', band: 'ok', score: 80 },
      { key: 'experience', band: 'warn', score: 55 },
      { key: 'skills', band: 'bad', score: 20 },
    ]);
    render(<StudioLivePreview />);

    // Content is rendered from cvData (not markdown).
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Analytical engine pioneer.')).toBeTruthy();
    expect(screen.getByText('Led the notes')).toBeTruthy();
    expect(screen.getByAltText('Profile photo preview')).toBeTruthy();
    expect(screen.getByText(/Cloud Fundamentals/)).toBeTruthy();
    expect(screen.queryByText('Job title')).toBeNull();

    // Verdict chips reflect each section's band.
    expect(screen.getByText('Strong')).toBeTruthy(); // summary ok
    expect(screen.getByText('Needs work')).toBeTruthy(); // experience warn
    expect(screen.getByText('Weak')).toBeTruthy(); // skills bad
  });
});

describe('StudioLivePreview — section labels track the CV language', () => {
  const sections = [
    { key: 'summary', band: 'ok', score: 80 },
    { key: 'experience', band: 'warn', score: 55 },
    { key: 'skills', band: 'bad', score: 20 },
  ];

  it('renders English section labels by default', () => {
    mockCvData = withScan(sections);
    render(<StudioLivePreview />);
    // The <h3> textContent is the real string; the uppercase is CSS-only.
    for (const l of ['Contact', 'Summary', 'Experience', 'Skills']) {
      expect(screen.getByText(l)).toBeTruthy();
    }
  });

  it('renders FRENCH section labels when outputLang is fr — the FIX', () => {
    mockCvData = { ...withScan(sections), outputLang: 'fr' };
    render(<StudioLivePreview />);
    // Short panel forms: Summary→Résumé, Experience→Expérience, Skills→Compétences.
    for (const l of ['Contact', 'Résumé', 'Expérience', 'Compétences']) {
      expect(screen.getByText(l)).toBeTruthy();
    }
    // The English labels are gone — proving the flip actually did something.
    expect(screen.queryByText('Summary')).toBeNull();
    expect(screen.queryByText('Experience')).toBeNull();
    expect(screen.queryByText('Skills')).toBeNull();
  });
});

describe('StudioLivePreview — reorder entries', () => {
  // The chevron path is what's asserted here. A real pointer drag needs layout geometry
  // jsdom doesn't produce, so the actual drag is verified in the browser; the chevrons and
  // the drag share ONE commit path (arrayMove over the displayed list → reorderEntries),
  // so covering them covers the payload shape for both.
  // A tailor session (no studioKind: 'build'), so the panel is unlocked regardless of
  // completeness — these tests exercise edit-CONTROL routing, which the completeness lock
  // (covered in its own block below) is orthogonal to.
  const threeRoles = {
    _id: 'd1',
    personalInfo: { fullName: 'Ada Lovelace' },
    experience: [
      { _sortId: 'a', title: 'Analyst', company: 'RSA' },
      { _sortId: 'b', title: 'Builder', company: 'BBC' },
      { _sortId: 'c', title: 'Chief', company: 'CDC' },
    ],
    studioScan: null,
  };
  const chooseAction = (name, row = 0) => {
    fireEvent.click(screen.getAllByLabelText('Edit')[row]);
    fireEvent.click(screen.getByRole('menuitem', { name }));
  };

  it('moves an experience entry DOWN and sends the new order to reorderEntries', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    // Row order matches list order, so the first "Move down" belongs to entry `a`.
    chooseAction('Move down');
    expect(mockReorderEntries).toHaveBeenCalledTimes(1);
    expect(mockReorderEntries).toHaveBeenCalledWith('experience', ['b', 'a', 'c']);
  });

  it('moves an experience entry UP and sends the new order', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    // Up on the LAST row: c swaps with b.
    chooseAction('Move up', 2);
    expect(mockReorderEntries).toHaveBeenCalledWith('experience', ['a', 'c', 'b']);
  });

  it("sends the SINGULAR 'project' section token — SECTION_LIST's key, not 'projects'", () => {
    // The gotcha guard. SECTION_LIST is { experience, project, education }, so a reorder
    // sent as 'projects' resolves to no list key and no-ops silently.
    mockCvData = {
      _id: 'd1',
      personalInfo: { fullName: 'Ada Lovelace' },
      projects: [
        { _sortId: 'p1', title: 'Notes engine' },
        { _sortId: 'p2', title: 'Loom weaver' },
        { _sortId: 'p3', title: 'Difference tabulator' },
      ],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    chooseAction('Move down');
    expect(mockReorderEntries).toHaveBeenCalledWith('project', ['p2', 'p1', 'p3']);
    expect(mockReorderEntries.mock.calls[0][0]).toBe('project'); // NOT 'projects'
  });

  it('reorders education under its own section token', () => {
    mockCvData = {
      _id: 'd1',
      personalInfo: { fullName: 'Ada Lovelace' },
      education: [
        { _sortId: 'edu-a', degree: 'BSc', school: 'UNILAG' },
        { _sortId: 'edu-b', degree: 'MSc', school: 'UI' },
      ],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    chooseAction('Move down');
    expect(mockReorderEntries).toHaveBeenCalledWith('education', ['edu-b', 'edu-a']);
  });

  it("sends only the DISPLAYED entries — hidden blank rows are reorderEntries' business", () => {
    // withoutBlankEntries hides placeholders, so they never reach the order the UI builds.
    // reorderEntries appends them last, which is why passing the displayed order is safe.
    mockCvData = {
      ...threeRoles,
      experience: [...threeRoles.experience, { _sortId: 'blank', title: '', company: '' }],
    };
    render(<StudioLivePreview />);
    chooseAction('Move down');
    expect(mockReorderEntries).toHaveBeenCalledWith('experience', ['b', 'a', 'c']);
  });

  it('renders NO reorder controls for a single-entry section', () => {
    mockCvData = {
      _id: 'd1',
      personalInfo: { fullName: 'Ada Lovelace' },
      experience: [{ _sortId: 'only', title: 'Analyst', company: 'RSA' }],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    expect(screen.getByText(/Analyst/)).toBeTruthy(); // the row itself still renders
    expect(screen.queryByLabelText('Move up')).toBeNull();
    expect(screen.queryByLabelText('Move down')).toBeNull();
    expect(screen.queryByLabelText('Drag to reorder')).toBeNull();
  });

  it('disables Up on the first row and Down on the last', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    fireEvent.click(screen.getAllByLabelText('Edit')[0]);
    expect(screen.getByRole('menuitem', { name: 'Move up' }).disabled).toBe(true);
    expect(screen.getByRole('menuitem', { name: 'Move down' }).disabled).toBe(false);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getAllByLabelText('Edit')[2]);
    expect(screen.getByRole('menuitem', { name: 'Move up' }).disabled).toBe(false);
    expect(screen.getByRole('menuitem', { name: 'Move down' }).disabled).toBe(true);
  });

  it('leaves SKILLS unreorderable — no _sortId means nothing to reorder BY', () => {
    // Skills ARE editable now (delete + add, see StudioLivePreview.skills.test.jsx), but
    // they are addressed by name alone. There is no id to build an order from, so they get
    // no ↑/↓, no grip, and no entry-row cluster — the section is a different shape, not a
    // half-finished one.
    mockCvData = { ...threeRoles, skills: ['Algorithms', 'Analysis'] };
    render(<StudioLivePreview />);
    // Exactly one control cluster per experience row (3), and none for the two skills.
    expect(screen.getAllByLabelText('Edit')).toHaveLength(3);
    expect(screen.getByText('Algorithms')).toBeTruthy();
    expect(screen.getByText('Analysis')).toBeTruthy();
  });
});

describe('StudioLivePreview — transform-on-fix pulse', () => {
  it('pulses ONLY the section whose band improved on re-band', async () => {
    mockCvData = withScan([
      { key: 'summary', band: 'ok', score: 80 },
      { key: 'experience', band: 'bad', score: 20 },
    ]);
    const { rerender, container } = render(<StudioLivePreview />);
    // First render seeds prev bands — nothing pulses.
    expect(container.querySelectorAll('.aria-just-fixed').length).toBe(0);

    // A fix lands: experience improves bad → ok; summary is unchanged.
    mockCvData = withScan([
      { key: 'summary', band: 'ok', score: 80 },
      { key: 'experience', band: 'ok', score: 78 },
    ]);
    rerender(<StudioLivePreview />);

    await waitFor(() => {
      const pulsed = container.querySelectorAll('.aria-just-fixed');
      expect(pulsed.length).toBe(1); // exactly one section pulses
    });
  });
});

describe('StudioLivePreview — delete an entry via command channel', () => {
  // The fix that makes COMMANDED deletes safe. The preview may not call removeEntry
  // directly — StudioChat's self-heal would fire, push "pin cleared", and race the save.
  // Every delete must route through requestStudioCommand instead.

  // A tailor session (see the reorder block's note) — unlocked, so the delete controls are
  // present; the completeness lock is tested separately.
  const threeRoles = {
    _id: 'd1',
    personalInfo: { fullName: 'Ada Lovelace' },
    experience: [
      { _sortId: 'a', title: 'Analyst', company: 'RSA', description: '• one' },
      { _sortId: 'b', title: 'Builder', company: 'BBC', description: '• two' },
      { _sortId: 'c', title: 'Chief', company: 'CDC', description: '• three' },
    ],
    studioScan: null,
  };

  // The armed confirm, scoped. The confirm's Remove button and the OTHER rows' trash
  // icons share one accessible name ("Remove") by design — same action, same word — so
  // every assertion below reads inside the confirm strip rather than across the sheet.
  const confirmStrip = () => within(screen.getByText('Remove this?').parentElement);
  const armRemove = (i = 0) => {
    fireEvent.click(screen.getAllByLabelText('Edit')[i]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
  };
  // Arm the confirm on row `i`, then press its Remove.
  const removeRow = (i = 0) => {
    armRemove(i);
    fireEvent.click(confirmStrip().getByRole('button', { name: 'Remove' }));
  };

  it('shows an inline confirm on the first Remove tap — no modal', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    // Three entries → three Remove controls (before any is tapped).
    expect(screen.getAllByLabelText('Edit')).toHaveLength(3);
    expect(screen.queryByText('Remove this?')).toBeNull();

    armRemove(0);

    // The trash is now a two-state confirm ON THE ROW (no modal, no dialog).
    expect(screen.getByText('Remove this?')).toBeTruthy();
    expect(confirmStrip().getByRole('button', { name: 'Remove' })).toBeTruthy();
    expect(confirmStrip().getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    // Only the armed row confirms — the other two are untouched.
    expect(screen.getAllByText('Remove this?')).toHaveLength(1);
    // And that row's own trash is gone while it's armed (3 → 2).
    expect(screen.getAllByLabelText('Edit')).toHaveLength(2);
  });

  it('Cancel returns the row to the idle trash — no command sent', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    armRemove(0);
    expect(screen.getByText('Remove this?')).toBeTruthy();

    fireEvent.click(confirmStrip().getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Remove this?')).toBeNull();
    expect(screen.getAllByLabelText('Edit')).toHaveLength(3); // back to idle
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
  });

  it('confirmed Remove sends the command WITH THE CORRECT SECTION TOKEN', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    removeRow(1); // entry 'b'

    expect(mockRequestStudioCommand).toHaveBeenCalledTimes(1);
    expect(mockRequestStudioCommand).toHaveBeenCalledWith('deleteEntry', 'experience', 'b');
  });

  it("sends 'project' SINGULAR for projects — the SECTION_LIST gotcha again", () => {
    mockCvData = {
      _id: 'd1',
      personalInfo: { fullName: 'Ada' },
      projects: [
        { _sortId: 'p1', title: 'Notes engine', description: '• proj' },
        { _sortId: 'p2', title: 'Loom weaver', description: '• proj2' },
      ],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    removeRow(0);

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('deleteEntry', 'project', 'p1');
    expect(mockRequestStudioCommand.mock.calls[0][1]).toBe('project'); // NOT 'projects'
  });

  it('commands education deletes under the education token', () => {
    mockCvData = {
      _id: 'd1',
      personalInfo: { fullName: 'Ada' },
      // TWO degrees: deleting the FIRST is a permitted delete (one survives), so this
      // still exercises the 'education' token without tripping the last-entry guard —
      // which has its own suite below.
      education: [
        { _sortId: 'edu-a', degree: 'BSc', school: 'UNILAG', description: '• study' },
        { _sortId: 'edu-b', degree: 'MSc', school: 'UNILAG', description: '• more study' },
      ],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    removeRow(0);

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('deleteEntry', 'education', 'edu-a');
  });

  it('NEVER calls removeEntry directly — the command channel is the ONLY path', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    removeRow(0);

    // The COMMAND was sent.
    expect(mockRequestStudioCommand).toHaveBeenCalled();
    // removeEntry was NOT — StudioChat executes it when it consumes the command.
    expect(mockRemoveEntry).not.toHaveBeenCalled();
  });
});

describe('StudioLivePreview — required sections can never be emptied', () => {
  // The user-facing half of the guard whose silent backstop lives in the context. A CV
  // must keep at least one role, one degree and one skill; the affordance to delete the
  // LAST of any of those is shown DISABLED, with the reason on hover, rather than hidden —
  // a missing trash reads as a bug, a disabled one with a tooltip reads as a rule. Projects
  // are optional, so their last entry stays deletable.
  //
  // `entries` inside the preview is already blank-filtered, so "one visible entry" is one
  // substantive entry — the same count the context backstop recomputes.

  // Open row 0's menu WITHOUT confirming — the disabled item has no onClick to arm it.
  const openMenu = (i = 0) => fireEvent.click(screen.getAllByLabelText('Edit')[i]);
  const removeItem = () => screen.getByRole('menuitem', { name: 'Remove' });

  // The section TOKEN is singular ('project'), but the cvData field is 'projects' — the
  // SECTION_LIST gotcha this suite guards elsewhere. Map it here so a project fixture lands
  // on the key the preview actually reads.
  const LIST_KEY = { experience: 'experience', education: 'education', project: 'projects' };
  const single = (section, entry) => ({
    _id: 'd1',
    personalInfo: { fullName: 'Ada' },
    [LIST_KEY[section]]: [entry],
    studioScan: null,
  });

  it('DISABLES Remove on the last experience, with the reason on hover', () => {
    mockCvData = single('experience', { _sortId: 'a', title: 'Analyst', company: 'RSA' });
    render(<StudioLivePreview />);
    openMenu();

    const item = removeItem();
    // Native DOM assertions — this suite doesn't load jest-dom's custom matchers.
    expect(item.disabled).toBe(true);
    expect(item.getAttribute('title')).toBe(i18n.t('ariaStudio.livePreview.cannotEmptyExperience'));

    // A disabled menuitem has no onClick, so it can't open the confirm — the whole point.
    fireEvent.click(item);
    expect(screen.queryByText('Remove this?')).toBeNull();
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
  });

  it('DISABLES Remove on the last education, with ITS reason', () => {
    mockCvData = single('education', { _sortId: 'edu-a', degree: 'BSc', school: 'UNILAG' });
    render(<StudioLivePreview />);
    openMenu();

    const item = removeItem();
    expect(item.disabled).toBe(true);
    // The education-specific string, not the experience one — the section chooses the copy.
    expect(item.getAttribute('title')).toBe(i18n.t('ariaStudio.livePreview.cannotEmptyEducation'));
    fireEvent.click(item);
    expect(mockRequestStudioCommand).not.toHaveBeenCalled();
  });

  it('KEEPS Remove live on the last project — projects are optional', () => {
    mockCvData = single('project', { _sortId: 'p1', title: 'Notes engine', description: '• x' });
    render(<StudioLivePreview />);
    openMenu();

    const item = removeItem();
    expect(item.disabled).toBe(false);
    // The live variant carries no reason — a title would only invite a tooltip on a button
    // that works.
    expect(item.getAttribute('title')).toBeNull();

    // And it still routes a real delete through the command channel.
    fireEvent.click(item);
    fireEvent.click(
      within(screen.getByText('Remove this?').parentElement).getByRole('button', { name: 'Remove' })
    );
    expect(mockRequestStudioCommand).toHaveBeenCalledWith('deleteEntry', 'project', 'p1');
  });

  it('re-enables Remove on experience the moment a SECOND role exists', () => {
    // The guard is about the last one, not about the section: two roles, both deletable.
    mockCvData = {
      _id: 'd1',
      personalInfo: { fullName: 'Ada' },
      experience: [
        { _sortId: 'a', title: 'Analyst', company: 'RSA' },
        { _sortId: 'b', title: 'Builder', company: 'BBC' },
      ],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    openMenu(0);
    expect(removeItem().disabled).toBe(false);
  });
});

describe('StudioLivePreview — completeness lock', () => {
  // A build session's document is read-only until the CV is genuinely complete (name +
  // summary + experience + education + skills; projects optional — the canonical
  // getCompletionStatus rule). The sheet still renders so the user watches it fill in, but
  // no control shows and the Edit/Preview toggle is gone until it unlocks. Tailor sessions
  // arrive complete and are never locked.

  const completeBuild = {
    _id: 'd1',
    studioKind: 'build',
    personalInfo: { fullName: 'Ada Lovelace' },
    professionalSummary: 'Analytical engine pioneer.',
    experience: [
      { _sortId: 'e1', title: 'Analyst', company: 'RSA', description: '• Led the notes' },
    ],
    education: [{ _sortId: 'edu-1', degree: 'BSc Mathematics', school: 'UNILAG' }],
    skills: ['Algorithms'],
    studioScan: null,
  };
  // The same document with two required sections missing → still incomplete.
  const incompleteBuild = {
    ...completeBuild,
    education: [],
    skills: [],
  };

  it('locks an INCOMPLETE build session — read-only, no toggle, hint shown', () => {
    mockCvData = incompleteBuild;
    render(<StudioLivePreview />);
    // The document still renders — the whole point is watching it take shape.
    expect(screen.getByText('Led the notes')).toBeTruthy();
    // The lock hint explains why editing isn't available yet.
    expect(screen.getByText(/Editing and preview unlock once your CV/i)).toBeTruthy();
    // The Edit/Preview view toggle is gone (the 'Preview' toggle button is its tell).
    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull();
    // And not a single entry-action control is offered.
    expect(screen.queryAllByLabelText('Edit')).toHaveLength(0);
  });

  it('unlocks a COMPLETE build session — toggle and controls return', () => {
    mockCvData = completeBuild;
    render(<StudioLivePreview />);
    expect(screen.queryByText(/Editing and preview unlock once your CV/i)).toBeNull();
    // The toggle is back…
    expect(screen.getByRole('button', { name: 'Preview' })).toBeTruthy();
    // …and the experience row offers its edit control.
    expect(screen.getAllByLabelText('Edit').length).toBeGreaterThan(0);
  });

  it('never locks a TAILOR session, even when its CV is incomplete', () => {
    // No studioKind: 'build' → a tailor session. Missing education/skills, but tailoring
    // starts from a finished CV in hand, so editing stays available.
    mockCvData = { ...incompleteBuild, studioKind: undefined };
    render(<StudioLivePreview />);
    expect(screen.queryByText(/Editing and preview unlock once your CV/i)).toBeNull();
    expect(screen.getAllByLabelText('Edit').length).toBeGreaterThan(0);
  });
});

describe('StudioLivePreview — add-entry footer', () => {
  // A complete build CV so the panel is unlocked (canEdit) — the footer is gated on
  // canEdit exactly like every other row control.
  const completeBuild = {
    _id: 'd1',
    studioKind: 'build',
    personalInfo: { fullName: 'Ada Lovelace' },
    professionalSummary: 'Analytical engine pioneer.',
    experience: [
      { _sortId: 'e1', title: 'Analyst', company: 'RSA', description: '• Led the notes' },
    ],
    projects: [],
    education: [{ _sortId: 'edu-1', degree: 'BSc Mathematics', school: 'UNILAG' }],
    skills: ['Algorithms'],
    studioScan: null,
  };

  it('shows the add footer on each entry-section in edit mode', () => {
    mockCvData = completeBuild;
    render(<StudioLivePreview />);
    expect(screen.getAllByText('Add manually')).toHaveLength(3); // experience, projects, education
    expect(screen.getAllByText('Build with Aria')).toHaveLength(3);
  });

  it('renders the projects footer even with ZERO projects', () => {
    mockCvData = completeBuild; // projects: []
    render(<StudioLivePreview />);
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('"Add manually" creates an entry and opens its inline editor', async () => {
    mockAddRole = vi.fn().mockImplementation(async () => {
      const sortId = 'new-role';
      mockCvData = {
        ...mockCvData,
        experience: [
          ...(mockCvData.experience || []),
          { _sortId: sortId, title: '', company: '', description: '' },
        ],
      };
      return sortId;
    });
    mockCvData = completeBuild;
    render(<StudioLivePreview />);

    fireEvent.click(screen.getAllByText('Add manually')[0]); // experience is first
    expect(mockAddRole).toHaveBeenCalled();

    // The freshly-created blank entry is spliced back into the displayed list (it would
    // otherwise be blank-filtered out) and its inline editor opens straight away.
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Role')).toBeTruthy();
    });
  });

  it('"Build with Aria" sends the addEntry command and closes the sheet when isSheet', () => {
    mockCvData = completeBuild;
    const onClose = vi.fn();
    render(<StudioLivePreview isSheet onClose={onClose} />);

    fireEvent.click(screen.getAllByText('Build with Aria')[0]); // experience

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('addEntry', 'experience', null);
    expect(onClose).toHaveBeenCalled();
  });

  it("sends the SINGULAR 'project' token for the projects footer", () => {
    mockCvData = completeBuild;
    render(<StudioLivePreview />);

    fireEvent.click(screen.getAllByText('Build with Aria')[1]); // projects is second

    expect(mockRequestStudioCommand).toHaveBeenCalledWith('addEntry', 'project', null);
  });
});
