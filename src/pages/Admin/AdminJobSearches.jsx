import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import api from '../../services/api';
import { Search, RefreshCw, ChevronLeft, ChevronRight, MousePointerClick, Bookmark, Filter, X } from 'lucide-react';

const AdminJobSearches = () => {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchSearches = async (pageNum = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const params = new URLSearchParams({ page: pageNum });
      if (keyword) params.append('keyword', keyword);
      if (source !== 'all') params.append('source', source);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/admin/job-searches?${params.toString()}`, config);
      setSearches(res.data.searches);
      setPage(res.data.page);
      setPages(res.data.pages);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Error fetching job searches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearches(1);
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSearches(1);
  };

  const clearFilters = () => {
    setKeyword('');
    setSource('all');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchSearches(1), 0);
  };

  const sourceColors = {
    adzuna: 'bg-blue-100 text-blue-700',
    jobberman: 'bg-green-100 text-green-700',
    mixed: 'bg-purple-100 text-purple-700',
    global: 'bg-indigo-100 text-indigo-700',
    local: 'bg-amber-100 text-amber-700',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Search Activity</h1>
            <p className="text-slate-500">
              {total} total search{total !== 1 ? 'es' : ''} recorded.
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              showFilters
                ? 'bg-primary text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <form
            onSubmit={handleFilter}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Keyword</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. react developer"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                >
                  <option value="all">All Sources</option>
                  <option value="adzuna">Adzuna</option>
                  <option value="jobberman">Jobberman</option>
                  <option value="mixed">Mixed</option>
                  <option value="global">Global</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Search className="w-4 h-4" />
                Apply Filters
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-primary/50 animate-spin" />
            </div>
          ) : searches.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No job searches found.</p>
              <p className="text-sm mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">User</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Keywords</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Location</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Source</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Results</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      <span className="flex items-center justify-center gap-1">
                        <MousePointerClick className="w-3.5 h-3.5" /> Clicks
                      </span>
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      <span className="flex items-center justify-center gap-1">
                        <Bookmark className="w-3.5 h-3.5" /> Saves
                      </span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {searches.map((search) => (
                    <tr
                      key={search._id}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {search.user ? (
                          <div>
                            <p className="font-medium text-slate-900">
                              {search.user.firstName} {search.user.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{search.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {search.query?.keywords || (
                          <span className="text-slate-400 italic">none</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {search.query?.location || (
                          <span className="text-slate-400 italic">any</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            sourceColors[search.source] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {search.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-900">
                        {search.resultCount}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-blue-600">
                        {search.clicks}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-amber-600">
                        {search.saves}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(search.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600">
                Page {page} of {pages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchSearches(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  onClick={() => fetchSearches(page + 1)}
                  disabled={page >= pages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminJobSearches;
