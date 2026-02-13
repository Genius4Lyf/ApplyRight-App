import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Download, Printer, ChevronLeft, LayoutTemplate, Share2, Sparkles, Check, Mail } from 'lucide-react';
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
import AdPlayer from '../components/AdPlayer'; // Import AdPlayer
import LoadingWithAd from '../components/LoadingWithAd'; // Import LoadingWithAd for PDF download
import { Lock, Zap, PlayCircle, X, Loader, ZoomIn, ZoomOut } from 'lucide-react'; // Import extra icons

const ResumeReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [templateId, setTemplateId] = useState('ats-clean'); // Default to ATS Clean
    const [userProfile, setUserProfile] = useState(null);
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [activeTab, setActiveTab] = useState('resume'); // 'resume' or 'cover-letter'
    const [isDownloading, setIsDownloading] = useState(false);
    const [scale, setScale] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 0.5 : 1); // Default 50% on mobile

    const [error, setError] = useState(null);

    // Ad & Unlock State
    const [downloadAdOpen, setDownloadAdOpen] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false); // Success state for download loader
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);
    const [templateToUnlock, setTemplateToUnlock] = useState(null);
    const [unlocking, setUnlocking] = useState(false);
    const [adForCreditsOpen, setAdForCreditsOpen] = useState(false); // For earning credits within unlock modal
    const [creditSuccessModalOpen, setCreditSuccessModalOpen] = useState(false); // New success modal state

    // Listen for global user updates
    useEffect(() => {
        const handleUserUpdate = (e) => {
            console.log("ResumeReview received user update", e.detail);
            setUserProfile(prev => ({ ...prev, ...e.detail }));
        };
        window.addEventListener('userDataUpdated', handleUserUpdate);
        return () => window.removeEventListener('userDataUpdated', handleUserUpdate);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
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

                setError("Document not found");
                // toast.error("Document not found"); // Optional: Keep or remove toast if UI is enough

            } catch (error) {
                console.error("Failed to load data", error);
                setError("Failed to load document");
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

    // Unlocking Logic
    const isUnlocked = (templateId) => {
        const template = TEMPLATES.find(t => t.id === templateId);
        if (!template) return true;
        if (!template.isPro) return true;
        if (userProfile?.plan === 'paid') return true;
        if (userProfile?.unlockedTemplates && userProfile.unlockedTemplates.includes(templateId)) return true;
        return false;
    };

    const handleUnlock = async () => {
        if (!templateToUnlock) return;
        setUnlocking(true);
        try {
            const res = await api.post('/billing/unlock-template', {
                templateId: templateToUnlock.id,
                cost: templateToUnlock.cost
            });

            if (res.data.success) {
                toast.success("Template unlocked!");
                // Update local profile
                setUserProfile(prev => ({
                    ...prev,
                    credits: res.data.credits,
                    unlockedTemplates: res.data.unlockedTemplates
                }));

                // Dispatch global event to update navbar and other components
                window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: { credits: res.data.credits, unlockedTemplates: res.data.unlockedTemplates } }));
                window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.data.credits }));

                setTemplateId(templateToUnlock.id); // Select it
                setUnlockModalOpen(false);
                setTemplateToUnlock(null);
            }
        } catch (error) {
            console.error("Unlock failed", error);
            if (error.response?.data?.error === 'INSUFFICIENT_CREDITS') {
                toast.error("Insufficient credits.");
            } else {
                toast.error("Failed to unlock template");
            }
        } finally {
            setUnlocking(false);
        }
    };

    const handleAdForCreditsComplete = async () => {
        setAdForCreditsOpen(false);
        try {
            // Award credits via API
            await api.post('/billing/watch-ad');

            // Refresh profile
            const res = await api.get('/auth/me');
            setUserProfile(res.data);

            // Dispatch global event to update navbar and other components
            window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: res.data }));
            window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.data.credits }));

            // Show success modal instead of toast + unlock modal
            setCreditSuccessModalOpen(true);
            // Ensure unlock modal is closed (though it should be already if we closed it before ad)
            setUnlockModalOpen(false);

        } catch (e) {
            console.error(e);
            toast.error("Failed to award credits.");
            // If failed, maybe just reopen unlock modal or do nothing
            setUnlockModalOpen(true);
        }
    };


    // Download Ad Logic
    const performDownload = async () => {
        try {
            setIsDownloading(true);

            // PHASE 1: Show tips for 20 seconds BEFORE starting PDF generation
            await new Promise(resolve => setTimeout(resolve, 20000));

            // PHASE 2: Now start PDF generation (user has seen tips for full 20s)
            toast.info('Generating High-Quality PDF...', { duration: 2000 });

            const elementId = activeTab === 'resume' ? 'resume-content' : 'cover-letter-content';
            const element = document.getElementById(elementId);
            if (!element) throw new Error(`${activeTab === 'resume' ? 'Resume' : 'Cover letter'} content not found`);

            // Clone and reset transform to ensure PDF is generated at 100% scale
            const clone = element.cloneNode(true);
            clone.style.transform = 'none';
            clone.style.transformOrigin = 'top left';
            clone.style.width = '210mm';
            clone.style.minWidth = '210mm';
            clone.style.minHeight = '297mm';
            clone.style.margin = '0 auto';

            // 1. Serialization with Tailwind injection
            const contentHtml = clone.outerHTML;

            // Apply dark background only for Royal Elegance template
            const isDarkTemplate = templateId === 'luxury-royal';
            const bgColor = isDarkTemplate ? '#0f172a' : 'transparent';

            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background: ${bgColor}; height: 100%; }
                        
                        /* Table Layout Method for Print Margins */
                        .print-container {
                            width: 100%;
                            border-collapse: collapse;
                            border: 0 none;
                            margin-top: -5mm; /* Pull up to hide first page header */
                        }
                        .print-container td, .print-container th {
                            border: 0 none;
                            padding: 0;
                            margin: 0;
                        }
                        thead, tfoot { 
                            height: 5mm; 
                            display: table-header-group; /* Ensure repeat on break */
                        }
                        tfoot { display: table-footer-group; }  
                        
                        /* Spacer divs - transparent to show background */
                        .margin-spacer { height: 5mm; background: transparent; }
                        
                        #resume-content, #cover-letter-content { padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
                    </style>
                </head>
                <body>
                    <table class="print-container">
                        <thead>
                            <tr><td><div class="margin-spacer"></div></td></tr>
                        </thead>
                        <tbody>
                            <tr><td>
                                ${contentHtml}
                            </td></tr>
                        </tbody>
                        <tfoot>
                            <tr><td><div class="margin-spacer"></div></td></tr>
                        </tfoot>
                    </table>
                </body>
                </html>
            `;

            // 2. Call Backend with margin options
            const blob = await CVService.generatePdf(fullHtml, {
                margin: {
                    top: '0mm',
                    right: '0mm',
                    bottom: '0mm',
                    left: '0mm'
                }
            });

            // 3. Download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(userProfile?.firstName ? [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ') : 'Document')}_${activeTab === 'resume' ? 'CV' : 'CoverLetter'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // PHASE 3: Show success state in the loader
            setDownloadSuccess(true);
            toast.success('PDF Downloaded');

            // PHASE 4: Wait 2.5 seconds before closing the loader
            setTimeout(() => {
                setIsDownloading(false);
                setDownloadSuccess(false);
            }, 2500);

        } catch (e) {
            console.error(e);
            toast.error("Download failed");
            setIsDownloading(false); // Close immediately on error
        }
    };

    const handleDownloadClick = () => {
        console.log("Download clicked. Template:", templateId);
        // 1. Check if unlocked
        if (!isUnlocked(templateId)) {
            console.log("Template locked. Opening modal.");
            const template = TEMPLATES.find(t => t.id === templateId);
            setTemplateToUnlock(template);
            setUnlockModalOpen(true);
            return;
        }

        // 2. Check Ad requirement (Alternating: Ad, Free, Ad, Free...)
        if (userProfile?.plan !== 'paid') {
            const downloadCount = parseInt(localStorage.getItem('download_count') || '0');
            // const nextDownload = downloadCount + 1; // Removed for new logic

            console.log(`Download count: ${downloadCount} -> Next check: ${downloadCount % 2 === 0 ? 'Ad Required' : 'Free'}`);

            // New Policy: 0 (1st) = Ad, 1 (2nd) = Free, 2 (3rd) = Ad, etc.
            if (downloadCount % 2 === 0) {
                console.log("Ad required for this download");
                setDownloadAdOpen(true);
                return;
            }
        }

        // If no ad needed (or user is paid), proceed
        performDownload();
        // Increment count after successful download start (or we can do it inside performDownload? 
        // Better here to avoid double counting if fail? No, performDownload is async but starts immediately.
        // Let's increment here.
        if (userProfile?.plan !== 'paid') {
            const current = parseInt(localStorage.getItem('download_count') || '0');
            localStorage.setItem('download_count', (current + 1).toString());
        }
    };

    const handleDownloadAdComplete = () => {
        setDownloadAdOpen(false);
        // Increment count since they "paid" with an ad for this download
        const current = parseInt(localStorage.getItem('download_count') || '0');
        localStorage.setItem('download_count', (current + 1).toString());

        performDownload();
    };




    if (loading) return (
        <LoadingWithAd
            messages={[
                "Loading your CV...",
                "Preparing templates...",
                "Getting everything ready...",
                "Almost there..."
            ]}
            showProgress={false}
            duration={30000}
        />
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                    <LayoutTemplate size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Unavailable</h2>
                <p className="text-slate-600 mb-6">{error}</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full btn-primary py-3"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );

    if (!application) return null;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col relative">
            {downloadAdOpen && (
                <AdPlayer
                    onComplete={handleDownloadAdComplete}
                    onClose={() => setDownloadAdOpen(false)} // User can close, but won't get reward
                    title="Unlock High-Quality PDF"
                    subtitle="View our sponsor's offer to unlock your download instantly."
                    buttonText="Unlock Download"
                    successTitle="Ready to Download!"
                    successMessage="Your PDF will start downloading shortly."
                />
            )}

            {adForCreditsOpen && (
                <AdPlayer
                    onComplete={handleAdForCreditsComplete}
                    onClose={() => setAdForCreditsOpen(false)}
                />
            )}

            {creditSuccessModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-10 h-10 text-green-600" />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Credits Earned!</h3>
                        <p className="text-slate-500 mb-6">
                            You successfully watched the ad.
                        </p>

                        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                            <span className="text-sm text-slate-500 uppercase tracking-wider font-bold block mb-1">New Balance</span>
                            <div className="flex items-center justify-center gap-2 text-3xl font-extrabold text-indigo-600">
                                <Zap className="w-6 h-6 fill-indigo-600" />
                                {userProfile?.credits || 0}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {templateToUnlock && (userProfile?.credits || 0) >= templateToUnlock.cost ? (
                                <button
                                    onClick={() => {
                                        setCreditSuccessModalOpen(false);
                                        setUnlockModalOpen(true);
                                    }}
                                    className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                                >
                                    Proceed to Unlock {templateToUnlock.name}
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setCreditSuccessModalOpen(false);
                                        // If they still don't have enough, maybe offer to watch another?
                                        // For now just close or maybe reopen unlock modal to see options
                                        setUnlockModalOpen(true);
                                    }}
                                    className="w-full btn-primary py-3 rounded-xl"
                                >
                                    Continue
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setCreditSuccessModalOpen(false);
                                    setUnlockModalOpen(false);
                                }}
                                className="w-full py-3 text-slate-400 hover:text-slate-600 font-medium text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {unlockModalOpen && templateToUnlock && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setUnlockModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 relative">
                                <TemplateThumbnail type={templateToUnlock.id} className="w-full h-full rounded-lg shadow-md object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                                    <Lock className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Unlock {templateToUnlock.name}</h3>
                            <p className="text-slate-500 mt-2">
                                This is a premium template. Unlock it to download and use for your applications.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleUnlock}
                                disabled={unlocking || (userProfile?.credits || 0) < templateToUnlock.cost}
                                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${(userProfile?.credits || 0) >= templateToUnlock.cost
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {unlocking ? (
                                    <Loader className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                                        Unlock for {templateToUnlock.cost} Credits
                                    </>
                                )}
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-white px-2 text-slate-500">or earn credits</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setUnlockModalOpen(false);
                                    setAdForCreditsOpen(true);
                                }}
                                className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-100"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Watch Ad for +10 Credits
                            </button>

                            <p className="text-xs text-slate-400 text-center leading-relaxed px-4">
                                💚 We use ads to keep ApplyRight free for everyone. Thank you for your support!
                            </p>

                            {(userProfile?.credits || 0) < templateToUnlock.cost && (
                                <p className="text-xs text-slate-500 text-center mt-2">
                                    You have {userProfile?.credits || 0} credits. Need {templateToUnlock.cost - (userProfile?.credits || 0)} more.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Navbar />

            <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
                {/* LEFT: Document Preview Area */}
                <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar p-8 flex justify-center bg-slate-100/50 relative">
                    {/* Zoom Controls */}
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 lg:left-auto lg:right-[450px] lg:translate-x-0 z-40 bg-white/90 backdrop-blur shadow-xl border border-slate-200/60 p-1.5 rounded-full flex items-center gap-2">
                        <button
                            onClick={() => setScale(s => Math.max(0.3, s - 0.1))}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <span className="text-xs font-bold text-slate-600 w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
                        <button
                            onClick={() => setScale(s => Math.min(2.0, s + 0.1))}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={18} />
                        </button>
                    </div>

                    {/* Wrapper for Layout Sizing */}
                    <div
                        className="shrink-0 transition-[width,height] duration-200 origin-top"
                        style={{
                            width: `calc(210mm * ${scale})`,
                            height: `calc(297mm * ${scale})`
                        }}
                    >
                        <div
                            id="resume-content"
                            className="w-[210mm] min-w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[15mm] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden relative transition-transform"
                            style={{
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left'
                            }}
                        >

                            {/* Tab Switcher inside the paper (optional) or floating above? Let's put it floating above in the layout or switch the content */}

                            {activeTab === 'resume' ? (
                                /* RESUME TEMPLATE RENDER */
                                templateId === 'modern' ? (
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
                                                <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
                                                    {userProfile?.firstName ? [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ') : 'Your Name'}
                                                </h1>
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
                                )
                            ) : (
                                /* COVER LETTER RENDER */
                                <div id="cover-letter-content" className="bg-white min-h-screen">
                                    <div className="p-12">
                                        <div className="mb-8 border-b border-slate-200 pb-6">
                                            {/* Simple Header for Cover Letter */}
                                            <h1 className="text-3xl font-bold text-slate-900 mb-2">
                                                {userProfile?.firstName ? [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ') : 'Your Name'}
                                            </h1>
                                            <div className="text-sm text-slate-500 flex flex-wrap gap-4">
                                                {userProfile?.email && <span>{userProfile.email}</span>}
                                                {userProfile?.phone && <span>{userProfile.phone}</span>}
                                            </div>
                                        </div>
                                        {application.coverLetter ? (
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-4 text-slate-900" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mb-3 mt-4 text-slate-800" {...props} />,
                                                    p: ({ node, ...props }) => <p className="mb-4 text-slate-700 leading-relaxed whitespace-pre-line text-base font-serif" {...props} />,
                                                }}
                                            >
                                                {application.coverLetter}
                                            </ReactMarkdown>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                                <p>No cover letter generated.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Sidebar Tools */}
                <div className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full z-20 shadow-xl">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <button onClick={() => navigate('/history')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h2 className="font-bold text-slate-800">Review Application</h2>
                            <p className="text-xs text-slate-500">Edit and export your documents</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* View Toggles */}
                        <div>
                            <div className="bg-slate-100 p-1 rounded-lg flex">
                                <button
                                    onClick={() => setActiveTab('resume')}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'resume' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Resume
                                </button>
                                <button
                                    onClick={() => !isDraftMode && setActiveTab('cover-letter')}
                                    disabled={isDraftMode}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'cover-letter' ? 'bg-white shadow text-indigo-600' : isDraftMode ? 'text-slate-400 cursor-not-allowed' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Cover Letter
                                </button>
                            </div>
                            {isDraftMode && (
                                <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-3 flex gap-2">
                                    <div className="text-slate-400 flex-shrink-0 mt-0.5">
                                        <Sparkles size={14} />
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Cover letters are generated during the <strong>Application Fit</strong> analysis when you upload an existing CV.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Suggestions Box - Hide for drafts if no analysis */}
                        {!isDraftMode && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mt-1">
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-indigo-900 text-sm">AI Analysis</h3>
                                        <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                                            Your fit score is <strong>{application.fitScore}%</strong>. This application is optimized for {application.jobId?.title || 'the role'}.
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
                                    disabled={isDownloading}
                                    onClick={handleDownloadClick}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all group ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    {isDownloading ? (
                                        <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
                                    ) : (
                                        <Download className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 mb-2" />
                                    )}
                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">{isDownloading ? 'Processing...' : `Download ${activeTab === 'resume' ? 'CV' : 'Letter'}`}</span>
                                </button>
                                <button
                                    disabled
                                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed transition-all relative overflow-hidden"
                                >
                                    <div className="absolute top-2 right-2 bg-slate-200 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                        Soon
                                    </div>
                                    <Mail className="w-6 h-6 text-slate-400 mb-2" />
                                    <span className="text-sm font-semibold text-slate-500">Email Documents</span>
                                </button>
                            </div>
                        </div>

                        {/* Templates Selection - Only relevant for Resume currently, maybe simple style for Cover Letter later */}
                        {activeTab === 'resume' && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Template Style</h3>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                    {TEMPLATES.map((t) => {
                                        const locked = !isUnlocked(t.id);
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setTemplateId(t.id)}
                                                className={`p-3 rounded-lg border flex items-center cursor-pointer transition-all ${templateId === t.id
                                                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    } ${locked ? 'bg-slate-50/50' : ''}`}
                                            >
                                                <div className="w-10 h-14 mr-3 flex-shrink-0 relative">
                                                    <TemplateThumbnail type={t.id} className="rounded-sm" />
                                                    {locked && (
                                                        <div className="absolute top-0 right-0 p-0.5 bg-slate-800 rounded-bl-sm">
                                                            <Lock size={8} className="text-white" />
                                                        </div>
                                                    )}
                                                    {t.isRecommended && (
                                                        <div className="absolute top-0 left-0 p-0.5 bg-emerald-500 rounded-br-sm shadow-sm z-10">
                                                            <Sparkles size={8} className="text-white fill-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium text-slate-700 block truncate">{t.name}</span>
                                                    {t.isRecommended && (
                                                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                                                            <Sparkles size={10} className="fill-emerald-600" /> Recommended
                                                        </span>
                                                    )}
                                                    {locked && (
                                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                            {t.cost} Credits
                                                        </span>
                                                    )}
                                                </div>
                                                {templateId === t.id && <Check size={16} className="text-indigo-600" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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

            {/* Loading Overlay with Ad - Shows during PDF generation */}
            {isDownloading && (
                <LoadingWithAd
                    messages={["Generating your high-quality PDF..."]}
                    showProgress={true}
                    isSuccess={downloadSuccess}
                    successMessage="Your PDF is ready!"
                />
            )}
        </div>
    );
};

export default ResumeReview;
