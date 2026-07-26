import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { formatRelative } from '../lib/relativeDate';
import { Plus, Search, X, Trash2, Eye, PenLine } from 'lucide-react';
import Navbar from '../components/Navbar';
import SortSelect from '../components/ui/SortSelect';
import CVService from '../services/cv.service';
import { getCompletionStatus, cvBand } from '../lib/cvCompleteness';
import { useMinVisible } from '../hooks/useMinVisible';
import CardDeck from '../components/ui/CardDeck';
import ViewToggle from '../components/ui/ViewToggle';
import NoteCard from '../components/ui/NoteCard';
import WorkspaceSkeleton from '../components/ui/WorkspaceSkeleton';
import { BAND_TEXT, BAND_RULEBG, NEXT_TONE, PAPER_CARD } from '../lib/noteStyles';

// i18n note: these are MODULE-LEVEL CONSTANTS, evaluated once at import time —
// `label` holds an i18n KEY, resolved via t() at render. 'complete' reuses the
// shared myCvs.complete key (same word used for the momentum stat).
const STATUS_FILTERS = [
  { key: 'all', labelKey: 'myCvs.statusFilters.all' },
  { key: 'incomplete', labelKey: 'myCvs.statusFilters.incomplete' },
  { key: 'complete', labelKey: 'myCvs.complete' },
];

const SORT_OPTIONS = [
  { key: 'recent', labelKey: 'myCvs.sort.recent' },
  { key: 'oldest', labelKey: 'myCvs.sort.oldest' },
  { key: 'title', labelKey: 'myCvs.sort.title' },
  { key: 'completion', labelKey: 'myCvs.sort.completion' },
];

const SORT_STORAGE_KEY = 'myCvsSort';

// Momentum figures computed only from fields that exist on a draft. Every value
// guards against missing fields and falls back to 0 rather than throwing.
// `t` is passed in explicitly — this is a plain module-level function, not a
// component, so it has no useTranslation() of its own.
const cvMomentum = (drafts = [], t) => {
  const list = Array.isArray(drafts) ? drafts : [];
  let complete = 0;
  let sum = 0;
  list.forEach((d) => {
    const { percent, isComplete } = getCompletionStatus(d);
    if (isComplete) complete += 1;
    sum += percent || 0;
  });
  const avg = list.length ? Math.round(sum / list.length) : 0;
  return [
    { label: t('myCvs.momentum.cvs'), value: list.length, tone: 'neutral' },
    { label: t('myCvs.complete'), value: complete, tone: 'neutral' },
    { label: t('myCvs.momentum.avgCompletion'), value: `${avg}%`, tone: 'ok' },
    { label: t('myCvs.momentum.inProgress'), value: list.length - complete, tone: 'neutral' },
  ];
};

// The primitives a note/row needs from one draft — completeness + display bits.
const deriveCv = (d, t) => {
  const { percent, isComplete, missing } = getCompletionStatus(d);
  const band = cvBand(percent, isComplete);
  const name = d.personalInfo?.fullName || t('myCvs.card.draftFallbackName');
  const relative = d.updatedAt ? formatRelative(new Date(d.updatedAt)) : '';
  const title = d.title || t('myCvs.card.untitledCv');
  return { percent, isComplete, missingCount: missing.length, band, name, relative, title };
};

