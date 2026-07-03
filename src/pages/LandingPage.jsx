import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  FileText,
  Search,
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle,
  PenTool,
  Mic,
  Volume2,
  BookOpen,
  Printer,
  GitCompare,
  Sparkles,
  Clock,
} from 'lucide-react';
import logo from '../assets/logo/applyright-icon.png';
import Seo from '../components/Seo';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import axios from 'axios';
import FeedbackCard from '../components/FeedbackCard';

const TiltStack = () => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [15, -15]); // Reduced rotation for subtlety
  const rotateY = useTransform(x, [-100, 100], [-15, 15]);

  function handleMouse(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left - rect.width / 2);
    y.set(event.clientY - rect.top - rect.height / 2);
  }

  return (
    <motion.div
      style={{ perspective: 1000 }}
      onMouseMove={handleMouse}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="relative h-[500px] flex items-center justify-center order-1 lg:order-2 cursor-pointer"
    >
      {/* Abstract Decor */}
      <div className="absolute inset-0 bg-indigo-50/50 rounded-full blur-3xl scale-75 pointer-events-none"></div>

      {/* Tilt Container */}
      <motion.div
        style={{ rotateX, rotateY, z: 100, transformStyle: 'preserve-3d' }}
        className="relative w-[300px] h-[400px]"
      >
        {/* Card 1 (Back Left) */}
        <motion.div
          initial={{ x: 0, y: 0, rotate: 0 }}
          whileInView={{ x: -60, y: 10, rotate: -12 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute inset-0 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
          style={{ transform: 'translateZ(-40px)' }}
        >
          <div className="h-4 bg-indigo-50 w-full mb-4"></div>
          <div className="px-6 space-y-3 opacity-40">
            <div className="flex gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-slate-200"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-2 bg-slate-100 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded w-full"></div>
            <div className="h-2 bg-slate-100 rounded w-5/6"></div>
          </div>
        </motion.div>

        {/* Card 2 (Back Right) */}
        <motion.div
          initial={{ x: 0, y: 0, rotate: 0 }}
          whileInView={{ x: 60, y: -10, rotate: 12 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute inset-0 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
          style={{ transform: 'translateZ(-20px)' }}
        >
          <div className="px-6 py-8 opacity-40">
            <div className="w-16 h-16 rounded-lg bg-indigo-50 mb-6 mx-auto"></div>
            <div className="space-y-4">
              <div className="h-3 bg-slate-200 rounded w-full"></div>
              <div className="h-2 bg-slate-200 rounded w-5/6 mx-auto"></div>
            </div>
          </div>
        </motion.div>

        {/* Card 3 (Center Front - Main) */}
        <div
          className="absolute inset-0 bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(79,70,229,0.3)] border border-slate-100 overflow-hidden z-20"
          style={{ transform: 'translateZ(20px)' }}
        >
          {/* Header */}
          <div className="p-8 border-b border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xl ring-4 ring-indigo-50 shadow-inner">
              AR
            </div>
            <div>
              <div className="h-4 bg-slate-800 rounded w-32 mb-2"></div>
              <div className="h-2 bg-indigo-100 rounded w-24"></div>
            </div>
          </div>
          {/* Body */}
          <div className="p-8 space-y-6">
            {/* Experience Block */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-3 bg-slate-200 rounded w-24"></div>
                <div className="h-3 bg-slate-100 rounded w-12"></div>
              </div>
              <div className="h-2 bg-slate-100 rounded w-full"></div>
              <div className="h-2 bg-slate-100 rounded w-11/12"></div>
              <div className="h-2 bg-indigo-50 rounded w-10/12"></div>
            </div>

            {/* Experience Block 2 */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-3 bg-slate-200 rounded w-28"></div>
                <div className="h-3 bg-slate-100 rounded w-12"></div>
              </div>
              <div className="h-2 bg-slate-100 rounded w-full"></div>
              <div className="h-2 bg-slate-100 rounded w-11/12"></div>
            </div>

            <div className="pt-4 flex gap-2">
              <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
              <div className="h-6 w-20 bg-slate-100 rounded-full"></div>
              <div className="h-6 w-12 bg-indigo-100 rounded-full text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                100%
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 shadow-sm flex items-center gap-1">
            <CheckCircle size={10} /> ATS Verified
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [init, setInit] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const phrases = ['the ATS', 'the Robots', 'the Black Hole', 'Rejection'];

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

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // Animation Variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
  };

  const ParticleBackground = React.memo(({ init }) => {
    const particlesOptions = useMemo(
      () => ({
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        fpsLimit: 120,
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'repulse' },
            onClick: { enable: true, mode: 'push' },
            resize: true,
          },
          modes: {
            repulse: { distance: 100, duration: 0.4 },
            push: { quantity: 4 },
          },
        },
        particles: {
          color: { value: '#4F46E5' }, // Indigo
          links: { color: '#4F46E5', distance: 150, enable: true, opacity: 0.4, width: 1 },
          move: {
            enable: true,
            speed: 1, // Smooth continuous flow
            direction: 'none',
            random: false,
            straight: false,
            outModes: 'out',
          },
          number: { density: { enable: true, area: 800 }, value: 80 },
          opacity: { value: 0.5 },
          shape: { type: 'circle' },
          size: { value: { min: 1, max: 4 } },
        },
      }),
      []
    );

    if (!init) return null;

    return <Particles id="tsparticles" className="absolute inset-0" options={particlesOptions} />;
  });

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

      {/* Fixed Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Solid Background Base */}
        <div className="absolute inset-0 bg-white"></div>

        {/* Ambient Light Blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/60 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-50/60 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-70"></div>

        {/* Particles */}
        <ParticleBackground init={init} />
      </div>

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
              <span className="text-xl font-bold font-heading text-slate-900">ApplyRight</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/pricing"
                className="hidden sm:block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center min-h-[44px] px-3 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn-primary py-2 px-4 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 lg:pt-40 lg:pb-24 relative px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-8">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Did you know? 75% of resumes are never read.
              <a
                href="#education"
                className="ml-1 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900 transition-colors"
              >
                Find out why
              </a>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-heading tracking-tight text-slate-900 mb-6 leading-tight">
              Beat{' '}
              <span className="inline-flex justify-center min-w-[1ch]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={textIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 px-2"
                  >
                    {phrases[textIndex]}.
                  </motion.span>
                </AnimatePresence>
              </span>
              <br className="hidden md:block" />
              Land Your Dream Job with AI.
            </h1>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              The "Resume Black Hole" isn't bad luck—it's technology.{' '}
              <br className="hidden md:block" />
              We teach you how the system works, then we give you the tool to beat it.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="btn-primary py-4 px-8 text-lg w-full sm:w-auto bg-indigo-600 text-white rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all"
              >
                Optimize My CV Free
              </Link>
              <Link
                to="/how-it-works"
                className="btn-secondary py-4 px-8 text-lg w-full sm:w-auto border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all"
              >
                How ApplyRight AI Works
              </Link>
            </div>
          </motion.div>
        </section>

        {/* EDUCATIONAL SECTION: The Problem */}
        <motion.section
          id="education"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="py-24 bg-slate-50/80 backdrop-blur-sm border-y border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-indigo-600 font-semibold tracking-wide uppercase text-sm mb-3">
                The Invisible Barrier
              </h2>
              <h3 className="text-3xl md:text-5xl font-bold text-slate-900">
                Why Good Candidates Get Rejected
              </h3>
              <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto">
                It's not about your skills. It's about your keywords.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* The Diagram Visual */}
              <div className="relative bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="absolute -top-4 -right-4 bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold text-sm shadow-sm rotate-3">
                  TYPICAL PROCESS
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 opacity-50">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <FileText className="text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-700">You apply</h4>
                      <p className="text-sm text-slate-500">Generic Resume sent</p>
                    </div>
                  </div>
                  <div className="h-8 border-l-2 border-dashed border-slate-200 ml-6"></div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center relative">
                      <Search className="text-red-600" />
                      <div className="absolute -right-1 -top-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div className="flex-1 p-4 bg-red-50 rounded-lg border border-red-100">
                      <h4 className="font-bold text-red-900">ATS Filtration (The Killer)</h4>
                      <p className="text-sm text-red-700 mt-1">
                        The bot scans for specific keywords from the Job Description. <br />
                        <strong>No match? Auto-Reject.</strong>
                      </p>
                    </div>
                  </div>
                  <div className="h-8 border-l-2 border-dashed border-slate-200 ml-6"></div>

                  <div className="flex items-center gap-4 opacity-30 grayscale">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <XCircle className="text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-700">Human Review</h4>
                      <p className="text-sm text-slate-500">Never sees your resume.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* The Explanation */}
              <div className="space-y-8">
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="text-indigo-600" /> What is an ATS?
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Applicant Tracking Systems (ATS) are software used by 99% of Fortune 500
                    companies. They filter thousands of applications automatically. If your resume
                    doesn't <span className="font-semibold text-slate-900">exactly match</span> the
                    language of the job description, you are filtered out before a human ever clicks
                    "Open".
                  </p>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="text-indigo-600" /> The "Spray and Pray" Mistake
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Sending the same generic CV to 100 jobs guarantees 100 rejections. Each job
                    description is unique, with its own required skills and "magic words".
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* SOLUTION SECTION: "Why ApplyRight" */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="py-24 relative"
        >
          {/* Add a subtle glass effect or just keep transparent (particles visible) */}
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-indigo-600 font-semibold tracking-wide uppercase text-sm mb-3">
                The Solution
              </h2>
              <h3 className="text-3xl md:text-5xl font-bold text-slate-900">
                We Tailor Your CV for Every Single Job.
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="p-8 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all group">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                  <Search size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">1. We Scan the Job</h4>
                <p className="text-slate-600">
                  Paste the job link. Our AI reads it like an ATS would, finding the critical
                  keywords, skills, and requirements hidden in the text.
                </p>
              </div>

              <div className="p-8 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all group">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                  <Zap size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">2. We Re-Write Your CV</h4>
                <p className="text-slate-600">
                  We don't just add keywords. We rewrite your bullet points to highlight the{' '}
                  <em>relevant</em> experience that matches <em>this specific job</em>.
                </p>
              </div>

              <div className="p-8 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all group">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                  <CheckCircle size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">3. You Pass the Filter</h4>
                <p className="text-slate-600">
                  You get a tailored PDF for that specific application. The ATS sees a 95%+ match,
                  and your resume lands on the recruiter's desk.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

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
