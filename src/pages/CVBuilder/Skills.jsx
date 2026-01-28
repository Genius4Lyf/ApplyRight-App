import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Cpu, ArrowRight, ArrowLeft } from 'lucide-react';

const Skills = () => {
    // Safely destructure context
    const context = useOutletContext();
    const { cvData, handleNext, handleBack, saving } = context || {};

    if (!cvData) {
        return <div className="p-8 text-center text-slate-500">Loading skills...</div>;
    }

    // Parse skills from backend (expecting array of strings)
    const [skillsText, setSkillsText] = useState(
        cvData.skills ? cvData.skills.map(s => (typeof s === 'object' ? s.type || s.name : s)).join(', ') : ''
    );

    const handleChange = (e) => {
        setSkillsText(e.target.value);
    };

    const onSubmit = (e) => {
        e.preventDefault();
        // Convert string back to array of strings
        const skillsArray = skillsText
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        // No need to map to objects anymore

        handleNext({ skills: skillsArray });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Cpu className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Skills</h2>
                    <p className="text-slate-500">List your technical and soft skills.</p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Enter your skills (separated by commas)
                </label>
                <textarea
                    value={skillsText}
                    onChange={handleChange}
                    placeholder="e.g. JavaScript, React, Project Management, Public Speaking, Python"
                    className="w-full p-4 border border-slate-300 rounded-xl h-48 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all custom-scrollbar resize-none leading-relaxed"
                />
                <p className="mt-2 text-xs text-slate-500">
                    Tip: Add at least 5-10 skills relevant to your target role.
                </p>
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
                    {saving ? 'Saving...' : 'Next: Summary'} <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
};

export default Skills;
