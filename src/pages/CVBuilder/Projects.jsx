import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PenTool, ArrowRight, ArrowLeft, Plus, Trash2, Sparkles, RefreshCcw, Link as LinkIcon } from 'lucide-react';
import CVService from '../../services/cv.service';
import { toast } from 'sonner';
import ProjectsTutorial from './ProjectsTutorial';

const Projects = () => {
    // Safely destructure context
    const context = useOutletContext();
    const { cvData, handleNext, handleBack, saving, updateCvData, user } = context || {};

    // Fallback if context is somehow missing
    if (!cvData) {
        return <div className="p-8 text-center text-slate-500">Loading projects...</div>;
    }
    const [projects, setProjects] = useState(cvData.projects || []);
    const [generatingIndex, setGeneratingIndex] = useState(null);
    const [optimizationCandidate, setOptimizationCandidate] = useState(null); // { index, text }
    const [showTutorial, setShowTutorial] = useState(false);

    // Auto-show tutorial based on user settings
    // Auto-show tutorial based on user settings
    useEffect(() => {
        if (user?.settings?.showOnboardingTutorials !== false) {
            const timer = setTimeout(() => {
                setShowTutorial(true);
            }, 800); // 0.8s delay for better UX
            return () => clearTimeout(timer);
        }
    }, [user]);

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

    // Auto-sync to parent context for persistence
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (updateCvData) {
                updateCvData({ projects: projects });
            }
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [projects, updateCvData]);

    const handleGenerateBullets = async (index, customInput = null) => {
        const proj = projects[index];
        if (!proj.title) {
            toast.error("Please enter a project title first.");
            return;
        }

        // Context determination: Use customInput (from paste prompt) OR current text (manual rewrite trigger)
        const textToRewrite = customInput || proj.description;
        const lineCount = textToRewrite ? textToRewrite.split('\n').filter(line => line.trim().length > 5).length : 0;

        // Validation for manual trigger (skip if it comes from the Paste Prompt "customInput")
        if (!customInput && lineCount < 3) {
            toast.error("Please write at least 3 bullet points before rewriting.");
            return;
        }

        setGeneratingIndex(index);
        try {
            // Include custom text if optimized, or just link context
            const context = `Rewrite/Improve these bullet points: "${textToRewrite}". Project Link: ${proj.link}`;

            const suggestions = await CVService.generateBullets(
                proj.title,
                context,
                'project',
                cvData.targetJob?.description
            );

            if (suggestions && suggestions.length > 0) {
                const formattedBullets = suggestions.map(s => `• ${s}`).join('\n');
                handleChange(index, 'description', formattedBullets);
                toast.success("Bullets generated!");
                setOptimizationCandidate(null); // Clear prompt
            }
        } catch (error) {
            console.error("Failed to gen bullets", error);
            toast.error("Failed to generate project details");
        } finally {
            setGeneratingIndex(null);
        }
    };

    const handlePaste = (e, index) => {
        const pastedText = e.clipboardData.getData('text');
        if (pastedText && pastedText.length > 30) {
            setOptimizationCandidate({ index, text: pastedText });
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;
            const newValue = value.substring(0, start) + '\n• ' + value.substring(end);
            handleChange(index, 'description', newValue);
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 3;
            }, 0);
        }
    };

    const handleFocus = (index) => {
        const proj = projects[index];
        if (!proj.description || proj.description.trim() === '') {
            handleChange(index, 'description', '• ');
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        handleNext({ projects: projects });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
                        <p className="text-slate-500">Showcase your practical work and initiatives.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowTutorial(true)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden md:inline">How AI Works</span>
                </button>
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
                            {/* Optimization Prompt */}
                            {optimizationCandidate?.index === index && (
                                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-emerald-900">Optimize Project Details?</h4>
                                        <p className="text-xs text-emerald-700 mt-1">
                                            Our AI can structure your rough notes into impressive professional achievements.
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateBullets(index, optimizationCandidate.text)}
                                                disabled={generatingIndex === index}
                                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                                            >
                                                {generatingIndex === index ? 'Optimizing...' : 'Yes, Optimize It'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setOptimizationCandidate(null)}
                                                className="text-xs text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-md font-medium transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Description / Bullets</label>
                                <button
                                    type="button"
                                    onClick={() => handleGenerateBullets(index)}
                                    disabled={generatingIndex === index || !proj.title}
                                    className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 disabled:opacity-50"
                                >
                                    {generatingIndex === index ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    {generatingIndex === index ? 'Rewriting...' : 'AI Rewrite'}
                                </button>
                            </div>
                            <textarea
                                value={proj.description}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (val.length === 1 && !val.startsWith('•')) {
                                        val = '• ' + val;
                                        setTimeout(() => {
                                            if (e.target) e.target.selectionStart = e.target.selectionEnd = val.length;
                                        }, 0);
                                    }
                                    handleChange(index, 'description', val);
                                }}
                                onPaste={(e) => handlePaste(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onFocus={() => handleFocus(index)}
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

            {/* Tutorial Modal */}
            <ProjectsTutorial
                isOpen={showTutorial}
                onClose={() => setShowTutorial(false)}
                user={user}
            />
        </form>
    );
};

export default Projects;
