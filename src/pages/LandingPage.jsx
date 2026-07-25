import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Filter,
  XCircle,
  Volume2,
  BookOpen,
  Printer,
  GitCompare,
  Bot,
} from 'lucide-react';
import Seo from '../components/Seo';
import { useTranslation, Trans } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import axios from 'axios';
import FeedbackCard from '../components/FeedbackCard';
import Footer from '../components/Footer';
import PublicNavbar from '../components/PublicNavbar';
import LiveInterviewCard from '../components/landing/LiveInterviewCard';
import RewriteLedger from '../components/landing/RewriteLedger';
import {
  StarStoryVignette,
  VoiceInterviewVignette,
  PreCallBriefVignette,
  CvCompareVignette,
} from '../components/landing/FeatureVignettes';

// Advanced Features — alternating editorial rows.
// Holds translation KEYS, not literals: this is a module constant, so literals
// would freeze in whatever language was active at import and ignore a live
// language switch. Same treatment as DEFAULT_VALUE_PROPS in round 1.
const FEATURES = [
  { icon: BookOpen, id: 'star', Vignette: StarStoryVignette },
  { icon: Volume2, id: 'voice', Vignette: VoiceInterviewVignette },
  { icon: Printer, id: 'brief', Vignette: PreCallBriefVignette },
  { icon: GitCompare, id: 'compare', Vignette: CvCompareVignette },
];

