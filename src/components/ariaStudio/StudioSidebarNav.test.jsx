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

  it('never offers My CVs, on any surface', () => {
    // Every sidebar that renders this nav already shows a list of its own; a row to a
    // SECOND list is a door out of a room you just walked into. /cv-builder is reached
    // from the Dashboard, from leaving the wizard, or from an old /my-cvs link.
    ['/aria-studio', '/interview-prep/app-1', '/cv-builder/abc', '/resume/abc'].forEach((path) => {
      mountAt(path);
      expect(row('My CVs')).toBeNull();
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

  it('always offers Home', () => {
    mountAt('/aria-studio');
    expect(row('Home')).toBeTruthy();
  });
});
