// @vitest-environment jsdom
//
// During the campaign every other route funnels back to this page, so the sign-out here
// is the ONLY way out for a signed-in visitor — losing it seals someone into their own
// account with no way to switch. It also must not appear for a guest who followed the
// shared /pre-launch link, where it would imply an account they do not have.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import '../i18n';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => navigate,
}));
vi.mock('../services/api', () => ({ default: { get: vi.fn(() => new Promise(() => {})) } }));

import PreLaunch from './PreLaunch';

const LAUNCH = { enabled: true, date: '2099-01-01T00:00:00.000Z', bonusCredits: 50 };

const mount = () =>
  render(
    <MemoryRouter>
      <PreLaunch launch={LAUNCH} />
    </MemoryRouter>
  );

const signIn = () => {
  localStorage.setItem('token', 'fake.jwt');
  localStorage.setItem('user', JSON.stringify({ email: 'new@person.com' }));
};

const signOutButton = () => screen.queryByRole('button', { name: /^sign out$/i });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(() => cleanup());

describe('PreLaunch — the way out', () => {
  it('offers sign-out to a signed-in visitor', () => {
    signIn();
    mount();
    expect(signOutButton()).toBeTruthy();
  });

  it('offers NOTHING to a guest who followed the shared link', () => {
    mount();
    expect(signOutButton()).toBeNull();
  });

  it('confirms before signing anyone out', () => {
    // The countdown holds no unsaved work, but signing out by accident means finding
    // your password again mid-campaign. Same confirm as the rest of the product.
    signIn();
    mount();
    fireEvent.click(signOutButton());

    expect(screen.getByText(/are you sure you want to sign out/i)).toBeTruthy();
    // Nothing has happened yet.
    expect(localStorage.getItem('token')).toBe('fake.jwt');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves the session intact on cancel', () => {
    signIn();
    mount();
    fireEvent.click(signOutButton());
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(localStorage.getItem('token')).toBe('fake.jwt');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears BOTH stored keys and leaves for the login page on confirm', () => {
    signIn();
    mount();
    fireEvent.click(signOutButton());
    // The dialog's own button carries the same label; it is the later of the two.
    const confirms = screen.getAllByRole('button', { name: /^sign out$/i });
    fireEvent.click(confirms[confirms.length - 1]);

    // A leftover `user` blob with a cleared token is what makes the next visitor look
    // half-signed-in to every wrapper that reads it.
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});

describe('PreLaunch — it has two audiences', () => {
  // The page is a public URL precisely so the campaign can share it. A stranger who
  // follows that link must not be told they are on a list they never joined.
  it('does not claim a GUEST is on the list', () => {
    mount();
    expect(screen.queryByText(/on the list/i)).toBeNull();
    expect(screen.getByText(/opens soon/i)).toBeTruthy();
  });

  it('does not promise a GUEST credits on an account they do not have', () => {
    mount();
    expect(screen.queryByText(/waiting on your account/i)).toBeNull();
    expect(screen.getByText(/free credits when you sign up/i)).toBeTruthy();
  });

  it('lets a GUEST leave for the landing page', () => {
    // The countdown is not a trap: someone who is not ready to sign up yet should be
    // able to go read what the product actually is.
    mount();
    expect(screen.getByRole('link', { name: /^home$/i }).getAttribute('href')).toBe('/');
  });

  it('gives a GUEST somewhere to go', () => {
    // Without this the shared link is a dead end: a countdown and no way to act on it.
    mount();
    const cta = screen.getByRole('link', { name: /create your account/i });
    expect(cta.getAttribute('href')).toBe('/register');
    expect(screen.getByRole('link', { name: /sign in/i }).getAttribute('href')).toBe('/login');
  });

  it('keeps the registrant copy for someone signed in', () => {
    signIn();
    mount();
    expect(screen.getByText(/on the list/i)).toBeTruthy();
    expect(screen.getByText(/waiting on your account/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /create your account/i })).toBeNull();
  });

  it('addresses a registrant by the email we will actually write to', () => {
    signIn();
    mount();
    expect(screen.getByText(/new@person.com/)).toBeTruthy();
  });
});
