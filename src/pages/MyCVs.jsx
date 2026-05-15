import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, Plus, Search, X, ArrowUpDown, Trash2, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import CVCard from '../components/CVCard';
import CVService from '../services/cv.service';
import { getCompletionStatus } from '../lib/cvCompleteness';
import { useMinVisible } from '../hooks/useMinVisible';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'incomplete', label: 'Incomplete' },
  { key: 'complete', label: 'Complete' },
];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Recently updated' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'title', label: 'Title (A–Z)' },
  { key: 'completion', label: 'Least complete first' },
];

const SORT_STORAGE_KEY = 'myCvsSort';

const MyCVs = () => {
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
  const [draftToDelete, setDraftToDelete] = useState(null);

  const showLoader = useMinVisible(loading, 400);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await CVService.getMyDrafts();
        if (!cancelled) setDrafts(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load your CVs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sortBy);
    } catch {
      /* ignore */
    }
  }, [sortBy]);

  const counts = useMemo(() => {
    let complete = 0;
    let incomplete = 0;
    drafts.forEach((d) => {
      if (getCompletionStatus(d).isComplete) complete += 1;
      else incomplete += 1;
    });
    return { all: drafts.length, complete, incomplete };
  }, [drafts]);

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
        case 'title':
          return (a.title || 'Untitled CV').localeCompare(b.title || 'Untitled CV');
        case 'completion':
          return getCompletionStatus(a).percent - getCompletionStatus(b).percent;
        case 'recent':
        default:
          return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      }
    });
    return sorted;
  }, [drafts, statusFilter, debouncedQuery, sortBy]);

  const handleDelete = (draft) => setDraftToDelete(draft);
  const cancelDelete = () => setDraftToDelete(null);
  const confirmDelete = async () => {
    if (!draftToDelete) return;
    const id = draftToDelete._id;
    try {
      await CVService.deleteDraft(id);
      setDrafts((prev) => prev.filter((d) => d._id !== id));
      toast.success('CV deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete CV');
    } finally {
      setDraftToDelete(null);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-indigo-600">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">My CVs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {counts.all > 0 ? `${counts.all} CV${counts.all === 1 ? '' : 's'}` : 'Your CVs'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {counts.all > 0
                ? `${counts.complete} complete · ${counts.incomplete} in progress`
                : 'Build a fresh CV or upload an existing resume to get started.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              ApplyRight a job
            </Link>
            <Link
              to="/cv-builder/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New CV
            </Link>
          </div>
        </header>

        {drafts.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title or name…"
                className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-slate-400"
                aria-label="Search CVs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex items-center bg-slate-100 rounded-lg p-0.5"
                role="tablist"
                aria-label="Filter by status"
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
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f.label}
                      <span
                        className={`ml-1.5 text-[10px] ${
                          active ? 'text-indigo-500' : 'text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="sr-only">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-slate-200 rounded-md py-1.5 pl-2 pr-7 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {showLoader ? (
          <SkeletonGrid />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : drafts.length === 0 ? (
          <EmptyState />
        ) : visibleDrafts.length === 0 ? (
          <FilteredEmptyState onClear={clearFilters} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {visibleDrafts.map((draft) => (
              <CVCard key={draft._id} draft={draft} layout="full" onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {draftToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-cv-title"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 id="delete-cv-title" className="text-xl font-bold text-slate-900 mb-2">
                  Delete CV?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to delete &ldquo;{draftToDelete.title || 'Untitled CV'}
                  &rdquo;? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={cancelDelete}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-16 rounded-full bg-slate-100 animate-pulse" />
        </div>
        <div className="h-5 w-3/4 mb-2 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-full mb-1 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-5/6 mb-4 bg-slate-100 rounded animate-pulse" />
        <div className="h-1.5 w-full mb-4 bg-slate-100 rounded animate-pulse" />
        <div className="h-4 w-24 mt-auto bg-slate-100 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-5">
      <FileText className="w-8 h-8" />
    </div>
    <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No CVs yet</h2>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      Build a fresh CV from scratch or jump into ApplyRight to optimize an existing resume against a
      job posting.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <Link
        to="/cv-builder/new"
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm text-center transition-colors inline-flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        Create your first CV
      </Link>
      <Link
        to="/dashboard"
        className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm text-center transition-colors"
      >
        Go to dashboard
      </Link>
    </div>
  </div>
);

const FilteredEmptyState = ({ onClear }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
      <Search className="w-7 h-7" />
    </div>
    <h2 className="text-base font-bold text-slate-900 mb-1">No CVs match these filters</h2>
    <p className="text-sm text-slate-500 mb-5">Try a different search or clear the filters.</p>
    <button
      type="button"
      onClick={onClear}
      className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
    >
      Clear filters
    </button>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <h2 className="text-base font-bold text-rose-600 mb-1">Couldn&rsquo;t load your CVs</h2>
    <p className="text-sm text-slate-500 mb-5">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors"
    >
      Try again
    </button>
  </div>
);

export default MyCVs;
