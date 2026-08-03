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
  ArrowRight,
} from 'lucide-react';
import AriaOrbit from '../components/cv/AriaOrbit';
import PublicNavbar from '../components/PublicNavbar';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// Light stagger for list items — children reuse `fadeIn`.
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
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
    body: 'Start here. Paste the job title, company, and the full job description. Everything downstream — Aria’s coaching, Role Match keyword coverage, and AI suggestions — is tailored to this role. Skipping it means generic advice, so always fill it in first.',
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
        description="A complete guide and video tutorials for the ApplyRight CV Builder — the 8-step flow, Aria's live coaching panel, Role Match keyword coverage, AI bullets and skills, templates, and pro tips."
      />
      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900 mb-5">
              Your CV Builder playbook
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
              Get the Best of the <span className="italic">CV Builder</span>
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
            className="mb-12 md:mb-16 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900">
              Step-by-step video tutorials
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              The 8-Step Flow, Explained
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              The builder guides you through eight steps in order. Watch the short video for each
              one, then read the tips below it.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-6"
          >
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={idx}
                  variants={fadeIn}
                  className="flex flex-col rounded-xl border border-slate-200 overflow-hidden"
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
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm tabular-nums text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <Icon size={18} className="text-slate-900 shrink-0" />
                      <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{step.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Aria's builder panel — flat editorial cards */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-16 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900">
              Aria, in the builder
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Ask Aria As You Build</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              A three-tab panel sits beside every step: chat with Aria, watch your CV Health score
              move as you type, and see how well you match the role. The scores are free.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {COACH_FEATURES.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                className="rounded-xl border border-slate-200 bg-white p-8"
              >
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-900 mb-4">
                  {item.tag}
                </p>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Compare Two Versions — the CV Comparison Studio */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="grid items-center gap-10 md:grid-cols-2 md:gap-14"
          >
            {/* Copy */}
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900">
                Compare two CVs
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                Not sure which CV is stronger?
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Ran two CVs against the same job? From your Applications history, compare the two
                analyses side-by-side — see which one scores higher overall and on each dimension
                (skills, experience, education…), plus which must-have skills each one is still
                missing. No more guessing which to send.
              </p>
            </div>

            {/* Flat before/after panel */}
            <div className="rounded-xl border border-slate-200 p-6">
              <p className="mb-4 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-400">
                CV A vs CV B
              </p>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="font-mono text-[0.55rem] uppercase tracking-wider text-slate-400">
                    CV A
                  </p>
                  <p className="font-heading text-2xl font-bold tabular-nums text-slate-500">78</p>
                </div>
                <div className="rounded border border-slate-900 bg-slate-50 p-3 text-center">
                  <p className="font-mono text-[0.55rem] uppercase tracking-wider text-slate-900">
                    CV B
                  </p>
                  <p className="font-heading text-2xl font-bold tabular-nums text-slate-900">91</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Skills', b: 94 },
                  { label: 'Experience', b: 88 },
                  { label: 'Education', b: 90 },
                ].map((d) => (
                  <div key={d.label}>
                    <div className="mb-1 flex justify-between font-mono text-[0.56rem] uppercase tracking-wide text-slate-400">
                      <span>{d.label}</span>
                      <span className="text-slate-900">{d.b}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-slate-900"
                        style={{ width: `${d.b}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pro tips — flat editorial cards */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-16 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900">
              Pro tips
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Quick Wins</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Small habits that make a big difference to how your CV performs.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {TIPS.map((tip, idx) => {
              const Icon = tip.icon;
              return (
                <motion.div
                  key={idx}
                  variants={fadeIn}
                  className="rounded-xl border border-slate-200 bg-white p-8"
                >
                  <Icon size={20} className="text-slate-900 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{tip.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{tip.body}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA — flat ink band with Aria's orbit mark on the right */}
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
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-400 mb-4">
                Put it into practice
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to build yours?
              </h2>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-[52ch]">
                Put the guide into practice. Create your CV, watch your CV Health score climb, and
                download an ATS-ready PDF — your first one is free.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-4 px-8 rounded-md shadow-sm font-semibold transition-colors"
              >
                Start building free
                <ArrowRight size={20} />
              </Link>
            </div>

            {/* ApplyRight AI bot — decorative balance, hidden on mobile */}
            <div aria-hidden="true" className="hidden md:grid place-items-center text-slate-400">
              <AriaOrbit size={160} tone="mono" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default CVBuilderGuide;
