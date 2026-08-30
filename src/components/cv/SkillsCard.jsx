import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UNCATEGORIZED } from '../../lib/skillCategories';

const lower = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const legacyGroups = (suggestions, bestForRole) => {
  const best = new Set((bestForRole || []).map(lower));
  const rows = [];
  (suggestions || []).forEach((group) => {
    const details = new Map((group.skillsDetailed || []).map((item) => [lower(item.name), item]));
    (group.skills || []).forEach((name) => {
      const detail = details.get(lower(name)) || {};
      rows.push({
        name,
        category: group.category || UNCATEGORIZED,
        evidence: detail.evidence || [],
        talkingPoint: detail.talkingPoint || '',
        reason: detail.evidence?.[0]?.snippet || '',
        explicitlyConfirmed: false,
      });
    });
  });
  return best.size
    ? {
        mode: 'job',
        important: rows.filter((row) => best.has(lower(row.name))),
        additional: rows.filter((row) => !best.has(lower(row.name))),
        confirmation: [],
        gaps: [],
      }
    : {
        mode: 'profile',
        core: rows.slice(0, 6),
        additional: rows.slice(6),
        confirmation: [],
        gaps: [],
      };
};

const SkillsCard = ({
  suggestions = [],
  bestForRole = [],
  reviewGroups,
  existingSkills = [],
  initialSelected = [],
  onAdd,
  // (requirementId, name) => void — starts the cross-history hunt for one employer
  // requirement the CV hasn't demonstrated. Omitted on surfaces with no chat to host it,
  // where the gap chips stay read-only as before.
  onProveSkill,
  // { [requirementId]: 'confirmed' | 'declined' | 'deferred' } — hunts already answered
  // in this session. These review groups are a snapshot from the last generation and do
  // not know about them, so the card has to.
  huntedRequirements = {},
  // (declines) => void — the user has said they have never done these. Recorded so the
  // next generation stops asking: the confirmation list can now run to twenty, and
  // re-asking a question already answered "no" is the fastest way to make it feel dumb.
  onDecline,
}) => {
  const { t } = useTranslation();
  const groups = useMemo(
    () => reviewGroups || legacyGroups(suggestions, bestForRole),
    [reviewGroups, suggestions, bestForRole]
  );
  const existingSet = useMemo(() => new Set(existingSkills.map(lower)), [existingSkills]);
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const [openDetail, setOpenDetail] = useState(null);
  const [confirmations, setConfirmations] = useState({});

  // Never ask about something already on the CV. The server filters these too, but these
  // groups can be a cached snapshot from before the user added a skill, and being asked
  // "did you do this?" about your own CV is the kind of thing that costs trust.
  const openQuestions = (groups.confirmation || []).filter(
    (row) => !existingSet.has(lower(row.name))
  );
  const confirmedCandidates = openQuestions
    .filter((row) => ['direct', 'basic'].includes(confirmations[row.name]))
    .map((row) => ({
      ...row,
      explicitlyConfirmed: true,
      confirmationStatus: confirmations[row.name],
      evidenceStatus: confirmations[row.name] === 'direct' ? 'confirmed' : 'basic_exposure',
    }));
  const primary = groups.mode === 'job' ? groups.important || [] : groups.core || [];
  const addableSections = [
    [
      groups.mode === 'job'
        ? t('cvBuilder.skillsCard.provenImportantJob')
        : t('cvBuilder.skillsCard.coreSkills'),
      primary,
      'primary',
    ],
    [
      t('cvBuilder.skillsCard.provenAdditional'),
      [...(groups.additional || []), ...confirmedCandidates],
      'additional',
    ],
  ].filter(([, rows]) => rows.length);
  const addableRows = addableSections.flatMap(([, rows]) => rows);
  const selectedCount = addableRows.filter(
    (row) => selected.has(row.name) && !existingSet.has(lower(row.name))
  ).length;

  const toggle = (row) => {
    if (existingSet.has(lower(row.name))) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(row.name)) next.delete(row.name);
      else next.add(row.name);
      return next;
    });
  };

  const confirm = (row, status) => {
    setConfirmations((current) => ({ ...current, [row.name]: status }));
    // "Only encountered it" and "no" are both answers, and both should stick. Sent
    // fire-and-forget: a failure to remember must never block skills landing on the CV.
    if (['encountered', 'no'].includes(status)) {
      onDecline?.([{ name: row.name, level: status === 'encountered' ? 'encountered' : 'never' }]);
    }
    setSelected((current) => {
      const next = new Set(current);
      if (['direct', 'basic'].includes(status)) next.add(row.name);
      else next.delete(row.name);
      return next;
    });
  };

  const handleAdd = () => {
    const picked = addableRows
      .filter((row) => selected.has(row.name) && !existingSet.has(lower(row.name)))
      .map((row) => ({
        name: row.name,
        category: row.category || UNCATEGORIZED,
        isAutoGenerated: true,
        evidence: row.evidence || [],
        talkingPoint: row.talkingPoint || '',
        explicitlyConfirmed: !!row.explicitlyConfirmed,
        confirmationStatus: row.confirmationStatus || '',
      }));
    onAdd?.(picked);
  };

  const SkillRow = ({ row }) => {
    const added = existingSet.has(lower(row.name));
    const active = selected.has(row.name);
    const detailOpen = openDetail === row.name;
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-2.5 p-3">
          <button
            type="button"
            onClick={() => toggle(row)}
            disabled={added}
            aria-pressed={active || added}
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              active || added
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {(active || added) && <Check className="h-2.5 w-2.5" />}
          </button>
          <button
            type="button"
            onClick={() => toggle(row)}
            disabled={added}
            className="min-w-0 flex-1 text-left disabled:cursor-default"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                {row.name}
              </span>
              {row.explicitlyConfirmed && (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[8px] uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {t('cvBuilder.skillsCard.confirmedByYou')}
                </span>
              )}
              {added && (
                <span className="font-mono text-[8px] uppercase text-slate-400">
                  {t('cvBuilder.skillsCard.onCv')}
                </span>
              )}
            </div>
            {row.reason && (
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {row.reason}
              </p>
            )}
          </button>
          {!!row.evidence?.length && (
            <button
              type="button"
              onClick={() => setOpenDetail(detailOpen ? null : row.name)}
              className="rounded p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white"
              aria-label={t('cvBuilder.skillsCard.whyFits')}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${detailOpen ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
        {detailOpen && (
          <div className="border-t border-slate-100 px-3 py-2.5 text-[11px] dark:border-slate-800">
            {(row.evidence || []).map((item, index) => (
              <p
                key={`${item.type}-${item.refIndex}-${index}`}
                className="text-slate-500 dark:text-slate-400"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {item.sourceLabel || item.type}:
                </span>{' '}
                {item.snippet}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 border-l-2 border-l-slate-900 bg-white dark:border-slate-800 dark:border-l-white dark:bg-slate-900/60">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate-900 dark:text-white">
            {t('cvBuilder.skillsCard.eyebrow')}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
          {groups.mode === 'job'
            ? t('cvBuilder.skillsCard.subtitleJob')
            : t('cvBuilder.skillsCard.subtitleProfile')}
        </p>
      </div>

      <div className="max-h-[58vh] space-y-5 overflow-y-auto bg-slate-50/60 p-3.5 scrollbar-none dark:bg-slate-950/20">
        {addableSections.map(([title, rows, kind]) => (
          <section key={kind}>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {title}
            </h4>
            <div className="space-y-2">
              {rows.map((row) => (
                <SkillRow key={row.name} row={row} />
              ))}
            </div>
          </section>
        ))}

        {!!openQuestions.length && (
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {groups.mode === 'job'
                ? t('cvBuilder.skillsCard.confirmFirst')
                : t('cvBuilder.skillsCard.needsConfirmation')}
            </h4>
            <p className="mb-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t('cvBuilder.skillsCard.confirmIntro')}
            </p>
            <div className="space-y-2">
              {openQuestions.map((row) => {
                const answer = confirmations[row.name];
                return (
                  <div
                    key={row.name}
                    className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20"
                  >
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                      {row.name}
                    </p>
                    {row.typicalForLabel && (
                      <p className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">
                        {t('cvBuilder.skillsCard.typicalFor', { role: row.typicalForLabel })}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {row.reason}
                    </p>
                    <p className="mt-1.5 text-[11.5px] font-medium text-slate-700 dark:text-slate-200">
                      {/* The server leaves the wording to us for role-typical rows, so the
                          question can be asked in the user's own language. */}
                      {row.question ||
                        (row.typicalForLabel
                          ? t('cvBuilder.skillsCard.typicalQuestion', { role: row.typicalForLabel })
                          : t('cvBuilder.skillsCard.confirmQuestion', { skill: row.name }))}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {['direct', 'basic', 'encountered', 'no'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => confirm(row, status)}
                          className={`rounded-lg border px-2 py-1 text-[10.5px] font-semibold ${
                            answer === status
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                              : 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          {t(`cvBuilder.skillsCard.confirmation.${status}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!!groups.gaps?.length && (
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              {t('cvBuilder.skillsCard.notDemonstrated')}
            </h4>
            <p className="mb-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {onProveSkill
                ? t('cvBuilder.skillsCard.gapsIntroHunt')
                : t('cvBuilder.skillsCard.gapsIntro')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {groups.gaps.map((row) => (
                <span
                  key={row.name}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-500 dark:border-rose-900 dark:bg-slate-900 dark:text-slate-400"
                >
                  {row.name}
                  {/* The dead end, opened up. A gap chip used to say "this cannot be added
                      from this screen" and stop there — at the exact moment the user is
                      most motivated. Now it starts the cross-history hunt: Aria asks
                      whether they've done it ANYWHERE, and only their own answer decides
                      whether it can go on the CV.

                      Once that hunt has SETTLED the chip stops offering it. These groups
                      are a snapshot from the last generation, so without this a chip the
                      user just answered still reads "look elsewhere" — and on a decline
                      that means re-asking a question they answered with a clear no. A
                      DEFERRED hunt proved nothing, so it keeps the offer. */}
                  {huntedRequirements[row.requirementId] === 'confirmed' ||
                  huntedRequirements[row.requirementId] === 'declined' ? (
                    <span className="italic text-slate-400 dark:text-slate-500">
                      {t(`cvBuilder.skillsCard.hunted.${huntedRequirements[row.requirementId]}`)}
                    </span>
                  ) : (
                    onProveSkill &&
                    row.requirementId && (
                      <button
                        type="button"
                        onClick={() => onProveSkill(row.requirementId, row.name)}
                        className="font-semibold text-slate-700 underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                      >
                        {t('cvBuilder.skillsCard.lookElsewhere')}
                      </button>
                    )
                  )}
                </span>
              ))}
            </div>
          </section>
        )}

        <p className="border-t border-slate-100 pt-2.5 text-[11px] italic leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t('cvBuilder.skillsCard.softSkillsNote')}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {t('cvBuilder.skillsCard.selectedCount', { n: selectedCount })}
        </span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedCount}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900"
        >
          {selectedCount
            ? t('cvBuilder.skillsCard.addNToCv', { n: selectedCount })
            : t('cvBuilder.skillsCard.addToCv')}
        </button>
      </div>
    </div>
  );
};

export default SkillsCard;
