import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Scissors, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaLoader from '../ui/AriaLoader';

const KEEP_BULLETS = 3;
const roleKey = (role, index) => role?._sortId || `role-${index}`;
const bulletKey = (role, roleIndex, bulletIndex) => `${roleKey(role, roleIndex)}::${bulletIndex}`;
const bulletLines = (description = '') =>
  description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const dateRank = (role, index) => {
  if (role?.isCurrent) return Number.POSITIVE_INFINITY;
  for (const value of [role?.endDate, role?.startDate]) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
    const year = String(value).match(/\b(19|20)\d{2}\b/);
    if (year) return Date.UTC(Number(year[0]), 0, 1);
  }
  // Missing dates retain the builder's newest-to-oldest convention.
  return Number.MAX_SAFE_INTEGER - index;
};

const trimCandidates = (roles) =>
  roles
    .map((role, roleIndex) => ({
      role,
      roleIndex,
      bullets: bulletLines(role?.description),
      rank: dateRank(role, roleIndex),
    }))
    .filter(({ bullets }) => bullets.length > KEEP_BULLETS)
    .sort((a, b) => a.rank - b.rank);

const initialSelection = (roles) => {
  const oldest = trimCandidates(roles)[0];
  if (!oldest) return new Set();
  return new Set(
    oldest.bullets
      .map((_, bulletIndex) => bulletKey(oldest.role, oldest.roleIndex, bulletIndex))
      .slice(KEEP_BULLETS)
  );
};

const RoleTrim = ({ open, roles = [], loading, saving, onApply, onClose }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(() => initialSelection(roles));
  const candidates = useMemo(() => trimCandidates(roles), [roles]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, saving]);

  if (!open) return null;

  const toggleBullet = (key) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('cvBuilder.roleTrim.title')}
        className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label={t('common.close')}
          className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('cvBuilder.roleTrim.eyebrow')}
        </p>
        <h3 className="mt-1 font-heading text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('cvBuilder.roleTrim.title')}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {t('cvBuilder.roleTrim.subtitle', { count: KEEP_BULLETS })}
        </p>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="flex min-h-28 items-center justify-center">
              <AriaLoader inline tone="mono" size={22} label={t('cvBuilder.roleTrim.loading')} />
            </div>
          ) : candidates.length ? (
            candidates.map(({ role, roleIndex, bullets }) => (
              <section
                key={roleKey(role, roleIndex)}
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {role.title || t('cvBuilder.roleTrim.untitledRole')}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {role.company || t('cvBuilder.roleTrim.unknownCompany')} ·{' '}
                  {role.startDate || t('cvBuilder.roleTrim.unknownDate')} –{' '}
                  {role.isCurrent
                    ? t('cvBuilder.roleTrim.present')
                    : role.endDate || t('cvBuilder.roleTrim.unknownDate')}
                </p>

                <div className="mt-3 space-y-2">
                  {bullets.map((bullet, bulletIndex) => {
                    const key = bulletKey(role, roleIndex, bulletIndex);
                    const checked = selected.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => toggleBullet(key)}
                        className={`flex w-full items-start gap-3 rounded-md border p-2.5 text-left transition-colors ${
                          checked
                            ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800/70'
                            : 'border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {bullet.replace(/^[•\-–—*\s]+/, '')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {t('cvBuilder.roleTrim.nothingToTrim', { count: KEEP_BULLETS })}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onApply([...selected])}
            disabled={loading || saving || selected.size === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {saving ? (
              <>
                <AriaLoader inline tone="mono" size={16} label="" />
                {t('cvBuilder.roleTrim.removing')}
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4" />
                {t('cvBuilder.roleTrim.remove', { count: selected.size })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RoleTrim;
