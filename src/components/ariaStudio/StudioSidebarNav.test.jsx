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
// Settable rather than fixed: the wallet's EMPTY state is a different control from its
// full one, so the tests below need to put it at zero.
const FULL_WALLET = { displayCredits: 32, minutesLeft: 20, freeTasteMin: 5 };
const walletState = vi.hoisted(() => ({ value: null }));
vi.mock('../../hooks/useAccountWallet', () => ({
  useAccountWallet: () => walletState.value,
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

beforeEach(() => {
  localStorage.clear();
  walletState.value = { ...FULL_WALLET };
});
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

  it('offers CV Studio everywhere except inside it', () => {
    // It was once held out on the grounds that the dashboard carried it. It doesn't —
    // there is no dashboard — and /cv-studio had exactly one inbound link in the whole
    // app, on the page that was deleted. This nav is the only index there is now.
    mountAt('/aria-studio');
    expect(row('CV Studio')).toBeTruthy();
    cleanup();

    // /cv-studio is the list frame and /resume/:id is the studio itself: ONE workspace at
    // two addresses, so the row hides at both.
    ['/cv-studio', '/resume/abc'].forEach((path) => {
      mountAt(path);
      expect(row('CV Studio')).toBeNull();
      cleanup();
    });
  });

  it('hides My CVs wherever the panel beside it is ALREADY a list of CVs', () => {
    // The rule above, applied to the LIST rather than the route. "My CVs" sitting
    // directly over a list of the user's CVs does not read as a destination — it reads as
    // a mislabelled version of what they are already looking at. Reported from the CV
    // Studio, where it was the most misleading.
    //
    // Three surfaces, three slightly different lists: the builder's drafts, the studio's
    // finished CVs, and Aria's Recents.
    ['/cv-builder/abc/history', '/cv-studio', '/resume/abc', '/aria-studio'].forEach((path) => {
      mountAt(path);
      expect(row('My CVs')).toBeNull();
      cleanup();
    });
  });

  it('keeps My CVs where the panel lists something else, or nothing', () => {
    // Interview prep lists APPLICATIONS and the account pages list nothing at all, so on
    // those it is a real door — and, since the dashboard went, one of the few left to the
    // CV list. Deleting the row outright would strand /cv-builder.
    ['/interview-prep/app-1', '/profile'].forEach((path) => {
      mountAt(path);
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

describe('StudioSidebarNav — the wallet at empty', () => {
  // "0 min" is a number with no next step, shown in the one place a user looks precisely
  // BECAUSE they have run out. The slot has to be the way out instead.
  const getMinutes = () => screen.queryByRole('button', { name: /get minutes/i });

  it('shows the balance while there is one', () => {
    mountAt('/aria-studio');
    expect(screen.getByText(/20 min/i)).toBeTruthy();
    expect(getMinutes()).toBeNull();
  });

  it('offers a way to get more once it hits zero', () => {
    walletState.value = { displayCredits: 0, minutesLeft: 0, freeTasteMin: 0 };
    mountAt('/aria-studio');
    expect(getMinutes()).toBeTruthy();
    expect(screen.queryByText(/0 min/i)).toBeNull();
  });

  it('still counts the free taste as minutes worth showing', () => {
    // A free user who has not used their 5-minute taste has minutes — telling them to go
    // and buy some would be selling them what they already hold.
    walletState.value = { displayCredits: 4, minutesLeft: null, freeTasteMin: 5 };
    mountAt('/aria-studio');
    expect(screen.getByText(/5 min/i)).toBeTruthy();
    expect(getMinutes()).toBeNull();
  });

  it('offers it to a free user whose taste is spent', () => {
    walletState.value = { displayCredits: 12, minutesLeft: null, freeTasteMin: 0 };
    mountAt('/aria-studio');
    expect(getMinutes()).toBeTruthy();
  });
});

// TWO PRODUCTS, TWO BALANCES.
//
// This component is mounted twice — by SessionRail in Aria Studio and by WorkspaceSidebar
// for Interview Prep — and it used to show the interview balance in both, so the Studio
// advertised minutes it has no way to spend. `surface` is what tells them apart, and these
// pin that a mount which does NOT pass it keeps the old behaviour exactly.
describe('StudioSidebarNav — which minutes this rail is about', () => {
  const mountSurface = (surface) => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({}));
    return render(
      <MemoryRouter initialEntries={['/aria-studio']}>
        <StudioSidebarNav surface={surface} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    walletState.value = {
      displayCredits: 32,
      minutesLeft: 20,
      freeTasteMin: 5,
      ariaMinutesLeft: 7,
      ariaFreeTasteMin: 2,
    };
  });

  it('shows Aria call minutes in the Studio', () => {
    mountSurface('studio');
    expect(screen.getByText(/aria call minutes/i)).toBeTruthy();
    expect(screen.getByText(/7 min/i)).toBeTruthy();
    // The interview balance must not leak in — 20 is the number that used to show here.
    expect(screen.queryByText(/20 min/i)).toBeNull();
  });

  it('keeps interview minutes in Interview Prep', () => {
    mountSurface('prep');
    expect(screen.getByText(/interview minutes/i)).toBeTruthy();
    expect(screen.getByText(/20 min/i)).toBeTruthy();
    expect(screen.queryByText(/7 min/i)).toBeNull();
  });

  it('defaults to the interview balance when no surface is given', () => {
    // Every mount that predates the split passes nothing, and none of them should change.
    mountSurface(undefined);
    expect(screen.getByText(/interview minutes/i)).toBeTruthy();
    expect(screen.getByText(/20 min/i)).toBeTruthy();
  });

  it('offers a way to buy when the Aria balance is spent, even with interview minutes left', () => {
    // The failure this prevents: a user with 20 interview minutes and no Aria minutes being
    // shown "20 min" in the Studio and then told there is nothing to spend when they call.
    walletState.value = {
      displayCredits: 3,
      minutesLeft: 20,
      freeTasteMin: 5,
      ariaMinutesLeft: 0,
      ariaFreeTasteMin: 0,
    };
    mountSurface('studio');
    expect(screen.queryByRole('button', { name: /get minutes/i })).toBeTruthy();
  });
});
