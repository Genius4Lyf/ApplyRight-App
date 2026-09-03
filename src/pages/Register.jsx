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
  Check,
} from 'lucide-react';
// The config has no react plugin, so jsx-uses-vars never runs and `motion` reads as
// unused — the same suppression every other motion file in this codebase carries.
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from 'framer-motion';
import Modal from '../components/Modal';
import AuthShell, { DEFAULT_VALUE_PROPS } from '../components/AuthShell';
import { SIGNUP_CREDITS } from '../lib/credits';
import { LAUNCH } from '../lib/launch';
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

// One compact option in the "I'm signing up as" selector: small icon, a label,
// and a radio dot — a single short row. Selected = accent border, tint, filled
// dot. (What each type means lives behind the "?" next to the heading.)
const AccountTypeCard = ({ selected, icon, title, onClick }) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 ${
        selected ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
          selected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </span>
      <span
        className={`flex-1 min-w-0 text-sm font-semibold truncate ${
          selected ? 'text-white' : 'text-slate-800'
        }`}
      >
        {title}
      </span>
      <span
        className={`flex items-center justify-center w-4 h-4 rounded-full border-2 shrink-0 ${
          selected ? 'border-white bg-white' : 'border-slate-300'
        }`}
      >
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
      </span>
    </button>
  );
};

