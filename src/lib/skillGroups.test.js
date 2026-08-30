import { describe, expect, it } from 'vitest';
import { moveSkill, renameCategory, skillCategories, skillCategory } from './skillGroups';

// Aria's grouping is wrong often enough to matter — "Pressure testing" under Installation,
// a coined "Technical Practices" nobody would write. Until now the only fix was to delete
// the skill and retype it, losing its evidence and talking point.
//
// A category is not stored anywhere: it is a string on each skill, and the headings are
// derived per render. These rules are all easy to get wrong and INVISIBLE when wrong — the
// CV still shows every skill, just under headings that quietly swapped places.

const cv = () => [
  { name: 'Soldering', category: 'Pipework' },
  { name: 'Pipe fitting', category: 'Pipework' },
  { name: 'Pressure testing', category: 'Testing' },
  { name: 'Drain cleaning', category: 'Maintenance' },
];

const shape = (skills) => skills.map((row) => `${skillCategory(row)}:${row.name || row}`);

describe('moving a skill', () => {
  it('lands it after the last member of its new group', () => {
    // Not merely relabelled. Groups are collected in first-appearance order, so a skill
    // that kept its position would hoist its new group to wherever that skill sits.
    const { next } = moveSkill(cv(), 3, 'Pipework');

    expect(shape(next)).toEqual([
      'Pipework:Soldering',
      'Pipework:Pipe fitting',
      'Pipework:Drain cleaning',
      'Testing:Pressure testing',
    ]);
  });

  it('leaves every other group where the user left it', () => {
    // The regression guard for the reordering trap. Moving the FIRST skill of the first
    // group into the last group is the case that scrambles the page if the element is not
    // spliced: Testing and Maintenance must not change places.
    const { next } = moveSkill(cv(), 0, 'Maintenance');

    expect(skillCategories(next)).toEqual(['Pipework', 'Testing', 'Maintenance']);
    expect(shape(next)).toEqual([
      'Pipework:Pipe fitting',
      'Testing:Pressure testing',
      'Maintenance:Drain cleaning',
      'Maintenance:Soldering',
    ]);
  });

  it('reports the group it emptied, so the user can be told', () => {
    // There is no delete to report — the heading simply stops being derived. The caller
    // needs to know it happened because nothing else will say so.
    const result = moveSkill(cv(), 2, 'Pipework');

    expect(result.emptied).toBe('Testing');
    expect(skillCategories(result.next)).toEqual(['Pipework', 'Maintenance']);
    // …and no other skill was touched.
    expect(result.next).toHaveLength(4);
  });

  it('reports nothing emptied when the group survives', () => {
    expect(moveSkill(cv(), 0, 'Testing').emptied).toBeNull();
  });

  it('turns a plain-string skill into an object, keeping its name', () => {
    // Older drafts and some imports store bare strings, which have nowhere to put a
    // category. This is where that shape converts.
    const { next } = moveSkill(
      ['Soldering', { name: 'Pipe fitting', category: 'Pipework' }],
      0,
      'Pipework'
    );

    expect(next).toEqual([
      { name: 'Pipe fitting', category: 'Pipework' },
      { name: 'Soldering', category: 'Pipework' },
    ]);
  });

  it('keeps the rest of a skill — evidence and talking point survive the move', () => {
    // The whole point of moving rather than delete-and-retype.
    const rich = [
      {
        name: 'Soldering',
        category: 'Pipework',
        evidence: [{ refIndex: 0 }],
        talkingPoint: 'At Ace…',
      },
    ];
    const { next } = moveSkill(rich, 0, 'Joining');

    expect(next[0]).toEqual({
      name: 'Soldering',
      category: 'Joining',
      evidence: [{ refIndex: 0 }],
      talkingPoint: 'At Ace…',
    });
  });

  it('moves only the one, when two skills share a name', () => {
    // A real CV can carry the same name in two categories, which is exactly why the caller
    // addresses a skill by INDEX rather than by name.
    const dupes = [
      { name: 'Testing', category: 'Pipework' },
      { name: 'Testing', category: 'Software' },
    ];
    const { next } = moveSkill(dupes, 1, 'Pipework');

    expect(next).toHaveLength(2);
    expect(shape(next)).toEqual(['Pipework:Testing', 'Pipework:Testing']);
  });

  it('does nothing when the skill is already there, or the index is bad', () => {
    expect(moveSkill(cv(), 0, 'Pipework')).toBeNull();
    expect(moveSkill(cv(), 0, 'pipework')).toBeNull(); // case is not a difference
    expect(moveSkill(cv(), 99, 'Testing')).toBeNull();
    expect(moveSkill([], 0, 'Testing')).toBeNull();
  });

  it('treats a blank destination as the shared fallback bucket', () => {
    expect(moveSkill(cv(), 0, '   ').next[3].category).toBe('Uncategorized');
  });
});

describe('renaming a group', () => {
  it('rewrites every member and nothing else', () => {
    const { next } = renameCategory(cv(), 'Pipework', 'Installation');

    expect(shape(next)).toEqual([
      'Installation:Soldering',
      'Installation:Pipe fitting',
      'Testing:Pressure testing',
      'Maintenance:Drain cleaning',
    ]);
  });

  it('merges when renamed onto a group that already exists', () => {
    // Deliberate, not an accident: it is the only way to combine the "Testing" and
    // "Test & Commissioning" the model coined as separate buckets.
    const result = renameCategory(cv(), 'Testing', 'Maintenance');

    expect(result.merged).toBe(true);
    expect(skillCategories(result.next)).toEqual(['Pipework', 'Maintenance']);
    expect(result.next).toHaveLength(4);
  });

  it('renames Uncategorized like any other group', () => {
    // It is a stored sentinel whose DISPLAY is localized — renaming turns a bucket of
    // orphans into a real category, which is how someone fixes a bad import.
    const orphans = [{ name: 'Soldering' }, { name: 'Pipe fitting', category: '' }];
    const { next } = renameCategory(orphans, 'Uncategorized', 'Pipework');

    expect(shape(next)).toEqual(['Pipework:Soldering', 'Pipework:Pipe fitting']);
  });

  it('sends a group back to Uncategorized when the name is cleared', () => {
    expect(shape(renameCategory(cv(), 'Testing', '  ').next)).toContain(
      'Uncategorized:Pressure testing'
    );
  });

  it('does nothing when the name is unchanged or the group does not exist', () => {
    expect(renameCategory(cv(), 'Pipework', 'Pipework')).toBeNull();
    expect(renameCategory(cv(), 'Pipework', ' pipework ')).toBeNull();
    expect(renameCategory(cv(), 'Nonexistent', 'Whatever')).toBeNull();
  });
});

describe('skillCategories', () => {
  it('lists them in the order their first skill appears', () => {
    expect(skillCategories(cv())).toEqual(['Pipework', 'Testing', 'Maintenance']);
  });

  it('folds a nameless entry and a blank category into the fallback', () => {
    expect(skillCategories([{ name: '' }, 'Soldering', { name: 'X', category: '' }])).toEqual([
      'Uncategorized',
    ]);
  });
});
