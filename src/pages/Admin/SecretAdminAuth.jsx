import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ShieldCheck, Lock, Mail, Phone, User, Key, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const SecretAdminAuth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        phone: '',
        adminSecret: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const calculateStrength = (password) => {
        let strength = 0;
        if (password.length > 7) strength += 1;
        if (password.length >= 12) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
        return (strength / 6) * 100;
    };

    const getStrengthColor = (percentage) => {
        if (percentage < 33) return 'bg-red-500';
        if (percentage < 66) return 'bg-yellow-500';
        if (percentage < 100) return 'bg-blue-500';
        return 'bg-green-500';
    };

    const getStrengthText = (percentage) => {
        if (percentage === 0) return '';
        if (percentage < 33) return 'Weak';
        if (percentage < 66) return 'Fair';
        if (percentage < 100) return 'Good';
        return 'Strong';
    };

    const passwordStrength = calculateStrength(formData.password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                // Login Flow
                const { data } = await axios.post('http://localhost:5000/api/auth/login', {
                    email: formData.email,
                    password: formData.password
                });

                localStorage.setItem('user', JSON.stringify(data));
                localStorage.setItem('token', data.token);

                // Check role
                // We need to fetch the profile to be sure of the role if it's not in the login response 
                // But typically we should include it. The login controller in backend sends:
                // _id, email, phone, firstName, lastName, credits... and token.
                // It does NOT send 'role' in the login response in existing controller modification?
                // Wait, I didn't modify loginUser in auth.controller.js to return role.
                // I should probably check that or just update profile.

                // Let's quickly fetch profile to check role
                const config = {
                    headers: { Authorization: `Bearer ${data.token}` }
                };
                const meRes = await axios.get('http://localhost:5000/api/auth/me', config);

                if (meRes.data.role !== 'admin') {
                    toast.error('Access Denied. You are not an admin.');
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                } else {
                    toast.success('Welcome back, Admin');
                    // Update local user with role
                    const userWithRole = { ...data, role: 'admin' };
                    localStorage.setItem('user', JSON.stringify(userWithRole));
                    navigate('/admin');
                }

            } else {
                // Register Flow

                // Client-side validation for admin password
                const pass = formData.password;
                if (pass.length < 12 || !/[a-z]/.test(pass) || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) {
                    toast.error('Password must be at least 12 characters long, include uppercase & lowercase letters, a number, and a special character.');
                    return;
                }

                const { data } = await axios.post('http://localhost:5000/api/auth/register-secret-admin', {
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    adminSecret: formData.adminSecret
                });

                localStorage.setItem('user', JSON.stringify(data));
                localStorage.setItem('token', data.token);
                toast.success('Admin Account Created');
                navigate('/admin');
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Authentication Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center flex-col items-center">
                    <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                        <Lock className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                        {isLogin ? 'Admin Access' : 'Create Admin'}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-500">
                        {isLogin ? 'Enter your credentials to manage the platform.' : 'Register a new administrative account.'}
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="admin@applyright.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="phone"
                                        placeholder="+1 (555) 000-0000"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {!isLogin && (
                                <div className="mt-2 text-xs">
                                    {formData.password && (
                                        <div className="mb-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-600 font-medium">Password strength:</span>
                                                <span className={`font-semibold ${passwordStrength < 33 ? 'text-red-500' :
                                                        passwordStrength < 66 ? 'text-yellow-500' :
                                                            passwordStrength < 100 ? 'text-blue-500' : 'text-green-500'
                                                    }`}>
                                                    {getStrengthText(passwordStrength)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 transition-all">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                                                    style={{ width: `${passwordStrength}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-gray-500">
                                        Must be at least 12 characters long, include uppercase & lowercase letters, a number, and a special character.
                                    </p>
                                </div>
                            )}
                        </div>

                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Secret Key</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        name="adminSecret"
                                        placeholder="Organization Secret"
                                        value={formData.adminSecret}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                                {!loading && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 border-t border-gray-100 pt-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-sm text-primary hover:text-primary/95 transition-colors font-medium"
                            >
                                {isLogin ? "Need a new admin account?" : "Back to Sign In"}
                            </button>
                            <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
                                <ArrowRight className="w-4 h-4 rotate-180" />
                                Return to public site
                            </a>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Minimalist Footer */}
            <div className="absolute w-full bottom-8">
                <p className="text-center text-xs text-gray-400 font-medium">
                    ApplyRight Secure Portal &copy; {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
};

export default SecretAdminAuth;
