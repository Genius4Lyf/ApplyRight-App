// @vitest-environment jsdom
//
// The guard decides whether someone sees the app, a maintenance notice, or the launch
// countdown. Getting it wrong either locks out paying users or shows a "we're launching"
// page during an unplanned outage, so the whole decision table is pinned here.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

import '../i18n';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../pages/Maintenance', () => ({ default: () => <div>MAINTENANCE PAGE</div> }));
vi.mock('../pages/PreLaunch', () => ({
  default: ({ launch }) => <div>PRELAUNCH date={String(launch?.date)}</div>,
}));

import api from '../services/api';

// The guard caches one in-flight /system/status promise at MODULE level, so each case
// has to load a fresh copy or the first verdict leaks into every later test.
const mountFresh = async () => {
  vi.resetModules();
  const { default: Guard } = await import('./MaintenanceGuard');
  return render(
    <Guard>
      <div>APP CONTENT</div>
    </Guard>
  );
};

const status = (over = {}) => ({
  data: { success: true, maintenance: false, bypass: false, launch: null, ...over },
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('MaintenanceGuard — who sees what', () => {
  it('lets everyone through when maintenance is off', async () => {
    api.get.mockResolvedValue(status());
    await mountFresh();
    expect(await screen.findByText('APP CONTENT')).toBeTruthy();
  });

  it('lets a bypass holder through even with maintenance on', async () => {
    // An admin, or an account granted maintenanceAccess. The SERVER decides this from
    // the caller's own token — the guard must never re-derive it from localStorage,
    // which is what used to block a non-admin grant holder client-side while every real
    // request of theirs succeeded.
    api.get.mockResolvedValue(status({ maintenance: true, bypass: true }));
    await mountFresh();
    expect(await screen.findByText('APP CONTENT')).toBeTruthy();
  });

  it('shows the COUNTDOWN when a launch is being counted down to', async () => {
    api.get.mockResolvedValue(
      status({ maintenance: true, launch: { enabled: true, date: '2026-09-07T00:00:00.000Z' } })
    );
    await mountFresh();
    expect(await screen.findByText(/PRELAUNCH/)).toBeTruthy();
    expect(screen.queryByText('MAINTENANCE PAGE')).toBeNull();
  });

  it('shows the ORDINARY maintenance page when no launch is on', async () => {
    // Maintenance keeps its plain meaning — an unplanned outage, where a launch
    // countdown would be a lie.
    api.get.mockResolvedValue(status({ maintenance: true, launch: { enabled: false } }));
    await mountFresh();
    expect(await screen.findByText('MAINTENANCE PAGE')).toBeTruthy();
  });

  it('hands the countdown the authoritative date from the server', async () => {
    api.get.mockResolvedValue(
      status({ maintenance: true, launch: { enabled: true, date: '2026-09-07T00:00:00.000Z' } })
    );
    await mountFresh();
    expect(await screen.findByText(/date=2026-09-07/)).toBeTruthy();
  });

  it('FAILS OPEN when the status check is unreachable', async () => {
    // A status endpoint that is down must not lock the whole product out.
    api.get.mockRejectedValue(new Error('network'));
    await mountFresh();
    expect(await screen.findByText('APP CONTENT')).toBeTruthy();
  });

  it('makes ONE request no matter how many guards mount', async () => {
    // The guard is instantiated per route element, so without the shared promise every
    // navigation costs a request — and the API carries a global per-IP rate limit that a
    // whole gated audience shares behind carrier NAT.
    api.get.mockResolvedValue(status());
    vi.resetModules();
    const { default: Guard } = await import('./MaintenanceGuard');
    render(
      <>
        <Guard>
          <div>ONE</div>
        </Guard>
        <Guard>
          <div>TWO</div>
        </Guard>
        <Guard>
          <div>THREE</div>
        </Guard>
      </>
    );
    await screen.findByText('ONE');
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  });
});
