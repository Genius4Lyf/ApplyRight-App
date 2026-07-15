import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Bot } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import { useNavigate, Link } from 'react-router-dom';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// Light stagger for list items — children reuse `fadeIn`.
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// The three length verdicts — tone shown as a thin accent (mono eyebrow + dot),
// not a filled tile.
const VERDICTS = [
  {
    tone: {
      text: 'text-emerald-600',
      dot: 'bg-emerald-500',
    },
    tag: 'Ideal',
    title: 'One page',
    body: 'Students, early-career professionals, and most people with under ~10 years’ experience. One tight page a recruiter can skim in seconds — and still catch every important thing.',
  },
  {
    tone: {
      text: 'text-amber-600',
      dot: 'bg-amber-500',
    },
    tag: 'Fine when earned',
    title: 'Two pages',
    body: 'Senior professionals with 10+ years, deep-technical roles, and academic CVs. A second page is fine — as long as it’s carrying relevant substance, not filler.',
  },
  {
    tone: {
      text: 'text-rose-600',
      dot: 'bg-rose-500',
    },
    tag: 'A red flag',
    title: 'Three or more',
    body: 'Almost always too long. Your strongest wins get buried past page one, where recruiters rarely reach — so your best material never gets read. Trim it back.',
  },
];

// The five signs of a healthy CV, beyond length — numbered editorial sequence.
const SIGNS = [
  {
    title: 'Relevance',
    body: 'Tailored to the target role, not one-size-fits-all. A CV that tries to fit every job fits none — mirror the language and priorities of the specific job description in front of you.',
  },
  {
    title: 'Proof, not duties',
    body: '“Cut onboarding time 40%” beats “responsible for onboarding.” Quantified results — numbers, percentages, outcomes — are what recruiters remember. Lead with impact, not a list of responsibilities.',
  },
  {
    title: 'The right keywords',
    body: 'It matches the job description and the terms recruiters search an ATS for. If a role asks for “stakeholder management” and you wrote “worked with teams,” their search may never surface you.',
  },
  {
    title: 'Clean, ATS-readable formatting',
    body: 'Single column, standard headings, no tables, graphics, or text boxes that scramble parsers. A layout that looks clever to a human can read as gibberish to the machine that screens you first.',
  },
  {
    title: 'No filler',
    body: 'Every line earns its place. Cut the generic objective statement, the obvious skills, and the decade-old roles that no longer sell you. What’s left should all be working for you.',
  },
];

// Experience → length guidance.
const IDEAL_LENGTH = [
  {
    range: '0–3 years',
    guide:
      'One page. You have plenty to say — you don’t yet have two pages’ worth of the right things.',
  },
  {
    range: '3–10 years',
    guide:
      'One to two pages. Grow to a second page only when the first is genuinely full of relevant, quantified wins.',
  },
  {
    range: '10+ years',
    guide:
      'Up to two pages. Depth is expected — but recency and relevance still win over completeness.',
  },
  {
    range: 'Executive / academic',
    guide:
      'Can run longer (a CV with publications, patents, or board roles). It still has to be tailored — length is never an excuse for filler.',
  },
];

// Concrete moves to cut a page.
const TRIMS = [
  'Lead with a tight 2–3 line summary that frames who you are for this specific role.',
  'Drop roles older than ~10–15 years, or any that don’t support the job you’re targeting.',
  'Quantify instead of listing every task — one strong, measurable result beats five vague duties.',
  'Keep recent roles to 3–5 bullets; give older roles one or two lines, or a single summary line.',
  'Tighten layout density and margins. ApplyRight’s CV Studio does this live and shows your real page count as you edit — so you can watch two pages become one.',
];

