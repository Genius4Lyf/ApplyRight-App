import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PenTool, ArrowRight, ArrowLeft, Plus, Trash2, Sparkles, RefreshCcw, Link as LinkIcon } from 'lucide-react';
import CVService from '../../services/cv.service';
import { toast } from 'sonner';

const Projects = () => {
    // Safely destructure context
    const context = useOutletContext();
    const { cvData, handleNext, handleBack, saving } = context || {};

    // Fallback if context is somehow missing
    if (!cvData) {
        return <div className="p-8 text-center text-slate-500">Loading projects...</div>;
    }
    const [projects, setProjects] = useState(cvData.projects || []);
    const [generatingIndex, setGeneratingIndex] = useState(null);

    const addProject = () => {
        setProjects([
            ...projects,
            { title: '', link: '', description: '' }
        ]);
    };

    const removeProject = (index) => {
        const newProjects = [...projects];
        newProjects.splice(index, 1);
        setProjects(newProjects);
    };

    const handleChange = (index, field, value) => {
        const newProjects = [...projects];
        newProjects[index] = { ...newProjects[index], [field]: value };
        setProjects(newProjects);
    };

    const handleGenerateBullets = async (index) => {
        const proj = projects[index];
        if (!proj.title) {
            toast.error("Please enter a project title first.");
            return;
        }

        setGeneratingIndex(index);
        try {
            const suggestions = await CVService.generateBullets(
                proj.title,
                `Project Link: ${proj.link}`,
                'project',
                cvData.targetJob?.description
            );

            if (suggestions && suggestions.length > 0) {
                const formattedBullets = suggestions.map(s => `• ${s}`).join('\n');
                handleChange(index, 'description', formattedBullets);
                toast.success("Bullets generated!");
            }
        } catch (error) {
            console.error("Failed to gen bullets", error);
            toast.error("Failed to generate project details");
        } finally {
            setGeneratingIndex(null);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        handleNext({ projects: projects });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <PenTool className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
                    <p className="text-slate-500">Showcase your practical work and initiatives.</p>
                </div>
            </div>

            {projects.length === 0 && (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500 mb-4">No projects added yet.</p>
                    <button
                        type="button"
                        onClick={addProject}
                        className="btn-secondary flex items-center gap-2 mx-auto"
                    >
                        <Plus className="w-4 h-4" /> Add First Project
                    </button>
                    <div className="mt-4">
                        <button
                            type="submit"
                            className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-4"
                        >
                            Skip this section
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {projects.map((proj, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group">
                        <button
                            type="button"
                            onClick={() => removeProject(index)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors p-2"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Title</label>
                                <input
                                    type="text"
                                    value={proj.title}
                                    onChange={(e) => handleChange(index, 'title', e.target.value)}
                                    placeholder="e.g. Portfolio Website"
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link (Optional)</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input
                                        type="url"
                                        value={proj.link}
                                        onChange={(e) => handleChange(index, 'link', e.target.value)}
                                        placeholder="https://github.com/..."
                                        className="w-full pl-9 p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Description / Bullets</label>
                                <button
                                    type="button"
                                    onClick={() => handleGenerateBullets(index)}
                                    disabled={generatingIndex === index || !proj.title}
                                    className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 disabled:opacity-50"
                                >
                                    {generatingIndex === index ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    {generatingIndex === index ? 'Generating...' : 'AI Suggestions'}
                                </button>
                            </div>
                            <textarea
                                value={proj.description}
                                onChange={(e) => handleChange(index, 'description', e.target.value)}
                                placeholder="• Developed a full-stack app using..."
                                className="w-full p-3 border border-slate-300 rounded-lg h-32 focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed text-sm"
                            />
                        </div>
                    </div>
                ))}

                {projects.length > 0 && (
                    <button
                        type="button"
                        onClick={addProject}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Another Project
                    </button>
                )}
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
                    {saving ? 'Saving...' : 'Next: Education'} <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
};

export default Projects;
