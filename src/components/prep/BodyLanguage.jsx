import React from 'react';
import { Clock, User, Eye, Hand, Zap, Smile } from 'lucide-react';

// Static, research-backed presence coaching. First impressions form in ~7
// seconds, so how you carry yourself matters before you say a word.
const TIPS = [
  {
    icon: Clock,
    title: 'The first 7 seconds',
    body: 'Impressions form almost instantly. Walk in with shoulders back, a warm smile, and unhurried, purposeful steps.',
  },
  {
    icon: User,
    title: 'Posture',
    body: 'Sit tall with an open chest; lean in slightly when listening. Don’t shrink, slouch, or fold your arms.',
  },
  {
    icon: Eye,
    title: 'Eye contact',
    body: 'Hold it ~4–5 seconds at a time — connection, not a stare. On video, look into the camera, not your own face.',
  },
  {
    icon: Hand,
    title: 'Handshake & hands',
    body: 'If offered, a firm (not crushing) grip with a smile. Rest your hands calmly and let them gesture naturally.',
  },
  {
    icon: Zap,
    title: 'Power pose',
    body: 'Two minutes standing tall, hands on hips, before you go in. It genuinely lifts confidence and lowers stress.',
  },
  {
    icon: Smile,
    title: 'Voice & pace',
    body: 'Slow down. A breath before you answer beats filler words, and a calm, warm tone reads as confident.',
  },
];

const BodyLanguage = () => (
  <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card p-5">
    <div className="flex items-center gap-2 mb-1">
      <Smile className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
        Walk in with presence
      </h3>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
      How you show up speaks before you do. A few habits that read as confident:
    </p>
    <div className="grid sm:grid-cols-2 gap-3">
      {TIPS.map((t, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <t.icon className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.title}</p>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{t.body}</p>
        </div>
      ))}
    </div>
  </section>
);

export default BodyLanguage;
