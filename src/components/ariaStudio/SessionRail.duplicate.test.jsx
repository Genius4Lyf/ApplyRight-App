// @vitest-environment jsdom
//
// Duplicate in the Recents row menu.
//
// The rule it enforces isn't the row's to decide: whether a CV is FINISHED is a question
// about the CV body, and this list deliberately never carries one. So the row is told —
// `canDuplicate` comes from the server, computed with the same rule the endpoint gates on.
// What these tests hold is that the row honours that answer, and that an ineligible row
// EXPLAINS itself rather than going quiet.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import '../../i18n';
import SessionRail from './SessionRail';

vi.mock('./StudioSidebarNav', () => ({ default: () => null }));
vi.mock('./StudioSidebarProfile', () => ({ default: () => null }));

const FINISHED = {
  _id: 'd1',
  kind: 'build',
  title: 'Product Designer CV',
  canDuplicate: true,
  updatedAt: '2026-08-20',
};
const UNFINISHED = { ...FINISHED, _id: 'd2', title: 'Half a CV', canDuplicate: false };
const ANALYSIS = {
  _id: 'a1',
  kind: 'application',
  title: 'Rig Electrician',
  jobTitle: 'Rig Electrician',
  updatedAt: '2026-08-21',
};

const mount = (props = {}) => {
  const onDuplicate = vi.fn();
  render(
    <MemoryRouter>
      <SessionRail
        sessions={[FINISHED]}
        loading={false}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={onDuplicate}
        {...props}
      />
    </MemoryRouter>
  );
  return { onDuplicate };
};

const openMenu = (heading) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`actions for ${heading}`, 'i') }));

// Matches both states of the item: 'Duplicate' and, in flight, 'Duplicating…'.
const duplicateItem = () => screen.queryByRole('menuitem', { name: /duplicat/i });

beforeEach(() => localStorage.setItem('token', 't'));
afterEach(() => cleanup());

describe('SessionRail — Duplicate', () => {
  it('offers it on a finished CV session, with the price stated up front', () => {
    // The price belongs on the item, not in a surprise after the click.
    mount();
    openMenu('Product Designer CV');
    expect(duplicateItem()).toBeTruthy();
    expect(duplicateItem().disabled).toBe(false);
    expect(duplicateItem().textContent).toMatch(/\d+\s*cr/i);
  });

  it('hands the whole session back when clicked', () => {
    const { onDuplicate } = mount();
    openMenu('Product Designer CV');
    fireEvent.click(duplicateItem());
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDuplicate.mock.calls[0][0]._id).toBe('d1');
  });

  it('SHOWS it locked on an unfinished CV, and says why', () => {
    // Hiding it would leave someone wondering whether duplicating is possible at all.
    // Locked-with-a-reason answers the question where it gets asked.
    mount({ sessions: [UNFINISHED] });
    openMenu('Half a CV');
    expect(duplicateItem()).toBeTruthy();
    expect(duplicateItem().disabled).toBe(true);
    expect(screen.getByText(/finish this cv first/i)).toBeTruthy();
  });

  it('cannot be fired while locked', () => {
    const { onDuplicate } = mount({ sessions: [UNFINISHED] });
    openMenu('Half a CV');
    fireEvent.click(duplicateItem());
    expect(onDuplicate).not.toHaveBeenCalled();
  });

  it('does not offer it on an analysis at all', () => {
    // An analysis is an Application, not a DraftCV — there is no session to fork.
    mount({ sessions: [ANALYSIS] });
    openMenu('Rig Electrician');
    expect(duplicateItem()).toBeNull();
  });

  it('treats a row with no verdict as eligible rather than dead', () => {
    // A backend that has not shipped the flag yet (they deploy separately) must not make
    // every row look broken. The server is the real gate, so an optimistic row costs at
    // worst one clear error; a pessimistic one would hide a shipped feature entirely.
    mount({ sessions: [{ ...FINISHED, canDuplicate: undefined }] });
    openMenu('Product Designer CV');
    expect(duplicateItem().disabled).toBe(false);
  });

  it('refuses a second click while one is already in flight', () => {
    const { onDuplicate } = mount({ duplicatingId: 'd1' });
    openMenu('Product Designer CV');
    fireEvent.click(duplicateItem());
    expect(onDuplicate).not.toHaveBeenCalled();
  });

  it('says it is working while in flight', () => {
    mount({ duplicatingId: 'd1' });
    openMenu('Product Designer CV');
    expect(screen.getByRole('menuitem', { name: /duplicating/i })).toBeTruthy();
  });

  it('leaves the menu alone when the host offers no duplicate handler', () => {
    // The rail is shared; a host that doesn't wire this up should get the old menu.
    render(
      <MemoryRouter>
        <SessionRail sessions={[FINISHED]} loading={false} onRename={vi.fn()} onDelete={vi.fn()} />
      </MemoryRouter>
    );
    openMenu('Product Designer CV');
    expect(duplicateItem()).toBeNull();
    expect(screen.getByRole('menuitem', { name: /rename/i })).toBeTruthy();
  });
});
