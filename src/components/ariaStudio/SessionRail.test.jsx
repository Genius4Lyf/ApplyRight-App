// @vitest-environment jsdom
//
// Recents holds two kinds of row — CV sessions and job analyses — because to the person
// looking at it they are two kinds of the same thing. What these tests hold is that the
// two stay TELLABLE APART and behave differently where they genuinely differ: an analysis
// is not a document, so it has no name to rename.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
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

describe('SessionRail — the two ways to start', () => {
  it('offers New CV and Prepare for an interview', () => {
    const onNewCv = vi.fn();
    const onNewPrep = vi.fn();
    mount({ onNewCv, onNewPrep });

    // Exact names: "New CV" is ALSO the tag on a build row, so a loose match would find
    // that row's button too.
    fireEvent.click(screen.getByRole('button', { name: 'New CV' }));
    expect(onNewCv).toHaveBeenCalled();

    // Two labels are in the markup — the short one for the phone row, the full one for
    // desk width — and only one is displayed at a time. jsdom applies no CSS, so both sit
    // in the accessible name here; matched loosely rather than pinning a name that only
    // ever appears in a test.
    fireEvent.click(screen.getByRole('button', { name: /prepare for an interview/i }));
    expect(onNewPrep).toHaveBeenCalled();
  });
});
