import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Lock,
  Globe,
  CreditCard,
  Cpu,
  MessageSquare,
  Layout,
  Briefcase,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/Admin/AdminLayout';
import CustomSelect from '../../components/ui/CustomSelect';

// Human labels + descriptions for every per-action credit cost. Keys are the
// canonical backend names from config/creditCosts.js. Any key present in the
// backend defaults but missing here still renders (falls back to the raw key).
const CREDIT_COST_META = {
  ANALYSIS: { label: 'Fit Analysis', help: 'CV ↔ job-description match analysis.' },
  GENERATE_CV: { label: 'Generate CV', help: 'Tailored CV generation for an application.' },
  GENERATE_COVER_LETTER: { label: 'Cover Letter', help: 'AI cover letter for an application.' },
  GENERATE_INTERVIEW: {
    label: 'Interview Prep',
    help: 'Initial grounded question set + STAR answers.',
  },
  GENERATE_INTERVIEW_MORE: {
    label: 'More Interview Questions',
    help: 'Append more questions to an existing prep.',
  },
  GENERATE_STORIES: { label: 'Story Bank', help: 'STAR story generation (Android: ad-rewarded).' },
  GENERATE_ESSENTIAL: {
    label: 'Essential Answer',
    help: '“Tell me about yourself” / “Why this company”.',
  },
  GENERATE_DRESS_GUIDE: { label: 'What to Wear', help: 'Tailored interview-attire guide.' },
  GENERATE_BUNDLE: {
    label: 'Bundle',
    help: 'CV + cover letter + interview prep (flat, all-or-nothing).',
  },
  CREATE_FROM_UPLOAD: {
    label: 'Create from Upload',
    help: 'Parse an uploaded resume into a draft CV.',
  },
  GENERATE_SKILLS: { label: 'AI Skills', help: 'AI-powered skills generation.' },
  GENERATE_JD_KEYWORDS: {
    label: 'Find More Keywords',
    help: 'Rich ATS keyword extraction (charged once per JD).',
  },
  GRADE_ANSWER: { label: 'Grade Answer', help: 'AI grading of a practiced interview answer.' },
  GRADE_STORY: { label: 'Grade Story', help: 'AI grading of a STAR story.' },
  FOLLOWUP: { label: 'Follow-up Question', help: 'AI follow-up in interview practice.' },
  INTERVIEW_MODE: {
    label: 'Interview Mode',
    help: 'Full live run. DEFINED BUT NOT ENFORCED today.',
  },
  TEMPLATE_UNLOCK: { label: 'Template Unlock', help: 'Unlock a premium CV template.' },
};

