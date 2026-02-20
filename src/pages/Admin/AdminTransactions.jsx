import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import { Coins, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const AdminTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchTransactions = async (pageNumber = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const { data } = await axios.get(`http://localhost:5000/api/admin/transactions?page=${pageNumber}`, config);

            setTransactions(data.transactions);
            setPage(data.page);
            setPages(data.pages);
            setTotal(data.total);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions(page);
    }, [page]);

    return (
        <AdminLayout>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
                    <p className="text-slate-500">View and track all credit movements.</p>
                </div>
                <div className="bg-primary/5 text-primary/90 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    <span>Total Transactions: {total}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        Loading transactions...
                                    </td>
                                </tr>
                            ) : transactions.length > 0 ? (
                                transactions.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            {tx.userId ? (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {tx.userId.firstName} {tx.userId.lastName}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{tx.userId.email}</p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Unknown User</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                                                {tx.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate text-slate-600 text-sm">
                                            {tx.description || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-sm">
                                            {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-slate-600 font-medium">
                            Page {page} of {pages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(pages, p + 1))}
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

export default AdminTransactions;