const MyCVs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState(() => {
    try {
      return localStorage.getItem(SORT_STORAGE_KEY) || 'recent';
    } catch {
      return 'recent';
    }
  });
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('cvsView') === 'list' ? 'list' : 'deck';
    } catch {
      return 'deck';
    }
  });
  const [draftToDelete, setDraftToDelete] = useState(null);

  const showLoader = useMinVisible(loading, 400);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await CVService.getMyDrafts();
        if (!cancelled) setDrafts(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || t('myCvs.error.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 200);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sortBy);
    } catch {
      /* ignore */
    }
  }, [sortBy]);

  const handleViewChange = (v) => {
    setView(v);
    try {
      localStorage.setItem('cvsView', v);
    } catch {
      /* private mode — non-critical */
    }
  };

  const counts = useMemo(() => {
    let complete = 0;
    let incomplete = 0;
    drafts.forEach((d) => {
      if (getCompletionStatus(d).isComplete) complete += 1;
      else incomplete += 1;
    });
    return { all: drafts.length, complete, incomplete };
  }, [drafts]);

  // Deck shows the 10 most-recent drafts by updatedAt, independent of the list
  // view's search/status/sort state.
  const recentDrafts = useMemo(
    () =>
      [...drafts]
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        .slice(0, 10),
    [drafts]
  );

  const visibleDrafts = useMemo(() => {
    let list = drafts;

    if (statusFilter !== 'all') {
      list = list.filter((d) => {
        const { isComplete } = getCompletionStatus(d);
        return statusFilter === 'complete' ? isComplete : !isComplete;
      });
    }

    if (debouncedQuery) {
      list = list.filter((d) => {
        const title = (d.title || '').toLowerCase();
        const name = (d.personalInfo?.fullName || '').toLowerCase();
        return title.includes(debouncedQuery) || name.includes(debouncedQuery);
      });
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
        case 'title': {
          const untitled = t('myCvs.card.untitledCv');
          return (a.title || untitled).localeCompare(b.title || untitled);
        }
        case 'completion':
          return getCompletionStatus(a).percent - getCompletionStatus(b).percent;
        case 'recent':
        default:
          return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      }
    });
    return sorted;
  }, [drafts, statusFilter, debouncedQuery, sortBy, t]);

  const handleDelete = (draft) => setDraftToDelete(draft);
  const cancelDelete = () => setDraftToDelete(null);
  const confirmDelete = async () => {
    if (!draftToDelete) return;
    const id = draftToDelete._id;
    try {
      await CVService.deleteDraft(id);
      setDrafts((prev) => prev.filter((d) => d._id !== id));
      toast.success(t('myCvs.toasts.deleted'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('myCvs.toasts.deleteFailed'));
    } finally {
      setDraftToDelete(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('all');
  };

  // The single most useful next action + its accent, shared by note and row.
  const moveFor = ({ isComplete, missingCount }) =>
    isComplete
      ? { label: t('myCvs.card.reviewDownload'), tone: 'ok', Icon: Eye }
      : {
          label: t('myCvs.card.finishCv', { count: missingCount }),
          tone: 'accent',
          Icon: PenLine,
        };

  // A single draft as a paper note for the deck.
  const renderCvNote = (d) => {
    const info = deriveCv(d, t);
    const { percent, isComplete, band, name, relative, title } = info;
    return (
      <NoteCard
        band={band}
        stamp={{ value: percent, label: t('myCvs.complete') }}
        eyebrow={t('myCvs.card.editedMeta', { name, relative })}
        title={title}
        verdict={d.professionalSummary || undefined}
        emptyHint={t('myCvs.card.emptyHint')}
        nextMove={moveFor(info)}
        openLabel={isComplete ? t('myCvs.card.openLabelReview') : t('myCvs.card.openLabelEdit')}
        onOpen={() => navigate(isComplete ? `/resume/${d._id}` : `/cv-builder/${d._id}`)}
        onDelete={() => handleDelete(d)}
      />
    );
  };

  // A single draft as a dense editorial row for the list view.
  const renderRow = (d) => {
    const info = deriveCv(d, t);
    const { percent, isComplete, band, name, relative, title } = info;
    const mv = moveFor(info);
    const NextIcon = mv.Icon;
    const open = () => navigate(isComplete ? `/resume/${d._id}` : `/cv-builder/${d._id}`);
    return (
      <div
        key={d._id}
        role="button"
        tabIndex={0}
        aria-label={t('myCvs.card.openAria', { title })}
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

        {/* Completion */}
        <div className="text-center min-w-[3rem]">
          <div
            className={`font-heading text-xl sm:text-2xl font-bold tabular-nums leading-none ${BAND_TEXT[band]}`}
          >
            {percent}%
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {t('myCvs.complete')}
          </div>
        </div>

        {/* Title + next move */}
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 truncate">
            {t('myCvs.card.editedMeta', { name, relative })}
          </p>
          <h3 className="mt-0.5 font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h3>
          <span
            className={`mt-1 inline-flex max-w-full items-center gap-1.5 text-xs sm:text-sm font-semibold ${NEXT_TONE[mv.tone]}`}
          >
            <NextIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{mv.label}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(d);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-all"
            title={t('myCvs.card.deleteCv')}
            aria-label={t('myCvs.card.deleteCv')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
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
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : drafts.length === 0 ? (
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
                {t('myCvs.eyebrow')}
              </p>
              <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t('myCvs.title')}
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t('myCvs.subtitle')}
              </p>

              {/* Momentum — vertical list on desktop */}
              <div className="mt-8 hidden lg:block">
                {cvMomentum(drafts, t).map((s, i) => (
                  <div
                    key={s.label}
                    className={`flex items-baseline justify-between py-3.5 border-b border-slate-200 dark:border-slate-700 ${
                      i === 0 ? 'border-t' : ''
                    }`}
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                      {s.label}
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
                {cvMomentum(drafts, t).map((s) => (
                  <div
                    key={s.label}
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
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* View toggle + new-CV CTA — natural position under the stats */}
              <div className="mt-6 space-y-3">
                <ViewToggle value={view} onChange={handleViewChange} className="w-full" />
                <button
                  onClick={() => navigate('/cv-builder/new')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {t('myCvs.newCv')}
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
                  items={recentDrafts}
                  getKey={(d) => d._id}
                  renderItem={renderCvNote}
                  cardClassName={PAPER_CARD}
                  label={t('myCvs.deckLabel')}
                />
              ) : (
                <div className="space-y-4 lg:flex lg:flex-col lg:h-full lg:min-h-0">
                  {/* Search + status tabs + sort */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 lg:shrink-0">
                    <div className="relative flex-1 min-w-0">
                      <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('myCvs.search.placeholder')}
                        className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-100"
                        aria-label={t('myCvs.search.aria')}
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={() => setQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          aria-label={t('myCvs.search.clearAria')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="inline-flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5"
                        role="tablist"
                        aria-label={t('myCvs.filterAria')}
                      >
                        {STATUS_FILTERS.map((f) => {
                          const count = counts[f.key];
                          const active = statusFilter === f.key;
                          return (
                            <button
                              key={f.key}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => setStatusFilter(f.key)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                active
                                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                              }`}
                            >
                              {t(f.labelKey)}
                              <span
                                className={`ml-1.5 text-[10px] ${
                                  active
                                    ? 'text-slate-500 dark:text-slate-400'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <SortSelect
                        value={sortBy}
                        onChange={setSortBy}
                        options={SORT_OPTIONS.map((o) => ({ key: o.key, label: t(o.labelKey) }))}
                      />
                    </div>
                  </div>

                  {/* Rows */}
                  {visibleDrafts.length === 0 ? (
                    <FilteredEmptyState onClear={clearFilters} />
                  ) : (
                    <div className="space-y-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1 scrollbar-none">
                      {visibleDrafts.map(renderRow)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {draftToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-cv-title"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-300" />
              </div>
              <div className="flex-1">
                <h3
                  id="delete-cv-title"
                  className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2"
                >
                  {t('myCvs.deleteModal.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('myCvs.deleteModal.body', {
                    title: draftToDelete.title || t('myCvs.card.untitledCv'),
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={cancelDelete}
                className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyState = () => {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {t('myCvs.empty.eyebrow')}
      </p>
      <h2 className="mt-3 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100">
        {t('myCvs.empty.title')}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {t('myCvs.empty.body')}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/cv-builder/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> {t('myCvs.empty.createFirst')}
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          {t('myCvs.empty.goToDashboard')}
        </Link>
      </div>
    </div>
  );
};

const FilteredEmptyState = ({ onClear }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
        <Search className="w-7 h-7" />
      </div>
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
        {t('myCvs.filteredEmpty.title')}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        {t('myCvs.filteredEmpty.body')}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        {t('myCvs.filteredEmpty.clear')}
      </button>
    </div>
  );
};

const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <h2 className="text-base font-bold text-rose-600 dark:text-rose-300 mb-1">
        {t('myCvs.error.title')}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors"
      >
        {t('myCvs.error.retry')}
      </button>
    </div>
  );
};

export default MyCVs;
