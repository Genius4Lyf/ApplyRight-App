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
import MinimalistSerifTemplate from '../components/templates/MinimalistSerifTemplate';
import MinimalistGridTemplate from '../components/templates/MinimalistGridTemplate';
import MinimalistMonoTemplate from '../components/templates/MinimalistMonoTemplate';
import TemplateThumbnail from '../components/TemplateThumbnail';
import CreativePortfolioTemplate from '../components/templates/CreativePortfolioTemplate';
import ExecutiveLeadTemplate from '../components/templates/ExecutiveLeadTemplate';
import TechStackTemplate from '../components/templates/TechStackTemplate';
import SwissModernTemplate from '../components/templates/SwissModernTemplate';
import ElegantLuxuryTemplate from '../components/templates/ElegantLuxuryTemplate';
import LuxuryRoyalTemplate from '../components/templates/LuxuryRoyalTemplate';
import LuxuryChicTemplate from '../components/templates/LuxuryChicTemplate';
import LuxuryClassicTemplate from '../components/templates/LuxuryClassicTemplate';
import LuxuryGoldTemplate from '../components/templates/LuxuryGoldTemplate';
import ExecutiveBoardTemplate from '../components/templates/ExecutiveBoardTemplate';
import ExecutiveStrategyTemplate from '../components/templates/ExecutiveStrategyTemplate';
import ExecutiveCorporateTemplate from '../components/templates/ExecutiveCorporateTemplate';
import TechDevOpsTemplate from '../components/templates/TechDevOpsTemplate';
import TechSiliconTemplate from '../components/templates/TechSiliconTemplate';
import TechGoogleTemplate from '../components/templates/TechGoogleTemplate';
import ExecutiveEnergyTemplate from '../components/templates/ExecutiveEnergyTemplate';
import EnergySLBTemplate from '../components/templates/EnergySLBTemplate';
import EnergyTotalTemplate from '../components/templates/EnergyTotalTemplate';
import EnergySeplatTemplate from '../components/templates/EnergySeplatTemplate';
import EnergyHalliburtonTemplate from '../components/templates/EnergyHalliburtonTemplate';
import EnergyNLNGTemplate from '../components/templates/EnergyNLNGTemplate';
import { TEMPLATES } from '../data/templates';
import { generateMarkdownFromDraft } from '../utils/markdownUtils';
import CVService from '../services/cv.service';

const ResumeReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [templateId, setTemplateId] = useState('ats-clean'); // Default to ATS Clean
    const [userProfile, setUserProfile] = useState(null);
    const [isDraftMode, setIsDraftMode] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Try fetching as Application (Standard flow)
                try {
                    const res = await api.get('/applications');
                    const app = res.data.find(a => a._id === id);
                    if (app) {
                        setApplication(app);
                        if (app.templateId) setTemplateId(app.templateId);
                        return; // Found application, exit
                    }
                } catch (e) {
                    // Ignore error, try next
                }

                // 2. Try fetching as Draft
                try {
                    const draft = await CVService.getDraftById(id);
                    if (draft) {
                        setIsDraftMode(true);
                        // Convert draft to pseudo-application structure for the templates
                        const { optimizedCV } = generateMarkdownFromDraft(draft);

                        setApplication({
                            _id: draft._id,
                            optimizedCV: optimizedCV,
                            jobId: draft.targetJob ? { title: draft.targetJob.title, company: 'Target Role' } : {},
                            fitScore: 'N/A', // Drafts don't have fit scores yet usually
                            status: 'draft',
                            isDraft: true
                        });
                        return;
                    }
                } catch (e) {
                    console.error("Failed to load draft", e);
                }

                toast.error("Document not found");
                navigate('/dashboard');

            } catch (error) {
                console.error("Failed to load data", error);
                toast.error("Failed to load document");
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
            loadData();
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
                        ) : templateId === 'minimal-serif' ? (
                            <MinimalistSerifTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'minimal-grid' ? (
                            <MinimalistGridTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'minimal-mono' ? (
                            <MinimalistMonoTemplate markdown={application.optimizedCV} userProfile={userProfile} />
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
                        ) : templateId === 'luxury-royal' ? (
                            <LuxuryRoyalTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'luxury-chic' ? (
                            <LuxuryChicTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'luxury-classic' ? (
                            <LuxuryClassicTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'luxury-gold' ? (
                            <LuxuryGoldTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'executive-board' ? (
                            <ExecutiveBoardTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'executive-strategy' ? (
                            <ExecutiveStrategyTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'executive-corporate' ? (
                            <ExecutiveCorporateTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'tech-devops' ? (
                            <TechDevOpsTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'tech-silicon' ? (
                            <TechSiliconTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'tech-google' ? (
                            <TechGoogleTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'executive-energy' ? (
                            <ExecutiveEnergyTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'energy-slb' ? (
                            <EnergySLBTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'energy-total' ? (
                            <EnergyTotalTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'energy-seplat' ? (
                            <EnergySeplatTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'energy-halliburton' ? (
                            <EnergyHalliburtonTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : templateId === 'energy-nlng' ? (
                            <EnergyNLNGTemplate markdown={application.optimizedCV} userProfile={userProfile} />
                        ) : (
                            /* DEFAULT / OTHER TEMPLATES FALLBACK */
                            <>
                                <div className="bg-white p-12 shadow-sm min-h-screen">
                                    <div className="mb-8 border-b border-slate-200 pb-6">
                                        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{userProfile?.fullName || 'Your Name'}</h1>
                                        <div className="text-sm text-slate-500 flex flex-wrap gap-4">
                                            {userProfile?.email && <span>{userProfile.email}</span>}
                                            {userProfile?.phone && <span>{userProfile.phone}</span>}
                                            {userProfile?.city && <span>{userProfile.city}</span>}
                                            {userProfile?.linkedin && <span>LinkedIn: {userProfile.linkedin}</span>}
                                        </div>
                                    </div>
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
                                </div>
                            </>
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
                        {/* Suggestions Box - Hide for drafts if no analysis */}
                        {!isDraftMode && (
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
                        )}

                        {isDraftMode && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 mt-1">
                                        <Check size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-emerald-900 text-sm">Draft Preview</h3>
                                        <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                                            You are viewing a live preview of your draft. Any changes made in the builder will appear here.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

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
                            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
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
                        {isDraftMode ? (
                            <button
                                onClick={() => navigate(`/cv-builder/${application._id}/finalize`)}
                                className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                            >
                                <ChevronLeft size={16} /> Back to Edit
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/history')}
                                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                            >
                                Save & Return to History
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeReview;
