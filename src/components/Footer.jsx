import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo/applyright-icon.png';

/**
 * Footer — shared site footer in the landing design language: flat, serif
 * wordmark, mono uppercase column headers, slate neutrals, hairline borders,
 * indigo hover. Reusable across the landing page, Pricing, and the guide pages.
 */

const COLUMNS = [
  {
    header: 'Product',
    links: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'Start free', to: '/register' },
      { label: 'Log in', to: '/login' },
    ],
  },
  {
    header: 'Guides',
    links: [
      { label: 'ATS Guide', to: '/ats-guide' },
      { label: 'How ATS & Recruiters Work', to: '/how-ats-recruiters-work' },
      { label: 'How to Ace Your Interview', to: '/how-to-ace-your-interview' },
    ],
  },
  {
    header: 'Company',
    links: [
      { label: 'Contact', to: '/contact' },
      { label: 'Give Feedback', to: '/feedback' },
    ],
  },
  {
    header: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1160px] px-5 py-14 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_2fr] lg:gap-14">
          {/* Brand block */}
          <div className="flex flex-col items-start gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="ApplyRight Logo" className="h-7 w-auto" />
              <span className="font-heading text-xl font-bold tracking-tight text-slate-900">
                Apply<span className="text-indigo-600">Right</span>
              </span>
            </Link>
            <p className="font-heading text-base italic text-slate-600">
              Get hired — on paper, and in the room.
            </p>
            <Link
              to="/register"
              className="mt-1 inline-flex items-center rounded-md border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:border-indigo-800 hover:bg-indigo-800"
            >
              Start free
            </Link>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.header} className="flex flex-col gap-3">
                <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
                  {col.header}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.to + link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-slate-600 transition-colors hover:text-indigo-600"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center dark:border-slate-800">
          <p className="text-sm text-slate-500">© {year} ApplyRight. All rights reserved.</p>
          <p className="font-mono text-[0.72rem] tracking-[0.04em] text-slate-500">
            Built for job seekers in Nigeria &amp; beyond.
          </p>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-slate-400">
          <strong>Disclaimer:</strong> ApplyRight is an interview preparation tool. All mock
          sessions, voice conversations, and generated questions are designed solely for practice
          and confidence-building purposes. The questions simulated in our application are
          illustrative and do not guarantee the actual questions that will be encountered in your
          live hiring process.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
