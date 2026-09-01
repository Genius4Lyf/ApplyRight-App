// @vitest-environment jsdom
//
// This suite exists because of a bug it would have caught in one line.
//
// The top bar renders a DIFFERENT left-hand element depending on the route — the wordmark
// at home, a Home button everywhere else — and the Home branch referenced an icon that was
// never imported. Nothing found it: `no-undef` does not see JSX identifiers in this
// config, Vite never resolves them, and every test rendered the home route. It surfaced as
// a full-page ReferenceError the moment anyone navigated away from the dashboard.
//
// So the thing being pinned is not the styling. It is that BOTH branches actually render.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import '../i18n';
import Navbar from './Navbar';

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('../hooks/useAccountWallet', () => ({
  useAccountWallet: () => ({
    displayCredits: 32,
    minutesLeft: 20,
    freeTasteMin: 5,
    entitlement: null,
    isPaid: false,
  }),
}));

const mountAt = (pathname, user = { firstName: 'Daniel' }) => {
  localStorage.setItem('token', 't');
  localStorage.setItem('user', JSON.stringify(user));
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Navbar />
    </MemoryRouter>
  );
};

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Navbar — the left-hand slot', () => {
  it('renders a Home link off the home page, without throwing', () => {
    // The regression. Rendering at all is most of the assertion.
    mountAt('/resume/abc');
    expect(screen.getByRole('link', { name: /home/i })).toBeTruthy();
  });

  it('keeps the wordmark ON the home page', () => {
    // The one page whose own name is the right thing to show.
    mountAt('/dashboard');
    expect(screen.getByAltText('ApplyRight')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /^home$/i })).toBeNull();
  });

  it('sends an agent home to their own workspace', () => {
    mountAt('/profile', { firstName: 'Daniel', role: 'agent' });
    expect(screen.getByRole('link', { name: /home/i }).getAttribute('href')).toBe('/agent');
  });

  it('keeps the wordmark on an agent’s own home page', () => {
    mountAt('/agent', { firstName: 'Daniel', role: 'agent' });
    expect(screen.getByAltText('ApplyRight')).toBeTruthy();
  });

  it('shows the wordmark to a signed-out visitor anywhere', () => {
    // No token: there is no "home" to go back to yet.
    render(
      <MemoryRouter initialEntries={['/pricing']}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByAltText('ApplyRight')).toBeTruthy();
  });
});

describe('Navbar — the tabs are gone', () => {
  it('offers no Dashboard or Aria Studio tab', () => {
    // Both were removed: a whole nav row for one destination each, on pages that all
    // carry the way home in the same bar.
    mountAt('/resume/abc');
    expect(screen.queryByRole('link', { name: /dashboard/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /aria studio/i })).toBeNull();
  });
});
