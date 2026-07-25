import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Ear,
  Layers,
  MessageSquare,
  Compass,
  Heart,
  ShieldCheck,
  XCircle,
  CheckCircle,
  ArrowRight,
  Mic,
  Briefcase,
  Users,
  SlidersHorizontal,
  Trophy,
  ClipboardCheck,
  AlertTriangle,
  Bot,
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// Light stagger for list items — children reuse `fadeIn`.
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// The six question types you'll actually meet, with the move that wins each one.
const QUESTION_TYPES = [
  {
    icon: MessageSquare,
    title: '“Tell me about yourself”',
    example: 'Almost always the opener.',
    approach:
      'A tight 60–90s narrative: present (what you do now) → past (the experience that got you here) → why-here (why this role, this company). Not your life story — a trailer for the rest of the interview.',
  },
  {
    icon: Layers,
    title: 'Behavioural',
    example: '“Tell me about a time you…”',
    approach:
      'Pure STAR territory. Reach for a real, specific story with a concrete outcome. The interviewer is testing whether your example holds up under follow-up questions — so pick ones you actually lived.',
  },
  {
    icon: Compass,
    title: 'Technical / role-specific',
    example: '“Walk me through how you’d…”',
    approach:
      'They care about your reasoning more than the “right” answer. Think out loud, name the trade-offs, explain why you’d choose one path over another. Show the decisions, not just the conclusion.',
  },
  {
    icon: Heart,
    title: 'Motivation / fit',
    example: '“Why this role? Why us?”',
    approach:
      'This is where research shows. Reference something specific about the team, product, or mission — and connect it to what you genuinely want next. Generic flattery reads as “I’ll take any job.”',
  },
  {
    icon: Target,
    title: 'Weakness / growth',
    example: '“What’s a weakness?”',
    approach:
      'Name a real one and what you’re actively doing about it. Skip the humble-brags (“I work too hard”) — they’re transparent. Self-awareness plus a plan is the signal they want.',
  },
  {
    icon: Users,
    title: '“Any questions for us?”',
    example: 'The closer.',
    approach:
      'Never say “no.” Have 2–3 thoughtful questions ready about the team, the challenges of the role, or how success is measured. It’s your last chance to show genuine interest.',
  },
];

// The accurate rubric — kept in sync with ASSESS_DIMENSIONS in ai.service.js.
const RUBRIC = [
  {
    icon: Target,
    label: 'Relevance to the role',
    body: 'Do your answers speak to what this specific job actually needs — or could they apply to any job anywhere?',
  },
  {
    icon: Ear,
    label: 'Evidence & specificity',
    body: 'Real examples, names, numbers, outcomes. Concrete beats abstract every single time.',
  },
  {
    icon: Layers,
    label: 'Structure (STAR)',
    body: 'Are your stories organised — situation, task, action, result — or do they wander and trail off?',
  },
  {
    icon: MessageSquare,
    label: 'Communication & clarity',
    body: 'Clear, focused answers that get to the point. Rambling buries your best material.',
  },
  {
    icon: Compass,
    label: 'Depth & role fit',
    body: 'Genuine understanding of the work, not surface-level buzzwords — and a fit for the seniority of the role.',
  },
  {
    icon: Heart,
    label: 'Motivation & company fit',
    body: 'Do you show real interest in this role and company, or could this be a script for anyone?',
  },
  {
    icon: ShieldCheck,
    label: 'Consistency with CV',
    body: 'Your spoken answers should match your CV. Claims it can’t back up are flagged as overreach.',
  },
];

