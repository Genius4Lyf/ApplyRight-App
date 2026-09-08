import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import GlobalBanner from '../components/GlobalBanner';
import JobSearchBar from '../components/jobs/JobSearchBar';
import JobResultCard from '../components/jobs/JobResultCard';
import JobDetailPanel from '../components/jobs/JobDetailPanel';
import jobSearchService from '../services/jobSearchService';
import { toast } from 'sonner';

// THE GLOBAL / LOCAL SPLIT IS GONE, because the split was Adzuna vs Jobberman and
// Adzuna has been removed (see jobSearch.service for why: it publishes no Nigeria
// index, so every NG query was silently answered from the UNITED KINGDOM one).
//
// With one board left, "Global" could only ever render an empty list and "All" was the
// same list as "Local" — three tabs for one thing, one of them permanently broken. The
// page shows that one list directly. `loadTabData` and the tab-keyed state survive
// intact so a second board can bring the tabs back without rebuilding the page.
const ONLY_TAB = 'all';

const PAGE_SIZE = 10;

const JobSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab] = useState(ONLY_TAB);

  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState({});

  const [searchResult, setSearchResult] = useState(null);
  const [searchPagination, setSearchPagination] = useState(null);
  const [searchId, setSearchId] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchParams, setSearchParams] = useState(null);
  const [searchPage, setSearchPage] = useState(1);

  const [selectedJob, setSelectedJob] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadTabData(ONLY_TAB, 1);
  }, []);

  useEffect(() => {
    if (location.state?.openJob) {
      const job = location.state.openJob;
      const navSearchId = location.state.searchId;
      setSelectedJob(navSearchId ? { ...job, searchId: navSearchId } : job);
      setDetailOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const loadTabData = useCallback(async (tab, page = 1) => {
    setTabLoading((prev) => ({ ...prev, [tab]: true }));

    try {
      // 'mixed' is still what the API takes; with one board it means 'everything'.
      const data = await jobSearchService.getTrending('mixed', page, PAGE_SIZE);

      setTabData((prev) => ({
        ...prev,
        [tab]: {
          results: data.results || [],
          pagination: data.pagination || null,
          searchId: data.searchId || data._id,
          categories: data.categories,
          message: data.message,
        },
      }));
    } catch (error) {
      console.error(`Failed to load ${tab} jobs`, error);
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  const handleTabPageChange = (newPage) => {
    loadTabData(activeTab, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = async (params, page = 1) => {
    setSearchLoading(true);
    setIsSearchActive(true);
    setSearchParams(params);
    setSearchPage(page);
    try {
      const data = await jobSearchService.search({ ...params, page, limit: PAGE_SIZE });
      setSearchResult(data.results || []);
      setSearchPagination(data.pagination || null);
      setSearchId(data._id || null);
      if (!data.results?.length) {
        toast.info('No jobs found. Try different keywords or filters.');
      }
    } catch (error) {
      console.error('Search failed', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchPageChange = (newPage) => {
    if (searchParams) {
      setSearchPage(newPage);
      handleSearch(searchParams, newPage);
    }
  };

  const handleClearSearch = () => {
    setIsSearchActive(false);
    setSearchResult(null);
    setSearchPagination(null);
    setSearchId(null);
    setSearchParams(null);
    setSearchPage(1);
  };

  const handleViewDetails = (result) => {
    setSelectedJob(result);
    setDetailOpen(true);
  };

  const handleApplyClick = async (searchId, resultId, applyUrl) => {
    try {
      await jobSearchService.trackClick(searchId, resultId);
    } catch {
      // Don't block the user from applying
    }
    window.open(applyUrl, '_blank', 'noopener,noreferrer');
  };

  const currentTabData = tabData[activeTab];
  const displayResults = isSearchActive ? searchResult : currentTabData?.results;
  const displayPagination = isSearchActive ? searchPagination : currentTabData?.pagination;
  const currentSearchId = isSearchActive ? searchId : currentTabData?.searchId;
  const isLoading = isSearchActive ? searchLoading : tabLoading[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <GlobalBanner />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Find Jobs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Openings across Nigeria, from Jobberman
          </p>
        </div>

        <div className="mb-4">
          <JobSearchBar
            onSearch={handleSearch}
            loading={searchLoading}
            onClear={isSearchActive ? handleClearSearch : undefined}
          />
        </div>

        {isSearchActive && (
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {displayPagination?.totalCount || 0} search results
            </p>
            <button
              onClick={handleClearSearch}
              className="text-xs text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium"
            >
              Clear search
            </button>
          </div>
        )}

        {!isSearchActive && currentTabData?.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {currentTabData.categories.map((cat) => (
              <span
                key={cat}
                className="text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 rounded-full font-medium"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(PAGE_SIZE)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col h-[180px]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 shrink-0"></div>
                    <div className="flex-1 space-y-3 mt-1">
                      <div className="flex justify-between items-start gap-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded w-24"></div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded w-16"></div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded w-full"></div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && displayResults?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {displayPagination
                  ? `Showing ${(displayPagination.page - 1) * displayPagination.limit + 1}–${Math.min(displayPagination.page * displayPagination.limit, displayPagination.totalCount)} of ${displayPagination.totalCount} jobs`
                  : `${displayResults.length} jobs`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayResults.map((result) => (
                <JobResultCard
                  key={result._id || result.externalId}
                  result={result}
                  searchId={currentSearchId || result.searchId}
                  onViewDetails={handleViewDetails}
                  onApplyClick={handleApplyClick}
                />
              ))}
            </div>

            {displayPagination && displayPagination.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                <button
                  onClick={() =>
                    isSearchActive
                      ? handleSearchPageChange(displayPagination.page - 1)
                      : handleTabPageChange(displayPagination.page - 1)
                  }
                  disabled={!displayPagination.hasPrevPage}
                  aria-label="Previous page"
                  className="flex items-center gap-1 px-3 min-h-[44px] text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {generatePageNumbers(displayPagination.page, displayPagination.totalPages).map(
                    (p, i) =>
                      p === '...' ? (
                        <span
                          key={`dots-${i}`}
                          className="px-2 text-sm text-slate-400 dark:text-slate-500"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() =>
                            isSearchActive ? handleSearchPageChange(p) : handleTabPageChange(p)
                          }
                          className={`w-11 h-11 sm:w-9 sm:h-9 text-sm font-medium rounded-lg transition-colors ${
                            p === displayPagination.page
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      )
                  )}
                </div>

                <button
                  onClick={() =>
                    isSearchActive
                      ? handleSearchPageChange(displayPagination.page + 1)
                      : handleTabPageChange(displayPagination.page + 1)
                  }
                  disabled={!displayPagination.hasNextPage}
                  aria-label="Next page"
                  className="flex items-center gap-1 px-3 min-h-[44px] text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {!isLoading && displayResults && displayResults.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-500 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              No jobs found. Try searching with different keywords.
            </p>
          </div>
        )}
      </main>

      <JobDetailPanel
        result={selectedJob}
        searchId={currentSearchId || selectedJob?.searchId}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedJob(null);
        }}
        onApplyClick={handleApplyClick}
      />
    </div>
  );
};

function generatePageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  pages.push(1);

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}

export default JobSearch;
