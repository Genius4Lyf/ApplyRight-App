import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Ear,
  Layers,
  MessageSquare,
  Compass,
  Heart,
  ShieldCheck,
  XCircle,
  CheckCircle,
  ArrowRight,
  Mic,
  Briefcase,
  Users,
  SlidersHorizontal,
  Trophy,
  ClipboardCheck,
  AlertTriangle,
  Bot,
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// Light stagger for list items — children reuse `fadeIn`.
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// The six question types you'll actually meet, with the move that wins each one.
// Copy lives at howToAce.questionTypes.q{n}{Title,Example,Approach} — keyed, not baked in,
// so the runtime UI language decides what's rendered.
const QUESTION_TYPES = [
  { icon: MessageSquare, n: 1 },
  { icon: Layers, n: 2 },
  { icon: Compass, n: 3 },
  { icon: Heart, n: 4 },
  { icon: Target, n: 5 },
  { icon: Users, n: 6 },
];

// The accurate rubric — kept in sync with ASSESS_DIMENSIONS in ai.service.js.
// Copy lives at howToAce.rubric.d{n}{Label,Body}.
const RUBRIC = [
  { icon: Target, n: 1 },
  { icon: Ear, n: 2 },
  { icon: Layers, n: 3 },
  { icon: MessageSquare, n: 4 },
  { icon: Compass, n: 5 },
  { icon: Heart, n: 6 },
  { icon: ShieldCheck, n: 7 },
];

