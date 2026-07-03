import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  User,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Sparkles,
  AlignLeft,
  CheckCircle2,
  Activity,
  Gauge,
  ScanSearch,
  Wand2,
  LayoutTemplate,
  PlayCircle,
  Video,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Seo from '../components/Seo';
import { Link } from 'react-router-dom';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

/* ───────────────────────────────────────────────────────────────────────────
 * THE 8-STEP WALKTHROUGH — each step has its OWN short video tutorial.
 * These mirror the real builder steps: target-job → heading → history →
 * projects → education → skills → summary → finalize.
 *
 * ── HOW TO ADD A VIDEO TO A STEP ──────────────────────────────────────────
 *   1. Upload the step's video to YouTube (it can be "Unlisted" if you don't
 *      want it on your public channel — the embed still works).
 *   2. Copy the 11-character video ID from the URL:
 *        https://www.youtube.com/watch?v=dQw4w9WgXcQ   →  id is "dQw4w9WgXcQ"
 *        https://youtu.be/dQw4w9WgXcQ                  →  id is "dQw4w9WgXcQ"
 *   3. Paste it into the `youtubeId` field of THAT step below.
 *
 * While a step's `youtubeId` is empty (''), it shows a small "Video coming
 * soon" placeholder instead — so the page never looks broken before a video
 * is ready. You can publish the videos one step at a time, in any order.
 * ─────────────────────────────────────────────────────────────────────────── */
const STEPS = [
  {
    icon: Target,
    youtubeId: '', // ← paste this step's YouTube ID here, e.g. 'dQw4w9WgXcQ'
    title: 'Target Job',
    body: 'Start here. Paste the job title, company, and the full job description. Everything downstream — the ATS Coach, keyword matching, and AI suggestions — is tailored to this role. Skipping it means generic advice, so always fill it in first.',
  },
  {
    icon: User,
    youtubeId: '',
    title: 'Heading',
    body: 'Your name, professional title, location, and contact details. Keep the title aligned with the role you’re targeting so recruiters see relevance at a glance.',
  },
  {
    icon: Briefcase,
    youtubeId: '',
    title: 'History',
    body: 'Add each role with 2–4 bullets. Lead with impact, not duties. Use the AI suggestions to rephrase plain tasks into quantified, recruiter-friendly lines — then edit them to stay 100% truthful.',
  },
  {
    icon: FolderGit2,
    youtubeId: '',
    title: 'Projects',
    body: 'Optional but powerful — especially early in your career. Show real work: what you built, the tools you used, and the outcome. Great for filling gaps when your job history is short.',
  },
  {
    icon: GraduationCap,
    youtubeId: '',
    title: 'Education',
    body: 'Degrees, certifications, and relevant coursework. Place it below experience once you have a couple of roles; keep it near the top while you’re a recent graduate.',
  },
  {
    icon: Sparkles,
    youtubeId: '',
    title: 'Skills',
    body: 'Use Auto-fill to generate a role-matched list of skills. Review every suggestion and add only the ones you genuinely have — the modal lets you curate before anything is saved.',
  },
  {
    icon: AlignLeft,
    youtubeId: '',
    title: 'Summary',
    body: 'A 2–3 line professional summary. Generate it in the tone that fits the role and your seniority, then tweak the wording so it sounds like you.',
  },
  {
    icon: CheckCircle2,
    youtubeId: '',
    title: 'Review & Finalize',
    body: 'A final pass before export. Aim for a high CV Health score, pick your template, and download a clean, ATS-friendly PDF. This is also where a Deep Scan gives you the deepest pre-submission check.',
  },
];

/* ───────────────────────────────────────────────────────────────────────────
 * ATS COACH — the live panel that sits beside the builder.
 * ─────────────────────────────────────────────────────────────────────────── */
const COACH_FEATURES = [
  {
    icon: Gauge,
    tag: 'Free · Live',
    title: 'CV Health score',
    body: 'A live 0–100 score that updates as you type, broken down section by section so you always know what’s strong and what still needs work.',
  },
  {
    icon: Activity,
    tag: 'Free · Live',
    title: 'Role Match honesty band',
    body: 'An honest signal of how well your CV actually fits the target job — so a “complete” CV doesn’t fool you into thinking it’s a great fit when it isn’t.',
  },
  {
    icon: ScanSearch,
    tag: 'Deep Scan',
    title: 'Job Match & missing keywords',
    body: 'Unlocks at 100% complete. The Deep Scan reads the job description, surfaces matched vs. missing keywords, flags red flags, and gives you a concrete action plan. One free Deep Scan to taste; unlimited on a paid plan.',
  },
];

