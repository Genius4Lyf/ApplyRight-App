import React, { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Captions, Check, ChevronDown, Eye, FilePlus2, LayoutTemplate, Mic2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import cvHeadshotLeinad from '../../assets/landing/cv-headshot-leinad.webp';
import cvHeadshotSales from '../../assets/landing/cv-headshot-sales.webp';
import applyRightLogo from '../../assets/logo/applyright-icon-white.png';
import CVTemplateRenderer from '../CVTemplateRenderer';
import FinishCard from '../ariaStudio/FinishCard';
import SummaryFixCard from '../ariaStudio/SummaryFixCard';
import AriaOrbit from '../cv/AriaOrbit';
import AriaThinking from '../cv/AriaThinking';

const Motion = motion;

const ROLE_CVS = [
  { id: 'customerService', templateId: 'applyright-navy', template: 'ApplyRight Navy', photoUrl: cvHeadshotLeinad },
  { id: 'sales', templateId: 'sales-sidebar', template: 'Sales Sidebar', photoUrl: cvHeadshotSales },
  { id: 'data', templateId: 'angular-corporate', template: 'Angular Corporate' },
  { id: 'admin', templateId: 'the-ascent', template: 'The Ascent' },
  { id: 'adminTimeline', contentId: 'admin', templateId: 'slate-timeline', template: 'Slate Timeline', photoUrl: cvHeadshotSales },
  { id: 'salesPortrait', contentId: 'sales', templateId: 'navy-portrait', template: 'Navy Portrait', photoUrl: cvHeadshotSales },
  { id: 'adminProfile', contentId: 'admin', templateId: 'the-profile', template: 'The Profile', photoUrl: cvHeadshotSales },
  { id: 'financeCorporate', contentId: 'finance', templateId: 'executive-corporate', template: 'Corporate Clean' },
  { id: 'dataModern', contentId: 'data', templateId: 'modern', template: 'Modern Clean', photoUrl: cvHeadshotLeinad },
  { id: 'dataEnergy', contentId: 'data', templateId: 'executive-energy', template: 'Energy / Industrial', photoUrl: cvHeadshotLeinad },
  { id: 'adminOperations', contentId: 'admin', templateId: 'operations-blueprint', template: 'Operations Blueprint' },
];

const roleCv = (t, item, outputLang = 'en') => {
  const key = `landing.journey.roleCvs.${item.contentId || item.id}`;
  const name = t(`${key}.name`);
  const [firstName, ...lastParts] = name.split(' ');
  const role = t(`${key}.role`);
  const markdown = `# ${name}

## Professional Summary
${t(`${key}.summary`)}

## Work Experience

### ${t(`${key}.company`)} | 2022 – Present
- ${t(`${key}.bullet1`)}
- ${t(`${key}.bullet2`)}
- ${t(`${key}.bullet3`)}

### ${t(`${key}.previousCompany`)} | 2019 – 2022
- ${t(`${key}.previousBullet1`)}
- ${t(`${key}.previousBullet2`)}

## Projects

### ${t(`${key}.project`)}
- ${t(`${key}.projectBullet`)}

### ${t('landing.journey.cvSample.secondProject', { role })}
- ${t('landing.journey.cvSample.secondProjectBullet')}

## Education
${t(`${key}.education`)}

## Certifications
- ${t(`${key}.certification`)}

## Volunteer Experience

### ${t('landing.journey.cvSample.volunteerRole')} | 2020 – 2021
- ${t('landing.journey.cvSample.volunteerBullet1')}
- ${t('landing.journey.cvSample.volunteerBullet2')}

## Skills
${t(`${key}.skills`)}

## Additional Information
- ${t('landing.journey.cvSample.languages')}
- ${t('landing.journey.cvSample.references')}`;

  return {
    application: { optimizedCV: markdown, templateId: item.templateId, outputLang },
    profile: {
      firstName,
      lastName: lastParts.join(' '),
      fullName: name,
      currentJobTitle: role,
      email: `${firstName.toLowerCase()}.${lastParts.join('').toLowerCase()}@email.com`,
      phone: '0803 555 0142',
      location: 'Lagos, Nigeria',
      linkedinUrl: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}`,
      photoUrl: item.photoUrl || '',
    },
  };
};

const RealCvPage = ({ item, t, outputLang, scale, className = '' }) => {
  const sample = roleCv(t, item, outputLang);
  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      <div
        className="absolute left-0 top-0 min-h-[1123px] w-[794px] origin-top-left bg-white"
        style={{ transform: `scale(${scale})` }}
      >
        <CVTemplateRenderer application={sample.application} userProfile={sample.profile} />
      </div>
    </div>
  );
};

const StudioDesktop = ({ t, progress }) => {
  const answerOpacity = useTransform(progress, [0.035, 0.085], [0, 1]);
  const answerY = useTransform(progress, [0.035, 0.085], [18, 0]);
  const followUpOpacity = useTransform(progress, [0.085, 0.12], [0, 1]);
  const followUpY = useTransform(progress, [0.085, 0.12], [18, 0]);
  const magicOpacity = useTransform(progress, [0.125, 0.165], [0, 1]);
  const magicY = useTransform(progress, [0.125, 0.165], [20, 0]);
  const applyScale = useTransform(progress, [0.165, 0.18, 0.195], [1, 0.9, 1]);
  const appliedOpacity = useTransform(progress, [0.195, 0.225], [0, 1]);
  const appliedY = useTransform(progress, [0.195, 0.225], [12, 0]);
  const inputOpacity = useTransform(progress, [0, 0.13, 0.165], [1, 1, 0]);
  const firstScoreOpacity = useTransform(progress, [0, 0.19, 0.215], [1, 1, 0]);
  const finalScoreOpacity = useTransform(progress, [0.195, 0.225], [0, 1]);
  const workHistoryDone = useTransform(progress, [0.195, 0.225], [0, 1]);

  return (
  <div className="overflow-hidden rounded-[22px] border border-slate-300 bg-[#f8fafc] shadow-[0_36px_90px_rgba(15,23,42,0.18)]">
    <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-2.5">
        <AriaOrbit size={24} working />
        <div>
          <p className="text-sm font-bold text-slate-950">Aria Studio</p>
          <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-slate-400">
            {t('landing.journey.ariaDeskStrap')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2">
          <Eye size={13} /> {t('landing.journey.livePreview')}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white">
          <Check size={15} />
        </span>
      </div>
    </div>

    <div className="grid h-[440px] grid-cols-[0.22fr_0.5fr_0.28fr]">
      <aside className="border-r border-slate-200 bg-white p-3">
        <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-2 py-2.5 text-[9px] font-bold text-white">
          <Plus size={12} /> {t('landing.journey.newTailoring')}
        </button>
        <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2.5 text-[9px] font-bold text-slate-700">
          <FilePlus2 size={12} /> {t('landing.journey.newCv')}
        </button>
        <div className="mt-4 border-l-2 border-slate-900 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold">Daniel&apos;s CV</p>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[6px] uppercase">
              {t('landing.journey.newLabel')}
            </span>
          </div>
          <p className="mt-1 font-mono text-[6px] uppercase tracking-wider text-slate-400">
            {t('landing.journey.justNow')}
          </p>
        </div>
      </aside>

      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,.22)_1px,transparent_0)] bg-[size:22px_22px] px-5 py-4">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <AriaOrbit size={18} />
            <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[10px] leading-relaxed text-slate-700 shadow-sm">
              {t('landing.journey.ariaQuestion')}
            </div>
          </div>
          <Motion.div style={{ opacity: answerOpacity, y: answerY }} className="flex justify-end">
            <div className="max-w-[76%] rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-3 text-[10px] leading-relaxed text-white">
              {t('landing.journey.userAnswer')}
            </div>
          </Motion.div>
          <motion.div style={{ opacity: followUpOpacity, y: followUpY }} className="flex items-start gap-2">
            <AriaOrbit size={18} working />
            <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] leading-relaxed text-slate-700">
                {t('landing.journey.ariaFollowUp')}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[1, 2, 3].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[7px] font-semibold text-slate-700"
                  >
                    {t(`landing.journey.prompt${item}`)}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
          <motion.div style={{ opacity: magicOpacity, y: magicY }} className="ml-7 rounded-xl border border-slate-300 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,.1)]">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[7px] uppercase tracking-[.17em] text-slate-400">{t('landing.journey.magicBox')}</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[6px] font-bold text-slate-500">2 {t('landing.journey.bullets')}</span>
            </div>
            <div className="mt-2 space-y-1.5 text-[8px] leading-relaxed text-slate-700">
              <p>• {t('landing.journey.bulletExample1')}</p>
              <p>• {t('landing.journey.bulletExample2')}</p>
            </div>
            <motion.div style={{ scale: applyScale }} className="mt-2 ml-auto w-fit rounded-md bg-slate-900 px-3 py-1.5 text-[7px] font-bold text-white">
              {t('landing.journey.applyToCv')}
            </motion.div>
          </motion.div>
          <motion.div style={{ opacity: appliedOpacity, y: appliedY }} className="ml-auto w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[8px] font-bold text-emerald-700">
            ✓ {t('landing.journey.appliedToCv')}
          </motion.div>
        </div>
        <motion.div style={{ opacity: inputOpacity }} className="absolute inset-x-4 bottom-4 flex h-11 items-center rounded-full border border-slate-300 bg-white px-4 shadow-sm">
          <span className="font-mono text-[8px] font-semibold text-slate-600">◇ Standard</span>
          <span className="ml-3 border-l border-slate-200 pl-3 text-[9px] text-slate-400">
            {t('landing.journey.askPlaceholder')}
          </span>
          <span className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white">↑</span>
        </motion.div>
      </div>

      <aside className="border-l border-slate-200 bg-white p-4">
        <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-slate-400">
          {t('landing.journey.tailoredCopy')}
        </p>
        <p className="mt-1 text-sm font-bold">Daniel&apos;s CV</p>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-slate-400">
            {t('landing.journey.cvHealth')}
          </p>
          <div className="relative mt-2 h-10 w-16">
            <motion.span style={{ opacity: firstScoreOpacity }} className="absolute bottom-0 font-heading text-4xl font-bold text-amber-500">17</motion.span>
            <motion.span style={{ opacity: finalScoreOpacity }} className="absolute bottom-0 font-heading text-4xl font-bold text-emerald-500">33</motion.span>
            <span className="absolute bottom-1 left-[48px] text-[8px] text-slate-400">%</span>
          </div>
          <div className="relative h-3 text-[8px] text-slate-500">
            <motion.p style={{ opacity: firstScoreOpacity }} className="absolute">1 {t('landing.journey.ofSixDone')}</motion.p>
            <motion.p style={{ opacity: finalScoreOpacity }} className="absolute">2 {t('landing.journey.ofSixDone')}</motion.p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[ 'Contact', t('landing.journey.workHistory'), t('landing.journey.projects'), t('landing.journey.education'), t('landing.journey.skills'), t('landing.journey.summary')].map((label, index) => (
            <div key={label} className="flex items-center gap-2 border-b border-slate-100 pb-2 text-[9px]">
              <span className="relative h-1.5 w-1.5 rounded-full bg-slate-300">
                {index === 0 && <span className="absolute inset-0 rounded-full bg-emerald-500" />}
                {index === 1 && <motion.span style={{ opacity: workHistoryDone }} className="absolute inset-0 rounded-full bg-emerald-500" />}
              </span>
              <span className="font-semibold text-slate-700">{label}</span>
              {index === 0 && <Check size={11} className="ml-auto text-emerald-500" />}
              {index === 1 && <motion.span style={{ opacity: workHistoryDone }} className="ml-auto"><Check size={11} className="text-emerald-500" /></motion.span>}
            </div>
          ))}
        </div>
      </aside>
    </div>
  </div>
  );
};

const StudioMobile = ({ t, progress }) => {
  const answerOpacity = useTransform(progress, [0.035, 0.085], [0, 1]);
  const answerY = useTransform(progress, [0.035, 0.085], [16, 0]);
  const followUpOpacity = useTransform(progress, [0.085, 0.12], [0, 1]);
  const followUpY = useTransform(progress, [0.085, 0.12], [16, 0]);
  const magicOpacity = useTransform(progress, [0.125, 0.165], [0, 1]);
  const magicY = useTransform(progress, [0.125, 0.165], [18, 0]);
  const applyScale = useTransform(progress, [0.165, 0.18, 0.195], [1, 0.9, 1]);
  const healthOpacity = useTransform(progress, [0.195, 0.225], [0, 1]);
  const healthY = useTransform(progress, [0.195, 0.225], [90, 0]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-300 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex items-center gap-2.5">
          <AriaOrbit size={24} working />
          <div>
            <p className="text-sm font-bold text-slate-950">Aria Studio</p>
            <p className="font-mono text-[6px] uppercase tracking-[0.18em] text-slate-400">{t('landing.journey.ariaDeskStrap')}</p>
          </div>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white"><Check size={16} /></span>
      </div>

      <div className="relative h-[calc(100svh-265px)] min-h-[390px] max-h-[525px] overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,.2)_1px,transparent_0)] bg-[size:22px_22px] px-3 py-4">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <AriaOrbit size={18} />
            <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-3 text-[11px] leading-relaxed text-slate-700 shadow-sm">
              {t('landing.journey.ariaQuestion')}
            </div>
          </div>

          <motion.div style={{ opacity: answerOpacity, y: answerY }} className="flex justify-end">
            <div className="max-w-[84%] rounded-2xl rounded-tr-sm bg-slate-900 px-3.5 py-3 text-[11px] leading-relaxed text-white">
              {t('landing.journey.userAnswer')}
            </div>
          </motion.div>

          <motion.div style={{ opacity: followUpOpacity, y: followUpY }} className="flex items-start gap-2">
            <AriaOrbit size={18} working />
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-3 shadow-sm">
              <p className="text-[11px] leading-relaxed text-slate-700">{t('landing.journey.ariaFollowUp')}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[1, 2, 3].map((item) => (
                  <span key={item} className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[7px] font-semibold text-slate-700">
                    {t(`landing.journey.prompt${item}`)}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div style={{ opacity: magicOpacity, y: magicY }} className="ml-6 rounded-2xl border border-slate-300 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,.12)]">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[7px] uppercase tracking-[.17em] text-slate-500">{t('landing.journey.magicBox')}</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[6px] font-bold text-slate-500">2 {t('landing.journey.bullets')}</span>
            </div>
            <div className="mt-1.5 space-y-1 text-[8px] leading-[1.45] text-slate-700">
              <p>• {t('landing.journey.bulletExample1')}</p>
              <p>• {t('landing.journey.bulletExample2')}</p>
            </div>
            <motion.div style={{ scale: applyScale }} className="mt-2 ml-auto w-fit rounded-lg bg-slate-900 px-3 py-1.5 text-[8px] font-bold text-white">
              {t('landing.journey.applyToCv')}
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          style={{ opacity: healthOpacity, y: healthY }}
          className="absolute inset-x-3 bottom-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,.2)]"
        >
          <div className="flex items-end justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="font-mono text-[7px] uppercase tracking-[.18em] text-slate-400">{t('landing.journey.cvHealth')}</p>
              <p className="mt-1 text-sm font-bold">Daniel&apos;s CV</p>
            </div>
            <p className="font-heading text-4xl font-bold text-emerald-500">33<span className="ml-1 text-[9px] text-slate-400">%</span></p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-semibold text-slate-700">
            {[['Contact', true], [t('landing.journey.workHistory'), true], [t('landing.journey.projects'), false], [t('landing.journey.education'), false]].map(([label, done]) => (
              <div key={label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className={`h-2 w-2 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>{label}</span>
                {done && <Check size={11} className="ml-auto text-emerald-500" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const StudioPhone = ({ t, progress }) => {
  const setupOpacity = useTransform(progress, [0.275, 0.29, 0.315, 0.327], [0, 1, 1, 0]);
  const setupY = useTransform(progress, [0.275, 0.29, 0.315, 0.327], [18, 0, 0, -16]);
  const thinkingOpacity = useTransform(progress, [0.318, 0.327, 0.34, 0.349], [0, 1, 1, 0]);
  const draftOpacity = useTransform(progress, [0.34, 0.353, 0.385, 0.398], [0, 1, 1, 0]);
  const draftY = useTransform(progress, [0.34, 0.353, 0.385, 0.398], [18, 0, 0, -16]);
  const finishOpacity = useTransform(progress, [0.39, 0.404], [0, 1]);
  const finishY = useTransform(progress, [0.39, 0.404], [20, 0]);

  return (
    <div className="mx-auto w-[270px] overflow-hidden rounded-[36px] border-[7px] border-slate-950 bg-white shadow-[0_36px_90px_rgba(15,23,42,0.28)]">
      <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-slate-900" />
      <div className="mt-2 flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex items-center gap-2">
          <AriaOrbit size={20} working />
          <div>
            <p className="text-[10px] font-bold">Aria Studio</p>
            <p className="font-mono text-[5px] uppercase tracking-wider text-slate-400">{t('landing.journey.mobileBuild')}</p>
          </div>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100"><Check size={13} /></span>
      </div>
      <div className="relative h-[470px] overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,.18)_1px,transparent_0)] bg-[size:20px_20px] px-3 py-4">
        <motion.div style={{ opacity: setupOpacity, y: setupY }} className="pointer-events-none absolute inset-3">
          <div className="mb-3 flex items-start gap-1.5">
            <AriaOrbit size={15} />
            <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[8px] leading-relaxed shadow-sm">{t('landing.journey.mobileSummaryPrompt')}</div>
          </div>
          <div className="origin-top-left scale-[0.82] w-[122%] [&>div]:max-w-full">
            <SummaryFixCard careerStage="experienced" onGenerate={() => {}} onCancel={() => {}} />
          </div>
        </motion.div>

        <motion.div style={{ opacity: thinkingOpacity }} className="pointer-events-none absolute inset-x-5 top-8">
          <AriaThinking variant="draft" label={t('landing.journey.writingSummary')} />
        </motion.div>

        <motion.div style={{ opacity: draftOpacity, y: draftY }} className="pointer-events-none absolute inset-3">
          <div className="mb-3 flex items-start gap-1.5">
            <AriaOrbit size={15} />
            <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[8px] leading-relaxed shadow-sm">{t('landing.journey.summaryDraftReady')}</div>
          </div>
          <div className="origin-top-left scale-[0.82] w-[122%] [&>div]:max-w-full">
            <SummaryFixCard
              careerStage="experienced"
              draft={t('landing.journey.summaryExample')}
              onGenerate={() => {}}
              onApply={() => {}}
            />
          </div>
        </motion.div>

        <motion.div style={{ opacity: finishOpacity, y: finishY }} className="pointer-events-none absolute inset-3">
          <div className="origin-top-left scale-[0.8] w-[125%] [&>div]:max-w-full">
            <FinishCard
              mode="build"
              scan={{ title: "Daniel's CV" }}
              progress={{ percent: 100, done: 6, total: 6 }}
              contents={{ roles: 2, projects: 1, skills: 8 }}
              draftId="landing-demo"
              onOpenEditor={() => {}}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const CvStudio = ({ t, outputLang, previewOpacity }) => (
  <div className="overflow-hidden rounded-[22px] border border-slate-300 bg-slate-100 shadow-[0_36px_90px_rgba(15,23,42,0.2)]">
    <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-2.5">
        <LayoutTemplate size={20} />
        <div>
          <p className="text-sm font-bold">CV Studio</p>
          <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-slate-400">
            {t('landing.journey.designYourCv')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-semibold">
          {t('landing.journey.templates')}
        </span>
        <span className="rounded-lg bg-slate-900 px-3 py-2 text-[9px] font-semibold text-white">
          {t('landing.journey.download')}
        </span>
      </div>
    </div>
    <div className="grid h-[500px] grid-cols-[0.27fr_0.73fr]">
      <aside className="border-r border-slate-200 bg-white p-4">
        <p className="font-mono text-[7px] uppercase tracking-[0.17em] text-slate-400">
          {t('landing.journey.chooseTemplate')}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ROLE_CVS.slice(0, 4).map((item, index) => (
            <div key={item.id} className={`rounded-lg border p-2 ${index === 0 ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
              <RealCvPage item={item} t={t} outputLang={outputLang} scale={0.105} className="h-[118px] w-full rounded-sm shadow-sm" />
              <p className="mt-1.5 truncate text-[7px] font-semibold">{item.template}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="font-mono text-[7px] uppercase tracking-[0.17em] text-slate-400">
            {t('landing.journey.accent')}
          </p>
          <div className="mt-2 flex gap-2">
            {['bg-slate-900', 'bg-[#153b5b]', 'bg-amber-500', 'bg-emerald-600'].map((color, index) => (
              <span key={color} className={`h-5 w-5 rounded-full ${color} ${index === 0 ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`} />
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-[8px] text-slate-600">
          {[t('landing.journey.spacing'), t('landing.journey.typeScale'), t('landing.journey.pageLength')].map((label) => (
            <div key={label} className="flex items-center justify-between">
              <span>{label}</span>
              <ChevronDown size={11} />
            </div>
          ))}
        </div>
      </aside>
      <div className="relative grid place-items-center overflow-hidden bg-[#e9edf2] p-7">
        <div className="absolute left-5 top-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[8px] font-semibold shadow-sm">
          <Eye size={12} /> {t('landing.journey.livePreview')}
        </div>
        <div className="absolute right-5 top-4 z-10 w-44 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,.1)] max-sm:right-2 max-sm:top-3 max-sm:w-36 max-sm:p-2.5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[6px] uppercase tracking-[.17em] text-slate-400">{t('landing.journey.lengthCoach')}</p>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 text-[9px] font-bold leading-snug text-slate-800">{t('landing.journey.lengthGuidance')}</p>
          <p className="mt-1 text-[7px] text-emerald-600">✓ {t('landing.journey.fitsOnePage')}</p>
        </div>
        <motion.div style={previewOpacity ? { opacity: previewOpacity } : undefined} className="sm:hidden">
          <RealCvPage item={ROLE_CVS[0]} t={t} outputLang={outputLang} scale={0.25} className="h-[350px] w-[199px] shadow-[0_24px_70px_rgba(15,23,42,0.16)]" />
        </motion.div>
        <motion.div style={previewOpacity ? { opacity: previewOpacity } : undefined} className="hidden max-w-[72%] sm:block">
          <RealCvPage item={ROLE_CVS[0]} t={t} outputLang={outputLang} scale={0.44} className="h-[494px] w-[350px] shadow-[0_24px_70px_rgba(15,23,42,0.16)]" />
        </motion.div>
        <div className="absolute bottom-4 flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-[8px] font-semibold shadow-sm">
          <span>−</span><span>80%</span><span>+</span><span className="h-4 w-px bg-slate-200" /><span>↗</span>
        </div>
      </div>
    </div>
  </div>
);

const CvStudioMobile = ({ t, outputLang, previewOpacity }) => (
  <div className="overflow-hidden rounded-[24px] border border-slate-300 bg-[#e9edf2] shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
    <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2.5">
        <LayoutTemplate size={20} />
        <div>
          <p className="text-sm font-bold">CV Studio</p>
          <p className="font-mono text-[6px] uppercase tracking-[0.16em] text-slate-400">{t('landing.journey.designYourCv')}</p>
        </div>
      </div>
      <span className="rounded-lg bg-slate-900 px-3 py-2 text-[8px] font-semibold text-white">{t('landing.journey.download')}</span>
    </div>

    <div className="relative h-[calc(100svh-220px)] min-h-[420px] max-h-[540px] overflow-hidden px-4 pb-4 pt-16">
      <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
        <div>
          <p className="font-mono text-[6px] uppercase tracking-[.17em] text-slate-400">{t('landing.journey.lengthCoach')}</p>
          <p className="mt-1 text-[9px] font-bold text-slate-800">{t('landing.journey.lengthGuidance')}</p>
        </div>
        <div className="text-right">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <p className="mt-1 text-[7px] text-emerald-600">✓ {t('landing.journey.fitsOnePage')}</p>
        </div>
      </div>

      <motion.div style={previewOpacity ? { opacity: previewOpacity } : undefined} className="mx-auto mt-4 w-fit">
        <RealCvPage item={ROLE_CVS[0]} t={t} outputLang={outputLang} scale={0.34} className="h-[382px] w-[270px] shadow-[0_24px_70px_rgba(15,23,42,0.18)]" />
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="font-mono text-[6px] uppercase tracking-[.17em] text-slate-400">{t('landing.journey.chooseTemplate')}</p>
          <p className="text-[7px] font-semibold text-slate-500">{t('landing.journey.templates')} →</p>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {ROLE_CVS.slice(0, 4).map((item, index) => (
            <div key={item.id} className={`w-[72px] flex-none rounded-lg border p-1.5 ${index === 0 ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}>
              <RealCvPage item={item} t={t} outputLang={outputLang} scale={0.075} className="h-[84px] w-full rounded-sm shadow-sm" />
              <p className="mt-1 truncate text-[6px] font-semibold">{item.template}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const FinishedCvReveal = ({ t, outputLang }) => (
  <div className="grid place-items-center">
    <div className="mb-5 text-center">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">{t('landing.journey.finishedKicker')}</p>
      <h3 className="mt-2 font-heading text-2xl font-bold sm:text-4xl">{t('landing.journey.finishedTitle')}</h3>
    </div>
    <RealCvPage
      item={ROLE_CVS[0]}
      t={t}
      outputLang={outputLang}
      scale={0.465}
      className="h-[522px] w-[369px] max-w-[82vw] shadow-[0_30px_90px_rgba(15,23,42,.2)]"
    />
  </div>
);

const TemplateLineup = ({ t, progress, outputLang }) => {
  const reelX = useTransform(progress, [0.69, 0.755, 0.84], [40, 20, -420]);
  return (
    <div className="mx-auto w-full overflow-hidden text-center">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">{t('landing.journey.templatesKicker')}</p>
      <h3 className="mt-2 font-heading text-2xl font-bold sm:text-4xl">{t('landing.journey.templatesTitle')}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{t('landing.journey.templatesBody')}</p>
      <motion.div style={{ x: reelX }} className="mt-8 flex w-max gap-5 px-5">
        {ROLE_CVS.map((item) => (
          <article key={item.id} className="relative h-[350px] w-[242px] flex-none border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,.16)] sm:h-[410px] sm:w-[282px]">
            <RealCvPage item={item} t={t} outputLang={outputLang} scale={0.355} className="h-full w-full" />
            <span className="absolute bottom-2 right-3 z-10 rounded bg-white/90 px-2 py-1 font-mono text-[5px] uppercase tracking-[.14em] text-slate-500">{item.template}</span>
          </article>
        ))}
      </motion.div>
    </div>
  );
};

const CvCollectionRow = ({ t, progress, outputLang, mobile = false }) => {
  const rowX = useTransform(
    progress,
    [0.62, 0.65, 0.68, 0.71, 0.735, 0.76, 0.785, 0.81, 0.835],
    mobile
      ? [-121, -121, -121, -121, -240, -680, -1250, -1950, -2700]
      : [-14, -14, -141, -141, -380, -800, -1350, -1950, -2700],
  );
  const rowY = useTransform(progress, [0.62, 0.65, 0.68, 0.71, 0.74], [20, 20, 0, 0, 62]);
  const leadScale = useTransform(
    progress,
    [0.62, 0.65, 0.68, 0.71, 0.74],
    mobile ? [0.82, 0.82, 1.42, 1.42, 1] : [1.24, 1.24, 1.31, 1.31, 1],
  );
  const companionsOpacity = useTransform(progress, [0.705, 0.745], [0, 1]);
  const companionsX = useTransform(progress, [0.705, 0.75], [150, 0]);

  return (
    <motion.div
      style={{ x: rowX, y: rowY }}
      className={`absolute left-1/2 top-[88px] w-max gap-5 ${mobile ? 'flex sm:hidden' : 'hidden sm:flex'}`}
    >
      {ROLE_CVS.map((item, index) => (
        <motion.article
          key={item.id}
          style={index === 0 ? { scale: leadScale } : { opacity: companionsOpacity, x: companionsX }}
          className={`relative flex-none origin-top border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,.16)] ${
            mobile ? 'h-[350px] w-[242px]' : 'h-[410px] w-[282px]'
          }`}
        >
          <RealCvPage item={item} t={t} outputLang={outputLang} scale={0.355} className="h-full w-full" />
          <span className="absolute bottom-2 right-3 z-10 rounded bg-white/90 px-2 py-1 font-mono text-[5px] uppercase tracking-[.14em] text-slate-500">
            {item.template}
          </span>
        </motion.article>
      ))}
    </motion.div>
  );
};

const CvCollectionTransition = ({ t, progress, outputLang }) => {
  const finishedHeadingOpacity = useTransform(progress, [0.62, 0.65, 0.68, 0.71, 0.73], [0, 0, 1, 1, 0]);
  const finishedHeadingY = useTransform(progress, [0.65, 0.68, 0.71, 0.73], [10, 0, 0, -14]);
  const templatesHeadingOpacity = useTransform(progress, [0.735, 0.755], [0, 1]);
  const templatesHeadingY = useTransform(progress, [0.735, 0.755], [14, 0]);

  return (
    <div className="relative mx-auto h-[650px] w-full overflow-hidden text-center">
      <motion.div style={{ opacity: finishedHeadingOpacity, y: finishedHeadingY }} className="absolute inset-x-4 top-0">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">{t('landing.journey.finishedKicker')}</p>
        <h3 className="mt-2 font-heading text-2xl font-bold sm:text-4xl">{t('landing.journey.finishedTitle')}</h3>
      </motion.div>

      <motion.div style={{ opacity: templatesHeadingOpacity, y: templatesHeadingY }} className="absolute inset-x-4 top-0">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">{t('landing.journey.templatesKicker')}</p>
        <h3 className="mt-2 font-heading text-2xl font-bold sm:text-4xl">{t('landing.journey.templatesTitle')}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{t('landing.journey.templatesBody')}</p>
      </motion.div>

      <CvCollectionRow t={t} progress={progress} outputLang={outputLang} mobile />
      <CvCollectionRow t={t} progress={progress} outputLang={outputLang} />
    </div>
  );
};

const InterviewBridge = ({ t, progress }) => {
  const promiseOpacity = useTransform(progress, [0.848, 0.86, 0.877, 0.888], [0, 1, 1, 0]);
  const promiseY = useTransform(progress, [0.848, 0.86, 0.877, 0.888], [24, 0, 0, -20]);
  const connectingOpacity = useTransform(progress, [0.884, 0.898, 0.922, 0.934], [0, 1, 1, 0]);
  const connectingScale = useTransform(progress, [0.884, 0.898, 0.922, 0.934], [0.9, 1, 1, 1.05]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center px-6 text-center text-white">
      <motion.div style={{ opacity: connectingOpacity }} className="absolute inset-0 bg-[#050a19]" />

      <motion.div style={{ opacity: promiseOpacity, y: promiseY }} className="absolute max-w-[860px]">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">{t('landing.journey.interviewBridgeKicker')}</p>
        <h3 className="mt-4 font-heading text-4xl font-bold leading-[1.05] text-white sm:text-6xl">{t('landing.journey.interviewBridgeTitle')}</h3>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{t('landing.journey.interviewBridgeBody')}</p>
      </motion.div>

      <motion.div style={{ opacity: connectingOpacity, scale: connectingScale }} className="absolute grid place-items-center">
        <div className="relative grid h-28 w-28 place-items-center" aria-hidden>
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              animate={{ scale: [0.72, 1.7], opacity: [0.55, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: index * 0.7, ease: 'easeOut' }}
              className="absolute inset-3 rounded-full border border-white/30"
            />
          ))}
          <div className="relative grid h-24 w-24 place-items-center">
            <img src={applyRightLogo} alt="" className="h-20 w-20 object-contain drop-shadow-[0_10px_24px_rgba(255,255,255,.16)]" />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-rose-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          {t('landing.journey.interviewConnecting')}
        </div>
        <h3 className="mt-4 font-heading text-2xl font-bold text-white sm:text-3xl">{t('landing.journey.interviewConnectingName')}</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-400">{t('landing.journey.interviewConnectingBody')}</p>
      </motion.div>
    </div>
  );
};

const InterviewReveal = ({ t }) => {
  const [captionsOn, setCaptionsOn] = useState(true);
  const turnCycle = { duration: 6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.55, 0.88, 1] };
  const interviewQuestion = t('landing.journey.interviewQuestion');
  const captionWords = interviewQuestion.split(/\s+/);

  return (
    <div className="relative mx-auto h-[100svh] w-full overflow-hidden bg-[#050a19] text-white sm:h-[calc(100svh-48px)] sm:min-h-[540px] sm:max-h-[680px] sm:max-w-[1240px] sm:rounded-[26px] sm:shadow-[0_38px_110px_rgba(15,23,42,.38)]">
      <div className="flex h-[70px] items-center justify-between border-b border-white/10 px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[.06]"><Mic2 size={17} /></span>
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[.2em] text-slate-500">{t('landing.journey.interviewKicker')}</p>
            <p className="mt-1 text-sm font-bold">{t('landing.journey.interviewTitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCaptionsOn((current) => !current)}
            aria-pressed={captionsOn}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[8px] font-bold transition-colors ${
              captionsOn ? 'bg-white text-slate-950' : 'border border-white/15 text-slate-400'
            }`}
          >
            <Captions size={13} /> CC
          </button>
          <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-wider text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> {t('landing.journey.interviewLive')}
          </span>
        </div>
      </div>

      <section className="relative flex h-[calc(100%-70px)] min-w-0 flex-col justify-between px-6 py-8 sm:px-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[.06] font-heading text-xs font-bold">AO</span>
            <div>
              <p className="text-xs font-bold sm:text-sm">{t('landing.journey.interviewInterviewerName')}</p>
              <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[.16em] text-slate-500">{t('landing.journey.interviewInterviewerRole')}</p>
            </div>
          </div>
          {captionsOn && (
            <motion.p
              aria-label={interviewQuestion}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { delayChildren: 1.8, staggerChildren: 0.09 } },
              }}
              className="absolute inset-x-6 top-[28%] mx-auto max-w-[54rem] -translate-y-1/2 text-center font-heading text-[1.8rem] font-bold leading-[1.08] sm:inset-x-12 sm:text-[2.7rem]"
            >
              <span aria-hidden>“</span>
              {captionWords.map((word, index) => (
                <motion.span
                  key={`${word}-${index}`}
                  aria-hidden
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } },
                  }}
                  className="inline-block"
                >
                  {word}
                  {index < captionWords.length - 1 ? '\u00a0' : ''}
                </motion.span>
              ))}
              <span aria-hidden>”</span>
            </motion.p>
          )}
        </div>

        <motion.div
          animate={{ opacity: [1, 1, 0.18, 0.18, 1] }}
          transition={turnCycle}
          className="absolute inset-x-6 top-1/2 mx-auto max-w-[820px] -translate-y-1/2 sm:inset-x-12"
        >
            <div className="flex h-16 items-center gap-1">
              {Array.from({ length: 42 }).map((_, index) => (
                <motion.span
                  key={index}
                  animate={{ height: [`${12 + (index % 5) * 6}%`, `${38 + (index % 7) * 8}%`, `${16 + (index % 4) * 7}%`] }}
                  transition={{ duration: 1.15, repeat: Infinity, delay: index * 0.025, ease: 'easeInOut' }}
                  className="min-w-[2px] flex-1 rounded-full bg-white/70"
                />
              ))}
            </div>
        </motion.div>

        <div className="absolute bottom-8 left-10 hidden flex-wrap gap-2 text-[8px] text-slate-400 sm:flex">
            {[t('landing.journey.interviewSignal1'), t('landing.journey.interviewSignal2'), t('landing.journey.interviewSignal3')].map((signal) => (
              <span key={signal} className="rounded-full border border-white/15 px-3 py-1.5">{signal}</span>
            ))}
        </div>

        <aside className="absolute bottom-6 right-6 grid h-[112px] w-[158px] place-items-center rounded-2xl border border-white/15 bg-[#10182b]/95 shadow-2xl backdrop-blur sm:bottom-8 sm:right-8">
          <div className="text-center">
            <motion.div
              animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0)', '0 0 0 0 rgba(255,255,255,0)', '0 0 0 7px rgba(255,255,255,.22)', '0 0 24px 7px rgba(255,255,255,.14)', '0 0 0 0 rgba(255,255,255,0)'] }}
              transition={turnCycle}
              className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/10 font-heading text-base font-bold"
            >
              DU
            </motion.div>
            <p className="mt-2 text-[9px] font-bold">{t('landing.journey.interviewCandidateYou')}</p>
            <motion.p
              animate={{ opacity: [0, 0, 1, 1, 0] }}
              transition={turnCycle}
              className="mt-0.5 font-mono text-[6px] uppercase tracking-[.14em] text-slate-400"
            >
              {t('landing.journey.interviewCandidateSpeaking')}
            </motion.p>
          </div>
        </aside>
      </section>
    </div>
  );
};

const ProductJourneyReveal = ({ onInterviewFocusChange }) => {
  const { t, i18n } = useTranslation();
  const outputLang = i18n.resolvedLanguage?.startsWith('fr') ? 'fr' : 'en';
  const reduce = useReducedMotion();
  const [interviewMounted, setInterviewMounted] = useState(false);
  const sectionRef = useRef(null);
  const interviewMountedRef = useRef(false);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 105, damping: 28, mass: 0.4, restDelta: 0.001 });

  useMotionValueEvent(progress, 'change', (latest) => {
    onInterviewFocusChange?.(latest >= 0.84);
    const shouldMountInterview = latest >= 0.926;
    if (shouldMountInterview !== interviewMountedRef.current) {
      interviewMountedRef.current = shouldMountInterview;
      setInterviewMounted(shouldMountInterview);
    }
  });

  const desktopOpacity = useTransform(progress, [0, 0.2, 0.27], [1, 1, 0]);
  const desktopScale = useTransform(progress, [0, 0.2, 0.27], [1, 1, 0.94]);
  const desktopY = useTransform(progress, [0, 0.2, 0.27], [0, 0, -35]);
  const phoneOpacity = useTransform(progress, [0.245, 0.285, 0.42, 0.46], [0, 1, 1, 0]);
  const phoneScale = useTransform(progress, [0.245, 0.285, 0.42, 0.46], [1.65, 1.65, 1, 0.86]);
  const phoneY = useTransform(progress, [0.245, 0.285, 0.42, 0.46], [720, 80, 0, -45]);
  const studioOpacity = useTransform(progress, [0, 0.43, 0.52, 0.6], [1, 1, 1, 0]);
  const studioScale = useTransform(progress, [0, 0.43, 0.49, 0.52, 0.6], [0.96, 0.96, 1, 1, 0.98]);
  const studioY = useTransform(progress, [0, 0.43, 0.49, 0.52, 0.6], [900, 900, 0, 0, -90]);
  const studioPreviewOpacity = useTransform(progress, [0, 0.52, 0.6], [1, 1, 0]);
  const studioHeadingOpacity = useTransform(progress, [0.43, 0.48, 0.52, 0.6], [0, 1, 1, 0]);
  const studioHeadingY = useTransform(progress, [0.43, 0.48, 0.52, 0.6], [18, 0, 0, -24]);
  const collectionOpacity = useTransform(progress, [0.54, 0.6, 0.835, 0.855], [0, 1, 1, 0]);
  const collectionScale = useTransform(progress, [0.62, 0.835, 0.855], [0.98, 1, 0.96]);
  const interviewBackdropOpacity = useTransform(progress, [0.845, 0.865], [0, 1]);
  const interviewRevealOpacity = useTransform(progress, [0.936, 0.956], [0, 1]);
  const interviewRevealScale = useTransform(progress, [0.936, 0.962], [0.94, 1]);
  const headerOpacity = useTransform(progress, [0, 0.18, 0.24], [1, 1, 0]);

  if (reduce) {
    return (
      <section className="relative overflow-hidden border-t border-slate-200 bg-[#f7f6f2] px-5 py-20 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70 [background-size:52px_52px] sm:[background-size:72px_72px]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.055) 1px, transparent 1px)',
            maskImage: 'radial-gradient(circle at center, black 0%, transparent 84%)',
          }}
        />
        <div className="relative mx-auto max-w-[1160px] space-y-16">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">{t('landing.journey.kicker')}</p>
            <h2 className="mt-3 max-w-2xl font-heading text-4xl font-bold tracking-tight">{t('landing.journey.title')}</h2>
          </div>
          <div className="hidden sm:block"><StudioDesktop t={t} progress={progress} /></div>
          <div className="sm:hidden"><StudioMobile t={t} progress={progress} /></div>
          <div className="hidden sm:block"><CvStudio t={t} outputLang={outputLang} /></div>
          <div className="sm:hidden"><CvStudioMobile t={t} outputLang={outputLang} /></div>
          <FinishedCvReveal t={t} outputLang={outputLang} />
          <TemplateLineup t={t} progress={progress} outputLang={outputLang} />
          <InterviewReveal t={t} />
        </div>
      </section>
    );
  }

  return (
    <section id="product-journey" ref={sectionRef} className="relative h-[1350svh] border-t border-slate-200 bg-[#f7f6f2]">
      <motion.div
        aria-hidden="true"
        style={{ opacity: interviewBackdropOpacity }}
        className="pointer-events-none absolute inset-0 z-0 bg-[#050a19]"
      />
      <div className="sticky top-0 h-[100svh] overflow-hidden px-4 pt-24 sm:px-7 sm:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70 [background-size:52px_52px] sm:[background-size:72px_72px]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.055) 1px, transparent 1px)',
            maskImage: 'radial-gradient(circle at center, black 0%, transparent 84%)',
          }}
        />
        <motion.div
          style={{ opacity: headerOpacity }}
          className="pointer-events-none absolute left-5 top-24 z-30 max-w-[30rem] sm:left-10 sm:max-w-[50rem] lg:left-14"
        >
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">{t('landing.journey.kicker')}</p>
          <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t('landing.journey.title')}</h2>
          <p className="mt-2 hidden max-w-md text-sm leading-relaxed text-slate-600 sm:block">{t('landing.journey.subcopy')}</p>
        </motion.div>

        <motion.div
          style={{ opacity: desktopOpacity, scale: desktopScale, y: desktopY }}
          className="absolute inset-x-8 top-[195px] mx-auto hidden max-w-[1160px] origin-center sm:block"
        >
          <StudioDesktop t={t} progress={progress} />
        </motion.div>

        <motion.div
          style={{ opacity: desktopOpacity, scale: desktopScale, y: desktopY }}
          className="absolute inset-x-4 top-[195px] mx-auto origin-center sm:hidden"
        >
          <StudioMobile t={t} progress={progress} />
        </motion.div>

        <motion.div
          style={{ opacity: phoneOpacity, scale: phoneScale, y: phoneY }}
          className="absolute inset-x-0 top-[100px] mx-auto w-fit origin-top"
        >
          <p className="mb-4 w-[270px] text-center font-mono text-[0.58rem] uppercase leading-relaxed tracking-[0.14em] text-slate-500">{t('landing.journey.mobileAvailable')}</p>
          <StudioPhone t={t} progress={progress} />
        </motion.div>

        <motion.div
          style={{ opacity: studioOpacity, scale: studioScale, y: studioY }}
          className="absolute inset-x-8 top-[82px] mx-auto hidden max-w-[1050px] origin-center sm:block"
        >
          <motion.div style={{ opacity: studioHeadingOpacity, y: studioHeadingY }} className="mb-4 text-center">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-slate-500">
              {t('landing.journey.studioKicker')}
            </p>
            <h3 className="mt-1.5 font-heading text-2xl font-bold text-slate-950 sm:text-4xl">
              {t('landing.journey.studioTitle')}
            </h3>
            <p className="mx-auto mt-1.5 hidden max-w-2xl text-sm text-slate-600 sm:block">
              {t('landing.journey.studioBody')}
            </p>
          </motion.div>
          <CvStudio t={t} outputLang={outputLang} previewOpacity={studioPreviewOpacity} />
        </motion.div>

        <motion.div
          style={{ opacity: studioOpacity, scale: studioScale, y: studioY }}
          className="absolute inset-x-4 top-[82px] mx-auto origin-center sm:hidden"
        >
          <motion.div style={{ opacity: studioHeadingOpacity, y: studioHeadingY }} className="mb-3 text-center">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-slate-500">
              {t('landing.journey.studioKicker')}
            </p>
            <h3 className="mt-1.5 font-heading text-2xl font-bold text-slate-950">
              {t('landing.journey.studioTitle')}
            </h3>
          </motion.div>
          <CvStudioMobile t={t} outputLang={outputLang} previewOpacity={studioPreviewOpacity} />
        </motion.div>

        <motion.div style={{ opacity: collectionOpacity, scale: collectionScale }} className="absolute inset-x-0 top-[95px] mx-auto origin-center">
          <CvCollectionTransition t={t} progress={progress} outputLang={outputLang} />
        </motion.div>

        <motion.div style={{ opacity: interviewBackdropOpacity }} className="pointer-events-none absolute inset-0 z-20 bg-[#050a19]" />

        <InterviewBridge t={t} progress={progress} />

        {interviewMounted && (
          <motion.div
            style={{ opacity: interviewRevealOpacity, scale: interviewRevealScale }}
            className="absolute inset-0 z-40 mx-auto origin-center sm:inset-x-6 sm:bottom-auto sm:top-6"
          >
            <InterviewReveal t={t} />
          </motion.div>
        )}

      </div>
    </section>
  );
};

export default ProductJourneyReveal;
