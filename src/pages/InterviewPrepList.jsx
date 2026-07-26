import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, Play, ArrowRight, BookOpen } from 'lucide-react';
import { formatRelative } from '../lib/relativeDate';
import Navbar from '../components/Navbar';
import InterviewPrepService from '../services/interviewPrep.service';
import { useMinVisible } from '../hooks/useMinVisible';
import { computeReadiness, getPrepSummary } from '../utils/interviewPrep';
import CardDeck from '../components/ui/CardDeck';
import ViewToggle from '../components/ui/ViewToggle';
import NoteCard from '../components/ui/NoteCard';
import WorkspaceSkeleton from '../components/ui/WorkspaceSkeleton';
import { BAND_TEXT, BAND_RULEBG, NEXT_TONE, PAPER_CARD } from '../lib/noteStyles';

// Score → colour tone for readiness. Unprepped items (no rated questions/
// stories) read as neutral slate rather than alarming red.
const toneForScore = (score, total) => {
  if (!total) return 'slate';
  if (score >= 70) return 'emerald';
  if (score >= 40) return 'amber';
  return 'rose';
};

// toneForScore's slate/emerald/amber/rose → the editorial band vocabulary.
const TONE_TO_BAND = { emerald: 'ok', amber: 'warn', rose: 'bad', slate: 'neutral' };

// Most-recent timestamp for an item — practiced beats saved beats updated.
const dateRefOf = (a) =>
  a?.interviewPrep?.lastInterviewSession?.completedAt || a?.interviewPrep?.savedAt || a?.updatedAt;

// Momentum figures computed only from fields that exist on a prep item. Every
// value guards against missing fields and falls back to 0 rather than throwing.
const prepMomentum = (items = []) => {
  const list = Array.isArray(items) ? items : [];
  const scored = list.map((a) => computeReadiness(a)).filter((r) => (r?.total || 0) > 0);
  const avg = scored.length
    ? Math.round(scored.reduce((sum, r) => sum + (r.score || 0), 0) / scored.length)
    : 0;
  const ready = list.filter((a) => {
    const { score, total } = computeReadiness(a);
    return toneForScore(score, total) === 'emerald';
  }).length;
  const practiced = list.filter((a) => a?.interviewPrep?.lastInterviewSession?.completedAt).length;
  return [
    { labelKey: 'interviewPrep.list.momentum.preps', value: list.length, tone: 'neutral' },
    { labelKey: 'interviewPrep.list.momentum.avgReadiness', value: `${avg}%`, tone: 'ok' },
    { labelKey: 'interviewPrep.list.momentum.ready', value: ready, tone: 'neutral' },
    { labelKey: 'interviewPrep.list.momentum.practiced', value: practiced, tone: 'neutral' },
  ];
};