// The rest of the form arrives as ONE unit once the mailbox is proved. Same spring
// as the app's motion language (lib/ariaMotion.js): the fields rise into place
// instead of blinking on, so the reveal reads as an answer to what the user just
// did rather than the page repainting under them.
const REVEAL_GROUP = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const REVEAL_ITEM = {
  hidden: { opacity: 0, y: 12 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 460, damping: 32, mass: 1 },
  },
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
  // Email verification. The account cannot be created until a code sent to this
  // address has been entered back, so the rest of the form stays locked until then —
  // progressive disclosure rather than a multi-page wizard, so nobody loses their
  // place. Steps: idle -> sent -> verified.
  const [verifyStep, setVerifyStep] = useState('idle');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyNote, setVerifyNote] = useState('');
  // Agent signup mode (/register?as=agent) — creates a CV-agent account that
  // lands on the CV-only workspace instead of the job-seeker dashboard.
  const [isAgent, setIsAgent] = useState(false);
  // "?" popover explaining the two account types.
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = React.useRef(null);
  // Focus target for the reveal — the first field of the half that was hidden.
  const passwordRef = React.useRef(null);
  const reduceMotion = useReducedMotion();
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

  // Land the user on the newly revealed fields. Without this the reveal happens
  // BELOW THE FOLD on a phone: the code box disappears, nothing visibly changes,
  // and the next thing to do is off screen — exactly the "where did it go?" moment
  // the progressive disclosure is meant to avoid.
  React.useEffect(() => {
    if (verifyStep !== 'verified') return;
    const el = passwordRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  }, [verifyStep, reduceMotion]);

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

  // Changing the email after verifying has to invalidate it — otherwise someone could
  // verify one address and register a different one.
  const onEmailChange = (e) => {
    onChange(e);
    if (verifyStep !== 'idle') {
      setVerifyStep('idle');
      setCode('');
      setVerifyNote('');
    }
  };

  const sendCode = async () => {
    setError('');
    setVerifyNote('');
    setSendingCode(true);
    try {
      await api.post('/auth/request-verification', { email });
      setVerifyStep('sent');
      setVerifyNote(t('auth.verify.sent', { email }));
    } catch (err) {
      setError(err.response?.data?.message || t('auth.verify.sendFailed'));
    } finally {
      setSendingCode(false);
    }
  };

  const submitCode = async () => {
    setError('');
    setVerifying(true);
    try {
      await api.post('/auth/verify-code', { email, code });
      setVerifyStep('verified');
      setVerifyNote('');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.verify.codeFailed'));
    } finally {
      setVerifying(false);
    }
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
      // During the campaign the countdown is the destination, and it gets its own URL
      // rather than being swapped in under /onboarding — that URL would lie about what
      // is on screen, and the onboarding form would silently never be collected.
      // MaintenanceGuard remains the catch-all, so a stale singleton costs a redirect
      // at worst, never access.
      navigate(
        res.data.role === 'agent' ? '/agent' : LAUNCH.enabled ? '/pre-launch' : '/onboarding'
      );
    } catch (err) {
      setError(err.response?.data?.message || t('errors.registrationFailed'));
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthShell
        formTitle={t(isAgent ? 'auth.register.titleAgent' : 'auth.register.title')}
        formSubtitle={t(isAgent ? 'auth.register.subtitleAgent' : 'auth.register.subtitle', {
          credits: SIGNUP_CREDITS.value,
        })}
        leftHeading={t(isAgent ? 'auth.register.leftHeadingAgent' : 'auth.register.leftHeading')}
        leftSubcopy={t(isAgent ? 'auth.register.leftSubcopyAgent' : 'auth.register.leftSubcopy')}
        valueProps={isAgent ? AGENT_VALUE_PROPS : DEFAULT_VALUE_PROPS}
        accent={isAgent ? 'agent' : 'ink'}
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
                // Resolved here rather than passed as a bare key: the count is a
                // LIVE value (lib/credits.js, hydrated from GET /auth/config), not
                // part of the translation itself. AuthShell renders an already-
                // resolved literal unchanged — see its trustSignals comment.
                t('auth.register.trustFreeCredits', { credits: SIGNUP_CREDITS.value }),
                'common.trust.noCardNeeded',
                'common.trust.encrypted',
              ]
        }
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          {/* Account-type selector — the first decision on the page so users
              know whether they're signing up to job-hunt or to build CVs for
              clients. Selected card uses the one selected style. */}
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
                    <span className="font-semibold text-slate-800">
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
                icon={<User className="w-4 h-4" />}
                title={t('auth.register.jobSeeker')}
                onClick={() => selectAudience(false)}
              />
              <AccountTypeCard
                selected={isAgent}
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
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('common.emailLabel')}
            </label>
            <div className="flex gap-2">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input-field w-full"
                placeholder={t('common.emailPlaceholder')}
                value={email}
                onChange={onEmailChange}
                // Deliberately NOT locked after verifying: a typo'd address would
                // otherwise strand you with no way back but a page reload. Editing it
                // resets the step (onEmailChange), and the server re-checks the record
                // against whatever address is actually submitted.
                disabled={isLoading}
              />
              {verifyStep !== 'verified' && (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={!email || sendingCode || isLoading}
                  className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  {sendingCode
                    ? t('auth.verify.sending')
                    : verifyStep === 'sent'
                      ? t('auth.verify.resend')
                      : t('auth.verify.send')}
                </button>
              )}
            </div>

            {verifyStep === 'idle' && (
              <p className="mt-1.5 text-xs text-slate-500">{t('auth.verify.gateHint')}</p>
            )}

            {verifyStep === 'verified' && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                {t('auth.verify.verified')}
              </p>
            )}

            {verifyStep === 'sent' && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label
                  htmlFor="verification-code"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  {t('auth.verify.codeLabel')}
                </label>
                <div className="flex gap-2">
                  <input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="input-field w-full font-mono tracking-[0.3em]"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    disabled={verifying}
                  />
                  <button
                    type="button"
                    onClick={submitCode}
                    disabled={code.length !== 6 || verifying}
                    className="shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    {verifying ? t('auth.verify.checking') : t('auth.verify.confirm')}
                  </button>
                </div>
                {verifyNote && <p className="mt-2 text-xs text-slate-500">{verifyNote}</p>}
              </div>
            )}
          </div>

          {/* Everything past the mailbox proof. Held back until the code is confirmed so
              the page asks ONE thing at a time — a stranger meets an email field and a
              button, not a wall of inputs that cannot be submitted yet. Editing the email
              puts it all away again (onEmailChange), because the proof no longer applies. */}
          {verifyStep === 'verified' && (
            <motion.div
              className="space-y-5"
              variants={REVEAL_GROUP}
              initial={reduceMotion ? false : 'hidden'}
              animate="shown"
            >
              <motion.div variants={REVEAL_ITEM}>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  {t('common.passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    ref={passwordRef}
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
              </motion.div>

              <motion.div variants={REVEAL_ITEM}>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  {t('auth.register.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
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
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={REVEAL_ITEM}>
                <label
                  htmlFor="referralCode"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  {t('auth.register.referralLabel')}{' '}
                  <span className="text-slate-400 font-normal">{t('common.optional')}</span>
                </label>
                <input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  className="input-field w-full uppercase"
                  placeholder={t('auth.register.referralPlaceholder')}
                  value={referralCode}
                  onChange={onChange}
                  disabled={isLoading}
                />
              </motion.div>

              <motion.div variants={REVEAL_ITEM} className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    required
                    disabled={isLoading}
                    className="w-4 h-4 border border-slate-300 rounded bg-slate-50 focus:ring-3 focus:ring-slate-900/20 accent-slate-900 disabled:opacity-50"
                  />
                </div>
                <label htmlFor="terms" className="ml-2 text-xs text-slate-600 leading-relaxed">
                  {t('auth.register.termsAgree')}{' '}
                  <button
                    type="button"
                    onClick={() => setActiveModal('terms')}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {t('common.legal.termsOfService')}
                  </button>{' '}
                  {t('auth.register.termsAnd')}{' '}
                  <button
                    type="button"
                    onClick={() => setActiveModal('privacy')}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {t('common.legal.privacyPolicy')}
                  </button>
                  .
                </label>
              </motion.div>

              <motion.button
                variants={REVEAL_ITEM}
                type="submit"
                disabled={isLoading}
                className={`w-full group flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed ${
                  isAgent
                    ? 'py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors'
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
              </motion.button>
            </motion.div>
          )}

          <p className="text-center text-sm text-slate-500">
            {t('auth.register.haveAccount')}{' '}
            <Link
              to="/login"
              className="font-semibold text-slate-900 hover:text-slate-900 hover:underline"
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
