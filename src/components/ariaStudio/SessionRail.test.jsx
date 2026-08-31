// @vitest-environment jsdom
//
// Recents holds two kinds of row — CV sessions and job analyses — because to the person
// looking at it they are two kinds of the same thing. What these tests hold is that the
// two stay TELLABLE APART and behave differently where they genuinely differ: an analysis
// is not a document, so it has no name to rename.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import SessionRail from './SessionRail';

// The rail's nav + profile blocks fetch a wallet and read the router; neither is what
// this suite is about.
vi.mock('./StudioSidebarNav', () => ({ default: () => null }));
vi.mock('./StudioSidebarProfile', () => ({ default: () => null }));

const BUILD = { _id: 'd1', kind: 'build', title: 'Untitled CV', updatedAt: '2026-08-20' };
const ANALYSIS = {
  _id: 'a1',
  kind: 'application',
  title: 'Rig Electrician',
  jobTitle: 'Rig Electrician',
  company: 'Seadrill',
  fitScore: 58,
  updatedAt: '2026-08-21',
};

const mount = (props = {}) =>
  render(
    <MemoryRouter>
      <SessionRail
        sessions={[ANALYSIS, BUILD]}
        loading={false}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );

// The overflow control for one row, found by its accessible name.
const actionsFor = (heading) =>
  screen.getByRole('button', { name: new RegExp(`actions for ${heading}`, 'i') });

// The row menu's items carry role="menuitem", not role="button".
const menuItem = (name) => screen.queryByRole('menuitem', { name });

beforeEach(() => {
  localStorage.setItem('token', 't');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('SessionRail — an analysis row', () => {
  it('is tagged as an analysis and shows its score', () => {
    mount();
    expect(screen.getByText('Analysis')).toBeTruthy();
    expect(screen.getByText('58')).toBeTruthy();
    // The meta line is company + a RELATIVE time, so match the part that is ours.
    expect(screen.getByText(/Seadrill/)).toBeTruthy();
  });

  it('hands the whole session to onSelect, not just an id', () => {
    // The caller has to know WHICH KIND it is to open it: a CV session binds a draft, an
    // analysis binds an Application. An id alone can't say which.
    const onSelect = vi.fn();
    mount({ onSelect });
    fireEvent.click(screen.getByText('Rig Electrician'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'a1', kind: 'application' })
    );
  });

  it('offers no rename — an analysis has no name of its own', () => {
    mount();
    fireEvent.click(actionsFor('Rig Electrician'));
    expect(menuItem(/rename/i)).toBeNull();
    expect(menuItem(/delete/i)).toBeTruthy();
  });

  it('still offers rename on a CV session, which does have one', () => {
    mount();
    fireEvent.click(actionsFor('Untitled CV'));
    expect(menuItem(/rename/i)).toBeTruthy();
  });
});

describe('SessionRail — the ways to start', () => {
  it('offers both build paths behind New CV, and Interview beside it', () => {
    const onNewCv = vi.fn();
    const onNewBuilderCv = vi.fn();
    const onNewPrep = vi.fn();
    mount({ onNewCv, onNewBuilderCv, onNewPrep });

    // The trigger is named by its aria-label, not its visible text: "New CV" is ALSO the
    // tag on a build row, and a loose match would find that row instead.
    fireEvent.click(screen.getByRole('button', { name: /start a new cv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /build with aria/i }));
    expect(onNewCv).toHaveBeenCalled();
    expect(onNewBuilderCv).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /start a new cv/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /build with cv studio/i }));
    expect(onNewBuilderCv).toHaveBeenCalled();

    // Two labels are in the markup — the short one for the phone row, the full one for
    // desk width — and only one is displayed at a time. jsdom applies no CSS, so both sit
    // in the accessible name here; matched loosely rather than pinning a name that only
    // ever appears in a test.
    fireEvent.click(screen.getByRole('button', { name: /prepare for an interview/i }));
    expect(onNewPrep).toHaveBeenCalled();
  });
});

