import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import DashboardStats from '../../components/Admin/DashboardStats';
import { Users, DollarSign, FileText, TrendingUp, Coins } from 'lucide-react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import CustomSelect from '../../components/Admin/CustomSelect';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalCredits: 0,
        totalResumes: 0,
        newUsersLastMonth: 0,
        recentTransactions: [],
        chartData: [] // Initialize empty
    });
    const [loading, setLoading] = useState(true);

    // Filter States
    const [viewType, setViewType] = useState('monthly'); // 'monthly' (Year View) or 'daily' (Month View)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12

    // Dropdown options
    const years = Array.from({ length: 5 }, (_, i) => {
        const y = new Date().getFullYear() - i;
        return { value: y, label: y.toString() };
    });

    const months = [
        { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
        { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
        { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
        { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' }
    ];

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const config = {
                    headers: { Authorization: `Bearer ${token}` }
                };

                // Build Query
                const query = `period=${viewType}&year=${selectedYear}&month=${selectedMonth}`;
                const response = await axios.get(`http://localhost:5000/api/admin/stats?${query}`, config);

                // Process chart data to be more readable if needed, or rely on backend format
                // For now backend returns YYYY-MM or YYYY-MM-DD as name
                setStats(response.data.data);
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [viewType, selectedYear, selectedMonth]);

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
                <p className="text-slate-500">Welcome back, Admin. Here's what's happening today.</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <DashboardStats
                            title="Total Users"
                            value={stats.totalUsers}
                            change={`+${stats.newUsersLastMonth}`}
                            trend="up"
                            icon={Users}
                        />
                        <DashboardStats
                            title="Total Credits"
                            value={stats.totalCredits}
                            change="+12%" // Mock trend
                            trend="up"
                            icon={Coins}
                        />
                        <DashboardStats
                            title="Resumes Generated"
                            value={stats.totalResumes}
                            change="+5%"
                            trend="up"
                            icon={FileText}
                        />
                        <DashboardStats
                            title="Conversion Rate"
                            value="2.4%"
                            change="-1%"
                            trend="down"
                            icon={TrendingUp}
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:col-span-3 gap-8 mb-8">
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                                <h3 className="text-lg font-bold text-slate-900">
                                    Credits Overview ({viewType === 'monthly' ? selectedYear : `${months[selectedMonth - 1].label} ${selectedYear}`})
                                </h3>

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* View Type Toggle */}
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setViewType('monthly')}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewType === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            Yearly
                                        </button>
                                        <button
                                            onClick={() => setViewType('daily')}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewType === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            Monthly
                                        </button>
                                    </div>

                                    {/* Custom Year Selector */}
                                    <div className="w-24">
                                        <CustomSelect
                                            value={selectedYear}
                                            options={years}
                                            onChange={setSelectedYear}
                                        />
                                    </div>

                                    {/* Custom Month Selector */}
                                    {viewType === 'daily' && (
                                        <div className="w-24">
                                            <CustomSelect
                                                value={selectedMonth}
                                                options={months}
                                                onChange={setSelectedMonth}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 12 }}
                                            tickMargin={10}
                                            tickFormatter={(value) => {
                                                // Simple heuristic to detect date format and shorten it
                                                if (value.includes('-')) {
                                                    const parts = value.split('-');
                                                    if (parts.length === 3) {
                                                        // YYYY-MM-DD -> MM/DD (e.g., 2026-02-18 -> 02/18)
                                                        return `${parts[1]}/${parts[2]}`;
                                                    } else if (parts.length === 2) {
                                                        // YYYY-MM -> MMM (e.g., 2026-02 -> Feb)
                                                        const date = new Date(value + '-01'); // Append dummy day
                                                        return date.toLocaleString('default', { month: 'short' });
                                                    }
                                                }
                                                return value;
                                            }}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="credits" stroke="#4F46E5" fillOpacity={1} fill="url(#colorCredits)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Transactions</h3>
                            <div className="space-y-4">
                                {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                                    stats.recentTransactions.map((tx) => (
                                        <div key={tx._id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                    <Coins className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {tx.userId ? `${tx.userId.firstName} ${tx.userId.lastName}` : 'Unknown User'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4">No recent transactions</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
};

export default AdminDashboard;
