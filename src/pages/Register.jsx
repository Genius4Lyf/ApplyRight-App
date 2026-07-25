import React, { useState } from 'react';
import AriaLoader from '../components/ui/AriaLoader';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Briefcase,
  Users,
  FileDown,
  ShieldCheck,
  User,
  HelpCircle,
} from 'lucide-react';
import Modal from '../components/Modal';
import AuthShell, { DEFAULT_VALUE_PROPS } from '../components/AuthShell';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getLang, syncLangFromUser } from '../lib/lang';

// Left-panel value props shown when signing up as a CV agent — reframes the
// product around client work instead of the job-seeker pitch.
const AGENT_VALUE_PROPS = [
  {
    icon: <Users className="w-4 h-4" />,
    titleKey: 'auth.shell.agentValueProps.organize.title',
    bodyKey: 'auth.shell.agentValueProps.organize.body',
  },
  {
    icon: <FileDown className="w-4 h-4" />,
    titleKey: 'auth.shell.agentValueProps.unlimited.title',
    bodyKey: 'auth.shell.agentValueProps.unlimited.body',
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    titleKey: 'auth.shell.agentValueProps.builtFor.title',
    bodyKey: 'auth.shell.agentValueProps.builtFor.body',
  },
];

// Static accent class sets so Tailwind keeps them at build time.
const CARD_ACCENTS = {
  ink: {
    on: 'border-slate-900 bg-slate-900',
    text: 'text-white',
    icon: 'bg-white/15 text-white',
    dot: 'border-white bg-white',
    dotInner: 'bg-slate-900',
  },
  indigo: {
    on: 'border-indigo-600 bg-indigo-600',
    text: 'text-white',
    icon: 'bg-white/15 text-white',
    dot: 'border-white bg-white',
    dotInner: 'bg-indigo-600',
  },
};

// One compact option in the "I'm signing up as" selector: small icon, a label,
// and a radio dot — a single short row. Selected = accent border, tint, filled
// dot. (What each type means lives behind the "?" next to the heading.)
const AccountTypeCard = ({ selected, accent, icon, title, onClick }) => {
  const a = CARD_ACCENTS[accent] || CARD_ACCENTS.ink;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 ${
        selected ? a.on : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
          selected ? a.icon : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </span>
      <span
        className={`flex-1 min-w-0 text-sm font-semibold truncate ${
          selected ? a.text || 'text-slate-800' : 'text-slate-800'
        }`}
      >
        {title}
      </span>
      <span
        className={`flex items-center justify-center w-4 h-4 rounded-full border-2 shrink-0 ${
          selected ? a.dot : 'border-slate-300'
        }`}
      >
        {selected && <span className={`w-1.5 h-1.5 rounded-full ${a.dotInner || 'bg-white'}`} />}
      </span>
    </button>
  );
};

