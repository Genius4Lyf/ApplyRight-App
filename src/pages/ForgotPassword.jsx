import React, { useState } from 'react';
import AriaLoader from '../components/ui/AriaLoader';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { ArrowRight, Mail, Lock, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logoBlack from '../assets/logo/applyright-icon-black.png';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { email, otp, newPassword, confirmNewPassword } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onRequestOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/forgotpassword', { email });
      setSuccess(t('auth.forgot.codeSent'));
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || t('errors.sendCodeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError(t('errors.passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/resetpassword', { email, otp, password: newPassword });
      setSuccess(t('auth.forgot.resetSuccess'));
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || t('errors.resetPasswordFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden"
    >
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logoBlack} alt="ApplyRight" className="h-8 w-auto" />
            <span className="font-brand text-2xl font-bold text-slate-900 tracking-tight">
              ApplyRight
            </span>
          </Link>
        </div>

        <div className="clean-card w-full p-6 sm:p-8 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {step === 1 ? t('auth.forgot.titleStep1') : t('auth.forgot.titleStep2')}
            </h2>
            <p className="text-slate-500">
              {step === 1 ? t('auth.forgot.subtitleStep1') : t('auth.forgot.subtitleStep2')}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">
                    {t('common.emailLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      required
                      className="input-field w-full pl-10"
                      placeholder={t('auth.forgot.emailPlaceholder')}
                      value={email}
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">
                      {t('auth.forgot.otpLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Hash className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        name="otp"
                        type="text"
                        required
                        className="input-field w-full pl-10"
                        placeholder={t('auth.forgot.otpPlaceholder')}
                        value={otp}
                        onChange={onChange}
                        disabled={isLoading}
                        maxLength="6"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">
                      {t('auth.forgot.newPasswordLabel')}
                    </label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-0.5">
                      {t('auth.forgot.confirmNewPasswordLabel')}
                    </label>
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

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full group flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <AriaLoader inline tone="mono" size={16} label="" className="-ml-1 mr-3" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  {step === 1 ? t('auth.forgot.sendCode') : t('auth.forgot.resetPassword')}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">
                  {t('auth.forgot.rememberedPassword')}
                </span>
              </div>
            </div>

            <Link to="/login" className="btn-secondary w-full">
              {t('auth.forgot.backToSignIn')}
            </Link>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-slate-400">
          {t('common.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </motion.div>
  );
};

export default ForgotPassword;
