import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Mail, Download, Copy, Check, ArrowDownToLine, Share2, Sparkles, MessageCircle, HelpCircle } from 'lucide-react';

import Modal from '../components/Modal';

// Import Templates
import ATSCleanTemplate from '../components/templates/ATSCleanTemplate';
import StudentATSTemplate from '../components/templates/StudentATSTemplate';
import ModernProfessionalTemplate from '../components/templates/ModernProfessionalTemplate';
import ModernCleanTemplate from '../components/templates/ModernCleanTemplate';
import MinimalistTemplate from '../components/templates/MinimalistTemplate';
import MinimalistSerifTemplate from '../components/templates/MinimalistSerifTemplate';
import MinimalistGridTemplate from '../components/templates/MinimalistGridTemplate';
import MinimalistMonoTemplate from '../components/templates/MinimalistMonoTemplate';
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

const Preview = ({ application, templateId = 'ats-clean', isResumeModalOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('cl'); // 'cl' or 'interview'
    const [copied, setCopied] = useState(false);
    const [scale, setScale] = useState(1);
    const [isDownloading, setIsDownloading] = useState(false);

    // Dynamic Scale for Mobile "Paper View"
    useEffect(() => {
        const calculateScale = () => {
            const screenWidth = window.innerWidth;
            const a4WidthPx = 794; // approx 210mm @ 96dpi
            const padding = 32; // Safety margin

            // If screen is smaller than A4, scale down
            if (screenWidth < (a4WidthPx + padding)) {
                const newScale = (screenWidth - padding) / a4WidthPx;
                setScale(Math.max(newScale, 0.3));
            } else {
                setScale(1);
            }
        };

        // Initial calc
        calculateScale();

        // Listener
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, []);

    // Extract User Profile from Application/Markdown for Templates
    const userProfile = useMemo(() => {
        if (!application) return {};

        let profile = {};
        const markdown = application.optimizedCV || '';

        // Try to extract from Markdown pattern (common in our backend generation)
        try {
            // Name: First H1 or line starting with #
            const nameMatch = markdown.match(/^#\s+(.+)$/m);
            if (nameMatch) profile.fullName = nameMatch[1].trim();

            // Email extraction
            const emailMatch = markdown.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/);
            if (emailMatch) profile.email = emailMatch[0];

            // Phone extraction (simple heuristic)
            const phoneMatch = markdown.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
            // Avoid confusing dates (2020-2024) with phones.
            // But phone usually has specific format.
            if (phoneMatch) profile.phone = phoneMatch[0];

            // LinkedIn
            const linkedinMatch = markdown.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/);
            if (linkedinMatch) profile.linkedin = linkedinMatch[0];

            // Location - Hard to regex reliably without context, assume city/country might be near email
        } catch (e) {
            console.warn("Error extracting profile from markdown", e);
        }

        return profile;
    }, [application]);


    if (!application) return null;

    const handleCopy = () => {
        const textToCopy = activeTab === 'cl' ? application.coverLetter : (application.interviewQuestions?.map(q => q.question).join('\n') || '');
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderTemplate = () => {
        // Strip the header (Name/Contact) from markdown body because Templates render their own header
        const rawMarkdown = application.optimizedCV || '';
        // Remove H1 (# Name) and immediate subsequent lines until the next Header (##)
        // This is a simple heuristic: remove everything before the first "##"
        const firstSectionIndex = rawMarkdown.indexOf('##');
        const markdown = firstSectionIndex !== -1 ? rawMarkdown.substring(firstSectionIndex) : rawMarkdown;

        const props = { markdown, userProfile };

        switch (templateId) {
            // ATS & Clean
            case 'ats-clean': return <ATSCleanTemplate {...props} />;
            case 'modern': return <ModernCleanTemplate {...props} />;
            case 'minimalist': return <MinimalistTemplate {...props} />;
            case 'minimalist-serif': return <MinimalistSerifTemplate {...props} />;
            case 'minimalist-grid': return <MinimalistGridTemplate {...props} />;
            case 'minimalist-mono': return <MinimalistMonoTemplate {...props} />;
            case 'student-ats': return <StudentATSTemplate {...props} />;
            case 'professional': return <ModernProfessionalTemplate {...props} />;
            case 'swiss': return <SwissModernTemplate {...props} />;

            // Creative & Modern
            case 'creative': return <CreativePortfolioTemplate {...props} />;
            case 'tech': return <TechStackTemplate {...props} />;
            case 'tech-devops': return <TechDevOpsTemplate {...props} />;
            case 'tech-silicon': return <TechSiliconTemplate {...props} />;
            case 'tech-google': return <TechGoogleTemplate {...props} />;

            // Luxury
            case 'luxury': return <ElegantLuxuryTemplate {...props} />;
            case 'luxury-royal': return <LuxuryRoyalTemplate {...props} />;
            case 'luxury-chic': return <LuxuryChicTemplate {...props} />;
            case 'luxury-classic': return <LuxuryClassicTemplate {...props} />;
            case 'luxury-gold': return <LuxuryGoldTemplate {...props} />;

            // Executive
            case 'executive': return <ExecutiveLeadTemplate {...props} />;
            case 'executive-board': return <ExecutiveBoardTemplate {...props} />;
            case 'executive-strategy': return <ExecutiveStrategyTemplate {...props} />;
            case 'executive-corporate': return <ExecutiveCorporateTemplate {...props} />;
            case 'executive-energy': return <ExecutiveEnergyTemplate {...props} />;

            // Energy
            case 'energy-slb': return <EnergySLBTemplate {...props} />;
            case 'energy-total': return <EnergyTotalTemplate {...props} />;
            case 'energy-seplat': return <EnergySeplatTemplate {...props} />;
            case 'energy-halliburton': return <EnergyHalliburtonTemplate {...props} />;
            case 'energy-nlng': return <EnergyNLNGTemplate {...props} />;

            default:
                return (
                    <div className="bg-white p-12 shadow-sm min-h-screen">
                        <div className="mb-8 border-b border-slate-200 pb-6">
                            <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{userProfile?.fullName || 'Your Name'}</h1>
                            <div className="text-sm text-slate-500 flex flex-wrap gap-4">
                                {userProfile?.email && <span>{userProfile.email}</span>}
                                {userProfile?.phone && <span>{userProfile.phone}</span>}
                                {userProfile?.linkedin && <span>{userProfile.linkedin}</span>}
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
                            {markdown}
                        </ReactMarkdown>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-indigo-600" />
                        Professional Assets
                    </h2>
                    <p className="text-slate-500 mt-1">Refined and ready for your next application.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Buttons removed as per request */}
                </div>
            </div>

            <div className="clean-card p-0 overflow-hidden border-slate-200 relative group">
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                    <button
                        className={`flex-1 py-4 px-6 text-center font-semibold text-sm flex items-center justify-center transition-all ${activeTab === 'cl'
                            ? 'text-indigo-600 bg-white border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        onClick={() => setActiveTab('cl')}
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Tailored Cover Letter
                    </button>
                    <button
                        className={`flex-1 py-4 px-6 text-center font-semibold text-sm flex items-center justify-center transition-all ${activeTab === 'interview'
                            ? 'text-indigo-600 bg-white border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        onClick={() => setActiveTab('interview')}
                    >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Interview Prep
                    </button>
                </div>

                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {activeTab === 'cl' ? 'Tailored Cover Letter' : 'Interview Preparation'}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 mr-2 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                            {copied ? 'Copied' : 'Copy Text'}
                        </button>
                    </div>

                    {activeTab === 'interview' ? (
                        <div className="bg-slate-50 rounded-xl p-8 min-h-[500px] border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column: Questions to Answer */}
                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <HelpCircle className="w-5 h-5 text-indigo-600" />
                                        <h3 className="text-lg font-bold text-slate-800">Likely Interview Questions</h3>
                                    </div>

                                    {application.interviewQuestions && application.interviewQuestions.length > 0 ? (
                                        <div className="space-y-4">
                                            {application.interviewQuestions.map((q, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
                                                    <p className="text-slate-800 font-medium">{q.question}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-sm">No specific questions generated.</p>
                                    )}
                                </div>

                                {/* Right Column: Questions to Ask */}
                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <MessageCircle className="w-5 h-5 text-emerald-600" />
                                        <h3 className="text-lg font-bold text-slate-800">Questions You Should Ask</h3>
                                    </div>

                                    {application.questionsToAsk && application.questionsToAsk.length > 0 ? (
                                        <div className="space-y-4">
                                            {application.questionsToAsk.map((q, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                                                    <p className="text-slate-800 font-medium">{q}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white p-6 rounded-lg border border-dashed border-slate-300 text-center">
                                            <p className="text-slate-500">Regenerate assets to see suggested questions.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`bg-slate-50 rounded-xl p-8 min-h-[500px] max-h-[800px] overflow-y-auto custom-scrollbar border border-slate-100 relative group
                          ${templateId === 'classic' ? 'font-serif' :
                                templateId === 'tech' ? 'font-mono' :
                                    templateId === 'creative' ? 'font-sans' : ''}
                     `}>
                            <div className={`absolute top-0 left-0 w-full h-1 transition-colors
                             ${templateId === 'modern' ? 'bg-indigo-600' :
                                    templateId === 'classic' ? 'bg-slate-800' :
                                        templateId === 'creative' ? 'bg-purple-600' :
                                            templateId === 'tech' ? 'bg-blue-600' :
                                                'bg-slate-400'}
                         `}></div>
                            <div className="text-slate-700 leading-relaxed">
                                {activeTab === 'cl' && (
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-4 text-slate-900" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mb-3 mt-4 text-slate-800" {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-4 text-slate-700 leading-relaxed whitespace-pre-line" {...props} />,
                                        }}
                                    >
                                        {application.coverLetter}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isResumeModalOpen}
                onClose={onClose}
                title="ApplyRight AI Resume"
                maxWidth="max-w-4xl" // Adjusted to match ResumeReview width better
                footer={
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        <button
                            disabled={isDownloading}
                            onClick={async () => {
                                try {
                                    setIsDownloading(true);
                                    toast.info('Generating High-Quality PDF...', { duration: 2000 });

                                    const element = document.getElementById('resume-content');
                                    if (!element) throw new Error('Resume content not found');

                                    // 1. Serialization
                                    const contentHtml = element.outerHTML;
                                    const fullHtml = `
                                        <!DOCTYPE html>
                                        <html>
                                        <head>
                                            <meta charset="UTF-8">
                                            <script src="https://cdn.tailwindcss.com"></script>
                                            <style>
                                                @page { size: A4; margin: 0; }
                                                body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                                                #resume-content { padding: 0 !important; margin: 0 !important; box-shadow: none !important; min-height: auto !important; }
                                                /* Hide scaling container transform for PDF generation if needed, 
                                                   but since we capture outerHTML of the element (which is the container or wrapper?), 
                                                   we might capture the scale transform. 
                                                   Actually, 'resume-content' is the wrapper. 
                                                   Inside is .scale-container. 
                                                   We want to force scale(1) for the PDF. */
                                                .scale-container { transform: none !important; margin: 0 !important; height: auto !important; }
                                            </style>
                                        </head>
                                        <body>
                                            ${contentHtml}
                                        </body>
                                        </html>
                                    `;

                                    // 2. Call Backend
                                    const blob = await CVService.generatePdf(fullHtml);

                                    // 3. Download
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${userProfile?.fullName || 'Resume'}_CV.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);

                                    toast.success('PDF Downloaded');
                                } catch (error) {
                                    console.error("PDF Download failed", error);
                                    toast.error("Failed to generate PDF");
                                } finally {
                                    setIsDownloading(false);
                                }
                            }}
                            className={`btn-primary flex items-center ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isDownloading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            {isDownloading ? 'Processing...' : 'Download as PDF'}
                        </button>
                    </div>
                }
            >
                <div id="resume-content" className="p-0 bg-slate-100 min-h-[500px] flex justify-center overflow-x-hidden overflow-y-auto custom-scrollbar relative">
                    {/* Scaling Wrapper */}
                    <div
                        className="scale-container transition-transform duration-300 origin-top bg-white shadow-2xl my-8"
                        style={{
                            transform: `scale(${scale})`,
                            // Explicit set height to shrink container in DOM flow
                            height: `${1130 * scale}px`, // ~297mm height scaled
                            width: '210mm',
                            minWidth: '210mm' // Force width
                        }}
                    >
                        <div className="a4-page">
                            {renderTemplate()}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Preview;
