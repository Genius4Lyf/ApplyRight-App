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
  MessageCircle,
  Wand2,
  ScanSearch,
  Gauge,
  LayoutTemplate,
  Pencil,
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
 * THE STUDIO WALKTHROUGH — each step has its OWN short video tutorial.
 * Unlike the classic builder's single linear flow, Aria Studio forks at the
 * desk: Track A builds a CV from scratch with Aria, Track B tailors a CV you
 * already have to a specific job.
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

/* Overview — the one video that explains the fork before either track. */
const OVERVIEW_STEPS = [
  {
    icon: Sparkles,
    youtubeId: '', // ← paste this step's YouTube ID here, e.g. 'dQw4w9WgXcQ'
    title: 'What is Aria Studio?',
    body: 'One workspace with three things side by side: a chat with Aria, a live CV Health panel, and a Live Preview of the document itself. From the Studio desk you pick a path — build a brand-new CV with Aria interviewing you, or tailor a CV you already have to a specific job description. Everything after that follows the track you chose, and you can start a fresh session at any time.',
  },
];

/* Track A — build a CV from nothing, with Aria doing the interviewing. */
const BUILD_STEPS = [
  {
    icon: MessageCircle,
    youtubeId: '',
    title: 'Starting a build session',
    body: 'From the Studio desk, choose “Build a CV with Aria”. Instead of a form with eight tabs, you get a conversation: Aria asks one thing at a time, you answer in plain language, and the CV assembles itself on the right. You can type as loosely as you like — Aria structures it for you.',
  },
  {
    icon: Target,
    youtubeId: '',
    title: 'The target job (optional)',
    body: 'If you already know the role you’re chasing, paste it in at the start. Aria uses it to ground every suggestion — the wording of your bullets, the skills it proposes, the angle of your summary. It’s genuinely optional: skip it and you’ll get a solid general-purpose CV you can tailor to a specific job later in Track B.',
  },
  {
    icon: User,
    youtubeId: '',
    title: 'Contact & work history, through chat',
    body: 'Aria collects your contact details, then walks your career role by role: where, what title, what dates, and — the part that matters — what you actually achieved. It keeps nudging you away from job-description duties and towards outcomes and numbers. Answer honestly; Aria only sharpens the phrasing.',
  },
  {
    icon: GraduationCap,
    youtubeId: '',
    title: 'Projects & education',
    body: 'Add projects with a type chip so recruiters read them correctly — course, personal, or work. Then your schools, degrees, and certifications. Both sections are quick, and both are worth filling in when your paid work history is short.',
  },
  {
    icon: Wand2,
    youtubeId: '',
    title: 'Skills & summary',
    body: 'For skills you have two routes: Auto-fill / “Suggest with Aria” reads everything you’ve entered and proposes a grounded, role-matched list (a paid action), or you can simply type your own for free. The summary works the same way — “Draft with Aria” for a first pass, or write it yourself. Either way, review every line before you keep it.',
  },
  {
    icon: CheckCircle2,
    youtubeId: '',
    title: 'Live Preview & finishing up',
    body: 'The Live Preview updates as you talk, so you watch the CV take shape rather than waiting for a final render. Manual editing unlocks once the CV is complete — from there you can fix anything by hand, pick a template, and download your ATS-friendly PDF.',
  },
];

