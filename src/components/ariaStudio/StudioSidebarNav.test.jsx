// @vitest-environment jsdom
//
// The destination rows follow ONE rule: a workspace's row is hidden when you are already
// standing in that workspace. It matters more than it sounds — every one of these rows
// leads to a list, and the list it would lead to is the one already open beside it. A row
// that reloads the page you are on is the clearest way to make a sidebar feel broken.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import '../../i18n';
import StudioSidebarNav from './StudioSidebarNav';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('../../hooks/useAccountWallet', () => ({
  useAccountWallet: () => ({ displayCredits: 32, minutesLeft: 20, freeTasteMin: 5 }),
}));

const mountAt = (pathname, user = {}) => {
  localStorage.setItem('token', 't');
  localStorage.setItem('user', JSON.stringify(user));
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <StudioSidebarNav />
    </MemoryRouter>
  );
};

const row = (name) => screen.queryByRole('button', { name: new RegExp(name, 'i') });

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('StudioSidebarNav — which doors a surface offers', () => {
  it('offers no Aria Studio row inside Aria Studio', () => {
    mountAt('/aria-studio');
    expect(row('Aria Studio')).toBeNull();
    expect(row('Interview Prep')).toBeTruthy();
  });

  it('offers no Interview Prep row inside interview prep', () => {
    mountAt('/interview-prep/app-1');
    expect(row('Interview Prep')).toBeNull();
    expect(row('Aria Studio')).toBeTruthy();
  });

  it('offers both studios from the CV workspace', () => {
    mountAt('/cv-builder/abc/history');
    expect(row('Aria Studio')).toBeTruthy();
    expect(row('Interview Prep')).toBeTruthy();
  });

  it('offers My CVs and CV Studio everywhere except inside them', () => {
    // These two were once held out on the grounds that the dashboard carried them. It
    // doesn't — there is no dashboard — and /cv-studio in particular had exactly one
    // inbound link in the whole app, on the page that was deleted. This nav is the only
    // index of the app there is now, so it has to name every workspace.
    mountAt('/aria-studio');
    expect(row('My CVs')).toBeTruthy();
    expect(row('CV Studio')).toBeTruthy();
    cleanup();

    // ...and each still disappears where it would point at the room you are in.
    mountAt('/cv-builder/abc/history');
    expect(row('My CVs')).toBeNull();
    expect(row('CV Studio')).toBeTruthy();
    cleanup();

    // /cv-studio is the list frame and /resume/:id is the studio itself: ONE workspace at
    // two addresses, so the row hides at both.
    ['/cv-studio', '/resume/abc'].forEach((path) => {
      mountAt(path);
      expect(row('CV Studio')).toBeNull();
      expect(row('My CVs')).toBeTruthy();
      cleanup();
    });
  });

  it('keeps dark mode out of the destinations', () => {
    // It is a setting, not a place. It lives in the profile drop-up now, beside language.
    mountAt('/aria-studio');
    expect(row('Dark mode')).toBeNull();
  });

  it('keeps agents out of both studios', () => {
    // Agents have a CV-only workspace. Offering them a door they are bounced back out of
    // would be worse than offering no door.
    mountAt('/cv-builder/abc', { role: 'agent' });
    expect(row('Aria Studio')).toBeNull();
    expect(row('Interview Prep')).toBeNull();
  });

  it('gives an agent a Home row, and a seeker none', () => {
    // The same ONE RULE, applied to home itself. A seeker's home IS Aria Studio (see
    // lib/home.js), so a Home row beside the Aria Studio row would be two doors to one
    // address — and inside the Studio, a door to the room you are standing in.
    //
    // An agent's home is a different workspace, so theirs stays.
    mountAt('/cv-builder/abc', { role: 'agent' });
    expect(row('Home')).toBeTruthy();
    cleanup();

    mountAt('/profile');
    expect(row('Home')).toBeNull();
    expect(row('Aria Studio')).toBeTruthy();
  });
});
