import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/Admin/AdminLayout';
import {
  User,
  Mail,
  Phone,
  Calendar,
  ArrowLeft,
  FileText,
  Briefcase,
  Coins,
  ShieldCheck,
  CreditCard,
  Clock,
  Download,
  Banknote,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import PlanSelect from '../../components/Admin/PlanSelect';

const AdminUserDetails = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [updatingUnlock, setUpdatingUnlock] = useState(false);

  // Support grant: unlock ALL interview-loop interviewers for this user (bypass
  // the 65% gate). Used when a user reaches out asking to skip the gamification.
  const handleInterviewUnlock = async (unlock) => {
    setUpdatingUnlock(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await api.put(`/admin/users/${id}/interview-unlock`, { unlock }, config);
      setUserData((prev) => ({
        ...prev,
        user: { ...prev.user, unlockAllInterviewers: unlock },
      }));
      toast.success(unlock ? 'All interviewers unlocked' : 'Interviewer unlock removed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update interviewer unlock');
    } finally {
      setUpdatingUnlock(false);
    }
  };

  const handlePlanChange = async (newPlan) => {
    if (newPlan === userData?.user?.plan) return;
    setUpdatingPlan(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await api.put(`/admin/users/${id}/plan`, { plan: newPlan }, config);
      setUserData((prev) => ({ ...prev, user: { ...prev.user, plan: newPlan } }));
      toast.success(`Plan updated to ${newPlan}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update plan');
    } finally {
      setUpdatingPlan(false);
    }
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await api.get(`/admin/users/${id}`, config);
        setUserData(data.data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!userData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-slate-900">User not found</h2>
          <Link to="/admin/users" className="text-primary hover:text-primary/95 mt-4 inline-block">
            Back to Users
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { user, stats, transactions, payments = [] } = userData;

  // Effective subscription state (expiresAt is the source of truth).
  const sub = user.subscription || {};
  const subActive = sub.expiresAt && new Date(sub.expiresAt) > new Date();
  const daysLeft = subActive ? Math.ceil((new Date(sub.expiresAt) - new Date()) / 86400000) : 0;
  const minutesLeft = Math.floor((user.liveInterview?.secondsRemaining || 0) / 60);
  const ngn = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link
          to="/admin/users"
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {user.firstName?.charAt(0) || user.email?.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {user.firstName} {user.lastName}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {user.role}
                </span>
                <span>•</span>
                <span>ID: {user._id}</span>
              </div>
            </div>
          </div>
          <div className="bg-primary/5 text-primary/90 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
            <Coins className="w-5 h-5" />
            <span>A.I Credits: {user.credits}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Profile Info */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile Details
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium text-slate-900 break-all">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm font-medium text-slate-900">{user.phone || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-xs text-slate-500">Joined</p>
                <p className="text-sm font-medium text-slate-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-xs text-slate-500">Last login</p>
                <p className="text-sm font-medium text-slate-900">
                  {user.lastLoginAt
                    ? `${new Date(user.lastLoginAt).toLocaleString()} · ${user.loginCount || 0} logins`
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-slate-400 mt-1" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Plan</p>
                <div className="flex items-center gap-2 mt-1">
                  <PlanSelect
                    value={user.plan}
                    onChange={handlePlanChange}
                    disabled={updatingPlan}
                    size="md"
                  />
                  {updatingPlan && (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-slate-400 mt-1" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Interview loop</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => handleInterviewUnlock(!user.unlockAllInterviewers)}
                    disabled={updatingUnlock}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
                      user.unlockAllInterviewers
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {user.unlockAllInterviewers
                      ? 'All interviewers unlocked — click to re-lock'
                      : 'Unlock all interviewers'}
                  </button>
                  {updatingUnlock && (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Usage Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <FileText className="w-6 h-6 text-primary/50 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{stats.resumes}</p>
              <p className="text-xs text-slate-500">Resumes Created</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <Briefcase className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{stats.applications}</p>
              <p className="text-xs text-slate-500">Applications</p>
            </div>
          </div>
        </div>

        {/* Subscription & Entitlements */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Subscription
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tier</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                  subActive
                    ? sub.tier === 'pro'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {subActive ? sub.tier : 'free'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Plan</span>
              <span className="font-medium text-slate-900">{sub.planId || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <span className={`font-medium ${subActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                {subActive ? `Active · ${daysLeft}d left` : 'No active subscription'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Expires</span>
              <span className="font-medium text-slate-900">
                {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Sub credits left</span>
              <span className="font-medium text-slate-900">{sub.creditsRemaining ?? 0}</span>
            </div>
            <hr className="border-slate-100" />
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Live minutes left
              </span>
              <span className="font-medium text-slate-900">{minutesLeft}m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download passes
              </span>
              <span className="font-medium text-slate-900">
                {user.downloads?.passRemaining ?? 0}
                {user.downloads?.freeDownloadUsed ? '' : ' (+1 free)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Ever purchased</span>
              <span className="font-medium text-slate-900">
                {user.hasEverPurchased ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Transaction History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{tx.description || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {tx.amount > 0 ? '+' : ''}
                        {tx.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${
                                                  tx.status === 'completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : tx.status === 'pending'
                                                      ? 'bg-yellow-100 text-yellow-800'
                                                      : 'bg-red-100 text-red-800'
                                                }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments (real money, NGN) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            Payments (₦)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Purpose</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                        {p.purpose}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.planId || '-'}</td>
                    <td className="px-6 py-4 font-bold text-sm text-slate-900">
                      {ngn(p.amountNgn)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          p.status === 'successful'
                            ? 'bg-green-100 text-green-800'
                            : p.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUserDetails;
