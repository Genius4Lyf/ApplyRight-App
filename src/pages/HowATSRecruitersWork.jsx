import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Eye,
  FileText,
  XCircle,
  CheckCircle,
  Target,
  BarChart3,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import AriaOrbit from '../components/cv/AriaOrbit';
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
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900 mb-5">
              The reality, minus the myths
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
              How ATS &amp; Recruiters <span className="italic">Actually Work</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-4 leading-relaxed">
              The internet is full of scary “the robots rejected you” myths. Here’s what genuinely
              happens to your application — from people who hire — and how to write a resume that
              wins on the truth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Myth vs Reality — tracked-corrections ledger */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-10 md:mb-12 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900">
              Myth vs reality
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Myth vs. Reality</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Most “ATS hacks” are built on fear. The truth is more useful — and far less scary.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {MYTHS.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                className={`flex gap-4 py-6 ${idx > 0 ? 'border-t border-slate-200' : ''}`}
              >
                <span className="font-mono text-sm tabular-nums text-slate-400 pt-0.5 leading-relaxed">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <XCircle className="text-rose-400 shrink-0 mt-1" size={15} />
                    <p className="text-slate-400 italic line-through decoration-rose-400/70 decoration-2 leading-relaxed">
                      {item.myth}
                    </p>
                  </div>
                  <div className="mt-3 flex items-start gap-2">
                    <ArrowRight className="text-slate-900 shrink-0 mt-1" size={16} />
                    <p className="text-slate-800 font-medium leading-relaxed">{item.reality}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* What actually happens — numbered editorial sequence */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-10 md:mb-12 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900">
              What actually happens
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              What Actually Happens to Your Application
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Three real steps — none of them a mysterious robot judge.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="flex flex-col gap-10"
          >
            {REALITY_STEPS.map((step, idx) => (
              <motion.div key={idx} variants={fadeIn} className="flex gap-5 md:gap-8">
                <span
                  aria-hidden="true"
                  className="font-heading text-5xl md:text-6xl text-slate-300 leading-none tabular-nums shrink-0"
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

      {/* Recruiter pull-quote — flat editorial quote */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="border-l-4 border-slate-900 pl-6 md:pl-8"
          >
            <p className="font-heading text-2xl md:text-3xl text-slate-900 leading-snug">
              “I don’t reject resumes for missing a buzzword. I search for the skills the role needs
              — and I only find the candidates who wrote them down.”
            </p>
            <p className="mt-6 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-500">
              — How recruiters actually screen
            </p>
          </motion.div>
        </div>
      </section>

      {/* The honest playbook — alternating editorial rows */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-16 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900">
              The honest playbook
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              So What Actually Works?
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Not tricks. Just your real experience, written in the language recruiters search for.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="flex flex-col gap-14 md:gap-20"
          >
            {PLAYBOOK.map((item, idx) => {
              const Icon = item.icon;
              const reverse = idx % 2 === 1;
              return (
                <motion.div
                  key={idx}
                  variants={fadeIn}
                  className="grid items-center gap-8 md:grid-cols-2 md:gap-14"
                >
                  {/* Copy */}
                  <div className={reverse ? 'md:order-2' : ''}>
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-900 mb-3">
                      Playbook · {String(idx + 1).padStart(2, '0')}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{item.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{item.body}</p>
                  </div>

                  {/* Visual — flat bordered panel */}
                  <div className={reverse ? 'md:order-1' : ''}>
                    <div className="rounded-xl border border-slate-200 bg-white p-6">
                      <Icon size={20} className="text-slate-900 mb-4" />
                      {idx === 0 && (
                        <div className="flex flex-col gap-3">
                          <p className="text-slate-400 italic line-through decoration-rose-400/70 decoration-2">
                            “Handled customer issues”
                          </p>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="text-slate-900 shrink-0" size={16} />
                            <p className="font-semibold text-slate-900">
                              “stakeholder management”
                            </p>
                          </div>
                        </div>
                      )}
                      {idx === 1 && (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xl md:text-2xl font-bold tabular-nums text-slate-900">
                            4.2s → 0.8s
                          </span>
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-sm font-bold text-slate-900">
                            ↑ 12%
                          </span>
                        </div>
                      )}
                      {idx === 2 && (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                            <p className="text-slate-800">“Led a 4-person support desk.”</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <XCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                            <p className="text-slate-400 italic line-through decoration-rose-400/70 decoration-2">
                              “Managed a $5M budget.”
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
                ATS-ready, honestly
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                ApplyRight does this for you
              </h2>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-[52ch]">
                Our <span className="font-semibold text-white">ApplyRight ATS suggestions</span>{' '}
                read the job you’re applying to, find the keywords recruiters search for, and
                reframe your real experience in their language — quantified, ATS-clean, and 100%
                truthful. No fabrication, no stuffing.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-4 px-8 rounded-md shadow-sm font-semibold transition-colors"
              >
                Build an ATS-ready CV free
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

export default HowATSRecruitersWork;
