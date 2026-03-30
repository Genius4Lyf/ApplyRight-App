import React, { useState, useEffect } from 'react';
import { Target, MapPin, Briefcase, Code, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Country, City } from 'country-state-city';
import jobSearchService from '../../services/jobSearchService';
import CustomSelect from '../ui/CustomSelect';
import RoleCombobox from '../ui/RoleCombobox';

const POPULAR_SKILLS = [
  'JavaScript', 'Python', 'React', 'Project Management', 'Data Analysis',
  'Marketing', 'Sales', 'Graphic Design', 'Financial Modeling', 'B2B Sales',
  'AWS', 'SEO', 'Public Relations', 'Copywriting', 'Accounting',
  'Customer Service', 'Machine Learning', 'Operations', 'HTML/CSS', 'Git'
];

const OnboardingForm = ({ onComplete, compact = false, initialData = null }) => {
  const [formData, setFormData] = useState(() => {
    // Pre-fill from existing job profile if available
    if (initialData) {
      return {
        desiredTitle: initialData.desiredTitle || '',
        country: initialData.preferredLocation?.country || '',
        city: initialData.preferredLocation?.city || '',
        remote: initialData.preferredLocation?.remote || false,
        jobType: initialData.jobType || 'fulltime',
        experienceLevel: initialData.experienceLevel || 'entry',
        topSkills: initialData.topSkills || [],
        salaryMin: initialData.salaryExpectation?.min || '',
        salaryMax: initialData.salaryExpectation?.max || '',
        currency: initialData.salaryExpectation?.currency || 'NGN',
      };
    }
    return {
      desiredTitle: '',
      country: '',
      city: '',
      remote: false,
      jobType: 'fulltime',
      experienceLevel: 'entry',
      topSkills: [],
      salaryMin: '',
      salaryMax: '',
      currency: 'NGN',
    };
  });
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    // Auto-detect country via IP only if no country is set
    if (!formData.country) {
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data.country) {
            setFormData(prev => prev.country ? prev : { ...prev, country: data.country });
          }
        })
        .catch(console.error);
    }
  }, []);

  const prevCountryRef = React.useRef(formData.country);
  useEffect(() => {
    // Load cities when country changes
    if (formData.country) {
      const cityData = City.getCitiesOfCountry(formData.country);
      const cityOptions = cityData.map(c => ({ value: c.name, label: c.name }));
      setCities(cityOptions);
      // Only reset city if user actively changed the country (not on initial mount with pre-filled data)
      if (prevCountryRef.current && prevCountryRef.current !== formData.country) {
        setFormData(prev => ({ ...prev, city: '' }));
      }
      prevCountryRef.current = formData.country;
    } else {
      setCities([]);
    }
  }, [formData.country]);

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
        <RoleCombobox
          value={formData.desiredTitle}
          onChange={handleChange}
          placeholder="Type a role or select from the list..."
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-3 relative z-40">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <MapPin className="w-4 h-4 inline mr-1" />
            Country
          </label>
          <CustomSelect
            name="country"
            value={formData.country}
            onChange={handleChange}
            options={Country.getAllCountries().map(c => ({ value: c.isoCode, label: c.name }))}
            placeholder="Select Country"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
          <CustomSelect
            name="city"
            value={formData.city}
            onChange={handleChange}
            options={cities}
            placeholder={cities.length > 0 ? "Select City" : "Select Country first"}
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
      <div className="grid grid-cols-2 gap-3 relative z-30">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <Briefcase className="w-4 h-4 inline mr-1" />
            Job Type
          </label>
          <CustomSelect
            name="jobType"
            value={formData.jobType}
            onChange={handleChange}
            options={[
              { value: 'fulltime', label: 'Full-time' },
              { value: 'parttime', label: 'Part-time' },
              { value: 'contract', label: 'Contract' },
              { value: 'internship', label: 'Internship' }
            ]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Experience Level</label>
          <CustomSelect
            name="experienceLevel"
            value={formData.experienceLevel}
            onChange={handleChange}
            options={[
              { value: 'entry', label: 'Entry Level' },
              { value: 'mid', label: 'Mid Level' },
              { value: 'senior', label: 'Senior Level' }
            ]}
          />
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
