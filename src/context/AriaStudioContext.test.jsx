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
    experience: [
      { _sortId: 'a', title: 'Engineer', company: 'Acme', description: '• one' },
      { _sortId: 'b', title: 'Analyst', company: 'Globex', description: '• two' },
      { _sortId: 'c', title: 'Intern', company: 'Initech', description: '• three' },
      { _sortId: 'blank', title: '', company: '', description: '' },
    ],
    projects: [{ _sortId: 'p1', title: 'Side thing', description: '' }],
    education: [{ _sortId: 'e1', degree: 'BSc', school: 'State' }],
    skills: [{ name: 'React' }, { name: 'Node' }],
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
      res = await held.current.replaceSkills([]);
    });

    expect(res).toEqual({ ok: false });
    expect(held.current.cvData.skills).toEqual([{ name: 'React' }, { name: 'Node' }]);
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
