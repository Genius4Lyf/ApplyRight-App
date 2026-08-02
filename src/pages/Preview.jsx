import React, { useState, useMemo, useEffect } from 'react';
import AriaLoader from '../components/ui/AriaLoader';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  Mail,
  Download,
  Copy,
  Check,
  ArrowDownToLine,
  Share2,
  Sparkles,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import CVService from '../services/cv.service';
import { getJobQuestions, getQuestionsToAsk, hasInterviewPrep } from '../utils/interviewPrep';

import Modal from '../components/Modal';
import DownloadPaywallModal from '../components/DownloadPaywallModal';
import ScreenshotCover from '../components/ScreenshotCover';
import { useScreenshotGuard } from '../hooks/useScreenshotGuard';

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
import OperationsBlueprintTemplate from '../components/templates/OperationsBlueprintTemplate';
import ApplyRightBandTemplate from '../components/templates/ApplyRightBandTemplate';
import ApplyRightBandTwinTemplate from '../components/templates/ApplyRightBandTwinTemplate';
import ApplyRightMonoTemplate from '../components/templates/ApplyRightMonoTemplate';
import ApplyRightNavyTemplate from '../components/templates/ApplyRightNavyTemplate';
import EnergySLBTemplate from '../components/templates/EnergySLBTemplate';
import EnergyTotalTemplate from '../components/templates/EnergyTotalTemplate';
import EnergySeplatTemplate from '../components/templates/EnergySeplatTemplate';
import EnergyHalliburtonTemplate from '../components/templates/EnergyHalliburtonTemplate';
import EnergyNLNGTemplate from '../components/templates/EnergyNLNGTemplate';
import TheProfileTemplate from '../components/templates/TheProfileTemplate';
import TheAscentTemplate from '../components/templates/TheAscentTemplate';
import {
  AngularCorporateTemplate,
  NavyPortraitTemplate,
  SalesSidebarTemplate,
  SlateTimelineTemplate,
} from '../components/templates/SignatureCollectionTemplates';

