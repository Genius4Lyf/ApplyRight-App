import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { ArrowRight, Sparkles, Phone, Lock, Hash } from 'lucide-react';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP + New Password
    const [formData, setFormData] = useState({
        phone: '',
        otp: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const { phone, otp, newPassword, confirmNewPassword } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onRequestOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.post('/auth/forgotpassword', { phone });
            setSuccess('WhatsApp OTP sent! Please check your phone.');
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. using simulated WhatsApp? Check console.');
        } finally {
            setIsLoading(false);
        }
    };

    const onResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.post('/auth/resetpassword', { phone, otp, password: newPassword });
            setSuccess('Password reset successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
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
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            {step === 1 ? 'Reset Password' : 'Verify & Reset'}
                        </h2>
                        <p className="text-slate-500">
                            {step === 1
                                ? 'Enter your phone number to receive a WhatsApp OTP.'
                                : 'Enter the code sent to your WhatsApp and your new password.'}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={step === 1 ? onRequestOTP : onResetPassword}>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm text-center">
                                {success}
                            </div>
                        )}

                        <div className="space-y-4">
                            {step === 1 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            name="phone"
                                            type="tel"
                                            required
                                            className="input-field w-full pl-10"
                                            placeholder="+1234567890"
                                            value={phone}
                                            onChange={onChange}
                                            disabled={isLoading}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">WhatsApp OTP Code</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Hash className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                name="otp"
                                                type="text"
                                                required
                                                className="input-field w-full pl-10"
                                                placeholder="123456"
                                                value={otp}
                                                onChange={onChange}
                                                disabled={isLoading}
                                                maxLength="6"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">New Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                name="newPassword"
                                                type="password"
                                                required
                                                className="input-field w-full pl-10"
                                                placeholder="••••••••"
                                                value={newPassword}
                                                onChange={onChange}
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">Confirm New Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                name="confirmNewPassword"
                                                type="password"
                                                required
                                                className="input-field w-full pl-10"
                                                placeholder="••••••••"
                                                value={confirmNewPassword}
                                                onChange={onChange}
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <button type="submit" disabled={isLoading} className="btn-primary w-full group flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    processing...
                                </>
                            ) : (
                                <>
                                    {step === 1 ? 'Send WhatsApp OTP' : 'Reset Password'}
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-400">Remembered your password?</span>
                            </div>
                        </div>

                        <Link to="/login" className="btn-secondary w-full">
                            Back to Sign In
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

export default ForgotPassword;
