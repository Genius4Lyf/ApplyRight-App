import { describe, it, expect } from 'vitest';
import {
  derivePhase,
  phaseForNewSession,
  sessionRow,
  finishSummary,
  sectionNote,
  buildProgress,
  BUILD_SECTIONS,
  entryProgress,
  roleStage,
  bulletCount,
  pinnedSortId,
  pinnedSection,
  projectTypeFor,
  resolveProjectType,
  resolvePinnedEntry,
  withoutBlankEntries,
  openFix,
  rankEntriesByGap,
  scoreDelta,
  FIX_MODE,
  ENTRY_SOURCE,
  STEP_FOR_FOCUS,
} from './studioFlow';
// The real locale bundles — sectionNote's whole job is turning a key into the string a
// user sees, so asserting against anything else would test nothing.
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';

// A transcript is built by appending markers, exactly as StudioChat does — so these
// tests exercise the real sequences a session produces, not hand-built fixtures.
const INTAKE = [
  { who: 'aria', text: 'hello' },
  { who: 'modepick', mode: 'tailor' },
  { who: 'jobcard', jobTitle: 'Backend Engineer', jobDescription: 'x', brief: {} },
  { who: 'briefcard', confirmed: true },
  { who: 'cvpick', sourceTitle: 'My CV' },
  { who: 'tailored', draftId: 'd1', title: 'My CV — Backend Engineer' },
  { who: 'scan' },
];

const upTo = (marker) => {
  const i = INTAKE.findIndex((m) => m.who === marker);
  return INTAKE.slice(0, i + 1);
};

describe('derivePhase — intake', () => {
  it('starts at the mode fork on an empty transcript', () => {
    expect(derivePhase([])).toBe('mode');
    expect(derivePhase()).toBe('mode');
  });

  it('advances one step per milestone marker', () => {
    expect(derivePhase(upTo('modepick'))).toBe('job');
    expect(derivePhase(upTo('jobcard'))).toBe('brief');
    expect(derivePhase(upTo('briefcard'))).toBe('cv');
    expect(derivePhase(upTo('tailored'))).toBe('scanoffer');
    expect(derivePhase(upTo('scan'))).toBe('results');
  });

  it('ignores ordinary chat turns', () => {
    const chatty = [
      { who: 'aria', text: 'hi' },
      { who: 'user', text: 'hey' },
      { who: 'modepick', mode: 'tailor' },
      { who: 'user', text: 'what do you need?' },
      { who: 'aria', text: 'the job' },
    ];
    expect(derivePhase(chatty)).toBe('job');
  });

  it('tolerates null/malformed entries rather than throwing', () => {
    expect(derivePhase([null, undefined, {}, { who: 'modepick' }])).toBe('job');
  });
});

describe('derivePhase — the fix loop', () => {
  const scanned = upTo('scan');

  it('enters the routed fix mode when a section is tapped', () => {
    const s = [...scanned, { who: 'fixstart', mode: 'pick', sectionKey: 'experience' }];
    expect(derivePhase(s)).toBe('fix:pick');
  });

  it('narrows pick → rewrite while a paid before/after list is pending', () => {
    // Picking a role in a TAILOR session opens the rewrite, not the interview. The rows
    // are PAID output, so the pending is what survives a refresh — without this branch a
    // reload drops back to the picker and the user pays for the same rewrite twice.
    const s = [...scanned, { who: 'fixstart', mode: 'pick', sectionKey: 'experience' }];
    expect(
      derivePhase(s, {
        studioPending: { kind: 'rewrite', section: 'experience', sortId: 'a', rows: [] },
      })
    ).toBe('fix:rewrite');
  });

  it('leaves the picker alone when the pending is some OTHER kind', () => {
    const s = [...scanned, { who: 'fixstart', mode: 'pick', sectionKey: 'experience' }];
    expect(derivePhase(s, { studioPending: { kind: 'skills', data: {} } })).toBe('fix:pick');
  });

  it('narrows pick → project-ideas while paid ideas are pending', () => {
    // Same reasoning as the rewrite above: the three ideas cost a credit, so a refresh
    // must not drop the user back on the empty projects picker and charge them twice.
    const s = [...scanned, { who: 'fixstart', mode: 'pick', sectionKey: 'projects' }];
    const pending = { studioPending: { kind: 'projectideas', ideas: [{ id: 'i1' }] } };
    expect(derivePhase(s, pending)).toBe('fix:project-ideas');
  });

  it('an EXPLICIT coach marker outranks pending project ideas too', () => {
    // "Build this with Aria" pushes the coach marker; the interview is the newer intent.
    const s = [
      ...scanned,
      { who: 'fixstart', mode: 'pick', sectionKey: 'projects' },
      { who: 'fixstart', mode: 'coach', sectionKey: 'projects', entry: { sortId: 'p1' } },
    ];
    expect(derivePhase(s, { studioPending: { kind: 'projectideas', ideas: [] } })).toBe(
      'fix:coach'
    );
  });

  it('an EXPLICIT coach marker outranks a stale rewrite pending', () => {
    // "Interview me instead" pushes the coach marker; if a pending somehow lingers, the
    // marker is the more recent statement of intent and must win.
    const s = [
      ...scanned,
      { who: 'fixstart', mode: 'pick', sectionKey: 'experience' },
      { who: 'fixstart', mode: 'coach', sectionKey: 'experience', entry: { sortId: 'a' } },
    ];
    expect(derivePhase(s, { studioPending: { kind: 'rewrite', sortId: 'a' } })).toBe('fix:coach');
  });

  it('narrows pick → coach when an entry is chosen', () => {
    const s = [
      ...scanned,
      { who: 'fixstart', mode: 'pick', sectionKey: 'experience' },
      { who: 'fixstart', mode: 'coach', sectionKey: 'experience', entry: { sortId: 'a' } },
    ];
    expect(derivePhase(s)).toBe('fix:coach');
  });

  it('RESTORES a mid-coach session — the refresh case', () => {
    // Exactly what's on the draft when someone reloads three turns into a build-with.
    const midCoach = [
      ...scanned,
      { who: 'fixstart', mode: 'pick', sectionKey: 'experience' },
      { who: 'fixstart', mode: 'coach', sectionKey: 'experience', entry: { sortId: 'a' } },
      { who: 'aria', text: 'Tell me one thing you did there.' },
      { who: 'user', text: 'I ran the pressure tests.' },
      { who: 'aria', text: 'How often?' },
    ];
    expect(derivePhase(midCoach)).toBe('fix:coach');
    expect(openFix(midCoach).entry.sortId).toBe('a');
    // And the conversation itself is intact in the transcript.
    expect(midCoach.filter((m) => m.who === 'user').length).toBe(1);
  });

  it('returns to the breakdown once the fix closes', () => {
    const s = [
      ...scanned,
      { who: 'fixstart', mode: 'pick', sectionKey: 'experience' },
      { who: 'fixstart', mode: 'coach', entry: { sortId: 'a' } },
      { who: 'applied', sectionKey: 'experience', applied: ['• did a thing'] },
      { who: 'fixend' },
    ];
    expect(derivePhase(s)).toBe('results');
    expect(openFix(s)).toBeNull();
  });

  it('reopens cleanly for a second section after the first closed', () => {
    const s = [
      ...scanned,
      { who: 'fixstart', mode: 'pick', sectionKey: 'experience' },
      { who: 'fixend' },
      { who: 'fixstart', mode: 'skills', sectionKey: 'skills' },
    ];
    expect(derivePhase(s)).toBe('fix:skills');
    expect(openFix(s).sectionKey).toBe('skills');
  });

  it('an open fix outranks every intake milestone', () => {
    // Even with a full intake behind it, mid-repair wins — otherwise a refresh would
    // drop the user back on the breakdown and lose the conversation.
    const s = [...scanned, { who: 'fixstart', mode: 'summary', sectionKey: 'summary' }];
    expect(derivePhase(s)).toBe('fix:summary');
  });

  it('handles a cancelled fix that applied nothing', () => {
    const s = [...scanned, { who: 'fixstart', mode: 'guide' }, { who: 'fixend' }];
    expect(derivePhase(s)).toBe('results');
  });
});

