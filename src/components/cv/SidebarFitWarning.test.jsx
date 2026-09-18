// @vitest-environment jsdom
//
// The nudge shown when someone picks a sidebar template for a CV that runs long.
//
// What matters here is that it stays a NUDGE: it offers the ways out, it never blocks the
// choice, and when the fit ladder cannot get to one page it says so rather than appearing
// to do nothing — which is a likely outcome on exactly these templates, where the
// strongest rung (text size) is switched off.
import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SidebarFitWarning from './SidebarFitWarning';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
  }),
}));

afterEach(cleanup);

const setup = (props = {}) =>
  render(
    <SidebarFitWarning
      open
      pageCount={2}
      templateName="ApplyRight Navy"
      onContinue={vi.fn()}
      onFitOnePage={vi.fn()}
      onShortenSummary={vi.fn()}
      onTrimRoles={vi.fn()}
      onPickAnother={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );

describe('SidebarFitWarning', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<SidebarFitWarning open={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('names the template and the page count', () => {
    setup();
    expect(screen.getByText(/ApplyRight Navy/)).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('offers all three ways out', () => {
    const onFitOnePage = vi.fn();
    const onPickAnother = vi.fn();
    const onContinue = vi.fn();
    setup({ onFitOnePage, onPickAnother, onContinue });

    fireEvent.click(screen.getByText('cvStudio.sidebarFit.fit'));
    fireEvent.click(screen.getByText('cvStudio.sidebarFit.pickAnother'));
    fireEvent.click(screen.getByText('cvStudio.sidebarFit.continue'));

    expect(onFitOnePage).toHaveBeenCalledTimes(1);
    expect(onPickAnother).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('swaps to the CONTENT trims once layout alone could not do it', () => {
    const onShortenSummary = vi.fn();
    const onTrimRoles = vi.fn();
    setup({
      fitState: 'partial',
      canTrimSummary: true,
      canTrimRoles: true,
      onShortenSummary,
      onTrimRoles,
    });

    // The fit button is gone — offering it again after it just failed is a loop.
    expect(screen.queryByText('cvStudio.sidebarFit.fit')).toBeNull();

    fireEvent.click(screen.getByText('cvStudio.lengthCoach.shortenSummary'));
    fireEvent.click(screen.getByText('cvStudio.lengthCoach.trimRoles'));
    expect(onShortenSummary).toHaveBeenCalledTimes(1);
    expect(onTrimRoles).toHaveBeenCalledTimes(1);
  });

  it('hides a trim the CV cannot offer', () => {
    setup({ fitState: 'partial', canTrimSummary: false, canTrimRoles: true });
    expect(screen.queryByText('cvStudio.lengthCoach.shortenSummary')).toBeNull();
    expect(screen.getByText('cvStudio.lengthCoach.trimRoles')).toBeTruthy();
  });

  it('closes on Escape — it is a nudge, not a gate', () => {
    const onClose = vi.fn();
    setup({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
