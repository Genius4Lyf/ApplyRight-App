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
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({
    cvData: mockCvData,
    reorderEntries: mockReorderEntries,
    // The preview may only REQUEST a delete. removeEntry is exposed here purely so the
    // test below can prove the preview never reaches for it.
    requestStudioCommand: mockRequestStudioCommand,
    removeEntry: mockRemoveEntry,
  }),
}));

// framer-motion's useReducedMotion reads matchMedia; jsdom lacks it. Return "not reduced"
// so the pulse effect is allowed to run.
beforeEach(() => {
  i18n.changeLanguage('en');
  mockReorderEntries = vi.fn().mockResolvedValue({ ok: true });
  mockRequestStudioCommand = vi.fn();
  mockRemoveEntry = vi.fn();
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
  const threeRoles = {
    _id: 'd1',
    studioKind: 'build',
    personalInfo: { fullName: 'Ada Lovelace' },
    experience: [
      { _sortId: 'a', title: 'Analyst', company: 'RSA' },
      { _sortId: 'b', title: 'Builder', company: 'BBC' },
      { _sortId: 'c', title: 'Chief', company: 'CDC' },
    ],
    studioScan: null,
  };

  it('moves an experience entry DOWN and sends the new order to reorderEntries', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    // Row order matches list order, so the first "Move down" belongs to entry `a`.
    fireEvent.click(screen.getAllByLabelText('Move down')[0]);
    expect(mockReorderEntries).toHaveBeenCalledTimes(1);
    expect(mockReorderEntries).toHaveBeenCalledWith('experience', ['b', 'a', 'c']);
  });

  it('moves an experience entry UP and sends the new order', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    // Up on the LAST row: c swaps with b.
    const ups = screen.getAllByLabelText('Move up');
    fireEvent.click(ups[ups.length - 1]);
    expect(mockReorderEntries).toHaveBeenCalledWith('experience', ['a', 'c', 'b']);
  });

  it("sends the SINGULAR 'project' section token — SECTION_LIST's key, not 'projects'", () => {
    // The gotcha guard. SECTION_LIST is { experience, project, education }, so a reorder
    // sent as 'projects' resolves to no list key and no-ops silently.
    mockCvData = {
      _id: 'd1',
      studioKind: 'build',
      personalInfo: { fullName: 'Ada Lovelace' },
      projects: [
        { _sortId: 'p1', title: 'Notes engine' },
        { _sortId: 'p2', title: 'Loom weaver' },
        { _sortId: 'p3', title: 'Difference tabulator' },
      ],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    fireEvent.click(screen.getAllByLabelText('Move down')[0]);
    expect(mockReorderEntries).toHaveBeenCalledWith('project', ['p2', 'p1', 'p3']);
    expect(mockReorderEntries.mock.calls[0][0]).toBe('project'); // NOT 'projects'
  });

  it('reorders education under its own section token', () => {
    mockCvData = {
      _id: 'd1',
      studioKind: 'build',
      personalInfo: { fullName: 'Ada Lovelace' },
      education: [
        { _sortId: 'edu-a', degree: 'BSc', school: 'UNILAG' },
        { _sortId: 'edu-b', degree: 'MSc', school: 'UI' },
      ],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    fireEvent.click(screen.getAllByLabelText('Move down')[0]);
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
    fireEvent.click(screen.getAllByLabelText('Move down')[0]);
    expect(mockReorderEntries).toHaveBeenCalledWith('experience', ['b', 'a', 'c']);
  });

  it('renders NO reorder controls for a single-entry section', () => {
    mockCvData = {
      _id: 'd1',
      studioKind: 'build',
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
    const ups = screen.getAllByLabelText('Move up');
    const downs = screen.getAllByLabelText('Move down');
    expect(ups[0].disabled).toBe(true);
    expect(ups[1].disabled).toBe(false);
    expect(downs[downs.length - 1].disabled).toBe(true);
    expect(downs[0].disabled).toBe(false);
  });

  it('leaves SKILLS alone — index-keyed pills are out of scope this slice', () => {
    mockCvData = { ...threeRoles, skills: ['Algorithms', 'Analysis'] };
    render(<StudioLivePreview />);
    // Exactly one control cluster per experience row (3), and none for the two skills.
    expect(screen.getAllByLabelText('Move down')).toHaveLength(3);
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

  const threeRoles = {
    _id: 'd1',
    studioKind: 'build',
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
  // Arm the confirm on row `i`, then press its Remove.
  const removeRow = (i = 0) => {
    fireEvent.click(screen.getAllByLabelText('Remove')[i]);
    fireEvent.click(confirmStrip().getByRole('button', { name: 'Remove' }));
  };

  it('shows an inline confirm on the first Remove tap — no modal', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    // Three entries → three Remove controls (before any is tapped).
    expect(screen.getAllByLabelText('Remove')).toHaveLength(3);
    expect(screen.queryByText('Remove this?')).toBeNull();

    fireEvent.click(screen.getAllByLabelText('Remove')[0]);

    // The trash is now a two-state confirm ON THE ROW (no modal, no dialog).
    expect(screen.getByText('Remove this?')).toBeTruthy();
    expect(confirmStrip().getByRole('button', { name: 'Remove' })).toBeTruthy();
    expect(confirmStrip().getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    // Only the armed row confirms — the other two are untouched.
    expect(screen.getAllByText('Remove this?')).toHaveLength(1);
    // And that row's own trash is gone while it's armed (3 → 2).
    expect(screen.getAllByLabelText('Remove')).toHaveLength(2);
  });

  it('Cancel returns the row to the idle trash — no command sent', () => {
    mockCvData = threeRoles;
    render(<StudioLivePreview />);
    fireEvent.click(screen.getAllByLabelText('Remove')[0]);
    expect(screen.getByText('Remove this?')).toBeTruthy();

    fireEvent.click(confirmStrip().getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Remove this?')).toBeNull();
    expect(screen.getAllByLabelText('Remove')).toHaveLength(3); // back to idle
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
      studioKind: 'build',
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
      studioKind: 'build',
      personalInfo: { fullName: 'Ada' },
      education: [{ _sortId: 'edu-a', degree: 'BSc', school: 'UNILAG', description: '• study' }],
      studioScan: null,
    };
    render(<StudioLivePreview />);
    // A SINGLE-entry section still offers delete — it has no reorder controls, but its
    // last entry is exactly the one a user may want gone.
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
