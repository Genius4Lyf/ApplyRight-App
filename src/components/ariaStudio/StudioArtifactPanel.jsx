import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';
import { bandOf } from '../../lib/applicationInsights';
import { BAND_TEXT, BAND_RULEBG } from '../../lib/noteStyles';
import { buildProgress, BUILD_SECTIONS, withoutBlankEntries } from '../../lib/studioFlow';
import AriaOrbit from '../cv/AriaOrbit';

// The right rail — a standing summary of where the tailored CV is right now: the role
// it's aimed at, the fit score, the per-section dots, and what the job keeps asking for
// that the CV still doesn't say.
//
// Reads entirely from the persisted `studioScan` snapshot on the draft, so it survives a
// refresh without re-scanning (and without re-charging).
const StudioArtifactPanel = ({ onClose, bare = false }) => {
  const { t } = useTranslation();
  const { cvData } = useAriaStudio();
  const [openSection, setOpenSection] = useState(null);

  const scan = cvData?.studioScan;
  const targetJob = cvData?.targetJob;
  const brief = targetJob?.brief;
  const sections = scan?.sections || [];
  const score = scan?.fitScore;
  const band = bandOf(score);

  // Missing keywords across the JD-relevant sections, deduped and must-haves first.
  // The panel answers "what am I still not saying?" — one list, not six.
  const missingKeywords = [...new Set(sections.flatMap((s) => s.missingKeywords || []))].slice(
    0,
    10
  );

  // A build session has no job to match against yet, so the job-match block would be
  // six empty rows. It shows the document's own health instead — the same
  // getCompletionStatus figure /my-cvs and the Dashboard use, derived live.
  const isBuild = cvData?.studioKind === 'build';
  const progress = buildProgress(cvData, cvData?.coachChats?.studio || []);
  const capturedCv = withoutBlankEntries(cvData);
  const roles = capturedCv.experience || [];
  const projects = capturedCv.projects || [];
  const education = capturedCv.education || [];
  const certifications = cvData?.certifications || [];
  const skills = (cvData?.skills || [])
    .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
    .filter(Boolean);
  const summary = (cvData?.professionalSummary || '').trim();
  const contact = cvData?.personalInfo || {};

  const lines = (description) =>
    (description || '')
      .split('\n')
      .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean);

  const hasCaptured = {
    contact: Object.values(contact).some((value) => typeof value === 'string' && value.trim()),
    experience: roles.length > 0,
    projects: projects.length > 0,
    education: education.length > 0 || certifications.length > 0,
    skills: skills.length > 0,
    summary: !!summary,
  };

  const emptyCaptured = (
    <p className="text-[11px] italic leading-relaxed text-slate-400 dark:text-slate-500">
      {t('ariaStudio.studioArtifactPanel.nothingCapturedYet')}
    </p>
  );

  const renderCapturedSection = (key) => {
    if (!hasCaptured[key]) return emptyCaptured;

    if (key === 'contact') {
      const contactFields = ['fullName', 'email', 'phone', 'address', 'linkedin', 'website'].filter(
        (field) => (contact[field] || '').trim()
      );
      return (
        <div className="space-y-2">
          {contact.photoUrl && (
            <img
              src={contact.photoUrl}
              alt={t('ariaStudio.contactConfirm.photoPreviewAlt')}
              className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-slate-700"
            />
          )}
          <dl className="space-y-1.5">
            {contactFields.map((field) => (
              <div key={field} className="min-w-0">
                <dt className="font-mono text-[8px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {t(`ariaStudio.contactConfirm.fields.${field}.label`)}
                </dt>
                <dd className="break-words text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {contact[field]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );
    }

    if (key === 'experience') {
      return (
        <div className="space-y-3">
          {roles.map((role, index) => {
            const bullets = lines(role.description);
            return (
              <div key={role._sortId || `${role.title}-${index}`}>
                <p className="text-[11.5px] font-semibold leading-snug text-slate-800 dark:text-slate-200">
                  {role.title || t('ariaStudio.studioArtifactPanel.untitledRole')}
                  {role.company && (
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      {' '}
                      · {role.company}
                    </span>
                  )}
                </p>
                {(role.startDate || role.endDate || role.isCurrent) && (
                  <p className="mt-0.5 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                    {role.startDate || ''}
                    {' – '}
                    {role.isCurrent ? t('ariaStudio.pinnedEntry.present') : role.endDate || ''}
                  </p>
                )}
                {bullets.length > 0 && (
                  <ul className="mt-1.5 space-y-1 pl-3">
                    {bullets.map((bullet, bulletIndex) => (
                      <li
                        key={`${bullet}-${bulletIndex}`}
                        className="list-disc text-[10.5px] leading-relaxed text-slate-600 marker:text-slate-300 dark:text-slate-400 dark:marker:text-slate-600"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (key === 'projects') {
      return (
        <div className="space-y-3">
          {projects.map((project, index) => {
            const bullets = lines(project.description);
            return (
              <div key={project._sortId || `${project.title}-${index}`}>
                <p className="text-[11.5px] font-semibold leading-snug text-slate-800 dark:text-slate-200">
                  {project.title || t('ariaStudio.studioArtifactPanel.untitledProject')}
                </p>
                {bullets.length > 0 && (
                  <ul className="mt-1.5 space-y-1 pl-3">
                    {bullets.map((bullet, bulletIndex) => (
                      <li
                        key={`${bullet}-${bulletIndex}`}
                        className="list-disc text-[10.5px] leading-relaxed text-slate-600 marker:text-slate-300 dark:text-slate-400 dark:marker:text-slate-600"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (key === 'education') {
      return (
        <div className="space-y-3">
          {education.map((entry, index) => (
            <div key={entry._sortId || `${entry.degree}-${index}`}>
              <p className="text-[11.5px] font-semibold leading-snug text-slate-800 dark:text-slate-200">
                {entry.degree}
                {entry.school && (
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    {' '}
                    · {entry.school}
                  </span>
                )}
              </p>
              {entry.graduationDate && (
                <p className="mt-0.5 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                  {entry.graduationDate}
                </p>
              )}
            </div>
          ))}
          {certifications.length > 0 && (
            <div>
              <p className="font-mono text-[8px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t('ariaStudio.studioArtifactPanel.certifications')}
              </p>
              <ul className="mt-1.5 space-y-1">
                {certifications.map((certificate, index) => (
                  <li
                    key={`${certificate.name}-${index}`}
                    className="text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-400"
                  >
                    {certificate.name}
                    {certificate.issuer ? ` · ${certificate.issuer}` : ''}
                    {certificate.date ? ` · ${certificate.date}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (key === 'skills') {
      return (
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {skills.map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="text-[10.5px] text-slate-600 dark:text-slate-400"
            >
              {skill}
            </span>
          ))}
        </div>
      );
    }

    return (
      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{summary}</p>
    );
  };

  return (
    <aside
      className={`h-full min-h-0 overflow-hidden flex flex-col ${
        bare
          ? ''
          : 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
      }`}
    >
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.studioArtifactPanel.tailoredCopy')}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {cvData?.title || t('ariaStudio.studioArtifactPanel.noCvYet')}
          </p>
          {(brief?.role || targetJob?.title) && (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {[brief?.role || targetJob?.title, brief?.company].filter(Boolean).join(' · ')}
            </p>
          )}
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

      {isBuild ? (
        /* BUILD MODE — the document's own progress, not a job match. */
        <div className="h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none p-4 space-y-5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('ariaStudio.studioArtifactPanel.cvHealth')}
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span
                className={`font-heading text-3xl font-bold tabular-nums ${
                  BAND_TEXT[bandOf(progress.percent)]
                }`}
              >
                {progress.percent}
              </span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">%</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t('ariaStudio.studioArtifactPanel.sectionsDoneCount', {
                done: progress.done,
                total: progress.total,
              })}
            </p>
          </div>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              {t('ariaStudio.studioArtifactPanel.capturedSoFar')}
            </p>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {BUILD_SECTIONS.map((s) => {
                const done = progress.status[s.key];
                const inProgress = !done && hasCaptured[s.key];
                const isOpen = openSection === s.key;
                const statusLabel = done
                  ? t('ariaStudio.studioArtifactPanel.complete')
                  : inProgress
                    ? t('ariaStudio.studioArtifactPanel.inProgress')
                    : t('ariaStudio.studioArtifactPanel.notStarted');
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setOpenSection(isOpen ? null : s.key)}
                      aria-expanded={isOpen}
                      aria-controls={`artifact-captured-${s.key}`}
                      className="flex w-full items-center gap-2.5 py-2 text-left"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          done
                            ? 'bg-emerald-500'
                            : inProgress
                              ? 'bg-amber-500'
                              : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] text-slate-700 dark:text-slate-200">
                          {t(s.labelKey)}
                        </span>
                        <span
                          className={`mt-0.5 block font-mono text-[8px] uppercase tracking-wide ${
                            done
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : inProgress
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      id={`artifact-captured-${s.key}`}
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        isOpen
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'pointer-events-none grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pb-3 pl-4 pr-1">{renderCapturedSection(s.key)}</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="sr-only">
              {BUILD_SECTIONS.map((s) =>
                t('ariaStudio.studioArtifactPanel.srSectionLine', {
                  label: t(s.labelKey),
                  status: progress.status[s.key]
                    ? t('ariaStudio.studioArtifactPanel.srDone')
                    : hasCaptured[s.key]
                      ? t('ariaStudio.studioArtifactPanel.srInProgress')
                      : t('ariaStudio.studioArtifactPanel.srNotStarted'),
                })
              ).join(' ')}
            </p>
          </div>
        </div>
      ) : !scan ? (
        /* IDLE — Aria's orbit, larger and slowly turning. Reuses the shared AriaOrbit
           and the global .aria-orbit keyframes; `working` is what drives the rotation,
           so there's no second animation to maintain. */
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div className="max-w-[230px] text-center">
            <span className="aria-orbit-slow inline-block">
              <AriaOrbit size={44} working />
            </span>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.studioArtifactPanel.standingBy')}
            </p>
            <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {cvData?._id
                ? t('ariaStudio.studioArtifactPanel.emptyWithCv')
                : t('ariaStudio.studioArtifactPanel.emptyNoCv')}
            </p>
          </div>
        </div>
      ) : (
        <div className="h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none p-4 space-y-5">
          {/* Overall */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('ariaStudio.studioArtifactPanel.fit')}
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className={`font-heading text-3xl font-bold tabular-nums ${BAND_TEXT[band]}`}>
                {score ?? '—'}
              </span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.common.outOf100')}
              </span>
            </div>
          </div>

          {/* Section dots */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              {t('ariaStudio.studioArtifactPanel.sections')}
            </p>
            <ul className="space-y-1.5">
              {sections.map((s) => (
                <li key={s.key} className="flex items-center gap-2.5">
                  <span
                    className={`shrink-0 w-1.5 h-1.5 rounded-full ${BAND_RULEBG[s.band] || 'bg-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-slate-600 dark:text-slate-300">
                    {s.label}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                    {s.score}
                  </span>
                </li>
              ))}
            </ul>
            <p className="sr-only">
              {sections
                .map((s) =>
                  t('ariaStudio.studioArtifactPanel.srSectionLine', {
                    label: s.label,
                    status:
                      s.band === 'ok'
                        ? t('ariaStudio.studioArtifactPanel.srGood')
                        : s.band === 'warn'
                          ? t('ariaStudio.studioArtifactPanel.srNeedsWork')
                          : t('ariaStudio.studioArtifactPanel.srPoor'),
                  })
                )
                .join(' ')}
            </p>
          </div>

          {/* Still missing */}
          {missingKeywords.length > 0 && (
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                {t('ariaStudio.studioArtifactPanel.stillNotMentioned')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.map((k) => (
                  <span
                    key={k}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default StudioArtifactPanel;
