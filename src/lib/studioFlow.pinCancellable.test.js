import { describe, it, expect } from 'vitest';
import { pinCancellable } from './studioFlow';

// WHO gets a way out of a build interview.
//
// Aria opening the first role — or the first project — of a new CV is the build
// proceeding, and cancelling there would leave a brand-new CV empty in the section she
// just asked about. Everything the user walked into themselves ("+ Add", "Edit with
// Aria", "Next role") can be abandoned.
//
// The answer is STAMPED on the pin marker when the interview opens rather than worked out
// from the document later, which is the single most important property here: a rule
// recomputed on every render would hand a Cancel to a first role the moment a second entry
// appeared, mid-interview, in a session that started without one.

const pin = (over = {}) => ({ who: 'pinrole', sortId: 'a', section: 'experience', ...over });

describe('pinCancellable', () => {
  it('says no when nothing is pinned at all', () => {
    expect(pinCancellable([], null)).toBe(false);
    expect(pinCancellable([{ who: 'buildstart' }], null)).toBe(false);
  });

  it('says no once the pin has been closed', () => {
    const msgs = [pin({ cancellable: true }), { who: 'unpinrole' }];
    expect(pinCancellable(msgs, null)).toBe(false);
  });

  it('reads the flag off the marker, not off the document', () => {
    // The whole point: a cancellable:false pin stays uncancellable even once the section
    // has filled up around it, and a cancellable:true pin stays cancellable even when its
    // entry is the only one there.
    const cv = { experience: [{ _sortId: 'a' }, { _sortId: 'b' }, { _sortId: 'c' }] };
    expect(pinCancellable([pin({ cancellable: false })], cv)).toBe(false);
    expect(pinCancellable([pin({ cancellable: true })], { experience: [{ _sortId: 'a' }] })).toBe(
      true
    );
  });

  it('takes the LAST pin when an entry has been re-opened', () => {
    // Applying bullets re-pins the same entry to reset the coach's turn window. That
    // re-pin carries the original decision forward; if it ever stopped doing so, this is
    // where it would show.
    const msgs = [pin({ cancellable: false }), { who: 'unpinrole' }, pin({ cancellable: false })];
    expect(pinCancellable(msgs, null)).toBe(false);
  });

  describe('markers written before the flag existed', () => {
    // These are live sessions mid-interview at deploy time. They fall back to the shape of
    // the document, because an entry that is not the only one in its section can only have
    // been reached by a "next" or an "add".
    it('treats a lone entry as the one Aria opened herself', () => {
      const cv = { experience: [{ _sortId: 'a' }] };
      expect(pinCancellable([pin()], cv)).toBe(false);
    });

    it('treats a section that already has others as cancellable', () => {
      const cv = { experience: [{ _sortId: 'a' }, { _sortId: 'b' }] };
      expect(pinCancellable([pin()], cv)).toBe(true);
    });

    it('resolves projects through their own list name', () => {
      // The section token is 'project' singular but the cvData list is 'projects' — the
      // mismatch that silently no-ops elsewhere in this codebase.
      const one = { projects: [{ _sortId: 'p1' }] };
      const two = { projects: [{ _sortId: 'p1' }, { _sortId: 'p2' }] };
      expect(pinCancellable([pin({ section: 'project' })], one)).toBe(false);
      expect(pinCancellable([pin({ section: 'project' })], two)).toBe(true);
    });

    it('never strands a user in education', () => {
      // Education is a short optional detour, not the spine of the CV. A qualification
      // opened by mistake should not be a one-way door even on the first one.
      const cv = { education: [{ _sortId: 'e1' }] };
      expect(pinCancellable([pin({ section: 'education' })], cv)).toBe(true);
    });

    it('survives a missing cvData rather than throwing', () => {
      expect(pinCancellable([pin()], null)).toBe(false);
      expect(pinCancellable([pin()], {})).toBe(false);
    });
  });
});
