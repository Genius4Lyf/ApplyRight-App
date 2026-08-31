import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';

// What this job asks for, and how much of it the CV can defend so far.
//
// The counterpart to the top-bar tracker: the pill says how far along you are, this says
// what "along" is made of. It exists because building a CV against a JD was drawing with
// your eyes shut — Aria knew the requirements, the user never saw them.
//
// THE TARGET IS THE MUST-HAVES. Not a share of everything, and emphatically not an "ATS
// pass rate" — nobody can back a number like that, and this product does not assert things
// it cannot defend. Aria already sorts what she reads into must-have and nice-to-have, so
// the goal is simply "cover the must-haves"; anything past that is bonus.
//
// Coverage arrives from useJobCoverage (free, no AI, no charge). Provenance is joined here
// from the interview ledger already on the draft: where a requirement was proved by the
// user's own words we name the entry it happened in. Where it merely matched CV text we say
// it is covered and nothing more — inventing a source would be the exact failure this
// feature is supposed to prevent.
const JobTargetPanel = ({ coverage, keywords = [], onClose }) => {
  const { t } = useTranslation();
  const { cvData, requestStudioCommand } = useAriaStudio();

  const brief = cvData?.targetJob?.brief;

  // The compact mustHaves/niceToHaves arrays carry no ids — those live on the typed
  // `requirements` list. Join by name so a row can address its requirement (the hunt needs
  // the id) without changing the stored shape.
  const requirementByName = useMemo(() => {
    const map = new Map();
    (brief?.requirements || []).forEach((r) => {
      if (r?.name) map.set(String(r.name).toLowerCase(), r);
    });
    return map;
  }, [brief]);

  // requirementId → the entry its evidence was filed under. Only interview-verified
  // evidence lands in the ledger, so anything here was said by the user in their own words.
  const provenById = useMemo(() => {
    const ledger = cvData?.coachEvidence || {};
    const titleOf = (sortId) => {
      const row = [...(cvData?.experience || []), ...(cvData?.projects || [])].find(
        (e) => String(e?._sortId) === String(sortId)
      );
      if (!row) return '';
      return [row.title, row.company].filter(Boolean).join(' · ');
    };
    const map = new Map();
    Object.entries(ledger).forEach(([sortId, bucket]) => {
      const label = titleOf(sortId);
      if (!label) return;
      (bucket?.evidence || []).forEach((item) => {
        (item?.requirementIds || []).forEach((id) => {
          if (id && !map.has(id)) map.set(id, label);
        });
      });
    });
    return map;
  }, [cvData?.coachEvidence, cvData?.experience, cvData?.projects]);

  // Coverage results keyed by name, so each requirement row can read its own verdict.
  const coveredByName = useMemo(() => {
    const map = new Map();
    (coverage?.results || []).forEach((r) => {
      if (r?.name) map.set(String(r.name).toLowerCase(), !!r.covered);
    });
    return map;
  }, [coverage]);

  const rows = keywords.map((k) => {
    const key = String(k.name).toLowerCase();
    const requirement = requirementByName.get(key);
    return {
      name: k.name,
      importance: k.importance,
      covered: coveredByName.get(key) === true,
      requirementId: requirement?.id || null,
      provenAt: requirement?.id ? provenById.get(requirement.id) || '' : '',
    };
  });

  const mustHaves = rows.filter((r) => r.importance === 'must_have');
  const niceToHaves = rows.filter((r) => r.importance !== 'must_have');

  const done = coverage?.mustHaveCovered ?? 0;
  const total = coverage?.mustHaveTotal ?? mustHaves.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const askAria = (row) => {
    if (!row.requirementId) return;
    requestStudioCommand?.('proveSkill', 'skills', null, {
      requirementId: row.requirementId,
      name: row.name,
    });
  };

  const Row = ({ row, dim }) => (
    <li className="flex items-start gap-2 py-1.5">
      <span
        aria-hidden="true"
        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
          row.covered
            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
            : 'border border-slate-300 dark:border-slate-700'
        }`}
      >
        {row.covered && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[12px] ${
            row.covered
              ? 'text-slate-800 dark:text-slate-100'
              : dim
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {row.name}
        </span>
        {/* Named ONLY when the interview ledger has it. A text match says covered and
            stops there rather than guessing where it came from. */}
        {row.covered && row.provenAt && (
          <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate">
            {t('ariaStudio.jobTarget.provedAt', { where: row.provenAt })}
          </span>
        )}
        {!row.covered && row.requirementId && (
          <button
            type="button"
            onClick={() => askAria(row)}
            className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {t('ariaStudio.jobTarget.askAria')}
          </button>
        )}
      </span>
    </li>
  );

  return (
    <div className="h-full flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="shrink-0 flex items-start gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('ariaStudio.jobTarget.eyebrow')}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {[brief?.role || cvData?.targetJob?.title, brief?.company]
              .filter(Boolean)
              .join(' · ') || t('ariaStudio.jobTarget.thisJob')}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('ariaStudio.studioArtifactPanel.closePanel')}
            className="shrink-0 -mr-1 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none p-4 space-y-5">
        {/* The target. Ink, never a red grade: 0 of 4 at the start of a build is a to-do
            list, and colouring it like a failing score would be a lie about the user. */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {done}
            </span>
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.jobTarget.ofTarget', { total })}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 dark:bg-white transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            {t('ariaStudio.jobTarget.blurb')}
          </p>
        </div>

        {mustHaves.length > 0 && (
          <section>
            <h4 className="font-mono text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('ariaStudio.jobTarget.mustHave')}
            </h4>
            <ul className="mt-1">
              {mustHaves.map((row) => (
                <Row key={row.name} row={row} />
              ))}
            </ul>
          </section>
        )}

        {niceToHaves.length > 0 && (
          <section>
            <h4 className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('ariaStudio.jobTarget.niceToHave')}
            </h4>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.jobTarget.bonus')}
            </p>
            <ul className="mt-1">
              {niceToHaves.map((row) => (
                <Row key={row.name} row={row} dim />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default JobTargetPanel;
