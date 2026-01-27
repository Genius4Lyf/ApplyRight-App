import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Target, ArrowRight } from 'lucide-react';

const TargetJob = () => {
    const { cvData, handleNext, saving } = useOutletContext();
    const [formData, setFormData] = useState(cvData.targetJob || { title: '', description: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        handleNext({ targetJob: formData });
    };

    return (
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
                    className="btn-primary px-8 py-3 flex items-center gap-2"
                >
                    {saving ? 'Saving...' : 'Next Step'} <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
};

export default TargetJob;
