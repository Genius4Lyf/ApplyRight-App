import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Target, ArrowRight, AlertCircle, X } from 'lucide-react';

const TargetJob = () => {
    // Safely destructure context
    const context = useOutletContext();
    const { cvData, handleNext, saving } = context || {};

    // Fallback if context is somehow missing
    if (!cvData) {
        return <div className="p-8 text-center text-slate-500">Loading...</div>;
    }

    const [formData, setFormData] = useState(cvData.targetJob || { title: '', description: '' });
    const [showModal, setShowModal] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const onSubmit = (e) => {
        e.preventDefault();

        // Check if target job title is empty
        if (!formData.title.trim()) {
            setShowModal(true);
            return;
        }

        handleNext({ targetJob: formData });
    };

    const handleSkipAndContinue = () => {
        setShowModal(false);
        handleNext({ targetJob: formData });
    };

    return (
        <>
            <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Target Job Analysis</h2>
                        <p className="text-slate-500">Tell us what you're applying for so our AI can tailor your resume.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Job Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Senior Frontend Engineer"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Job Description (Optional)</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Paste the job description here. Our AI will use this to suggest relevant skills and keywords for your summary and experience."
                            className="w-full p-3 border border-slate-300 rounded-lg h-48 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all custom-scrollbar resize-none"
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full md:w-auto btn-primary px-8 py-3 flex items-center justify-center gap-2"
                    >
                        {saving ? 'Saving...' : 'Next Step'} <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </form>

            {/* Confirmation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Add a Target Job Title?</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Adding a target job helps our AI tailor your CV specifically for that role. You'll get:
                                </p>
                                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                                    <li className="flex items-start gap-2">
                                        <span className="text-indigo-600 mt-0.5">✓</span>
                                        <span><strong>Keyword optimization</strong> matching the job description</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-indigo-600 mt-0.5">✓</span>
                                        <span><strong>AI-generated content</strong> tailored to your target role</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-indigo-600 mt-0.5">✓</span>
                                        <span><strong>Higher ATS score</strong> for better visibility</span>
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSkipAndContinue}
                                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Continue Anyway
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Add Target Job
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TargetJob;
