import React, { useState, useEffect } from 'react';
import AriaLoader from '../components/ui/AriaLoader';
import { useBlocker, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import {
  User,
  LayoutDashboard,
  BookOpen,
  Settings,
  ShieldCheck,
  Save,
  CheckCircle,
  Sparkles,
  AlertTriangle,
  LogOut,
  MessageSquare,
  Sun,
  Moon,
  Target,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import CustomSelect from '../components/ui/CustomSelect';
import Modal from '../components/ui/Modal'; // Assuming Modal is created or exists
import { useTheme } from '../context/ThemeContext';

import CVService from '../services/cv.service';
import ApplicationService from '../services/application.service';
import UserService from '../services/user.service';
import PlanCard from '../components/PlanCard';
import ActivityCard from '../components/ActivityCard';
import ReferralCard from '../components/ReferralCard';
import TagInput from '../components/TagInput';
import AccountSecurity from '../components/AccountSecurity';

const Profile = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Active tab for the Account & Career Hub shell (Phase 0). Future phases add
  // tabs (Billing history, Notifications) without touching this scaffold.
  const [activeTab, setActiveTab] = useState('overview');

  // Unsaved Changes State
  const [initialFormData, setInitialFormData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Keep the page + localStorage in sync after an email change (done in the
  // self-contained AccountSecurity component, outside the profile form).
  const handleEmailUpdated = (email) => {
    setUser((prev) => ({ ...prev, email }));
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    stored.email = email;
    localStorage.setItem('user', JSON.stringify(stored));
    window.dispatchEvent(new Event('userDataUpdated'));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error("Please type 'DELETE' to confirm.");
      return;
    }

    setDeleting(true);
    try {
      await UserService.deleteAccount();
      toast.success('Your account has been deleted successfully');

      // Clear session & redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setTimeout(() => {
        navigate('/register');
      }, 2000);
    } catch (error) {
      console.error('Failed to delete account', error);
      toast.error(error.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    otherName: '',
    phone: '',
    portfolioUrl: '',
    linkedinUrl: '',
    currentJobTitle: '',
    currentStatus: 'student',
    graduationYear: '',
    university: '',
    discipline: '',
    careerGoals: [],
    skills: [],
    autoGenerateAnalysis: false,
    showOnboardingTutorials: true,
    hideSkillsAiPrompt: false,
    notifications: {
      productUpdates: true,
      interviewReminders: true,
      applicationNudges: true,
      marketingEmails: false,
    },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  // Check for dirty state whenever formData changes
  useEffect(() => {
    if (!initialFormData) return;

    const isFormChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setIsDirty(isFormChanged);

    // Handle browser level blocking (refresh, closing tab)
    const handleBeforeUnload = (e) => {
      if (isFormChanged) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, initialFormData]);

  // Use Router Blocker for in-app navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedModal(true);
    } else {
      setShowUnsavedModal(false);
    }
  }, [blocker]);

  const handleConfirmExit = () => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
    setShowUnsavedModal(false);
  };

  const handleCancelExit = () => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    setShowUnsavedModal(false);
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      const userData = res.data || {};
      setUser(userData);

      // Credits + plan entitlements are now self-fetched by <PlanCard /> via
      // GET /billing/entitlement, so no balance fetch is needed here.

      // Safe access to nested properties
      const education = userData.education || {};
      const settings = userData.settings || {};

      const notifications = settings.notifications || {};
      const loadedData = {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        otherName: userData.otherName || '',
        phone: userData.phone || '',
        portfolioUrl: userData.portfolioUrl || '',
        linkedinUrl: userData.linkedinUrl || '',
        currentJobTitle: userData.currentJobTitle || '',
        currentStatus: userData.currentStatus || 'student',
        graduationYear: education.graduationYear || '',
        university: education.university || '',
        discipline: education.discipline || '',
        careerGoals: Array.isArray(userData.careerGoals) ? userData.careerGoals : [],
        skills: Array.isArray(userData.skills) ? userData.skills : [],
        autoGenerateAnalysis: settings.autoGenerateAnalysis || false,
        // Defaults match the schema (tutorials on, hide-prompt off) when unset.
        showOnboardingTutorials: settings.showOnboardingTutorials !== false,
        hideSkillsAiPrompt: settings.hideSkillsAiPrompt || false,
        notifications: {
          productUpdates: notifications.productUpdates !== false,
          interviewReminders: notifications.interviewReminders !== false,
          applicationNudges: notifications.applicationNudges !== false,
          marketingEmails: notifications.marketingEmails || false,
        },
      };

      setFormData(loadedData);
      setInitialFormData(loadedData); // Set initial state for comparison
    } catch (error) {
      console.error('Failed to load profile', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Clean LinkedIn URL by removing UTM parameters and other tracking data
  const cleanLinkedInUrl = (url) => {
    if (!url) return url;

    try {
      // Check if it's a LinkedIn URL
      if (!url.includes('linkedin.com')) return url;

      // Add https:// if missing
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      // Parse the URL and remove query parameters
      const urlObj = new URL(cleanUrl);
      // Keep only the protocol, hostname, and pathname (no query params)
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Clean LinkedIn URL on change
    if (name === 'linkedinUrl') {
      const cleanedUrl = cleanLinkedInUrl(value);
      setFormData((prev) => ({ ...prev, [name]: cleanedUrl }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Auto-prepend https:// to URL fields on blur if user entered a bare domain
  const handleUrlBlur = (e) => {
    const { name, value } = e.target;
    if (!value) return;
    const trimmed = value.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setFormData((prev) => ({ ...prev, [name]: `https://${trimmed}` }));
    }
  };

  const handleSave = async (e) => {
    // Callable both as a form onSubmit and directly from a button (tabbed layout).
    e?.preventDefault?.();
    setSaving(true);
    try {
      const updatePayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        otherName: formData.otherName,
        phone: formData.phone,
        portfolioUrl: formData.portfolioUrl,
        linkedinUrl: formData.linkedinUrl,
        currentJobTitle: formData.currentJobTitle,
        currentStatus: formData.currentStatus,
        education: {
          graduationYear: formData.graduationYear,
          university: formData.university,
          discipline: formData.discipline,
        },
        careerGoals: formData.careerGoals,
        skills: formData.skills,
        settings: {
          autoGenerateAnalysis: formData.autoGenerateAnalysis,
          showOnboardingTutorials: formData.showOnboardingTutorials,
          hideSkillsAiPrompt: formData.hideSkillsAiPrompt,
          notifications: formData.notifications,
        },
      };

      const res = await api.put('/users/profile', updatePayload);
      setUser(res.data);
      // Update local storage to keep session in sync
      localStorage.setItem('user', JSON.stringify(res.data));
      // Dispatch custom event to notify other components (e.g., CVBuilder)
      window.dispatchEvent(new Event('userDataUpdated'));

      // Update initial form data to new state
      setInitialFormData(formData);
      setIsDirty(false); // Reset dirty state

      setSuccessMsg('Profile updated successfully!');
      toast.success('Profile updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Failed to update profile', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AriaLoader fullscreen size={32} label="Loading your profile…" />;

  if (!user)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Navbar />
        <div className="text-center mt-12">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Failed to load profile
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            We couldn't retrieve your user data.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen lg:h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Unsaved Changes Modal */}
      <Modal isOpen={showUnsavedModal} onClose={handleCancelExit} title="Unsaved Changes" size="sm">
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/15 rounded-full flex items-center justify-center mb-4 ring-8 ring-amber-50/50 dark:ring-amber-500/5">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>

          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            You have unsaved changes
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-1 max-w-[260px] mx-auto">
            If you leave now, you'll lose the changes you've made to your profile.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full mt-8">
            <button
              onClick={handleConfirmExit}
              className="px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 rounded-xl transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleCancelExit}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg transition-all transform active:scale-[0.98]"
            >
              Keep Editing
            </button>
          </div>
        </div>
      </Modal>

      <main className="flex-1 lg:min-h-0 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col">
        <div className="mb-6 flex items-center gap-3">
          <User className="w-8 h-8 text-slate-900 dark:text-slate-100" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your Account</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Your plan, career details and app settings — all in one place.
            </p>
          </div>
        </div>

        {/* Settings layout — a vertical nav rail on desktop, a horizontally
            scrollable pill row on mobile; the content fills the remaining width
            and is anchored left (not floating in the centre). The route never
            changes, so the unsaved-changes blocker only fires on page leave. */}
        <div className="flex flex-col lg:flex-row lg:gap-8 lg:flex-1 lg:min-h-0">
          <aside className="lg:w-56 shrink-0 mb-6 lg:mb-0">
            <div
              className="flex lg:flex-col gap-1 overflow-x-auto overflow-y-hidden lg:overflow-visible scrollbar-none p-1 rounded-2xl border border-white/60 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5"
              role="tablist"
            >
              {[
                { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                { id: 'profile', label: 'Career Profile', icon: User },
                { id: 'preferences', label: 'Preferences', icon: Settings },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'account', label: 'Account', icon: ShieldCheck },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all lg:w-full ${
                      isActive
                        ? 'bg-white/80 text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.10)] ring-1 ring-black/5 backdrop-blur-md dark:bg-white/10 dark:text-slate-100 dark:ring-white/10'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <TabIcon className="w-4 h-4 shrink-0" />
                    {tab.label}
                    {/* Unsaved-changes dot on the tabs that own editable fields */}
                    {isDirty &&
                      (tab.id === 'profile' ||
                        tab.id === 'preferences' ||
                        tab.id === 'notifications') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 lg:ml-auto" />
                      )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Content column — the only region that scrolls on desktop, so the
              heading + nav rail stay fixed while settings content scrolls.
              scrollbar-none hides the scrollbar (still scrollable). */}
          <div className="flex-1 min-w-0 lg:overflow-y-auto lg:min-h-0 scrollbar-none">
            {/* ── Overview tab ── plan + activity + referrals + quick links (the
                hub). Single column on mobile; tiles into two columns on desktop
                so the cards fill the width instead of a narrow centred ribbon. */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
                {/* Each column stacks independently so cards pack tightly with no
                row-alignment gaps. Pairing the tall plan card with the short
                quick-links (left) against activity + referral (right) keeps the
                two columns roughly level. */}
                <div className="space-y-6">
                  <PlanCard />

                  {/* Quick links — surfaces destinations that previously lived in the
                  Navbar account dropdown so mobile users (where the dropdown is
                  gone) still have one-tap access. */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-sm">
                    <button
                      type="button"
                      onClick={() => navigate('/aria-studio', { state: { start: 'prep' } })}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Interview Prep
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Questions, answers, talking points
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/credits')}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Buy credits
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Top up your A.I credit balance
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <ActivityCard />
                  <ReferralCard />
                </div>
              </div>
            )}

            {/* ── Career Profile tab ── personal/contact/education fields */}
            {activeTab === 'profile' && (
              <div className="max-w-3xl animate-in fade-in duration-200">
                <form
                  onSubmit={handleSave}
                  className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 relative"
                >
                  {/* Dirty Indicator */}
                  {isDirty && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15 px-3 py-1 rounded-full text-xs font-medium animate-in fade-in">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      Unsaved Changes
                    </div>
                  )}

                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    Personal Details
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        First Name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lastName"
                        className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="otherName"
                        className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
                      >
                        Other Name
                      </label>
                      <input
                        id="otherName"
                        type="text"
                        name="otherName"
                        value={formData.otherName}
                        onChange={handleChange}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="currentJobTitle"
                      className="block text-xs font-semibold text-slate-500 uppercase mb-1"
                    >
                      Current Job Title
                    </label>
                    <input
                      id="currentJobTitle"
                      type="text"
                      name="currentJobTitle"
                      value={formData.currentJobTitle}
                      onChange={handleChange}
                      placeholder="e.g. Full Stack Developer"
                      className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Displayed prominently on your CV header.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 my-6 pt-6">
                    <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-4">
                      Contact Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
                        >
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="e.g. 09017134882"
                          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="portfolioUrl"
                          className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
                        >
                          Portfolio URL
                        </label>
                        <input
                          id="portfolioUrl"
                          type="text"
                          name="portfolioUrl"
                          value={formData.portfolioUrl}
                          onChange={handleChange}
                          onBlur={handleUrlBlur}
                          placeholder="yourportfolio.com"
                          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          htmlFor="linkedinUrl"
                          className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
                        >
                          LinkedIn Profile
                        </label>
                        <input
                          id="linkedinUrl"
                          type="text"
                          name="linkedinUrl"
                          value={formData.linkedinUrl}
                          onChange={handleChange}
                          onBlur={handleUrlBlur}
                          placeholder="linkedin.com/in/yourprofile"
                          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Career Stage
                    </span>
                    <CustomSelect
                      name="currentStatus"
                      value={formData.currentStatus}
                      onChange={(e) => handleChange(e)}
                      options={[
                        { value: 'student', label: 'Student / New Grad' },
                        { value: 'professional', label: 'Working Professional' },
                        { value: 'career_switcher', label: 'Career Switcher' },
                      ]}
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      This helps the AI adjust the tone of your CV.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 my-6 pt-6">
                    <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      Education Context
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="university"
                          className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
                        >
                          University
                        </label>
                        <input
                          id="university"
                          type="text"
                          name="university"
                          value={formData.university}
                          onChange={handleChange}
                          placeholder="e.g. Stanford University"
                          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="discipline"
                          className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
                        >
                          Discipline
                        </label>
                        <input
                          id="discipline"
                          type="text"
                          name="discipline"
                          value={formData.discipline}
                          onChange={handleChange}
                          placeholder="e.g. Computer Science"
                          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="graduationYear"
                          className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
                        >
                          Graduation Year
                        </label>
                        <input
                          id="graduationYear"
                          type="number"
                          name="graduationYear"
                          value={formData.graduationYear}
                          onChange={handleChange}
                          placeholder="YYYY"
                          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                        />
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">
                          Critical for "Context-Aware" AI.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Career goals + skills — collected at signup but previously not
                  editable. Both feed AI quality (tone, skill matching). */}
                  <div className="border-t border-slate-100 dark:border-slate-700 my-6 pt-6 space-y-5">
                    <div>
                      <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        Career Goals
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                        What you're aiming for — helps the AI tailor tone and direction.
                      </p>
                      <TagInput
                        values={formData.careerGoals}
                        onChange={(next) => setFormData((prev) => ({ ...prev, careerGoals: next }))}
                        placeholder="e.g. Land a senior backend role"
                      />
                    </div>

                    <div>
                      <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        Skills
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                        Core skills the AI can match against job requirements.
                      </p>
                      <TagInput
                        values={formData.skills}
                        onChange={(next) => setFormData((prev) => ({ ...prev, skills: next }))}
                        placeholder="e.g. React, Node.js, SQL"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
                    {successMsg && (
                      <span className="text-emerald-600 text-sm font-medium flex items-center gap-1 animate-in fade-in">
                        <CheckCircle className="w-4 h-4" /> {successMsg}
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={saving || !isDirty} // Disable if clean
                      className={`btn-primary w-full sm:w-auto sm:ml-auto px-6 py-2 flex items-center ${!isDirty ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {saving ? (
                        'Saving...'
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Preferences tab ── appearance + automation. Theme is instant;
            the automation toggle is part of formData and persists via Save. */}
            {activeTab === 'preferences' && (
              <div className="max-w-3xl space-y-6 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Moon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    Appearance
                  </h3>
                  <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Theme
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Dark mode applies across the app on this device.
                      </div>
                    </div>
                    <div
                      role="group"
                      aria-label="Theme"
                      className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        aria-pressed={theme === 'light'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          theme === 'light'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        aria-pressed={theme === 'dark'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        Dark
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    Automation Preferences
                  </h3>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <input
                      type="checkbox"
                      id="autoGenerate"
                      name="autoGenerateAnalysis"
                      checked={formData.autoGenerateAnalysis}
                      onChange={(e) =>
                        setFormData({ ...formData, autoGenerateAnalysis: e.target.checked })
                      }
                      className="w-5 h-5 text-slate-900 dark:text-slate-100 rounded focus:ring-slate-900 dark:focus:ring-slate-100 border-gray-300 dark:border-slate-600 dark:bg-slate-900"
                    />
                    <label htmlFor="autoGenerate" className="cursor-pointer flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Auto-Run Match Analysis
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Automatically analyze compatibility when job and resume are uploaded.
                      </div>
                    </label>
                  </div>

                  {/* App helpers — previously model-only flags, now user-controllable. */}
                  <div className="flex items-center gap-3 p-3 mt-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <input
                      type="checkbox"
                      id="showTutorials"
                      checked={formData.showOnboardingTutorials}
                      onChange={(e) =>
                        setFormData({ ...formData, showOnboardingTutorials: e.target.checked })
                      }
                      className="w-5 h-5 text-slate-900 dark:text-slate-100 rounded focus:ring-slate-900 dark:focus:ring-slate-100 border-gray-300 dark:border-slate-600 dark:bg-slate-900"
                    />
                    <label htmlFor="showTutorials" className="cursor-pointer flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Show onboarding tips
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Display guided tutorials and hints around the app.
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 mt-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <input
                      type="checkbox"
                      id="hideSkillsPrompt"
                      checked={formData.hideSkillsAiPrompt}
                      onChange={(e) =>
                        setFormData({ ...formData, hideSkillsAiPrompt: e.target.checked })
                      }
                      className="w-5 h-5 text-slate-900 dark:text-slate-100 rounded focus:ring-slate-900 dark:focus:ring-slate-100 border-gray-300 dark:border-slate-600 dark:bg-slate-900"
                    />
                    <label htmlFor="hideSkillsPrompt" className="cursor-pointer flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Hide the AI skills prompt
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Stop suggesting AI skill auto-fill in the CV builder.
                      </div>
                    </label>
                  </div>

                  {/* Save footer — automation toggle persists to the profile. */}
                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-5">
                    {successMsg && (
                      <span className="text-emerald-600 text-sm font-medium flex items-center gap-1 animate-in fade-in">
                        <CheckCircle className="w-4 h-4" /> {successMsg}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !isDirty}
                      className={`btn-primary w-full sm:w-auto sm:ml-auto px-6 py-2 flex items-center justify-center ${!isDirty ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {saving ? (
                        'Saving...'
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Notifications tab ── email/notification preferences */}
            {activeTab === 'notifications' && (
              <div className="max-w-3xl animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    Notifications
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                    Choose what we email you about. You can change these any time.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        key: 'interviewReminders',
                        title: 'Interview reminders',
                        desc: 'Nudges to practice before an upcoming interview.',
                      },
                      {
                        key: 'applicationNudges',
                        title: 'Application nudges',
                        desc: 'Reminders to follow up on jobs you analyzed.',
                      },
                      {
                        key: 'productUpdates',
                        title: 'Product updates',
                        desc: 'New features and improvements to ApplyRight.',
                      },
                      {
                        key: 'marketingEmails',
                        title: 'Tips & offers',
                        desc: 'Occasional career tips and promotional offers.',
                      },
                    ].map((row) => (
                      <div
                        key={row.key}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          id={`notif-${row.key}`}
                          checked={formData.notifications[row.key]}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              notifications: { ...prev.notifications, [row.key]: e.target.checked },
                            }))
                          }
                          className="w-5 h-5 text-slate-900 dark:text-slate-100 rounded focus:ring-slate-900 dark:focus:ring-slate-100 border-gray-300 dark:border-slate-600 dark:bg-slate-900"
                        />
                        <label htmlFor={`notif-${row.key}`} className="cursor-pointer flex-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {row.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {row.desc}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Save footer */}
                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-5">
                    {successMsg && (
                      <span className="text-emerald-600 text-sm font-medium flex items-center gap-1 animate-in fade-in">
                        <CheckCircle className="w-4 h-4" /> {successMsg}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !isDirty}
                      className={`btn-primary w-full sm:w-auto sm:ml-auto px-6 py-2 flex items-center justify-center ${!isDirty ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {saving ? (
                        'Saving...'
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Account tab ── security, session + irreversible actions */}
            {activeTab === 'account' && (
              <div className="max-w-3xl space-y-6 animate-in fade-in duration-200">
                {/* Email / password / data export */}
                <AccountSecurity currentEmail={user.email} onEmailUpdated={handleEmailUpdated} />

                {/* Sign out — destructive action sits separately, with confirmation. */}
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-500/10 font-semibold transition-colors shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>

                {/* Danger Zone — for compliance & data privacy (deleting user data) */}
                <div className="rounded-2xl border border-rose-100 bg-rose-50/30 dark:border-rose-500/20 dark:bg-rose-500/5 p-5 shadow-sm space-y-3">
                  <h4 className="text-sm font-bold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Danger Zone
                  </h4>
                  <p className="text-xs text-rose-600/80 dark:text-rose-400/80 leading-relaxed">
                    Permanently delete your ApplyRight account and all your resumes, CVs, and AI
                    generation history. This action is irreversible.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmText('');
                      setShowDeleteModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-md shadow-rose-200 hover:scale-[1.01]"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sign-out confirmation modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close sign out confirmation"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/15 rounded-full flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                Sign Out?
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to sign out?
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    handleSignOut();
                  }}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-rose-200 dark:shadow-none"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close delete account confirmation"
            className="absolute inset-0 cursor-default"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-rose-100 dark:border-rose-500/20">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/15 rounded-full flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Delete Account Permanently?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                This will permanently delete your ApplyRight profile and purge all your CV drafts,
                uploaded resumes, matched job applications, and credit history from our servers.{' '}
                <strong>This action is irreversible.</strong>
              </p>

              <div className="w-full mb-6 text-left">
                <label
                  htmlFor="deleteConfirmInput"
                  className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide"
                >
                  Type <span className="text-rose-600 dark:text-rose-400 font-mono">DELETE</span> to
                  confirm:
                </label>
                <input
                  id="deleteConfirmInput"
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={deleting}
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none font-mono text-center tracking-wider text-rose-600 dark:text-rose-400 font-bold"
                />
              </div>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <AriaLoader inline tone="mono" size={16} label="" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
