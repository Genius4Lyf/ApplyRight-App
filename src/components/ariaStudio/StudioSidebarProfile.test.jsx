// @vitest-environment jsdom
//
// The drop-up is where "your account" lives now that the top navbar is gone from these
// surfaces. Dark mode joined it: it is a setting, and among the destination rows above it
// read as a fourth place to go.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import '../../i18n';
import StudioSidebarProfile from './StudioSidebarProfile';

const { toggleTheme } = vi.hoisted(() => ({ toggleTheme: vi.fn() }));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme }),
}));
vi.mock('../../hooks/useAccountWallet', () => ({
  useAccountWallet: () => ({ entitlement: null, isPaid: false }),
}));

const mount = () => {
  localStorage.setItem('token', 't');
  localStorage.setItem('user', JSON.stringify({ firstName: 'Daniel', lastName: 'Udofia' }));
  return render(
    <MemoryRouter>
      <StudioSidebarProfile />
    </MemoryRouter>
  );
};

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /daniel/i }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('StudioSidebarProfile — dark mode', () => {
  it('is in the menu, not on the sidebar', () => {
    mount();
    expect(screen.queryByRole('menuitemcheckbox')).toBeNull();
    openMenu();
    expect(screen.getByRole('menuitemcheckbox', { name: /dark mode/i })).toBeTruthy();
  });

  it('reports its state, and leaves the menu open when flipped', () => {
    // Flipping the theme is something you may want to see and undo. Closing the menu
    // under you makes the second tap a hunt for a control you just used.
    mount();
    openMenu();
    const toggle = screen.getByRole('menuitemcheckbox', { name: /dark mode/i });
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(toggle);
    expect(toggleTheme).toHaveBeenCalled();
    expect(screen.getByRole('menuitemcheckbox', { name: /dark mode/i })).toBeTruthy();
  });
});