const CVHealth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Support the length-coach deep link (/cv-health#length): scroll to the length
    // section (its scroll-mt clears the fixed nav); otherwise start at the top.
    if (window.location.hash === '#length') {
      const el = document.getElementById('length');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, []);

  // Logged in → straight to their CVs; logged out → register first.
  const buildCV = () => {
    const token = localStorage.getItem('token');
    navigate(token ? '/dashboard' : '/register');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-5">
              CV Health
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
              What makes a <br />
              <span className="text-indigo-600">healthy CV?</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              A strong CV is short, sharp, and provable — recruiters spend only seconds on a first
              pass. Here’s how to check yours, starting with the thing most people get wrong:
              length.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The right length — deep-link target for the CV Studio length coach */}
      <section id="length" className="py-24 bg-white scroll-mt-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-10 md:mb-12 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              The right length
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              How Long Should a CV Be?
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              There’s no single rule — but there is a right answer for you. It comes down to how
              much relevant experience you can prove, not how much you can fit.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid gap-6 md:grid-cols-3"
          >
            {VERDICTS.map((v, i) => (
              <motion.div
                key={i}
                variants={fadeIn}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <p
                  className={`flex items-center gap-1.5 font-mono text-[0.72rem] uppercase tracking-[0.18em] ${v.tone.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${v.tone.dot}`} />
                  {v.tag}
                </p>
                <h3 className="mt-3 text-2xl font-bold text-slate-900">{v.title}</h3>
                <p className="mt-2 text-slate-600 leading-relaxed">{v.body}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mt-12 border-t border-slate-200 pt-10"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-4">
              Why length matters
            </p>
            <div className="space-y-4 text-lg text-slate-600 leading-relaxed max-w-[62ch]">
              <p>
                Recruiters skim a first pass in seconds, and every extra page pushes your best
                material further from the top. A CV that runs long doesn’t read as more accomplished
                — it reads as harder to scan, and the wins that should jump out get buried.
              </p>
              <p>
                Concision is itself a signal: it shows focus, judgement, and the discipline to edit.
                And a tighter, single-column document parses more cleanly through the ATS that reads
                you before any human does. Shorter isn’t about doing less — it’s about making the
                most relevant things impossible to miss.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The 5 signs — dark editorial band */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-14 flex max-w-[54ch] flex-col gap-3"
          >
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-300 mb-2">
              Beyond length
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              The 5 Signs of a Healthy CV
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              Length gets you read. These five keep you in the running once you are.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="flex flex-col gap-10"
          >
            {SIGNS.map((sign, idx) => (
              <motion.div key={idx} variants={fadeIn} className="flex gap-5 md:gap-8">
                <span
                  aria-hidden="true"
                  className="font-heading text-5xl md:text-6xl text-indigo-400/40 leading-none tabular-nums shrink-0"
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="pt-1 md:pt-2">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{sign.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{sign.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mt-12 border-t border-slate-800 pt-8"
          >
            <p className="text-slate-300 leading-relaxed max-w-[62ch]">
              You don’t have to eyeball all this. As you build, ApplyRight’s live{' '}
              <span className="font-semibold text-white">ATS Coach</span> scores your CV Health, and
              its <span className="font-semibold text-white">fit analysis</span> reads the actual
              job description to check relevance, keywords, and proof — so you can see exactly where
              yours stands.
            </p>
            <Link
              to="/ats-guide"
              className="mt-6 inline-flex items-center gap-1.5 border-b-2 border-indigo-400 pb-0.5 font-semibold text-white transition-colors hover:text-indigo-200"
            >
              See how the ATS Coach checks these <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* What's your ideal length — experience-based grid */}
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
              Match it to your career
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              What’s Your Ideal Length?
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              A quick read on where you should land, by how far into your career you are.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {IDEAL_LENGTH.map((row, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                className={`grid gap-2 py-6 sm:grid-cols-[10rem_1fr] sm:gap-8 ${
                  idx > 0 ? 'border-t border-slate-200' : ''
                }`}
              >
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 sm:pt-1">
                  {row.range}
                </p>
                <p className="text-slate-600 leading-relaxed">{row.guide}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How to trim a page */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-10 md:mb-12 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              Cut it down
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">How to Trim a Page</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              You almost never need to delete achievements — you need to tighten how they’re told.
            </p>
          </motion.div>

          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="space-y-5"
          >
            {TRIMS.map((item, i) => (
              <motion.li
                key={i}
                variants={fadeIn}
                className="flex items-start gap-3 text-slate-600"
              >
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-lg leading-relaxed">{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* When two pages is right */}
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
              Don’t over-trim
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              When Two Pages Is the Right Call
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
              One page is a strong default — but it isn’t a law. Senior leadership, deep-technical,
              and academic CVs legitimately need the room to show the depth the role demands.
              Forcing a 15-year career onto a single page can strip out the very evidence that makes
              you a serious candidate.
            </p>
            <p>
              If you’ve earned the second page, the rule is simple:{' '}
              <span className="font-semibold text-slate-900">make page one count</span>. Put your
              strongest, most relevant material first, so a recruiter who only reads the top half
              has already seen your best. The second page should reward the reader who keeps going —
              never carry the case for hiring you on its own.
            </p>
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
                Put it into practice
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Build a recruiter-ready CV.
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-[52ch]">
                ApplyRight’s CV Studio keeps you the right length, quantifies your wins, and scores
                your CV Health live — with clean, ATS-friendly templates and your real page count as
                you edit.
              </p>
              <button
                onClick={buildCV}
                className="inline-flex items-center gap-2 bg-white text-indigo-800 font-bold py-4 px-10 rounded-md hover:bg-slate-100 transition-all shadow-sm hover:-translate-y-0.5"
              >
                Build My CV Now <ArrowRight className="w-5 h-5" />
              </button>
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

      <Footer />
    </div>
  );
};

export default CVHealth;
