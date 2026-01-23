import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { User, Award, BookOpen, Settings, Save, CheckCircle, Crown, CreditCard } from 'lucide-react';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        currentStatus: 'student',
        graduationYear: '',
        university: '',
        discipline: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/auth/me');
            setUser(res.data);
            setFormData({
                firstName: res.data.firstName || '',
                lastName: res.data.lastName || '',
                currentStatus: res.data.currentStatus || 'student',
                graduationYear: res.data.education?.graduationYear || '',
                university: res.data.education?.university || '',
                discipline: res.data.education?.discipline || ''
            });
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updatePayload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                currentStatus: formData.currentStatus,
                education: {
                    graduationYear: formData.graduationYear,
                    university: formData.university,
                    discipline: formData.discipline
                }
            };

            const res = await api.put('/auth/profile', updatePayload);
            setUser(res.data);
            // Update local storage to keep session in sync
            localStorage.setItem('user', JSON.stringify(res.data));

            setSuccessMsg('Profile updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error('Failed to update profile', error);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleUpgrade = async () => {
        if (confirm("Confirm upgrade to ApplyRight Pro? (Mock Payment)")) {
            try {
                const res = await api.put('/auth/profile', { plan: 'paid' });
                setUser(res.data);
                localStorage.setItem('user', JSON.stringify(res.data));
                alert("Welcome to ApplyRight Pro!");
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
