import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowRight, Sparkles } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { email, password, confirmPassword } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const res = await api.post('/auth/register', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data));
            navigate('/onboarding');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
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
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Your Account</h2>
                        <p className="text-slate-500">
                            Join thousands of professionals landing their dream jobs.
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
                                <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">Password</label>
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
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">Confirm Password</label>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="input-field w-full"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={onChange}
                                />
                            </div>
                        </div>

                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input id="terms" type="checkbox" required className="w-4 h-4 border border-slate-300 rounded bg-slate-50 focus:ring-3 focus:ring-primary/20 accent-primary" />
                            </div>
                            <label htmlFor="terms" className="ml-2 text-xs text-slate-500 leading-relaxed">
                                I agree to the <a href="#" className="font-medium text-primary hover:underline">Terms of Service</a> and <a href="#" className="font-medium text-primary hover:underline">Privacy Policy</a>.
                            </label>
                        </div>

                        <button type="submit" className="btn-primary w-full group">
                            Create Account
                            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-400">Already have an account?</span>
                            </div>
                        </div>

                        <Link to="/login" className="btn-secondary w-full">
                            Sign In to Existing Account
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

export default Register;
