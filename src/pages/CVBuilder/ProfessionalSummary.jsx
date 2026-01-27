import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, ArrowRight, ArrowLeft, Sparkles, RefreshCcw } from 'lucide-react';
import CVService from '../../services/cv.service';
import { toast } from 'sonner';

const ProfessionalSummary = () => {
    const { cvData, handleNext, handleBack, saving } = useOutletContext();
    const [summary, setSummary] = useState(cvData.professionalSummary || '');
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!cvData.targetJob?.title && !cvData.personalInfo?.fullName) {
            toast.error("Please provide a Target Job Title (Step 1) or Name (Step 2) for AI context.");
            return;
        }

        setGenerating(true);
        try {
            // Construct context from previous steps
            const context = `
                Candidate Name: ${cvData.personalInfo?.fullName || 'Candidate'}
                Target Job Title: ${cvData.targetJob?.title || 'Professional'}
                Target Job Description: ${cvData.targetJob?.description || ''}
                Existing Summary Draft: ${summary}
            `;

            const suggestions = await CVService.generateBullets(
                cvData.targetJob?.title || 'Professional',
                context,
                'summary',
                cvData.targetJob?.description
            );

            if (suggestions && suggestions.length > 0) {
                setSummary(suggestions[0]); // Summary returns an array with one string usually
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
                <div className="absolute top-3 right-3 z-10">
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md text-xs font-bold transition-all border border-indigo-200 shadow-sm"
                    >
                        {generating ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {generating ? 'Writing...' : 'AI Rewrite'}
                    </button>
                </div>
                <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="e.g. Innovative Software Engineer with 5+ years of experience in..."
                    className="w-full p-4 border border-slate-300 rounded-xl h-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all custom-scrollbar resize-none leading-relaxed text-slate-700"
                />
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg flex items-start gap-3">
                <div className="p-1 bg-indigo-100 rounded text-indigo-600 mt-0.5"><Sparkles className="w-3 h-3" /></div>
                <div className="text-xs text-indigo-800 leading-relaxed">
                    <strong>Tip:</strong> If you entered a Job Description in Step 1, our AI will tailor this summary to include keywords from that specific job.
                </div>
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
                    {saving ? 'Saving...' : 'Next: Work History'} <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
};

export default ProfessionalSummary;
