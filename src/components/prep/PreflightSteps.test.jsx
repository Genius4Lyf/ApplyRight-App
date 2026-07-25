// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PreflightSteps from './PreflightSteps';
// PreflightSteps' chrome (Cancel/Back/Continue/step aria) now flows through
// react-i18next. Importing the app i18n instance initializes the global
// react-i18next singleton the component's useTranslation() falls back to, so
// t() resolves to English (fallbackLng) instead of returning raw key paths.
import i18n from '../../i18n';

// The suite runs without vitest `globals`, so testing-library's auto-cleanup
// never registers — unmount by hand or the DOM accumulates across tests.
afterEach(cleanup);
// Other i18n suites change the global language; pin it back to English here so
// this file is order-independent.
beforeEach(() => i18n.changeLanguage('en'));

// matchMedia isn't implemented in jsdom — stub it as the store the breakpoint
// hook subscribes to. `wide` decides which presentation mounts.
const stubMatchMedia = (wide) => {
  window.matchMedia = (q) => ({
    matches: wide,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
};

const STEPS = [
  { key: 'brief', label: 'What this is', hint: 'Step 1 of 3', node: <p>brief body</p> },
  { key: 'who', label: 'Your interviewer', hint: 'Step 2 of 3', node: <p>panel body</p> },
  { key: 'start', label: 'Start', hint: 'Ready when you are', node: <p>start body</p> },
];

const setup = (props = {}) =>
  render(
    <PreflightSteps
      steps={STEPS}
      onFinish={props.onFinish || (() => {})}
      onCancel={props.onCancel || (() => {})}
      finishLabel="Start interview"
      {...props}
    />
  );

describe('PreflightSteps (rail)', () => {
  beforeEach(() => stubMatchMedia(true));

  it('a first-timer starts on step 1, a returning user on step 3', () => {
    const { unmount } = setup({ initialStep: 0 });
    expect(screen.getByText('brief body')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    unmount();

    setup({ initialStep: 2 });
    expect(screen.getByText('start body')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start interview' })).toBeTruthy();
  });

  it('exposes exactly one primary action, and it finishes on the last step', () => {
    const onFinish = vi.fn();
    setup({ initialStep: 2, onFinish });
    expect(screen.getAllByRole('button', { name: 'Start interview' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Start interview' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('jumps between steps from the rail without moving the footer', () => {
    setup({ initialStep: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Step 2: Your interviewer' }));
    expect(screen.getByText('panel body')).toBeTruthy();
    // Footer is chrome: it exists on every step, with step-dependent labels.
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Step 3: Start' }));
    expect(screen.getByRole('button', { name: 'Start interview' })).toBeTruthy();
  });

  it('Back on step 1 is Cancel — it leaves the flow rather than dead-ending', () => {
    const onCancel = vi.fn();
    setup({ initialStep: 0, onCancel });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('PreflightSteps (deck)', () => {
  beforeEach(() => stubMatchMedia(false));

  it('renders the deck with clickable dots and the same footer', () => {
    setup({ initialStep: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Go to step 3' }));
    expect(screen.getByRole('button', { name: 'Start interview' })).toBeTruthy();
    // No rival next/prev arrows in sequence mode.
    expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
  });
});
