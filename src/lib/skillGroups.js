import { UNCATEGORIZED } from './skillCategories';

/**
 * Rearranging skills between categories.
 *
 * A CATEGORY IS NOT A THING. It exists only as a string on each skill, and the groups on
 * screen are derived per render. So moving a skill is one `category` value, renaming a
 * group is that value on every member, and an emptied group is not deleted — it simply
 * stops being derived.
 *
 * These live outside the component because the ordering rule below is easy to get wrong
 * and invisible when it is: the CV still shows every skill, just under headings that
 * silently swapped places.
 */

// A skill is stored as EITHER a plain string OR { name, category } — both shapes are on
// real CVs (the builder writes objects; older drafts and some imports are strings).
export const skillName = (skill) => (typeof skill === 'string' ? skill : skill?.name || '');
export const skillCategory = (skill) =>
  (typeof skill === 'string' ? '' : skill?.category || '') || UNCATEGORIZED;

const sameCategory = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Blank is not a category — it is how a skill lands in the shared fallback bucket.
const normalizeCategory = (value) => String(value || '').trim() || UNCATEGORIZED;

/**
 * Move one skill into another category.
 *
 * The element is SPLICED, not just relabelled. Groups are collected in first-appearance
 * order, so a skill that only had its label changed would drag its new group to wherever
 * that skill happens to sit — move something into a category further down the page and the
 * whole category jumps up it. Reinserting after the group's last member keeps every other
 * heading exactly where the user left it.
 *
 * @param {Array} skills the current skills array
 * @param {number} index position of the skill to move
 * @param {string} category the destination category (blank → Uncategorized)
 * @returns {{ next: Array, moved: string, from: string, to: string, emptied: string|null }|null}
 *          null when there is nothing to do — a bad index, or a skill already there.
 */
export const moveSkill = (skills, index, category) => {
  const list = Array.isArray(skills) ? skills : [];
  const skill = list[index];
  if (!skill || !skillName(skill)) return null;

  const to = normalizeCategory(category);
  const from = skillCategory(skill);
  if (sameCategory(from, to)) return null;

  // A plain-string skill has nowhere to keep a category, so this is where it becomes an
  // object. Nothing is lost: a string carries only its name.
  const relocated =
    typeof skill === 'string' ? { name: skill, category: to } : { ...skill, category: to };

  const rest = list.filter((_, i) => i !== index);
  // After the LAST member of the destination, so the skill joins the end of that group
  // rather than splitting it or hoisting it.
  let insertAt = rest.length;
  for (let i = rest.length - 1; i >= 0; i -= 1) {
    if (sameCategory(skillCategory(rest[i]), to)) {
      insertAt = i + 1;
      break;
    }
  }

  const next = [...rest.slice(0, insertAt), relocated, ...rest.slice(insertAt)];
  // Reported so the caller can say so — the group is not deleted, it stops existing.
  const emptied = rest.some((row) => sameCategory(skillCategory(row), from)) ? null : from;

  return { next, moved: skillName(skill), from, to, emptied };
};

/**
 * Rename a category — every skill carrying it.
 *
 * Renaming ONTO a category that already exists merges the two, deliberately: it is the fix
 * for a model that coined "Testing" and "Test & Commissioning" as separate buckets, and
 * refusing it would leave the user no way to combine them.
 *
 * `Uncategorized` renames like any other. It is a stored sentinel whose DISPLAY is
 * localized, so renaming it turns a bucket of orphans into a real category.
 *
 * @returns {{ next: Array, from: string, to: string, merged: boolean }|null}
 *          null when nothing changes.
 */
export const renameCategory = (skills, from, to) => {
  const list = Array.isArray(skills) ? skills : [];
  const target = normalizeCategory(to);
  if (!from || sameCategory(from, target)) return null;

  const members = list.filter((row) => sameCategory(skillCategory(row), from));
  if (!members.length) return null;

  const merged = list.some(
    (row) => sameCategory(skillCategory(row), target) && !sameCategory(skillCategory(row), from)
  );

  const next = list.map((row) => {
    if (!sameCategory(skillCategory(row), from)) return row;
    return typeof row === 'string' ? { name: row, category: target } : { ...row, category: target };
  });

  return { next, from, to: target, merged };
};

/**
 * The categories currently on a CV, in the order their first skill appears.
 * Shared by the group headings, the "Move to…" menu and the add form's datalist so the
 * three can never disagree about what exists.
 */
export const skillCategories = (skills) => {
  const seen = new Set();
  const out = [];
  (Array.isArray(skills) ? skills : []).forEach((skill) => {
    if (!skillName(skill)) return;
    const category = skillCategory(skill);
    const key = category.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(category);
  });
  return out;
};
