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

// Advanced Features — alternating editorial rows. Copy preserved verbatim.
const FEATURES = [
  {
    icon: BookOpen,
    kicker: 'Interview prep · Story bank',
    title: 'Grounded STAR Story Bank',
    body: 'Prep like top candidates actually do. Generate a bank of reusable STAR-formatted stories (Situation, Task, Action, Result) built from your real experience. Each story is verified by AI for claims consistency and linked directly to relevant interview questions.',
    tags: ['CV-Grounded Stories', 'STAR Method Formatting', 'Claim Verification'],
    Vignette: StarStoryVignette,
  },
  {
    icon: Volume2,
    kicker: 'Interview prep · Live voice',
    title: 'Interactive Voice Interview Mode',
    body: 'Simulate real interview pressure. Our AI interviewer reads questions aloud using premium ElevenLabs & OpenAI TTS voice synthesis. Practice verbally with question-by-question suggestion timers, rate your own confidence, and receive targeted coaching reviews.',
    tags: ['Premium TTS (ElevenLabs)', 'Timed Verbal Simulation', 'Coaching Review'],
    Vignette: VoiceInterviewVignette,
  },
  {
    icon: Printer,
    kicker: 'Interview prep · Cram sheet',
    title: 'The 10-Minute Pre-Call Brief',
    body: 'Never walk in cold. Generate a print-friendly, single-page cram sheet containing your overall readiness score, your top 3 STAR stories, your weakest questions to review, key skills to highlight, and questions to ask the interviewer.',
    tags: ['Print-Optimized / Save PDF', 'Quick Cram Sheet', 'Readiness Rollup'],
    Vignette: PreCallBriefVignette,
  },
  {
    icon: GitCompare,
    kicker: 'CV tools · Compare',
    title: 'CV Comparison Studio',
    body: 'Compare two iterations of your CV side-by-side to target a specific job. See a detailed breakdown of which CV scores higher in each dimension, which must-have skills are missing, and exactly what updates increased your fit score.',
    tags: ['Side-by-Side Analysis', 'Score Breakdown Diff', 'Target Job Benchmarking'],
    Vignette: CvCompareVignette,
  },
];

