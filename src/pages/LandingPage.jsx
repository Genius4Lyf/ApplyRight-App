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
  Sparkles,
} from 'lucide-react';
import logo from '../assets/logo/applyright-icon.png';
import Seo from '../components/Seo';
import { motion, useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion';
import axios from 'axios';
import FeedbackCard from '../components/FeedbackCard';
import LiveInterviewCard from '../components/landing/LiveInterviewCard';
import RewriteLedger from '../components/landing/RewriteLedger';

const LandingPage = () => {
  const reduce = useReducedMotion();

  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

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

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 50);
  });

  // Animation Variants (used by the sections below the hero)
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
  };

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
        {/* Floating Navigation */}
        <motion.nav
          initial={{
            width: '100%',
            top: 0,
            borderRadius: 0,
            borderBottomWidth: 0,
            borderBottomColor: 'rgba(241, 245, 249, 0)',
            backgroundColor: 'rgba(255, 255, 255, 0)',
            backdropFilter: 'blur(0px)',
          }}
          animate={
            scrolled
              ? {
                  width: '90%',
                  maxWidth: '1080px',
                  top: 20,
                  borderRadius: '100px',
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(241, 245, 249, 1)', // visible border when floating
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(12px)',
                  boxShadow:
                    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                }
              : {
                  width: '100%',
                  maxWidth: '100%',
                  top: 0,
                  borderRadius: 0,
                  borderBottomWidth: 0,
                  borderBottomColor: 'rgba(241, 245, 249, 0)',
                  backgroundColor: 'rgba(255, 255, 255, 0)',
                  backdropFilter: 'blur(0px)',
                  boxShadow: 'none',
                }
          }
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`fixed z-50 left-0 right-0 mx-auto overflow-hidden`}
        >
          <div
            className={`mx-auto h-16 flex items-center justify-between transition-all duration-300 ${scrolled ? 'px-4 md:px-6' : 'max-w-7xl px-6'}`}
          >
            <Link to="/" className="flex items-center gap-2 group">
              <img src={logo} alt="ApplyRight Logo" className="h-8 w-auto" />
              <span className="font-heading text-xl font-bold tracking-tight text-slate-900">
                Apply<span className="text-indigo-600">Right</span>
              </span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                to="/pricing"
                className="hidden text-sm text-slate-600 transition-colors hover:text-slate-900 sm:block"
              >
                Pricing
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-[44px] items-center text-sm text-slate-600 transition-colors hover:text-slate-900"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-md border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:border-indigo-800 hover:bg-indigo-800"
              >
                Start free
              </Link>
            </div>
          </div>
        </motion.nav>

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

        {/* ADVANCED FEATURES SECTION: Next-Gen Tools */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="py-24 bg-slate-50/80 backdrop-blur-sm border-y border-slate-200 relative overflow-hidden"
        >
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:16px_16px]"></div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-indigo-600 font-semibold tracking-wide uppercase text-sm mb-3 flex items-center justify-center gap-1.5">
                <Sparkles size={16} className="text-indigo-500 animate-pulse" /> Advanced Job-Prep
                Suite
              </h2>
              <h3 className="text-3xl md:text-5xl font-bold text-slate-900">
                Go Beyond the Simple Resume
              </h3>
              <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto">
                ApplyRight gives you a full toolkit designed by career experts to make sure you
                dominate every step of the hiring pipeline, from CV scoring to the final call.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* Feature 1: STAR Story Bank */}
              <div className="p-8 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">
                    Grounded STAR Story Bank
                  </h4>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Prep like top candidates actually do. Generate a bank of reusable STAR-formatted
                    stories (Situation, Task, Action, Result) built from your real experience. Each
                    story is verified by AI for claims consistency and linked directly to relevant
                    interview questions.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500 pt-4 border-t border-slate-100">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                    CV-Grounded Stories
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-full">
                    STAR Method Formatting
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-full">Claim Verification</span>
                </div>
              </div>

              {/* Feature 2: Voice-Enabled Interview Simulator */}
              <div className="p-8 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 mb-6 group-hover:scale-110 transition-transform">
                    <Volume2 size={24} />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">
                    Interactive Voice Interview Mode
                  </h4>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Simulate real interview pressure. Our AI interviewer reads questions aloud using
                    premium ElevenLabs & OpenAI TTS voice synthesis. Practice verbally with
                    question-by-question suggestion timers, rate your own confidence, and receive
                    targeted coaching reviews.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500 pt-4 border-t border-slate-100">
                  <span className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full">
                    Premium TTS (ElevenLabs)
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-full">
                    Timed Verbal Simulation
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-full">Coaching Review</span>
                </div>
              </div>

              {/* Feature 3: 10-Minute Pre-Call Brief */}
              <div className="p-8 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                    <Printer size={24} />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">
                    The 10-Minute Pre-Call Brief
                  </h4>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Never walk in cold. Generate a print-friendly, single-page cram sheet containing
                    your overall readiness score, your top 3 STAR stories, your weakest questions to
                    review, key skills to highlight, and questions to ask the interviewer.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500 pt-4 border-t border-slate-100">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                    Print-Optimized / Save PDF
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-full">Quick Cram Sheet</span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-full">Readiness Rollup</span>
                </div>
              </div>

              {/* Feature 4: CV Comparison Studio */}
              <div className="p-8 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mb-6 group-hover:scale-110 transition-transform">
                    <GitCompare size={24} />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">CV Comparison Studio</h4>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Compare two iterations of your CV side-by-side to target a specific job. See a
                    detailed breakdown of which CV scores higher in each dimension, which must-have
                    skills are missing, and exactly what updates increased your fit score.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500 pt-4 border-t border-slate-100">
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full">
                    Side-by-Side Analysis
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-full">
                    Score Breakdown Diff
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-full">
                    Target Job Benchmarking
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* What Users Say Section */}
        {featuredFeedbacks.length >= 3 && (
          <section className="py-24 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-indigo-600 font-semibold tracking-wide uppercase text-sm mb-3">
                  Community Love
                </h2>
                <h3 className="text-3xl md:text-5xl font-bold text-slate-900">What Users Say</h3>
                <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
                  Join thousands of satisfied job seekers who have transformed their careers with
                  ApplyRight.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredFeedbacks.map((feedback, index) => (
                  <FeedbackCard
                    key={feedback._id}
                    feedback={feedback}
                    index={index}
                    hideActions={true}
                  />
                ))}
              </div>

              <div className="mt-16 text-center">
                <Link
                  to="/feedback"
                  className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 hover:gap-3 transition-all"
                >
                  Share your story <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-20 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              Stop Guessing. Start Interviewing.
            </h2>
            <p className="text-xl text-indigo-200 mb-10">
              Join thousands of job seekers who stopped fighting the system and started making it
              work for them.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center bg-white text-indigo-900 hover:bg-indigo-50 font-bold py-4 px-10 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Create Free Account
            </Link>
            <p className="mt-6 text-sm text-slate-500">
              No credit card required • Optimized specifically for ATS
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-8 border-b border-slate-100 dark:border-slate-800 mb-8">
              <div className="flex items-center gap-2">
                <img src={logo} alt="ApplyRight Logo" className="h-6 w-auto" />
                <span className="text-lg font-bold text-slate-900">ApplyRight</span>
              </div>

              <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-600 justify-center">
                <Link to="/pricing" className="hover:text-indigo-600 transition-colors">
                  Pricing
                </Link>
                <Link to="/privacy" className="hover:text-indigo-600 transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="hover:text-indigo-600 transition-colors">
                  Terms of Service
                </Link>
                <Link to="/contact" className="hover:text-indigo-600 transition-colors">
                  Contact Us
                </Link>
                <Link to="/feedback" className="hover:text-indigo-600 transition-colors">
                  Give Feedback
                </Link>
                <Link to="/ats-guide" className="hover:text-indigo-600 transition-colors">
                  ATS Guide
                </Link>
                <Link
                  to="/how-ats-recruiters-work"
                  className="hover:text-indigo-600 transition-colors"
                >
                  How ATS &amp; Recruiters Work
                </Link>
                <Link
                  to="/how-to-ace-your-interview"
                  className="hover:text-indigo-600 transition-colors"
                >
                  How to Ace Your Interview
                </Link>
              </div>

              <div className="text-slate-500 text-sm">
                © {new Date().getFullYear()} ApplyRight. All rights reserved.
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed text-center max-w-3xl mx-auto">
              <strong>Disclaimer:</strong> ApplyRight is an interview preparation tool. All mock
              sessions, voice conversations, and generated questions are designed solely for
              practice and confidence-building purposes. The questions simulated in our application
              are illustrative and do not guarantee the actual questions that will be encountered in
              your live hiring process.
            </p>
          </div>
        </footer>
      </div>
    </motion.div>
  );
};

export default LandingPage;