describe('openFix', () => {
  it('is null with no fix markers at all', () => {
    expect(openFix(INTAKE)).toBeNull();
    expect(openFix([])).toBeNull();
  });

  it('carries the section context the coach needs', () => {
    const fix = openFix([
      { who: 'fixstart', mode: 'pick', sectionKey: 'experience', missingKeywords: ['HSE', 'SQL'] },
    ]);
    expect(fix.sectionKey).toBe('experience');
    expect(fix.missingKeywords).toEqual(['HSE', 'SQL']);
  });
});

describe('FIX_MODE routing', () => {
  it('routes entry-based sections to the picker', () => {
    expect(FIX_MODE.experience).toBe('pick');
    expect(FIX_MODE.projects).toBe('pick');
  });

  it('routes summary to its own generator and skills to the free checklist', () => {
    expect(FIX_MODE.summary).toBe('summary');
    expect(FIX_MODE.skills).toBe('skills');
  });

  it('routes completeness-only sections to guidance — never to an AI loop', () => {
    // These cost nothing and start no conversation: a JD doesn't keyword-match a
    // phone number, so there's nothing to coach.
    expect(FIX_MODE.education).toBe('guide');
    expect(FIX_MODE.contact).toBe('guide');
  });

  it('covers every section the scan can return', () => {
    const scanned = ['summary', 'experience', 'skills', 'education', 'projects', 'contact'];
    scanned.forEach((k) => expect(FIX_MODE[k]).toBeDefined());
  });
});

describe('section → coach vocabulary mapping', () => {
  it('maps the studio plural to the builder singular for focus', () => {
    // /coach/chat validates focus.section as 'experience' | 'project' (singular).
    expect(ENTRY_SOURCE.projects.focusSection).toBe('project');
    expect(ENTRY_SOURCE.experience.focusSection).toBe('experience');
  });

  it('maps focus sections to the builder step ids', () => {
    expect(STEP_FOR_FOCUS.experience).toBe('history');
    expect(STEP_FOR_FOCUS.project).toBe('projects');
  });

  it('reads entries from the right cvData list', () => {
    expect(ENTRY_SOURCE.experience.list).toBe('experience');
    expect(ENTRY_SOURCE.projects.list).toBe('projects');
  });
});

describe('rankEntriesByGap', () => {
  const roles = [
    { _sortId: 'a', title: 'Ops Lead', description: 'Ran HSE audits and pressure testing weekly' },
    { _sortId: 'b', title: 'Technician', description: 'Maintained equipment' },
    { _sortId: 'c', title: 'Supervisor', description: 'Led HSE briefings' },
  ];
  const missing = ['HSE', 'pressure testing'];

  it('puts the entry with the most gaps first', () => {
    const ranked = rankEntriesByGap(roles, missing);
    expect(ranked[0].entry.sortId).toBe('b'); // mentions neither
    expect(ranked[0].gaps).toEqual(['HSE', 'pressure testing']);
  });

  it('reports no gaps for an entry that covers everything', () => {
    expect(rankEntriesByGap(roles, missing).find((r) => r.entry.sortId === 'a').gaps).toEqual([]);
  });

  it('matches case-insensitively across title, company and description', () => {
    const list = [{ _sortId: 'x', title: 'hse officer', company: 'Acme', description: '' }];
    expect(rankEntriesByGap(list, ['HSE'])[0].gaps).toEqual([]);
  });

  it('accepts sortId as well as _sortId', () => {
    expect(rankEntriesByGap([{ sortId: 'z', title: 'T' }], [])[0].entry.sortId).toBe('z');
  });

  it('is inert with no keywords or no entries', () => {
    expect(rankEntriesByGap(roles, [])).toHaveLength(3);
    expect(rankEntriesByGap(roles, []).every((r) => r.gaps.length === 0)).toBe(true);
    expect(rankEntriesByGap([], ['HSE'])).toEqual([]);
    expect(rankEntriesByGap()).toEqual([]);
  });
});

