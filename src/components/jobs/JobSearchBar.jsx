import React, { useState } from 'react';
import { Search, MapPin, SlidersHorizontal, X, Globe, Wifi } from 'lucide-react';

const COUNTRIES = [
  { code: 'ng', label: 'Nigeria' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'us', label: 'United States' },
  { code: 'ca', label: 'Canada' },
  { code: 'au', label: 'Australia' },
  { code: 'de', label: 'Germany' },
  { code: 'fr', label: 'France' },
  { code: 'in', label: 'India' },
  { code: 'za', label: 'South Africa' },
  { code: 'nl', label: 'Netherlands' },
];

const JOB_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'fulltime', label: 'Full-time' },
  { value: 'parttime', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

const JobSearchBar = ({ onSearch, loading, onClear }) => {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('ng');
  const [jobType, setJobType] = useState('');
  const [remote, setRemote] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = (overrides = {}) => {
    const params = { keywords, location, country, jobType, remote, source: 'mixed', ...overrides };
    if (!params.keywords.trim()) return;
    onSearch(params);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!keywords.trim()) return;
    setHasSearched(true);
    doSearch();
  };

  // Auto-re-search when a filter changes and user has already searched
  const handleFilterChange = (setter, value, field) => {
    setter(value);
    if (hasSearched && keywords.trim()) {
      doSearch({ [field]: value });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Main search bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Job title, skills, or keywords..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2 sm:w-auto">
          <div className="flex-1 sm:w-40 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`shrink-0 p-2.5 rounded-lg border transition-colors ${
              showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
            title="Toggle filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 sm:w-auto">
          <button
            type="submit"
            disabled={loading || !keywords.trim()}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          {onClear && (
            <button
              type="button"
              onClick={() => { setHasSearched(false); onClear(); }}
              className="shrink-0 p-2.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={country}
              onChange={(e) => handleFilterChange(setCountry, e.target.value, 'country')}
              className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <select
            value={jobType}
            onChange={(e) => handleFilterChange(setJobType, e.target.value, 'jobType')}
            className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {JOB_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={remote}
              onChange={(e) => handleFilterChange(setRemote, e.target.checked, 'remote')}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Wifi className="w-3.5 h-3.5" />
            Remote only
          </label>
        </div>
      )}
    </form>
  );
};

export default JobSearchBar;
