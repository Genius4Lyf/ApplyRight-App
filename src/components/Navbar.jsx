import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, History, Zap } from 'lucide-react';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">ApplyRight</span>
                </div>

                <div className="flex items-center gap-8">
                    <nav className="flex items-center gap-6">
                        <Link
                            to="/dashboard"
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/dashboard') ? 'text-primary' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <Zap className="w-4 h-4" />
                            <span className="hidden sm:inline">Get Hired</span>
                        </Link>
                        <Link
                            to="/history"
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/history') ? 'text-primary' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <History className="w-4 h-4" />
                            <span className="hidden sm:inline">Job History</span>
                        </Link>
                    </nav>

                    <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</span>
                            <span className="text-sm font-medium text-slate-700">{user.firstName ? `${user.firstName} ${user.lastName}` : user.email?.split('@')[0]}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors group"
                        >
                            <LogOut className="w-4 h-4 mr-2 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
