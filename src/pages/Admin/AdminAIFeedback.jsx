import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import AdminLayout from '../../components/Admin/AdminLayout';
import api from '../../services/api';

const AdminAIFeedback = () => {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all'); // 'all' | 'up' | 'down'
  const [operationFilter, setOperationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      if (filter !== 'all') params.set('feedback', filter);
      if (operationFilter) params.set('operation', operationFilter);

      const [statsRes, listRes] = await Promise.all([
        api.get('/ai-feedback/stats'),
        api.get(`/ai-feedback?${params.toString()}`),
      ]);
      setStats(statsRes.data);
      setItems(listRes.data.items || []);
      setTotalPages(listRes.data.totalPages || 1);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, operationFilter]);

  const last30 = stats?.last30Days || { up: 0, down: 0, total: 0 };
  const sentimentRate = last30.total > 0 ? Math.round((last30.up / last30.total) * 100) : null;

  const operations = stats?.byOperation || [];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">AI Feedback</h1>
            <p className="text-sm text-slate-500 mt-1">
              Quality signals from 👍/👎 ratings on AI-generated artifacts.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* KPI cards — last-30-day snapshot. AICallLog has a 90-day TTL, so
            "all-time" totals are bounded by retention. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <KpiCard
            label="Last 30 days"
            value={last30.total}
            icon={MessageSquare}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <KpiCard
            label="👍 Helpful"
            value={last30.up}
            icon={ThumbsUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <KpiCard
            label="👎 Not helpful"
            value={last30.down}
            icon={ThumbsDown}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
          />
          <KpiCard
            label="Helpful rate"
            value={sentimentRate !== null ? `${sentimentRate}%` : '—'}
            icon={TrendingUp}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        {/* By-operation breakdown */}
        {operations.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-6">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Breakdown by operation</h2>
            <div className="space-y-2">
              {operations.map((op) => {
                const rate = op.total > 0 ? (op.up / op.total) * 100 : 0;
                return (
                  <button
                    key={op._id}
                    type="button"
                    onClick={() => setOperationFilter(operationFilter === op._id ? '' : op._id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                      operationFilter === op._id
                        ? 'border-indigo-300 bg-indigo-50/40'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-mono text-slate-700 truncate flex-1">
                      {op._id}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {op.up}
                    </span>
                    <span className="text-xs font-semibold text-rose-700 inline-flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3" /> {op.down}
                    </span>
                    <div className="hidden sm:block w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 tabular-nums w-10 text-right">
                      {Math.round(rate)}%
                    </span>
                  </button>
                );
              })}
            </div>
            {operationFilter && (
              <button
                type="button"
                onClick={() => setOperationFilter('')}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Clear operation filter
              </button>
            )}
          </div>
        )}

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4">
          {['all', 'up', 'down'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'up' ? '👍 Helpful' : '👎 Not helpful'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs uppercase tracking-wider font-bold text-slate-500">
            Recent feedback
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No feedback yet for the current filter.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <FeedbackRow key={item._id} item={item} />
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const KpiCard = ({ label, value, icon: Icon, iconBg, iconColor }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg} ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const FeedbackRow = ({ item }) => {
  const isUp = item.feedback === 'up';
  const userLabel = item.userId
    ? item.userId.firstName || item.userId.lastName
      ? `${item.userId.firstName || ''} ${item.userId.lastName || ''}`.trim()
      : item.userId.email
    : 'Unknown user';
  const appLabel = item.applicationId
    ? `${item.applicationId.jobTitle || 'Untitled'}${item.applicationId.jobCompany ? ` @ ${item.applicationId.jobCompany}` : ''}`
    : null;
  return (
    <li className="px-4 py-3 flex items-start gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        }`}
      >
        {isUp ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-700">{item.operation}</span>
          {item.provider && (
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              {item.provider} · {item.model || ''}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-700 mt-0.5">
          <span className="font-semibold">{userLabel}</span>
          {appLabel && <span className="text-slate-500"> on {appLabel}</span>}
        </p>
        {item.feedbackComment && (
          <p className="text-xs text-slate-500 italic mt-1">"{item.feedbackComment}"</p>
        )}
      </div>
      <span className="text-xs text-slate-400 shrink-0">
        {item.feedbackAt ? formatDistanceToNow(new Date(item.feedbackAt), { addSuffix: true }) : ''}
      </span>
    </li>
  );
};

export default AdminAIFeedback;