describe('phaseForNewSession', () => {
  it('opens each kind on its OWN first step, skipping the mode chooser', () => {
    // The rail button already answered "what are we doing?" — asking again is a
    // wasted step.
    expect(phaseForNewSession('tailor')).toBe('job');
    // V2: 'build' now opens the roadmap rather than the old builder-handoff card.
    expect(phaseForNewSession('build')).toBe('build:roadmap');
  });

  it('ignores any restored transcript when a kind was declared', () => {
    // Starting fresh must not inherit the previous session's position, even if the
    // pre-clone transcript is still lying around.
    expect(phaseForNewSession('tailor', INTAKE)).toBe('job');
    expect(phaseForNewSession('build', INTAKE)).toBe('build:roadmap');
  });

  it('falls back to the chooser on a cold start with no kind', () => {
    expect(phaseForNewSession(null, [])).toBe('mode');
    expect(phaseForNewSession(undefined, [])).toBe('mode');
  });

  it('still restores position on a cold start WITH a transcript', () => {
    // Reload (no declared kind) → derive from markers exactly as before.
    expect(phaseForNewSession(null, INTAKE)).toBe('results');
    expect(phaseForNewSession(null, upTo('jobcard'))).toBe('brief');
  });
});

describe('sessionRow', () => {
  const tailoring = {
    _id: 's1',
    kind: 'tailor',
    title: 'Ernest CV — Wireline Operator',
    jobTitle: 'Wireline Operator',
    company: 'Baker Hughes',
    sourceTitle: 'Ernest CV',
    fitScore: 72,
  };

  it('leads with the job title and credits the source CV', () => {
    const r = sessionRow(tailoring);
    expect(r.heading).toBe('Wireline Operator');
    expect(r.sub).toBe('Baker Hughes · from Ernest CV');
    expect(r.showScore).toBe(true);
    expect(r.fitScore).toBe(72);
  });

  it('tags a build session instead of showing a score it cannot have', () => {
    const r = sessionRow({ _id: 's2', kind: 'build', title: 'Untitled CV' });
    expect(r.isBuild).toBe(true);
    expect(r.showScore).toBe(false);
    expect(r.heading).toBe('Untitled CV');
  });

  it('hides the score on a tailoring that has never been scanned', () => {
    // null must not render as 0 — "not scored yet" and "scored zero" are different
    // claims, and the second one would be a lie.
    const r = sessionRow({ ...tailoring, fitScore: null });
    expect(r.showScore).toBe(false);
    expect(r.fitScore).toBeNull();
  });

  it('shows a genuine zero score', () => {
    expect(sessionRow({ ...tailoring, fitScore: 0 }).showScore).toBe(true);
  });

  it('degrades gracefully on a sparse row', () => {
    const r = sessionRow({ _id: 's3', kind: 'tailor' });
    expect(r.heading).toBe('Untitled session');
    expect(r.sub).toBe('');
    expect(r.showScore).toBe(false);
    expect(sessionRow()).toBeTruthy();
  });
});

describe('buildProgress — derived, never stored', () => {
  const CONTACT_DONE = [{ who: 'contactdone' }];
  const FULL = {
    personalInfo: { fullName: 'Ernest Akibor' },
    professionalSummary: 'A summary.',
    experience: [{ title: 'Operator' }],
    education: [{ degree: 'BSc' }],
    skills: [{ name: 'Python' }],
    projects: [{ title: 'Pipeline' }],
  };

  it('reports nothing done for an empty CV', () => {
    const p = buildProgress({});
    expect(p.percent).toBe(0);
    expect(p.done).toBe(0);
    expect(p.total).toBe(6);
    expect(p.isComplete).toBe(false);
    Object.values(p.status).forEach((v) => expect(v).toBe(false));
  });

  it('reports everything done for a complete CV', () => {
    const p = buildProgress(FULL, CONTACT_DONE);
    expect(p.percent).toBe(100);
    expect(p.done).toBe(6);
    expect(p.isComplete).toBe(true);
    expect(p.nextKey).toBeNull();
  });

  it('tracks the REAL document — emptying a section un-does it', () => {
    // The whole point of deriving: there's no stored flag that could keep claiming
    // "work history: done" after the last role is deleted.
    const p = buildProgress({ ...FULL, experience: [] }, CONTACT_DONE);
    expect(p.status.experience).toBe(false);
    expect(p.done).toBe(5);
    expect(p.isComplete).toBe(false);
  });

  it('points at the first unfinished section in builder order', () => {
    expect(buildProgress({}).nextKey).toBe('contact');
    expect(buildProgress({ personalInfo: { fullName: 'E' } }).nextKey).toBe('contact');
    expect(buildProgress({ personalInfo: { fullName: 'E' } }, CONTACT_DONE).nextKey).toBe(
      'experience'
    );
    expect(
      buildProgress({ ...FULL, summary: undefined, professionalSummary: '' }, CONTACT_DONE).nextKey
    ).toBe('summary');
  });

  it('marks contact complete only after valid data is confirmed in Studio', () => {
    expect(buildProgress({ personalInfo: { phone: '123' } }, CONTACT_DONE).status.contact).toBe(
      false
    );
    expect(buildProgress({ personalInfo: { fullName: 'E' } }).status.contact).toBe(false);
    expect(buildProgress({ personalInfo: { fullName: 'E' } }, CONTACT_DONE).status.contact).toBe(
      true
    );
  });

  it('counts confirmed contact in the Studio health percent', () => {
    // The content has 3 of 6 sections, but Studio counts contact only after confirmation.
    const half = {
      personalInfo: { fullName: 'E' },
      professionalSummary: 'x',
      experience: [{ title: 'T' }],
    };
    expect(buildProgress(half).percent).toBe(33);
    expect(buildProgress(half).done).toBe(2);
    expect(buildProgress(half, CONTACT_DONE).percent).toBe(50);
    expect(buildProgress(half, CONTACT_DONE).done).toBe(3);
  });

  it('covers all six builder sections and survives a null CV', () => {
    expect(BUILD_SECTIONS).toHaveLength(6);
    expect(BUILD_SECTIONS.map((s) => s.key)).toEqual([
      'contact',
      'experience',
      'projects',
      'education',
      'skills',
      'summary',
    ]);
    expect(() => buildProgress(null)).not.toThrow();
    expect(buildProgress(null).percent).toBe(0);
  });
});