const Preview = ({ application, templateId = 'ats-clean', isResumeModalOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(() => {
    // Default to whichever tab has content
    if (application?.coverLetter) return 'cl';
    if (hasInterviewPrep(application)) return 'interview';
    return 'cl';
  });
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadPaywall, setShowDownloadPaywall] = useState(false);
  // Blur the CV when the page loses focus (snip-tool / alt-tab capture deterrent).
  const screenshotObscured = useScreenshotGuard();
  // Account plan (the on-screen watermark is a FREE-user deterrent only). The
  // `userProfile` above is parsed from the CV markdown and carries no plan, so read
  // the stored account. Not memoized on purpose — cheap and always current.
  const isFreeUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').plan !== 'paid';
    } catch {
      return true;
    }
  })();

  // Dynamic Scale for Mobile "Paper View"
  useEffect(() => {
    const calculateScale = () => {
      const screenWidth = window.innerWidth;
      const a4WidthPx = 794; // approx 210mm @ 96dpi
      const padding = 32; // Safety margin

      // If screen is smaller than A4, scale down
      if (screenWidth < a4WidthPx + padding) {
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
      console.warn('Error extracting profile from markdown', e);
    }

    return profile;
  }, [application]);

  if (!application) return null;

  const interviewQuestions = getJobQuestions(application);
  const questionsToAsk = getQuestionsToAsk(application);

  const handleCopy = () => {
    const textToCopy =
      activeTab === 'cl'
        ? application.coverLetter
        : [
            ...interviewQuestions.map((q) =>
              [q.question, q.suggestedAnswer].filter(Boolean).join('\n')
            ),
            ...questionsToAsk.map((q) => `Ask: ${q}`),
          ].join('\n\n');
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
    const markdown =
      firstSectionIndex !== -1 ? rawMarkdown.substring(firstSectionIndex) : rawMarkdown;

    const props = { markdown, userProfile };

    switch (templateId) {
      // ATS & Clean
      case 'ats-clean':
        return <ATSCleanTemplate {...props} />;
      case 'modern':
        return <ModernCleanTemplate {...props} />;
      case 'minimalist':
        return <MinimalistTemplate {...props} />;
      case 'minimalist-serif':
        return <MinimalistSerifTemplate {...props} />;
      case 'minimalist-grid':
        return <MinimalistGridTemplate {...props} />;
      case 'minimalist-mono':
        return <MinimalistMonoTemplate {...props} />;
      case 'student-ats':
        return <StudentATSTemplate {...props} />;
      case 'professional':
        return <ModernProfessionalTemplate {...props} />;
      case 'swiss':
        return <SwissModernTemplate {...props} />;

      // Creative & Modern
      case 'creative':
        return <CreativePortfolioTemplate {...props} />;
      case 'tech':
        return <TechStackTemplate {...props} />;
      case 'tech-devops':
        return <TechDevOpsTemplate {...props} />;
      case 'tech-silicon':
        return <TechSiliconTemplate {...props} />;
      case 'tech-google':
        return <TechGoogleTemplate {...props} />;

      // Luxury
      case 'luxury':
        return <ElegantLuxuryTemplate {...props} />;
      case 'luxury-royal':
        return <LuxuryRoyalTemplate {...props} />;
      case 'luxury-chic':
        return <LuxuryChicTemplate {...props} />;
      case 'luxury-classic':
        return <LuxuryClassicTemplate {...props} />;
      case 'luxury-gold':
        return <LuxuryGoldTemplate {...props} />;

      // Executive
      case 'executive':
        return <ExecutiveLeadTemplate {...props} />;
      case 'executive-board':
        return <ExecutiveBoardTemplate {...props} />;
      case 'executive-strategy':
        return <ExecutiveStrategyTemplate {...props} />;
      case 'executive-corporate':
        return <ExecutiveCorporateTemplate {...props} />;
      case 'executive-energy':
        return <ExecutiveEnergyTemplate {...props} />;
      case 'operations-blueprint':
        return <OperationsBlueprintTemplate {...props} />;

      // ApplyRight
      case 'applyright-band':
        return <ApplyRightBandTemplate {...props} />;
      case 'applyright-band-twin':
        return <ApplyRightBandTwinTemplate {...props} />;
      case 'applyright-mono':
        return <ApplyRightMonoTemplate {...props} />;
      case 'applyright-navy':
        return <ApplyRightNavyTemplate {...props} />;

      // Energy
      case 'energy-slb':
        return <EnergySLBTemplate {...props} />;
      case 'energy-total':
        return <EnergyTotalTemplate {...props} />;
      case 'energy-seplat':
        return <EnergySeplatTemplate {...props} />;
      case 'energy-halliburton':
        return <EnergyHalliburtonTemplate {...props} />;
      case 'energy-nlng':
        return <EnergyNLNGTemplate {...props} />;

      // New directions
      case 'the-profile':
        return <TheProfileTemplate {...props} />;
      case 'the-ascent':
        return <TheAscentTemplate {...props} />;
      case 'slate-timeline':
        return <SlateTimelineTemplate {...props} />;
      case 'navy-portrait':
        return <NavyPortraitTemplate {...props} />;
      case 'angular-corporate':
        return <AngularCorporateTemplate {...props} />;
      case 'sales-sidebar':
        return <SalesSidebarTemplate {...props} />;

      // Unknown/legacy templateId falls back to the safe, ATS-clean default so
      // saved CVs referencing a no-longer-offered template still render cleanly.
      default:
        return <ATSCleanTemplate {...props} />;
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

        <div className="flex items-center gap-2">{/* Buttons removed as per request */}</div>
      </div>

      <div className="clean-card p-0 overflow-hidden border-slate-200 relative group">
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            className={`flex-1 py-4 px-6 text-center font-semibold text-sm flex items-center justify-center transition-all ${
              activeTab === 'cl'
                ? 'text-indigo-600 bg-white border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => setActiveTab('cl')}
          >
            <Mail className="w-4 h-4 mr-2" />
            Tailored Cover Letter
          </button>
          <button
            className={`flex-1 py-4 px-6 text-center font-semibold text-sm flex items-center justify-center transition-all ${
              activeTab === 'interview'
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
              {copied ? (
                <Check className="w-3.5 h-3.5 mr-2 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-2" />
              )}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>

          {activeTab === 'interview' ? (
            <div className="bg-slate-50 rounded-xl p-8 min-h-[500px] border border-slate-100">
              {!hasInterviewPrep(application) ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <MessageCircle className="w-12 h-12 text-slate-300 mb-4" />
                  <h4 className="text-lg font-semibold text-slate-700 mb-2">
                    Interview Prep Not Generated
                  </h4>
                  <p className="text-sm text-slate-500 max-w-md">
                    Generate interview prep from the asset cards above to see role-specific
                    questions and strategies.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Questions to Answer */}
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <HelpCircle className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-bold text-slate-800">
                        Likely Interview Questions
                      </h3>
                    </div>

                    {interviewQuestions.length > 0 ? (
                      <div className="space-y-4">
                        {interviewQuestions.map((q, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-indigo-500"
                          >
                            <p className="text-slate-800 font-medium">{q.question}</p>
                            {q.suggestedAnswer && (
                              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                {q.suggestedAnswer}
                              </p>
                            )}
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

                    {questionsToAsk.length > 0 ? (
                      <div className="space-y-4">
                        {questionsToAsk.map((q, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-emerald-500"
                          >
                            <p className="text-slate-800 font-medium">{q}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-lg border border-dashed border-slate-300 text-center">
                        <p className="text-slate-500">No suggested questions available.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`bg-slate-50 rounded-xl p-8 min-h-[500px] max-h-[800px] overflow-y-auto custom-scrollbar border border-slate-100 relative group
                          ${
                            templateId === 'classic'
                              ? 'font-serif'
                              : templateId === 'tech'
                                ? 'font-mono'
                                : templateId === 'creative'
                                  ? 'font-sans'
                                  : ''
                          }
                     `}
            >
              <div
                className={`absolute top-0 left-0 w-full h-1 transition-colors
                             ${
                               templateId === 'modern'
                                 ? 'bg-indigo-600'
                                 : templateId === 'classic'
                                   ? 'bg-slate-800'
                                   : templateId === 'creative'
                                     ? 'bg-purple-600'
                                     : templateId === 'tech'
                                       ? 'bg-blue-600'
                                       : 'bg-slate-400'
                             }
                         `}
              ></div>
              <div className="text-slate-700 leading-relaxed">
                {activeTab === 'cl' &&
                  (application.coverLetter ? (
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-xl font-bold mb-4 text-slate-900" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2
                            className="text-lg font-semibold mb-3 mt-4 text-slate-800"
                            {...props}
                          />
                        ),
                        p: ({ node, ...props }) => (
                          <p
                            className="mb-4 text-slate-700 leading-relaxed whitespace-pre-line"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {application.coverLetter}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                      <Mail className="w-12 h-12 text-slate-300 mb-4" />
                      <h4 className="text-lg font-semibold text-slate-700 mb-2">
                        Cover Letter Not Generated
                      </h4>
                      <p className="text-sm text-slate-500 max-w-md">
                        Generate a cover letter from the asset cards above to see a tailored letter
                        for this role.
                      </p>
                    </div>
                  ))}
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

                  const element = document.getElementById('resume-content');
                  if (!element) throw new Error('Resume content not found');

                  // 1. Serialization — clone + strip the preview watermark so the
                  // downloaded PDF is clean (the watermark is on-screen only).
                  const cloneEl = element.cloneNode(true);
                  cloneEl.querySelectorAll('[data-preview-watermark]').forEach((el) => el.remove());
                  cloneEl.style.filter = 'none';
                  const contentHtml = cloneEl.outerHTML;
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
                  const blob = await CVService.generatePdf(fullHtml, {
                    margin: {
                      top: '25px',
                      right: '25px',
                      bottom: '25px',
                      left: '25px',
                    },
                  });

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
                  console.error('PDF Download failed', error);
                  if (error.code === 'NEED_DOWNLOAD') {
                    setShowDownloadPaywall(true);
                  } else {
                    toast.error('Failed to generate PDF');
                  }
                } finally {
                  setIsDownloading(false);
                }
              }}
              className={`btn-primary flex items-center ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isDownloading ? (
                <AriaLoader inline tone="mono" size={16} label="" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isDownloading ? 'Processing...' : 'Download as PDF'}
            </button>
          </div>
        }
      >
        <div
          id="resume-content"
          className="p-0 bg-slate-100 min-h-[500px] flex justify-center overflow-x-hidden overflow-y-auto custom-scrollbar relative select-none"
          // Copy-protection: block long-press callout / drag-to-save on mobile.
          style={{ WebkitTouchCallout: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          {/* Blur + "Content hidden" cover while the tab is hidden/unfocused. */}
          <ScreenshotCover show={screenshotObscured} />

          {/* Scaling Wrapper */}
          <div
            className="scale-container transition-transform duration-300 origin-top bg-white shadow-2xl my-8"
            style={{
              transform: `scale(${scale})`,
              // Explicit set height to shrink container in DOM flow
              height: `${1130 * scale}px`, // ~297mm height scaled
              width: '210mm',
              minWidth: '210mm', // Force width
            }}
          >
            <div className="a4-page cv-template-container">{renderTemplate()}</div>
          </div>
        </div>
      </Modal>

      <DownloadPaywallModal
        open={showDownloadPaywall}
        onClose={() => setShowDownloadPaywall(false)}
        templateId={templateId}
      />
    </div>
  );
};

export default Preview;
