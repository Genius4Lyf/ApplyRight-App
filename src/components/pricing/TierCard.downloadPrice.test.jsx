// @vitest-environment jsdom
//
// The free plan's feature list names the per-download price, and that price is
// REGION-SPLIT: ₦500 in Nigeria, $1.50 everywhere else, decided server-side at
// checkout. The string used to hardcode "₦1,000", so a dollar visitor was quoted a
// naira price on a page that has a currency toggle right above it.
//
// What these hold is that the line follows the toggle. A regression here is invisible
// in review (the card still renders, the sentence still reads) and quotes the wrong
// price to a whole region.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

import '../../i18n';
import TierCard from './TierCard';
import { FREE_TIER, DOWNLOAD_PASS } from '../../lib/plans';

const mount = (currency) =>
  render(<TierCard tier={FREE_TIER} currency={currency} onCta={vi.fn()} />);

afterEach(() => cleanup());

describe('TierCard — the per-download price follows the currency', () => {
  it('quotes naira to a naira viewer', () => {
    mount('NGN');
    expect(screen.getByText(/first cv download free, then ₦500 each/i)).toBeTruthy();
  });

  it('quotes dollars to a dollar viewer — and no naira anywhere on the card', () => {
    const { container } = mount('USD');
    expect(screen.getByText(/first cv download free, then \$1\.5 each/i)).toBeTruthy();
    // The real bug was a naira figure surviving the toggle, so assert its absence on
    // the whole card rather than just the one line.
    expect(container.textContent).not.toMatch(/₦/);
  });

  it('reads the price from the catalog mirror, not a literal in the copy', () => {
    // If someone re-inlines the number into en.json this still passes on the default
    // price but breaks the moment the catalog moves — which is the point: the string
    // must stay a {{price}} slot so a price change is a one-line edit in plans.js.
    expect(DOWNLOAD_PASS.priceNgn).toBe(500);
    mount('NGN');
    expect(screen.getByText(new RegExp(`then ₦${DOWNLOAD_PASS.priceNgn} each`, 'i'))).toBeTruthy();
  });

  it('falls back to naira while the region is still resolving', () => {
    // useBillingRegion returns null for a beat. The price row renders a placeholder in
    // that window, but the feature list does not — so it takes naira, which is what
    // this line did unconditionally before. A wrong guess here corrects itself on the
    // next render; a crash would not.
    mount(null);
    expect(screen.getByText(/then ₦500 each/i)).toBeTruthy();
  });
});
