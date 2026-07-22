// Stable per-entry id for CV list items (roles, projects, education).
//
// It persists WITH the data, so ordering survives the auto-save round-trip — and more
// importantly it's the handle every AI writer targets: /coach/generate-bullets and the
// provider's applyRoleBulletDiff both resolve an entry by _sortId, not by array index,
// so reordering or deleting a sibling can't make Aria write into the wrong role.
//
// Extracted from History.jsx / Projects.jsx / Education.jsx, which each carried a
// byte-identical private copy. Aria Studio needed one too, and a fourth copy of an id
// generator is exactly how two surfaces end up minting ids in subtly different formats.
export const newSortId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Backfill ids on entries that predate them, leaving existing ids untouched.
export const ensureIds = (items) =>
  (items || []).map((item) => (item && item._sortId ? item : { ...item, _sortId: newSortId() }));
