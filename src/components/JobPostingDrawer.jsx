import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';

/**
 * JobPostingDrawer
 *
 * Right-side slide-over (full-screen sheet on mobile) that shows the original
 * job posting that an analysis was run against. The data already lives on the
 * application's populated `jobId` (title/company/description/jobUrl/keywords) —
 * this is purely a reference view, no fetching or mutation.
 *
 * Kept out of the main detail scroll on purpose: postings run long and would
 * bury the Generate CTAs if inlined. Opened from a ghost button in the detail
 * header; dismiss via backdrop, the X, or Esc.
 */

// Common JD section headers — used (alongside the ":" / short-line heuristics)
// to promote plain lines into editorial subheads.
const SECTION_WORDS = [
  'about',
  'about us',
  'the role',
  'responsibilities',
  "what you'll do",
  'requirements',
  'qualifications',
  'who you are',
  "what we're looking for",
  'skills',
  'nice to have',
  'benefits',
  'perks',
];

const BULLET_RE = /^\s*([•\-*–‣]|\d+\.)\s+/;
const isBulletLine = (l) => BULLET_RE.test(l);
const stripBullet = (l) => l.replace(BULLET_RE, '');

const isHeadingLine = (l) => {
  const t = l.trim();
  if (!t || t.length > 60) return false;
  if (isBulletLine(t)) return false;
  if (/[.!?]$/.test(t)) return false; // full sentences aren't headings
  if (t.endsWith(':')) return true;
  // Normalize curly apostrophes + drop a trailing colon before matching.
  const norm = t.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/:$/, '').trim();
  return SECTION_WORDS.some((w) => norm === w || norm.startsWith(w));
};

// Group the raw description into heading / bullet-list / paragraph blocks so it
// reads as a document instead of one grey wall of text.
const parseDescription = (text) => {
  const blocks = [];
  let bullets = [];
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push({ type: 'ul', items: bullets });
      bullets = [];
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      continue;
    }
    if (isBulletLine(line)) {
      bullets.push(stripBullet(line));
      continue;
    }
    flushBullets();
    blocks.push({ type: isHeadingLine(line) ? 'heading' : 'p', text: line });
  }
  flushBullets();
  return blocks;
};

const Description = ({ description }) => {
  const blocks = parseDescription(description);
  const hasStructure = blocks.some((b) => b.type === 'heading' || b.type === 'ul');

  // Graceful fallback: a plain posting with no detectable structure stays a
  // single pre-wrapped paragraph (styled editorially) so it still looks fine.
  if (!hasStructure) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words max-w-[62ch]">
        {description}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return (
            <h3 key={i} className="font-heading text-base text-slate-900 dark:text-slate-100 pt-1">
              {b.text}
            </h3>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((it, j) => (
                <li
                  key={j}
                  className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-[62ch]"
                >
                  <span className="mt-2 h-1 w-1 rounded-full bg-indigo-400 shrink-0" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={i}
            className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words max-w-[62ch]"
          >
            {b.text}
          </p>
        );
      })}
    </div>
  );
};

const JobPostingDrawer = ({ isOpen, onClose, job }) => {
  // Esc to close + lock body scroll while open so the page behind doesn't
  // scroll under the drawer on desktop.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const title = job?.title || 'Job posting';
  const company = job?.company || '';
  const description = job?.description || '';
  const jobUrl = job?.jobUrl || '';
  const keywords = Array.isArray(job?.keywords) ? job.keywords.filter(Boolean) : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-end"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md lg:max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Job posting"
          >
            {/* Editorial header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  The posting you analyzed against
                </p>
                <h2 className="mt-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {title}
                </h2>
                {company && (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {company}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 -mr-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                aria-label="Close job posting"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
              {/* Original posting link */}
              {jobUrl && (
                <a
                  href={jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View original posting
                </a>
              )}

              {/* Parsed keywords */}
              {keywords.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2">
                    What they screen for
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw, i) => (
                      <span
                        key={`${kw}-${i}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full description — rendered as a structured document */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2">
                  Job description
                </p>
                {description ? (
                  <Description description={description} />
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                    No description was saved for this posting.
                  </p>
                )}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobPostingDrawer;