/* ───────────────────────────────────────────────────────────────────────────
 * PRO TIPS — quick wins.
 * ─────────────────────────────────────────────────────────────────────────── */
const TIPS = [
  {
    icon: Wand2,
    title: 'Let AI draft, then you edit',
    body: 'AI suggestions are a fast first draft — never the final word. Always edit for truth and your own voice before applying.',
  },
  {
    icon: ScanSearch,
    title: 'Chase the keywords, not the score',
    body: 'A high CV Health score means complete; a Deep Scan tells you what recruiters are actually searching for. Use both together.',
  },
  {
    icon: LayoutTemplate,
    title: 'Keep templates clean',
    body: 'A single-column, plain-text-friendly template parses best. Save the heavy graphics for your portfolio, not your CV.',
  },
];

const CVBuilderGuide = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Seo
        title="How to Get the Best of the ApplyRight CV Builder"
        description="A complete guide and video tutorials for the ApplyRight CV Builder — the 8-step flow, the live ATS Coach, Deep Scan keyword matching, AI bullets and skills, templates, and pro tips."
      />
      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-60"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Your CV Builder playbook
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
              Get the Best of the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">
                CV Builder
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-4 leading-relaxed">
              Watch the video tutorials, follow the step-by-step guide, and learn how the live ATS
              Coach turns your real experience into a CV recruiters actually find.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 8-step walkthrough — each step has its own video */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold mb-4">
              <Video size={16} />
              Step-by-step video tutorials
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              The 8-Step Flow, Explained
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              The builder guides you through eight steps in order. Watch the short video for each
              one, then read the tips below it.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={idx}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:border-indigo-100 transition-all"
                >
                  {/* Per-step video — 16:9 responsive frame */}
                  <div className="relative w-full aspect-video bg-slate-100">
                    {step.youtubeId ? (
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube-nocookie.com/embed/${step.youtubeId}`}
                        title={`Step ${idx + 1}: ${step.title}`}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <PlayCircle size={40} className="mb-2" />
                        <span className="text-sm font-semibold">Video coming soon</span>
                      </div>
                    )}
                  </div>

                  {/* Step copy */}
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <Icon size={24} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-indigo-600">Step {idx + 1}</div>
                        <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{step.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ATS Coach */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Your Live ATS Coach
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              As you build, a coaching panel scores your CV in real time and tells you exactly what
              to fix next.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {COACH_FEATURES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Icon size={28} />
                    </div>
                    <span className="text-xs font-bold py-1 px-3 rounded-full bg-slate-100 text-slate-600">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pro tips */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-amber-100 text-amber-700 text-sm font-bold mb-4">
              <Lightbulb size={16} />
              Pro tips
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Quick Wins</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Small habits that make a big difference to how your CV performs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {TIPS.map((tip, idx) => {
              const Icon = tip.icon;
              return (
                <motion.div
                  key={idx}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100"
                >
                  <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mb-6 text-amber-600">
                    <Icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{tip.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{tip.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to build yours?</h2>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              Put the guide into practice. Create your CV, watch your CV Health score climb, and
              download an ATS-ready PDF — your first one is free.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-8 rounded-xl shadow-lg font-semibold transition-colors"
            >
              Start building free
              <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <span className="text-lg font-bold text-slate-900">ApplyRight</span>
            <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-600 justify-center">
              <Link to="/ats-guide" className="hover:text-indigo-600 transition-colors">
                ATS Guide
              </Link>
              <Link
                to="/how-ats-recruiters-work"
                className="hover:text-indigo-600 transition-colors"
              >
                How ATS Works
              </Link>
              <Link to="/contact" className="hover:text-indigo-600 transition-colors">
                Contact Us
              </Link>
              <Link to="/privacy" className="hover:text-indigo-600 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-indigo-600 transition-colors">
                Terms of Service
              </Link>
            </div>
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} ApplyRight. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CVBuilderGuide;
