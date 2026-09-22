import { describe, it, expect, beforeEach } from 'vitest';
import { CREDIT_COSTS } from './credits';
import {
  AI_MODELS,
  hydrateModels,
  modelsByTier,
  modelById,
  costForActionTier,
  tierOf,
  tierAlwaysMeters,
} from './models';

describe('hydrateModels', () => {
  beforeEach(() => {
    // Reset the live singleton between tests.
    AI_MODELS.models = [];
    AI_MODELS.defaultModel = 'gpt-4o-mini';
    AI_MODELS.flagshipCreditCosts = {};
  });

  it('hydrates the exposed model list, default, and flagship costs', () => {
    hydrateModels({
      models: [
        { id: 'gpt-4o-mini', tier: 'light', provider: 'openai' },
        { id: 'claude-sonnet-5', tier: 'flagship', provider: 'anthropic' },
      ],
      defaultModel: 'gpt-4o-mini',
      flagshipCreditCosts: { ARIA_CHAT_MESSAGE: 3 },
    });
    expect(AI_MODELS.models).toHaveLength(2);
    expect(modelsByTier('light').map((m) => m.id)).toEqual(['gpt-4o-mini']);
    expect(modelsByTier('flagship').map((m) => m.id)).toEqual(['claude-sonnet-5']);
    expect(modelById('claude-sonnet-5').provider).toBe('anthropic');
  });

  it('tolerates a missing/partial payload (offline fallback stays)', () => {
    hydrateModels(undefined);
    hydrateModels(null);
    hydrateModels({});
    expect(AI_MODELS.models).toEqual([]);
    expect(AI_MODELS.defaultModel).toBe('gpt-4o-mini');
  });

  it('renames the backend ANALYSIS cost to the frontend FIT_ANALYSIS key', () => {
    hydrateModels({ flagshipCreditCosts: { ANALYSIS: 15, GENERATE_BULLET: 2 } });
    expect(AI_MODELS.flagshipCreditCosts.FIT_ANALYSIS).toBe(15);
    expect(AI_MODELS.flagshipCreditCosts.ANALYSIS).toBeUndefined();
    expect(costForActionTier('FIT_ANALYSIS', 'flagship')).toBe(15);
  });

  it('tierOf reads a model id back to its tier (unknown → light)', () => {
    hydrateModels({
      models: [
        { id: 'gpt-4o-mini', tier: 'light', provider: 'openai' },
        { id: 'gpt-5', tier: 'flagship', provider: 'openai' },
      ],
    });
    expect(tierOf('gpt-5')).toBe('flagship');
    expect(tierOf('gpt-4o-mini')).toBe('light');
    expect(tierOf('who-knows')).toBe('light');
  });
});

describe('costForActionTier', () => {
  beforeEach(() => {
    AI_MODELS.flagshipCreditCosts = { ARIA_CHAT_MESSAGE: 3, GENERATE_BULLET: 2 };
  });

  it('light reads the live CREDIT_COSTS map', () => {
    const light = CREDIT_COSTS.ARIA_CHAT_MESSAGE;
    expect(costForActionTier('ARIA_CHAT_MESSAGE', 'light')).toBe(light);
  });

  it('flagship reads the flagship table', () => {
    expect(costForActionTier('ARIA_CHAT_MESSAGE', 'flagship')).toBe(3);
    expect(costForActionTier('GENERATE_BULLET', 'flagship')).toBe(2);
  });

  it('flagship falls back to the light cost when it has no specific price', () => {
    // GENERATE_SUMMARY has no flagship entry in this test → inherits the light cost.
    expect(costForActionTier('GENERATE_SUMMARY', 'flagship')).toBe(CREDIT_COSTS.GENERATE_SUMMARY);
  });
});

// THE MIDDLE RUNG HAS TO BE QUOTED AT ITS OWN PRICE.
//
// tierOf and costForActionTier both used to compare against the single name 'flagship'
// and treat everything else as light. Under that rule an Advanced model shows up in the
// picker, is billed 2 credits a message by the server, and is quoted at Basic's 1 — the
// user is charged more than the menu said. These pin the shape that prevents it.
describe('the advanced tier', () => {
  beforeEach(() => {
    AI_MODELS.models = [];
    AI_MODELS.flagshipCreditCosts = {};
    AI_MODELS.advancedCreditCosts = {};
  });

  it('hydrates its own price table alongside the flagship one', () => {
    hydrateModels({
      models: [{ id: 'gpt-5-mini', tier: 'advanced', provider: 'openai' }],
      advancedCreditCosts: { ARIA_CHAT_MESSAGE: 2, ANALYSIS: 12 },
      flagshipCreditCosts: { ARIA_CHAT_MESSAGE: 10 },
    });

    expect(modelsByTier('advanced').map((m) => m.id)).toEqual(['gpt-5-mini']);
    expect(tierOf('gpt-5-mini')).toBe('advanced');
    expect(costForActionTier('ARIA_CHAT_MESSAGE', 'advanced')).toBe(2);
    // The same backend→frontend key rename the flagship map gets.
    expect(costForActionTier('FIT_ANALYSIS', 'advanced')).toBe(12);
  });

  it('is priced strictly between the two it sits between', () => {
    hydrateModels({
      advancedCreditCosts: { ARIA_CHAT_MESSAGE: 2 },
      flagshipCreditCosts: { ARIA_CHAT_MESSAGE: 10 },
    });
    // CREDIT_COSTS is itself hydrated from the server and is empty in this harness, so
    // the light end is asserted by IDENTITY (advanced does not read the light map) rather
    // than by a number that does not exist here.
    expect(costForActionTier('ARIA_CHAT_MESSAGE', 'advanced')).toBe(2);
    expect(costForActionTier('ARIA_CHAT_MESSAGE', 'advanced')).not.toBe(
      costForActionTier('ARIA_CHAT_MESSAGE', 'light')
    );
    expect(costForActionTier('ARIA_CHAT_MESSAGE', 'advanced')).toBeLessThan(
      costForActionTier('ARIA_CHAT_MESSAGE', 'flagship')
    );
  });

  it('inherits the light price for an action with no advanced entry', () => {
    hydrateModels({ advancedCreditCosts: { ARIA_CHAT_MESSAGE: 2 } });
    expect(costForActionTier('GENERATE_SUMMARY', 'advanced')).toBe(CREDIT_COSTS.GENERATE_SUMMARY);
  });

  // An older backend sends no advanced map. Quoting the light price under-states the bill
  // rather than over-stating it, which is the safe direction for a number in a menu.
  it('falls back to light prices rather than breaking when the server is older', () => {
    hydrateModels({ models: [{ id: 'gpt-5-mini', tier: 'advanced', provider: 'openai' }] });
    expect(costForActionTier('ARIA_CHAT_MESSAGE', 'advanced')).toBe(CREDIT_COSTS.ARIA_CHAT_MESSAGE);
  });

  it('knows which tiers charge on every message', () => {
    expect(tierAlwaysMeters('light')).toBe(false);
    expect(tierAlwaysMeters('advanced')).toBe(true);
    expect(tierAlwaysMeters('flagship')).toBe(true);
  });
});
