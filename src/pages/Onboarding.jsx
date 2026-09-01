import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { CheckCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import CustomSelect from '../components/ui/CustomSelect';
import WelcomeModal from '../components/onboarding/WelcomeModal';

// Academic journey (university/discipline/graduation year) used to be a second
// onboarding step, but not every user has been to school — it's now collected
// later, optionally, from Profile settings. Onboarding is basic info only.
const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    otherName: '',

    linkedinUrl: '',
    portfolioUrl: '',
    currentStatus: 'student',
  });

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
    } catch (error) {
      // If URL parsing fails, return as-is
      return url;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Clean LinkedIn URL on blur/change
    if (name === 'linkedinUrl') {
      const cleanedUrl = cleanLinkedInUrl(value);
      setFormData({ ...formData, [name]: cleanedUrl });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.currentStatus) {
      toast.error(t('onboarding.toasts.validationTitle'), {
        description: t('onboarding.toasts.validationDescription'),
      });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        otherName: formData.otherName,

        linkedinUrl: formData.linkedinUrl,
        portfolioUrl: formData.portfolioUrl,
        currentStatus: formData.currentStatus,
        onboardingCompleted: true,
      };

      const res = await api.put('/users/profile', payload);
      localStorage.setItem('user', JSON.stringify(res.data));

      window.dispatchEvent(new Event('userDataUpdated'));

      // Show welcome modal instead of immediate navigation
      setShowWelcome(true);
    } catch (error) {
      console.error('Onboarding failed', error);
      toast.error(t('onboarding.toasts.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeComplete = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <WelcomeModal
        isOpen={showWelcome}
        firstName={formData.firstName}
        onComplete={handleWelcomeComplete}
      />

      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="p-5 sm:p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-4 text-slate-900 dark:text-slate-100">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-heading font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {t('onboarding.step1.heading')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {t('onboarding.step1.subheading')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('onboarding.step1.firstNameLabel')}
                  </label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder={t('onboarding.step1.firstNamePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('onboarding.step1.lastNameLabel')}
                  </label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder={t('onboarding.step1.lastNamePlaceholder')}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('onboarding.step1.otherNameLabel')}
                </label>
                <input
                  name="otherName"
                  value={formData.otherName}
                  onChange={handleChange}
                  className="input-field w-full"
                  placeholder={t('onboarding.step1.otherNamePlaceholder')}
                />
              </div>

              <div>
                <CustomSelect
                  label={t('onboarding.step1.currentStatusLabel')}
                  name="currentStatus"
                  value={formData.currentStatus}
                  onChange={(e) => handleChange(e)}
                  options={[
                    { value: 'student', label: t('onboarding.step1.status.student') },
                    { value: 'graduate', label: t('onboarding.step1.status.graduate') },
                    { value: 'professional', label: t('onboarding.step1.status.professional') },
                    { value: 'other', label: t('onboarding.step1.status.other') },
                  ]}
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? t('onboarding.actions.completing') : t('onboarding.actions.complete')}
                {!loading && <CheckCircle className="ml-2 w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
