import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import jobSearchService from '../services/jobSearchService';
import { ArrowRight, CheckCircle, Sparkles, User, GraduationCap, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import CustomSelect from '../components/ui/CustomSelect';
import WelcomeModal from '../components/onboarding/WelcomeModal';

const Onboarding = () => {
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

    // Job profile fields (step 3)
    desiredTitle: '',
    jobCountry: 'NG',
    jobCity: '',
    jobRemote: false,
    jobType: 'fulltime',
    experienceLevel: 'entry',
    topSkills: [],
  });
  const [skillInput, setSkillInput] = useState('');

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

  const addSkill = (skill) => {
    if (formData.topSkills.length >= 5) return;
    if (!formData.topSkills.includes(skill)) {
      setFormData((prev) => ({ ...prev, topSkills: [...prev.topSkills, skill] }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    setFormData((prev) => ({
      ...prev,
      topSkills: prev.topSkills.filter((s) => s !== skill),
    }));
  };

  const POPULAR_SKILLS = [
    'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'Excel',
    'Project Management', 'Data Analysis', 'Communication', 'Marketing',
    'Design', 'SQL', 'Customer Service', 'Sales', 'HTML/CSS',
  ];

  const handleNext = () => {
    // Validation for Step 1
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.currentStatus) {
        toast.error('Please fill in all required fields to proceed.', {
          description: 'It helps us tailor your experience on ApplyRight.',
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

      // Save job profile if filled
      if (formData.desiredTitle) {
        try {
          const profileResult = await jobSearchService.updateJobProfile({
            desiredTitle: formData.desiredTitle,
            preferredLocation: {
              country: formData.jobCountry,
              city: formData.jobCity,
              remote: formData.jobRemote,
            },
            jobType: formData.jobType,
            experienceLevel: formData.experienceLevel,
            topSkills: formData.topSkills,
          });
          // Update localStorage with job profile
          const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
          updatedUser.jobProfile = profileResult.jobProfile;
          updatedUser.onboardingCompleted = true;
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (e) {
          console.error('Job profile save failed (non-blocking)', e);
        }
      }

      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('userDataUpdated'));

      // Show welcome modal instead of immediate navigation
      setShowWelcome(true);
    } catch (error) {
      console.error('Onboarding failed', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeComplete = () => {
    navigate('/dashboard', { state: { showProfilePrompt: true } });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <WelcomeModal
        isOpen={showWelcome}
        firstName={formData.firstName}
        onComplete={handleWelcomeComplete}
      />

      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {['Basic Info', 'Education', 'Job Preferences'].map((label, index) => (
              <span
                key={label}
                className={`text-sm font-medium ${step > index ? 'text-primary' : step === index + 1 ? 'text-slate-900' : 'text-slate-400'}`}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="relative bg-primary/5 border-b border-primary/10 overflow-hidden">
            {/* Educational Background Pattern */}
            <div
              className="absolute inset-0 opacity-[0.15] z-0 pointer-events-none"
              style={{
                backgroundImage: `url('/educational-bg.png')`,
                backgroundSize: '400px', // Adjust size for better visibility of vector elements
                backgroundRepeat: 'repeat',
                backgroundPosition: 'center',
              }}
            />

            <div className="relative z-10 p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white mb-4 shadow-sm text-primary">
                {step === 1 && <User className="w-6 h-6" />}
                {step === 2 && <GraduationCap className="w-6 h-6" />}
                {step === 3 && <Briefcase className="w-6 h-6" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {step === 1 && "Let's get to know you"}
                {step === 2 && 'Your Academic Journey'}
                {step === 3 && 'What are you looking for?'}
              </h2>
              <p className="text-slate-500 mt-2">
                {step === 1 && 'Tell us a bit about yourself to get started.'}
                {step === 2 && 'Help us tailor resources to your field of study.'}
                {step === 3 && 'Help us find the perfect jobs for you.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {step === 1 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      First Name
                    </label>
                    <input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="input-field w-full"
                      placeholder="Jane"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Last Name
                    </label>
                    <input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="input-field w-full"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Other Name (Optional)
                  </label>
                  <input
                    name="otherName"
                    value={formData.otherName}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder="Middle Name"
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Current Status"
                    name="currentStatus"
                    value={formData.currentStatus}
                    onChange={(e) => handleChange(e)}
                    options={[
                      { value: 'student', label: 'Student' },
                      { value: 'graduate', label: 'Recent Graduate' },
                      { value: 'professional', label: 'Professional' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    University / Institution
                  </label>
                  <input
                    name="university"
                    value={formData.university}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder="e.g. Stanford University"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Discipline / Major
                  </label>
                  <input
                    name="discipline"
                    value={formData.discipline}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder="e.g. Computer Science"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Graduation Year (Expected)
                  </label>
                  <input
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder="e.g. 2026"
                    type="number"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Desired Job Title *
                  </label>
                  <input
                    name="desiredTitle"
                    value={formData.desiredTitle}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder="e.g. Frontend Developer, Data Analyst"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Country
                    </label>
                    <select
                      name="jobCountry"
                      value={formData.jobCountry}
                      onChange={handleChange}
                      className="input-field w-full"
                    >
                      <option value="NG">Nigeria</option>
                      <option value="GB">United Kingdom</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="ZA">South Africa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      City
                    </label>
                    <input
                      name="jobCity"
                      value={formData.jobCity}
                      onChange={handleChange}
                      className="input-field w-full"
                      placeholder="e.g. Lagos, London"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    name="jobRemote"
                    checked={formData.jobRemote}
                    onChange={(e) => setFormData({ ...formData, jobRemote: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Open to remote work
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Type</label>
                    <select name="jobType" value={formData.jobType} onChange={handleChange} className="input-field w-full">
                      <option value="fulltime">Full-time</option>
                      <option value="parttime">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Experience Level</label>
                    <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange} className="input-field w-full">
                      <option value="entry">Entry Level</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior Level</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Top Skills (up to 5)
                  </label>
                  {formData.topSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {formData.topSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200"
                        >
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)} className="text-indigo-400 hover:text-indigo-600">
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {formData.topSkills.length < 5 && (
                    <>
                      <input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && skillInput.trim()) {
                            e.preventDefault();
                            addSkill(skillInput.trim());
                          }
                        }}
                        placeholder="Type a skill and press Enter..."
                        className="input-field w-full mb-2"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_SKILLS.filter((s) => !formData.topSkills.includes(s))
                          .slice(0, 8)
                          .map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => addSkill(skill)}
                              className="px-2 py-0.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                            >
                              + {skill}
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  This step is optional but helps us find better job matches for you.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t border-slate-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors"
                >
                  Back
                </button>
              ) : (
                <div></div>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary px-6 py-2 flex items-center"
                >
                  Next <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Completing Profile...' : 'Complete Profile'}
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
