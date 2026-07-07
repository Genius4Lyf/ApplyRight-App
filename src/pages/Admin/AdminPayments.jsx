import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import { Banknote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';

const ngn = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

const statusBadge = (status) =>
  status === 'successful'
    ? 'bg-green-100 text-green-800'
    : status === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : status === 'abandoned'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-red-100 text-red-800';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const [purpose, setPurpose] = useState('all');

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, status, purpose },
        };
        const { data } = await api.get('/admin/payments', config);
        setPayments(data.payments);
        setSummary(data.summary || {});
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load payments');
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [page, status, purpose]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [status, purpose]);

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500">
            Real-money (₦) transactions — subscriptions, top-ups, passes.
          </p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          <span>
            {ngn(summary.successful?.revenue)} from {summary.successful?.count || 0} paid
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="all">All statuses</option>
          <option value="successful">Successful</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="all">All purposes</option>
          <option value="subscription">Subscription</option>
          <option value="topup">Minute top-up</option>
          <option value="download">Download pass</option>
          <option value="credit">Credit pack</option>
        </select>
        <span className="ml-auto text-sm text-slate-500">{total} payments</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Purpose</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {p.userId ? (
                        <Link
                          to={`/admin/users/${p.userId._id}`}
                          className="hover:text-primary transition-colors"
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {p.userId.firstName} {p.userId.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{p.userId.email}</p>
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Unknown User</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                        {p.purpose}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="font-medium text-slate-800">
                        {p.planLabel || p.planId || '-'}
                      </span>
                      {p.planId && p.planLabel && p.planLabel !== p.planId && (
                        <span className="block text-xs text-slate-400">{p.planId}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-slate-900">
                      {ngn(p.amountNgn)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(p.createdAt).toLocaleDateString()}{' '}
                      {new Date(p.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-600 font-medium">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
