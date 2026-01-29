import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, ArrowRight, ArrowLeft, Sparkles, RefreshCcw, Wand2 } from 'lucide-react';
import CVService from '../../services/cv.service';
import Modal from '../../components/Modal';
import { toast } from 'sonner';

const ProfessionalSummary = () => {
    // Safely destructure context
    const context = useOutletContext();
    const { cvData, handleNext, handleBack, saving } = context || {};

    // Fallback if context is somehow missing (shouldn't happen in valid layout)
    if (!cvData) {
        return <div className="p-8 text-center text-slate-500">Loading editor context...</div>;
    }

    const [summary, setSummary] = useState(cvData.professionalSummary || '');
    const [generating, setGenerating] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const hasAutoOpened = useRef(false);

    // Auto-prompt for AI Summary if empty
    useEffect(() => {
        // Only run if summary is empty/short and we haven't asked yet
        if (cvData && (!summary || summary.trim().length < 10) && !hasAutoOpened.current) {
            hasAutoOpened.current = true;
            // Small timeout to allow UI to settle/animate in
            setTimeout(() => {
                setShowAiModal(true);
            }, 500);
        }
    }, [cvData, summary]);

    const handleGenerateClick = () => {
        if (!cvData.targetJob?.title && !cvData.personalInfo?.fullName) {
            // Fallback minimal check, but we really want at least a job title
            toast.error("Please add a Target Job Title (Step 1) first.");
            return;
        }
        setShowAiModal(true);
    };

    const confirmGenerate = async () => {
        setGenerating(true);
        setShowAiModal(false); // Close modal while generating or keep open? User said "when user clicks... show modal...". 
        // Better to close modal and show loading state on the page, or keep modal with loader.
        // The existing UI has a loading state on the button. Let's close modal and show loading on button.

        try {
            // Construct enhanced context from previous steps
            const skillsStr = cvData.skills ? cvData.skills.map(s => (typeof s === 'object' ? s.type || s.name : s)).join(', ') : '';
            const historyStr = cvData.experience ? cvData.experience.map(exp => `${exp.title} at ${exp.company} (${exp.startDate}-${exp.isCurrent ? 'Present' : exp.endDate})`).join('; ') : '';

            const context = `
                Candidate Name: ${cvData.personalInfo?.fullName || 'Candidate'}
                Target Job Title: ${cvData.targetJob?.title || 'Professional'}
                Target Job Description: ${cvData.targetJob?.description || 'N/A'}
                
                Key Skills: ${skillsStr}
                
                Work History Summary: ${historyStr}
                
                Existing Summary Draft: ${summary}
            `.trim();

            const suggestions = await CVService.generateBullets(
                cvData.targetJob?.title || 'Professional',
                context,
                'summary', // 'summary' type tells AI to write a paragraph
                cvData.targetJob?.description
            );

            if (suggestions && suggestions.length > 0) {
                setSummary(suggestions[0]);
                toast.success("AI Summary Generated!");
            }
        } catch (error) {
            console.error("AI Gen Failed", error);
            toast.error("Failed to generate summary");
        } finally {
            setGenerating(false);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        handleNext({ professionalSummary: summary });
    };

    return (
        <>
            <form onSubmit={onSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Professional Summary</h2>
                        <p className="text-slate-500">Your 30-second elevator pitch. Make it count.</p>
                    </div>
                </div>

                <div className="relative">
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="e.g. Innovative Software Engineer with 5+ years of experience in..."
                        className="w-full p-4 border border-slate-300 rounded-xl h-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all custom-scrollbar resize-none leading-relaxed text-slate-700"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={handleGenerateClick}
                            disabled={generating}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md text-xs font-bold transition-all border border-indigo-200 shadow-sm"
                        >
                            {generating ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {generating ? 'Writing...' : 'AI Rewrite'}
                        </button>
                    </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg flex items-start gap-3">
                    <div className="p-1 bg-indigo-100 rounded text-indigo-600 mt-0.5"><Sparkles className="w-3 h-3" /></div>
                    <div className="text-xs text-indigo-800 leading-relaxed">
                        <strong>Tip:</strong> The AI uses your Target Job, Skills, and Work History to craft this summary.
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
                        {saving ? 'Saving...' : 'Review & Finish'} <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </form>

            {showAiModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white text-center">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 animate-in bounce-in duration-700">
                                <Sparkles className="w-6 h-6 text-yellow-300" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">We've got some ideas for your summary</h2>
                            <p className="text-indigo-100 text-sm">
                                Let AI craft your elevator pitch based on your experience.
                            </p>
                        </div>

                        {/* Body */}
                        <div className="p-8">
                            <p className="text-slate-600 mb-6 text-center leading-relaxed">
                                Generate an AI-personalised summary: the AI will analyse your <strong>work history</strong> and <strong>skills</strong> to provide the result.
                            </p>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
                                <p className="text-slate-500 text-sm">
                                    If you're unhappy with the AI's response, you can simply discard it and write your own.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <button
                                onClick={() => setShowAiModal(false)}
                                className="px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg font-medium transition-colors"
                            >
                                Not now
                            </button>
                            <button
                                onClick={confirmGenerate}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 transform transition-all hover:-translate-y-0.5"
                            >
                                <Wand2 className="w-4 h-4" /> Yes, generate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfessionalSummary;