// <input type="datetime-local"> has no timezone: it reads and writes local wall-clock.
// Converting through the Date object keeps the stored instant correct for an admin in
// any timezone — slicing a UTC ISO string here would shift the launch by their offset.
const toLocalInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [originalSettings, setOriginalSettings] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [changes, setChanges] = useState([]);
  const [message, setMessage] = useState(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const res = await api.get('/admin/settings', config);
      setSettings(res.data.data);
      setOriginalSettings(JSON.parse(JSON.stringify(res.data.data))); // Deep copy
      setLoading(false);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to load settings.' });
      setLoading(false);
    }
  };

  const getChanges = () => {
    if (!settings || !originalSettings) return [];
    const changesList = [];

    // Check Credits
    Object.keys(settings.credits || {}).forEach((key) => {
      if (settings.credits[key] !== originalSettings.credits[key]) {
        changesList.push({
          category: 'Credits',
          key: key.replace(/([A-Z])/g, ' $1').trim(), // Format camelCase to Title Case
          oldVal: originalSettings.credits[key],
          newVal: settings.credits[key],
        });
      }
    });

    // Check per-action credit-cost overrides. A change is: a new override, a
    // removed override (reverting to default), or a changed override value.
    const defaults = settings.creditCostDefaults || {};
    const oldCosts = originalSettings.creditCosts || {};
    const newCosts = settings.creditCosts || {};
    const costKeys = new Set([...Object.keys(oldCosts), ...Object.keys(newCosts)]);
    costKeys.forEach((key) => {
      const oldVal = oldCosts[key];
      const newVal = newCosts[key];
      if (oldVal === newVal) return;
      const label = (CREDIT_COST_META[key] && CREDIT_COST_META[key].label) || key;
      changesList.push({
        category: 'Credit Cost',
        key: label,
        oldVal: oldVal ?? `${defaults[key]} (default)`,
        newVal: newVal ?? `${defaults[key]} (default)`,
      });
    });

    // Check Features
    Object.keys(settings.features || {}).forEach((key) => {
      if (settings.features[key] !== originalSettings.features[key]) {
        changesList.push({
          category: 'Features',
          key: key.replace(/([A-Z])/g, ' $1').trim(),
          oldVal: originalSettings.features[key] ? 'Enabled' : 'Disabled',
          newVal: settings.features[key] ? 'Enabled' : 'Disabled',
        });
      }
    });

    // Check Announcement
    if (settings.announcement) {
      if (settings.announcement.enabled !== originalSettings.announcement.enabled) {
        changesList.push({
          category: 'Announcement',
          key: 'Banner Status',
          oldVal: originalSettings.announcement.enabled ? 'Enabled' : 'Disabled',
          newVal: settings.announcement.enabled ? 'Enabled' : 'Disabled',
        });
      }
      if (settings.announcement.message !== originalSettings.announcement.message) {
        changesList.push({
          category: 'Announcement',
          key: 'Message',
          oldVal: originalSettings.announcement.message,
          newVal: settings.announcement.message,
        });
      }
      if (settings.announcement.type !== originalSettings.announcement.type) {
        changesList.push({
          category: 'Announcement',
          key: 'Type',
          oldVal: originalSettings.announcement.type,
          newVal: settings.announcement.type,
        });
      }
    }

    // Check Voice (Interview Mode TTS provider)
    if (
      (settings.tts?.provider || 'elevenlabs') !== (originalSettings.tts?.provider || 'elevenlabs')
    ) {
      changesList.push({
        category: 'Voice',
        key: 'Interviewer voice provider',
        oldVal: originalSettings.tts?.provider || 'elevenlabs',
        newVal: settings.tts?.provider || 'elevenlabs',
      });
    }

    return changesList;
  };

  const handleSaveClick = () => {
    const detectedChanges = getChanges();
    if (detectedChanges.length === 0) {
      setMessage({ type: 'info', text: 'No changes detected.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setChanges(detectedChanges);
    setShowConfirmModal(true);
  };

  const executeSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      // Strip read-only helper fields the GET attached (resolved costs + defaults)
      // so we only persist the actual override map + settings.
      // eslint-disable-next-line no-unused-vars
      const { creditCostDefaults, creditCostsResolved, ...payload } = settings;

      // Send update request
      const res = await api.put('/admin/settings', payload, config);

      setSettings(res.data.data);
      setOriginalSettings(JSON.parse(JSON.stringify(res.data.data))); // Update original to new state
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setShowConfirmModal(false);

      // Dispatch event to update other components immediately
      window.dispatchEvent(new Event('settings_updated'));

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  // Set a per-action credit-cost OVERRIDE. Only overridden keys live in
  // settings.creditCosts; everything else falls back to the backend defaults.
  const handleCreditCostChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      creditCosts: { ...(prev.creditCosts || {}), [key]: value },
    }));
  };

  // Remove an override so the action reverts to its backend default.
  const resetCreditCost = (key) => {
    setSettings((prev) => {
      const next = { ...(prev.creditCosts || {}) };
      delete next[key];
      return { ...prev, creditCosts: next };
    });
  };

  if (loading)
    return (
      <div className="flex bg-slate-50 min-h-screen items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary/50 animate-spin" />
      </div>
    );

  if (!settings) return <div className="p-8 text-center">Failed to load settings.</div>;

  const tabs = [
    { id: 'general', label: 'General & A.I Credits', icon: CreditCard },
    { id: 'features', label: 'Features & Toggles', icon: Cpu },
    { id: 'announcements', label: 'Announcements', icon: MessageSquare },
    { id: 'templates', label: 'Templates', icon: Layout },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
            <p className="text-slate-500">Manage global application configuration.</p>
          </div>
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Message Toast */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}
          >
            {message.type === 'error' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {message.text}
          </motion.div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row min-h-[600px]">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 flex-shrink-0 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8">
            {/* General & Credits */}
            {activeTab === 'general' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Grants &amp; Rewards
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Signup Bonus</label>
                      <input
                        type="number"
                        value={settings.credits.signupBonus}
                        onChange={(e) =>
                          handleChange('credits', 'signupBonus', parseInt(e.target.value))
                        }
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                      />
                      <p className="text-xs text-slate-500">
                        A.I Credits given to new users upon registration.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Referral Bonus</label>
                      <input
                        type="number"
                        value={settings.credits.referralBonus}
                        onChange={(e) =>
                          handleChange('credits', 'referralBonus', parseInt(e.target.value))
                        }
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                      />
                      <p className="text-xs text-slate-500">A.I Credits awarded to the referrer.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Ad Reward (Android)
                      </label>
                      <input
                        type="number"
                        value={settings.credits.adRewardAndroid ?? 10}
                        onChange={(e) =>
                          handleChange('credits', 'adRewardAndroid', parseInt(e.target.value) || 0)
                        }
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                      />
                      <p className="text-xs text-slate-500">
                        Credits earned by watching an AdMob ad on Android.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Per-action Credit Costs (admin-editable overrides) */}
                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Credit Costs (per action)
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    What each AI/PDF action charges. Blank fields use the system default. Set a
                    value to override; click Reset to revert an action to its default.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {Object.keys(settings.creditCostDefaults || {}).map((key) => {
                      const meta = CREDIT_COST_META[key] || { label: key, help: '' };
                      const def = settings.creditCostDefaults?.[key];
                      const override = settings.creditCosts?.[key];
                      const isOverridden = override !== undefined && override !== null;
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700">
                              {meta.label}
                            </label>
                            {isOverridden && (
                              <button
                                type="button"
                                onClick={() => resetCreditCost(key)}
                                className="text-xs text-primary hover:underline"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={isOverridden ? override : ''}
                            placeholder={`${def} (default)`}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                resetCreditCost(key);
                              } else {
                                const n = parseInt(raw, 10);
                                handleCreditCostChange(key, Number.isNaN(n) ? 0 : n);
                              }
                            }}
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none ${
                              isOverridden ? 'border-primary/40 bg-primary/5' : 'border-slate-200'
                            }`}
                          />
                          <p className="text-xs text-slate-500">{meta.help}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Features & Toggles */}
            {activeTab === 'features' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-red-600" />
                    Maintenance Mode
                  </h3>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex items-start gap-4">
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={settings.features.maintenanceMode}
                        onChange={(e) =>
                          handleChange('features', 'maintenanceMode', e.target.checked)
                        }
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-700">Enable Maintenance Mode</h4>
                      <p className="text-sm text-red-600 mt-1">
                        When enabled, only admins and accounts granted maintenance access can get
                        in. Everyone else sees the maintenance page — or, if the pre-launch campaign
                        below is on, the launch countdown instead.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pre-launch campaign. Separate from maintenance mode on purpose: the
                    plain maintenance page has to stay available for an unplanned outage,
                    where a launch countdown would be a lie. */}
                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Pre-launch campaign</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={settings.launch?.enabled || false}
                          onChange={(e) => handleChange('launch', 'enabled', e.target.checked)}
                          className="w-5 h-5 rounded"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Show the launch countdown</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          With maintenance mode ON, gated visitors see the countdown page instead of
                          the maintenance page, and new signups receive the bonus below rather than
                          the normal signup bonus.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="launch-date"
                          className="text-sm font-semibold text-slate-700"
                        >
                          Launch date &amp; time
                        </label>
                        <input
                          id="launch-date"
                          type="datetime-local"
                          value={toLocalInput(settings.launch?.date)}
                          onChange={(e) =>
                            handleChange('launch', 'date', fromLocalInput(e.target.value))
                          }
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        />
                        <p className="text-xs text-slate-400">
                          Set in your own timezone. Nothing opens automatically — turn maintenance
                          off yourself on the day.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="launch-bonus-credits"
                          className="text-sm font-semibold text-slate-700"
                        >
                          Bonus credits
                        </label>
                        <input
                          id="launch-bonus-credits"
                          type="number"
                          value={settings.launch?.bonusCredits ?? 50}
                          onChange={(e) =>
                            handleChange('launch', 'bonusCredits', parseInt(e.target.value))
                          }
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        />
                        <p className="text-xs text-slate-400">
                          What a pre-launch signup receives, and what the grant on the Launch page
                          hands existing accounts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-primary" />
                    Feature Toggles
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-900">PDF Generation</h4>
                        <p className="text-sm text-slate-500">
                          Allow users to download PDFs via Puppeteer service.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.features.enablePdfGeneration}
                          onChange={(e) =>
                            handleChange('features', 'enablePdfGeneration', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-900">AI Analysis</h4>
                        <p className="text-sm text-slate-500">
                          Enable OpenAI integration for Resume reviews.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.features.enableAiAnalysis}
                          onChange={(e) =>
                            handleChange('features', 'enableAiAnalysis', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-900">Job Search</h4>
                        <p className="text-sm text-slate-500">
                          Enable job search feature (Adzuna, Jobberman, Indeed).
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.features.enableJobSearch}
                          onChange={(e) =>
                            handleChange('features', 'enableJobSearch', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-900">AdMob Ads & Rewards</h4>
                        <p className="text-sm text-slate-500">
                          Enable native AdMob rewarded and interstitial ads on Android.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.features.admobEnabled ?? false}
                          onChange={(e) =>
                            handleChange('features', 'admobEnabled', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Interview Mode Voice */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Interview Mode Voice
                  </h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-6">
                    <p className="block text-sm font-semibold text-slate-700 mb-2">
                      AI interviewer voice provider
                    </p>
                    <CustomSelect
                      value={settings.tts?.provider || 'elevenlabs'}
                      onChange={(e) => handleChange('tts', 'provider', e.target.value)}
                      options={[
                        { value: 'elevenlabs', label: 'ElevenLabs (most realistic)' },
                        { value: 'openai', label: 'OpenAI TTS (cheaper)' },
                        { value: 'off', label: 'Off (use device voice)' },
                      ]}
                      className="w-full max-w-xs"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      API keys are configured via environment variables (see the setup guide). If
                      the selected provider has no key, Interview Mode falls back to the
                      browser&apos;s built-in voice.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Announcements */}
            {activeTab === 'announcements' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Global Banner
                  </h3>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.announcement.enabled}
                          onChange={(e) =>
                            handleChange('announcement', 'enabled', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                      <span className="font-medium text-slate-900">Enable Announcement Banner</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Banner Message</label>
                      <textarea
                        value={settings.announcement.message}
                        onChange={(e) => handleChange('announcement', 'message', e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        rows="3"
                        placeholder="e.g. System maintenance scheduled for Saturday..."
                      ></textarea>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Banner Type (Severity)
                      </label>
                      <div className="flex gap-4">
                        {['info', 'warning', 'critical'].map((type) => (
                          <button
                            key={type}
                            onClick={() => handleChange('announcement', 'type', type)}
                            className={`px-4 py-2 rounded-lg border text-sm font-bold capitalize transition-all ${
                              settings.announcement.type === type
                                ? type === 'info'
                                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                                  : type === 'warning'
                                    ? 'bg-amber-100 border-amber-500 text-amber-700'
                                    : 'bg-red-100 border-red-500 text-red-700'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    {settings.announcement.enabled && (
                      <div className="mt-8">
                        <label className="text-sm font-semibold text-slate-700 block mb-2">
                          Live Preview:
                        </label>
                        <div
                          className={`p-4 rounded-lg flex items-center justify-center text-center font-medium ${
                            settings.announcement.type === 'info'
                              ? 'bg-blue-600 text-white'
                              : settings.announcement.type === 'warning'
                                ? 'bg-amber-500 text-white'
                                : 'bg-red-600 text-white'
                          }`}
                        >
                          {settings.announcement.message || 'Your message here'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Templates (Placeholder for now) */}
            {activeTab === 'templates' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Layout className="w-5 h-5 text-primary" />
                    Template Management
                  </h3>
                  <p className="text-slate-500">
                    Feature disabled templates or set the default here. (Coming Soon)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 transform transition-all scale-100">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Review Changes</h3>
            <p className="text-slate-500 mb-4">
              Please review the changes before applying them to the live system.
            </p>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 max-h-[300px] overflow-y-auto space-y-3 border border-slate-200">
              {changes.map((change, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm border-b last:border-0 border-slate-200 pb-2 last:pb-0"
                >
                  <div>
                    <span className="font-semibold text-slate-700 block">
                      {change.category} - {change.key}
                    </span>
                    <span className="text-slate-400 line-through mr-2">{change.oldVal}</span>
                    <span className="text-primary font-medium">→ {change.newVal}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                Disregard
              </button>
              <button
                onClick={executeSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                {saving ? 'Saving...' : 'Proceed & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSettings;