const LandingPage = () => {
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
      <Seo
        title="ApplyRight - AI Resume Builder & CV Optimizer for Job Seekers"
        description="Beat the ATS with ApplyRight. Our AI-driven resume builder tailors your CV to specific job descriptions, helping you land more interviews. Try it free."
      />

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
                AI résumé · ATS score · live mock interview
              </motion.p>

              <motion.h1
                variants={heroItem}
                className="font-heading text-[2.5rem] font-bold leading-[1.05] tracking-tight text-slate-900 text-balance sm:text-6xl lg:text-[4.3rem]"
              >
                Win on paper. Then win{' '}
                <span className="relative whitespace-nowrap text-indigo-600">
                  the room.
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
                ApplyRight rewrites your CV to clear the ATS, scores it against the exact job you
                want, then puts you through a real-time AI interview — so you walk in already
                rehearsed.
              </motion.p>

              <motion.div
                variants={heroItem}
                className="flex flex-wrap items-center gap-x-6 gap-y-4"
              >
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-800 hover:bg-indigo-800"
                >
                  Start free
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-1.5 border-b-2 border-indigo-600 pb-0.5 font-semibold text-slate-900 transition-colors hover:text-indigo-800"
                >
                  Hear a sample interview <ArrowRight size={16} />
                </Link>
              </motion.div>

              <motion.p
                variants={heroItem}
                className="font-mono text-[0.72rem] tracking-[0.04em] text-slate-600"
              >
                <b className="font-medium text-indigo-800">1 free CV download</b> · no card needed
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
                The invisible barrier
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                Why good candidates get rejected
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">
                Most rejections aren&rsquo;t a human decision — they happen before anyone reads a
                word you wrote.
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
                  Typical process
                </p>

                {/* Stage 01 — you apply */}
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                    <FileText size={18} />
                  </span>
                  <div className="pt-0.5">
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate-400">
                      Stage 01
                    </p>
                    <h3 className="font-semibold text-slate-700">You apply</h3>
                    <p className="text-sm leading-relaxed text-slate-500">Generic résumé sent.</p>
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
                      Stage 02
                    </p>
                    <h3 className="font-semibold text-red-700">ATS filter — auto-reject</h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Scans for the exact keywords in the job description.{' '}
                      <span className="font-semibold text-red-600">No match? Rejected</span> before
                      a human looks.
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
                      Stage 03
                    </p>
                    <h3 className="font-semibold text-slate-700">Human review</h3>
                    <p className="text-sm leading-relaxed text-slate-500">
                      Never happens — a person never sees your résumé.
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
                  It&rsquo;s not your skills that get you rejected. It&rsquo;s your{' '}
                  <span className="text-indigo-600">keywords.</span>
                </motion.p>

                <motion.div variants={revealUp} className="border-l-2 border-indigo-600 pl-5">
                  <h3 className="font-heading text-lg font-bold text-slate-900">What is an ATS?</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">
                    Applicant Tracking Systems screen applications at{' '}
                    <b className="font-semibold text-indigo-800">99% of Fortune 500</b> companies,
                    filtering thousands automatically. If your résumé doesn&rsquo;t{' '}
                    <span className="font-semibold text-slate-900">exactly match</span> the language
                    of the job description, you&rsquo;re filtered out before a human ever clicks
                    &ldquo;Open&rdquo;.
                  </p>
                </motion.div>

                <motion.div variants={revealUp} className="border-l-2 border-indigo-600 pl-5">
                  <h3 className="font-heading text-lg font-bold text-slate-900">
                    The &ldquo;spray and pray&rdquo; mistake
                  </h3>
                  <p className="mt-2 leading-relaxed text-slate-600">
                    Sending the same generic CV to 100 jobs guarantees 100 rejections. Each job
                    description is unique, with its own required skills and &ldquo;magic
                    words&rdquo;.
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
                The fix
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                We tailor your CV for every single job.
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">
                Three moves that turn a generic résumé into one the software waves through.
              </p>
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
                  We scan the job
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600">
                  Paste the job link. Our AI reads it like an ATS would, finding the critical
                  keywords, skills, and requirements hidden in the text.
                </p>
              </motion.div>

              <motion.div
                variants={revealUp}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-clean transition-colors hover:border-slate-300 sm:p-7"
              >
                <p className="font-mono text-sm font-bold tracking-[0.08em] text-indigo-600">02</p>
                <h3 className="mt-3 font-heading text-xl font-bold text-slate-900">
                  We re-write your CV
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600">
                  We don&rsquo;t just add keywords. We rewrite your bullet points to highlight the{' '}
                  <em>relevant</em> experience that matches <em>this specific job</em>.
                </p>
              </motion.div>

              <motion.div
                variants={revealUp}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-clean transition-colors hover:border-slate-300 sm:p-7"
              >
                <p className="font-mono text-sm font-bold tracking-[0.08em] text-indigo-600">03</p>
                <h3 className="mt-3 font-heading text-xl font-bold text-slate-900">
                  You pass the filter
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600">
                  You get a tailored PDF for that specific application. The ATS sees a 95%+ match,
                  and your résumé lands on the recruiter&rsquo;s desk.
                </p>
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
                Advanced job-prep suite
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                Go beyond the simple resume.
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">
                ApplyRight gives you a full toolkit designed by career experts to make sure you
                dominate every step of the hiring pipeline, from CV scoring to the final call.
              </p>
            </motion.div>

            <div className="flex flex-col gap-16 sm:gap-20">
              {FEATURES.map((f, i) => {
                const Vignette = f.Vignette;
                const Icon = f.icon;
                const reverse = i % 2 === 1;
                return (
                  <motion.div
                    key={f.title}
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
                        {f.kicker}
                      </p>
                      <h3 className="font-heading text-2xl font-bold leading-snug text-slate-900 sm:text-[1.7rem]">
                        {f.title}
                      </h3>
                      <p className="leading-relaxed text-slate-600">{f.body}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {f.tags.map((tag, ti) => (
                          <span
                            key={tag}
                            className={`rounded border px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wide ${
                              ti === 0
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                                : 'border-slate-200 text-slate-500'
                            }`}
                          >
                            {tag}
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
                  Community
                </p>
                <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.7rem]">
                  What users say
                </h2>
                <p className="text-lg leading-relaxed text-slate-600">
                  Join thousands of satisfied job seekers who have transformed their careers with
                  ApplyRight.
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
                  Share your story <ArrowRight size={16} />
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
                  One shot at a first impression
                </p>
                <h2 className="max-w-[20ch] font-heading text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.7rem]">
                  Stop guessing. Start interviewing.
                </h2>
                <p className="max-w-[52ch] text-lg leading-relaxed text-slate-400">
                  Join thousands of job seekers who stopped fighting the system and started making
                  it work for them.
                </p>
                <Link
                  to="/register"
                  className="mt-1 inline-flex items-center rounded-md bg-white px-5 py-2.5 font-semibold text-indigo-800 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  Create free account
                </Link>
                <p className="font-mono text-[0.72rem] tracking-[0.04em] text-slate-500">
                  No credit card required · Optimized specifically for ATS
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
