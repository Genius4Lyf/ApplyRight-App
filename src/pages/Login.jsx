import React, { useState, useEffect } from 'react';
import AriaLoader from '../components/ui/AriaLoader';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LAUNCH } from '../lib/launch';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import AuthShell, { DEFAULT_VALUE_PROPS } from '../components/AuthShell';
import { signalReady } from '../utils/splash';
import { syncLangFromUser } from '../lib/lang';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { t } = useTranslation();
  // Logged-out cold start lands here; let the Capacitor splash drop as soon
  // as the form is on screen (no remote data to wait on).
  useEffect(() => {
    signalReady();
  }, []);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // HTML5 type="email" handles format validation. The previous TLD whitelist
    // regex was fragile (missing TLDs, duplicate entries) and added no value
    // beyond what the browser already gives us. Server-side checks remain.
    try {
      const res = await api.post('/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      // Their saved app language wins over whatever this device had.
      syncLangFromUser(res.data);
      // CV agents have their own CV-only workspace.
      if (res.data.role === 'agent') {
        navigate('/agent');
      } else if (res.data.onboardingCompleted !== true) {
        // Signed up but never finished the form — including anyone who closed the tab
        // partway through the campaign. Finish that before anything else.
        navigate('/onboarding');
      } else {
        // During the campaign there is nothing to sign in TO yet, so the countdown is
        // the destination and gets its own URL. MaintenanceGuard is still the actual
        // gate, so a singleton that has not hydrated yet costs one redirect, no more.
        navigate(LAUNCH.enabled ? '/pre-launch' : '/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || t('errors.loginFailed'));
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      formTitle={t('auth.login.title')}
      formSubtitle={t('auth.login.subtitle')}
      leftHeading={t('auth.login.leftHeading')}
      leftSubcopy={t('auth.login.leftSubcopy')}
      valueProps={DEFAULT_VALUE_PROPS}
      trustSignals={[
        'common.trust.freeToStart',
        'common.trust.noCardNeeded',
        'common.trust.encrypted',
      ]}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            {t('common.emailLabel')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input-field w-full"
            placeholder={t('common.emailPlaceholder')}
            value={email}
            onChange={onChange}
            disabled={isLoading}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              {t('common.passwordLabel')}
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-slate-900 hover:text-slate-900 hover:underline font-medium"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className="input-field w-full pr-10"
              placeholder="••••••••"
              value={password}
              onChange={onChange}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full group flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <AriaLoader inline tone="mono" size={16} label="" className="-ml-1 mr-3" />
              {t('auth.login.submitting')}
            </>
          ) : (
            <>
              {t('common.signIn')}
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        <p className="text-center text-sm text-slate-500">
          {t('auth.login.noAccount')}{' '}
          <Link
            to="/register"
            className="font-semibold text-slate-900 hover:text-slate-900 hover:underline"
          >
            {t('auth.login.createAccount')}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default Login;
