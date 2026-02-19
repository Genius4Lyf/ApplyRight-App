import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const DashboardStats = ({ title, value, change, icon: Icon, trend }) => {
    const isPositive = trend === 'up';

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${isPositive ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                    <Icon className={`w-6 h-6 ${isPositive ? 'text-indigo-600' : 'text-slate-600'}`} />
                </div>
            </div>

            {change && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={`flex items-center font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                        {change}
                    </span>
                    <span className="text-slate-400 ml-2">from last month</span>
                </div>
            )}
        </div>
    );
};

export default DashboardStats;
