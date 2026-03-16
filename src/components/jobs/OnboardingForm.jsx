import React, { useState } from 'react';
import { Target, MapPin, Briefcase, Code, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jobSearchService from '../../services/jobSearchService';

const COUNTRIES = [
  { code: 'NG', label: 'Nigeria' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'IN', label: 'India' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'NL', label: 'Netherlands' },
];

const POPULAR_SKILLS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'TypeScript',
  'SQL', 'Excel', 'Project Management', 'Data Analysis',
  'Communication', 'Marketing', 'Design', 'AWS', 'Machine Learning',
  'Accounting', 'Customer Service', 'Sales', 'HTML/CSS', 'Git',
];

const OnboardingForm = ({ onComplete, compact = false }) => {
  const [formData, setFormData] = useState({
    desiredTitle: '',
    country: 'NG',
    city: '',
    remote: false,
    jobType: 'fulltime',
    experienceLevel: 'entry',
    topSkills: [],
    salaryMin: '',
    salaryMax: '',
    currency: 'NGN',
  });
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const addSkill = (skill) => {
    if (formData.topSkills.length >= 5) {
      toast.error('Maximum 5 skills allowed');
      return;
    }
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

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      addSkill(skillInput.trim());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.desiredTitle.trim()) {
      toast.error('Please enter your desired job title');
      return;
    }

    if (formData.topSkills.length === 0) {
      toast.error('Please add at least one skill');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        desiredTitle: formData.desiredTitle,
        preferredLocation: {
          country: formData.country,
          city: formData.city,
          remote: formData.remote,
        },
        jobType: formData.jobType,
        experienceLevel: formData.experienceLevel,
        topSkills: formData.topSkills,
        salaryExpectation: {
          min: formData.salaryMin ? Number(formData.salaryMin) : 0,
          max: formData.salaryMax ? Number(formData.salaryMax) : 0,
          currency: formData.currency,
        },
      };

      const result = await jobSearchService.updateJobProfile(payload);

      // Update localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.jobProfile = result.jobProfile;
      user.onboardingCompleted = true;
      localStorage.setItem('user', JSON.stringify(user));
      window.dispatchEvent(new Event('userDataUpdated'));

      toast.success('Job profile saved!');
      onComplete?.(result);
    } catch (error) {
      console.error('Failed to save job profile', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const filteredSuggestions = POPULAR_SKILLS.filter(
    (s) =>
      !formData.topSkills.includes(s) &&
      (skillInput ? s.toLowerCase().includes(skillInput.toLowerCase()) : true)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Desired Job Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          <Target className="w-4 h-4 inline mr-1" />
          What role are you looking for? *
        </label>
        <input
          name="desiredTitle"
          value={formData.desiredTitle}
          onChange={handleChange}
          placeholder="e.g. Frontend Developer, Data Analyst, Marketing Manager"
          className="input-field w-full"
          required
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <MapPin className="w-4 h-4 inline mr-1" />
            Country
          </label>
          <select
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="input-field w-full"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
          <input
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="e.g. Lagos, London"
            className="input-field w-full"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          name="remote"
          checked={formData.remote}
          onChange={handleChange}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Open to remote work
      </label>

      {/* Job Type & Experience */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <Briefcase className="w-4 h-4 inline mr-1" />
            Job Type
          </label>
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

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          <Code className="w-4 h-4 inline mr-1" />
          Top Skills (up to 5) *
        </label>

        {/* Selected skills */}
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

        {/* Skill input */}
        {formData.topSkills.length < 5 && (
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
            placeholder="Type a skill and press Enter..."
            className="input-field w-full mb-2"
          />
        )}

        {/* Suggestions */}
        {formData.topSkills.length < 5 && (
          <div className="flex flex-wrap gap-1.5">
            {filteredSuggestions.slice(0, 8).map((skill) => (
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
        )}
      </div>

      {/* Salary (optional) */}
      {!compact && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Salary Expectation (optional)
          </label>
          <div className="flex items-center gap-2">
            <select name="currency" value={formData.currency} onChange={handleChange} className="input-field w-24">
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
            <input
              name="salaryMin"
              value={formData.salaryMin}
              onChange={handleChange}
              type="number"
              placeholder="Min"
              className="input-field flex-1"
            />
            <span className="text-slate-400">-</span>
            <input
              name="salaryMax"
              value={formData.salaryMax}
              onChange={handleChange}
              type="number"
              placeholder="Max"
              className="input-field flex-1"
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Save Job Profile
            <CheckCircle className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

export default OnboardingForm;
