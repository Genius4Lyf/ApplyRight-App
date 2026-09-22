// Aria model selection — a live mutable singleton hydrated from /auth/config (`aiModels`).
// Mirrors lib/credits.js: consumers import it once and read fields at render time; the
// hydrate step mutates it in place. The picker + cost tags read from here.
import { CREDIT_COSTS } from './credits';

// The tiers, cheapest first. Light is the only one a paid plan includes; everything above
// it meters on every call. Ordering the picker off this list rather than off a hardcoded
// [light, flagship] pair is what keeps a new rung from landing at the bottom of the menu.
export const TIER_ORDER = ['light', 'advanced', 'flagship'];

export const AI_MODELS = {
  models: [], // [{ id, tier: 'light'|'advanced'|'flagship', provider }] — EXPOSED only
  defaultModel: 'gpt-4o-mini',
  // action → credit cost, per metered tier. Light costs live in CREDIT_COSTS.
  flagshipCreditCosts: {},
  advancedCreditCosts: {},
};

// Model config arrives asynchronously from /auth/config. Consumers used to read this
// mutable singleton without subscribing, so a screen rendered before hydration could
// keep an empty model list until some unrelated state happened to re-render it.
let modelConfigVersion = 0;
const modelConfigListeners = new Set();
export const subscribeModelConfig = (listener) => {
  modelConfigListeners.add(listener);
  return () => modelConfigListeners.delete(listener);
};
export const getModelConfigVersion = () => modelConfigVersion;
const publishModelConfig = () => {
  modelConfigVersion += 1;
  modelConfigListeners.forEach((listener) => listener());
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
  const remap = (map) => {
    const out = {};
    Object.entries(map).forEach(([k, v]) => {
      out[BACKEND_TO_FRONTEND_KEY[k] || k] = v;
    });
    return out;
  };
  if (payload.flagshipCreditCosts && typeof payload.flagshipCreditCosts === 'object') {
    AI_MODELS.flagshipCreditCosts = remap(payload.flagshipCreditCosts);
  }
  // An older backend sends no advanced map; the tier then prices at the light cost, which
  // under-quotes rather than over-quotes. Deliberate direction: a user is never shown a
  // bill higher than the one they get.
  if (payload.advancedCreditCosts && typeof payload.advancedCreditCosts === 'object') {
    AI_MODELS.advancedCreditCosts = remap(payload.advancedCreditCosts);
  }
  publishModelConfig();
}

// The model tier for a resolved/selected model id — used to price action cost tags at the
// selected model's tier. Validated against TIER_ORDER rather than compared to one name:
// the old `tier === 'flagship' ? 'flagship' : 'light'` collapsed every other value to
// light, so a new rung would have been quoted at the free price everywhere it appeared.
// Unknown id or tier → 'light', which under-quotes rather than over-quotes.
export function tierOf(modelId) {
  const m = modelById(modelId);
  return m && TIER_ORDER.includes(m.tier) ? m.tier : 'light';
}

// Does this tier charge on every message, plan or no plan? Mirrors `alwaysMeters` in the
// backend catalog — the two must agree, or the UI quotes a price the server does not
// charge (or promises "free" for something that bills).
export const tierAlwaysMeters = (tier) => tier === 'advanced' || tier === 'flagship';

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

// Engine names for flagship rows that list more than one Pro model side by side — the
// PROVIDER, never the raw model id, so swapping which model backs a slot (e.g. gpt-5 →
// a future GPT release) never breaks the label.
export const PROVIDER_NAME = {
  openai: 'ChatGPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  moonshot: 'Kimi',
};

// User-facing tier names: light = "Basic" (included on paid), flagship = "Pro" (metered).
//
// It was "Standard", which read as "the normal one" — so the metered Pro tiles looked
// like an upsell on top of the norm rather than a different engine, and the word told a
// user nothing about what they were picking.
export const TIER_LABEL = { light: 'Basic', flagship: 'Pro' };

export const modelLabel = (id) => MODEL_LABELS[id] || id;
export const modelsByTier = (tier) => AI_MODELS.models.filter((m) => m.tier === tier);
export const modelById = (id) => AI_MODELS.models.find((m) => m.id === id) || null;

// The credit cost of an action at a model TIER. Light reads the live CREDIT_COSTS (the
// same map the rest of the UI uses); the metered tiers read their own table from
// /auth/config, falling back to the light cost for any action without a tier-specific
// price — which mirrors the server's sparse-delta resolver exactly.
const TIER_COST_MAPS = {
  advanced: () => AI_MODELS.advancedCreditCosts,
  flagship: () => AI_MODELS.flagshipCreditCosts,
};

export function costForActionTier(action, tier) {
  const light = CREDIT_COSTS[action];
  const source = TIER_COST_MAPS[tier];
  if (!source) return light;
  const price = source()[action];
  return typeof price === 'number' ? price : light;
}
