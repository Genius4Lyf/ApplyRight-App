// @vitest-environment jsdom
//
// A CALL THAT DIES HAS TO END.
//
// The adapter owns the difference between "something went wrong" and "the call is over", and
// it got that wrong in a way that only showed up on a real phone: a transport error was
// forwarded to the caller and nothing else happened. `finish` never ran, so the reservation
// was never settled from the client, the UI was never told the call had stopped, and the whole
// spoken transcript was left with nowhere to go.
//
// What that cost, on one observed call: 379 seconds of paid conversation, an orb still
// animating over a dead connection, and no bullets.
//
// These tests pin the rule — a fatal transport error ends the call, a recoverable one does not.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const realtime = vi.hoisted(() => ({ opts: null, session: null }));

vi.mock('./realtime', () => ({
  createRealtimeSession: vi.fn((opts) => {
    realtime.opts = opts;
    realtime.session = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
    return realtime.session;
  }),
}));

vi.mock('../services/api', () => ({ default: { post: vi.fn() } }));

import api from '../services/api';
import { createAriaCall, END_REASONS } from './ariaLive';

let onEnded;
let onError;

const start = async () => {
  onEnded = vi.fn();
  onError = vi.fn();
  const call = createAriaCall({
    draftId: 'd1',
    section: 'experience',
    onTurn: vi.fn(),
    onState: vi.fn(),
    onEnded,
    onError,
  });
  await call.start();
  return call;
};

const SESSION = {
  data: {
    clientSecret: 'ek_1',
    model: 'gpt-realtime-2.1-mini',
    reservationId: 'r1',
    reservedSec: 600,
  },
};

beforeEach(() => {
  realtime.opts = null;
  realtime.session = null;
  // RE-SET THE IMPLEMENTATION, not just the call log. `vi.clearAllMocks()` forgets the calls
  // but keeps whatever `mockReturnValue` a test last installed — and one test here installs a
  // promise that never settles, deliberately. Without this line that promise leaks into every
  // later test and they all hang on `start()`.
  api.post.mockResolvedValue(SESSION);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('a fatal transport error ends the call', () => {
  it.each(['CONNECTION_LOST', 'HANDSHAKE_FAILED', 'MIC_DENIED'])('%s', async (code) => {
    const call = await start();

    realtime.opts.onError({ code });

    expect(onEnded).toHaveBeenCalledWith(expect.objectContaining({ reason: END_REASONS.DROPPED }));
    expect(call.isClosed()).toBe(true);
  });

  it('settles the reservation on the real duration instead of leaving it to the server sweep', async () => {
    await start();
    api.post.mockClear();

    realtime.opts.onError({ code: 'CONNECTION_LOST' });
    await vi.waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/aria-live/end',
        expect.objectContaining({
          reservationId: 'r1',
        })
      )
    );
  });

  it('ends the call WITHOUT waiting for the settle request to come back', async () => {
    // The network is the thing that just failed, so awaiting it here is the worst possible
    // moment to block: the request hangs until it times out, and the orb stays up over a dead
    // call for the whole of it. Settling is an optimisation — the server has its own timer.
    await start();
    api.post.mockReturnValue(new Promise(() => {})); // never settles, like a dead connection

    realtime.opts.onError({ code: 'CONNECTION_LOST' });

    await vi.waitFor(() => expect(onEnded).toHaveBeenCalled());
  });

  it('still tells the caller what went wrong', async () => {
    await start();

    realtime.opts.onError({ code: 'CONNECTION_LOST' });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'CONNECTION_LOST' }));
  });

  it('ends once, however many errors arrive', async () => {
    await start();

    realtime.opts.onError({ code: 'CONNECTION_LOST' });
    realtime.opts.onError({ code: 'CONNECTION_LOST' });

    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe('a recoverable error does NOT end the call', () => {
  it('leaves a REALTIME_EVENT alone — the server sends those mid-session', async () => {
    const call = await start();

    realtime.opts.onError({ code: 'REALTIME_EVENT', message: 'rate limited' });

    expect(onEnded).not.toHaveBeenCalled();
    expect(call.isClosed()).toBe(false);
    // Forwarded, so it can be logged.
    expect(onError).toHaveBeenCalled();
  });

  it('ignores an error with no code at all rather than hanging up on a guess', async () => {
    const call = await start();

    realtime.opts.onError(new Error('boom'));

    expect(onEnded).not.toHaveBeenCalled();
    expect(call.isClosed()).toBe(false);
  });
});
