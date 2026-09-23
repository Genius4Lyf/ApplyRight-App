// @vitest-environment jsdom
//
// "Whenever I click a skill or pick a skill, it keeps jumping the card to the start."
//
// The cause was one line: `const SkillRow = ({ row }) => {` sat INSIDE SkillsCard's body,
// so the component type was a brand-new function on every render. React compares element
// types by identity — a type that changes is never an update, it is an unmount plus a
// mount. Ticking one checkbox tore out every row and rebuilt it.
//
// That is what moved the scroll. React commits deletions before insertions, so for that
// moment the `max-h-[58vh] overflow-y-auto` list held nothing, its scrollHeight collapsed
// to the padding, and the browser clamped scrollTop to 0. The rows came back; the scroll
// position did not.
//
// jsdom does no layout, so scrollTop cannot be asserted here. The DOM NODE IDENTITY is
// the real property anyway, and the exact one that was broken: if the same element object
// survives a toggle, React updated it in place and there was never a moment with an empty
// scroller. This test fails if SkillRow is moved back inside the component.
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import SkillsCard from './SkillsCard';

const skill = (name) => ({
  name,
  category: 'Operations',
  reason: `Demonstrated while working on ${name}.`,
  evidence: [
    {
      type: 'experience',
      refIndex: 0,
      sourceLabel: 'Maintenance Technician at Dangote',
      snippet: 'Serviced rotating equipment on a rota.',
    },
  ],
});

// Long enough to overflow the 58vh scroller in a real browser — the situation reported.
const GROUPS = {
  mode: 'profile',
  core: ['Preventive Maintenance', 'Vibration Analysis', 'Permit-to-Work'].map(skill),
  additional: ['Lockout/Tagout', 'Root-Cause Analysis', 'Technical Drawings'].map(skill),
  confirmation: [],
  gaps: [],
};

const rowFor = (name) => screen.getByText(name).closest('div.rounded-xl');
const checkboxFor = (name) => rowFor(name).querySelector('button[aria-pressed]');

afterEach(cleanup);

describe('SkillsCard keeps its place when you pick a skill', () => {
  it('updates the rows in place instead of unmounting and rebuilding them', () => {
    render(<SkillsCard reviewGroups={GROUPS} />);

    const before = GROUPS.core.concat(GROUPS.additional).map((row) => rowFor(row.name));

    fireEvent.click(checkboxFor('Vibration Analysis'));

    const after = GROUPS.core.concat(GROUPS.additional).map((row) => rowFor(row.name));
    // Every row, not just the one clicked — the old bug rebuilt the whole list.
    after.forEach((node, index) => expect(node).toBe(before[index]));
  });

  it('still actually selects the skill it kept in place', () => {
    render(<SkillsCard reviewGroups={GROUPS} />);

    expect(checkboxFor('Vibration Analysis').getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(checkboxFor('Vibration Analysis'));
    expect(checkboxFor('Vibration Analysis').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(checkboxFor('Vibration Analysis'));
    expect(checkboxFor('Vibration Analysis').getAttribute('aria-pressed')).toBe('false');
  });

  it('survives a toggle on a DIFFERENT row, which is what a real pick session does', () => {
    render(<SkillsCard reviewGroups={GROUPS} />);

    const last = rowFor('Technical Drawings');
    fireEvent.click(checkboxFor('Preventive Maintenance'));
    fireEvent.click(checkboxFor('Permit-to-Work'));
    fireEvent.click(checkboxFor('Root-Cause Analysis'));

    expect(rowFor('Technical Drawings')).toBe(last);
  });

  it('keeps the row in place when the evidence detail is opened', () => {
    render(<SkillsCard reviewGroups={GROUPS} />);

    const row = rowFor('Vibration Analysis');
    // The chevron is the third button in the row (checkbox, name, detail).
    const detail = row.querySelectorAll('button')[2];
    fireEvent.click(detail);

    expect(rowFor('Vibration Analysis')).toBe(row);
    expect(screen.getByText('Serviced rotating equipment on a rota.')).toBeTruthy();
  });
});
