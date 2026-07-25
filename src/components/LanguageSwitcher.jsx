import { useTranslation } from 'react-i18next';
import UserService from '../services/user.service';
import { applyLang, getLang, setStoredUserLang, SUPPORTED_LANGS } from '../lib/lang';

const LABELS = { en: 'EN', fr: 'FR' };

/**
 * App language toggle (EN / FR) — the language the INTERFACE is in, and the one
 * Aria speaks. (A CV's own written language is separate: see CvLanguageToggle.)
 *
 * Writes go through applyLang(), the single path that updates both
 * localStorage.lang — which api.js sends as X-App-Language, so AI responses
 * switch on the very next call — and i18next, which re-renders the UI. No reload
 * needed for either. When signed in we also persist { interfaceLang } so the
 * choice follows the user across devices.
 *
 * Editorial style — ink, not indigo: active = solid slate-900 (white in dark).
 */
export default function LanguageSwitcher({ className = '' }) {
  // Subscribing to i18n makes this re-render on any language change, including
  // ones triggered elsewhere (login hydration), so the toggle can't go stale.
  const { i18n, t } = useTranslation();
  const current = SUPPORTED_LANGS.includes(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : getLang();

  const choose = (next) => {
    if (next === current) return;
    // Optimistic FIRST: stamp the choice onto the stored user blob before the
    // network call, so it survives an offline device, a failed request, or an
    // immediate reload. Otherwise the stale blob value (precedence rule 1) would
    // overrule this choice on the next syncLangFromStoredUser. No-op when signed
    // out. Then flip the UI + header, then best-effort persist to the server.
    setStoredUserLang(next);
    applyLang(next);
    if (localStorage.getItem('token')) {
      UserService.updateLanguage(next).catch(() => {});
    }
  };

  return (
    <div
      role="group"
      aria-label={t('common.language.label')}
      className={`inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 ${className}`}
    >
      {SUPPORTED_LANGS.map((code) => {
        const active = current === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => choose(code)}
            aria-pressed={active}
            title={t(`common.language.${code}`)}
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
              active
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {LABELS[code] || code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
