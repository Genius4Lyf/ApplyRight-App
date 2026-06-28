import React from 'react';
import { Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlanSelect from './PlanSelect';

// Effective subscription tier: the stored tier only counts while the sub is live
// (expiresAt in the future) — otherwise the user is effectively free.
const effectiveTier = (user) => {
  const exp = user.subscription?.expiresAt;
  if (exp && new Date(exp) > new Date()) return user.subscription?.tier || 'free';
  return 'free';
};

const tierBadgeClass = (tier) =>
  tier === 'pro'
    ? 'bg-amber-100 text-amber-800'
    : tier === 'plus'
      ? 'bg-indigo-100 text-indigo-800'
      : 'bg-slate-100 text-slate-600';

// { text, expired } describing the subscription expiry, or null if no sub.
const expiryInfo = (user) => {
  const exp = user.subscription?.expiresAt;
  if (!exp) return null;
  const d = new Date(exp);
  const now = new Date();
  if (d <= now) return { text: 'Expired', expired: true };
  const days = Math.ceil((d - now) / 86400000);
  return { text: `${days}d left`, expired: false };
};

const UserTable = ({ users, onPlanUpdate, onDelete }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Tier</th>
              <th className="px-6 py-4">Expires</th>
              <th className="px-6 py-4">Minutes</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary/90 font-bold border border-primary/20">
                      {user.firstName
                        ? user.firstName[0].toUpperCase()
                        : user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <PlanSelect
                    value={user.plan || 'free'}
                    onChange={(newPlan) => onPlanUpdate(user._id, newPlan)}
                  />
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const tier = effectiveTier(user);
                    return (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${tierBadgeClass(tier)}`}
                      >
                        {tier}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 text-sm">
                  {(() => {
                    const info = expiryInfo(user);
                    if (!info) return <span className="text-slate-400">—</span>;
                    return (
                      <span className={info.expired ? 'text-red-500' : 'text-slate-600'}>
                        {info.text}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">
                  {Math.floor((user.liveInterview?.secondsRemaining || 0) / 60)}m
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/admin/users/${user._id}`}
                      className="p-1 text-slate-400 hover:text-primary transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => onDelete(user._id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && (
        <div className="p-8 text-center text-slate-500">No users found matching your search.</div>
      )}
    </div>
  );
};

export default UserTable;
