// THE PICKER SHOWS ONE GROUP AT A TIME, so this data decides what is REACHABLE.
//
// That is the difference from before: the old picker stacked every group, so a template
// missing from the order list still rendered somewhere down the page. Now a group that is
// not in TEMPLATE_GROUP_ORDER has no chip, and every template in it is invisible with
// nothing on screen to say why. These tests are the guard on that.
import { describe, it, expect } from 'vitest';
import { TEMPLATES, TEMPLATE_GROUP_ORDER, templateGroupOf } from './templates';

describe('TEMPLATE_GROUP_ORDER', () => {
  it('covers every group that any template actually uses', () => {
    // The failure this catches: someone adds a template with a new group and it silently
    // never appears in the Studio.
    const used = [...new Set(TEMPLATES.map((t) => t.group))];
    const orphaned = used.filter((g) => !TEMPLATE_GROUP_ORDER.includes(g));
    expect(orphaned).toEqual([]);
  });

  it('leads with Simple — the plainest layouts, and the two free ones', () => {
    // The first chip is what a first-time user meets. It has to be the family that is
    // right for the most people and the hardest to get wrong, not the most decorative.
    expect(TEMPLATE_GROUP_ORDER[0]).toBe('Simple');
    const simple = TEMPLATES.filter((t) => t.group === 'Simple');
    expect(simple.length).toBeGreaterThan(0);
    expect(simple.every((t) => t.cost === 0)).toBe(true);
  });

  it('runs Simple → Editorial → Professional → Industry, in that order', () => {
    const named = ['Simple', 'Editorial', 'Professional', 'Industry'];
    const positions = named.map((g) => TEMPLATE_GROUP_ORDER.indexOf(g));
    expect(positions).not.toContain(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('names no group that has nothing in it', () => {
    // An empty chip is a door onto a blank panel.
    const empty = TEMPLATE_GROUP_ORDER.filter((g) => !TEMPLATES.some((t) => t.group === g));
    expect(empty).toEqual([]);
  });

  it('lists each group once', () => {
    expect(new Set(TEMPLATE_GROUP_ORDER).size).toBe(TEMPLATE_GROUP_ORDER.length);
  });
});

describe('templateGroupOf', () => {
  it('answers with the template’s own group', () => {
    const sample = TEMPLATES.find((t) => t.group === 'Editorial');
    expect(templateGroupOf(sample.id)).toBe('Editorial');
  });

  it('falls back to the first group rather than to nothing', () => {
    // This decides which chip the panel OPENS on. Returning undefined would open it on no
    // group at all — an empty panel with every chip unselected.
    expect(templateGroupOf('a-template-that-does-not-exist')).toBe(TEMPLATE_GROUP_ORDER[0]);
    expect(templateGroupOf(undefined)).toBe(TEMPLATE_GROUP_ORDER[0]);
  });

  it('never returns a group the picker has no chip for', () => {
    // A template whose group is misspelt or has been renamed out of the order list would
    // otherwise select a chip that is not drawn, leaving the panel blank.
    TEMPLATES.forEach((t) => {
      expect(TEMPLATE_GROUP_ORDER).toContain(templateGroupOf(t.id));
    });
  });
});
