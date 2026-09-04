// @vitest-environment jsdom
//
// The template promo store.
//
// It exists as a store rather than another plain mutable singleton for one reason: the
// value arrives on GET /auth/config AFTER the template grid has mounted. CREDIT_COSTS and
// friends are read at render time and notify nobody, so a component that asked before the
// fetch landed keeps the stale answer — which already cost a real bug (the countdown that
// never rendered on /pre-launch). Here the stale answer is a padlock on a template that
// is supposed to be free, so the subscription is the feature.
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

import {
  hydratePromos,
  templatesAreFree,
  promoEndsAt,
  useTemplatePromo,
  __resetPromos,
} from './promos';

const future = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const past = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

const Probe = () => {
  const { active } = useTemplatePromo();
  return <span>{active ? 'FREE' : 'LOCKED'}</span>;
};

beforeEach(() => __resetPromos());
afterEach(() => cleanup());

describe('templatesAreFree', () => {
  it('is off before anything has hydrated', () => {
    // The safe direction: an app that never reached /auth/config leaves the padlocks on
    // rather than giving the paid templates away.
    expect(templatesAreFree()).toBe(false);
  });

  it('is on while the end is in the future', () => {
    hydratePromos({ freeUntil: future() });
    expect(templatesAreFree()).toBe(true);
  });

  it('EXPIRES on the local clock, with no refetch', () => {
    // A session left open across the promo's end has no reason to call /auth/config
    // again. Comparing the date each time is what makes it stop.
    hydratePromos({ freeUntil: future() });
    expect(templatesAreFree()).toBe(true);
    expect(templatesAreFree(Date.now() + 2 * 60 * 60 * 1000)).toBe(false);
  });

  it('is off for a past date, a missing one, and an unreadable one', () => {
    hydratePromos({ freeUntil: past() });
    expect(templatesAreFree()).toBe(false);

    __resetPromos();
    hydratePromos({});
    expect(templatesAreFree()).toBe(false);

    __resetPromos();
    hydratePromos({ freeUntil: 'not a date' });
    expect(templatesAreFree()).toBe(false);
  });

  it('ignores a malformed config response rather than throwing', () => {
    hydratePromos(undefined);
    hydratePromos(null);
    expect(templatesAreFree()).toBe(false);
    expect(promoEndsAt()).toBeNull();
  });
});

describe('useTemplatePromo — the reason this is a store', () => {
  it('re-renders a mounted reader when hydration lands', () => {
    // The exact sequence in the app: the grid mounts first, the config arrives second.
    render(<Probe />);
    expect(screen.getByText('LOCKED')).toBeTruthy();

    act(() => hydratePromos({ freeUntil: future() }));

    // With a plain singleton this would still read LOCKED until something unrelated
    // happened to re-render the grid.
    expect(screen.getByText('FREE')).toBeTruthy();
  });

  it('re-renders again when the promo is turned off', () => {
    hydratePromos({ freeUntil: future() });
    render(<Probe />);
    expect(screen.getByText('FREE')).toBeTruthy();

    act(() => hydratePromos({ freeUntil: null }));
    expect(screen.getByText('LOCKED')).toBeTruthy();
  });

  it('does not notify when the value has not actually changed', () => {
    // Hydration runs on every config fetch; re-emitting an unchanged value would wake
    // every subscriber for nothing.
    const end = future();
    hydratePromos({ freeUntil: end });
    let renders = 0;
    const Counting = () => {
      useTemplatePromo();
      // Counted in an effect, not during render: mutating an outer variable while
      // rendering is the very side effect React (and the lint rule) forbids.
      React.useEffect(() => {
        renders += 1;
      });
      return null;
    };
    render(<Counting />);
    const before = renders;
    act(() => hydratePromos({ freeUntil: end }));
    expect(renders).toBe(before);
  });
});
