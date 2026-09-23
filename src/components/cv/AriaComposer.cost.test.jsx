// @vitest-environment jsdom
//
// THE COST NOTICE HAS TO BE TRUE OF THE MODEL THAT IS SELECTED.
//
// It asked `tierOf(model) === 'flagship'` and treated everything else as free. That held
// while there were two tiers. The moment a third, metered one existed, someone who had
// switched to Advanced was told "this back-and-forth is free · you only pay for the
// draft" while being charged 2 credits a message. Reported from use, within a day of the
// tier shipping.
//
// A wrong price is not a cosmetic bug — it is the app telling someone something untrue
// about their money. These pin all three rungs, and the reduction to "does this tier
// meter?" that replaced the two-way branch.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import { AI_MODELS, hydrateModels } from '../../lib/models';
import AriaComposer from './AriaComposer';

vi.mock('../ModelPicker', () => ({ default: () => null }));
vi.mock('../../lib/speech', () => ({
  isSpeechRecognitionSupported: () => false,
  startDictation: vi.fn(),
}));

// The notice is driven by the same window event the picker fires on a selection.
const selectModel = (modelId) =>
  act(() => {
    window.dispatchEvent(new CustomEvent('aria:model-selected', { detail: { modelId } }));
  });

const mount = () =>
  render(<AriaComposer value="" onChange={vi.fn()} onSend={vi.fn()} showModelNotice />);

beforeEach(async () => {
  await i18n.changeLanguage('en');
  AI_MODELS.models = [];
  AI_MODELS.advancedCreditCosts = {};
  AI_MODELS.flagshipCreditCosts = {};
  hydrateModels({
    models: [
      { id: 'gpt-4o-mini', tier: 'light', provider: 'openai' },
      { id: 'gpt-5-mini', tier: 'advanced', provider: 'openai' },
      { id: 'claude-sonnet-5', tier: 'flagship', provider: 'anthropic' },
    ],
    advancedCreditCosts: { ARIA_CHAT_MESSAGE: 2 },
    flagshipCreditCosts: { ARIA_CHAT_MESSAGE: 10 },
  });
});

afterEach(cleanup);

const freeText = () => i18n.t('ariaStudio.sectionCoach.freeBackAndForth');

describe('the per-message cost notice', () => {
  it('says free on the one tier that actually is', () => {
    mount();
    selectModel('gpt-4o-mini');
    expect(screen.getByRole('status').textContent).toBe(freeText());
  });

  // THE REPORTED BUG. Advanced meters every message; it fell into the "free" branch.
  it('never says free on the middle tier', () => {
    mount();
    selectModel('gpt-5-mini');

    const shown = screen.getByRole('status').textContent;
    expect(shown).not.toBe(freeText());
    expect(shown).not.toMatch(/free ·/i);
  });

  it('quotes the middle tier its OWN price, not the top one', () => {
    mount();
    selectModel('gpt-5-mini');

    const shown = screen.getByRole('status').textContent;
    expect(shown).toContain('2 credits/message');
    expect(shown).not.toContain('10 credits/message');
    // And names which model it is talking about, or "2 credits/message" is unattributed.
    expect(shown).toContain(i18n.t('cvBuilder.modelPicker.tierAdvanced'));
  });

  it('still quotes the top tier correctly', () => {
    mount();
    selectModel('claude-sonnet-5');

    const shown = screen.getByRole('status').textContent;
    expect(shown).toContain('10 credits/message');
    expect(shown).toContain(i18n.t('cvBuilder.modelPicker.tierFlagship'));
  });

  // Every metered tier keeps the way back in view: the notice is a warning, and a warning
  // with no exit is just a toll.
  it('points every metered tier back at the free one', () => {
    mount();
    selectModel('gpt-5-mini');
    expect(screen.getByRole('status').textContent).toContain(
      i18n.t('cvBuilder.modelPicker.tierLight')
    );
  });
});