const LandingPage = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  const [featuredFeedbacks, setFeaturedFeedbacks] = useState([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/feedback/featured`);
        if (data.success) {
          setFeaturedFeedbacks(data.data);
        }
      } catch (error) {
        console.error('Error fetching featured feedbacks:', error);
      }
    };
    fetchFeatured();
  }, []);

  // Restrained staggered hero load.
  const heroContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15, delayChildren: 0.05 } },
  };
  const heroItem = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.2, 0.7, 0.2, 1] } },
  };

  // Restrained scroll-in reveal shared by the restyled sections (matches RewriteLedger).
  const revealUp = {
    hidden: { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] } },
  };
  const revealStagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900"
    >
      <Seo title={t('landing.seo.title')} description={t('landing.seo.description')} />

      {/* Scrollable Content Layer */}
      <div className="relative z-10">
        {/* Navigation */}
        <PublicNavbar />

        {/* Hero Section */}
        <section className="px-5 pt-28 pb-16 sm:px-8 lg:px-12 lg:pt-32 lg:pb-20">
          <div className="mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-9 min-[900px]:grid-cols-[1.02fr_0.98fr] min-[900px]:gap-14">
            {/* Copy */}
            <motion.div
              initial={reduce ? false : 'hidden'}
              animate="visible"
              variants={heroContainer}
              className="flex flex-col gap-5"
            >
              <motion.p
                variants={heroItem}
                className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800"
              >
                {t('landing.hero.kicker')}
              </motion.p>

              <motion.h1
                variants={heroItem}
                className="font-heading text-[2.5rem] font-bold leading-[1.05] tracking-tight text-slate-900 text-balance sm:text-6xl lg:text-[4.3rem]"
              >
                {t('landing.hero.titleLead')}{' '}
                <span className="relative whitespace-nowrap text-indigo-600">
                  {t('landing.hero.titleAccent')}
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-[0.02em] block h-[3px] origin-left bg-indigo-600"
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={
                      reduce ? undefined : { duration: 0.5, ease: 'easeOut', delay: 0.75 }
                    }
                  />
                </span>
              </motion.h1>

              <motion.p
                variants={heroItem}
                className="max-w-[52ch] text-lg leading-relaxed text-slate-600 lg:text-xl"
              >
                {t('landing.hero.subcopy')}
              </motion.p>

              <motion.div
                variants={heroItem}
                className="flex flex-wrap items-center gap-x-6 gap-y-4"
              >
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-800 hover:bg-indigo-800"
                >
                  {t('common.startFree')}
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-1.5 border-b-2 border-indigo-600 pb-0.5 font-semibold text-slate-900 transition-colors hover:text-indigo-800"
                >
                  {t('landing.hero.ctaSecondary')} <ArrowRight size={16} />
                </Link>
              </motion.div>

              <motion.p
                variants={heroItem}
                className="font-mono text-[0.72rem] tracking-[0.04em] text-slate-600"
              >
                <b className="font-medium text-indigo-800">{t('landing.hero.freeNoteStrong')}</b> ·{' '}
                {t('landing.hero.freeNoteRest')}
              </motion.p>
            </motion.div>

            {/* Live interview panel */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduce ? undefined : { duration: 0.65, ease: [0.2, 0.7, 0.2, 1], delay: 0.5 }
              }
            >
              <LiveInterviewCard />
            </motion.div>
          </div>
        </section>

        {/* Rewrite Ledger — before / after */}
        <RewriteLedger />

        {/* EDUCATIONAL SECTION: The Problem — asymmetric funnel + editorial truth */}
        <section id="education" className="border-t border-slate-200 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8 lg:px-12">
            <motion.div
              initial={reduce ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={revealUp}
              className="mb-10 flex max-w-[54ch] flex-col gap-3 sm:mb-12"
            >
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
                {t('landing.problem.kicker')}
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                {t('landing.problem.title')}
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">
                {t('landing.problem.subcopy')}
              </p>
            </motion.div>

            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-14">
              {/* The rejection funnel */}
              <motion.div
                initial={reduce ? false : 'hidden'}
                whileInView="visible"
                viewport={{ once: true, amount: 0.25 }}
                variants={revealUp}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-clean sm:p-7"
              >
                <p className="mb-6 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
                  {t('landing.problem.typicalProcess')}
                </p>

                {/* Stage 01 — you apply */}
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                    <FileText size={18} />
                  </span>
                  <div className="pt-0.5">
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate-400">
                      {t('landing.problem.stageLabel', { n: '01' })}
                    </p>
                    <h3 className="font-semibold text-slate-700">
                      {t('landing.problem.stage1Title')}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-500">
                      {t('landing.problem.stage1Body')}
                    </p>
                  </div>
                </div>

                <div className="ml-[22px] h-6 w-px bg-slate-200" />

                {/* Stage 02 — the ATS filter (the danger step: red-600 only here) */}
                <div className="flex items-start gap-4 border-l-2 border-red-600 pl-4">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-md border border-red-200 bg-red-50 text-red-600">
                    <Filter size={18} />
                  </span>
                  <div className="pt-0.5">
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-red-500">
                      {t('landing.problem.stageLabel', { n: '02' })}
                    </p>
                    <h3 className="font-semibold text-red-700">
                      {t('landing.problem.stage2Title')}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {t('landing.problem.stage2BodyLead')}{' '}
                      <span className="font-semibold text-red-600">
                        {t('landing.problem.stage2BodyStrong')}
                      </span>{' '}
                      {t('landing.problem.stage2BodyTail')}
                    </p>
                  </div>
                </div>

                <div className="ml-[22px] h-6 w-px bg-slate-200" />

                {/* Stage 03 — human review that never happens */}
                <div className="flex items-start gap-4 opacity-60">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                    <XCircle size={18} />
                  </span>
                  <div className="pt-0.5">
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate-400">
                      {t('landing.problem.stageLabel', { n: '03' })}
                    </p>
                    <h3 className="font-semibold text-slate-700">
                      {t('landing.problem.stage3Title')}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-500">
                      {t('landing.problem.stage3Body')}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* The hard truth + the facts */}
              <motion.div
                initial={reduce ? false : 'hidden'}
                whileInView="visible"
                viewport={{ once: true, amount: 0.25 }}
                variants={revealStagger}
                className="flex flex-col gap-8"
              >
                <motion.p
                  variants={revealUp}
                  className="font-heading text-2xl font-bold leading-snug text-slate-900 sm:text-[2rem] sm:leading-[1.2]"
                >
                  {t('landing.problem.truthLead')}{' '}
                  <span className="text-indigo-600">{t('landing.problem.truthAccent')}</span>
                </motion.p>

                <motion.div variants={revealUp} className="border-l-2 border-indigo-600 pl-5">
                  <h3 className="font-heading text-lg font-bold text-slate-900">
                    {t('landing.problem.whatIsAtsTitle')}
                  </h3>
                  <p className="mt-2 leading-relaxed text-slate-600">
                    <Trans
                      i18nKey="landing.problem.whatIsAtsBody"
                      components={{
                        b: <b className="font-semibold text-indigo-800" />,
                        s: <span className="font-semibold text-slate-900" />,
                      }}
                    />
                  </p>
                </motion.div>

                <motion.div variants={revealUp} className="border-l-2 border-indigo-600 pl-5">
                  <h3 className="font-heading text-lg font-bold text-slate-900">
                    {t('landing.problem.sprayTitle')}
                  </h3>
                  <p className="mt-2 leading-relaxed text-slate-600">
                    {t('landing.problem.sprayBody')}
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* SOLUTION SECTION: the fix — flat numbered sequence */}
        <section className="border-t border-slate-200 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8 lg:px-12">
            <motion.div
              initial={reduce ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={revealUp}
              className="mb-10 flex max-w-[54ch] flex-col gap-3 sm:mb-12"
            >
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
                {t('landing.fix.kicker')}
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                {t('landing.fix.title')}
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">{t('landing.fix.subcopy')}</p>
            </motion.div>

            <motion.div
              initial={reduce ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={revealStagger}
              className="grid gap-5 sm:gap-6 md:grid-cols-3"
            >
              <motion.div
                variants={revealUp}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-clean transition-colors hover:border-slate-300 sm:p-7"
              >
                <p className="font-mono text-sm font-bold tracking-[0.08em] text-indigo-600">01</p>
                <h3 className="mt-3 font-heading text-xl font-bold text-slate-900">
                  {t('landing.fix.step1Title')}
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600">{t('landing.fix.step1Body')}</p>
              </motion.div>

              <motion.div
                variants={revealUp}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-clean transition-colors hover:border-slate-300 sm:p-7"
              >
                <p className="font-mono text-sm font-bold tracking-[0.08em] text-indigo-600">02</p>
                <h3 className="mt-3 font-heading text-xl font-bold text-slate-900">
                  {t('landing.fix.step2Title')}
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600">
                  <Trans i18nKey="landing.fix.step2Body" components={{ i: <em /> }} />
                </p>
              </motion.div>

              <motion.div
                variants={revealUp}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-clean transition-colors hover:border-slate-300 sm:p-7"
              >
                <p className="font-mono text-sm font-bold tracking-[0.08em] text-indigo-600">03</p>
                <h3 className="mt-3 font-heading text-xl font-bold text-slate-900">
                  {t('landing.fix.step3Title')}
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600">{t('landing.fix.step3Body')}</p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ADVANCED FEATURES SECTION: alternating editorial rows */}
        <section className="border-t border-slate-200 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8 lg:px-12">
            <motion.div
              initial={reduce ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={revealUp}
              className="mb-12 flex max-w-[54ch] flex-col gap-3 sm:mb-16"
            >
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
                {t('landing.features.kicker')}
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                {t('landing.features.title')}
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">
                {t('landing.features.subcopy')}
              </p>
            </motion.div>

            <div className="flex flex-col gap-16 sm:gap-20">
              {FEATURES.map((f, i) => {
                const Vignette = f.Vignette;
                const Icon = f.icon;
                const reverse = i % 2 === 1;
                return (
                  <motion.div
                    key={f.id}
                    initial={reduce ? false : 'hidden'}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={revealStagger}
                    className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
                  >
                    {/* Copy */}
                    <motion.div
                      variants={revealUp}
                      className={`flex flex-col gap-4 ${reverse ? 'lg:order-2' : ''}`}
                    >
                      <p className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-indigo-800">
                        <Icon size={14} className="text-indigo-600" />
                        {t(`landing.features.${f.id}.kicker`)}
                      </p>
                      <h3 className="font-heading text-2xl font-bold leading-snug text-slate-900 sm:text-[1.7rem]">
                        {t(`landing.features.${f.id}.title`)}
                      </h3>
                      <p className="leading-relaxed text-slate-600">
                        {t(`landing.features.${f.id}.body`)}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[1, 2, 3].map((num, ti) => (
                          <span
                            key={num}
                            className={`rounded border px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wide ${
                              ti === 0
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                                : 'border-slate-200 text-slate-500'
                            }`}
                          >
                            {t(`landing.features.${f.id}.tag${num}`)}
                          </span>
                        ))}
                      </div>
                    </motion.div>

                    {/* Product vignette */}
                    <motion.div variants={revealUp} className={reverse ? 'lg:order-1' : ''}>
                      <Vignette />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What Users Say Section — restyled frame, shared FeedbackCard unchanged */}
        {featuredFeedbacks.length >= 3 && (
          <section className="border-t border-slate-200 py-16 sm:py-20 lg:py-24">
            <div className="mx-auto max-w-[1160px] px-5 sm:px-8 lg:px-12">
              <motion.div
                initial={reduce ? false : 'hidden'}
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={revealUp}
                className="mb-10 flex max-w-[54ch] flex-col gap-3 sm:mb-12"
              >
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
                  {t('landing.testimonials.kicker')}
                </p>
                <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                  {t('landing.testimonials.title')}
                </h2>
                <p className="text-lg leading-relaxed text-slate-600">
                  {t('landing.testimonials.subcopy')}
                </p>
              </motion.div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredFeedbacks.map((feedback, index) => (
                  <FeedbackCard
                    key={feedback._id}
                    feedback={feedback}
                    index={index}
                    hideActions={true}
                  />
                ))}
              </div>

              <div className="mt-12 text-left">
                <Link
                  to="/feedback"
                  className="inline-flex items-center gap-1.5 border-b-2 border-indigo-600 pb-0.5 font-semibold text-slate-900 transition-colors hover:text-indigo-800"
                >
                  {t('landing.testimonials.cta')} <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section — flat ink band */}
        <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="mx-auto max-w-[1160px]">
            <motion.div
              initial={reduce ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={revealUp}
              className="grid grid-cols-1 items-center gap-8 rounded-xl bg-slate-900 px-6 py-12 sm:px-12 sm:py-14 md:grid-cols-[1fr_auto] md:gap-12"
            >
              {/* Copy */}
              <div className="flex flex-col items-start gap-5">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-300">
                  {t('landing.cta.kicker')}
                </p>
                <h2 className="max-w-[20ch] font-heading text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.7rem]">
                  {t('landing.cta.title')}
                </h2>
                <p className="max-w-[52ch] text-lg leading-relaxed text-slate-400">
                  {t('landing.cta.subcopy')}
                </p>
                <Link
                  to="/register"
                  className="mt-1 inline-flex items-center rounded-md bg-white px-5 py-2.5 font-semibold text-indigo-800 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  {t('landing.cta.button')}
                </Link>
                <p className="font-mono text-[0.72rem] tracking-[0.04em] text-slate-500">
                  {t('landing.cta.note')}
                </p>
              </div>

              {/* ApplyRight AI bot — decorative balance, hidden on mobile */}
              <div
                aria-hidden="true"
                className="hidden place-items-center pr-2 text-indigo-300/90 md:grid"
              >
                <Bot
                  strokeWidth={1.25}
                  className="w-auto"
                  style={{ height: 'clamp(120px, 15vw, 190px)' }}
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </motion.div>
  );
};

export default LandingPage;
