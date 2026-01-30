import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, History, Zap, User, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { billingService } from '../services';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    let user = {};
    try {
        user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
        console.error("Failed to parse user from local storage", e);
    }

    const [credits, setCredits] = useState(null);

    React.useEffect(() => {
        const fetchCredits = async () => {
            try {
                const data = await billingService.getBalance();
                setCredits(data.credits);
            } catch (error) {
                console.error("Failed to fetch credits", error);
            }
        };
        fetchCredits();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2 z-50">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">ApplyRight</span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
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
                        <Link to="/credits" className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors">
                            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-bold text-amber-700">{credits !== null ? credits : '...'}</span>
                        </Link>

                        <div className="hidden md:flex flex-col items-end cursor-pointer" onClick={() => navigate('/profile')}>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</span>
                            <span className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
                                {user && user.firstName ? `${user.firstName} ${user.lastName}` : (user?.email?.split('@')[0] || 'User')}
                            </span>
                        </div>

                        <div
                            onClick={() => navigate('/profile')}
                            className="h-10 w-10 rounded-full bg-indigo-100 border-2 border-indigo-50 flex items-center justify-center text-indigo-700 font-bold cursor-pointer hover:border-indigo-200 transition-colors"
                        >
                            {user && user.firstName && user.firstName.length > 0 ? user.firstName[0].toUpperCase() : <User className="w-5 h-5" />}
                        </div>

                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden z-50 p-2 text-slate-600"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
                    >
                        <div className="px-4 py-6 space-y-4">
                            <Link
                                to="/dashboard"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 p-3 rounded-lg ${isActive('/dashboard') ? 'bg-indigo-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Zap className="w-5 h-5" />
                                <span className="font-medium">Get Hired</span>
                            </Link>
                            <Link
                                to="/history"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 p-3 rounded-lg ${isActive('/history') ? 'bg-indigo-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <History className="w-5 h-5" />
                                <span className="font-medium">Job History</span>
                            </Link>

                            <div className="h-px bg-slate-100 my-2"></div>

                            <Link
                                to="/credits"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 p-3 rounded-lg ${isActive('/credits') ? 'bg-indigo-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
                                <span className="font-medium">Credits: {credits !== null ? credits : '...'}</span>
                            </Link>

                            <div className="h-px bg-slate-100 my-2"></div>

                            <Link
                                to="/profile"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 p-3 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                    {user && user.firstName ? user.firstName[0].toUpperCase() : <User className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{user?.firstName || 'User'}</p>
                                    <p className="text-xs text-slate-500">View Profile</p>
                                </div>
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="font-medium">Sign Out</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Navbar;
