import React from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const Finalize = () => {
    const { cvData, handleBack, saving } = useOutletContext();
    const { id } = useParams();
    const navigate = useNavigate();

    const handlePreview = () => {
        if (!id || id === 'new') {
            toast.error("Please add some data to create a draft first.");
            return;
        }
        // Navigate to ResumeReview page with the draft ID
        navigate(`/resume/${id}`);
    };

    const isComplete = cvData.personalInfo?.fullName && cvData.experience?.length > 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Final Review</h2>
                    <p className="text-slate-500">You've added all the essentials. Ready to visualize?</p>
                </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Summary of your inputs:</h3>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.personalInfo?.fullName ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                            {cvData.personalInfo?.fullName ? <CheckCircle className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                        </div>
                        <span className={cvData.personalInfo?.fullName ? 'text-slate-700' : 'text-slate-400'}>
                            Heading & Contact Info
                        </span>
                    </li>
                    <li className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.professionalSummary ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                            {cvData.professionalSummary ? <CheckCircle className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                        </div>
                        <span className={cvData.professionalSummary ? 'text-slate-700' : 'text-slate-400'}>
                            Professional Summary
                        </span>
                    </li>
                    <li className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.experience?.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                            {cvData.experience?.length > 0 ? <CheckCircle className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                        </div>
                        <span className={cvData.experience?.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
                            Work History ({cvData.experience?.length || 0} roles)
                        </span>
                    </li>
                    <li className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.education?.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                            {cvData.education?.length > 0 ? <CheckCircle className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                        </div>
                        <span className={cvData.education?.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
                            Education ({cvData.education?.length || 0} entries)
                        </span>
                    </li>
                    <li className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${cvData.skills?.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                            {cvData.skills?.length > 0 ? <CheckCircle className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-slate-400"></div>}
                        </div>
                        <span className={cvData.skills?.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
                            Skills ({cvData.skills?.length || 0} listed)
                        </span>
                    </li>
                </ul>

                {!isComplete && (
                    <div className="mt-6 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg border border-amber-100">
                        Warning: Some key sections seem empty. You can still preview, but your resume might look incomplete.
                    </div>
                )}
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
                    type="button"
                    onClick={handlePreview}
                    disabled={saving}
                    className="btn-primary px-8 py-3 flex items-center gap-2"
                >
                    Preview My Application <ExternalLink className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default Finalize;
