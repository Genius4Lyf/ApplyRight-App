import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Target, Check, Plus, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import CVService from '../../services/cv.service';
import CreditGate from '../CreditGate';
import { CREDIT_COSTS } from '../../lib/credits';

const HELPER_OPEN_KEY = 'ar_kwhelper_open';

/**
 * ATS keyword guidance + live coverage tracker for the CV Builder.
 *
 * Keywords come in two tiers:
 *  - Free baseline (auto-loaded): dictionary keywords for a pasted JD, or cached
 *    AI inference from the title when no JD is given. Never charges.
 *  - Paid "Find more keywords": richer AI extraction, charged once per unique JD
 *    (cached on the draft). The backend enforces the charge; we persist the
 *    result via `onEnhanced` so auto-save doesn't wipe it.
 *
 * Coverage is computed on the backend with the synonym + fuzzy normalizer — NOT
 * naive substring matching — so "continuous integration" counts for "CI/CD" and
 * "react" never falsely matches "reaction". Updates live (debounced) as the user
 * types. It NEVER rewrites the user's content.
 *
 * `floating` renders it as a collapsible helper pinned to the screen so the user
 * can check coverage without scrolling back up. Collapsed it's a compact pill
 * showing live coverage; expanded it's the full card. Open/closed persists
 * across steps.
 *
 * @param {{ title?: string, description?: string, aiKeywords?: Array }} targetJob
 * @param {string}   [coveredText]   Free-text content to scan (e.g. bullets).
 * @param {string[]} [coveredSkills] Discrete skill list to match (Skills step).
 * @param {string}   [draftId]       Persisted draft id (required for the paid upgrade).
 * @param {boolean}  [floating]      Render as a pinned, collapsible helper.
 * @param {(name: string) => void} [onAddKeyword]
 * @param {(payload: { keywords: Array, aiKeywordsHash: string }) => void} [onEnhanced]
 */
