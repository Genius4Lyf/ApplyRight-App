import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Briefcase, Bookmark, Globe, MapPin, Sparkles, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import GlobalBanner from '../components/GlobalBanner';
import JobSearchBar from '../components/jobs/JobSearchBar';
import FeatureAnnouncementModal from '../components/FeatureAnnouncementModal';
import JobResultCard from '../components/jobs/JobResultCard';
import JobDetailPanel from '../components/jobs/JobDetailPanel';
import OnboardingForm from '../components/jobs/OnboardingForm';
import TailorBetaModal from '../components/jobs/TailorBetaModal';
import jobSearchService from '../services/jobSearchService';
import CVService from '../services/cv.service';
import { toast } from 'sonner';

const TABS = [
  { id: 'all', label: 'All', icon: TrendingUp },
  { id: 'global', label: 'Global', icon: Globe },
  { id: 'local', label: 'Local', icon: MapPin },
  { id: 'foryou', label: 'For You', icon: Sparkles },
  { id: 'saved', label: 'Saved', icon: Bookmark },
];

const PAGE_SIZE = 10;

const JobSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  // Tab state
  const [activeTab, setActiveTab] = useState('all');

  // Per-tab pagination: { all: { results, pagination, categories, message }, ... }
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const [tabPage, setTabPage] = useState({ all: 1, global: 1, local: 1, foryou: 1, saved: 1 });

  // Search override
  const [searchResult, setSearchResult] = useState(null);
  const [searchPagination, setSearchPagination] = useState(null);
  const [searchId, setSearchId] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchParams, setSearchParams] = useState(null);
  const [searchPage, setSearchPage] = useState(1);

  // Detail panel
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // User CVs for tailoring
  const [userCVs, setUserCVs] = useState([]);

  // For You tab state
  const hasJobProfile = !!user.jobProfile?.desiredTitle;
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadUserCVs();
    loadTabData('all', 1);
  }, []);

  // Auto-open detail panel when navigated from dashboard with a specific job
  useEffect(() => {
    if (location.state?.openJob) {
      const job = location.state.openJob;
      const navSearchId = location.state.searchId;
      setSelectedJob(navSearchId ? { ...job, searchId: navSearchId } : job);
      setDetailOpen(true);
      // Clear the state so refreshing doesn't re-open
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const loadUserCVs = async () => {
    try {
      const drafts = await CVService.getMyDrafts();
      setUserCVs(drafts.filter((d) =>
        d.isComplete ||
        (d.personalInfo?.fullName && d.experience?.length > 0)
      ));
    } catch (error) {
      console.error('Failed to load CVs', error);
    }
  };

  const loadTabData = useCallback(async (tab, page = 1) => {
    setTabLoading((prev) => ({ ...prev, [tab]: true }));

    try {
      let data;

      switch (tab) {
        case 'all':
          data = await jobSearchService.getTrending('mixed', page, PAGE_SIZE);
          break;
        case 'global':
          data = await jobSearchService.getTrending('global', page, PAGE_SIZE);
          break;
        case 'local':
          data = await jobSearchService.getTrending('local', page, PAGE_SIZE);
          break;
        case 'foryou':
          data = await jobSearchService.getRecommendations(page, PAGE_SIZE);
          break;
        case 'saved':
          data = await jobSearchService.getSavedJobs(page, PAGE_SIZE);
          break;
        default:
          return;
      }

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
      if (tab === 'foryou') {
        setTabData((prev) => ({
          ...prev,
          foryou: {
            results: [],
            pagination: null,
            message: 'Set up your job preferences to see personalized recommendations',
          },
        }));
      }
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsSearchActive(false);
    setSearchResult(null);
    setSearchPagination(null);

    if (tab === 'foryou' && !hasJobProfile) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
      // Load first page if no data yet, otherwise reload current page
      const page = tabPage[tab] || 1;
      loadTabData(tab, page);
    }
  };

  const handleTabPageChange = (newPage) => {
    setTabPage((prev) => ({ ...prev, [activeTab]: newPage }));
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
    console.log('[JobSearch] Job clicked:', result);
    setSelectedJob(result);
    setDetailOpen(true);
  };

  const handleToggleSave = async (searchId, resultId) => {
    try {
      const { saved } = await jobSearchService.toggleSave(searchId, resultId);
      // Update search results
      if (searchResult) {
        setSearchResult((prev) =>
          prev.map((r) => (r._id === resultId ? { ...r, saved } : r))
        );
      }
      // Update tab results
      setTabData((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          if (updated[key]?.results) {
            updated[key] = {
              ...updated[key],
              results: updated[key].results.map((r) =>
                r._id === resultId ? { ...r, saved } : r
              ),
            };
          }
        }
        return updated;
      });
      if (selectedJob?._id === resultId) {
        setSelectedJob((prev) => ({ ...prev, saved }));
      }
      toast.success(saved ? 'Job bookmarked' : 'Bookmark removed');
    } catch {
      toast.error('Failed to save job');
    }
  };

  const handleApplyClick = async (searchId, resultId, applyUrl) => {
    try {
      await jobSearchService.trackClick(searchId, resultId);
    } catch {
      // Don't block the user from applying
    }
    window.open(applyUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setTabData((prev) => {
      const updated = { ...prev };
      delete updated.foryou;
      return updated;
    });
    setTabPage((prev) => ({ ...prev, foryou: 1 }));
    loadTabData('foryou', 1);
  };

  const handleTailorSuccess = (result) => {
    loadUserCVs();

    if (result.tailoredCV) {
      const isBundle = !!result.applicationId;
      toast.success(isBundle
        ? 'Bundle created! Review what changed, then preview your CV + Cover Letter.'
        : 'Tailored CV created! Redirecting to review...'
      );
      navigate(`/cv-builder/${result.tailoredCV._id}/finalize`, {
        state: { atsScores: result.atsScores, isBundle },
      });
      return;
    }
  };

  // Current display data
  const currentTabData = tabData[activeTab];
  const displayResults = isSearchActive ? searchResult : currentTabData?.results;
  const displayPagination = isSearchActive ? searchPagination : currentTabData?.pagination;
  const currentSearchId = isSearchActive ? searchId : currentTabData?.searchId;
  const isLoading = isSearchActive ? searchLoading : tabLoading[activeTab];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <GlobalBanner />
      <FeatureAnnouncementModal />
      <TailorBetaModal />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Find Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Discover jobs from Nigeria and around the world
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-4">
          <JobSearchBar
            onSearch={handleSearch}
            loading={searchLoading}
            onClear={isSearchActive ? handleClearSearch : undefined}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-0.5 bg-slate-100 rounded-lg w-fit max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.id && !isSearchActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search results header */}
        {isSearchActive && (
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm text-slate-500">
              {displayPagination?.totalCount || 0} search results
            </p>
            <button
              onClick={handleClearSearch}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear search
            </button>
          </div>
        )}

        {/* For You — onboarding prompt */}
        {activeTab === 'foryou' && showOnboarding && !isSearchActive && (
          <div className="bg-white rounded-xl border border-indigo-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Personalize your job feed</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Tell us what role you're looking for, your preferred location, and top skills so we can find the best job matches for you.
            </p>
            <OnboardingForm onComplete={handleOnboardingComplete} compact />
          </div>
        )}

        {/* For You — no results message */}
        {activeTab === 'foryou' && !showOnboarding && !isSearchActive && currentTabData?.message && !currentTabData?.results?.length && !isLoading && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-3">{currentTabData.message}</p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Set up job preferences
            </button>
          </div>
        )}

        {/* Trending categories */}
        {!isSearchActive && ['all', 'global', 'local'].includes(activeTab) && currentTabData?.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {currentTabData.categories.map((cat) => (
              <span
                key={cat}
                className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full font-medium"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              {activeTab === 'all' ? 'Loading trending jobs...' :
               activeTab === 'global' ? 'Loading global jobs...' :
               activeTab === 'local' ? 'Loading local jobs...' :
               activeTab === 'foryou' ? 'Finding jobs for you...' :
               activeTab === 'saved' ? 'Loading saved jobs...' :
               'Searching jobs...'}
            </div>
          </div>
        )}

        {/* Results grid */}
        {!isLoading && displayResults?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">
                {displayPagination
                  ? `Showing ${((displayPagination.page - 1) * displayPagination.limit) + 1}–${Math.min(displayPagination.page * displayPagination.limit, displayPagination.totalCount)} of ${displayPagination.totalCount} jobs`
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
                  onToggleSave={handleToggleSave}
                  onApplyClick={handleApplyClick}
                />
              ))}
            </div>

            {/* Pagination controls */}
            {displayPagination && displayPagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() =>
                    isSearchActive
                      ? handleSearchPageChange(displayPagination.page - 1)
                      : handleTabPageChange(displayPagination.page - 1)
                  }
                  disabled={!displayPagination.hasPrevPage}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {generatePageNumbers(displayPagination.page, displayPagination.totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-2 text-sm text-slate-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() =>
                          isSearchActive
                            ? handleSearchPageChange(p)
                            : handleTabPageChange(p)
                        }
                        className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                          p === displayPagination.page
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty states */}
        {!isLoading && !isSearchActive && activeTab !== 'foryou' && displayResults && displayResults.length === 0 && (
          <div className="text-center py-12">
            {activeTab === 'saved' ? (
              <>
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No saved jobs yet. Bookmark jobs to find them here.</p>
              </>
            ) : (
              <>
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No jobs found. Try searching with different keywords.</p>
              </>
            )}
          </div>
        )}
      </main>

      {/* Job Detail Panel */}
      <JobDetailPanel
        result={selectedJob}
        searchId={currentSearchId || selectedJob?.searchId}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedJob(null);
        }}
        onToggleSave={handleToggleSave}
        onApplyClick={handleApplyClick}
        userCVs={userCVs}
        onTailorSuccess={handleTailorSuccess}
      />
    </div>
  );
};

/**
 * Generate page number array with ellipsis for large page counts
 * e.g. [1, 2, 3, '...', 10] or [1, '...', 4, 5, 6, '...', 10]
 */
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
