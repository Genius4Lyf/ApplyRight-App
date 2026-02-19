import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/Admin/AdminLayout';
import { User, Mail, Phone, Calendar, ArrowLeft, FileText, Briefcase, Coins, ShieldCheck, CreditCard } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const AdminUserDetails = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`http://localhost:5000/api/admin/users/${id}`, config);
                setUserData(data.data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load user details");
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!userData) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <h2 className="text-xl font-bold text-slate-900">User not found</h2>
                    <Link to="/admin/users" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
                        Back to Users
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    const { user, stats, transactions } = userData;

    return (
        <AdminLayout>
            <div className="mb-6">
                <Link to="/admin/users" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Users
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                            {user.firstName?.charAt(0) || user.email?.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {user.firstName} {user.lastName}
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                                    }`}>
                                    {user.role}
                                </span>
                                <span>•</span>
                                <span>ID: {user._id}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                        <Coins className="w-5 h-5" />
                        <span>Credits: {user.credits}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Profile Info */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
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
                                <p className="text-sm font-medium text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="w-4 h-4 text-slate-400 mt-1" />
                            <div>
                                <p className="text-xs text-slate-500">Plan</p>
                                <p className="text-sm font-medium text-slate-900 capitalize">{user.plan}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-indigo-600" />
                        Usage Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg text-center">
                            <FileText className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
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

                {/* Quick Actions (Future) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center opacity-50">
                    <CreditCard className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-500">Payment Methods</p>
                    <p className="text-xs text-slate-400">Coming Soon</p>
                </div>
            </div>

            {/* Transactions History */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-indigo-600" />
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
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {tx.description || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'}`}>
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
        </AdminLayout>
    );
};

export default AdminUserDetails;
