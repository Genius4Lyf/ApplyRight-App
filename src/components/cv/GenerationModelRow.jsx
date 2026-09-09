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
import { useAccountWallet } from '../../hooks/useAccountWallet';

// localStorage throws outright in some locked-down browsers, and a picker that fails to
// render is far worse than one with no balance on it.
const readToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

// A per-MODEL picker for ONE generation action (bullets/summary/skills) — deliberately
// separate from ModelPicker, which chooses the CHAT model. One tile per exposed model
// (not one per tier): two flagship models can both be exposed (gpt-5, claude-sonnet-5),
// and collapsing them into a single "Pro" tile hides the choice of engine entirely.
// Light rows are named by TIER ("Standard" — there's normally one, and the tier IS the
// story); flagship rows are named by PROVIDER, with a separate "Pro" chip beside the
// name — never fused into one label, since the engine can change under a slot.
//
// THE BALANCE SITS ON THE HEADING LINE. Every tile below carries a price, and until now
// none of these cards said what the user actually had to spend. On a phone there is no
// wallet anywhere else on screen at that moment either: in the Studio the sidebar that
// holds it is a closed drawer below 820px, and in the CV Builder the Ask-Aria sheet
// covers the header chip. So the one question a price makes you ask — can I afford
// this? — could not be answered without leaving the card.
//
// Deliberately NOT an affordability verdict on the tiles. The price shown is PER ITEM
// and this component is never told how many are being asked for — five bullets cost five
// times the tag beside them — so greying out a tile would be a guess dressed as a fact.
// It states the number it genuinely has and lets the arithmetic beside it do the rest.
//
// One number, app-wide: `displayCredits` is what the sidebar wallet renders, which on a
// paid plan is allowance + wallet rather than the raw `user.credits` mirrored into
// localStorage. Reading the same field is what stops two balances disagreeing on one
// screen.
const GenerationModelRow = ({ action, value, onSelect, chatTier, unit = 'each' }) => {
  const { t } = useTranslation();
  useSyncExternalStore(subscribeModelConfig, getModelConfigVersion, getModelConfigVersion);
  const { displayCredits } = useAccountWallet(Boolean(readToken()));
  const actionKey = ACTION_KEY[action];
  const headingKey = action === 'project' ? 'experience' : action;

  // Rendered only once it is a real number. A dash or a zero standing in for an unloaded
  // balance is read as the balance, and the wallet resolves in well under a second.
  const heading = (
    <div className="flex items-baseline justify-between gap-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {t(`cvBuilder.genModel.heading.${headingKey}`)}
      </p>
      {typeof displayCredits === 'number' && (
        <p className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
          {t('cvBuilder.genModel.balance', { n: displayCredits })}
        </p>
      )}
    </div>
  );

  const models = [...modelsByTier('light'), ...modelsByTier('flagship')];

  if (models.length < 2) {
    const active = models[0] || {
      id: value || AI_MODELS.defaultModel,
      tier: 'light',
      provider: 'openai',
    };
    return (
      <div>
        {heading}
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
      {heading}
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