const HowToAceYourInterview = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    const prevTitle = document.title;
    document.title = 'How to Ace Your Interview — ApplyRight';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Logged in → straight to the prep list (the cleanest "start now" entry).
  // Logged out → register first, then they land in the app.
  const startInterview = () => {
    const token = localStorage.getItem('token');
    navigate(token ? '/interview-prep' : '/register');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-5">
              Interviewing is a learnable skill
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
              How to <span className="text-indigo-600">Ace Your Interview</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              Nobody is born good at interviews — it’s a skill you practise. This guide shows you
              exactly what great answers look like, and exactly how we score you, so you can
              rehearse for the real thing with confidence.
            </p>
            <button
              onClick={startInterview}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-8 rounded-xl shadow-lg font-semibold transition-colors"
            >
              Take an Interview Session and See your Score
              <ArrowRight size={20} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* What interviewers are looking for */}
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
              What they’re listening for
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              What Interviewers Are Actually Listening For
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
              Behind every question, an interviewer is listening for one thing:{' '}
              <span className="font-semibold text-slate-900">signal</span>. Evidence that you can do
              the job. Proof that you’ve thought about <em>this</em> role specifically. A sense that
              you’d be good to have on the team.
            </p>
            <p>
              Vague, generic, or rehearsed-sounding answers are noise — they could come from any
              candidate for any job. The candidates who stand out aren’t the smoothest talkers;
              they’re the ones who give{' '}
              <span className="font-semibold text-slate-900">specific, evidenced answers</span> that
              clearly map to what the role needs.
            </p>
            <p>
              Everything below — the STAR method, the question playbook, and how we score you — is
              really about one goal: turning what you’ve genuinely done into clear, convincing
              signal.
            </p>
          </motion.div>
        </div>
      </section>

      {/* STAR method */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-14 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              The STAR method
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              The STAR Method — the Backbone of Strong Answers
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              The single most reliable way to structure a behavioural answer. Four beats that turn a
              vague memory into a story that lands.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-14"
          >
            {[
              {
                letter: 'S',
                title: 'Situation',
                body: 'Set the scene in one or two sentences. Just enough context for the story to make sense — don’t over-explain.',
              },
              {
                letter: 'T',
                title: 'Task',
                body: 'What were you responsible for? What was the goal or the problem you had to solve?',
              },
              {
                letter: 'A',
                title: 'Action',
                body: 'What did YOU personally do? This is the heart of it — “we” hides your contribution, “I” reveals it.',
              },
              {
                letter: 'R',
                title: 'Result',
                body: 'How did it end? Quantify wherever you honestly can — “cut processing time 30%” beats “it went well.”',
              },
            ].map((s, idx) => (
              <motion.div key={idx} variants={fadeIn}>
                <div
                  aria-hidden="true"
                  className="font-heading text-5xl text-indigo-600 leading-none mb-4"
                >
                  {s.letter}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-600 leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Weak vs STAR — flat before/after */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="rounded-xl border border-slate-200 p-8">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-rose-500 mb-4">
                Weak answer
              </p>
              <p className="text-sm text-slate-400 italic mb-3">
                “Tell me about a time you solved a difficult problem.”
              </p>
              <p className="text-slate-700 leading-relaxed">
                “We had a lot of issues with our system being slow, so I worked with the team and we
                fixed it. Everyone was happy with the result and it was a good experience.”
              </p>
              <p className="mt-4 text-sm text-slate-500">
                No specifics, no “I”, no measurable outcome. It could be anyone, on any project.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-8">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-emerald-600 mb-4">
                STAR answer
              </p>
              <p className="text-sm text-slate-400 italic mb-3">Same question.</p>
              <p className="text-slate-700 leading-relaxed">
                “Our checkout page was timing out for about 1 in 5 users <em>(Situation)</em>. I
                owned fixing it before the holiday rush <em>(Task)</em>. I profiled the requests,
                found an un-indexed database query, added the index and cached the slowest call{' '}
                <em>(Action)</em>. Load time dropped from 4.2s to 0.8s and checkout completion rose
                12% that month <em>(Result)</em>.”
              </p>
              <p className="mt-4 text-sm text-slate-500">
                Specific, owned, measurable. This is the answer that earns the score.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Question types */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-14 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              The six question types
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              The Six Question Types — and How to Handle Each
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Almost every interview question is a variation of these. Know the move for each and
              nothing catches you off guard.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-x-12 gap-y-10"
          >
            {QUESTION_TYPES.map((q, idx) => (
              <motion.div key={idx} variants={fadeIn} className="flex gap-4">
                <span className="font-mono text-sm tabular-nums text-slate-400 pt-1 shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{q.title}</h3>
                  <p className="text-sm text-indigo-600 mb-2">{q.example}</p>
                  <p className="text-slate-600 leading-relaxed">{q.approach}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Before & during checklist */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-10 md:mb-12 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              Before &amp; during
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Before &amp; During — the Practical Checklist
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="rounded-xl border border-slate-200 bg-white p-8"
            >
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-3">
                Before
              </p>
              <h3 className="text-xl font-bold text-slate-900 mb-5">Before the interview</h3>
              <ul className="space-y-3 text-slate-600">
                {[
                  'Research the company and the role — read the job description twice and find something specific about the team or product.',
                  'Know your own CV cold. Every line is fair game for a follow-up.',
                  'Prepare 5–6 STAR stories mapped to the competencies the role likely tests.',
                  'Rehearse out loud — not in your head. Saying it is a different skill from thinking it.',
                  'Prepare your 2–3 questions for them in advance.',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="rounded-xl border border-slate-200 bg-white p-8"
            >
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-3">
                During
              </p>
              <h3 className="text-xl font-bold text-slate-900 mb-5">During the interview</h3>
              <ul className="space-y-3 text-slate-600">
                {[
                  'Answer the question that was actually asked — don’t pivot to a rehearsed speech.',
                  'Be specific and quantify whenever you honestly can.',
                  'Stay honest. Never claim what you can’t back up — it unravels under follow-ups.',
                  'Keep answers to roughly 60–90 seconds, then stop and let them dig in.',
                  'Ask a clarifying question if you need one — it’s a strength, not a weakness.',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Delivery note + mistakes */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mt-6 grid md:grid-cols-2 gap-6"
          >
            <div className="rounded-xl border border-slate-200 p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-3">A note on delivery</h3>
              <p className="text-slate-600 leading-relaxed">
                In a real, in-person interview, delivery matters too — eye contact (or camera
                contact on video), steady pacing, structure over rambling, staying calm under
                pressure. Our score reads a transcript, so it judges your{' '}
                <span className="font-semibold text-slate-900">content only</span> — but in the
                room, how you say it counts. Practise both.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-8">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="text-rose-500 shrink-0" size={22} />
                <h3 className="text-lg font-bold text-slate-900">Common mistakes to avoid</h3>
              </div>
              <ul className="space-y-2 text-slate-600">
                {[
                  'Vague, generic answers that could fit any job',
                  'Going off-topic or rambling past the point',
                  'Badmouthing past employers',
                  'Reciting an obviously memorised script',
                  'Having no questions at the end',
                  'Claiming skills or experience not on your CV',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Real interview loops — numbered editorial sequence */}
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
              Interviews come in rounds
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Real Interviews Come in Rounds
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Most hiring processes aren’t one conversation — they’re a sequence of rounds, each
              with a different person looking for something different.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="flex flex-col gap-10"
          >
            {[
              {
                title: 'The recruiter / HR screen',
                body: 'First contact. They’re checking motivation, basic fit, and whether your story holds together — “why this role, why now?”',
              },
              {
                title: 'The technical / specialist round',
                body: 'A deep dive with someone who does your job. Here it’s all about depth, reasoning, and real examples of your work.',
              },
              {
                title: 'The hiring manager',
                body: 'The person who’ll lead you. They weigh role fit, how you’d work with the team, and whether they want you on it.',
              },
            ].map((r, idx) => (
              <motion.div key={idx} variants={fadeIn} className="flex gap-5 md:gap-8">
                <span
                  aria-hidden="true"
                  className="font-heading text-5xl md:text-6xl text-indigo-200 leading-none tabular-nums shrink-0"
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="pt-1 md:pt-2">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">{r.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{r.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-slate-600 mt-10 leading-relaxed"
          >
            That’s exactly why ApplyRight lets you{' '}
            <span className="font-semibold text-slate-900">pick your interviewer</span> and run each
            round in any order — it mirrors a real hiring loop, so you practise the whole journey,
            not just one chat.
          </motion.p>
        </div>
      </section>

      {/* How ApplyRight scores — the rubric */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-16 flex max-w-[54ch] flex-col gap-3"
          >
            <span className="block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-300 mb-2">
              The exact rubric
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              How ApplyRight Scores Your Mock Interview
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              No black box. After every interview we read your transcript and rate it across seven
              dimensions — the same things real interviewers look for. Here’s exactly how it works.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-x-12 mb-14"
          >
            {RUBRIC.map((d, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                className={`flex gap-4 py-6 border-slate-800 ${
                  idx > 0 ? 'border-t' : ''
                } ${idx === 1 ? 'md:border-t-0' : ''}`}
              >
                <span className="font-mono text-sm tabular-nums text-slate-500 pt-0.5 shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-white leading-tight mb-1">{d.label}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{d.body}</p>
                  <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-500">
                    Scored 0–100
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Band legend */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="grid sm:grid-cols-3 gap-4 mb-12"
          >
            {[
              {
                band: 'Needs work',
                range: 'Below 45',
                color: 'rose',
                body: 'Answers are too vague or generic to show you’re ready yet.',
              },
              {
                band: 'Almost',
                range: '45 – 74',
                color: 'amber',
                body: 'Solid, evidenced answers that are nearly there.',
              },
              {
                band: 'Ready',
                range: '75 and up',
                color: 'emerald',
                body: 'Specific, role-relevant, well-structured — interview-ready.',
              },
            ].map((b, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-6 border ${
                  b.color === 'rose'
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : b.color === 'amber'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <div
                  className={`font-heading text-2xl font-bold mb-1 ${
                    b.color === 'rose'
                      ? 'text-rose-300'
                      : b.color === 'amber'
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                  }`}
                >
                  {b.band}
                </div>
                <div className="text-sm font-semibold text-slate-400 mb-3">{b.range}</div>
                <p className="text-slate-300 text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </motion.div>

          {/* The fine print that actually helps */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="max-w-3xl mx-auto space-y-4 text-slate-300"
          >
            {[
              {
                k: 'It judges content, not your voice.',
                v: 'The score reads a transcript — your tone, accent, and audio quality never affect it. Only what you said.',
              },
              {
                k: 'Honesty counts.',
                v: 'Claims your CV can’t support are flagged as overreach under “Consistency with CV” and count against you.',
              },
              {
                k: 'Speak fully.',
                v: 'If you barely answer (under ~40 characters total), you score 0. Give real, complete answers out loud — about 60–90 seconds each.',
              },
              {
                k: 'You get coached, every time.',
                v: 'Per-dimension scores plus Strengths, Gaps to close, and Practice next — viewable per interviewer in the Reviews tab.',
              },
            ].map((f, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle className="text-indigo-400 shrink-0 mt-1" size={20} />
                <p className="leading-relaxed">
                  <span className="font-semibold text-white">{f.k}</span> {f.v}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why practise with the conversational interview */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mb-12 md:mb-16 flex max-w-[54ch] flex-col gap-3"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800">
              Practise with a conversation
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Practise With a Real Conversation
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Reading about interviews only gets you so far. ApplyRight’s live voice interview lets
              you actually do it — and get scored.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Mic,
                title: 'Live voice, real conversation',
                body: 'It listens and reacts to your answers — it follows up and digs in, not a fixed list of questions.',
              },
              {
                icon: Briefcase,
                title: 'Grounded in your CV + the job',
                body: 'It asks about your real experience and this specific role — not generic textbook questions.',
              },
              {
                icon: Users,
                title: 'Pick your interviewer',
                body: 'HR, hiring manager, or a role specialist — each stays in their lane, just like a real loop.',
              },
              {
                icon: SlidersHorizontal,
                title: 'Set the difficulty',
                body: 'Choose gentle, realistic, or challenging — warm up easy, then turn up the pressure.',
              },
              {
                icon: ClipboardCheck,
                title: 'Scored + coached',
                body: 'The 7-dimension rubric plus tailored next steps after every single round.',
              },
              {
                icon: Trophy,
                title: 'Complete the loop',
                body: 'Practise every interviewer in any order — each round builds your combined readiness across the whole loop.',
              },
            ].map((f, idx) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={idx}
                  variants={fadeIn}
                  className="rounded-xl border border-slate-200 p-7"
                >
                  <Icon size={22} className="text-indigo-600 mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{f.body}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Primary CTA — flat ink band with a bare Bot on the right */}
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
                See where you stand
              </p>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-white">
                Ready to find out where you stand?
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-[52ch]">
                Everything on this page is something you can practise right now — in a real, scored
                conversation grounded in your CV and the job you want.
              </p>
              <button
                onClick={startInterview}
                className="inline-flex items-center gap-2 bg-white text-indigo-800 hover:bg-slate-100 hover:-translate-y-0.5 py-4 px-8 rounded-md shadow-sm font-bold text-lg transition-all"
              >
                Take an Interview Session and See your Score
                <ArrowRight size={22} />
              </button>
              <p className="mt-5 text-sm text-slate-400">Free 5-minute taste — no card needed.</p>
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

      {/* FAQ */}
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
              Questions, answered
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Questions, Answered</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {[
              {
                q: 'Is the score harsh?',
                a: 'It’s honest, not cruel. It rewards specific, evidenced, role-relevant answers and is candid about vague or generic ones — so the feedback actually helps you improve. Solid, well-evidenced answers comfortably clear the “almost” band.',
              },
              {
                q: 'Does my accent affect my score?',
                a: 'No. The score reads a transcript of what you said — it judges content only. Your accent, tone, pace, and audio quality have zero effect on it.',
              },
              {
                q: 'How many minutes do I need?',
                a: 'You get a free 5-minute taste to try it, no card needed. Each round is short, so that’s enough to complete a full interview and get scored. Longer practice uses metered live-interview minutes.',
              },
              {
                q: 'Can I re-do a round?',
                a: 'Yes. Run an interviewer as many times as you like — your scores and feedback are saved per interviewer in the Reviews tab, so you can watch yourself improve.',
              },
              {
                q: 'Is this like a real interview?',
                a: 'Close. It’s a live voice conversation that reacts to your answers, grounded in your CV and the specific job, with interviewers that stay in their lane — HR, hiring manager, or specialist. The main difference is it scores content only, where a real interview also weighs delivery.',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                className={`py-7 ${idx > 0 ? 'border-t border-slate-200' : ''}`}
              >
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.q}</h3>
                <p className="text-slate-600 leading-relaxed">{item.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HowToAceYourInterview;