describe('derivePhase — build track', () => {
  const build = [{ who: 'buildintro' }];

  it('walks roadmap → job → contact → sections as markers land', () => {
    expect(derivePhase(build)).toBe('build:roadmap');
    expect(derivePhase([...build, { who: 'buildstart' }])).toBe('build:career-stage');
    expect(
      derivePhase([...build, { who: 'buildstart' }, { who: 'careerstage', stage: 'grad' }])
    ).toBe('build:job');
    expect(derivePhase([...build, { who: 'buildstart' }], { careerStage: 'grad' })).toBe(
      'build:job'
    );
    expect(derivePhase([...build, { who: 'buildstart' }, { who: 'buildjobdone' }])).toBe(
      'build:contact'
    );
    expect(
      derivePhase([
        ...build,
        { who: 'buildstart' },
        { who: 'buildjobdone' },
        { who: 'contactdone' },
      ])
    ).toBe('build:sections');
  });

  it('restores a captured build job to the Role Brief', () => {
    expect(
      derivePhase([
        ...build,
        { who: 'buildstart' },
        { who: 'careerstage', stage: 'experienced' },
        { who: 'jobcard', jobTitle: 'Operator', jobDescription: 'Description' },
      ])
    ).toBe('build:brief');
  });

  it('restores the build position after a refresh mid-sequence', () => {
    const mid = [
      { who: 'buildintro' },
      { who: 'buildstart', draftId: 'b1' },
      { who: 'aria', text: 'Are you going for a particular job?' },
      { who: 'buildjobdone', skipped: true },
      { who: 'aria', text: "Let's make sure they can reach you." },
    ];
    expect(derivePhase(mid)).toBe('build:contact');
  });

  it('opens a NEW build session on the roadmap', () => {
    expect(phaseForNewSession('build')).toBe('build:roadmap');
    expect(phaseForNewSession('build', INTAKE)).toBe('build:roadmap');
  });

  it('keeps an open fix ahead of the build markers', () => {
    const s = [...build, { who: 'buildstart' }, { who: 'fixstart', mode: 'summary' }];
    expect(derivePhase(s)).toBe('fix:summary');
  });
});

describe('bulletCount', () => {
  it('counts real content, not bullet characters', () => {
    expect(bulletCount({ description: '• Did a thing\n• And another' })).toBe(2);
    expect(bulletCount({ description: '•\n•  \n' })).toBe(0); // markers with no text
    expect(bulletCount({ description: '' })).toBe(0);
    expect(bulletCount({})).toBe(0);
    expect(bulletCount(null)).toBe(0);
  });

  it('counts unbulleted lines too', () => {
    expect(bulletCount({ description: 'Ran the pressure tests' })).toBe(1);
  });
});

describe('entryProgress — the n/5 counter', () => {
  const full = {
    entryType: 'full-time',
    title: 'Operator',
    company: 'Baker',
    startDate: '2021',
    description: '• Ran pressure tests',
  };

  it('is 0/5 for a freshly created entry', () => {
    const p = entryProgress({ _sortId: 'a' });
    expect(p.done).toBe(0);
    expect(p.total).toBe(5);
    expect(p.fields.map((f) => f.key)).toEqual([
      'entryType',
      'title',
      'company',
      'dates',
      'achievements',
    ]);
  });

  it('climbs as each field lands', () => {
    expect(entryProgress({ entryType: 'full-time' }).done).toBe(1);
    expect(entryProgress({ entryType: 'full-time', title: 'Operator' }).done).toBe(2);
    expect(entryProgress({ ...full, description: '' }).done).toBe(4);
    expect(entryProgress(full).done).toBe(5);
  });

  it('counts a current role with no end date as dated', () => {
    // "2021 – Present" is complete; requiring an end date would block anyone still
    // in the job.
    expect(entryProgress({ startDate: '2021', isCurrent: true }).fields[3].done).toBe(true);
  });

  it('does not count whitespace as a filled field', () => {
    expect(entryProgress({ title: '   ', company: '\n' }).done).toBe(0);
  });
});

describe('roleStage — derived, so a refresh resumes correctly', () => {
  it('asks for the first missing thing, in order', () => {
    expect(roleStage({})).toBe('entryType');
    expect(roleStage({ entryType: 'full-time' })).toBe('title');
    expect(roleStage({ entryType: 'full-time', title: 'Operator' })).toBe('company');
    expect(roleStage({ entryType: 'full-time', title: 'Operator', company: 'Baker' })).toBe(
      'dates'
    );
    expect(
      roleStage({ entryType: 'full-time', title: 'Operator', company: 'Baker', startDate: '2021' })
    ).toBe('achievements');
  });

  it('reports complete once all four are in', () => {
    expect(
      roleStage({
        title: 'Operator',
        entryType: 'full-time',
        company: 'Baker',
        startDate: '2021',
        description: '• Did a thing',
      })
    ).toBe('complete');
  });

  it('does not re-ask for something filled in elsewhere', () => {
    // Someone edits the company in the CV builder mid-session; Aria must skip that
    // question rather than asking again from a stored step counter.
    expect(
      roleStage({ entryType: 'full-time', title: 'Operator', company: 'Filled in elsewhere' })
    ).toBe('dates');
  });

  it('is null with no entry', () => {
    expect(roleStage(null)).toBeNull();
  });
});

