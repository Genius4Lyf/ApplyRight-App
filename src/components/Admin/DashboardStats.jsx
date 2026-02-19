import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const DashboardStats = ({ title, value, change, icon: Icon, trend }) => {
    const isPositive = trend === 'up';

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
            <div>
                <div className="flex items-start justify-between mb-4">
                    <p className="text-sm font-medium text-slate-500 mr-2 min-h-[40px] flex items-center">{title}</p>
                    <div className={`p-3 rounded-lg shrink-0 ${isPositive ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                        <Icon className={`w-6 h-6 ${isPositive ? 'text-indigo-600' : 'text-slate-600'}`} />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
            </div>

            {change && (
                <div className="flex items-center text-sm mt-4">
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
