import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAriaStudio } from '../../context/AriaStudioContext';
import { BAND_TEXT, BAND_RULEBG } from '../../lib/noteStyles';
import {
  PREVIEW_ORDER,
  VERDICT_LABEL_KEY,
  bandsByKey,
  bandForKey,
  improvedKeys,
  parseBullets,
} from '../../lib/studioPreview';
import AriaOrbit from '../cv/AriaOrbit';
import CvLanguageToggle from '../cv/CvLanguageToggle';
import { cvLabel } from '../../lib/cvLabels';
import { withoutBlankEntries } from '../../lib/studioFlow';

// The Live Preview — a structured, legible render of the CV built straight from cvData
// (NOT the template markdown), so it updates the instant an edit lands. Each section
// carries a left band rail + a verdict chip coloured from the persisted studioScan, so
// the document and its section-by-section verdict live in one place. The real template
// render stays on the download path (StudioPrintSurface) — this is the working view.

// One section block: the band rail down the left, a labelled header with its verdict
// chip, then the caller's content. Pulses green briefly when its band just improved.
const SectionBlock = ({ label, band, pulsing, children }) => {
  const { t } = useTranslation();
  return (
    <section className={`relative pl-4 rounded-r-md ${pulsing ? 'aria-just-fixed' : ''}`}>
      <span
        className={`absolute left-0 top-0.5 bottom-0.5 w-[3px] rounded-full ${
          BAND_RULEBG[band] || 'bg-slate-300 dark:bg-slate-600'
        }`}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          {label}
        </h3>
        {band !== 'neutral' && (
          <span
            className={`shrink-0 font-mono text-[9px] uppercase tracking-wider font-semibold ${BAND_TEXT[band]}`}
          >
            {t(VERDICT_LABEL_KEY[band])}
          </span>
        )}
      </div>
      {children}
    </section>
  );
};

const Bullets = ({ description }) => {
  const bullets = parseBullets(description);
  if (!bullets.length) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {bullets.map((b, i) => (
        <li
          key={i}
          className="relative pl-3.5 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 before:content-['•'] before:absolute before:left-0 before:text-slate-400 dark:before:text-slate-500"
        >
          {b}
        </li>
      ))}
    </ul>
  );
};