describe('pinnedSortId / resolvePinnedEntry', () => {
  const cv = { experience: [{ _sortId: 'r1', title: 'Operator' }, { _sortId: 'r2' }] };

  it('is null with no pin markers', () => {
    expect(pinnedSortId([])).toBeNull();
    expect(resolvePinnedEntry([], cv)).toBeNull();
  });

  it('resolves the open pin against the live draft', () => {
    const msgs = [{ who: 'pinrole', sortId: 'r1' }];
    expect(pinnedSortId(msgs)).toBe('r1');
    expect(resolvePinnedEntry(msgs, cv).title).toBe('Operator');
  });

  it('clears when the pin is closed', () => {
    const msgs = [{ who: 'pinrole', sortId: 'r1' }, { who: 'unpinrole' }];
    expect(pinnedSortId(msgs)).toBeNull();
    expect(resolvePinnedEntry(msgs, cv)).toBeNull();
  });

  it('follows the LATEST pin across a Next-role hand-off', () => {
    const msgs = [
      { who: 'pinrole', sortId: 'r1' },
      { who: 'rolerecord', sortId: 'r1' },
      { who: 'unpinrole' },
      { who: 'pinrole', sortId: 'r2' },
    ];
    expect(pinnedSortId(msgs)).toBe('r2');
  });

  it('returns null for a pin whose entry was DELETED — the self-clear signal', () => {
    // A card pinned to a dead _sortId would collect answers that land nowhere.
    const msgs = [{ who: 'pinrole', sortId: 'gone' }];
    expect(pinnedSortId(msgs)).toBe('gone'); // the marker still says so…
    expect(resolvePinnedEntry(msgs, cv)).toBeNull(); // …but the document disagrees
  });

  it('survives a CV with no experience array at all', () => {
    expect(resolvePinnedEntry([{ who: 'pinrole', sortId: 'r1' }], {})).toBeNull();
    expect(resolvePinnedEntry([{ who: 'pinrole', sortId: 'r1' }], null)).toBeNull();
  });

  it('is unaffected by ordinary chat between pin and now', () => {
    // Free chat mid-role must not disturb the pin — the whole point of pinning.
    const msgs = [
      { who: 'pinrole', sortId: 'r1' },
      { who: 'user', text: 'should I include a 3-month job?' },
      { who: 'aria', text: 'Yes, if it is relevant.' },
    ];
    expect(pinnedSortId(msgs)).toBe('r1');
  });
});

describe('derivePhase — a pinned role', () => {
  const built = [
    { who: 'buildintro' },
    { who: 'buildstart' },
    { who: 'buildjobdone', skipped: true },
    { who: 'contactdone' },
  ];

  it('puts a pinned role ahead of the section menu', () => {
    expect(derivePhase(built)).toBe('build:sections');
    expect(derivePhase([...built, { who: 'pinrole', sortId: 'r1' }])).toBe('build:experience');
  });

  it('RESTORES the role after a refresh mid-capture', () => {
    const mid = [
      ...built,
      { who: 'pinrole', sortId: 'r1' },
      { who: 'aria', text: 'What was the role called?' },
      { who: 'user', text: 'Wireline Operator' },
      { who: 'aria', text: 'Where was this?' },
    ];
    expect(derivePhase(mid)).toBe('build:experience');
    expect(pinnedSortId(mid)).toBe('r1');
  });

  it('returns to the section menu once work history is closed', () => {
    const doneMsgs = [
      ...built,
      { who: 'pinrole', sortId: 'r1' },
      { who: 'rolerecord', sortId: 'r1' },
      { who: 'unpinrole' },
      { who: 'experiencedone' },
    ];
    expect(derivePhase(doneMsgs)).toBe('build:sections');
  });

  it('work history counts as done only when a role has REAL content', () => {
    // The section flips via buildProgress (derived), never via the experiencedone marker.
    // Critically, the placeholder row addRole() creates must NOT tick the section —
    // otherwise starting work history would instantly mark it finished.
    expect(buildProgress({ experience: [] }).status.experience).toBe(false);
    expect(buildProgress({ experience: [{ _sortId: 'r1' }] }).status.experience).toBe(false);
    expect(
      buildProgress({ experience: [{ _sortId: 'r1', title: 'Operator' }] }).status.experience
    ).toBe(true);
  });

  it('a CV of nothing but placeholder rows is 0%, not 100%', () => {
    // The canonical rule alone ("is the list non-empty?") would call this complete.
    const placeholders = {
      personalInfo: { fullName: 'E' },
      professionalSummary: 'x',
      experience: [{ _sortId: 'r1' }],
      education: [{}],
      projects: [{}],
      skills: [{ name: 'a' }],
    };
    const p = buildProgress(placeholders, [{ who: 'contactdone' }]);
    expect(p.percent).toBeLessThan(100);
    expect(p.status.experience).toBe(false);
    expect(p.status.projects).toBe(false);
    expect(p.status.education).toBe(false);
    // The genuinely-filled sections still count.
    expect(p.status.contact).toBe(true);
    expect(p.status.skills).toBe(true);
  });
});

describe('projects — the counter must exclude optional fields', () => {
  const proj = { _sortId: 'p1', title: 'Rig telemetry', description: '• Built the ingest' };

  it('counts 3 required fields, NOT the optional link', () => {
    // Counting `link` would cap a link-less project at 3/4 forever — a counter that can
    // never reach full is a counter people learn to ignore.
    const p = entryProgress(proj, 'project', { typePicked: true });
    expect(p.total).toBe(3);
    expect(p.done).toBe(3);
  });

  it('still SHOWS the link field, marked optional', () => {
    const p = entryProgress(proj, 'project', { typePicked: true });
    const link = p.fields.find((f) => f.key === 'link');
    expect(link).toBeDefined();
    expect(link.optional).toBe(true);
    expect(link.done).toBe(false);
  });

  it('reaches full without a link, and adding one does not exceed it', () => {
    const withLink = { ...proj, link: 'github.com/x' };
    const p = entryProgress(withLink, 'project', { typePicked: true });
    expect(p.done).toBe(p.total);
    expect(p.done).toBe(3);
  });

  it('counts the TYPE, which lives in the transcript rather than the entry', () => {
    expect(entryProgress(proj, 'project', { typePicked: false }).done).toBe(2);
    expect(entryProgress(proj, 'project', { typePicked: true }).done).toBe(3);
  });

  it('asks for the type FIRST, then the name, then the work', () => {
    expect(roleStage({}, 'project', { typePicked: false })).toBe('type');
    expect(roleStage({}, 'project', { typePicked: true })).toBe('title');
    expect(roleStage({ title: 'X' }, 'project', { typePicked: true })).toBe('achievements');
    expect(
      roleStage({ title: 'X', description: '• did it' }, 'project', { typePicked: true })
    ).toBe('complete');
  });

  it('never stalls on the optional link', () => {
    // A complete-but-link-less project must report complete, not sit on a 'link' stage.
    expect(
      roleStage({ title: 'X', description: '• did it' }, 'project', { typePicked: true })
    ).not.toBe('link');
  });

  it('education excludes its optional notes field too', () => {
    const edu = { degree: 'BSc', school: 'UNIBEN', graduationDate: '2019' };
    const p = entryProgress(edu, 'education');
    expect(p.total).toBe(3);
    expect(p.done).toBe(3);
    expect(p.fields.find((f) => f.key === 'description').optional).toBe(true);
    expect(roleStage(edu, 'education')).toBe('complete');
  });
});

