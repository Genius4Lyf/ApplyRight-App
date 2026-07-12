import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, Bot } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
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

// Inside the "Black Hole" — accurate, search-first framing (consistent with the
// How ATS & Recruiters page: no "a bot auto-rejects you" absolutes).
const STEPS = [
  {
    title: 'Parsing',
    body: 'The ATS strips your resume of all design and reads it as plain text. Columns, graphics, or unusual fonts can scramble your best content into digital gibberish it can’t read.',
  },
  {
    title: 'Keyword matching',
    body: 'Recruiters search the ATS database by the skills a role needs — “React”, “Project Management”. The system reads your parsed text; if those terms aren’t there, you don’t appear in their search.',
  },
  {
    title: 'Ranking',
    body: 'Recruiters review the candidates their search surfaces — usually the ones whose skills line up with what they looked for. If your real experience isn’t written in the words they search, you never surface. It’s not a bot hard-rejecting you; you’re just invisible to the search.',
  },
];

const DONTS = [
  "Don't use two-column layouts (confuses parsers)",
  "Don't use headers/footers for important info",
  "Don't use charts, graphs, or rating bars for skills",
  "Don't place contact info in text boxes",
  "Don't use complex fonts or symbols",
];

const DOS = [
  'Use a clean, single-column layout',
  'Use standard section headings (Experience, Education)',
  'Use standard fonts (Arial, Calibri, Roboto)',
  'Include keywords exactly as they appear in the job ad',
  'Save as a standard PDF or DOCX',
];

// How ApplyRight actually gets your real experience past the filter.
const HELPS = [
  {
    title: 'ApplyRight ATS',
    body: 'Reads the exact job you’re applying to, finds the keywords recruiters search for, and reframes your real experience in their language — quantified, ATS-clean, and 100% truthful. Free AI suggestions to start; recruiter-grade ApplyRight ATS on a paid plan.',
  },
  {
    title: 'The live ATS Coach',
    body: 'As you build, it scores your CV Health 0–100 in real time. A Deep Scan reads the job description to surface matched vs. missing keywords and a concrete action plan.',
  },
  {
    title: 'Clean, ATS-friendly templates',
    body: 'Single-column, plain-text-friendly layouts that parse cleanly — no columns or graphics to scramble your content.',
  },
];

const ATSGuide = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-5">
              Ultimate Guide & Walkthrough
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
              How to Beat the <br />
              <span className="text-indigo-600">Resume Robots</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Most companies use Applicant Tracking Systems (ATS), and recruiters search them by
              keyword — so a resume that doesn’t speak their language can get overlooked before a
              human ever reads it. Here is exactly how to fix yours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Inside the Black Hole — numbered editorial sequence */}
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
              Inside the black hole
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Inside the “Black Hole”
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Understanding how the system works is the first step to beating it.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="flex flex-col gap-10"
          >
            {STEPS.map((step, idx) => (
              <motion.div key={idx} variants={fadeIn} className="flex gap-5 md:gap-8">
                <span
                  aria-hidden="true"
                  className="font-heading text-5xl md:text-6xl text-indigo-200 leading-none tabular-nums shrink-0"
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="pt-1 md:pt-2">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* The Golden Rules — dark, flat editorial columns */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-14 flex max-w-[54ch] flex-col gap-3"
          >
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-300 mb-2">
              The golden rules
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">The Golden Rules</h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              What keeps the robots happy (and what makes them angry).
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10 md:gap-14">
            {/* The Don'ts */}
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-rose-400 border-b border-slate-800 pb-3 mb-5">
                Don’t
              </p>
              <ul className="space-y-4">
                {DONTS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-1" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The Do's */}
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-emerald-400 border-b border-slate-800 pb-3 mb-5">
                Do
              </p>
              <ul className="space-y-4">
                {DOS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How ApplyRight beats the ATS — editorial list */}
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
              How ApplyRight helps
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              How ApplyRight Beats the ATS
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              No black box — here’s exactly how the app gets your real experience past the filter.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {HELPS.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                className={`py-6 ${idx > 0 ? 'border-t border-slate-200' : ''}`}
              >
                <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mt-10"
          >
            <Link
              to="/cv-builder-guide"
              className="inline-flex items-center gap-1.5 border-b-2 border-indigo-600 pb-0.5 font-semibold text-slate-900 transition-colors hover:text-indigo-800"
            >
              See the full CV Builder walkthrough <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA — flat ink band with a bare Bot on the right */}
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
                Get past the filter
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Ready to get past the robots?
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-[52ch]">
                Build your professional, ATS-optimized resume in minutes with ApplyRight.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-indigo-800 font-bold py-4 px-10 rounded-md hover:bg-slate-100 transition-all shadow-sm hover:-translate-y-0.5"
              >
                Build My Resume Now <ArrowRight className="w-5 h-5" />
              </Link>
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

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ATSGuide;
