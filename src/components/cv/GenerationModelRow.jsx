import React, { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AI_MODELS,
  modelsByTier,
  costForActionTier,
  PROVIDER_NAME,
  modelLabel,
  subscribeModelConfig,
  getModelConfigVersion,
} from '../../lib/models';
import { ACTION_KEY } from '../../lib/generationActions';

// A per-MODEL picker for ONE generation action (bullets/summary/skills) — deliberately
// separate from ModelPicker, which chooses the CHAT model. One tile per exposed model
// (not one per tier): two flagship models can both be exposed (gpt-5, claude-sonnet-5),
// and collapsing them into a single "Pro" tile hides the choice of engine entirely.
// Light rows are named by TIER ("Standard" — there's normally one, and the tier IS the
// story); flagship rows are named by PROVIDER, with a separate "Pro" chip beside the
// name — never fused into one label, since the engine can change under a slot.
const GenerationModelRow = ({ action, value, onSelect, chatTier, unit = 'each' }) => {
  const { t } = useTranslation();
  useSyncExternalStore(subscribeModelConfig, getModelConfigVersion, getModelConfigVersion);
  const actionKey = ACTION_KEY[action];
  const headingKey = action === 'project' ? 'experience' : action;

  const models = [...modelsByTier('light'), ...modelsByTier('flagship')];

  if (models.length < 2) {
    const active = models[0] || {
      id: value || AI_MODELS.defaultModel,
      tier: 'light',
      provider: 'openai',
    };
    return (
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t(`cvBuilder.genModel.heading.${headingKey}`)}
        </p>
        <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">
              {active.tier === 'flagship'
                ? PROVIDER_NAME[active.provider] || modelLabel(active.id)
                : t('cvBuilder.modelPicker.tierLight')}
            </span>
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              {t('cvBuilder.genModel.loadingOptions')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {modelLabel(active.id)}
          </p>
        </div>
      </div>
    );
  }

  const lightCost = costForActionTier(actionKey, 'light');
  const flagshipCost = costForActionTier(actionKey, 'flagship');
  const sameCost = lightCost === flagshipCost;

  const costLabel = (tier) => {
    if (tier === 'flagship' && sameCost) return t('cvBuilder.genModel.sameCost');
    const n = tier === 'flagship' ? flagshipCost : lightCost;
    return t(unit === 'each' ? 'cvBuilder.genModel.eachCost' : 'cvBuilder.genModel.flatCost', {
      n,
    });
  };

  const modelName = (model) =>
    model.tier === 'flagship'
      ? PROVIDER_NAME[model.provider] || modelLabel(model.id)
      : t('cvBuilder.modelPicker.tierLight');

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {t(`cvBuilder.genModel.heading.${headingKey}`)}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {models.map((model) => {
          const selected = value === model.id;
          const proBlurb = t(`cvBuilder.modelPicker.proBlurb.${model.id}`, { defaultValue: '' });
          return (
            <button
              key={model.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect?.(model.id)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                selected
                  ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white bg-slate-50 dark:bg-slate-800'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">
                    {modelName(model)}
                  </span>
                  {model.tier === 'flagship' && (
                    <span className="font-mono text-[9px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {t('cvBuilder.modelPicker.tierFlagship')}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  {costLabel(model.tier)}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {t(`cvBuilder.genModel.blurb.${action}.${model.tier}`)}
              </p>
              {model.tier === 'flagship' && proBlurb && (
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400 dark:text-slate-500 italic">
                  {proBlurb}
                </p>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-slate-400 dark:text-slate-500">
        {t('cvBuilder.genModel.chatNote', {
          tier: t(
            chatTier === 'flagship'
              ? 'cvBuilder.modelPicker.tierFlagship'
              : 'cvBuilder.modelPicker.tierLight'
          ),
        })}
      </p>
    </div>
  );
};

export default GenerationModelRow;
