import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// Certifications are a sub-list of Education, not a section of their own — that's how the
// CV builder treats them, and how they render on the page. So they get a compact
// repeatable capture rather than the pinned card: there's no interview here, no AI, and
// nothing to coach. Three short fields, add, repeat.
//
// FREE. Nothing on this card calls the AI or spends a credit.
const CertificationsCard = ({ certifications = [], onAdd, onRemove, onDone, busy }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [date, setDate] = useState('');

  const canAdd = name.trim().length > 1;

  const add = () => {
    if (!canAdd) return;
    onAdd?.({ name: name.trim(), issuer: issuer.trim(), date: date.trim() });
    setName('');
    setIssuer('');
    setDate('');
  };

  return (
    <AriaCard cardKey="certs" wide>
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[17px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.certifications.heading')}
          </p>
          <span className="shrink-0 rounded-md bg-emerald-50 dark:bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {t('ariaStudio.certifications.noCharge')}
          </span>
        </div>
        <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
          {t('ariaStudio.certifications.body')}
        </p>

        {certifications.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {certifications.map((c, i) => (
              <li
                key={`${c.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-[16px] text-slate-800 dark:text-slate-100">
                  {c.name}
                  {c.issuer ? ` · ${c.issuer}` : ''}
                  {c.date ? ` · ${c.date}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove?.(i)}
                  aria-label={t('ariaStudio.certifications.removeAria', { name: c.name })}
                  className="shrink-0 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="min-w-0">
            <label
              htmlFor="studio-cert-name"
              className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              {t('ariaStudio.certifications.fieldCertification')}
            </label>
            <input
              id="studio-cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={t('ariaStudio.certifications.placeholderCertification')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
            />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="studio-cert-issuer"
              className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              {t('ariaStudio.certifications.fieldIssuer')}
            </label>
            <input
              id="studio-cert-issuer"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={t('ariaStudio.certifications.placeholderIssuer')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
            />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="studio-cert-date"
              className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
            >
              {t('ariaStudio.certifications.fieldYear')}
            </label>
            <input
              id="studio-cert-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={t('ariaStudio.certifications.placeholderYear')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={add}
            disabled={!canAdd || busy}
            className="text-[14px] font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            + {t('ariaStudio.certifications.add')}
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="btn-primary px-5 py-2 text-[16px] disabled:opacity-50"
          >
            {certifications.length
              ? t('ariaStudio.certifications.done')
              : t('ariaStudio.certifications.haveNone')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default CertificationsCard;