const InterviewPrepList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('prepView') === 'list' ? 'list' : 'deck';
    } catch {
      return 'deck';
    }
  });
  const showLoader = useMinVisible(loading, 800);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: list } = await InterviewPrepService.list();
        if (!cancelled) setItems(list || []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || t('interviewPrep.common.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewChange = (v) => {
    setView(v);
    try {
      localStorage.setItem('prepView', v);
    } catch {
      /* private mode — non-critical */
    }
  };

  // Deck shows the 10 most-recent preps by their date reference.
  const recentItems = [...items]
    .sort((a, b) => new Date(dateRefOf(b) || 0) - new Date(dateRefOf(a) || 0))
    .slice(0, 10);

  // Shared derivation for both the deck note and the dense row.
  const derivePrep = (app) => {
    const prep = app.interviewPrep || {};
    const job = app.jobId || {};
    const isCvOnly = app.source === 'draft';
    const { score, total, nextAction } = computeReadiness(app);
    const band = TONE_TO_BAND[toneForScore(score, total)] || 'neutral';
    const company = job.company || app.jobCompany || '';
    const practicedAt = prep.lastInterviewSession?.completedAt;
    const dateRef = practicedAt || prep.savedAt || app.updatedAt;
    const relative = dateRef ? formatRelative(new Date(dateRef)) : '';
    const title =
      job.title ||
      app.jobTitle ||
      (isCvOnly ? t('interviewPrep.list.cvDraft') : t('interviewPrep.list.untitledRole'));
    return { isCvOnly, score, total, nextAction, band, company, practicedAt, relative, title };
  };

  // Shared eyebrow — "{company} · practiced/updated {relative}".
  const eyebrowFor = (company, practicedAt, relative) =>
    t(practicedAt ? 'interviewPrep.list.eyebrowPracticed' : 'interviewPrep.list.eyebrowUpdated', {
      company: company || t('interviewPrep.list.cvDraft'),
      relative,
    });

  // A single prep as a paper note for the deck.
  const renderPrepNote = (app) => {
    const { isCvOnly, score, total, nextAction, band, company, practicedAt, relative, title } =
      derivePrep(app);
    return (
      <NoteCard
        band={band}
        stamp={{ value: total ? score : '—', label: t('interviewPrep.list.readinessStamp') }}
        eyebrow={eyebrowFor(company, practicedAt, relative)}
        title={title}
        chip={isCvOnly ? { label: t('interviewPrep.common.fromCv'), tone: 'warn' } : undefined}
        verdict={getPrepSummary(app) || undefined}
        nextMove={{ label: nextAction.label, tone: band, Icon: Play }}
        onOpen={() => navigate(`/interview-prep/${app._id}`)}
      />
    );
  };

  // A single prep as a dense editorial row for the list view.
  const renderRow = (app) => {
    const { isCvOnly, score, total, nextAction, band, company, practicedAt, relative, title } =
      derivePrep(app);
    const open = () => navigate(`/interview-prep/${app._id}`);
    return (
      <div
        key={app._id}
        role="button"
        tabIndex={0}
        aria-label={t('interviewPrep.list.openAria', { title })}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 pl-5 sm:p-5 sm:pl-6 cursor-pointer transition-colors hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-500/50"
      >
        {/* Band left edge */}
        <span
          aria-hidden="true"
          className={`absolute left-0 top-0 bottom-0 w-[3px] ${BAND_RULEBG[band]}`}
        />

        {/* Readiness */}
        <div className="text-center min-w-[3rem]">
          <div
            className={`font-heading text-xl sm:text-2xl font-bold tabular-nums leading-none ${BAND_TEXT[band]}`}
          >
            {total ? `${score}%` : '—'}
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {t('interviewPrep.common.ready')}
          </div>
        </div>

        {/* Role + next action */}
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 truncate">
            {eyebrowFor(company, practicedAt, relative)}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h3>
            {isCvOnly && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <BookOpen className="h-3 w-3" /> {t('interviewPrep.common.fromCv')}
              </span>
            )}
          </div>
          <span
            className={`mt-1 inline-flex max-w-full items-center gap-1.5 text-xs sm:text-sm font-semibold ${NEXT_TONE[band]}`}
          >
            <Play className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{nextAction.label}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/interview-prep/${app._id}/mock`);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label={t('interviewPrep.common.mockInterview')}
          >
            <Play className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{t('interviewPrep.common.mockInterview')}</span>
          </button>
          <span className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap group-hover:gap-2 transition-all">
            {t('interviewPrep.list.open')}
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-8 pb-8">
        {showLoader ? (
          <WorkspaceSkeleton />
        ) : error ? (
          <div className="text-center py-12 text-rose-600 dark:text-rose-300">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          /* Two-column workspace: identity + momentum rail on the left, the deck
             (or dense list) on the right. */
          <div
            className={`grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 lg:gap-12 items-stretch pb-8 ${
              view === 'list' ? 'lg:h-[calc(100vh-8rem)] lg:overflow-hidden' : ''
            }`}
          >
            {/* LEFT RAIL */}
            <div className="flex flex-col">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {t('interviewPrep.list.eyebrow')}
              </p>
              <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t('interviewPrep.list.title')}
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t('interviewPrep.list.subtitle')}
              </p>

              {/* Momentum — vertical list on desktop */}
              <div className="mt-8 hidden lg:block">
                {prepMomentum(items).map((s, i) => (
                  <div
                    key={s.labelKey}
                    className={`flex items-baseline justify-between py-3.5 border-b border-slate-200 dark:border-slate-700 ${
                      i === 0 ? 'border-t' : ''
                    }`}
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                      {t(s.labelKey)}
                    </span>
                    <span
                      className={`font-heading text-2xl font-bold tabular-nums ${
                        s.tone === 'ok'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Momentum — 2×2 grid on mobile */}
              <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 lg:hidden">
                {prepMomentum(items).map((s) => (
                  <div
                    key={s.labelKey}
                    className="px-4 py-3 border-slate-200 dark:border-slate-700 [&:nth-child(2)]:border-l [&:nth-child(4)]:border-l [&:nth-child(3)]:border-t [&:nth-child(4)]:border-t"
                  >
                    <div
                      className={`font-heading text-2xl font-bold tabular-nums ${
                        s.tone === 'ok'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {s.value}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      {t(s.labelKey)}
                    </div>
                  </div>
                ))}
              </div>

              {/* View toggle + direct-interview CTA — natural position under stats */}
              <div className="mt-6 space-y-3">
                <ViewToggle value={view} onChange={handleViewChange} className="w-full" />
                <button
                  onClick={() => navigate('/interview/start')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  <Mic className="h-4 w-4" />
                  {t('interviewPrep.list.startDirect')}
                </button>
              </div>
            </div>

            {/* RIGHT MAIN */}
            <div
              className={`min-w-0 ${
                view === 'list' ? 'lg:h-full lg:flex lg:flex-col lg:min-h-0' : ''
              }`}
            >
              {view === 'deck' ? (
                <CardDeck
                  items={recentItems}
                  getKey={(a) => a._id}
                  renderItem={renderPrepNote}
                  cardClassName={PAPER_CARD}
                  label={t('interviewPrep.list.tenRecent')}
                />
              ) : (
                <div className="space-y-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1 scrollbar-none">
                  {items.map(renderRow)}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const EmptyState = () => {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {t('interviewPrep.list.emptyEyebrow')}
      </p>
      <h2 className="mt-3 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
        {t('interviewPrep.list.emptyTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {t('interviewPrep.list.emptyBody')}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/interview/start"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          <Mic className="h-4 w-4" /> {t('interviewPrep.list.startDirect')}
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          {t('interviewPrep.list.runAnalysis')}
        </Link>
      </div>
    </div>
  );
};

export default InterviewPrepList;
