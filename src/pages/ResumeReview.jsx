import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Download, Printer, ChevronLeft, LayoutTemplate, Share2, Sparkles, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { toast } from 'sonner';
import ATSCleanTemplate from '../components/templates/ATSCleanTemplate';
import StudentATSTemplate from '../components/templates/StudentATSTemplate';
import ModernProfessionalTemplate from '../components/templates/ModernProfessionalTemplate';
import ModernCleanTemplate from '../components/templates/ModernCleanTemplate';
import MinimalistTemplate from '../components/templates/MinimalistTemplate';
import TemplateThumbnail from '../components/TemplateThumbnail';
import CreativePortfolioTemplate from '../components/templates/CreativePortfolioTemplate';
import ExecutiveLeadTemplate from '../components/templates/ExecutiveLeadTemplate';
import TechStackTemplate from '../components/templates/TechStackTemplate';
import SwissModernTemplate from '../components/templates/SwissModernTemplate';
import ElegantLuxuryTemplate from '../components/templates/ElegantLuxuryTemplate';
import { TEMPLATES } from '../data/templates';

const ResumeReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [templateId, setTemplateId] = useState('ats-clean'); // Default to ATS Clean
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        const fetchApplication = async () => {
            try {
                const res = await api.get('/applications');
                const app = res.data.find(a => a._id === id);
                if (app) {
                    setApplication(app);
                    if (app.templateId) setTemplateId(app.templateId);
                } else {
                    toast.error("Application not found");
                    navigate('/history');
                }
            } catch (error) {
                console.error("Failed to load application", error);
                toast.error("Failed to load application details");
            } finally {
                setLoading(false);
            }
        };

        const fetchUserProfile = async () => {
            try {
                const res = await api.get('/auth/me');
                setUserProfile(res.data);
            } catch (error) {
                console.error("Failed to load user profile", error);
            }
        };

        if (id) {
            fetchApplication();
            fetchUserProfile();
        }
    }, [id, navigate]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
    );

    if (!application) return null;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <Navbar />

            <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
                {/* LEFT: Document Preview Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex justify-center bg-slate-100/50">
                    <div className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[15mm] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                        {/* THE CV CONTENT */}
                        {templateId === 'modern' ? (
                            <ModernCleanTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'modern-professional' ? (
                            <ModernProfessionalTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'ats-clean' ? (
                            <ATSCleanTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'student-ats' ? (
                            <StudentATSTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'minimal' ? (
                            <MinimalistTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'creative' ? (
                            <CreativePortfolioTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'executive' ? (
                            <ExecutiveLeadTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'tech' ? (
                            <TechStackTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'swiss' ? (
                            <SwissModernTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'luxury' ? (
                            <ElegantLuxuryTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : (
                            /* DEFAULT / OTHER TEMPLATES FALLBACK */
                            <ReactMarkdown
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight leading-none" {...props} />,
                                    h2: ({ node, ...props }) => (
                                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 mt-8 pb-2 border-b border-slate-200" {...props} />
                                    ),
                                    h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-slate-900 mt-6 mb-1" {...props} />,
                                    h4: ({ node, ...props }) => <h4 className="text-md font-semibold text-slate-700 mt-4 mb-1" {...props} />,
                                    p: ({ node, ...props }) => <p className="text-sm text-slate-600 leading-relaxed mb-3" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-4 space-y-1 text-sm text-slate-600" {...props} />,
                                    li: ({ node, ...props }) => <li className="pl-1 leading-normal" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2" {...props} />,
                                    hr: ({ node, ...props }) => <hr className="my-6 border-slate-100" {...props} />,
                                }}
                            >
                                {application.optimizedCV}
                            </ReactMarkdown>
                        )}
                    </div>
                </div>

                {/* RIGHT: Sidebar Tools */}
                <div className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full z-20 shadow-xl">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <button onClick={() => navigate('/history')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h2 className="font-bold text-slate-800">Review your CV</h2>
                            <p className="text-xs text-slate-500">Final touches before applying</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Suggestions Box */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mt-1">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-indigo-900 text-sm">CV Suggestions</h3>
                                    <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                        Your fit score is <strong>{application.fitScore}%</strong>. This CV is optimized for {application.jobId?.title || 'the role'}.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <LayoutTemplate className="w-4 h-4" /> Actions
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
                                >
                                    <Download className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 mb-2" />
                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">Download</span>
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
                                >
                                    <Printer className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 mb-2" />
                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">Print</span>
                                </button>
                            </div>
                        </div>

                        {/* Templates Selection */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Template Style</h3>
                            <div className="space-y-3">
                                {TEMPLATES.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => setTemplateId(t.id)}
                                        className={`p-3 rounded-lg border flex items-center cursor-pointer transition-all ${templateId === t.id ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="w-10 h-14 mr-3 flex-shrink-0">
                                            <TemplateThumbnail type={t.id} className="rounded-sm" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 flex-1">{t.name}</span>
                                        {templateId === t.id && <Check size={16} className="text-indigo-600" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                        <button
                            onClick={() => navigate('/history')}
                            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                        >
                            Save & Return to History
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeReview;
