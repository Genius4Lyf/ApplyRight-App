import { describe, it, expect, beforeEach } from 'vitest';
import { CREDIT_COSTS } from './credits';
import {
  AI_MODELS,
  hydrateModels,
  modelsByTier,
  modelById,
  costForActionTier,
  tierOf,
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
