import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowRight, CheckCircle, Sparkles, User, GraduationCap } from 'lucide-react';
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
        phone: '',
        linkedinUrl: '',
        portfolioUrl: '',
        currentStatus: 'student',
        university: '',
        discipline: '',
        graduationYear: ''
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
                phone: formData.phone,
                linkedinUrl: formData.linkedinUrl,
                portfolioUrl: formData.portfolioUrl,
                currentStatus: formData.currentStatus,
                education: {
                    university: formData.university,
                    discipline: formData.discipline,
                    graduationYear: formData.graduationYear
                },
                onboardingCompleted: true
            };

            const res = await api.put('/users/profile', payload);
            localStorage.setItem('user', JSON.stringify(res.data));
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
        navigate('/dashboard');
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
                        {['Basic Info', 'Education'].map((label, index) => (
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
                            style={{ width: `${(step / 2) * 100}%` }}
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
                                backgroundPosition: 'center'
                            }}
                        />

                        <div className="relative z-10 p-8 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white mb-4 shadow-sm text-primary">
                                {step === 1 && <User className="w-6 h-6" />}
                                {step === 2 && <GraduationCap className="w-6 h-6" />}
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">
                                {step === 1 && "Let's get to know you"}
                                {step === 2 && "Your Academic Journey"}
                            </h2>
                            <p className="text-slate-500 mt-2">
                                {step === 1 && "Tell us a bit about yourself to get started."}
                                {step === 2 && "Help us tailor resources to your field of study."}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {step === 1 && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Other Name (Optional)</label>
                                    <input
                                        name="otherName"
                                        value={formData.otherName}
                                        onChange={handleChange}
                                        className="input-field w-full"
                                        placeholder="Middle Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                        <input
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="input-field w-full"
                                            placeholder="+1 (555) 000-0000"
                                            required
                                        />
                                    </div>
                                    {/* Optional fields removed as per request to handle in Profile/CV Builder */}
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
                                                { value: 'other', label: 'Other' }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 animate-fadeIn">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">University / Institution</label>
                                    <input
                                        name="university"
                                        value={formData.university}
                                        onChange={handleChange}
                                        className="input-field w-full"
                                        placeholder="e.g. Stanford University"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Discipline / Major</label>
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Graduation Year (Expected)</label>
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

                            {step < 2 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="btn-primary px-6 py-2 flex items-center"
                                >
                                    Next <ArrowRight className="ml-2 w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary"
                                >
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
