import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Detect a coarse role family from the user's target job title (or any
 * provided string). Used to pick a relevant example bullet without making
 * the user choose from a dropdown. Falls back to a generic role family.
 *
 * Keywords are checked in priority order — the first hit wins.
 */
export const detectRoleFamily = (targetTitle = '', fallbackTitle = '') => {
  const text = `${targetTitle} ${fallbackTitle}`.toLowerCase();
  if (!text.trim()) return 'generic';

  const matchers = [
    {
      family: 'engineering',
      re: /(software|engineer|developer|backend|frontend|fullstack|devops|sre|architect|programmer|coder)/,
    },
    {
      family: 'data',
      re: /(data scientist|data analyst|machine learning|ml engineer|analytics|data engineer|bi analyst)/,
    },
    { family: 'product', re: /(product manager|product owner|pm\b|product lead)/ },
    { family: 'design', re: /(designer|ux|ui|design lead|art director|creative)/ },
    { family: 'marketing', re: /(marketing|growth|seo|content|social media|brand)/ },
    { family: 'sales', re: /(sales|account executive|business development|bd\b|account manager)/ },
    { family: 'operations', re: /(operations|ops|logistics|supply chain|project manager)/ },
    { family: 'finance', re: /(finance|accountant|financial analyst|treasury|controller)/ },
    { family: 'hr', re: /(human resources|recruit|hr\b|talent|people operations)/ },
    {
      family: 'customer',
      re: /(customer success|customer support|account manager|client services)/,
    },
  ];

  for (const m of matchers) {
    if (m.re.test(text)) return m.family;
  }
  return 'generic';
};

/**
 * Shape of the example bank — how many example strings exist per role family and
 * "kind" (work bullet vs project description vs summary). The strings themselves
 * live in the locale files under `cvBuilder.examples.<kind>.<family>.<index>` (this
 * is real coaching content, not chrome, so it needs a genuine translation per
 * locale — this module only tracks how many entries to look up).
 *
 * Goal: show users what "good" looks like with concrete numbers, action verbs,
 * and visible impact — without giving them text to copy verbatim.
 */
const EXAMPLE_COUNTS = {
  bullet: {
    engineering: 3,
    data: 3,
    product: 3,
    design: 3,
    marketing: 3,
    sales: 3,
    operations: 3,
    finance: 3,
    hr: 3,
    customer: 3,
    generic: 3,
  },
  project: {
    engineering: 2,
    data: 2,
    generic: 1,
  },
  summary: {
    engineering: 1,
    product: 1,
    generic: 1,
  },
};

/**
 * InlineExample
 *
 * A small "Show example" reveal panel that displays a relevant sample
 * for the user's target role. Click to expand, click again to hide.
 *
 * Props:
 *   kind     - "bullet" | "project" | "summary"
 *   role     - role family string (or pass `targetTitle` to auto-detect)
 *   targetTitle - if provided, role is auto-detected via detectRoleFamily
 *   label    - optional override for the toggle text
 */
const InlineExample = ({ kind = 'bullet', role, targetTitle, label }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const family = role || detectRoleFamily(targetTitle || '');
  const bank = EXAMPLE_COUNTS[kind] || {};
  const resolvedFamily = bank[family] ? family : 'generic';
  const count = bank[resolvedFamily] || 0;
  const candidates = Array.from({ length: count }, (_, i) =>
    t(`cvBuilder.examples.${kind}.${resolvedFamily}.${i}`)
  );

  if (candidates.length === 0) return null;

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors"
      >
        {label ||
          (open
            ? t('cvBuilder.inlineExample.hideExample')
            : t('cvBuilder.inlineExample.showExample'))}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          <ChevronDown className="w-3 h-3" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="example"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              {candidates.slice(0, 2).map((ex, i) => (
                <p
                  key={i}
                  className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed border-l-2 border-slate-300 dark:border-slate-600 pl-2"
                >
                  "{ex}"
                </p>
              ))}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700 mt-2">
                {t('cvBuilder.inlineExample.disclaimer')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InlineExample;