const JobKeywordPanel = ({
  targetJob,
  coveredText = '',
  coveredSkills,
  draftId,
  floating = false,
  onAddKeyword,
  onEnhanced,
}) => {
  const [baseKeywords, setBaseKeywords] = useState([]);
  const [source, setSource] = useState('none');
  const [loading, setLoading] = useState(false);

  // Seed from any AI keywords already cached on the draft so a revisit shows the
  // enhanced set immediately (and for free).
  const [enhancedKeywords, setEnhancedKeywords] = useState(
    Array.isArray(targetJob?.aiKeywords) ? targetJob.aiKeywords : []
  );
  const [enhancing, setEnhancing] = useState(false);

  // Live coverage from the backend normalizer. null until first response.
  const [coverage, setCoverage] = useState(null);

  // Expanded/collapsed (floating only), remembered across steps.
  const [open, setOpenState] = useState(() => {
    try {
      return localStorage.getItem(HELPER_OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const setOpen = (v) => {
    setOpenState(v);
    try {
      localStorage.setItem(HELPER_OPEN_KEY, v ? '1' : '0');
    } catch {
      /* ignore storage failures */
    }
  };

  const title = (targetJob?.title || '').trim();
  const description = (targetJob?.description || '').trim();
  const fetchKey = `${title}::${description}`;
  const requestRef = useRef(0);
  const coverageRef = useRef(0);

  const isEnhanced = enhancedKeywords.length > 0;
  const displayed = isEnhanced ? enhancedKeywords : baseKeywords;

  const fetchBaseKeywords = async () => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const data = await CVService.getJobKeywords({ title, description });
      if (reqId !== requestRef.current) return;
      setBaseKeywords(Array.isArray(data?.keywords) ? data.keywords : []);
      setSource(data?.source || 'none');
    } catch {
      if (reqId !== requestRef.current) return;
      setBaseKeywords([]);
      setSource('none');
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Skip the baseline fetch when we already have enhanced keywords to show.
    if ((title || description) && enhancedKeywords.length === 0) fetchBaseKeywords();
  }, [fetchKey]);

  // Debounced coverage: recompute when the keyword set or the user's content
  // changes. Free endpoint, so polling-on-edit is fine; 600ms keeps it calm.
  const coverageSignature = `${displayed.map((k) => k.name).join('|')}::${coveredText}::${(
    coveredSkills || []
  ).join('|')}`;

  useEffect(() => {
    if (displayed.length === 0) {
      setCoverage(null);
      return undefined;
    }
    const handle = setTimeout(async () => {
      const reqId = ++coverageRef.current;
      try {
        const data = await CVService.getKeywordCoverage(displayed, {
          text: coveredText,
          skills: coveredSkills || [],
        });
        if (reqId === coverageRef.current) setCoverage(data);
      } catch {
        /* leave previous coverage in place on a transient error */
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [coverageSignature]);

  const handleEnhance = async () => {
    if (!description) return;
    setEnhancing(true);
    try {
      const data = await CVService.getJobKeywords(
        { title, description },
        { mode: 'rich', draftId }
      );
      const kws = Array.isArray(data?.keywords) ? data.keywords : [];
      if (kws.length === 0) {
        toast.error('Could not pull keywords from this job. Please try again.');
        return;
      }
      setEnhancedKeywords(kws);
      onEnhanced?.({ keywords: kws, aiKeywordsHash: data.aiKeywordsHash });
      if (data.charged) {
        if (typeof data.remainingCredits === 'number') {
          window.dispatchEvent(
            new CustomEvent('credit_updated', { detail: data.remainingCredits })
          );
        }
        toast.success('Keywords tailored to this job ✨');
      } else {
        toast.success('Loaded keywords for this job');
      }
    } catch (error) {
      const code = error.response?.data?.code;
      if (code === 'INSUFFICIENT_CREDITS') {
        toast.error(`Insufficient A.I credits (Requires ${CREDIT_COSTS.GENERATE_JD_KEYWORDS})`);
      } else if (code === 'SAVE_REQUIRED') {
        toast.error('Save your CV first to tailor keywords.');
      } else {
        toast.error('Could not tailor keywords. Please try again.');
      }
    } finally {
      setEnhancing(false);
    }
  };

  // Coverage lookup. Prefer the backend result; before it lands, fall back to a
  // cheap local check so chips aren't all-grey on first paint.
  const localHaystack = `${coveredText} ${(coveredSkills || []).join(' ')}`.toLowerCase();
  const coverageByName = useMemo(() => {
    const m = new Map();
    (coverage?.results || []).forEach((r) => m.set(r.name, r.covered));
    return m;
  }, [coverage]);
  const isCovered = (name) =>
    coverageByName.has(name)
      ? coverageByName.get(name)
      : localHaystack.includes(name.toLowerCase());

  // Nothing to work with at all → render nothing.
  if (!title && !description) return null;
  // Baseline empty, not enhanced, nothing loading, and no JD to upgrade against.
  if (!loading && displayed.length === 0 && !description) return null;

  const subtitle = isEnhanced
    ? 'AI-tailored to this job description.'
    : source === 'title'
      ? 'No job description provided — these are typical keywords for this role.'
      : 'Pulled from the target job. Include the ones that are genuinely true for you.';

  const pct = coverage?.total ? Math.round((coverage.covered / coverage.total) * 100) : 0;
  const barColor = pct >= 67 ? 'bg-emerald-500' : pct >= 34 ? 'bg-amber-500' : 'bg-rose-400';
  const dotColor = pct >= 67 ? 'bg-emerald-500' : pct >= 34 ? 'bg-amber-500' : 'bg-rose-400';

  // The card's inner content, reused by both the inline and floating layouts.
  const body = (
    <>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            Keywords for this job
            {isEnhanced && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 rounded-full px-1.5 py-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{subtitle}</p>
        </div>
      </div>

      {/* Live coverage tracker */}
      {coverage && coverage.total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {coverage.covered} of {coverage.total} key terms covered
            </span>
            {coverage.mustHaveTotal > 0 && (
              <span>
                must-haves {coverage.mustHaveCovered}/{coverage.mustHaveTotal}
              </span>
            )}
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Finding keywords…</span>
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          No common keywords detected — try AI tailoring below.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2.5 mt-3">
          {displayed.map((kw) => {
            if (isCovered(kw.name)) {
              return (
                <span
                  key={kw.name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-medium"
                >
                  <Check className="w-3 h-3" />
                  {kw.name}
                </span>
              );
            }
            const baseClass =
              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-medium';
            if (onAddKeyword) {
              return (
                <button
                  key={kw.name}
                  type="button"
                  onClick={() => onAddKeyword(kw.name)}
                  title="Add this as a skill"
                  className={`${baseClass} hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors`}
                >
                  <Plus className="w-3 h-3" />
                  {kw.name}
                </button>
              );
            }
            return (
              <span key={kw.name} className={baseClass}>
                {kw.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Paid upgrade — only when there's a JD to analyze and we haven't already
          enhanced for it. Gated so users short on credits get the watch-ad /
          get-credits path before they can click. */}
      {description && !isEnhanced && !loading && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <CreditGate cost={CREDIT_COSTS.GENERATE_JD_KEYWORDS} layout="card">
            <button
              type="button"
              onClick={handleEnhance}
              disabled={enhancing || !draftId}
              title={!draftId ? 'Save your CV first to tailor keywords' : undefined}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {enhancing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>{enhancing ? 'Finding more…' : 'Find more keywords'}</span>
              <span className="text-indigo-300 font-normal">·</span>
              <span className="font-normal">{CREDIT_COSTS.GENERATE_JD_KEYWORDS} cr</span>
            </button>
          </CreditGate>
        </div>
      )}

      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
        {onAddKeyword
          ? 'Green = already in your skills. Click a grey keyword to add it — only if it’s genuinely true for you.'
          : 'Green = already in your CV. Weave grey keywords into your bullets where they’re genuinely true.'}
      </p>
    </>
  );

  // ── Floating, collapsible helper ──
  // Portaled to <body> so `position: fixed` is viewport-relative and never gets
  // trapped by a transformed ancestor (the step forms use slide-in animations).
  if (floating) {
    if (!open) {
      return createPortal(
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-3 bottom-6 z-40 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all"
          title="Show keyword coverage"
        >
          <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
            <Target className="w-3 h-3" />
            {coverage && coverage.total > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white ${dotColor}`}
              />
            )}
          </span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {coverage && coverage.total > 0 ? (
              <>
                {coverage.covered}/{coverage.total} keywords
              </>
            ) : (
              'Keywords'
            )}
          </span>
        </button>,
        document.body
      );
    }
    return createPortal(
      <div className="fixed right-3 bottom-6 z-40 w-[min(320px,calc(100vw-1.5rem))] max-h-[calc(100dvh-7rem)] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pt-8 shadow-xl">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-1.5 right-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded-md transition-colors"
          title="Minimize"
          aria-label="Minimize keyword helper"
        >
          <X className="w-4 h-4" />
        </button>
        {body}
      </div>,
      document.body
    );
  }

  // ── Inline layout ──
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
      {body}
    </div>
  );
};

export default JobKeywordPanel;
