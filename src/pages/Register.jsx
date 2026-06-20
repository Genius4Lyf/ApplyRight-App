import React, { useState } from 'react';
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
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import AuthShell, { DEFAULT_VALUE_PROPS } from '../components/AuthShell';

// Left-panel value props shown when signing up as a CV agent — reframes the
// product around client work instead of the job-seeker pitch.
const AGENT_VALUE_PROPS = [
  {
    icon: <Users className="w-4 h-4" />,
    title: 'Organize CVs by client',
    body: 'Keep every client’s CVs in their own folder, ready to revisit.',
  },
  {
    icon: <FileDown className="w-4 h-4" />,
    title: 'Unlimited CVs & downloads',
    body: 'Tailor and export as many polished CVs as your clients need.',
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    title: 'Built for CV businesses',
    body: 'A focused workspace — no interview tools, just CV output.',
  },
];

// Static accent class sets so Tailwind keeps them at build time.
const CARD_ACCENTS = {
  indigo: { on: 'border-indigo-500 bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', dot: 'border-indigo-500 bg-indigo-500' },
  amber: { on: 'border-amber-500 bg-amber-50', icon: 'bg-amber-100 text-amber-600', dot: 'border-amber-500 bg-amber-500' },
};

// One compact option in the "I'm signing up as" selector: small icon, a label,
// and a radio dot — a single short row. Selected = accent border, tint, filled
// dot. (What each type means lives behind the "?" next to the heading.)
const AccountTypeCard = ({ selected, accent, icon, title, onClick }) => {
  const a = CARD_ACCENTS[accent] || CARD_ACCENTS.indigo;
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
      <span className="flex-1 min-w-0 text-sm font-semibold text-slate-800 truncate">{title}</span>
      <span
        className={`flex items-center justify-center w-4 h-4 rounded-full border-2 shrink-0 ${
          selected ? a.dot : 'border-slate-300'
        }`}
      >
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
};

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Agent signup mode (/register?as=agent) — creates a CV-agent account that
  // lands on the CV-only workspace instead of the job-seeker dashboard.
  const [isAgent, setIsAgent] = useState(false);
  // "?" popover explaining the two account types.
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = React.useRef(null);
  const navigate = useNavigate();

  const { email, phone, password, confirmPassword, referralCode } = formData;

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

  const handlePhoneChange = (phone) => {
    setFormData({ ...formData, phone });
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
      setPasswordStrength({ score: 0, label: '', color: '' });
      return;
    }
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
      setPasswordStrength({ score, label: 'Weak', color: 'text-red-600 bg-red-50 border-red-200' });
    } else if (score <= 4) {
      setPasswordStrength({
        score,
        label: 'Medium',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      });
    } else {
      setPasswordStrength({
        score,
        label: 'Strong',
        color: 'text-green-600 bg-green-50 border-green-200',
      });
    }
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
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
      setError('Passwords do not match');
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
        phone,
        password,
        referralCode,
        ...(isAgent ? { accountType: 'agent' } : {}),
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      // Agents skip the job-seeker onboarding and go straight to their workspace.
      navigate(res.data.role === 'agent' ? '/agent' : '/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthShell
        formTitle={isAgent ? 'Create your CV agent account' : 'Create your account'}
        formSubtitle={
          isAgent
            ? 'Build and download CVs for your clients — pick an agent plan after signup.'
            : 'Start tailoring CVs in minutes — 10 free credits to play with.'
        }
        leftHeading={
          isAgent
            ? 'Run your CV-writing business in one place.'
            : 'Build a CV that gets past resume software.'
        }
        leftSubcopy={
          isAgent
            ? 'Organize CVs by client, tailor each to the job, and download unlimited polished CVs on an agent plan.'
            : 'ApplyRight pulls the right keywords from each job description and rewrites your bullets so recruiters — and the systems they use — actually notice you.'
        }
        valueProps={isAgent ? AGENT_VALUE_PROPS : DEFAULT_VALUE_PROPS}
        accent={isAgent ? 'amber' : 'indigo'}
        badge={
          isAgent
            ? { icon: <Briefcase className="w-3.5 h-3.5" />, label: 'CV Agent sign-up' }
            : { icon: <User className="w-3.5 h-3.5" />, label: 'Job Seeker sign-up' }
        }
        trustSignals={
          isAgent
            ? ['Unlimited CVs', 'Built for clients', 'Encrypted']
            : ['10 free credits', 'No card needed', 'Encrypted']
        }
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          {/* Account-type selector — the first decision on the page so users
              know whether they're signing up to job-hunt or to build CVs for
              clients. Selected card uses that audience's accent (indigo vs amber). */}
          <div role="radiogroup" aria-label="Account type">
            <div ref={infoRef} className="relative flex items-center gap-1.5 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                I'm signing up as
              </span>
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                aria-label="What's the difference between a job seeker and a CV agent?"
                aria-expanded={showInfo}
                className="text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-slate-600"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              {showInfo && (
                <div className="absolute left-0 top-6 z-20 w-72 p-3 rounded-lg border border-slate-200 bg-white shadow-lg text-xs leading-relaxed text-slate-600 space-y-2">
                  <p>
                    <span className="font-semibold text-indigo-700">Job seeker</span> — optimize your
                    own CV, score your fit for a job, and practice interviews with voice AI.
                  </p>
                  <p>
                    <span className="font-semibold text-amber-700">CV agent</span> — build and
                    download CVs for paying clients, organized by client. No interview tools.
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AccountTypeCard
                selected={!isAgent}
                accent="indigo"
                icon={<User className="w-4 h-4" />}
                title="Job seeker"
                onClick={() => selectAudience(false)}
              />
              <AccountTypeCard
                selected={isAgent}
                accent="amber"
                icon={<Briefcase className="w-4 h-4" />}
                title="CV agent"
                onClick={() => selectAudience(true)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input-field w-full"
              placeholder="name@company.com"
              value={email}
              onChange={onChange}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone number</label>
            <PhoneInput
              defaultCountry="us"
              value={phone}
              onChange={handlePhoneChange}
              disabled={isLoading}
              inputClassName="input-field w-full"
              countrySelectorStyleProps={{
                buttonClassName:
                  'border border-slate-300 rounded-l-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed',
              }}
              style={{
                '--react-international-phone-border-radius': '0.5rem',
                '--react-international-phone-border-color': 'rgb(203 213 225)',
                '--react-international-phone-background-color': '#fff',
                '--react-international-phone-text-color': 'rgb(15 23 42)',
                '--react-international-phone-selected-dropdown-item-background-color':
                  'rgb(238 242 255)',
                '--react-international-phone-country-selector-background-color-hover':
                  'rgb(248 250 252)',
                width: '100%',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
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
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && passwordStrength.label && (
              <div
                className={`mt-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${passwordStrength.color}`}
              >
                Password strength: {passwordStrength.label}
              </div>
            )}
            <p className="mt-1.5 text-xs text-slate-500">
              At least 8 characters, with upper and lowercase letters and a number.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirm password
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
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Referral code <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              name="referralCode"
              type="text"
              className="input-field w-full uppercase"
              placeholder="SAVE50"
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
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setActiveModal('terms')}
                className="font-medium text-indigo-600 hover:underline"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setActiveModal('privacy')}
                className="font-medium text-indigo-600 hover:underline"
              >
                Privacy Policy
              </button>
              .
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full group flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed ${
              isAgent
                ? 'py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors'
                : 'btn-primary'
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating account...
              </>
            ) : (
              <>
                {isAgent ? 'Create agent account' : 'Create account'}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </AuthShell>

      {/* Legal Modals */}
      <Modal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={activeModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
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
