import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowRight, Sparkles } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { email, password } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/login', formData);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
            {/* Subtle Geometric Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4F46E5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            <div className="relative z-10 w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">ApplyRight</span>
                    </div>
                </div>

                <div className="clean-card w-full p-8 space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-500">
                            Sign in to continue to your professional workspace
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={onSubmit}>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">Email Address</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="input-field w-full"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={onChange}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1.5 ml-0.5">
                                    <label className="block text-sm font-medium text-slate-700">Password</label>
                                    <a href="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</a>
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="input-field w-full"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={onChange}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full group">
                            Sign In
                            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-400">New to ApplyRight?</span>
                            </div>
                        </div>

                        <Link to="/register" className="btn-secondary w-full">
                            Create Professional Account
                        </Link>
                    </form>
                </div>

                <p className="text-center mt-8 text-sm text-slate-400">
                    &copy; {new Date().getFullYear()} ApplyRight. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Login;
