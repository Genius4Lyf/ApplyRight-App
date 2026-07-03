import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Eye,
  FileText,
  XCircle,
  CheckCircle,
  Quote,
  Target,
  BarChart3,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import { Link } from 'react-router-dom';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// The reality, minus the myths. Each row pairs a popular myth with what
// actually happens inside an Applicant Tracking System / a recruiter's day.
const MYTHS = [
  {
    myth: '“A bot auto-rejects 75% of resumes before a human sees them.”',
    reality:
      'Modern ATS (Workday, Greenhouse, Lever, Taleo) do not hard-reject on a hidden keyword score. They store and organize applications — humans still do the deciding.',
  },
  {
    myth: '“If I miss a keyword, I’m instantly disqualified.”',
    reality:
      'No single missing word disqualifies you. But recruiters search the ATS database by keyword, so terms you never wrote make you invisible in their searches.',
  },
  {
    myth: '“Stuff in as many keywords as possible to rank higher.”',
    reality:
      'Keyword stuffing backfires. ATS use semantic matching and recruiters spot a wall of buzzwords in seconds. Relevance in context beats density every time.',
  },
  {
    myth: '“Fancy templates with columns and graphics look more professional.”',
    reality:
      'Tables, columns, text boxes and images often parse into garbled text. Clean, single-column, plain-text-friendly formatting is what actually survives parsing.',
  },
];

// What actually happens to your application.
const REALITY_STEPS = [
  {
    icon: Search,
    title: 'Recruiters search the database',
    body: 'A recruiter types a boolean query — e.g. "React" AND "TypeScript" AND "fintech". If your true skill isn’t written in the words they search, you don’t appear. This is the #1 reason keywords matter.',
  },
  {
    icon: Eye,
    title: 'A 6–8 second human skim',
    body: 'When your resume surfaces, a person scans it for a few seconds, hunting for terms that match the role. Words that mirror the job description read as instantly relevant.',
  },
  {
    icon: FileText,
    title: 'Parsing into fields',
    body: 'The ATS extracts your experience into structured fields. Complex layouts break this, scrambling your best content. “ATS-ready” formatting simply means it parses cleanly.',
  },
];

// What to actually do — the honest, defensible playbook.
const PLAYBOOK = [
  {
    icon: Target,
    title: 'Mirror the recruiter’s language',
    body: 'Where your real work matches a requirement but uses different words, rephrase it in the job’s exact terminology. “Handled customer issues” → “stakeholder management.” Same truth, searchable words.',
  },
  {
    icon: BarChart3,
    title: 'Quantify real impact',
    body: 'Numbers earn the skim. Use metrics that are true or clearly implied by your work — never invented ones. Honest qualitative impact beats a fabricated statistic.',
  },
  {
    icon: ShieldCheck,
    title: 'Never fabricate to fit',
    body: 'A missing keyword is fine; a lie gets exposed in the interview and burns your credibility. The goal is your real experience, spoken in the recruiter’s language.',
  },
];

const HowATSRecruitersWork = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-60"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              The reality, minus the myths
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
              How ATS &amp; Recruiters{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">
                Actually Work
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-4 leading-relaxed">
              The internet is full of scary “the robots rejected you” myths. Here’s what genuinely
              happens to your application — from people who hire — and how to write a resume that
              wins on the truth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Myth vs Reality */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Myth vs. Reality</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Most “ATS hacks” are built on fear. The truth is more useful — and far less scary.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {MYTHS.map((item, idx) => (
              <motion.div
                key={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8"
              >
                <div className="flex items-start gap-3 mb-5">
                  <XCircle className="text-rose-500 shrink-0 mt-0.5" size={22} />
                  <p className="text-slate-500 font-medium italic">{item.myth}</p>
                </div>
                <div className="flex items-start gap-3 pt-5 border-t border-slate-100">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={22} />
                  <p className="text-slate-800 leading-relaxed">{item.reality}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What actually happens */}
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
              What Actually Happens to Your Application
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Three real steps — none of them a mysterious robot judge.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {REALITY_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={idx}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all group"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Icon size={30} />
                  </div>
                  <div className="text-sm font-bold text-indigo-600 mb-2">Step {idx + 1}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recruiter pull-quote */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="relative bg-indigo-50 rounded-3xl p-10 border border-indigo-100"
          >
            <Quote className="text-indigo-300 mb-4" size={36} />
            <p className="text-xl md:text-2xl font-medium text-slate-800 leading-relaxed">
              “I don’t reject resumes for missing a buzzword. I search for the skills the role needs
              — and I only find the candidates who wrote them down.”
            </p>
            <p className="mt-6 text-slate-500 font-semibold">— How recruiters actually screen</p>
          </motion.div>
        </div>
      </section>

      {/* The honest playbook */}
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
              So What Actually Works?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Not tricks. Just your real experience, written in the language recruiters search for.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {PLAYBOOK.map((item, idx) => {
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
                  <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 text-indigo-600">
                    <Icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.body}</p>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-6">ApplyRight does this for you</h2>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              Our <span className="font-semibold text-white">ApplyRight ATS suggestions</span> read
              the job you’re applying to, find the keywords recruiters search for, and reframe your
              real experience in their language — quantified, ATS-clean, and 100% truthful. No
              fabrication, no stuffing.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-8 rounded-xl shadow-lg font-semibold transition-colors"
            >
              Build an ATS-ready CV free
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

export default HowATSRecruitersWork;