describe('projectTypeFor', () => {
  it('reads the type stated for THAT entry', () => {
    const msgs = [
      { who: 'projecttype', sortId: 'p1', type: 'course' },
      { who: 'projecttype', sortId: 'p2', type: 'work' },
    ];
    expect(projectTypeFor(msgs, 'p1')).toBe('course');
    expect(projectTypeFor(msgs, 'p2')).toBe('work');
    expect(projectTypeFor(msgs, 'p3')).toBeNull();
  });

  it('takes the LATEST statement for an entry', () => {
    const msgs = [
      { who: 'projecttype', sortId: 'p1', type: 'course' },
      { who: 'projecttype', sortId: 'p1', type: 'personal' },
    ];
    expect(projectTypeFor(msgs, 'p1')).toBe('personal');
  });

  it('survives a refresh — it lives in the persisted transcript', () => {
    expect(projectTypeFor([], 'p1')).toBeNull();
  });
});

// The resolver wraps the marker reader; it does not replace it. Two situations have no
// marker to read at all — a TAILORED project (cloned from the base CV, so none of this
// thread's messages are about it) and an "Edit with Aria" interview opened later — and in
// both the type now lives on the entry, which is why the entry is consulted first.
describe('resolveProjectType', () => {
  const MARKERS = [{ who: 'projecttype', sortId: 'p1', type: 'work' }];

  it('prefers the type PERSISTED on the entry', () => {
    expect(resolveProjectType({ entryType: 'course' }, [], 'p1')).toBe('course');
  });

  it('falls back to the marker when the entry has none', () => {
    // Mid-build sessions from before the field existed: the transcript is all there is.
    expect(resolveProjectType({}, MARKERS, 'p1')).toBe('work');
    expect(resolveProjectType(undefined, MARKERS, 'p1')).toBe('work');
  });

  it('the entry WINS over a stale marker for the same entry', () => {
    // Same entry, two sources. The entry is the durable one, so it decides.
    expect(resolveProjectType({ entryType: 'personal' }, MARKERS, 'p1')).toBe('personal');
  });

  it('is falsy when neither source knows — so the type card still gets asked', () => {
    expect(resolveProjectType({}, [], 'p1')).toBeFalsy();
    expect(resolveProjectType({ entryType: '' }, [], 'p1')).toBeFalsy();
  });
});

describe('pins across sections', () => {
  const cv = {
    experience: [{ _sortId: 'r1', title: 'Operator' }],
    projects: [{ _sortId: 'p1', title: 'Telemetry' }],
    education: [{ _sortId: 'e1', degree: 'BSc' }],
  };

  it('resolves the pin against the RIGHT list per section', () => {
    expect(
      resolvePinnedEntry([{ who: 'pinrole', sortId: 'p1', section: 'project' }], cv).title
    ).toBe('Telemetry');
    expect(
      resolvePinnedEntry([{ who: 'pinrole', sortId: 'e1', section: 'education' }], cv).degree
    ).toBe('BSc');
    expect(
      resolvePinnedEntry([{ who: 'pinrole', sortId: 'r1', section: 'experience' }], cv).title
    ).toBe('Operator');
  });

  it('defaults to experience for Phase-2 transcripts with no section field', () => {
    // Older pinrole markers predate `section`; they must still resolve.
    expect(resolvePinnedEntry([{ who: 'pinrole', sortId: 'r1' }], cv).title).toBe('Operator');
    expect(pinnedSection([{ who: 'pinrole', sortId: 'r1' }])).toBe('experience');
  });

  it('does not resolve a project id against the experience list', () => {
    expect(
      resolvePinnedEntry([{ who: 'pinrole', sortId: 'p1', section: 'experience' }], cv)
    ).toBeNull();
  });

  it('drives the phase per section', () => {
    const base = [{ who: 'buildintro' }, { who: 'buildstart' }, { who: 'contactdone' }];
    expect(derivePhase([...base, { who: 'pinrole', sortId: 'p1', section: 'project' }])).toBe(
      'build:project'
    );
    expect(derivePhase([...base, { who: 'pinrole', sortId: 'e1', section: 'education' }])).toBe(
      'build:education'
    );
  });

  it('returns to the menu as each section closes', () => {
    const base = [{ who: 'buildintro' }, { who: 'buildstart' }, { who: 'contactdone' }];
    ['experiencedone', 'projectsdone', 'educationdone', 'certsdone'].forEach((marker) => {
      expect(derivePhase([...base, { who: marker }])).toBe('build:sections');
    });
  });
});