/* Track B — take a CV you already have and aim it at one specific job. */
const TAILOR_STEPS = [
  {
    icon: ScanSearch,
    youtubeId: '',
    title: 'Starting a tailor session',
    body: 'Pick one of your saved CVs, then paste the job description you’re applying to. That pairing is the whole basis of the session: every verdict, rewrite, and suggestion that follows is measured against that specific job, not a generic idea of “good”.',
  },
  {
    icon: Gauge,
    youtubeId: '',
    title: 'Reading your Fit Score',
    body: 'Aria scans the CV against the job and reports back section by section with a red / amber / green verdict — work history, projects, skills, summary. Red means it’s costing you the application, amber means it’s serviceable, green means leave it alone. Start at the top of the red list and work down.',
  },
  {
    icon: Briefcase,
    youtubeId: '',
    title: 'Fixing Work History',
    body: 'Choose “Rewrite the role” on any job and Aria shows you a before/after for each bullet, side by side. Accept the ones that are true and better, skip the ones that overreach, and edit anything that’s nearly right. Nothing lands in your CV until you accept it.',
  },
  {
    icon: FolderGit2,
    youtubeId: '',
    title: 'Fixing Projects',
    body: 'If projects are dragging your score down, Aria proposes three project ideas grounded in the experience already on your CV and the gaps in the job description — realistic things you could build or write up, not fantasy. If projects genuinely aren’t relevant to you, dismiss the section and it stops counting against you.',
  },
  {
    icon: AlignLeft,
    youtubeId: '',
    title: 'Fixing Skills & Summary',
    body: 'The same Suggest-with-Aria and Draft-with-Aria pattern from Track A, but pointed at this job’s specific gaps: the must-have skills the scan says you’re missing, and a summary rewritten to lead with what this employer is actually looking for.',
  },
  {
    icon: Pencil,
    youtubeId: '',
    title: 'Editing anything manually in Live Preview',
    body: 'Aria is never the only way in. Every section in the Live Preview — contact details, skills, certifications, summary, and each work or project entry — can be edited by hand or handed over to Aria with a click. You can also reorder roles to put the most relevant one first, or delete anything that doesn’t serve this application.',
  },
  {
    icon: LayoutTemplate,
    youtubeId: '',
    title: 'Choosing a template & downloading',
    body: 'When the score looks right, pick a template and export. Clean, single-column layouts parse best in applicant tracking systems, so keep it simple — then download the PDF and send the version that was built for this job.',
  },
];

/* Small helper so both track grids render identically. */
const StepGrid = ({ steps }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={stagger}
    className="grid md:grid-cols-2 gap-6"
  >
    {steps.map((step, idx) => {
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
);

const AriaStudioGuide = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Seo
        title="How to Get the Best of Aria Studio"
        description="A complete guide and video tutorials for Aria Studio — the chat workspace with live CV Health and Live Preview. Follow the build track to create a CV with Aria, or the tailor track to aim an existing CV at a specific job."
      />
      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900 mb-5">
              Your Aria Studio playbook
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
              Get the Best of <span className="italic">Aria Studio</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-4 leading-relaxed">
              Aria Studio puts a chat with Aria, a live CV Health panel, and a Live Preview of your
              document in one workspace — so you write, score, and see the result in the same place.
            </p>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              From the Studio desk it splits into two paths: build a brand-new CV with Aria, or
              tailor a CV you already have to one specific job. This guide covers both.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Overview — the fork, explained */}
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
              Start here
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Two Tracks, One Workspace
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Watch this first. It explains the Build vs Tailor fork so you know which track below
              is yours.
            </p>
          </motion.div>

          <StepGrid steps={OVERVIEW_STEPS} />
        </div>
      </section>

      {/* Track A — Build a CV with Aria */}
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
              Track A · Step-by-step video tutorials
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Build a CV with Aria</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Starting from nothing. Aria interviews you section by section and the document builds
              itself in the Live Preview beside the chat.
            </p>
          </motion.div>

          <StepGrid steps={BUILD_STEPS} />
        </div>
      </section>

      {/* Track B — Tailor an existing CV to a job */}
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
              Track B · Step-by-step video tutorials
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Tailor an Existing CV to a Job
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              You already have a CV. Aria scores it against one job description, tells you which
              sections are hurting you, and fixes them with you — section by section.
            </p>
          </motion.div>

          <StepGrid steps={TAILOR_STEPS} />
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
                Ready to open the Studio?
              </h2>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-[52ch]">
                Pick your track and start a session. Build a CV from scratch with Aria, or paste a
                job description and watch your Fit Score climb as you fix each section.
              </p>
              <Link
                to="/aria-studio"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-4 px-8 rounded-md shadow-sm font-semibold transition-colors"
              >
                Open Aria Studio
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

export default AriaStudioGuide;
