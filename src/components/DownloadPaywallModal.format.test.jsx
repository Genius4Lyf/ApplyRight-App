// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

// THE HANDOFF, AT THE POINT THE USER LEAVES THE SITE.
//
// This modal is the last thing that runs before the browser navigates to Flutterwave, so
// it is the only place that still knows whether the user clicked "Download PDF" or
// "Download Word". It stashed the template id and not the format, and the ?paid=1 return
// was hard-coded to the PDF — so a ₦1,000 pass bought for a Word file was spent on a PDF,
// and the Word file then cost another ₦1,000.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
  Trans: ({ children }) => <>{children}</>,
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));
vi.mock('../services/billing.service', () => ({
  default: { checkout: vi.fn().mockResolvedValue({ link: 'https://checkout.example/x' }) },
}));
vi.mock('../hooks/useBillingRegion', () => ({
  default: () => ({
    currency: 'NGN',
    showToggle: false,
    resolved: true,
    overrideToNigeria: vi.fn(),
  }),
}));

import DownloadPaywallModal from './DownloadPaywallModal';
import { readCheckoutFormat } from '../lib/cvDownload';

// The component assigns window.location.href to leave the page; jsdom refuses navigation.
let hrefSpy;
beforeEach(() => {
  localStorage.clear();
  hrefSpy = '';
  delete window.location;
  window.location = {
    pathname: '/resume/d1',
    get href() {
      return hrefSpy;
    },
    set href(v) {
      hrefSpy = v;
    },
  };
});
afterEach(() => cleanup());

const buy = async (format) => {
  render(<DownloadPaywallModal open onClose={() => {}} templateId="ats-clean" format={format} />);
  fireEvent.click(screen.getByText('billing.downloadPaywall.payCta'));
  await waitFor(() => expect(hrefSpy).toContain('checkout.example'));
};

describe('what the paywall carries across checkout', () => {
  it('stashes Word when Word is what was clicked', async () => {
    await buy('docx');
    expect(readCheckoutFormat()).toBe('docx');
  });

  it('stashes PDF for a PDF click', async () => {
    await buy('pdf');
    expect(readCheckoutFormat()).toBe('pdf');
  });

  it('defaults to PDF when no format is passed at all', async () => {
    // An older caller, or a surface that only offers one format, must not accidentally
    // promise a Word file.
    render(<DownloadPaywallModal open onClose={() => {}} templateId="ats-clean" />);
    fireEvent.click(screen.getByText('billing.downloadPaywall.payCta'));
    await waitFor(() => expect(hrefSpy).toContain('checkout.example'));
    expect(readCheckoutFormat()).toBe('pdf');
  });

  it('still carries the template id it always did', async () => {
    // The format was added beside it; the regression to watch for is the format edit
    // displacing the thing that already worked.
    await buy('docx');
    expect(localStorage.getItem('arCheckoutTemplateId')).toBe('ats-clean');
    expect(localStorage.getItem('arCheckoutIntent')).toBe('download');
    expect(localStorage.getItem('arPostCheckout')).toBe('/resume/d1');
  });
});