describe('SessionRail — the Recents filter', () => {
  const openFilter = () => fireEvent.click(screen.getByRole('button', { name: /filter recents/i }));
  const pick = (name) => fireEvent.click(screen.getByRole('option', { name }));

  it('shows one kind at a time', () => {
    mount();
    openFilter();
    pick('CVs');
    expect(screen.getByText('Untitled CV')).toBeTruthy();
    expect(screen.queryByText('Rig Electrician')).toBeNull();

    openFilter();
    pick('Applications');
    expect(screen.getByText('Rig Electrician')).toBeTruthy();
    expect(screen.queryByText('Untitled CV')).toBeNull();
  });

  it('says which slice is empty, rather than showing the first-run invitation', () => {
    // Someone with three analyses and no CVs is plainly not on their first run — telling
    // them "no sessions yet" would be false, and the invitation to start one is noise.
    mount({ sessions: [ANALYSIS] });
    openFilter();
    pick('CVs');
    expect(screen.getByText(/no cvs here yet/i)).toBeTruthy();
    expect(screen.queryByText(/no sessions yet/i)).toBeNull();
  });

  it('snaps back to All when the session you just opened is outside the filter', () => {
    // The trap this closes: filter to Applications, start a CV, and the thing you just
    // made is invisible — hidden by a choice made minutes ago and long forgotten.
    const { rerender } = mount();
    openFilter();
    pick('Applications');
    expect(screen.queryByText('Untitled CV')).toBeNull();

    rerender(
      <MemoryRouter>
        <SessionRail sessions={[ANALYSIS, BUILD]} loading={false} activeId="d1" />
      </MemoryRouter>
    );
    expect(screen.getByText('Untitled CV')).toBeTruthy();
  });

  it('offers no filter at all before there is anything to filter', () => {
    mount({ sessions: [] });
    expect(screen.queryByRole('button', { name: /filter recents/i })).toBeNull();
    expect(screen.getByText(/recents/i)).toBeTruthy();
  });
});

describe('SessionRail — telling the two kinds apart', () => {
  // Scoped to the rows: "New CV" is also the label on the button above the list.
  const tagIn = (heading, label) =>
    within(screen.getByText(heading).closest('li')).getByText(label);

  it('carries its colour on the text, with nothing behind it', () => {
    // A filled pill around two words inside a line of plain text reads as a control you
    // could press — the same reason the analysis card's verdicts lost their borders.
    mount();
    [tagIn('Rig Electrician', 'Analysis'), tagIn('Untitled CV', 'New CV')].forEach((tag) => {
      expect(tag.className).not.toMatch(/(^|s)bg-/);
      expect(tag.className).not.toMatch(/rounded|ring-|border/);
    });
  });

  it('gives each kind its own colour, and neither one a band colour', () => {
    // Identical grey tags meant telling a CV from an analysis required READING the row.
    mount();
    const analysis = tagIn('Rig Electrician', 'Analysis').className;
    const cv = tagIn('Untitled CV', 'New CV').className;

    expect(analysis).not.toBe(cv);
    // No band colours, and no green or indigo either: green read as a verdict, and indigo
    // is being retired across the product.
    [analysis, cv].forEach((tone) => {
      expect(tone).not.toMatch(/emerald|amber|rose|green|teal|indigo/);
    });
  });

  it('joins the tag to the score with a dash a screen reader never hears', () => {
    mount();
    const row = screen.getByText('Rig Electrician').closest('li');
    const dash = within(row).getByText('–');
    expect(dash.getAttribute('aria-hidden')).toBe('true');
  });

  it('leaves the score its band colour — that one IS a judgement', () => {
    mount();
    expect(screen.getByText('58').className).toMatch(/amber/);
  });

  it('draws no dash on a row with no tag in front of the score', () => {
    // A tailoring has a score but no tag, so there is nothing for a separator to separate.
    mount({ sessions: [{ _id: 't1', kind: 'tailor', title: 'Tailored CV', fitScore: 71 }] });
    const row = screen.getByText('Tailored CV').closest('li');
    expect(within(row).queryByText('–')).toBeNull();
  });
});
