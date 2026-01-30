import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { User, ArrowRight, ArrowLeft, Plus, X, Globe, Linkedin, Flag, MapPin } from 'lucide-react';

const Heading = () => {
    // Safely destructure context
    const context = useOutletContext();
    const { cvData, handleNext, handleBack, saving, user } = context || {};

    // Fallback if context is somehow missing
    if (!cvData) {
        return <div className="p-8 text-center text-slate-500">Loading editor context...</div>;
    }

    // Initialize form data with draft data OR auto-fill from user profile
    const [formData, setFormData] = useState(() => {
        const initial = cvData.personalInfo || {};

        // Auto-fill logic if fields are empty
        if (!initial.fullName && user?.firstName) {
            // Combine First Name + Other Name + Last Name
            const nameParts = [user.firstName, user.otherName, user.lastName].filter(Boolean);
            initial.fullName = nameParts.join(' ');
        }
        if (!initial.email && user?.email) {
            initial.email = user.email;
        }
        if (!initial.phone && user?.phone) {
            initial.phone = user.phone;
        }
        // Auto-fill optional fields if they exist in user profile (assuming user object has these fields)
        if (!initial.linkedin && user?.linkedinUrl) {
            initial.linkedin = user.linkedinUrl;
        }
        if (!initial.website && user?.portfolioUrl) {
            initial.website = user.portfolioUrl;
        }
        return initial;
    });

    // Track visibility of optional fields
    const [visibleFields, setVisibleFields] = useState({
        linkedin: !!formData.linkedin,
        website: !!formData.website,
        nationality: !!formData.nationality,
        address: !!formData.address
    });

    // Auto-fill effect to handle cases where user data loads after initial render
    useEffect(() => {
        if (user) {
            setFormData(prev => {
                const newData = { ...prev };
                let hasChanges = false;

                if (!newData.fullName && user.firstName) {
                    const nameParts = [user.firstName, user.otherName, user.lastName].filter(Boolean);
                    newData.fullName = nameParts.join(' ');
                    hasChanges = true;
                }
                if (!newData.email && user.email) {
                    newData.email = user.email;
                    hasChanges = true;
                }
                if (!newData.phone && user.phone) {
                    newData.phone = user.phone;
                    hasChanges = true;
                }
                if (!newData.linkedin && user.linkedinUrl) {
                    newData.linkedin = user.linkedinUrl;
                    hasChanges = true;
                }
                if (!newData.website && user.portfolioUrl) {
                    newData.website = user.portfolioUrl;
                    hasChanges = true;
                }

                // Only update visibility if we added new optional fields
                if (hasChanges) {
                    setVisibleFields(prevVis => ({
                        ...prevVis,
                        linkedin: !!newData.linkedin,
                        website: !!newData.website
                    }));
                }

                return hasChanges ? newData : prev;
            });
        }
    }, [user]);

    const [showExample, setShowExample] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleField = (field) => {
        setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        // Also update title if not set
        const titleUpdate = !cvData.title || cvData.title === 'Untitled CV'
            ? { title: `${formData.fullName}'s CV` }
            : {};

        handleNext({ personalInfo: formData, ...titleUpdate });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <User className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Contact Information</h2>
                        <p className="text-slate-500">Your professional header. Keep it accurate and simple.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowExample(!showExample)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                    {showExample ? 'Hide Example' : 'Best Practice Example'}
                </button>
            </div>

            {showExample && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 animate-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Best Practice Example</h4>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900">Alexander James</h3>
                        <div className="text-sm text-slate-600 mt-1 flex flex-wrap justify-center gap-y-1 gap-x-3">
                            <span>London, UK</span>
                            <span className="text-slate-300">|</span>
                            <span>alex.james@email.com</span>
                            <span className="text-slate-300">|</span>
                            <span>+44 7123 456 789</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-indigo-600">linkedin.com/in/alexjames</span>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500 bg-white p-3 rounded border border-slate-100 flex gap-2">
                        <div className="min-w-[4px] bg-emerald-500 rounded-full"></div>
                        <p><strong>Why this works:</strong> It's clean, minimal, and only includes contact info relevant to recruiters (Location, Email, Phone, LinkedIn). No full address or unnecessary labels.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName || ''}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Alexander James"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email (Professional)</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        required
                        placeholder="e.g. alex.james@gmail.com"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        placeholder="e.g. +1 (555) 123-4567"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>


            </div>

            {/* Optional Fields Section */}
            <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Add additional information to your CV (optional)</h3>
                    <div className="relative group cursor-help">
                        <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">i</div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Add these only if relevant to the job application.
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {!visibleFields.address && (
                        <button type="button" onClick={() => toggleField('address')} className="btn-chip">
                            Location <Plus className="w-3 h-3 ml-1" />
                        </button>
                    )}
                    {!visibleFields.linkedin && (
                        <button type="button" onClick={() => toggleField('linkedin')} className="btn-chip">
                            LinkedIn <Plus className="w-3 h-3 ml-1" />
                        </button>
                    )}
                    {!visibleFields.website && (
                        <button type="button" onClick={() => toggleField('website')} className="btn-chip">
                            Website <Plus className="w-3 h-3 ml-1" />
                        </button>
                    )}

                    {!visibleFields.nationality && (
                        <button type="button" onClick={() => toggleField('nationality')} className="btn-chip">
                            Nationality <Plus className="w-3 h-3 ml-1" />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                    {visibleFields.address && (
                        <div className="relative group">
                            <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">Location (City, Country)</label>
                                <button type="button" onClick={() => toggleField('address')} className="text-slate-400 hover:text-rose-500"><X className="w-3 h-3" /></button>
                            </div>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address || ''}
                                    onChange={handleChange}
                                    placeholder="e.g. London, UK"
                                    className="w-full pl-9 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {visibleFields.linkedin && (
                        <div className="relative group">
                            <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">LinkedIn URL</label>
                                <button type="button" onClick={() => toggleField('linkedin')} className="text-slate-400 hover:text-rose-500"><X className="w-3 h-3" /></button>
                            </div>
                            <div className="relative">
                                <Linkedin className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                                <input
                                    type="url"
                                    name="linkedin"
                                    value={formData.linkedin || ''}
                                    onChange={handleChange}
                                    placeholder="linkedin.com/in/profile"
                                    className="w-full pl-9 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {visibleFields.website && (
                        <div className="relative group">
                            <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">Website / Portfolio</label>
                                <button type="button" onClick={() => toggleField('website')} className="text-slate-400 hover:text-rose-500"><X className="w-3 h-3" /></button>
                            </div>
                            <div className="relative">
                                <Globe className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website || ''}
                                    onChange={handleChange}
                                    placeholder="your-portfolio.com"
                                    className="w-full pl-9 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    )}



                    {visibleFields.nationality && (
                        <div className="relative group">
                            <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">Nationality</label>
                                <button type="button" onClick={() => toggleField('nationality')} className="text-slate-400 hover:text-rose-500"><X className="w-3 h-3" /></button>
                            </div>
                            <div className="relative">
                                <Flag className="absolute left-3 top-3 w-4 h-4 text-indigo-500" />
                                <input
                                    type="text"
                                    name="nationality"
                                    value={formData.nationality || ''}
                                    onChange={handleChange}
                                    placeholder="e.g. British"
                                    className="w-full pl-9 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col-reverse md:flex-row justify-between gap-3 md:gap-0">
                <button
                    type="button"
                    onClick={handleBack}
                    className="w-full md:w-auto px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium flex items-center justify-center md:justify-start gap-2 transition-colors border md:border-transparent border-slate-200"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2"
                >
                    {saving ? 'Saving...' : 'Next: Work History'} <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <style>{`
                .btn-chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.5rem 1rem;
                    border: 1px solid #cbd5e1;
                    border-radius: 9999px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #475569;
                    background-color: white;
                    transition: all 0.2s;
                }
                .btn-chip:hover {
                    border-color: #6366f1;
                    color: #4f46e5;
                    background-color: #eef2ff;
                }
            `}</style>
        </form>
    );
};

export default Heading;
