// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import { AriaStudioProvider, useAriaStudio } from './AriaStudioContext';

// The provider talks to the API on mount (it re-binds a remembered draft) and shows
// toasts on failure. Both are stubbed so this stays a pure initialisation test.
vi.mock('../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn().mockResolvedValue({ _id: 'd1', title: 'Draft', coachChats: {} }),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    studioBuildStart: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import CVService from '../services/cv.service';
import { toast } from 'sonner';

/**
 * PROVIDER INITIALISATION SMOKE TEST.
 *
 * This exists because of a real shipped bug: `loadSession` named `flushChats` in its
 * useCallback DEPENDENCY ARRAY while `flushChats` was declared ~90 lines lower. Dep
 * arrays evaluate during render, so the `const` was in its temporal dead zone and threw
 * "Cannot access 'flushChats' before initialization" — blanking the whole page.
 *
 * The build passed. ESLint passed. All 179 tests passed. Nothing caught it, because
 * every existing test was node-only pure logic that never MOUNTED anything.
 *
 * Simply rendering the provider is therefore the highest-value assertion available: any
 * TDZ violation, bad hook order, or throw during init fails here immediately.
 */

const Probe = () => {
  const ctx = useAriaStudio();
  // Touch the session API surface — if any of these were undefined the provider is
  // wired wrong even though it rendered.
  return (
    <div data-testid="probe">
      {typeof ctx.loadSession}:{typeof ctx.newSession}:{typeof ctx.flushChats}
    </div>
  );
};

describe('AriaStudioProvider — initialisation', () => {
  let errorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // A React render error is reported through console.error before the throw
    // propagates, so failing on it catches problems an assertion might miss.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    errorSpy.mockRestore();
  });

  it('renders its children without throwing', () => {
    render(
      <AriaStudioProvider>
        <div data-testid="child">hello</div>
      </AriaStudioProvider>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('mounts with NO console errors — catches TDZ and hook-order faults', () => {
    render(
      <AriaStudioProvider>
        <div>hello</div>
      </AriaStudioProvider>
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('exposes the full session API to consumers', () => {
    render(
      <AriaStudioProvider>
        <Probe />
      </AriaStudioProvider>
    );
    // All three defined — the exact trio the TDZ crash took down.
    expect(screen.getByTestId('probe').textContent).toBe('function:function:function');
  });

  it('does not fetch when there is no remembered session', () => {
    render(
      <AriaStudioProvider>
        <div>hello</div>
      </AriaStudioProvider>
    );
    expect(CVService.getDraftById).not.toHaveBeenCalled();
  });

  it('re-binds a remembered session on mount without throwing', async () => {
    localStorage.setItem('ariaStudio:draftId', 'd1');

    render(
      <AriaStudioProvider>
        <div data-testid="child">hello</div>
      </AriaStudioProvider>
    );

    await waitFor(() => expect(CVService.getDraftById).toHaveBeenCalledWith('d1'));
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('survives a failed re-bind (stale or deleted draft) and still renders', async () => {
    localStorage.setItem('ariaStudio:draftId', 'gone');
    CVService.getDraftById.mockRejectedValueOnce(new Error('404'));

    render(
      <AriaStudioProvider>
        <div data-testid="child">hello</div>
      </AriaStudioProvider>
    );

    await waitFor(() => expect(CVService.getDraftById).toHaveBeenCalled());
    expect(screen.getByTestId('child')).toBeTruthy();
    // The stale id is cleared so the next load starts fresh rather than retrying it.
    await waitFor(() => expect(localStorage.getItem('ariaStudio:draftId')).toBeNull());
  });

  it('creates exactly ONE draft when startBuild is called twice in the same tick', async () => {
    // The double-create bug. The old guard was `if (working) return; setWorking(true)` —
    // React state, applied asynchronously, so two calls in one tick both read it as
    // false and both created a draft. The fix is a synchronous ref-based promise guard,
    // the same one ensureDraft uses.
    let deferredResolve;
    CVService.studioBuildStart.mockReturnValue(
      new Promise((resolve) => {
        deferredResolve = resolve;
      })
    );

    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      // Captured in an EFFECT, not during render — assigning to an outer binding while
      // rendering is a side effect React disallows (and react-hooks/globals catches).
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );

    // Fire both BEFORE the first resolves — the real double-click race.
    const a = held.current.startBuild({});
    const b = held.current.startBuild({});
    deferredResolve({ draft: { _id: 'b1', title: 'Untitled CV', coachChats: {} }, draftId: 'b1' });
    const [ra, rb] = await Promise.all([a, b]);

    expect(CVService.studioBuildStart).toHaveBeenCalledTimes(1);
    // Both callers get the SAME create rather than one silently losing.
    expect(ra?.draftId).toBe('b1');
    expect(rb?.draftId).toBe('b1');
  });

  it('allows a NEW build after the first one settles', async () => {
    // The guard must self-clear, or a second session could never be built.
    CVService.studioBuildStart.mockResolvedValue({
      draft: { _id: 'b1', coachChats: {} },
      draftId: 'b1',
    });

    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      // Captured in an EFFECT, not during render — assigning to an outer binding while
      // rendering is a side effect React disallows (and react-hooks/globals catches).
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );

    await held.current.startBuild({});
    await held.current.startBuild({});

    expect(CVService.studioBuildStart).toHaveBeenCalledTimes(2);
  });

  it('renameCv sends a partial { _id, title } $set — never touching coachChats', async () => {
    // Rename must not clobber the transcript: the $set carries ONLY the title.
    localStorage.setItem('ariaStudio:draftId', 'd1'); // getDraftById → { _id:'d1', title:'Draft', coachChats:{} }

    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );

    // Wait for the bind to land, so renameCv's closure sees the real draftId + title.
    await waitFor(() => expect(held.current?.draftId).toBe('d1'));
    CVService.saveDraft.mockClear();

    await held.current.renameCv('  My Real CV  '); // trims

    expect(CVService.saveDraft).toHaveBeenCalledTimes(1);
    const payload = CVService.saveDraft.mock.calls[0][0];
    expect(payload).toEqual({ _id: 'd1', title: 'My Real CV' });
    expect(payload).not.toHaveProperty('coachChats');
  });

  it('renameCv is a no-op on an empty or unchanged title', async () => {
    localStorage.setItem('ariaStudio:draftId', 'd1'); // bound title is 'Draft'

    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );

    await waitFor(() => expect(held.current?.draftId).toBe('d1'));
    CVService.saveDraft.mockClear();

    await held.current.renameCv('   '); // empty after trim
    await held.current.renameCv('Draft'); // unchanged

    expect(CVService.saveDraft).not.toHaveBeenCalled();
  });

  // ── The studio command channel ──
  //
  // The Live Preview cannot delete an entry itself: removing it from cvData would fire
  // StudioChat's self-heal, which pushes its own "pin cleared" line and races the save.
  // So the preview REQUESTS and StudioChat executes. The NONCE is what makes that work
  // for a repeat: the same entry commanded twice produces two distinct payloads, so the
  // consumer's effect re-fires instead of seeing an unchanged object and staying put.

  const grabApi = () => {
    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );
    return held;
  };

  it('requestStudioCommand publishes { type, section, sortId } with a nonce', () => {
    const held = grabApi();
    expect(held.current.studioCommand).toBeNull();

    act(() => {
      held.current.requestStudioCommand('deleteEntry', 'experience', 'a');
    });

    expect(held.current.studioCommand).toMatchObject({
      type: 'deleteEntry',
      section: 'experience',
      sortId: 'a',
    });
    expect(held.current.studioCommand.nonce).toBeDefined();
  });

  it('mints a FRESH nonce each call — the same entry twice is two distinct commands', () => {
    const held = grabApi();

    act(() => {
      held.current.requestStudioCommand('deleteEntry', 'experience', 'a');
    });
    const first = held.current.studioCommand;

    act(() => {
      held.current.requestStudioCommand('deleteEntry', 'experience', 'a');
    });
    const second = held.current.studioCommand;

    // Identical target, different payload — otherwise a delete → undo → delete of the
    // same entry would look unchanged and the consumer effect would never re-run.
    expect(second.nonce).not.toBe(first.nonce);
    expect(second).not.toBe(first);
    expect(second.sortId).toBe('a');
  });

  it('clearStudioCommand nulls the channel so a command is consumed exactly once', () => {
    const held = grabApi();

    act(() => {
      held.current.requestStudioCommand('deleteEntry', 'project', 'p1');
    });
    expect(held.current.studioCommand).not.toBeNull();

    act(() => {
      held.current.clearStudioCommand();
    });
    expect(held.current.studioCommand).toBeNull();
  });

  it('throws a clear error when the hook is used outside the provider', () => {
    const Orphan = () => {
      useAriaStudio();
      return null;
    };
    expect(() => render(<Orphan />)).toThrow(/must be used within an AriaStudioProvider/);
  });
});

/**
 * THE ENTRY WRITERS.
 *
 * Two invariants are worth a test each, per writer:
 *
 *  1. THE NARROW PATCH. saveDraft lands as findByIdAndUpdate — an implicit $set — so a
 *     payload carrying anything beyond { _id, <one list key> } writes a stale snapshot of
 *     the sibling fields back over whatever else the session changed. Asserting the exact
 *     Object.keys is the only version of this check that can't be satisfied by accident.
 *  2. ROLLBACK. A rejected save must leave cvData exactly as it was AND report failure —
 *     an optimistic update that survives its own failed write is a lie the user acts on.
 */
describe('AriaStudioProvider — entry writers', () => {
  let errorSpy;

  // Three REAL entries plus one blank placeholder — the row the Studio creates up front
  // to hold a _sortId, which the preview hides via withoutBlankEntries.
  const draftFixture = () => ({
    _id: 'd1',
    title: 'Draft',
    coachChats: {},
    // A SUBDOC, not a list — and it deliberately carries two fields the preview's contact
    // editor never offers (photoUrl, nationality) plus one it offers but leaves empty
    // (phone). They are what the dot-notation assertions below are watching.
    personalInfo: {
      fullName: 'Ada L',
      email: 'ada@example.com',
      phone: '',
      photoUrl: 'data:image/png;base64,AAAA',
      nationality: 'British',
    },
    experience: [
      { _sortId: 'a', title: 'Engineer', company: 'Acme', description: '• one' },
      { _sortId: 'b', title: 'Analyst', company: 'Globex', description: '• two' },
      { _sortId: 'c', title: 'Intern', company: 'Initech', description: '• three' },
      { _sortId: 'blank', title: '', company: '', description: '' },
    ],
    projects: [{ _sortId: 'p1', title: 'Side thing', description: '' }],
    education: [{ _sortId: 'e1', degree: 'BSc', school: 'State' }],
    skills: [{ name: 'React' }, { name: 'Node' }],
    // No _sortId, deliberately — a certification is addressed by INDEX and nothing else.
    certifications: [
      { name: 'H2S Awareness', issuer: 'OPITO', date: '2023' },
      { name: 'First Aid', issuer: 'Red Cross', date: '2022' },
    ],
  });

  // Mount with a draft already BOUND, so every writer's closure sees a real draftId and
  // real lists. Returns a live handle on the context value, re-captured on each render.
  const mountBound = async (draft = draftFixture()) => {
    localStorage.setItem('ariaStudio:draftId', draft._id);
    CVService.getDraftById.mockResolvedValueOnce(draft);
    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );
    await waitFor(() => expect(held.current?.draftId).toBe(draft._id));
    CVService.saveDraft.mockClear();
    return held;
  };

  const lastPayload = () => CVService.saveDraft.mock.calls.at(-1)[0];
  const sortIds = (list) => list.map((e) => e._sortId);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    CVService.saveDraft.mockResolvedValue({ _id: 'd1' });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    errorSpy.mockRestore();
  });

  // ── applyEntryEdit ──

  it('applyEntryEdit merges the patch and saves ONLY { _id, <list> }', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.applyEntryEdit('experience', 'b', {
        title: 'Senior Analyst',
        company: 'Globex Inc',
      });
    });

    expect(res).toMatchObject({ ok: true, found: true });
    expect(CVService.saveDraft).toHaveBeenCalledTimes(1);
    // THE narrow-patch assertion: two keys, no more.
    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'experience']);
    // Shallow merge — the patched fields change, everything else on the entry survives.
    expect(lastPayload().experience[1]).toEqual({
      _sortId: 'b',
      title: 'Senior Analyst',
      company: 'Globex Inc',
      description: '• two',
    });
    expect(held.current.cvData.experience[1].title).toBe('Senior Analyst');
    // Siblings untouched.
    expect(held.current.cvData.experience[0].title).toBe('Engineer');
  });

  it('applyEntryEdit resolves the list through SECTION_LIST (project → projects)', async () => {
    const held = await mountBound();

    await act(async () => {
      await held.current.applyEntryEdit('project', 'p1', { link: 'https://example.com' });
    });

    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'projects']);
    expect(lastPayload().projects[0].link).toBe('https://example.com');
  });

  it('applyEntryEdit reports found:false and does NOT save for an unknown sortId', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.applyEntryEdit('experience', 'ghost', { title: 'nope' });
    });

    expect(res).toEqual({ ok: false, found: false });
    expect(CVService.saveDraft).not.toHaveBeenCalled();
    // The list is untouched — no silent write of an unchanged array.
    expect(sortIds(held.current.cvData.experience)).toEqual(['a', 'b', 'c', 'blank']);
  });

  it('applyEntryEdit rolls back and reports failure when the save rejects', async () => {
    const held = await mountBound();
    const before = held.current.cvData.experience;
    CVService.saveDraft.mockRejectedValueOnce(new Error('offline'));

    let res;
    await act(async () => {
      res = await held.current.applyEntryEdit('experience', 'a', { title: 'Staff Engineer' });
    });

    expect(res).toMatchObject({ ok: false, found: true });
    expect(held.current.cvData.experience).toEqual(before);
    expect(held.current.cvData.experience[0].title).toBe('Engineer');
    expect(toast.error).toHaveBeenCalled();
  });

  // ── applyRoleEdit, now a wrapper over applyEntryEdit ──

  it('applyRoleEdit still returns a BOOLEAN and still sends the narrow patch', async () => {
    const held = await mountBound();

    let ok;
    await act(async () => {
      ok = await held.current.applyRoleEdit('experience', 'a', '• rewritten');
    });

    // Existing callers (SectionCoach apply, rewrite apply) branch on this directly.
    expect(ok).toBe(true);
    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'experience']);
    expect(lastPayload().experience[0].description).toBe('• rewritten');
    // Only the description moved.
    expect(lastPayload().experience[0].title).toBe('Engineer');

    CVService.saveDraft.mockRejectedValueOnce(new Error('offline'));
    let failed;
    await act(async () => {
      failed = await held.current.applyRoleEdit('experience', 'a', '• nope');
    });
    expect(failed).toBe(false);
  });

  // ── reorderEntries ──

  it('reorderEntries appends unlisted (blank placeholder) entries LAST, never dropping them', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      // Only the three REAL ids — exactly what a drag list built from the visible
      // (blank-filtered) entries would hand over.
      res = await held.current.reorderEntries('experience', ['c', 'a', 'b']);
    });

    expect(res).toEqual({ ok: true });
    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'experience']);
    // Four entries out for four in, with the placeholder parked at the end.
    expect(sortIds(lastPayload().experience)).toEqual(['c', 'a', 'b', 'blank']);
    expect(sortIds(held.current.cvData.experience)).toEqual(['c', 'a', 'b', 'blank']);
  });

  it('reorderEntries ignores an unknown id in the order rather than failing', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.reorderEntries('experience', ['b', 'ghost', 'a']);
    });

    expect(res).toEqual({ ok: true });
    // 'ghost' contributes nothing; 'c' and the blank are appended in original order.
    expect(sortIds(lastPayload().experience)).toEqual(['b', 'a', 'c', 'blank']);
  });

  it('reorderEntries short-circuits (no save) when the order is already current', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.reorderEntries('experience', ['a', 'b', 'c', 'blank']);
    });

    expect(res).toEqual({ ok: true });
    expect(CVService.saveDraft).not.toHaveBeenCalled();
  });

  it('reorderEntries rolls back the order when the save rejects', async () => {
    const held = await mountBound();
    CVService.saveDraft.mockRejectedValueOnce(new Error('offline'));

    let res;
    await act(async () => {
      res = await held.current.reorderEntries('experience', ['c', 'b', 'a']);
    });

    expect(res).toEqual({ ok: false });
    expect(sortIds(held.current.cvData.experience)).toEqual(['a', 'b', 'c', 'blank']);
  });

  // ── removeEntry + restoreEntry ──

  it('removeEntry then restoreEntry round-trips the entry to the same index and _sortId', async () => {
    const held = await mountBound();
    const original = held.current.cvData.experience[1];

    let removal;
    await act(async () => {
      removal = await held.current.removeEntry('experience', 'b');
    });

    expect(removal.ok).toBe(true);
    expect(removal.index).toBe(1);
    expect(removal.removed).toEqual(original);
    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'experience']);
    expect(sortIds(held.current.cvData.experience)).toEqual(['a', 'c', 'blank']);

    let restore;
    await act(async () => {
      restore = await held.current.restoreEntry('experience', removal.removed, removal.index);
    });

    expect(restore).toEqual({ ok: true });
    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'experience']);
    expect(sortIds(held.current.cvData.experience)).toEqual(['a', 'b', 'c', 'blank']);
    // Same object, same id — the transcript markers that point at it still resolve.
    expect(held.current.cvData.experience[1]).toEqual(original);
    expect(held.current.cvData.experience[1]._sortId).toBe('b');
  });

  it('restoreEntry clamps an out-of-range index instead of losing the entry', async () => {
    const held = await mountBound();

    await act(async () => {
      await held.current.restoreEntry('education', { _sortId: 'e2', degree: 'MSc' }, 99);
    });

    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'education']);
    expect(sortIds(lastPayload().education)).toEqual(['e1', 'e2']);
  });

  it('removeEntry reports removed:null / index:-1 and does NOT save for an unknown sortId', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.removeEntry('experience', 'ghost');
    });

    expect(res).toEqual({ ok: false, removed: null, index: -1 });
    expect(CVService.saveDraft).not.toHaveBeenCalled();
  });

  it('removeEntry rolls the entry back when the save rejects', async () => {
    const held = await mountBound();
    CVService.saveDraft.mockRejectedValueOnce(new Error('offline'));

    let res;
    await act(async () => {
      res = await held.current.removeEntry('experience', 'b');
    });

    expect(res.ok).toBe(false);
    // Still reports what it TRIED to remove, so a caller can retry the same undo.
    expect(res.index).toBe(1);
    expect(sortIds(held.current.cvData.experience)).toEqual(['a', 'b', 'c', 'blank']);
  });

  // ── the required-section backstop ──
  //
  // Experience, education and skills may never be emptied. The USER-FACING guard is the
  // Live Preview's disabled Remove (with the reason on hover) — this is the silent net
  // under it, so no other path can empty a required section: a stale queued command, a
  // future caller, a race between a delete and a re-render. `blocked: true` marks a
  // REFUSAL rather than a failed save, which is why nothing is written and nothing toasts.

  it('removeEntry BLOCKS the last experience — no write, nothing lost', async () => {
    const held = await mountBound({
      ...draftFixture(),
      experience: [{ _sortId: 'only', title: 'Engineer', company: 'Acme' }],
    });

    let res;
    await act(async () => {
      res = await held.current.removeEntry('experience', 'only');
    });

    expect(res).toEqual({ ok: false, blocked: true, removed: null, index: -1 });
    // The refusal is silent AND total: no save attempt, and the entry is still there.
    expect(CVService.saveDraft).not.toHaveBeenCalled();
    expect(sortIds(held.current.cvData.experience)).toEqual(['only']);
  });

  it('counts SUBSTANCE, not length — a blank placeholder does not keep the section alive', async () => {
    // The gotcha this predicate exists for. The Studio seeds blank rows to hold a _sortId,
    // so `next.length` is 1 after this delete — but a sheet with an empty heading on it is
    // not a CV with a role on it, which is why the guard filters by hasSubstance.
    const held = await mountBound({
      ...draftFixture(),
      experience: [
        { _sortId: 'only', title: 'Engineer', company: 'Acme' },
        { _sortId: 'blank', title: '', company: '', description: '' },
      ],
    });

    let res;
    await act(async () => {
      res = await held.current.removeEntry('experience', 'only');
    });

    expect(res).toEqual({ ok: false, blocked: true, removed: null, index: -1 });
    expect(CVService.saveDraft).not.toHaveBeenCalled();
  });

  it('removeEntry BLOCKS the last education', async () => {
    // The fixture carries exactly one degree, so this is its last one.
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.removeEntry('education', 'e1');
    });

    expect(res).toEqual({ ok: false, blocked: true, removed: null, index: -1 });
    expect(CVService.saveDraft).not.toHaveBeenCalled();
    expect(sortIds(held.current.cvData.education)).toEqual(['e1']);
  });

  it('ALLOWS the last project — projects are optional, so the section may go empty', async () => {
    // The other half of the contract, and the reason the guard names its sections rather
    // than applying to every list: a CV with no side projects is a perfectly good CV.
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.removeEntry('project', 'p1');
    });

    expect(res).toMatchObject({ ok: true, index: 0 });
    expect(res.blocked).toBeUndefined();
    expect(lastPayload().projects).toEqual([]);
    expect(held.current.cvData.projects).toEqual([]);
  });

  it('still deletes a NON-last experience — the guard is about the last one only', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.removeEntry('experience', 'b');
    });

    expect(res).toMatchObject({ ok: true, index: 1 });
    expect(res.blocked).toBeUndefined();
    expect(sortIds(held.current.cvData.experience)).toEqual(['a', 'c', 'blank']);
  });

  // ── replaceSkills ──

  it('replaceSkills replaces the array wholesale, saving ONLY { _id, skills }', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.replaceSkills([{ name: 'Node' }, { name: 'TypeScript' }]);
    });

    expect(res).toEqual({ ok: true });
    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'skills']);
    // Wholesale: 'React' is GONE (a delete), order is the caller's, and nothing merged.
    expect(lastPayload().skills).toEqual([{ name: 'Node' }, { name: 'TypeScript' }]);
    expect(held.current.cvData.skills).toEqual([{ name: 'Node' }, { name: 'TypeScript' }]);
  });

  it('replaceSkills rolls back to the previous array when the save rejects', async () => {
    const held = await mountBound();
    CVService.saveDraft.mockRejectedValueOnce(new Error('offline'));

    let res;
    await act(async () => {
      res = await held.current.replaceSkills([{ name: 'Rust' }]);
    });

    expect(res).toEqual({ ok: false });
    expect(held.current.cvData.skills).toEqual([{ name: 'React' }, { name: 'Node' }]);
  });

  it('replaceSkills BLOCKS emptying a populated list — no write, skills intact', async () => {
    // Skills is required, and this writer is the ONE way the list is written: the preview's
    // pill × recomputes the whole array and hands it over. So "delete the last skill"
    // arrives here as replaceSkills([]) — refused, the same way the last experience is.
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.replaceSkills([]);
    });

    expect(res).toEqual({ ok: false, blocked: true });
    expect(CVService.saveDraft).not.toHaveBeenCalled();
    expect(held.current.cvData.skills).toEqual([{ name: 'React' }, { name: 'Node' }]);
  });

  it('replaceSkills ALLOWS [] when the list was ALREADY empty — refuse to DELETE, not to no-op', async () => {
    // The guard is about losing work, so it only fires when there is work to lose. An
    // already-empty list writing [] takes nothing away, and blocking it would strand a CV
    // that arrived skill-less (an import, a half-built draft) with a writer that always says no.
    const held = await mountBound({ ...draftFixture(), skills: [] });

    let res;
    await act(async () => {
      res = await held.current.replaceSkills([]);
    });

    expect(res).toEqual({ ok: true });
    expect(res.blocked).toBeUndefined();
  });

  it('replaceSkills still allows a DOWN-TO-ONE edit — only zero is refused', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.replaceSkills([{ name: 'React' }]);
    });

    expect(res).toEqual({ ok: true });
    expect(lastPayload().skills).toEqual([{ name: 'React' }]);
  });

  // ── replaceCertifications ──
  //
  // The same contract as replaceSkills, on the other _sortId-less list. Both of its
  // callers are whole-array computations done by the UI — the preview's add appends and
  // its delete filters — so what's guarded here is that this writes exactly what it was
  // handed, to exactly one key.

  it('replaceCertifications replaces the array wholesale, saving ONLY { _id, certifications }', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.replaceCertifications([
        { name: 'H2S Awareness', issuer: 'OPITO', date: '2023' },
        { name: 'Confined Space', issuer: '', date: '' },
      ]);
    });

    expect(res).toEqual({ ok: true });
    // THE narrow-patch assertion: certifications ride under Education on the page, but
    // they are their OWN top-level key — a payload that also carried `education` would
    // write a stale copy of the degrees back over whatever else the session changed.
    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'certifications']);
    expect(lastPayload().certifications).toEqual([
      { name: 'H2S Awareness', issuer: 'OPITO', date: '2023' },
      { name: 'Confined Space', issuer: '', date: '' },
    ]);
    expect(held.current.cvData.certifications).toEqual(lastPayload().certifications);
    // Education is NOT touched by a certifications write, on the document either.
    expect(held.current.cvData.education).toEqual([
      { _sortId: 'e1', degree: 'BSc', school: 'State' },
    ]);
  });

  it('replaceCertifications rolls back to the previous array when the save rejects', async () => {
    const held = await mountBound();
    CVService.saveDraft.mockRejectedValueOnce(new Error('offline'));

    let res;
    await act(async () => {
      res = await held.current.replaceCertifications([]);
    });

    expect(res).toEqual({ ok: false });
    expect(held.current.cvData.certifications).toEqual([
      { name: 'H2S Awareness', issuer: 'OPITO', date: '2023' },
      { name: 'First Aid', issuer: 'Red Cross', date: '2022' },
    ]);
    // commitList toasts on the caller's behalf, which is why PreviewCertsBlock adds
    // nothing of its own to a failed save.
    expect(toast.error).toHaveBeenCalled();
  });

  // ── updatePersonalInfo ──
  //
  // The ONE subdoc writer, and the one whose narrow patch is spelled differently. Every
  // other writer owns a whole top-level key, so { _id, key } IS the narrow patch. A
  // subdoc has siblings INSIDE it, and an implicit $set of the whole object replaces it —
  // so narrowness here has to be expressed in the payload's KEYS, one dotted path per
  // changed field. These tests are about those keys.

  it('updatePersonalInfo saves DOT-NOTATION paths for the changed fields only', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.updatePersonalInfo({
        fullName: 'Ada Lovelace',
        phone: '+44 7700 900000',
      });
    });

    expect(res).toEqual({ ok: true });
    // THE assertion this writer exists for: dotted PATHS, not a `personalInfo` object.
    // Mongoose turns each into a $set of exactly that path, so the fields nobody named
    // are never written.
    expect(Object.keys(lastPayload()).sort()).toEqual([
      '_id',
      'personalInfo.fullName',
      'personalInfo.phone',
    ]);
    expect(lastPayload()['personalInfo.fullName']).toBe('Ada Lovelace');
    expect(lastPayload()['personalInfo.phone']).toBe('+44 7700 900000');
    // A whole-subdoc write is what this is NOT.
    expect(lastPayload()).not.toHaveProperty('personalInfo');
    // Locally the patch is MERGED, so the untouched fields are still on cvData.
    expect(held.current.cvData.personalInfo).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+44 7700 900000',
      photoUrl: 'data:image/png;base64,AAAA',
      nationality: 'British',
    });
  });

  it('editing ONLY the email leaves every sibling — including photoUrl — out of the payload', async () => {
    const held = await mountBound();

    await act(async () => {
      await held.current.updatePersonalInfo({ email: 'ada@lovelace.dev' });
    });

    // The whole point of the dot-notation shape, stated as one payload: a one-field edit
    // is a one-path write. photoUrl is uploaded on a DIFFERENT card and nationality is
    // captured elsewhere — a payload carrying a stale copy of either would silently undo
    // work this editor never even showed the user.
    expect(Object.keys(lastPayload()).sort()).toEqual(['_id', 'personalInfo.email']);
    expect(lastPayload()['personalInfo.email']).toBe('ada@lovelace.dev');
    expect(lastPayload()).not.toHaveProperty('personalInfo.fullName');
    expect(lastPayload()).not.toHaveProperty('personalInfo.phone');
    expect(lastPayload()).not.toHaveProperty('personalInfo.photoUrl');
    expect(lastPayload()).not.toHaveProperty('personalInfo.nationality');
    // Untouched on the document too.
    expect(held.current.cvData.personalInfo.photoUrl).toBe('data:image/png;base64,AAAA');
    expect(held.current.cvData.personalInfo.nationality).toBe('British');
  });

  it('updatePersonalInfo writes NOTHING when the patch is empty', async () => {
    const held = await mountBound();

    let res;
    await act(async () => {
      res = await held.current.updatePersonalInfo({});
    });

    // Reported as success — "nothing to change" is not a failure — but no request. An
    // empty $set would still be a write racing whatever else the session is saving.
    expect(res).toEqual({ ok: true });
    expect(CVService.saveDraft).not.toHaveBeenCalled();
  });

  it('updatePersonalInfo rolls the WHOLE previous subdoc back when the save rejects', async () => {
    const held = await mountBound();
    CVService.saveDraft.mockRejectedValueOnce(new Error('offline'));

    let res;
    await act(async () => {
      res = await held.current.updatePersonalInfo({ fullName: 'Wrong Name', email: 'no@no.no' });
    });

    expect(res).toEqual({ ok: false });
    // Back to exactly what was on the document — the optimistic merge is undone in full,
    // which is what the re-opened editor re-seeds from.
    expect(held.current.cvData.personalInfo).toEqual({
      fullName: 'Ada L',
      email: 'ada@example.com',
      phone: '',
      photoUrl: 'data:image/png;base64,AAAA',
      nationality: 'British',
    });
    // Toasted by the writer, which is why PreviewContactBlock adds nothing of its own.
    expect(toast.error).toHaveBeenCalled();
  });

  // ── Shared guarantee, stated once across every writer ──

  it('EVERY writer sends exactly _id plus ONE top-level key', async () => {
    const held = await mountBound();

    const calls = [
      () => held.current.applyEntryEdit('experience', 'a', { title: 'X' }),
      () => held.current.applyEntryEdit('education', 'e1', { school: 'Y' }),
      () => held.current.reorderEntries('experience', ['b', 'a']),
      () => held.current.removeEntry('project', 'p1'),
      () => held.current.restoreEntry('project', { _sortId: 'p1', title: 'Side thing' }, 0),
      () => held.current.replaceSkills([{ name: 'Go' }]),
      () => held.current.replaceCertifications([{ name: 'H2S Awareness' }]),
      () => held.current.applyRoleEdit('experience', 'a', '• bullet'),
    ];

    for (const call of calls) {
      await act(async () => {
        await call();
      });
    }

    expect(CVService.saveDraft).toHaveBeenCalledTimes(calls.length);
    CVService.saveDraft.mock.calls.forEach(([payload]) => {
      const keys = Object.keys(payload);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('_id');
      // Never a whole-document save.
      expect(payload).not.toHaveProperty('coachChats');
      expect(payload).not.toHaveProperty('title');
    });
  });
});