const StudioLivePreview = ({ onClose }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { cvData, updateCvData } = useAriaStudio();
  const scan = cvData?.studioScan;

  // ── "See it change" pulse: when a re-band improves a section, glow it once. ──
  const [pulsing, setPulsing] = useState({});
  const prevBandsRef = useRef(bandsByKey(scan)); // seed with current so the first render never pulses
  useEffect(() => {
    const next = bandsByKey(scan);
    const gained = improvedKeys(prevBandsRef.current, next);
    prevBandsRef.current = next;
    if (!gained.length || reduce) return undefined;
    setPulsing((p) => ({ ...p, ...Object.fromEntries(gained.map((k) => [k, true])) }));
    const t = setTimeout(
      () => setPulsing((p) => ({ ...p, ...Object.fromEntries(gained.map((k) => [k, false])) })),
      1200
    );
    return () => clearTimeout(t);
    // Keyed on the serialised bands, so a recompute that only moves a band fires this,
    // but an unrelated cvData change (which doesn't touch scan) does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(bandsByKey(scan)), reduce]);

  const info = cvData?.personalInfo || {};
  const capturedCv = withoutBlankEntries(cvData);
  const experience = capturedCv.experience || [];
  const projects = capturedCv.projects || [];
  const education = capturedCv.education || [];
  const certifications = cvData?.certifications || [];
  const skills = cvData?.skills || [];
  const summary = (cvData?.professionalSummary || '').trim();
  const skillNames = skills.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
  const contactLine = [info.email, info.phone, info.address, info.linkedin, info.website]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join('  ·  ');

  const bandOfKey = (key) => bandForKey(scan, key);
  // Render a body section only when it has content OR the scan has an opinion on it — an
  // empty, unscored section would just be a bare label.
  const show = (key, hasContent) => hasContent || bandOfKey(key) !== 'neutral';

  // This panel builds sections structurally from cvData (not from the localized
  // markdown), so its labels don't get translated for free — route each through
  // cvLabel so the section headings track the CV-language toggle. The short-form
  // labels ("Summary"/"Experience"/"Contact") have their own entries in the table.
  const docLang = cvData?.outputLang || 'en';
  const label = (name) => cvLabel(name, docLang);

  return (
    <aside className="h-full min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.livePreview.heading')}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {cvData?.title || t('ariaStudio.livePreview.yourCv')}
          </p>
        </div>
        {/* The language this CV is WRITTEN in — drives Aria's writing and the
            section labels on the downloaded document. */}
        {cvData?._id && (
          <CvLanguageToggle
            compact
            draftId={cvData._id}
            value={cvData.outputLang}
            onChange={(next) => updateCvData({ outputLang: next })}
            className="shrink-0"
          />
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('ariaStudio.livePreview.closePreview')}
            className="shrink-0 -mr-1 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {!scan ? (
        /* Empty state — nothing to light up until the first scan. Reuses the shared
           AriaOrbit and the global slow-orbit keyframes (same as the artifact panel). */
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div className="max-w-[240px] text-center">
            <span className="aria-orbit-slow inline-block">
              <AriaOrbit size={44} working />
            </span>
            <p className="mt-4 text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('ariaStudio.livePreview.emptyState')}
            </p>
          </div>
        </div>
      ) : (
        <div className="h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none p-4 sm:p-6">
          {/* The paper sheet — a themed surface, not a hard white A4 in dark mode. */}
          <div className="mx-auto max-w-[680px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_28px_-14px_rgba(15,23,42,0.18)] dark:shadow-[0_16px_40px_-24px_rgba(0,0,0,.55)] p-6 sm:p-8 space-y-6">
            {/* Contact header */}
            <SectionBlock
              label={label('Contact')}
              band={bandOfKey('contact')}
              pulsing={pulsing.contact}
            >
              <div className="flex items-center gap-3">
                {info.photoUrl && (
                  <img
                    src={info.photoUrl}
                    alt={t('ariaStudio.contactConfirm.photoPreviewAlt')}
                    className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">
                    {(info.fullName || '').trim() || t('ariaStudio.livePreview.yourName')}
                  </p>
                  {contactLine && (
                    <p className="mt-1 break-words text-[12px] text-slate-500 dark:text-slate-400">
                      {contactLine}
                    </p>
                  )}
                </div>
              </div>
            </SectionBlock>

            {/* Body sections, in the CV's real order. */}
            {PREVIEW_ORDER.filter((k) => k !== 'contact').map((key) => {
              if (key === 'summary') {
                if (!show('summary', !!summary)) return null;
                return (
                  <SectionBlock
                    key="summary"
                    label={label('Summary')}
                    band={bandOfKey('summary')}
                    pulsing={pulsing.summary}
                  >
                    {summary ? (
                      <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {summary}
                      </p>
                    ) : (
                      <p className="text-[12px] italic text-slate-400 dark:text-slate-500">
                        {t('ariaStudio.livePreview.noSummaryYet')}
                      </p>
                    )}
                  </SectionBlock>
                );
              }
              if (key === 'experience') {
                if (!show('experience', experience.length > 0)) return null;
                return (
                  <SectionBlock
                    key="experience"
                    label={label('Experience')}
                    band={bandOfKey('experience')}
                    pulsing={pulsing.experience}
                  >
                    <div className="space-y-3">
                      {experience.map((r) => (
                        <div key={r._sortId}>
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                              {r.title || t('ariaStudio.studioFlow.fields.experience.title')}
                              {r.company ? (
                                <span className="font-normal text-slate-500 dark:text-slate-400">
                                  {' '}
                                  · {r.company}
                                </span>
                              ) : null}
                            </p>
                            {(r.startDate || r.endDate || r.isCurrent) && (
                              <span className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                                {r.startDate || ''}
                                {r.startDate || r.endDate || r.isCurrent ? ' – ' : ''}
                                {r.isCurrent
                                  ? t('ariaStudio.pinnedEntry.present')
                                  : r.endDate || ''}
                              </span>
                            )}
                          </div>
                          <Bullets description={r.description} />
                        </div>
                      ))}
                    </div>
                  </SectionBlock>
                );
              }
              if (key === 'projects') {
                if (!show('projects', projects.length > 0)) return null;
                return (
                  <SectionBlock
                    key="projects"
                    label={label('Projects')}
                    band={bandOfKey('projects')}
                    pulsing={pulsing.projects}
                  >
                    <div className="space-y-3">
                      {projects.map((p) => (
                        <div key={p._sortId}>
                          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                            {p.title || t('ariaStudio.studioFlow.fields.project.title')}
                          </p>
                          <Bullets description={p.description} />
                        </div>
                      ))}
                    </div>
                  </SectionBlock>
                );
              }
              if (key === 'skills') {
                if (!show('skills', skillNames.length > 0)) return null;
                return (
                  <SectionBlock
                    key="skills"
                    label={label('Skills')}
                    band={bandOfKey('skills')}
                    pulsing={pulsing.skills}
                  >
                    {skillNames.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {skillNames.map((s, i) => (
                          <span
                            key={`${s}-${i}`}
                            className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] italic text-slate-400 dark:text-slate-500">
                        {t('ariaStudio.livePreview.noSkillsYet')}
                      </p>
                    )}
                  </SectionBlock>
                );
              }
              if (key === 'education') {
                if (!show('education', education.length > 0 || certifications.length > 0))
                  return null;
                return (
                  <SectionBlock
                    key="education"
                    label={label('Education')}
                    band={bandOfKey('education')}
                    pulsing={pulsing.education}
                  >
                    <div className="space-y-2">
                      {education.map((e) => (
                        <div key={e._sortId}>
                          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                            {e.degree || t('ariaStudio.studioFlow.fields.education.degree')}
                            {e.school ? (
                              <span className="font-normal text-slate-500 dark:text-slate-400">
                                {' '}
                                · {e.school}
                              </span>
                            ) : null}
                          </p>
                          {e.graduationDate && (
                            <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                              {e.graduationDate}
                            </p>
                          )}
                          <Bullets description={e.description} />
                        </div>
                      ))}
                      {certifications.length > 0 && (
                        <div className="pt-1">
                          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                            {t('ariaStudio.livePreview.certifications')}
                          </p>
                          <div className="mt-1 space-y-1">
                            {certifications.map((certificate, index) => (
                              <p
                                key={`${certificate.name}-${index}`}
                                className="text-[12px] text-slate-600 dark:text-slate-300"
                              >
                                {certificate.name}
                                {certificate.issuer ? ` · ${certificate.issuer}` : ''}
                                {certificate.date ? ` · ${certificate.date}` : ''}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionBlock>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

export default StudioLivePreview;