const Register = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, labelKey: '', color: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Agent signup mode (/register?as=agent) — creates a CV-agent account that
  // lands on the CV-only workspace instead of the job-seeker dashboard.
  const [isAgent, setIsAgent] = useState(false);
  // "?" popover explaining the two account types.
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = React.useRef(null);
  const navigate = useNavigate();

  const { email, password, confirmPassword, referralCode } = formData;

  // Pick up referral code from URL ?ref=... and agent mode from ?as=agent
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setFormData((prev) => ({ ...prev, referralCode: refCode.toUpperCase() }));
    }
    setIsAgent(urlParams.get('as') === 'agent');
  }, []);

  // Close the "?" info popover on an outside click.
  React.useEffect(() => {
    if (!showInfo) return;
    const onDown = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) setShowInfo(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showInfo]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  // Account-type selector at the top of the form. Keeps the URL in sync so the
  // choice survives a refresh/share and the page's accent/copy follow it.
  const selectAudience = (agent) => {
    setIsAgent(agent);
    navigate(agent ? '/register?as=agent' : '/register', { replace: true });
  };

  const checkPasswordStrength = (password) => {
    let score = 0;
    if (!password) {
      setPasswordStrength({ score: 0, labelKey: '', color: '' });
      return;
    }
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
      setPasswordStrength({
        score,
        labelKey: 'auth.register.strengthWeak',
        color: 'text-red-600 bg-red-50 border-red-200',
      });
    } else if (score <= 4) {
      setPasswordStrength({
        score,
        labelKey: 'auth.register.strengthMedium',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      });
    } else {
      setPasswordStrength({
        score,
        labelKey: 'auth.register.strengthStrong',
        color: 'text-green-600 bg-green-50 border-green-200',
      });
    }
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return t('errors.passwordTooShort');
    }
    if (!/[a-z]/.test(password)) {
      return t('errors.passwordNeedsLowercase');
    }
    if (!/[A-Z]/.test(password)) {
      return t('errors.passwordNeedsUppercase');
    }
    if (!/[0-9]/.test(password)) {
      return t('errors.passwordNeedsNumber');
    }
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('errors.passwordsDoNotMatch'));
      return;
    }

    // HTML5 type="email" handles format validation. Replaced the old fragile
    // TLD-whitelist regex (missing valid TLDs, duplicate entries, no value
    // beyond what the browser provides). Server-side checks remain authoritative.

    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        referralCode,
        // The language the visitor signed up in, so the account is created in it.
        interfaceLang: getLang(),
        ...(isAgent ? { accountType: 'agent' } : {}),
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      // Server truth (it echoes interfaceLang back) becomes the local language.
      syncLangFromUser(res.data);
      // Agents skip the job-seeker onboarding and go straight to their workspace.
      navigate(res.data.role === 'agent' ? '/agent' : '/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || t('errors.registrationFailed'));
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthShell
        formTitle={t(isAgent ? 'auth.register.titleAgent' : 'auth.register.title')}
        formSubtitle={t(isAgent ? 'auth.register.subtitleAgent' : 'auth.register.subtitle')}
        leftHeading={t(isAgent ? 'auth.register.leftHeadingAgent' : 'auth.register.leftHeading')}
        leftSubcopy={t(isAgent ? 'auth.register.leftSubcopyAgent' : 'auth.register.leftSubcopy')}
        valueProps={isAgent ? AGENT_VALUE_PROPS : DEFAULT_VALUE_PROPS}
        accent={isAgent ? 'indigo' : 'ink'}
        badge={
          isAgent
            ? { icon: <Briefcase className="w-3.5 h-3.5" />, label: t('auth.register.badgeAgent') }
            : { icon: <User className="w-3.5 h-3.5" />, label: t('auth.register.badgeJobSeeker') }
        }
        trustSignals={
          isAgent
            ? [
                'auth.register.trustUnlimitedCvs',
                'auth.register.trustBuiltForClients',
                'common.trust.encrypted',
              ]
            : [
                'auth.register.trustFreeCredits',
                'common.trust.noCardNeeded',
                'common.trust.encrypted',
              ]
        }
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          {/* Account-type selector — the first decision on the page so users
              know whether they're signing up to job-hunt or to build CVs for
              clients. Selected card uses that audience's accent (ink vs indigo). */}
          <div role="radiogroup" aria-label={t('auth.register.accountTypeAria')}>
            <div ref={infoRef} className="relative flex items-center gap-1.5 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('auth.register.accountTypeLegend')}
              </span>
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                aria-label={t('auth.register.accountTypeHelpAria')}
                aria-expanded={showInfo}
                className="text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-slate-600"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              {showInfo && (
                <div className="absolute left-0 top-6 z-20 w-72 p-3 rounded-lg border border-slate-200 bg-white shadow-lg text-xs leading-relaxed text-slate-600 space-y-2">
                  <p>
                    <span className="font-semibold text-slate-900">
                      {t('auth.register.jobSeeker')}
                    </span>{' '}
                    — {t('auth.register.jobSeekerExplainer')}
                  </p>
                  <p>
                    <span className="font-semibold text-indigo-700">
                      {t('auth.register.cvAgent')}
                    </span>{' '}
                    — {t('auth.register.cvAgentExplainer')}
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AccountTypeCard
                selected={!isAgent}
                accent="ink"
                icon={<User className="w-4 h-4" />}
                title={t('auth.register.jobSeeker')}
                onClick={() => selectAudience(false)}
              />
              <AccountTypeCard
                selected={isAgent}
                accent="indigo"
                icon={<Briefcase className="w-4 h-4" />}
                title={t('auth.register.cvAgent')}
                onClick={() => selectAudience(true)}
              />
            </div>
          </div>

          {/* Language — defaults to the DETECTED language (browser locale, or an
              earlier explicit choice). Changing it switches the page immediately AND
              is sent as interfaceLang so the account is created in that language. */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('common.language.label')}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                {t('auth.register.languageHint')}
              </p>
            </div>
            <LanguageSwitcher className="shrink-0" />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('common.emailLabel')}
            </label>
            <input
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('common.passwordLabel')}
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
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
            {password && passwordStrength.labelKey && (
              <div
                className={`mt-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${passwordStrength.color}`}
              >
                {t('auth.register.passwordStrength', { label: t(passwordStrength.labelKey) })}
              </div>
            )}
            <p className="mt-1.5 text-xs text-slate-500">{t('auth.register.passwordHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('auth.register.confirmPasswordLabel')}
            </label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                className="input-field w-full pr-10"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={onChange}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={
                  showConfirmPassword ? t('common.hidePassword') : t('common.showPassword')
                }
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('auth.register.referralLabel')}{' '}
              <span className="text-slate-400 font-normal">{t('common.optional')}</span>
            </label>
            <input
              name="referralCode"
              type="text"
              className="input-field w-full uppercase"
              placeholder={t('auth.register.referralPlaceholder')}
              value={referralCode}
              onChange={onChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                required
                disabled={isLoading}
                className="w-4 h-4 border border-slate-300 rounded bg-slate-50 focus:ring-3 focus:ring-indigo-500/20 accent-indigo-600 disabled:opacity-50"
              />
            </div>
            <label htmlFor="terms" className="ml-2 text-xs text-slate-600 leading-relaxed">
              {t('auth.register.termsAgree')}{' '}
              <button
                type="button"
                onClick={() => setActiveModal('terms')}
                className="font-medium text-indigo-600 hover:underline"
              >
                {t('common.legal.termsOfService')}
              </button>{' '}
              {t('auth.register.termsAnd')}{' '}
              <button
                type="button"
                onClick={() => setActiveModal('privacy')}
                className="font-medium text-indigo-600 hover:underline"
              >
                {t('common.legal.privacyPolicy')}
              </button>
              .
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full group flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed ${
              isAgent
                ? 'py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors'
                : 'btn-primary'
            }`}
          >
            {isLoading ? (
              <>
                <AriaLoader inline tone="mono" size={16} label="" className="-ml-1 mr-3" />
                {t('auth.register.submitting')}
              </>
            ) : (
              <>
                {t(isAgent ? 'auth.register.submitAgent' : 'auth.register.submit')}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <p className="text-center text-sm text-slate-500">
            {t('auth.register.haveAccount')}{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {t('common.signIn')}
            </Link>
          </p>
        </form>
      </AuthShell>

      {/* Legal Modals.
          DELIBERATELY NOT TRANSLATED (P2). The modal TITLES are localized, but these
          bodies are the Terms of Service and Privacy Policy — binding legal wording
          whose meaning must not shift. Translating them is a job for a qualified
          reviewer, not a best guess, so a French user reads them in English until
          that review happens. Do not machine-translate this block. */}
      <Modal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={
          activeModal === 'terms'
            ? t('common.legal.termsOfService')
            : t('common.legal.privacyPolicy')
        }
      >
        {activeModal === 'terms' ? (
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
            </p>
            <p>
              Welcome to ApplyRight. By accessing or using our website, you agree to be bound by
              these Terms of Service.
            </p>

            <h4 className="font-bold text-slate-900 mt-4">1. Acceptance of Terms</h4>
            <p>
              By creating an account, you agree to comply with all applicable laws and regulations.
              If you do not agree with any of these terms, you are prohibited from using this
              service.
            </p>

            <h4 className="font-bold text-slate-900 mt-4">2. Use License</h4>
            <p>
              Permission is granted to temporarily download one copy of the materials (information
              or software) on ApplyRight's website for personal, non-commercial transitory viewing
              only.
            </p>

            <h4 className="font-bold text-slate-900 mt-4">3. Resume Generation</h4>
            <p>
              Our service uses AI to optimize resumes. While we strive for accuracy, we do not
              guarantee employment or specific interview results. The generated content is a
              suggestion and should be reviewed by the user.
            </p>

            <h4 className="font-bold text-slate-900 mt-4">4. Prohibited Acts</h4>
            <p>
              You may not verify false information, attempt to reverse engineer our AI, or use the
              service for any illegal purpose.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
            </p>
            <p>
              Your privacy is important to us. It is ApplyRight's policy to respect your privacy
              regarding any information we may collect from you across our website.
            </p>

            <h4 className="font-bold text-slate-900 mt-4">1. Information We Collect</h4>
            <p>
              We collect personal information that you voluntarily provide to us when registering
              for the Services, such as your email address, resume data, and job history.
            </p>

            <h4 className="font-bold text-slate-900 mt-4">2. How We Use Your Data</h4>
            <p>
              We use your data solely to provide and improve our resume optimization services.{' '}
              <strong>We do not sell your personal data to third parties.</strong>
            </p>

            <h4 className="font-bold text-slate-900 mt-4">3. Data Security</h4>
            <p>
              We implement appropriate technical and organizational security measures designed to
              protect the security of any personal information we process.
            </p>

            <h4 className="font-bold text-slate-900 mt-4">4. Third-Party Services</h4>
            <p>
              We may share data with trusted third-party service providers (like payment processors
              or cloud hosting) strictly for operational purposes.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
};

export default Register;