describe('the placeholder rule extends to every section', () => {
  it('a blank PROJECT does not tick the section or inflate health', () => {
    // Same bug as Phase 2's blank role: addProject() creates the row before any answer.
    expect(buildProgress({ projects: [{ _sortId: 'p1' }] }).status.projects).toBe(false);
    expect(
      buildProgress({ projects: [{ _sortId: 'p1', title: 'Telemetry' }] }).status.projects
    ).toBe(true);
  });

  it('a blank EDUCATION entry does not tick the section', () => {
    expect(buildProgress({ education: [{ _sortId: 'e1' }] }).status.education).toBe(false);
    expect(buildProgress({ education: [{ _sortId: 'e1', degree: 'BSc' }] }).status.education).toBe(
      true
    );
  });

  it('a CV of placeholder rows across ALL THREE sections reads 0 for each', () => {
    const p = buildProgress({
      experience: [{ _sortId: 'r1' }],
      projects: [{ _sortId: 'p1' }],
      education: [{ _sortId: 'e1' }],
    });
    expect(p.status.experience).toBe(false);
    expect(p.status.projects).toBe(false);
    expect(p.status.education).toBe(false);
    expect(p.percent).toBe(0);
  });

  it('withoutBlankEntries keeps real rows and drops empty ones', () => {
    const cleaned = withoutBlankEntries({
      experience: [{ _sortId: 'r1' }, { _sortId: 'r2', title: 'Operator' }],
      projects: [{ _sortId: 'p1', description: '• built it' }, { _sortId: 'p2' }],
      education: [{ _sortId: 'e1', school: 'UNIBEN' }, { _sortId: 'e2' }],
    });
    expect(cleaned.experience).toHaveLength(1);
    expect(cleaned.projects).toHaveLength(1);
    expect(cleaned.education).toHaveLength(1);
  });

  it('does not mutate the original — this is a read-time view only', () => {
    const cv = { experience: [{ _sortId: 'r1' }] };
    withoutBlankEntries(cv);
    expect(cv.experience).toHaveLength(1); // the real entry (and its _sortId) survives
  });
});

describe('derivePhase — completing a build', () => {
  const base = [
    { who: 'buildintro' },
    { who: 'buildstart' },
    { who: 'buildjobdone', skipped: true },
    { who: 'contactdone' },
    { who: 'experiencedone' },
    { who: 'projectsdone', skipped: true },
    { who: 'educationdone' },
    { who: 'certsdone', skipped: true },
  ];

  it('returns to the menu after skills, and finishes after the summary', () => {
    expect(derivePhase([...base, { who: 'skillsdone' }])).toBe('build:sections');
    expect(derivePhase([...base, { who: 'skillsdone' }, { who: 'summarydone' }])).toBe(
      'build:done'
    );
  });

  it('finishes even when skills and summary were BOTH skipped', () => {
    // Skipping is a legitimate finished state — the flow must still terminate.
    const skipped = [
      ...base,
      { who: 'skillsdone', skipped: true },
      { who: 'summarydone', skipped: true },
    ];
    expect(derivePhase(skipped)).toBe('build:done');
  });

  it('restores the finish card after a refresh', () => {
    const done = [
      ...base,
      { who: 'skillsdone' },
      { who: 'summarydone' },
      { who: 'aria', text: 'done' },
    ];
    expect(derivePhase(done)).toBe('build:done');
  });

  it('a pinned entry still outranks the finish state', () => {
    // Adding one more role after finishing must return to that role, not the finish card.
    const s = [
      ...base,
      { who: 'skillsdone' },
      { who: 'summarydone' },
      { who: 'pinrole', sortId: 'r9', section: 'experience' },
    ];
    expect(derivePhase(s)).toBe('build:experience');
  });
});

describe('build finish — health, never a fabricated match', () => {
  const built = {
    personalInfo: { fullName: 'Ernest Akibor' },
    professionalSummary: 'Field operator with six years offshore.',
    experience: [{ _sortId: 'r1', title: 'Operator', description: '• Ran pressure tests' }],
    projects: [{ _sortId: 'p1', title: 'Telemetry' }],
    education: [{ _sortId: 'e1', degree: 'BSc' }],
    skills: [{ name: 'Pressure control' }, { name: 'HSE' }],
  };

  it('reports real completeness for a finished build', () => {
    const p = buildProgress(built, [{ who: 'contactdone' }]);
    expect(p.percent).toBe(100);
    expect(p.done).toBe(6);
    expect(p.isComplete).toBe(true);
  });

  it('reports honestly when sections were skipped', () => {
    // Skipping projects and summary must show as incomplete, not be papered over.
    const partial = { ...built, projects: [], professionalSummary: '' };
    const p = buildProgress(partial, [{ who: 'contactdone' }]);
    expect(p.percent).toBeLessThan(100);
    expect(p.status.projects).toBe(false);
    expect(p.status.summary).toBe(false);
    // …while what WAS done still counts.
    expect(p.status.experience).toBe(true);
    expect(p.status.skills).toBe(true);
  });

  it('has NO fit score to show — finishSummary returns null without a scan', () => {
    // The build finish card must fall back to health; there is no baseline and no job,
    // so any match figure would be invented.
    expect(finishSummary(null)).toBeNull();
    expect(finishSummary({ title: built.title })).toBeNull();
  });

  it('a scanned build CAN report a real before → after', () => {
    // If a job WAS supplied and the user runs the scan, the normal machinery applies.
    const scanned = {
      fitScore: 71,
      sections: [{ key: 'skills', label: 'Skills', band: 'ok', score: 80 }],
      baseline: { fitScore: 55, sections: [{ key: 'skills', band: 'warn', score: 50 }] },
    };
    const s = finishSummary(scanned);
    expect(s.from).toBe(55);
    expect(s.to).toBe(71);
    expect(s.newlyGreen).toEqual(['Skills']);
  });
});

