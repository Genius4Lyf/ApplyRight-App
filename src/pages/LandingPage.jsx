import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Filter, XCircle } from 'lucide-react';
import Seo from '../components/Seo';
import AriaOrbit from '../components/cv/AriaOrbit';
import { useTranslation, Trans } from 'react-i18next';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import axios from 'axios';
import Footer from '../components/Footer';
import PublicNavbar from '../components/PublicNavbar';
import ProductJourneyReveal from '../components/landing/ProductJourneyReveal';

const Motion = motion;

const LightGridBackdrop = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 opacity-70 [background-size:52px_52px] sm:[background-size:72px_72px]"
    style={{
      backgroundImage:
        'linear-gradient(rgba(15,23,42,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.055) 1px, transparent 1px)',
      maskImage: 'radial-gradient(circle at center, black 0%, transparent 84%)',
    }}
  />
);

const ProcessBeat = ({ progress, range, children, danger = false, muted = false }) => {
  const opacity = useTransform(progress, range, [0, 1]);
  const y = useTransform(progress, range, [42, 0]);
  const scale = useTransform(progress, range, [0.96, 1]);

  return (
    <Motion.div
      style={{ opacity, y, scale }}
      className={`relative flex items-start gap-4 border-t py-5 first:border-t-0 ${
        danger ? 'border-red-200' : 'border-slate-200'
      } ${muted ? 'opacity-60' : ''}`}
    >
      {children}
    </Motion.div>
  );
};

