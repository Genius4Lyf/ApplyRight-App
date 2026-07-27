import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';

const TIPS = [
  'Tailor your CV to every job description for better results.',
  "Use action verbs like 'Led', 'Created', and 'Optimized'.",
  'Keep your CV concise - 1-2 pages is usually best.',
  'Quantify your achievements with numbers and percentages.',
  'Proofread carefully! Typos can be a dealbreaker.',
  'Focus on results, not just responsibilities.',
  'Save your CV as a PDF to ensure formatting stays consistent.',
];

const CVTips = () => {
  const navigate = useNavigate();

  const buildCV = () => {
    const token = localStorage.getItem('token');
    navigate(token ? '/dashboard' : '/register');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <PublicNavbar />

      <main className="flex-grow pt-24 pb-16 sm:pt-28">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-slate-500 mb-4">
              CV Tips
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
              Quick wins for a stronger CV
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              A handful of small, high-leverage changes that make the difference between a CV
              that gets skimmed past and one that gets a callback.
            </p>
          </div>

          <ol className="space-y-6">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex gap-5 rounded-xl border border-slate-200 bg-white p-6">
                <span className="font-heading text-2xl font-bold text-slate-300 tabular-nums shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-lg text-slate-700 leading-relaxed pt-1">{tip}</p>
              </li>
            ))}
          </ol>

          <div className="mt-16 rounded-2xl bg-slate-900 text-white p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Let ApplyRight handle these for you
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto leading-relaxed">
              CV Studio quantifies your wins, keeps you the right length, and scores your CV
              Health live as you build.
            </p>
            <button
              onClick={buildCV}
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold py-3.5 px-8 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Build My CV Now <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CVTips;
