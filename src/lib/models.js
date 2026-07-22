// Aria model selection — a live mutable singleton hydrated from /auth/config (`aiModels`).
// Mirrors lib/credits.js: consumers import it once and read fields at render time; the
// hydrate step mutates it in place. The picker + cost tags read from here.
import { CREDIT_COSTS } from './credits';

export const AI_MODELS = {
  models: [], // [{ id, tier: 'light'|'flagship', provider }] — EXPOSED models only
  defaultModel: 'gpt-4o-mini',
  flagshipCreditCosts: {}, // action → flagship credit cost (light costs live in CREDIT_COSTS)
};

// The backend sends flagship costs keyed by its canonical action names; the frontend
// mirror renames one (ANALYSIS → FIT_ANALYSIS), exactly as hydrateCreditCosts does. Apply
// the same rename here so costForActionTier reads flagship costs with the frontend keys.
const BACKEND_TO_FRONTEND_KEY = { ANALYSIS: 'FIT_ANALYSIS' };

// Merge the server payload (res.data.aiModels) into the singleton. Tolerant of a missing
// or partial payload — an offline/older backend just leaves the defaults.
export function hydrateModels(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (Array.isArray(payload.models)) AI_MODELS.models = payload.models;
  if (typeof payload.defaultModel === 'string') AI_MODELS.defaultModel = payload.defaultModel;
  if (payload.flagshipCreditCosts && typeof payload.flagshipCreditCosts === 'object') {
    const remapped = {};
    Object.entries(payload.flagshipCreditCosts).forEach(([k, v]) => {
      remapped[BACKEND_TO_FRONTEND_KEY[k] || k] = v;
    });
    AI_MODELS.flagshipCreditCosts = remapped;
  }
}

// The model tier ('light'|'flagship') for a resolved/selected model id — used to price
// action cost tags at the selected model's tier. Unknown id → 'light' (the safe default).
export function tierOf(modelId) {
  const m = modelById(modelId);
  return m && m.tier === 'flagship' ? 'flagship' : 'light';
}

// Human labels + a single-glyph provider mark for the picker (no external icon deps).
export const MODEL_LABELS = {
  'deepseek-v4-flash': 'DeepSeek V4 Flash',
  'gpt-4o-mini': 'GPT-4o mini',
  'gpt-5-mini': 'GPT-5 mini',
  'kimi-k2.5': 'Kimi K2.5',
  'gpt-5': 'GPT-5.6',
  'gemini-3.5-flash': 'Gemini 3.5 Flash',
  'claude-sonnet-5': 'Claude Sonnet 5',
  'gpt-4o': 'GPT-4o',
};
export const PROVIDER_GLYPH = {
  openai: '◇',
  anthropic: '◈',
  gemini: '✦',
  deepseek: '❄',
  moonshot: '☾',
};

// User-facing tier names: light = "Standard" (included on paid), flagship = "Pro" (metered).
export const TIER_LABEL = { light: 'Standard', flagship: 'Pro' };

export const modelLabel = (id) => MODEL_LABELS[id] || id;
export const modelsByTier = (tier) => AI_MODELS.models.filter((m) => m.tier === tier);
export const modelById = (id) => AI_MODELS.models.find((m) => m.id === id) || null;

// The credit cost of an action at a model TIER. Light reads the live CREDIT_COSTS (the
// same map the rest of the UI uses); flagship reads the flagship table from /auth/config,
// falling back to the light cost for any action without a flagship-specific price.
export function costForActionTier(action, tier) {
  const light = CREDIT_COSTS[action];
  if (tier !== 'flagship') return light;
  const flag = AI_MODELS.flagshipCreditCosts[action];
  return typeof flag === 'number' ? flag : light;
}
