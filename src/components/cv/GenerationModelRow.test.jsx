// @vitest-environment jsdom
//
// THE PRICE AND THE BALANCE HAVE TO ARRIVE TOGETHER.
//
// Every tile in this row carries a cost, and until now none of these cards said what the
// user had to spend. That mattered most exactly where it was least visible: on a phone
// the Studio's wallet lives in a closed drawer and the CV Builder's header chip is under
// the Ask-Aria sheet, so at the moment of choosing there was no balance anywhere on
// screen.
//
// These tests hold the three properties that fix depends on — that the number shows, that
// it is the SAME number the sidebar shows, and that nothing stands in for it before it
// has loaded.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

const wallet = vi.fn();
vi.mock('../../hooks/useAccountWallet', () => ({
  useAccountWallet: (...args) => wallet(...args),
}));

// The model catalogue is hydrated from /auth/config at runtime; pin two tiers so the row
// renders its real picker rather than the loading fallback.
vi.mock('../../lib/models', () => ({
  AI_MODELS: { defaultModel: 'gpt-4o-mini', models: [], flagshipCreditCosts: {} },
  modelsByTier: (tier) =>
    tier === 'light'
      ? [{ id: 'gpt-4o-mini', tier: 'light', provider: 'openai' }]
      : [{ id: 'claude-sonnet-5', tier: 'flagship', provider: 'anthropic' }],
  costForActionTier: (_action, tier) => (tier === 'flagship' ? 4 : 1),
  PROVIDER_NAME: { anthropic: 'Claude', openai: 'OpenAI' },
  modelLabel: (id) => id,
  subscribeModelConfig: () => () => {},
  getModelConfigVersion: () => 1,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Interpolation is what is being asserted, so it has to actually happen.
    t: (key, vars) =>
      vars && typeof vars.n === 'number' ? `${key}:${vars.n}` : (vars?.defaultValue ?? key),
  }),
}));

import GenerationModelRow from './GenerationModelRow';

const mount = () =>
  render(<GenerationModelRow action="experience" value="gpt-4o-mini" onSelect={vi.fn()} />);

beforeEach(() => {
  localStorage.setItem('token', 't');
  wallet.mockReturnValue({ displayCredits: 42 });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe('GenerationModelRow — the balance', () => {
  it('shows what the user has, beside the prices', () => {
    mount();
    expect(screen.getByText('cvBuilder.genModel.balance:42')).toBeTruthy();
  });

  it('reads displayCredits, not the raw wallet credits', () => {
    // These differ on a paid plan: displayCredits is allowance + wallet, and it is what
    // the sidebar renders. Reading anything else would put two disagreeing balances on
    // one screen.
    wallet.mockReturnValue({ credits: 7, displayCredits: 130 });
    mount();
    expect(screen.getByText('cvBuilder.genModel.balance:130')).toBeTruthy();
    expect(screen.queryByText('cvBuilder.genModel.balance:7')).toBeNull();
  });

  it('shows nothing at all until the balance has loaded', () => {
    // A dash or a 0 standing in for an unloaded balance is read AS the balance — and "0
    // credits" next to a price is the one message that stops someone using the feature.
    wallet.mockReturnValue({ displayCredits: null });
    mount();
    expect(screen.queryByText(/genModel\.balance/)).toBeNull();
  });

  it('renders a real zero, which is not the same thing as not knowing', () => {
    wallet.mockReturnValue({ displayCredits: 0 });
    mount();
    expect(screen.getByText('cvBuilder.genModel.balance:0')).toBeTruthy();
  });

  it('still renders the picker when there is no session to ask about', () => {
    // Signed out, or localStorage unavailable: the hook is told not to fetch, and the row
    // has to keep working without a balance rather than fail to render.
    localStorage.clear();
    wallet.mockReturnValue({ displayCredits: null });
    mount();
    expect(wallet).toHaveBeenCalledWith(false);
    expect(screen.getByText('cvBuilder.modelPicker.tierLight')).toBeTruthy();
  });
});
