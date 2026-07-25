import React, { useState } from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CVService from '../../services/cv.service';

const LANGS = [
  { code: 'en', label: 'EN', name: 'English', enName: 'English' },
  { code: 'fr', label: 'FR', name: 'Français', enName: 'French' },
];

/**
 * Per-CV DOCUMENT language.
 *
 * Deliberately distinct from the navbar's app-language toggle: this sets the
 * language the CV is WRITTEN in (bullets, summary, section labels), while the
 * navbar sets the language Aria speaks to you in. A user can be coached in
 * English while building a French CV — hence the explicit "CV language" wording
 * and the note underneath.
 *
 * Persists a partial { _id, outputLang } save, so it takes effect immediately
 * rather than waiting for a step transition. Editorial styling: ink active
 * state, no indigo fill.
 *
 * @param {string} draftId
 * @param {'en'|'fr'|null} value      current DraftCV.outputLang (null = never set)
 * @param {(lang: string) => void} onChange  lift the new value into local CV state
 * @param {boolean} [compact]         chip-sized variant for a preview header
 */
export default function CvLanguageToggle({
  draftId,
  value,
  onChange,
  compact = false,
  className = '',
}) {
  const { t } = useTranslation();
  // A CV that predates this feature has no stored language; it reads as English,
  // which is what it was actually written in.
  const current = value === 'fr' ? 'fr' : 'en';
  const [saving, setSaving] = useState(false);

  const choose = async (next) => {
    if (next === current || saving) return;
    onChange?.(next);
    if (!draftId || draftId === 'new') return; // unsaved draft — the first save carries it
    setSaving(true);
    try {
      await CVService.saveDraft({ _id: draftId, outputLang: next });
      // A successful change was silent before — the only visible effect is the
      // section headings, so say exactly that, and set the expectation that the
      // toggle steers labels + future AI writing, not the text already written.
      const name = LANGS.find((l) => l.code === next)?.enName || next;
      toast.success(t('cvBuilder.cvLanguageToggle.langSetToast', { name }));
    } catch (err) {
      console.error('Failed to save CV language:', err);
      onChange?.(current); // roll the UI back to what is actually stored
      toast.error(t('cvBuilder.cvLanguageToggle.langChangeError'));
    } finally {
      setSaving(false);
    }
  };

  const buttons = (
    <div
      role="group"
      aria-label={t('cvBuilder.cvLanguageToggle.title')}
      className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5"
    >
      {LANGS.map((l) => {
        const active = current === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => choose(l.code)}
            disabled={saving}
            aria-pressed={active}
            title={t('cvBuilder.cvLanguageToggle.writeInTitle', { name: l.name })}
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${
              active
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );

  // Compact: a bare chip for a preview header, where space is tight.
  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 ${className}`}
        title={t('cvBuilder.cvLanguageToggle.compactTitle')}
      >
        <Languages className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          CV
        </span>
        {buttons}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Languages className="w-4 h-4 mt-0.5 text-slate-400 dark:text-slate-500 shrink-0" />
        <div>
          <p className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
            {t('cvBuilder.cvLanguageToggle.title')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('cvBuilder.cvLanguageToggle.description')}
          </p>
        </div>
      </div>
      {buttons}
    </div>
  );
}