const HowToAceYourInterview = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const prevTitle = document.title;
    document.title = t('howToAce.pageTitle');
    return () => {
      document.title = prevTitle;
    };
  }, [t]);

  // Logged in → straight to the prep list (the cleanest "start now" entry).
  // Logged out → register first, then they land in the app.
  const startInterview = () => {
    const token = localStorage.getItem('token');
    navigate(token ? '/interview-prep' : '/register');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-5">
              {t('howToAce.hero.kicker')}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
              {t('howToAce.hero.titleLead')}{' '}
              <span className="text-indigo-600">{t('howToAce.hero.titleAccent')}</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              {t('howToAce.hero.subcopy')}
            </p>
            <button
              onClick={startInterview}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-8 rounded-xl shadow-lg font-semibold transition-colors"
            >
              {t('howToAce.hero.cta')}
              <ArrowRight size={20} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* What interviewers are looking for */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-10 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              {t('howToAce.listening.kicker')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('howToAce.listening.title')}
            </h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="space-y-5 text-lg text-slate-600 leading-relaxed"
          >
            <p>
              <Trans
                i18nKey="howToAce.listening.p1"
                components={{
                  b: <span className="font-semibold text-slate-900" />,
                  i: <em />,
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="howToAce.listening.p2"
                components={{ b: <span className="font-semibold text-slate-900" /> }}
              />
            </p>
            <p>{t('howToAce.listening.p3')}</p>
          </motion.div>
        </div>
      </section>

      {/* STAR method */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-14 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              {t('howToAce.star.kicker')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('howToAce.star.title')}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">{t('howToAce.star.subcopy')}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-14"
          >
            {[
              { letter: 'S', titleKey: 'situationTitle', bodyKey: 'situationBody' },
              { letter: 'T', titleKey: 'taskTitle', bodyKey: 'taskBody' },
              { letter: 'A', titleKey: 'actionTitle', bodyKey: 'actionBody' },
              { letter: 'R', titleKey: 'resultTitle', bodyKey: 'resultBody' },
            ].map((s, idx) => (
              <motion.div key={idx} variants={fadeIn}>
                <div
                  aria-hidden="true"
                  className="font-heading text-5xl text-indigo-600 leading-none mb-4"
                >
                  {s.letter}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {t(`howToAce.star.${s.titleKey}`)}
                </h3>
                <p className="text-slate-600 leading-relaxed">{t(`howToAce.star.${s.bodyKey}`)}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Weak vs STAR — flat before/after */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="rounded-xl border border-slate-200 p-8">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-rose-500 mb-4">
                {t('howToAce.star.weakLabel')}
              </p>
              <p className="text-sm text-slate-400 italic mb-3">
                {t('howToAce.star.sampleQuestion')}
              </p>
              <p className="text-slate-700 leading-relaxed">{t('howToAce.star.weakBody')}</p>
              <p className="mt-4 text-sm text-slate-500">{t('howToAce.star.weakNote')}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-8">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-emerald-600 mb-4">
                {t('howToAce.star.starLabel')}
              </p>
              <p className="text-sm text-slate-400 italic mb-3">{t('howToAce.star.sameQuestion')}</p>
              <p className="text-slate-700 leading-relaxed">
                <Trans
                  i18nKey="howToAce.star.starBody"
                  components={{
                    s1: <em />,
                    s2: <em />,
                    s3: <em />,
                    s4: <em />,
                  }}
                />
              </p>
              <p className="mt-4 text-sm text-slate-500">{t('howToAce.star.starNote')}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Question types */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-14 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              {t('howToAce.questionTypes.kicker')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('howToAce.questionTypes.title')}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t('howToAce.questionTypes.subcopy')}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-x-12 gap-y-10"
          >
            {QUESTION_TYPES.map((q, idx) => (
              <motion.div key={idx} variants={fadeIn} className="flex gap-4">
                <span className="font-mono text-sm tabular-nums text-slate-400 pt-1 shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {t(`howToAce.questionTypes.q${q.n}Title`)}
                  </h3>
                  <p className="text-sm text-indigo-600 mb-2">
                    {t(`howToAce.questionTypes.q${q.n}Example`)}
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    {t(`howToAce.questionTypes.q${q.n}Approach`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Before & during checklist */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-10 md:mb-12 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              {t('howToAce.checklist.kicker')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('howToAce.checklist.title')}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="rounded-xl border border-slate-200 bg-white p-8"
            >
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-3">
                {t('howToAce.checklist.beforeLabel')}
              </p>
              <h3 className="text-xl font-bold text-slate-900 mb-5">
                {t('howToAce.checklist.beforeHeading')}
              </h3>
              <ul className="space-y-3 text-slate-600">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                    <span className="leading-relaxed">{t(`howToAce.checklist.before${i}`)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="rounded-xl border border-slate-200 bg-white p-8"
            >
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-3">
                {t('howToAce.checklist.duringLabel')}
              </p>
              <h3 className="text-xl font-bold text-slate-900 mb-5">
                {t('howToAce.checklist.duringHeading')}
              </h3>
              <ul className="space-y-3 text-slate-600">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                    <span className="leading-relaxed">{t(`howToAce.checklist.during${i}`)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Delivery note + mistakes */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mt-6 grid md:grid-cols-2 gap-6"
          >
            <div className="rounded-xl border border-slate-200 p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                {t('howToAce.checklist.deliveryHeading')}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                <Trans
                  i18nKey="howToAce.checklist.deliveryBody"
                  components={{ b: <span className="font-semibold text-slate-900" /> }}
                />
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-8">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="text-rose-500 shrink-0" size={22} />
                <h3 className="text-lg font-bold text-slate-900">
                  {t('howToAce.checklist.mistakesHeading')}
                </h3>
              </div>
              <ul className="space-y-2 text-slate-600">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                    <span>{t(`howToAce.checklist.mistake${i}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Real interview loops — numbered editorial sequence */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-10 md:mb-12 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              {t('howToAce.rounds.kicker')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('howToAce.rounds.title')}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">{t('howToAce.rounds.subcopy')}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="flex flex-col gap-10"
          >
            {[1, 2, 3].map((n, idx) => (
              <motion.div key={idx} variants={fadeIn} className="flex gap-5 md:gap-8">
                <span
                  aria-hidden="true"
                  className="font-heading text-5xl md:text-6xl text-indigo-200 leading-none tabular-nums shrink-0"
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="pt-1 md:pt-2">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                    {t(`howToAce.rounds.r${n}Title`)}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {t(`howToAce.rounds.r${n}Body`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-slate-600 mt-10 leading-relaxed"
          >
            <Trans
              i18nKey="howToAce.rounds.closer"
              components={{ b: <span className="font-semibold text-slate-900" /> }}
            />
          </motion.p>
        </div>
      </section>

      {/* How ApplyRight scores — the rubric */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-16 flex max-w-[54ch] flex-col gap-3"
          >
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-300 mb-2">
              {t('howToAce.rubric.kicker')}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              {t('howToAce.rubric.title')}
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed">{t('howToAce.rubric.subcopy')}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-x-12 mb-14"
          >
            {RUBRIC.map((d, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                className={`flex gap-4 py-6 border-slate-800 ${
                  idx > 0 ? 'border-t' : ''
                } ${idx === 1 ? 'md:border-t-0' : ''}`}
              >
                <span className="font-mono text-sm tabular-nums text-slate-500 pt-0.5 shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-white leading-tight mb-1">
                    {t(`howToAce.rubric.d${d.n}Label`)}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {t(`howToAce.rubric.d${d.n}Body`)}
                  </p>
                  <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-500">
                    {t('howToAce.rubric.scoredNote')}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Band legend */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="grid sm:grid-cols-3 gap-4 mb-12"
          >
            {[
              { key: 'NeedsWork', color: 'rose' },
              { key: 'Almost', color: 'amber' },
              { key: 'Ready', color: 'emerald' },
            ].map((b, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-6 border ${
                  b.color === 'rose'
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : b.color === 'amber'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <div
                  className={`font-heading text-2xl font-bold mb-1 ${
                    b.color === 'rose'
                      ? 'text-rose-300'
                      : b.color === 'amber'
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                  }`}
                >
                  {t(`howToAce.rubric.band${b.key}`)}
                </div>
                <div className="text-sm font-semibold text-slate-400 mb-3">
                  {t(`howToAce.rubric.band${b.key}Range`)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {t(`howToAce.rubric.band${b.key}Body`)}
                </p>
              </div>
            ))}
          </motion.div>

          {/* The fine print that actually helps */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="max-w-3xl mx-auto space-y-4 text-slate-300"
          >
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-start gap-3">
                <CheckCircle className="text-indigo-400 shrink-0 mt-1" size={20} />
                <p className="leading-relaxed">
                  <span className="font-semibold text-white">
                    {t(`howToAce.rubric.fp${n}Bold`)}
                  </span>{' '}
                  {t(`howToAce.rubric.fp${n}Body`)}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why practise with the conversational interview */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-16 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              {t('howToAce.practice.kicker')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('howToAce.practice.title')}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t('howToAce.practice.subcopy')}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              { icon: Mic, n: 1 },
              { icon: Briefcase, n: 2 },
              { icon: Users, n: 3 },
              { icon: SlidersHorizontal, n: 4 },
              { icon: ClipboardCheck, n: 5 },
              { icon: Trophy, n: 6 },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.n}
                  variants={fadeIn}
                  className="rounded-xl border border-slate-200 p-7"
                >
                  <Icon size={22} className="text-indigo-600 mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {t(`howToAce.practice.f${f.n}Title`)}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {t(`howToAce.practice.f${f.n}Body`)}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Primary CTA — flat ink band with a bare Bot on the right */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-12"
          >
            {/* Copy */}
            <div className="flex flex-col items-start">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-300 mb-4">
                {t('howToAce.finalCta.kicker')}
              </p>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-white">
                {t('howToAce.finalCta.title')}
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-[52ch]">
                {t('howToAce.finalCta.subcopy')}
              </p>
              <button
                onClick={startInterview}
                className="inline-flex items-center gap-2 bg-white text-indigo-800 hover:bg-slate-100 hover:-translate-y-0.5 py-4 px-8 rounded-md shadow-sm font-bold text-lg transition-all"
              >
                {t('howToAce.hero.cta')}
                <ArrowRight size={22} />
              </button>
              <p className="mt-5 text-sm text-slate-400">{t('howToAce.finalCta.freeNote')}</p>
            </div>

            {/* ApplyRight AI bot — decorative balance, hidden on mobile */}
            <div
              aria-hidden="true"
              className="hidden md:grid place-items-center text-indigo-300/90"
              style={{ width: 'clamp(120px, 15vw, 190px)' }}
            >
              <Bot strokeWidth={1.5} className="w-full h-auto" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-10 md:mb-12 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              {t('howToAce.faq.kicker')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t('howToAce.faq.title')}
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {[1, 2, 3, 4, 5].map((n, idx) => (
              <motion.div
                key={n}
                variants={fadeIn}
                className={`py-7 ${idx > 0 ? 'border-t border-slate-200' : ''}`}
              >
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {t(`howToAce.faq.q${n}Q`)}
                </h3>
                <p className="text-slate-600 leading-relaxed">{t(`howToAce.faq.q${n}A`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HowToAceYourInterview;
