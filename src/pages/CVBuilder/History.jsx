import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Briefcase, ArrowRight, ArrowLeft, Plus, Trash2, Sparkles, RefreshCcw } from 'lucide-react';
import CVService from '../../services/cv.service';
import { toast } from 'sonner';

const History = () => {
    // Safely destructure context
    const context = useOutletContext();
    const { cvData, handleNext, handleBack, saving } = context || {};

    // Fallback if context is somehow missing
    if (!cvData) {
        return <div className="p-8 text-center text-slate-500">Loading history...</div>;
    }
    const [history, setHistory] = useState(cvData.experience || []);
    const [generatingIndex, setGeneratingIndex] = useState(null);

    const addRole = () => {
        setHistory([
            ...history,
            { title: '', company: '', startDate: '', endDate: '', isCurrent: false, description: '' }
        ]);
    };

    const removeRole = (index) => {
        const newHistory = [...history];
        newHistory.splice(index, 1);
        setHistory(newHistory);
    };

    const handleChange = (index, field, value) => {
        const newHistory = [...history];
        newHistory[index] = { ...newHistory[index], [field]: value };
        setHistory(newHistory);
    };

    const handleGenerateBullets = async (index) => {
        const role = history[index];
        if (!role.title) {
            toast.error("Please enter a job title first.");
            return;
        }

        setGeneratingIndex(index);
        try {
            const suggestions = await CVService.generateBullets(
                role.title,
                role.company ? `Company: ${role.company}` : '',
                'experience',
                cvData.targetJob?.description
            );

            if (suggestions && suggestions.length > 0) {
                const formattedBullets = suggestions.map(s => `• ${s}`).join('\n');
                handleChange(index, 'description', formattedBullets);
                toast.success("Bullets generated!");
            }
        } catch (error) {
            console.error("Failed to gen bullets", error);
            toast.error("Failed to generate bullet points");
        } finally {
            setGeneratingIndex(null);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        handleNext({ experience: history });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Briefcase className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Work History</h2>
                    <p className="text-slate-500">Your experience tells your professional story.</p>
                </div>
            </div>

            {history.length === 0 && (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500 mb-4">No work history added yet.</p>
                    <button
                        type="button"
                        onClick={addRole}
                        className="btn-secondary flex items-center gap-2 mx-auto"
                    >
                        <Plus className="w-4 h-4" /> Add First Role
                    </button>
                </div>
            )}

            <div className="space-y-8">
                {history.map((role, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group">
                        <button
                            type="button"
                            onClick={() => removeRole(index)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors p-2"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Title</label>
                                <input
                                    type="text"
                                    value={role.title}
                                    onChange={(e) => handleChange(index, 'title', e.target.value)}
                                    placeholder="e.g. Senior Product Manager"
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company</label>
                                <input
                                    type="text"
                                    value={role.company}
                                    onChange={(e) => handleChange(index, 'company', e.target.value)}
                                    placeholder="e.g. Acme Corp"
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                <input
                                    type="text"
                                    value={role.startDate}
                                    onChange={(e) => handleChange(index, 'startDate', e.target.value)}
                                    placeholder="e.g. Jan 2020"
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={role.isCurrent ? 'Present' : role.endDate}
                                        onChange={(e) => handleChange(index, 'endDate', e.target.value)}
                                        disabled={role.isCurrent}
                                        placeholder={role.isCurrent ? "Present" : "e.g. Dec 2023"}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                                    />
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={role.isCurrent || false}
                                            onChange={(e) => handleChange(index, 'isCurrent', e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-xs text-slate-600">Current</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Description / Bullets</label>
                                <button
                                    type="button"
                                    onClick={() => handleGenerateBullets(index)}
                                    disabled={generatingIndex === index || !role.title}
                                    className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 disabled:opacity-50"
                                >
                                    {generatingIndex === index ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    {generatingIndex === index ? 'Generating...' : 'AI Suggestions'}
                                </button>
                            </div>
                            <textarea
                                value={role.description}
                                onChange={(e) => handleChange(index, 'description', e.target.value)}
                                placeholder="• Achieved X by doing Y..."
                                className="w-full p-3 border border-slate-300 rounded-lg h-32 focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed text-sm"
                            />
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addRole}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Another Position
                </button>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-between">
                <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-8 py-3 flex items-center gap-2"
                >
                    {saving ? 'Saving...' : 'Next: Projects'} <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
};

export default History;
