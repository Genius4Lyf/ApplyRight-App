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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl w-full max-w-md relative z-10 shadow-2xl"
            >
                <div className="flex justify-center mb-8">
                    <div className="h-16 w-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
                        <ShieldCheck className="w-8 h-8 text-indigo-400" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white text-center mb-2">
                    {isLogin ? 'Admin Portal Access' : 'Initialize Admin Protocol'}
                </h2>
                <p className="text-slate-400 text-center mb-8 text-sm">
                    Restricted Area. Authorized Personnel Only.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="email"
                                name="email"
                                placeholder="Admin Email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <div>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="Secure Phone Line"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pl-10 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {!isLogin && (
                        <div>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                <input
                                    type="password"
                                    name="adminSecret"
                                    placeholder="Master Secret Key"
                                    value={formData.adminSecret}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Authenticating...' : (isLogin ? 'Grant Access' : 'Initialize Protocol')}
                        {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        {isLogin ? "Need to initialize a new admin?" : "Already have credentials?"}
                    </button>
                    <div className="mt-4">
                        <a href="/" className="text-xs text-slate-500 hover:text-slate-400">Abort & Return Home</a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SecretAdminAuth;
