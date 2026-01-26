import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { User, Award, BookOpen, Settings, Save, CheckCircle, Crown, CreditCard, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

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
        autoGenerateAnalysis: false
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/users/profile');
            const userData = res.data || {};
            setUser(userData);

            // Safe access to nested properties
            const education = userData.education || {};
            const settings = userData.settings || {};

            setFormData({
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
                autoGenerateAnalysis: settings.autoGenerateAnalysis || false
            });
        } catch (error) {
            console.error('Failed to load profile', error);
            toast.error("Failed to load profile data");
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
        } catch (error) {
            // If URL parsing fails, return as-is
            return url;
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Clean LinkedIn URL on change
        if (name === 'linkedinUrl') {
            const cleanedUrl = cleanLinkedInUrl(value);
            setFormData({ ...formData, [name]: cleanedUrl });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
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
                    discipline: formData.discipline
                },
                settings: {
                    autoGenerateAnalysis: formData.autoGenerateAnalysis
                }
            };

            const res = await api.put('/users/profile', updatePayload);
            setUser(res.data);
            // Update local storage to keep session in sync
            localStorage.setItem('user', JSON.stringify(res.data));

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

    const handleUpgrade = async () => {
        if (confirm("Confirm upgrade to ApplyRight Pro? (Mock Payment)")) {
            try {
                const res = await api.put('/users/profile', { plan: 'paid' });
                setUser(res.data);
                localStorage.setItem('user', JSON.stringify(res.data));
                toast.success("Welcome to ApplyRight Pro!");
            } catch (error) {
                console.error(error);
            }
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Navbar />
            <div className="text-center mt-12">
                <h2 className="text-xl font-bold text-slate-800">Failed to load profile</h2>
                <p className="text-slate-500 mb-6">We couldn't retrieve your user data.</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Try Again</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8 flex items-center gap-3">
                    <User className="w-8 h-8 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Your Profile</h1>
                        <p className="text-slate-500">Manage your personal details and app settings.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Settings Form */}
                    <div className="md:col-span-2 space-y-6">
                        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-slate-400" />
                                General Settings
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Other Name</label>
                                    <input
                                        type="text"
                                        name="otherName"
                                        value={formData.otherName}
                                        onChange={handleChange}
                                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Current Job Title</label>
                                <input
                                    type="text"
                                    name="currentJobTitle"
                                    value={formData.currentJobTitle}
                                    onChange={handleChange}
                                    placeholder="e.g. Field Operator | Full Stack Developer"
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-slate-400 mt-1">Displayed prominently on your CV header.</p>
                            </div>

                            <div className="border-t border-slate-100 my-6 pt-6">
                                <h3 className="text-md font-bold text-slate-900 mb-4">Contact Information</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="e.g. 09017134882"
                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Portfolio URL</label>
                                        <input
                                            type="url"
                                            name="portfolioUrl"
                                            value={formData.portfolioUrl}
                                            onChange={handleChange}
                                            placeholder="https://yourportfolio.com"
                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">LinkedIn Profile</label>
                                        <input
                                            type="url"
                                            name="linkedinUrl"
                                            value={formData.linkedinUrl}
                                            onChange={handleChange}
                                            placeholder="https://linkedin.com/in/yourprofile"
                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Career Stage</label>
                                <select
                                    name="currentStatus"
                                    value={formData.currentStatus}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="student">Student / New Grad</option>
                                    <option value="professional">Working Professional</option>
                                    <option value="career_switcher">Career Switcher</option>
                                </select>
                                <p className="text-xs text-slate-400 mt-1">This helps the AI adjust the tone of your CV.</p>
                            </div>

                            <div className="border-t border-slate-100 my-6 pt-6">
                                <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                    Automation Preferences
                                </h3>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <input
                                        type="checkbox"
                                        id="autoGenerate"
                                        name="autoGenerateAnalysis"
                                        checked={formData.autoGenerateAnalysis}
                                        onChange={(e) => setFormData({ ...formData, autoGenerateAnalysis: e.target.checked })}
                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                    />
                                    <label htmlFor="autoGenerate" className="cursor-pointer flex-1">
                                        <div className="text-sm font-semibold text-slate-900">Auto-Run Match Analysis</div>
                                        <div className="text-xs text-slate-500">Automatically analyze compatibility when job and resume are uploaded.</div>
                                    </label>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 my-6 pt-6">
                                <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-indigo-500" />
                                    Education Context
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">University</label>
                                        <input
                                            type="text"
                                            name="university"
                                            value={formData.university}
                                            onChange={handleChange}
                                            placeholder="e.g. Stanford University"
                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Discipline</label>
                                        <input
                                            type="text"
                                            name="discipline"
                                            value={formData.discipline}
                                            onChange={handleChange}
                                            placeholder="e.g. Computer Science"
                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Graduation Year</label>
                                        <input
                                            type="number"
                                            name="graduationYear"
                                            value={formData.graduationYear}
                                            onChange={handleChange}
                                            placeholder="YYYY"
                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <p className="text-[10px] text-amber-600 mt-1 font-medium">Critical for "Context-Aware" AI.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                {successMsg && (
                                    <span className="text-emerald-600 text-sm font-medium flex items-center gap-1 animate-in fade-in">
                                        <CheckCircle className="w-4 h-4" /> {successMsg}
                                    </span>
                                )}
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary ml-auto px-6 py-2 flex items-center"
                                >
                                    {saving ? 'Saving...' : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" /> Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Plan Info */}
                    <div className="space-y-6">
                        <div className={`rounded-xl shadow-sm border p-6 relative overflow-hidden transition-colors duration-200
                            ${user?.plan === 'paid'
                                ? 'bg-indigo-900 border-indigo-700 text-white'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'}
                        `}>
                            {user?.plan === 'paid' && (
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Crown className="w-24 h-24" />
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-4">
                                {user?.plan === 'paid' ? <Crown className="w-6 h-6 text-yellow-400" /> : <User className="w-6 h-6 text-slate-400" />}
                                <h3 className="text-lg font-bold">Current Plan</h3>
                            </div>

                            <div className="mb-6">
                                <p className={`text-3xl font-bold ${user?.plan === 'paid' ? 'text-white' : 'text-slate-900'}`}>
                                    {user?.plan === 'paid' ? 'Pro Plan' : 'Free Plan'}
                                </p>
                                <p className={`text-sm mt-1 ${user?.plan === 'paid' ? 'text-indigo-200' : 'text-slate-500'}`}>
                                    {user?.plan === 'paid' ? 'Unlimited access to all features' : 'Basic access. Upgrade for more.'}
                                </p>
                            </div>

                            {user?.plan !== 'paid' && (
                                <button
                                    onClick={handleUpgrade}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center"
                                >
                                    <CreditCard className="w-4 h-4 mr-2" /> Upgrade to Pro
                                </button>
                            )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Award className="w-4 h-4 text-indigo-500" />
                                Usage Stats
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">Applications Created</span>
                                        <span className="font-medium text-slate-900">2 / {user?.plan === 'paid' ? '∞' : '5'}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