describe('finishSummary', () => {
  const scan = {
    fitScore: 78,
    sections: [
      { key: 'summary', label: 'Summary', band: 'ok', score: 90 },
      { key: 'experience', label: 'Work history', band: 'ok', score: 80 },
      { key: 'skills', label: 'Skills', band: 'warn', score: 60 },
    ],
    baseline: {
      fitScore: 52,
      sections: [
        { key: 'summary', band: 'ok', score: 88 }, // already green before
        { key: 'experience', band: 'bad', score: 30 }, // improved to green
        { key: 'skills', band: 'bad', score: 20 }, // still not green
      ],
    },
  };

  it('reports the real journey from the FIRST scan', () => {
    const s = finishSummary(scan);
    expect(s.from).toBe(52);
    expect(s.to).toBe(78);
    expect(s.moved).toBe(26);
    expect(s.improved).toBe(true);
  });

  it('counts only sections that CROSSED into green', () => {
    // Summary was already green — surfacing it as an achievement of this session
    // would be taking credit for work the user didn't just do.
    const s = finishSummary(scan);
    expect(s.newlyGreen).toEqual(['Work history']);
    expect(s.newlyGreen).not.toContain('Summary');
  });

  it('names what is still weak', () => {
    expect(finishSummary(scan).stillWeak).toEqual(['Skills']);
  });

  it('reports a flat session honestly rather than inventing progress', () => {
    const flat = { ...scan, fitScore: 52, baseline: { fitScore: 52, sections: [] } };
    const s = finishSummary(flat);
    expect(s.moved).toBe(0);
    expect(s.improved).toBe(false);
  });

  it('reports a REGRESSION rather than hiding it', () => {
    const worse = { ...scan, fitScore: 40 };
    const s = finishSummary(worse);
    expect(s.moved).toBe(-12);
    expect(s.improved).toBe(false);
  });

  it('returns null with no baseline — nothing truthful to compare', () => {
    expect(finishSummary({ fitScore: 70, sections: [] })).toBeNull();
    expect(finishSummary({ fitScore: 70, baseline: {}, sections: [] })).toBeNull();
  });

  it('returns null with no scan at all', () => {
    expect(finishSummary(null)).toBeNull();
    expect(finishSummary({})).toBeNull();
  });

  it('treats every section as newly green when the baseline recorded none', () => {
    const s = finishSummary({ ...scan, baseline: { fitScore: 10, sections: [] } });
    expect(s.newlyGreen).toEqual(['Summary', 'Work history']);
  });

  it('falls back to the section key when a label is missing', () => {
    const s = finishSummary({
      fitScore: 80,
      sections: [{ key: 'projects', band: 'ok', score: 90 }],
      baseline: { fitScore: 50, sections: [] },
    });
    expect(s.newlyGreen).toEqual(['projects']);
  });
});

describe('sectionNote', () => {
  // A stand-in for react-i18next's t that resolves against the REAL locale files and
  // interpolates {{params}}. A mock that returned its own argument would pass whether or
  // not the string existed, which is exactly the failure this phase is about.
  const translate = (bundle) => (path, params) => {
    const value = path
      .split('.')
      .reduce((node, part) => (node == null ? node : node[part]), bundle);
    if (typeof value !== 'string') return path; // i18next hands back the key when unregistered
    return value.replace(/\{\{(\w+)\}\}/g, (_, name) => params?.[name] ?? '');
  };
  const t = translate(en);

  // The ten branches noteFor can emit. If the server grows an eleventh, this list and
  // both locales have to grow with it.
  const NOTE_KEYS = [
    'complete',
    'missing',
    'incomplete',
    'thinAndMissing',
    'tooThin',
    'needsSubstance',
    'solidStart',
    'wellBuiltButMissing',
    'closeStillMissing',
    'strong',
  ];

  it('renders the keyed verdict, interpolating its params', () => {
    const note = sectionNote(t, {
      key: 'summary',
      noteKey: 'wellBuiltButMissing',
      noteParams: { keywords: 'Python, SQL' },
    });
    expect(note).toBe("Well built, but it doesn't mention Python, SQL.");
  });

  it('renders a param-free verdict', () => {
    expect(sectionNote(t, { key: 'summary', noteKey: 'tooThin' })).toBe(
      'Too thin — this section needs real content.'
    );
  });

  it('resolves every branch the scan can emit, in both languages', () => {
    [en, fr].forEach((bundle) => {
      const translated = translate(bundle);
      NOTE_KEYS.forEach((noteKey) => {
        const note = sectionNote(translated, { noteKey, noteParams: { keywords: 'Python' } });
        // Neither a leaked key path nor an unfilled placeholder ever reaches the card.
        expect(note).not.toContain('ariaStudio.sectionNote');
        expect(note).not.toContain('{{');
        expect(note.length).toBeGreaterThan(0);
      });
    });
  });

  it('falls back to the legacy prose on a scan persisted before the split', () => {
    // An old snapshot carries `note` and no key. Showing yesterday's English line until
    // the next free recompute beats showing a blank verdict.
    expect(sectionNote(t, { key: 'skills', note: 'Solid start — add a bit more.' })).toBe(
      'Solid start — add a bit more.'
    );
  });

  it('prefers the key when a stale prose note rides alongside it', () => {
    const note = sectionNote(t, {
      noteKey: 'strong',
      note: 'Strong — covers what the job asks for.',
    });
    expect(note).toBe(en.ariaStudio.sectionNote.strong);
  });

  it('is empty when the section carries neither', () => {
    expect(sectionNote(t, {})).toBe('');
    expect(sectionNote(t)).toBe('');
  });
});

describe('scoreDelta', () => {
  it('reports movement and a band change', () => {
    const d = scoreDelta({ score: 30, band: 'bad' }, { score: 55, band: 'warn' });
    expect(d).toEqual({ from: 30, to: 55, moved: 25, bandChanged: true });
  });

  it('reports movement within a band', () => {
    expect(scoreDelta({ score: 50, band: 'warn' }, { score: 60, band: 'warn' })).toEqual({
      from: 50,
      to: 60,
      moved: 10,
      bandChanged: false,
    });
  });

  it('reports a non-move honestly rather than rounding it up', () => {
    expect(scoreDelta({ score: 50, band: 'warn' }, { score: 50, band: 'warn' }).moved).toBe(0);
  });

  it('stays silent when either side is unknown', () => {
    // Better to say nothing than to invent a delta the user might act on.
    expect(scoreDelta(null, { score: 55, band: 'warn' })).toBeNull();
    expect(scoreDelta({ score: 30, band: 'bad' }, undefined)).toBeNull();
  });
});
