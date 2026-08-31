import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

const THIS_YEAR = new Date().getFullYear();
const RECENT_YEARS = Array.from({ length: 8 }, (_, i) => String(THIS_YEAR - i));

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors';

const dateInputClass =
  'flex-1 min-w-[7rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 text-[14px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:focus:border-white dark:focus:ring-white/20 transition-colors disabled:opacity-50';

const labelClass = 'block text-[12px] font-semibold text-slate-600 dark:text-slate-300';

// Auto-prepend https:// to a bare domain, exactly like CVBuilder/Projects.jsx's own
// normalizer — a link typed in Studio should behave identically to one typed in the wizard.
const normalizeLink = (value) => {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
};

// Capture an ENTIRE entry — work history, project, or education — in one form, instead
// of one field per card. The type chip (ExperienceTypeCard / ProjectTypeCard) stays a
// separate quick tap ahead of this: it isn't a "field to fill", and for projects the
// backend's coachChatTurn prompt learns the type from that tap being sent as an ordinary
// chat turn (see studioFlow.js's PROJECT_TYPES comment). Everything scalar after that tap
// is gathered here in one submit. Achievements stay a separate, AI-mediated step
// (SectionCoach) — unchanged.
//
// FREE — this is typing, not generation. Nothing here calls the AI.
const EntryCaptureCard = ({ section = 'experience', entry, onSubmit, busy }) => {
  const { t } = useTranslation();

  const [title, setTitle] = useState(entry?.title || '');
  const [company, setCompany] = useState(entry?.company || '');
  const [startDate, setStartDate] = useState(entry?.startDate || '');
  const [endDate, setEndDate] = useState(entry?.endDate || '');
  const [isCurrent, setIsCurrent] = useState(!!entry?.isCurrent);
  const [link, setLink] = useState(entry?.link || '');
  const [degree, setDegree] = useState(entry?.degree || '');
  const [school, setSchool] = useState(entry?.school || '');
  const [graduationDate, setGraduationDate] = useState(entry?.graduationDate || '');
  const [cgpa, setCgpa] = useState(entry?.cgpa || '');

  const canSave =
    section === 'experience'
      ? title.trim().length > 1 && company.trim().length > 1 && !!startDate.trim()
      : section === 'project'
        ? title.trim().length > 1
        : degree.trim().length > 1 && school.trim().length > 1 && graduationDate.trim().length > 1;

  const submit = () => {
    if (!canSave || busy) return;
    if (section === 'experience') {
      onSubmit({
        title: title.trim(),
        company: company.trim(),
        startDate: startDate.trim(),
        endDate: isCurrent ? '' : endDate.trim(),
        isCurrent,
      });
    } else if (section === 'project') {
      onSubmit({ title: title.trim(), link: normalizeLink(link) });
    } else {
      onSubmit({
        degree: degree.trim(),
        school: school.trim(),
        graduationDate: graduationDate.trim(),
        cgpa: cgpa.trim(),
      });
    }
  };

  return (
    <AriaCard cardKey={`capture-${entry?._sortId || section}`}>
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t(`ariaStudio.entryCapture.heading.${section}`)}
        </p>

        <div className="mt-3 space-y-3">
          {section === 'experience' && (
            <>
              <div>
                <label htmlFor="entry-title" className={labelClass}>
                  {t('ariaStudio.studioFlow.fields.experience.title')}
                </label>
                <input
                  id="entry-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('cvBuilder.atsCoach.jobTitlePlaceholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="entry-company" className={labelClass}>
                  {t('ariaStudio.studioFlow.fields.experience.company')}
                </label>
                <input
                  id="entry-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t('ariaStudio.roleCapture.prompts.company.placeholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <span className={labelClass}>
                  {t('ariaStudio.studioFlow.fields.experience.dates')}
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <input
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder={t('ariaStudio.roleCapture.startedPlaceholder')}
                    aria-label={t('ariaStudio.roleCapture.started')}
                    className={dateInputClass}
                  />
                  <span aria-hidden="true" className="text-slate-400">
                    –
                  </span>
                  <input
                    value={isCurrent ? '' : endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isCurrent}
                    placeholder={
                      isCurrent
                        ? t('ariaStudio.pinnedEntry.present')
                        : t('ariaStudio.roleCapture.endedPlaceholder')
                    }
                    aria-label={t('ariaStudio.roleCapture.ended')}
                    className={dateInputClass}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {RECENT_YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setStartDate(y)}
                      className="text-[12px] font-semibold px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-900 hover:text-slate-950 dark:hover:border-white dark:hover:text-white transition-colors"
                    >
                      {y}
                    </button>
                  ))}
                </div>
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCurrent}
                    onChange={(e) => setIsCurrent(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:text-white dark:focus:ring-white"
                  />
                  <span className="text-[14px] text-slate-700 dark:text-slate-200">
                    {t('ariaStudio.roleCapture.stillWorkHere')}
                  </span>
                </label>
              </div>
            </>
          )}

          {section === 'project' && (
            <>
              <div>
                <label htmlFor="entry-title" className={labelClass}>
                  {t('ariaStudio.studioFlow.fields.project.title')}
                </label>
                <input
                  id="entry-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('ariaStudio.roleCapture.prompts.projectTitle.placeholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="entry-link" className={labelClass}>
                  {t('cvBuilder.projects.linkOptional')}
                </label>
                <input
                  id="entry-link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onBlur={() => setLink((v) => normalizeLink(v))}
                  placeholder={t('cvBuilder.projects.phLink')}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {section === 'education' && (
            <>
              <div>
                <label htmlFor="entry-degree" className={labelClass}>
                  {t('ariaStudio.studioFlow.fields.education.degree')}
                </label>
                <input
                  id="entry-degree"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder={t('ariaStudio.roleCapture.prompts.degree.placeholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="entry-school" className={labelClass}>
                  {t('ariaStudio.studioFlow.fields.education.school')}
                </label>
                <input
                  id="entry-school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder={t('ariaStudio.roleCapture.prompts.school.placeholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="entry-graduationDate" className={labelClass}>
                  {t('ariaStudio.studioFlow.fields.education.graduationDate')}
                </label>
                <input
                  id="entry-graduationDate"
                  value={graduationDate}
                  onChange={(e) => setGraduationDate(e.target.value)}
                  placeholder={t('ariaStudio.roleCapture.prompts.graduationDate.placeholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="entry-cgpa" className={labelClass}>
                  {t('ariaStudio.studioFlow.fields.education.cgpa')}
                </label>
                <input
                  id="entry-cgpa"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder={t('ariaStudio.entryCapture.cgpaPlaceholder')}
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canSave || busy}
          className="btn-primary w-full mt-4 py-2 text-[16px] disabled:opacity-50"
        >
          {busy ? t('ariaStudio.roleCapture.saving') : t('ariaStudio.roleCapture.save')}
        </button>
      </div>
    </AriaCard>
  );
};

export default EntryCaptureCard;
