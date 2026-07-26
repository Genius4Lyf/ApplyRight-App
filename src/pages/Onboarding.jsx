import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { ArrowRight, CheckCircle, User, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import CustomSelect from '../components/ui/CustomSelect';
import WelcomeModal from '../components/onboarding/WelcomeModal';

const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    otherName: '',

    linkedinUrl: '',
    portfolioUrl: '',
    currentStatus: 'student',
    university: '',
    discipline: '',
    graduationYear: '',
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

  const handleNext = () => {
    // Validation for Step 1
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.currentStatus) {
        toast.error(t('onboarding.toasts.validationTitle'), {
          description: t('onboarding.toasts.validationDescription'),
        });
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Process comma-separated lists
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        otherName: formData.otherName,

        linkedinUrl: formData.linkedinUrl,
        portfolioUrl: formData.portfolioUrl,
        currentStatus: formData.currentStatus,
        education: {
          university: formData.university,
          discipline: formData.discipline,
          graduationYear: formData.graduationYear,
        },
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
    navigate('/dashboard', { state: { showProfilePrompt: true } });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <WelcomeModal
        isOpen={showWelcome}
        firstName={formData.firstName}
        onComplete={handleWelcomeComplete}
      />

      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[t('onboarding.progress.basicInfo'), t('onboarding.progress.education')].map((label, index) => (
              <span
                key={label}
                className={`text-sm font-medium ${step > index ? 'text-slate-900 dark:text-slate-100' : step === index + 1 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 dark:bg-white transition-all duration-500 ease-in-out"
              style={{ width: `${(step / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="p-5 sm:p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-4 text-slate-900 dark:text-slate-100">
                {step === 1 && <User className="w-6 h-6" />}
                {step === 2 && <GraduationCap className="w-6 h-6" />}
              </div>
              <h2 className="text-2xl font-heading font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {step === 1 && t('onboarding.step1.heading')}
                {step === 2 && t('onboarding.step2.heading')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                {step === 1 && t('onboarding.step1.subheading')}
                {step === 2 && t('onboarding.step2.subheading')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6">
            {step === 1 && (
              <div className="space-y-5 animate-fadeIn">
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
            )}

            {step === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('onboarding.step2.universityLabel')}
                  </label>
                  <input
                    name="university"
                    value={formData.university}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder={t('onboarding.step2.universityPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('onboarding.step2.disciplineLabel')}
                  </label>
                  <input
                    name="discipline"
                    value={formData.discipline}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder={t('onboarding.step2.disciplinePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('onboarding.step2.graduationYearLabel')}
                  </label>
                  <input
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder={t('onboarding.step2.graduationYearPlaceholder')}
                    type="number"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  {t('common.back')}
                </button>
              ) : (
                <div></div>
              )}

              {step < 2 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary px-6 py-2 flex items-center"
                >
                  {t('onboarding.actions.next')} <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? t('onboarding.actions.completing') : t('onboarding.actions.complete')}
                  {!loading && <CheckCircle className="ml-2 w-4 h-4" />}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
