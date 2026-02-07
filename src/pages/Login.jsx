import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { ArrowRight, Sparkles } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const { email, password } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate email format and domain
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|mil|co|io|ai|tech|dev|app|uk|ca|au|de|fr|jp|cn|in|br|mx|es|it|nl|se|no|dk|fi|ch|at|be|ie|nz|sg|hk|my|ph|th|vn|id|kr|tw|za|ae|sa|eg|ng|ke|gh|tz|ug|zm|zw|bw|mw|na|sz|ls|gm|sl|lr|sn|ml|bf|ne|td|cf|cm|ga|cg|cd|ao|mz|mg|sc|mu|re|yt|km|dj|so|et|er|sd|ss|ly|tn|dz|ma|eh|mr|cv|st|gq|gw|bi|rw|vu|fj|pg|sb|nc|pf|ws|to|tv|ki|nr|fm|mh|pw|mp|gu|as|vi|pr|do|jm|tt|bb|gd|lc|vc|ag|kn|dm|bs|ky|bm|tc|vg|ai|ms|gl|fo|is|li|mc|sm|va|ad|mt|cy|tr|gr|bg|ro|hu|cz|sk|pl|ua|by|ru|lt|lv|ee|md|ge|am|az|kz|uz|tm|kg|tj|mn|kp|mm|la|kh|bn|mv|bt|np|lk|bd|pk|af|ir|iq|sy|lb|jo|il|ps|ye|om|kw|bh|qa|info|biz|name|pro|coop|aero|museum|travel|jobs|mobi|tel|xxx|asia|cat|post|xxx)$/i;

        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address with a recognized domain');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        try {
            const res = await api.post('/auth/login', formData);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data));
            navigate('/dashboard', { state: { showProfilePrompt: true } });
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden"
        >
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

                    <form className="space-y-6" onSubmit={handleSubmit}>
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
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1.5 ml-0.5">
                                    <label className="block text-sm font-medium text-slate-700">Password</label>
                                    <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">Forgot password?</Link>
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="input-field w-full"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={onChange}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="btn-primary w-full group flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
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
        </motion.div>
    );
};

export default Login;