const MobileProblemStory = ({ t, progress }) => {
  const headingOpacity = useTransform(progress, [0, 0.16, 0.25], [1, 1, 0]);
  const headingY = useTransform(progress, [0, 0.16, 0.25], [0, 0, -50]);
  const processOpacity = useTransform(progress, [0.2, 0.28], [0, 1]);
  const processY = useTransform(progress, [0.2, 0.28], [70, 0]);

  return (
    // No fixed height: the card sits in normal flow and sets the pinned box's height,
    // so the gap to the truth copy below is constant on every viewport.
    <div className="relative pb-4 lg:hidden">
      <Motion.div
        style={{ opacity: headingOpacity, y: headingY }}
        className="absolute inset-x-5 top-10 text-center"
      >
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-slate-500">
          {t('landing.problem.kicker')}
        </p>
        <h2 className="mx-auto mt-4 max-w-[10ch] font-heading text-[2.75rem] font-bold leading-[0.94] tracking-[-0.045em] text-slate-900">
          {t('landing.problem.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-[34ch] text-sm leading-relaxed text-slate-600">
          {t('landing.problem.subcopy')}
        </p>
      </Motion.div>

      <Motion.div
        style={{ opacity: processOpacity, y: processY }}
        className="mx-4 mt-[9svh] rounded-[24px] border border-slate-200 bg-white p-5"
      >
        <p className="mb-1 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-slate-400">
          {t('landing.problem.typicalProcess')}
        </p>
        <ProcessBeat progress={progress} range={[0.3, 0.44]}>
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-slate-100 text-slate-500">
            <FileText size={17} />
          </span>
          <div>
            <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-slate-400">
              {t('landing.problem.stageLabel', { n: '01' })}
            </p>
            <h3 className="font-semibold text-slate-800">{t('landing.problem.stage1Title')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t('landing.problem.stage1Body')}
            </p>
          </div>
        </ProcessBeat>
        <ProcessBeat progress={progress} range={[0.5, 0.64]} danger>
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-red-50 text-red-600">
            <Filter size={17} />
          </span>
          <div>
            <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-red-500">
              {t('landing.problem.stageLabel', { n: '02' })}
            </p>
            <h3 className="font-semibold text-red-700">{t('landing.problem.stage2Title')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {t('landing.problem.stage2BodyLead')}{' '}
              <span className="font-semibold text-red-600">
                {t('landing.problem.stage2BodyStrong')}
              </span>{' '}
              {t('landing.problem.stage2BodyTail')}
            </p>
          </div>
        </ProcessBeat>
        <ProcessBeat progress={progress} range={[0.7, 0.86]} muted>
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-slate-100 text-slate-400">
            <XCircle size={17} />
          </span>
          <div>
            <p className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-slate-400">
              {t('landing.problem.stageLabel', { n: '03' })}
            </p>
            <h3 className="font-semibold text-slate-700">{t('landing.problem.stage3Title')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t('landing.problem.stage3Body')}
            </p>
          </div>
        </ProcessBeat>
      </Motion.div>
    </div>
  );
};

const MobileProblemTruth = ({ t }) => (
  <section className="bg-[#f7f6f2] px-5 pb-20 pt-4 lg:hidden">
    <p className="font-heading text-[2.15rem] font-bold leading-[1.02] tracking-[-0.035em] text-slate-900">
      {t('landing.problem.truthLead')}{' '}
      <span className="italic">{t('landing.problem.truthAccent')}</span>
    </p>
    <div className="mt-6 space-y-6 border-t border-slate-300 pt-5">
      <div>
        <h3 className="font-heading text-xl font-bold text-slate-900">
          {t('landing.problem.whatIsAtsTitle')}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          <Trans
            i18nKey="landing.problem.whatIsAtsBody"
            components={{
              b: <b className="font-semibold text-slate-900" />,
              s: <span className="italic font-semibold text-slate-900" />,
            }}
          />
        </p>
      </div>
      <div className="border-t border-slate-200 pt-5">
        <h3 className="font-heading text-xl font-bold text-slate-900">
          {t('landing.problem.sprayTitle')}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {t('landing.problem.sprayBody')}
        </p>
      </div>
    </div>
  </section>
);

const ProblemScrollStory = ({ t, reduce }) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 26,
    mass: 0.35,
  });
  const headingY = useTransform(progress, [0, 0.22, 0.34], [0, 0, -120]);
  const headingScale = useTransform(progress, [0, 0.22, 0.34], [1, 1, 0.84]);
  const headingOpacity = useTransform(progress, [0, 0.22, 0.34], [1, 1, 0]);
  const storyOpacity = useTransform(progress, [0.34, 0.42], [0, 1]);
  const storyY = useTransform(progress, [0.34, 0.42], [90, 0]);
  const truthOpacity = useTransform(progress, [0.79, 0.9], [0, 1]);
  const truthX = useTransform(progress, [0.79, 0.9], [70, 0]);

  if (reduce) {
    return (
      <section id="education" className="border-t border-slate-200 py-20">
        <div className="mx-auto max-w-[1160px] px-5 sm:px-8 lg:px-12">
          <ProblemStoryContent t={t} />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="education"
      className="relative h-[240svh] border-t border-slate-200 bg-[#f7f6f2] lg:h-[330svh]"
    >
      {/* Mobile pins only as tall as the card, so the truth copy rides up right under it. */}
      <div className="sticky top-0 overflow-hidden lg:h-[100svh]">
        <LightGridBackdrop />
        <MobileProblemStory t={t} progress={progress} />
        <div className="mx-auto hidden h-full max-w-[1160px] flex-col justify-center px-5 sm:px-8 lg:flex lg:px-12">
          <Motion.div
            style={{ y: headingY, scale: headingScale, opacity: headingOpacity }}
            className="mx-auto max-w-[760px] origin-center text-center"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">
              {t('landing.problem.kicker')}
            </p>
            <h2 className="mt-4 font-heading text-[clamp(2.8rem,6vw,5.8rem)] font-bold leading-[0.94] tracking-[-0.045em] text-slate-900">
              {t('landing.problem.title')}
            </h2>
            <p className="mx-auto mt-5 max-w-[56ch] text-lg leading-relaxed text-slate-600">
              {t('landing.problem.subcopy')}
            </p>
          </Motion.div>

          <Motion.div
            style={{ opacity: storyOpacity, y: storyY }}
            className="absolute inset-x-5 bottom-6 top-[23%] mx-auto grid max-w-[1160px] gap-8 sm:inset-x-8 lg:inset-x-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16"
          >
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:p-8">
              <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
                {t('landing.problem.typicalProcess')}
              </p>

              <ProcessBeat progress={progress} range={[0.41, 0.5]}>
                <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-slate-100 text-slate-500">
                  <FileText size={18} />
                </span>
                <div>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate-400">
                    {t('landing.problem.stageLabel', { n: '01' })}
                  </p>
                  <h3 className="font-semibold text-slate-800">
                    {t('landing.problem.stage1Title')}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    {t('landing.problem.stage1Body')}
                  </p>
                </div>
              </ProcessBeat>

              <ProcessBeat progress={progress} range={[0.53, 0.63]} danger>
                <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-red-50 text-red-600">
                  <Filter size={18} />
                </span>
                <div>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-red-500">
                    {t('landing.problem.stageLabel', { n: '02' })}
                  </p>
                  <h3 className="font-semibold text-red-700">{t('landing.problem.stage2Title')}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {t('landing.problem.stage2BodyLead')}{' '}
                    <span className="font-semibold text-red-600">
                      {t('landing.problem.stage2BodyStrong')}
                    </span>{' '}
                    {t('landing.problem.stage2BodyTail')}
                  </p>
                </div>
              </ProcessBeat>

              <ProcessBeat progress={progress} range={[0.66, 0.76]} muted>
                <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-slate-100 text-slate-400">
                  <XCircle size={18} />
                </span>
                <div>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate-400">
                    {t('landing.problem.stageLabel', { n: '03' })}
                  </p>
                  <h3 className="font-semibold text-slate-700">
                    {t('landing.problem.stage3Title')}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    {t('landing.problem.stage3Body')}
                  </p>
                </div>
              </ProcessBeat>
            </div>

            <Motion.div
              style={{ opacity: truthOpacity, x: truthX }}
              className="hidden max-w-[560px] lg:block"
            >
              <p className="font-heading text-[clamp(2rem,3.3vw,3.7rem)] font-bold leading-[1.02] tracking-[-0.035em] text-slate-900">
                {t('landing.problem.truthLead')}{' '}
                <span className="italic">{t('landing.problem.truthAccent')}</span>
              </p>
              <div className="mt-8 grid gap-6 border-t border-slate-300 pt-6 sm:grid-cols-2">
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900">
                    {t('landing.problem.whatIsAtsTitle')}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    <Trans
                      i18nKey="landing.problem.whatIsAtsBody"
                      components={{
                        b: <b className="font-semibold text-slate-900" />,
                        s: <span className="italic font-semibold text-slate-900" />,
                      }}
                    />
                  </p>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900">
                    {t('landing.problem.sprayTitle')}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {t('landing.problem.sprayBody')}
                  </p>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        </div>
      </div>
    </section>
  );
};

const ProblemStoryContent = ({ t }) => (
  <div>
    <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
      {t('landing.problem.kicker')}
    </p>
    <h2 className="mt-3 font-heading text-4xl font-bold text-slate-900">
      {t('landing.problem.title')}
    </h2>
    <p className="mt-4 text-lg text-slate-600">{t('landing.problem.subcopy')}</p>
  </div>
);

const TestimonialProof = ({ feedback, index, progress }) => {
  const starts = [0.36, 0.51, 0.66];
  const start = starts[index] ?? 0.66;
  const opacity = useTransform(progress, [start, start + 0.1], [0, 1]);
  const y = useTransform(progress, [start, start + 0.1], [90, 0]);
  const rotate = useTransform(progress, [start, start + 0.1], [index % 2 === 0 ? -3 : 3, 0]);
  const initials = `${feedback.user?.firstName?.[0] || ''}${feedback.user?.lastName?.[0] || ''}`;

  return (
    <Motion.article
      style={{ opacity, y, rotate }}
      className="flex h-full min-h-0 flex-col justify-between overflow-hidden border-t-2 border-slate-900 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] lg:p-8"
    >
      <div>
        <span className="font-heading text-6xl leading-none text-slate-200">“</span>
        <p className="-mt-4 font-heading text-[clamp(1rem,1.25vw,1.25rem)] font-medium italic leading-relaxed text-slate-800">
          {feedback.message}
        </p>
      </div>
      <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {initials}
        </span>
        <div>
          <p className="font-semibold text-slate-900">
            {feedback.user?.firstName} {feedback.user?.lastName}
          </p>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate-400">
            Verified ApplyRight user
          </p>
        </div>
      </div>
    </Motion.article>
  );
};

const MobileTestimonialProof = ({ feedback, index, progress }) => {
  const windows = [
    [0.35, 0.41, 0.49, 0.54],
    [0.52, 0.58, 0.67, 0.72],
    [0.7, 0.76, 0.85, 0.9],
  ];
  const range = windows[index] || windows[2];
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const x = useTransform(progress, range, [70, 0, 0, -70]);
  const scale = useTransform(progress, range, [0.96, 1, 1, 0.97]);
  const initials = `${feedback.user?.firstName?.[0] || ''}${feedback.user?.lastName?.[0] || ''}`;

  return (
    <Motion.article
      style={{ opacity, x, scale }}
      className="absolute inset-0 flex flex-col justify-between overflow-hidden border-y-2 border-slate-900 bg-white px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
    >
      <div>
        <span className="font-heading text-5xl leading-none text-slate-200">“</span>
        <p className="-mt-3 font-heading text-[clamp(0.92rem,4vw,1.15rem)] font-medium italic leading-[1.55] text-slate-800">
          {feedback.message}
        </p>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {initials}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {feedback.user?.firstName} {feedback.user?.lastName}
          </p>
          <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-slate-400">
            Verified ApplyRight user
          </p>
        </div>
      </div>
    </Motion.article>
  );
};

const StaticTestimonialCard = ({ feedback }) => {
  const initials = `${feedback.user?.firstName?.[0] || ''}${feedback.user?.lastName?.[0] || ''}`;
  return (
    <article className="flex min-h-[300px] flex-col justify-between border-t-2 border-slate-900 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <div>
        <span className="font-heading text-6xl leading-none text-slate-200">“</span>
        <p className="-mt-4 font-heading text-xl font-medium italic leading-relaxed text-slate-800">
          {feedback.message}
        </p>
      </div>
      <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {initials}
        </span>
        <div>
          <p className="font-semibold text-slate-900">
            {feedback.user?.firstName} {feedback.user?.lastName}
          </p>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate-400">
            Verified ApplyRight user
          </p>
        </div>
      </div>
    </article>
  );
};

const TestimonialsHeading = ({ t, style, className = '' }) => (
  <Motion.div style={style} className={`mx-auto max-w-[760px] origin-top text-center ${className}`}>
    <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">
      {t('landing.testimonials.kicker')}
    </p>
    <h2 className="mt-4 font-heading text-[clamp(2.8rem,6vw,5.8rem)] font-bold leading-[0.94] tracking-[-0.045em] text-slate-900">
      {t('landing.testimonials.title')}
    </h2>
    <p className="mx-auto mt-5 max-w-[54ch] text-lg leading-relaxed text-slate-600">
      {t('landing.testimonials.subcopy')}
    </p>
  </Motion.div>
);

const TestimonialsScrollStory = ({ feedbacks, t, reduce }) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 26, mass: 0.35 });
  // Heading travels from centred up to a fixed resting slot and stays there — kicker,
  // title and subcopy all remain visible for the whole section.
  const headingY = useTransform(progress, [0, 0.22, 0.33], ['22svh', '22svh', '2svh']);
  const headingScale = useTransform(progress, [0, 0.22, 0.33], [1, 1, 0.8]);
  // Mobile-only: the heading has no desktop entrance (it's already painted when the
  // section pins), so give it a fade/rise-in before the same 0.22->0.33 travel.
  const headingYMobile = useTransform(
    progress,
    [0, 0.06, 0.22, 0.33],
    ['30svh', '22svh', '22svh', '2svh']
  );
  const headingOpacityMobile = useTransform(progress, [0, 0.06], [0, 1]);
  const ctaOpacity = useTransform(progress, [0.8, 0.9], [0, 1]);
  const visibleFeedbacks = feedbacks.slice(0, 3);

  if (reduce) {
    // Plain flowing layout — no sticky pin, no absolutely-positioned children, so
    // there's no percentage-of-collapsed-container math that can misplace anything.
    return (
      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-[1160px] px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[760px] text-center">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">
              {t('landing.testimonials.kicker')}
            </p>
            <h2 className="mt-4 font-heading text-[clamp(2.8rem,6vw,5.8rem)] font-bold leading-[0.94] tracking-[-0.045em] text-slate-900">
              {t('landing.testimonials.title')}
            </h2>
            <p className="mx-auto mt-5 max-w-[54ch] text-lg leading-relaxed text-slate-600">
              {t('landing.testimonials.subcopy')}
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {visibleFeedbacks.map((feedback) => (
              <StaticTestimonialCard key={feedback._id} feedback={feedback} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/feedback"
              className="inline-flex items-center gap-2 border-b-2 border-slate-900 pb-1 font-semibold text-slate-900"
            >
              {t('landing.testimonials.cta')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative h-[300svh] border-t border-slate-200 bg-white">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <LightGridBackdrop />
        <div className="mx-auto flex h-full max-w-[1160px] flex-col justify-start px-5 pt-[5svh] sm:px-8 lg:px-12">
          <TestimonialsHeading
            t={t}
            className="md:hidden"
            style={{ y: headingYMobile, scale: headingScale, opacity: headingOpacityMobile }}
          />
          <TestimonialsHeading
            t={t}
            className="hidden md:block"
            style={{ y: headingY, scale: headingScale }}
          />

          <div className="absolute inset-x-5 bottom-14 top-[30%] md:hidden">
            {visibleFeedbacks.map((feedback, index) => (
              <MobileTestimonialProof
                key={feedback._id}
                feedback={feedback}
                index={index}
                progress={progress}
              />
            ))}
            <div className="absolute inset-x-0 bottom-1 flex justify-center gap-2">
              {visibleFeedbacks.map((feedback) => (
                <span key={feedback._id} className="h-1.5 w-6 rounded-full bg-slate-300" />
              ))}
            </div>
          </div>

          <div className="absolute inset-x-5 bottom-14 top-[34%] mx-auto hidden max-w-[1160px] items-stretch gap-5 sm:inset-x-8 md:grid md:grid-cols-3 lg:inset-x-12">
            {visibleFeedbacks.map((feedback, index) => (
              <TestimonialProof
                key={feedback._id}
                feedback={feedback}
                index={index}
                progress={progress}
              />
            ))}
          </div>

          <Motion.div
            style={{ opacity: ctaOpacity }}
            className="absolute bottom-5 left-0 right-0 text-center"
          >
            <Link
              to="/feedback"
              className="inline-flex items-center gap-2 border-b-2 border-slate-900 pb-1 font-semibold text-slate-900"
            >
              {t('landing.testimonials.cta')} <ArrowRight size={16} />
            </Link>
          </Motion.div>
        </div>
      </div>
    </section>
  );
};

const BrandIntro = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    mass: 0.5,
    restDelta: 0.001,
  });

  // Lead-in compressed so the orbit and the blind/morph text swap start moving almost
  // immediately (was a ~0.3 dead zone before anything moved); later keyframes (0.56+)
  // are untouched so the wipe/morph choreography keeps its shape.
  const blindOpacity = useTransform(smoothProgress, [0, 0.12, 0.56], [1, 1, 0]);
  const blindClip = useTransform(
    smoothProgress,
    [0.13, 0.56],
    ['inset(0 0% -18% 0)', 'inset(0 0% -18% 100%)']
  );
  const morphOpacity = useTransform(smoothProgress, [0.12, 0.16, 1], [0, 1, 1]);
  const morphClip = useTransform(
    smoothProgress,
    [0.13, 0.56],
    ['inset(0 100% 0 0)', 'inset(0 0% 0 0)']
  );
  const heroWayOpacity = useTransform(smoothProgress, [0.59, 0.635], [1, 0]);
  const heroWayMaxWidth = useTransform(smoothProgress, [0.59, 0.65], ['4.5em', '0em']);
  const heroTheOpacity = useTransform(smoothProgress, [0.67, 0.705], [1, 0]);
  const heroTheMaxWidth = useTransform(smoothProgress, [0.67, 0.73], ['3em', '0em']);
  // Tail pulled in from 0.9 -> 0.96 so the resolved state is reached with a brief hold
  // before the section unpins, instead of a dead final 10% of the track.
  const resolveOpacity = useTransform(smoothProgress, [0.78, 0.96], [0, 1]);
  const resolveY = useTransform(smoothProgress, [0.78, 0.96], [14, 0]);
  const orbitX = useTransform(
    smoothProgress,
    [0, 0.1, 0.15, 0.56, 0.6, 0.76, 0.84, 1],
    ['0vw', '0vw', '-43vw', '43vw', '43vw', '-43vw', '0vw', '0vw']
  );
  const orbitY = useTransform(
    smoothProgress,
    [0, 0.1, 0.15, 0.76, 0.84, 1],
    [-118, -118, 4, 4, -90, -90]
  );
  const orbitScale = useTransform(
    smoothProgress,
    [0, 0.15, 0.76, 0.84, 1],
    [0.85, 0.95, 1.08, 1.35, 1.35]
  );
  // Cue must be gone before the orbit/text motion kicks in (~0.1-0.13) or it fades over
  // an already-moving scene.
  const cueOpacity = useTransform(smoothProgress, [0, 0.05, 0.09], [1, 1, 0]);

  return (
    <section
      ref={sectionRef}
      aria-label={t('landing.hero.introAriaLabel')}
      className={reduce ? 'relative min-h-[78svh]' : 'relative h-[230svh] sm:h-[280svh]'}
    >
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden bg-[#f7f6f2] px-5 text-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.045) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(circle at center, black 0%, transparent 72%)',
          }}
        />

        <Motion.div
          aria-hidden="true"
          style={
            reduce ? { x: 0, y: -78, scale: 1.35 } : { x: orbitX, y: orbitY, scale: orbitScale }
          }
          className="absolute z-20 sm:-mt-12"
        >
          <AriaOrbit size={52} working />
        </Motion.div>

        <motion.div
          style={reduce ? { opacity: 0 } : { opacity: blindOpacity, clipPath: blindClip }}
          className="absolute z-10 flex max-w-5xl flex-col items-center [will-change:clip-path,opacity]"
        >
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">
            {t('landing.hero.introTruth')}
          </p>
          <h1 className="mt-5 flex max-w-[94vw] flex-wrap items-baseline justify-center gap-x-[0.18em] font-heading text-[clamp(3rem,8vw,7.8rem)] font-bold leading-[0.92] tracking-[-0.045em] text-slate-900">
            <span className="inline-block -rotate-3 translate-y-[0.08em]">
              {t('landing.hero.introBlindDont')}
            </span>
            <span className="inline-block rotate-2 -translate-y-[0.08em]">
              {t('landing.hero.introBlindJust')}
            </span>
            <span className="inline-block -rotate-2 translate-y-[0.12em]">
              {t('landing.hero.introBlindApply')}
            </span>
            <span className="inline-flex rotate-3 -translate-y-[0.05em]">
              {Array.from(t('landing.hero.introBlindBlindly')).map((letter, index) => (
                <span
                  key={`${letter}-${index}`}
                  className="inline-block"
                  style={{
                    transform: `translateY(${[-0.08, 0.06, -0.03, 0.1, -0.06][index % 5]}em) rotate(${[-3, 2, -1, 3, -2][index % 5]}deg)`,
                  }}
                >
                  {letter}
                </span>
              ))}
            </span>
          </h1>
        </motion.div>

        <motion.div
          style={
            reduce
              ? { opacity: 1, clipPath: 'inset(0 0% 0 0)' }
              : { opacity: morphOpacity, clipPath: morphClip }
          }
          className="absolute z-10 flex max-w-[96vw] flex-col items-center [will-change:clip-path,opacity]"
        >
          <motion.p className="inline-flex items-baseline justify-center whitespace-nowrap font-brand text-[2.2rem] font-semibold leading-none tracking-[-0.055em] text-slate-950 sm:text-[clamp(3.2rem,9vw,9rem)]">
            <span>{t('landing.hero.introMorphApply')}</span>
            <motion.span
              style={
                reduce
                  ? { opacity: 0, maxWidth: '0em' }
                  : { opacity: heroTheOpacity, maxWidth: heroTheMaxWidth }
              }
              className="inline-block overflow-hidden whitespace-nowrap"
            >
              &nbsp;{t('landing.hero.introMorphThe')}&nbsp;
            </motion.span>
            <span>{t('landing.hero.introMorphRight')}</span>
            <motion.span
              style={
                reduce
                  ? { opacity: 0, maxWidth: '0em' }
                  : { opacity: heroWayOpacity, maxWidth: heroWayMaxWidth }
              }
              className="inline-block overflow-hidden whitespace-nowrap"
            >
              &nbsp;{t('landing.hero.introMorphWay')}
            </motion.span>
          </motion.p>
          <motion.p
            style={reduce ? { opacity: 1, y: 0 } : { opacity: resolveOpacity, y: resolveY }}
            className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg"
          >
            {t('landing.hero.introResolve')}
          </motion.p>
        </motion.div>

        {!reduce && (
          <motion.div
            style={{ opacity: cueOpacity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500"
          >
            {t('landing.hero.introScroll')}
            <span className="mx-auto mt-3 block h-10 w-px bg-slate-400" />
          </motion.div>
        )}

        <motion.div
          aria-hidden="true"
          style={{ scaleX: reduce ? 1 : smoothProgress }}
          className="absolute inset-x-0 top-0 z-40 h-[3px] origin-left bg-slate-900"
        />
      </div>
    </section>
  );
};

const ClosingCtaStory = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 28,
    mass: 0.4,
    restDelta: 0.001,
  });

  const guessingOpacity = useTransform(progress, [0, 0.05, 0.21, 0.27], [0, 1, 1, 0]);
  // Lead each clip by one orbit radius so a letter disappears as soon as the
  // front of the orbit touches it, rather than after the orbit has crossed it.
  const guessingClip = useTransform(
    progress,
    [0.11, 0.236],
    ['inset(0 0 0 0)', 'inset(0 0 0 100%)']
  );
  const blindlyOpacity = useTransform(progress, [0.24, 0.3, 0.42, 0.48], [0, 1, 1, 0]);
  const blindlyClip = useTransform(
    progress,
    [0.344, 0.454],
    ['inset(0 0 0 0)', 'inset(0 100% 0 0)']
  );
  const rightWayOpacity = useTransform(progress, [0.45, 0.52, 1], [0, 1, 1]);
  const theOpacity = useTransform(progress, [0.585, 0.615], [1, 0]);
  const theMaxWidth = useTransform(progress, [0.585, 0.63], ['3em', '0em']);
  const wayOpacity = useTransform(progress, [0.645, 0.675], [1, 0]);
  const wayMaxWidth = useTransform(progress, [0.645, 0.69], ['4.5em', '0em']);
  const brandKickerOpacity = useTransform(progress, [0.72, 0.8], [0, 1]);
  const actionOpacity = useTransform(progress, [0.82, 0.91], [0, 1]);
  const actionY = useTransform(progress, [0.82, 0.91], [26, 0]);
  const orbitX = useTransform(
    progress,
    [0, 0.1, 0.26, 0.34, 0.47, 0.55, 0.71, 0.78, 1],
    ['0vw', '-42vw', '42vw', '42vw', '-42vw', '-42vw', '42vw', '0vw', '0vw']
  );
  const orbitYMobile = useTransform(progress, [0, 0.08, 0.72, 0.8, 1], [-105, 0, 0, -112, -112]);
  const orbitYDesktop = useTransform(progress, [0, 0.08, 0.72, 0.8, 1], [-105, 0, 0, -160, -160]);
  const orbitOpacity = useTransform(progress, [0, 0.06, 0.72, 0.78, 1], [0, 1, 1, 1, 1]);
  const orbitScale = useTransform(progress, [0, 0.72, 0.82, 1], [0.9, 1.05, 1.35, 1.35]);

  if (reduce) {
    return (
      <section className="grid min-h-[82svh] place-items-center bg-slate-950 px-5 py-20 text-center text-white">
        <div className="flex max-w-3xl flex-col items-center">
          <AriaOrbit size={72} tone="mono" className="text-white" />
          <h2 className="mt-7 font-heading text-5xl font-bold tracking-tight sm:text-7xl">
            ApplyRight
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {t('landing.cta.subcopy')}
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-slate-950"
          >
            {t('landing.cta.buttonToday')} <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    );
  }

  const phraseClass =
    'absolute inset-x-5 mx-auto max-w-[1100px] text-center font-heading text-[2.2rem] font-bold leading-[0.92] tracking-[-0.045em] text-white sm:-translate-y-2 sm:text-[clamp(3.1rem,8vw,7.8rem)]';

  return (
    <section ref={sectionRef} className="relative h-[360svh] bg-slate-950 text-white">
      <div className="sticky top-0 grid h-[100svh] place-items-center overflow-hidden px-5 text-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_center,black_0%,transparent_72%)]"
        />

        <motion.div
          aria-hidden="true"
          style={{ x: orbitX, y: orbitYMobile, opacity: orbitOpacity, scale: orbitScale }}
          className="absolute z-30 text-white sm:hidden"
        >
          <AriaOrbit size={58} working tone="mono" />
        </motion.div>

        <motion.div
          aria-hidden="true"
          style={{ x: orbitX, y: orbitYDesktop, opacity: orbitOpacity, scale: orbitScale }}
          className="absolute z-30 hidden text-white sm:block"
        >
          <AriaOrbit size={58} working tone="mono" />
        </motion.div>

        <motion.h2
          style={{ opacity: guessingOpacity, clipPath: guessingClip }}
          className={`${phraseClass} z-10`}
        >
          {t('landing.cta.stopGuessing')}
        </motion.h2>

        <motion.h2
          style={{ opacity: blindlyOpacity, clipPath: blindlyClip }}
          className={`${phraseClass} z-10`}
        >
          {t('landing.cta.stopBlindly')}
        </motion.h2>

        <motion.h2 style={{ opacity: rightWayOpacity }} className={`${phraseClass} z-10`}>
          <span className="inline-flex items-baseline justify-center whitespace-nowrap">
            <span>{t('landing.cta.applyWord')}</span>
            <motion.span
              style={{ opacity: theOpacity, maxWidth: theMaxWidth }}
              className="inline-block overflow-hidden whitespace-nowrap"
            >
              &nbsp;{t('landing.cta.theWord')}&nbsp;
            </motion.span>
            <span>{t('landing.cta.rightWord')}</span>
            <motion.span
              style={{ opacity: wayOpacity, maxWidth: wayMaxWidth }}
              className="inline-block overflow-hidden whitespace-nowrap"
            >
              &nbsp;{t('landing.cta.wayWord')}
            </motion.span>
          </span>
        </motion.h2>

        <motion.div
          style={{ opacity: brandKickerOpacity }}
          className="absolute z-20 -translate-y-16 sm:-translate-y-24"
        >
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-slate-400">
            {t('landing.cta.kicker')}
          </p>
        </motion.div>

        <motion.div
          style={{ opacity: actionOpacity, y: actionY }}
          className="absolute top-[59%] z-40 flex flex-col items-center sm:bottom-[10svh] sm:top-auto"
        >
          <p className="max-w-[32ch] text-sm leading-relaxed text-slate-300 sm:max-w-xl sm:text-base">
            {t('landing.cta.subcopy')}
          </p>
          <Link
            to="/register"
            className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-md bg-white px-6 py-3 font-semibold text-slate-950 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            {t('landing.cta.buttonToday')} <ArrowRight size={17} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

const LandingPage = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [featuredFeedbacks, setFeaturedFeedbacks] = useState([]);
  const [interviewFocused, setInterviewFocused] = useState(false);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/feedback/featured`);
        if (data.success) setFeaturedFeedbacks(data.data);
      } catch (error) {
        console.error('Error fetching featured feedbacks:', error);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen font-sans text-slate-900 selection:bg-slate-200 selection:text-slate-900"
    >
      <Seo title={t('landing.seo.title')} description={t('landing.seo.description')} />
      <div className="relative z-10">
        <PublicNavbar hidden={interviewFocused} />
        <BrandIntro />
        <ProductJourneyReveal onInterviewFocusChange={setInterviewFocused} />
        <ProblemScrollStory t={t} reduce={reduce} />
        <MobileProblemTruth t={t} />
        {featuredFeedbacks.length > 0 && (
          <TestimonialsScrollStory feedbacks={featuredFeedbacks} t={t} reduce={reduce} />
        )}
        <ClosingCtaStory />
        <Footer />
      </div>
    </motion.div>
  );
};

export default LandingPage;

