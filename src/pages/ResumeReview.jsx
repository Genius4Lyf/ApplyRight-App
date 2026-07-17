import React, { useEffect, useState, useRef, useLayoutEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Capacitor } from '@capacitor/core';
import useInterstitial from '../hooks/useInterstitial';
import {
  Download,
  Printer,
  ChevronLeft,
  LayoutTemplate,
  Share2,
  Sparkles,
  Check,
  Mail,
  PenTool,
  MessageSquare,
  AlertTriangle,
  Crown,
  ChevronDown,
  ChevronUp,
  FileText,
  FileType,
} from 'lucide-react';
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
import TemplatePreviewThumb from '../components/TemplatePreviewThumb';
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
import { downloadBlob } from '../utils/download';
import { useMinVisible } from '../hooks/useMinVisible';
import CVService from '../services/cv.service';
import AdPlayer from '../components/AdPlayer'; // Import AdPlayer
import LoadingScreen from '../components/LoadingScreen'; // Full-screen loading overlay with rotating tips
import PreviewWatermark from '../components/PreviewWatermark';
import ScreenshotCover from '../components/ScreenshotCover';
import { useScreenshotGuard } from '../hooks/useScreenshotGuard';
import DownloadPaywallModal from '../components/DownloadPaywallModal';
import LengthCoach from '../components/cv/LengthCoach';
import SummaryTrim from '../components/cv/SummaryTrim';
import { extractSummary, replaceSummaryInMarkdown } from '../lib/summaryMarkdown';
import {
  Lock,
  Zap,
  PlayCircle,
  X,
  Loader,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MoreHorizontal,
  Expand,
  Shrink,
  SlidersHorizontal,
} from 'lucide-react'; // Import extra icons

// Watch-ad-for-credits is native-only; web has no ads. Downloads on web are
// gated by the server-side paywall (DownloadPaywallModal), not an ad.
const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const ResumeReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { triggerInterstitial } = useInterstitial();
  const [atsReadiness, setAtsReadiness] = useState(location.state?.atsReadiness || null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState('ats-clean'); // Default to ATS Clean
  const [userProfile, setUserProfile] = useState(null);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'resume'); // 'resume' or 'cover-letter'
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false); // PDF/Word split menu
  const [downloadSheetOpen, setDownloadSheetOpen] = useState(false); // mobile PDF/Word bottom sheet
  // Blur the CV when the page loses focus (snip-tool / alt-tab capture deterrent).
  const screenshotObscured = useScreenshotGuard();
  // Keep the loader visible long enough for users to read a tip even when the
  // underlying task finishes faster than the rotation interval.
  const showLoader = useMinVisible(loading, 4000);

  // Fullscreen-style focus mode: hides Navbar + page header + action bar so
  // the CV gets the whole viewport.
  const [immersive, setImmersive] = useState(false);
  const toggleImmersive = () => setImmersive((v) => !v);

  // Accuracy advisory — reminds users that AI-generated content can include
  // claims that don't match their real experience. Dismissal persists in
  // localStorage so power users only see it once, but the celebration card on
  // the dashboard still surfaces a fresh reminder after each generation.
  const ACCURACY_ADVISORY_KEY = 'accuracy_advisory_dismissed';
  const [advisoryDismissed, setAdvisoryDismissed] = useState(
    () => localStorage.getItem(ACCURACY_ADVISORY_KEY) === 'true'
  );
  const dismissAdvisory = () => {
    localStorage.setItem(ACCURACY_ADVISORY_KEY, 'true');
    setAdvisoryDismissed(true);
  };

  // Studio rail: collapsible insights strip + Templates/Design tab switch.
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [railTab, setRailTab] = useState('templates'); // 'templates' | 'design'
  // Design tab controls — drive CSS vars on #resume-content. accent '' = each
  // template's own default. Margins are fully live (preview + PDF) this chunk;
  // accent + density set their vars now and go live when templates read them (2b).
  const [design, setDesign] = useState({
    accent: '',
    margins: 'normal',
    density: 'normal',
    font: '',
    paper: 'a4', // 'a4' | 'letter'
  });

  // Persist the design choices per-CV in localStorage (keyed by CV id) so they
  // survive a reload. Frontend-only — templateId still persists via its own
  // backend save. Load once the id is known, merging saved over the defaults.
  useEffect(() => {
    const id = application?._id;
    if (!id) return;
    try {
      const saved = localStorage.getItem(`cvDesign:${id}`);
      if (saved) setDesign((d) => ({ ...d, ...JSON.parse(saved) }));
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, [application?._id]);

  // Save on every change.
  useEffect(() => {
    const id = application?._id;
    if (!id) return;
    try {
      localStorage.setItem(`cvDesign:${id}`, JSON.stringify(design));
    } catch {
      /* non-fatal */
    }
  }, [design, application?._id]);

  // Editable DRAFT title in the toolbar (applications keep a static job title).
  const [titleValue, setTitleValue] = useState('');
  const savingTitleRef = useRef(false); // guard re-entrant saves (Enter + blur)
  // Seed the editable value once the draft loads / changes. Intentionally keyed
  // on the id only (not title) so in-progress typing isn't clobbered by re-seeds.
  useEffect(() => {
    setTitleValue(application?.title || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?._id]);
  // Persist a rename on Enter/blur. Spread the full loaded draft so /cv/save
  // (an upsert that merges via findByIdAndUpdate) never drops any field.
  const commitDraftTitle = async () => {
    const next = titleValue.trim();
    if (!next) {
      setTitleValue(application?.title || ''); // empty → revert
      return;
    }
    if (next === (application?.title || '') || savingTitleRef.current) return;
    savingTitleRef.current = true;
    try {
      await CVService.saveDraft({ ...application, title: next });
      setApplication((a) => ({ ...a, title: next }));
      toast.success('Renamed');
    } catch (err) {
      console.error('Rename draft failed:', err);
      toast.error('Could not rename');
      setTitleValue(application?.title || '');
    } finally {
      savingTitleRef.current = false;
    }
  };

  // Splice a new professional summary into the CV markdown: updates the live
  // preview (which re-flows → the page-count badge re-counts) and persists via the
  // same saveDraft path the title uses.
  const applySummary = async (newText) => {
    if (!application) return;
    const md = replaceSummaryInMarkdown(application.optimizedCV || '', newText);
    setApplication((a) => ({ ...a, optimizedCV: md, professionalSummary: newText }));
    setShowSummaryTrim(false);
    try {
      await CVService.saveDraft({ ...application, optimizedCV: md, professionalSummary: newText });
      toast.success('Summary updated');
    } catch (err) {
      console.error('Save summary failed:', err);
      toast.error('Summary changed here, but saving failed — try again.');
    }
  };

  // Score → editorial band accent (>=75 emerald / >=50 amber / else rose).
  const bandText = (s) =>
    s >= 75
      ? 'text-emerald-600 dark:text-emerald-400'
      : s >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400';
  const bandDot = (s) => (s >= 75 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-rose-500');

  // Collapsible controls pill — expanded shows zoom + fit + fullscreen toggle;
  // collapsed shows just a single icon. Auto-collapses on entering immersive.
  const [controlsExpanded, setControlsExpanded] = useState(true);
  useEffect(() => {
    setControlsExpanded(!immersive);
  }, [immersive]);
  // Compute the scale that makes a 210mm A4 page fit the viewport width
  // (with a small padding margin). Used for both the initial scale on mobile
  // and the explicit "Fit" button.
  const computeFitScale = () => {
    if (typeof window === 'undefined') return 1;
    const A4_PX = 793.7; // 210mm at 96dpi
    const padding = window.innerWidth < 768 ? 32 : 64;
    const available = window.innerWidth < 1024 ? window.innerWidth : window.innerWidth - 384;
    const fit = (available - padding) / A4_PX;
    return Math.max(0.3, Math.min(2.0, fit));
  };

  const [scale, setScale] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? computeFitScale() : 1
  );

  // Re-fit when the viewport changes — only update if the user hasn't manually
  // zoomed (we detect this via a ref so window resizes don't fight the user).
  const userZoomedRef = React.useRef(false);
  useEffect(() => {
    const handleResize = () => {
      if (!userZoomedRef.current && typeof window !== 'undefined' && window.innerWidth < 1024) {
        setScale(computeFitScale());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleZoomIn = () => {
    userZoomedRef.current = true;
    setScale((s) => Math.min(2.0, s + 0.1));
  };
  const handleZoomOut = () => {
    userZoomedRef.current = true;
    setScale((s) => Math.max(0.3, s - 0.1));
  };
  const handleFit = () => {
    userZoomedRef.current = false;
    setScale(computeFitScale());
  };

  // The CV preview uses `transform: scale()`, which scales visually but not
  // the layout box. If we hardcode the wrapper to 297mm * scale (one A4 page),
  // multi-page resumes get clipped — content extends beyond the wrapper's
  // allocated height, so the bottom is unreachable. Measure the rendered
  // content's actual height and scale that.
  const previewContentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(null);
  useLayoutEffect(() => {
    const el = previewContentRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let cancelled = false;
    const update = () => {
      if (!cancelled) setContentHeight(el.offsetHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    // Web fonts (Lora/Merriweather/…) may still be swapping from a fallback, which
    // changes the measured height vs the final PDF — re-measure once fonts settle.
    if (document.fonts?.ready) document.fonts.ready.then(update);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // Deps re-attach the observer once the preview mounts (after the loading screen
    // clears) and when the document switches (resume/cover) — an empty [] would run
    // only on the first commit, while previewContentRef is still null.
  }, [showLoader, application, activeTab]);

  // Paper geometry (A4 vs US Letter) + a live one-page-fit indicator derived from
  // the ResizeObserver-measured content height. Approximate — an indicator, not
  // an exact paginator.
  const paperWidth = design.paper === 'letter' ? '8.5in' : '210mm';
  const paperHeight = design.paper === 'letter' ? '11in' : '297mm';
  const paperLabel = design.paper === 'letter' ? 'Letter' : 'A4';
  const pageHeightPx = design.paper === 'letter' ? 1056 : 1122; // raw page height @96dpi
  // The PDF reserves margin on EVERY page, so the badge must divide by the real
  // per-page CONTENT height, not the raw page height — otherwise a CV that measures
  // ~1120px reads as "1 page" but prints as 2. These constants MUST stay in sync
  // with performDownload: PDF_MARGIN_PX ↔ pdfMargin ('10px'), and SPACER_MM ↔ the
  // thead/tfoot .margin-spacer height (5mm), which repeats on every printed page.
  const MM_TO_PX = 96 / 25.4; // ≈3.7795 px per mm @96dpi
  const PDF_MARGIN_PX = 10; // matches pdfMargin in performDownload
  const SPACER_MM = 5; // matches the thead/tfoot .margin-spacer height
  // Every page loses: Puppeteer top+bottom margin + the repeating table spacers (top+bottom).
  const reservedPerPagePx = 2 * PDF_MARGIN_PX + 2 * SPACER_MM * MM_TO_PX; // ≈57.8px
  const effectivePageHeightPx = pageHeightPx - reservedPerPagePx; // A4≈1064, Letter≈998
  const pageCount = contentHeight
    ? Math.max(1, Math.ceil(contentHeight / effectivePageHeightPx))
    : 1;

  const [error, setError] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Inline summary-trim modal (length-coach entry point).
  const [showSummaryTrim, setShowSummaryTrim] = useState(false);
  // The professional-summary section of the current CV markdown (drives the modal
  // + whether the coach offers the "Shorten your summary" jump-link).
  const currentSummary = useMemo(
    () => extractSummary(application?.optimizedCV || ''),
    [application?.optimizedCV]
  );
  // The draft to edit roles in. In draft mode the URL `id` IS the draft; for a job
  // Application the linked draft is `application.draftCVId`.
  const builderId = isDraftMode ? id : application?.draftCVId;

  // Ad & Unlock State
  const [downloadAdOpen, setDownloadAdOpen] = useState(false);
  const [showDownloadPaywall, setShowDownloadPaywall] = useState(false); // Web ₦500 download paywall
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [templateToUnlock, setTemplateToUnlock] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [adForCreditsOpen, setAdForCreditsOpen] = useState(false); // For earning credits within unlock modal
  const [creditSuccessModalOpen, setCreditSuccessModalOpen] = useState(false); // New success modal state
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false); // Feedback after download

  // Listen for global user updates
  useEffect(() => {
    const handleUserUpdate = (e) => {
      // console.log('ResumeReview received user update', e.detail);
      setUserProfile((prev) => ({ ...prev, ...e.detail }));
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
          // Match by application ID or by linked draft CV ID (for bundles)
          const app = res.data.find((a) => a._id === id || a.draftCVId === id);
          if (app) {
            // If Application has draftCVId but no optimizedCV (bundle flow),
            // fetch the draft and generate markdown from it
            if (!app.optimizedCV && app.draftCVId) {
              try {
                const draft = await CVService.getDraftById(app.draftCVId);
                if (draft) {
                  const { optimizedCV } = generateMarkdownFromDraft(draft);
                  app.optimizedCV = optimizedCV;
                  app.personalInfo = draft.personalInfo;
                }
              } catch (e) {
                console.error('Failed to load draft CV for bundle:', e);
              }
            }
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

            const isDraftComplete =
              !!draft.personalInfo?.fullName &&
              (draft.experience?.length || 0) > 0 &&
              (draft.projects?.length || 0) > 0 &&
              (draft.education?.length || 0) > 0 &&
              (draft.skills?.length || 0) > 0 &&
              !!draft.professionalSummary?.trim();

            setApplication({
              _id: draft._id,
              optimizedCV: optimizedCV,
              jobId: draft.targetJob
                ? { title: draft.targetJob.title, company: 'Target Role' }
                : {},
              fitScore: 'N/A', // Drafts don't have fit scores yet usually
              status: 'draft',
              isDraft: true,
              personalInfo: draft.personalInfo, // Include personal info for contact details merging
              isDraftComplete,
              rawDraft: draft,
            });
            return;
          }
        } catch (e) {
          console.error('Failed to load draft', e);
        }

        setError('Document not found');
        // toast.error("Document not found"); // Optional: Keep or remove toast if UI is enough
      } catch (error) {
        console.error('Failed to load data', error);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    const fetchUserProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        setUserProfile(res.data);
      } catch (error) {
        console.error('Failed to load user profile', error);
      }
    };

    if (id) {
      loadData();
      fetchUserProfile();
    }
  }, [id, navigate]);

  // Auto-save template preference
  useEffect(() => {
    if (!application || isDraftMode || !templateId) return;

    const saveTemplate = setTimeout(async () => {
      try {
        // Only save if it's different (optional optimization, but backend check is fine)
        await api.patch(`/applications/${application._id}/template`, { templateId });
        // console.log('Template preference saved:', templateId);
      } catch (error) {
        console.error('Failed to save template preference', error);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(saveTemplate);
  }, [templateId, application, isDraftMode]);

  // Listen for global user updates

  // Active paid status (mirrors TemplateSelector.isPaidActive): an unexpired
  // Flutterwave subscription, OR any non-free tier, OR the legacy manual `plan`
  // grant. Any of these unlocks every premium template.
  const isPaidActive = (u = {}) => {
    const exp = u?.subscription?.expiresAt;
    if (exp && new Date(exp).getTime() > Date.now()) return true; // active Flutterwave sub
    if (u?.tier && u.tier !== 'free') return true; // any paid tier
    return u?.plan === 'paid'; // legacy manual grant
  };

  // Unlocking Logic
  const isUnlocked = (templateId) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return true;
    if (!template.isPro) return true;
    if (isPaidActive(userProfile)) return true;
    if (userProfile?.unlockedTemplates && userProfile.unlockedTemplates.includes(templateId))
      return true;
    return false;
  };

  const handleUnlock = async () => {
    if (!templateToUnlock) return;
    setUnlocking(true);
    try {
      const res = await api.post('/billing/unlock-template', {
        templateId: templateToUnlock.id,
        cost: templateToUnlock.cost,
      });

      if (res.data.success) {
        toast.success('Template unlocked!');
        // Update local profile
        setUserProfile((prev) => ({
          ...prev,
          credits: res.data.credits,
          unlockedTemplates: res.data.unlockedTemplates,
        }));

        // Dispatch global event to update navbar and other components
        window.dispatchEvent(
          new CustomEvent('userDataUpdated', {
            detail: { credits: res.data.credits, unlockedTemplates: res.data.unlockedTemplates },
          })
        );
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.data.credits }));

        setTemplateId(templateToUnlock.id); // Select it
        setUnlockModalOpen(false);
        setTemplateToUnlock(null);
      }
    } catch (error) {
      console.error('Unlock failed', error);
      if (error.response?.data?.error === 'INSUFFICIENT_CREDITS') {
        toast.error('Insufficient A.I credits.');
      } else {
        toast.error('Failed to unlock template');
      }
    } finally {
      setUnlocking(false);
    }
  };

  // NATIVE ANDROID ONLY: AdMob SSV has already credited the account server-side,
  // so we just refresh the user profile. The AdPlayer never mounts on web, so
  // this only runs on native.
  const handleAdForCreditsComplete = async () => {
    setAdForCreditsOpen(false);
    try {
      const res = await api.get('/auth/me');
      // console.log('User profile refreshed:', res.data);
      setUserProfile(res.data);

      // Dispatch global event to update navbar and other components
      window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: res.data }));
      window.dispatchEvent(new CustomEvent('credit_updated', { detail: res.data.credits }));

      // Show success modal instead of toast + unlock modal
      setCreditSuccessModalOpen(true);
      // Ensure unlock modal is closed (though it should be already if we closed it before ad)
      setUnlockModalOpen(false);
    } catch (e) {
      console.error('Error in handleAdForCreditsComplete:', e);
      console.error('Error response:', e.response);

      // Provide more specific error message
      if (e.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        // Optionally redirect to login after a delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (e.response?.data?.message) {
        toast.error(`Failed to award credits: ${e.response.data.message}`);
      } else {
        toast.error('Failed to award credits. Please try again.');
      }

      // If failed, reopen unlock modal
      setUnlockModalOpen(true);
    }
  };

  // Download Ad Logic
  const performDownload = async () => {
    try {
      // Inline spinner on the button (isDownloading) — no overlay, no artificial
      // delay. Just generate and hand over the file.
      setIsDownloading(true);

      const elementId = activeTab === 'resume' ? 'resume-content' : 'cover-letter-content';
      const element = document.getElementById(elementId);
      if (!element)
        throw new Error(`${activeTab === 'resume' ? 'Resume' : 'Cover letter'} content not found`);

      // Clone and reset transform to ensure PDF is generated at 100% scale
      const clone = element.cloneNode(true);
      // Strip the on-screen preview watermark + any screenshot-guard blur so the
      // paid PDF is always clean.
      clone.querySelectorAll('[data-preview-watermark]').forEach((el) => el.remove());
      clone.style.filter = 'none';
      clone.style.transform = 'none';
      clone.style.transformOrigin = 'top left';
      clone.style.width = paperWidth;
      clone.style.minWidth = paperWidth;
      clone.style.minHeight = paperHeight;
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
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Merriweather:wght@400;700;900&family=Inter:wght@400;600;700&family=Lora:wght@400;500;600;700&display=swap" rel="stylesheet">
                    <style>
                        /* Backend renders with preferCSSPageSize:true, so this sets the PDF page size. */
                        @page { size: ${design.paper === 'letter' ? 'letter' : 'A4'}; }
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

      // 2. Call Backend with margin options. The visible margin is now the
      // template's own padding (in the cloned DOM), so keep the Puppeteer page
      // margin small + fixed — otherwise it would add a third layer of border.
      const pdfMargin = '10px';
      const blob = await CVService.generatePdf(
        fullHtml,
        {
          margin: {
            top: pdfMargin,
            right: pdfMargin,
            bottom: pdfMargin,
            left: pdfMargin,
          },
        },
        {
          templateId,
          applicationId: application._id,
          isDraft: isDraftMode,
        }
      );

      // 3. Download — works on both web (anchor click) and Capacitor (Filesystem + Share sheet)
      const filename = `${userProfile?.firstName ? [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ') : 'Document'}_${activeTab === 'resume' ? 'CV' : 'CoverLetter'}.pdf`;
      await downloadBlob(blob, filename);

      setIsDownloading(false);
      toast.success('PDF Downloaded');

      // Completion moment — interstitial (no-op on web / paid / non-eligible).
      triggerInterstitial('pdf_download_success');

      // Show the feedback prompt once per session, just after the download.
      const hasSeenFeedback = sessionStorage.getItem('feedback_prompt_shown');
      if (!hasSeenFeedback) {
        setTimeout(() => {
          setShowFeedbackPrompt(true);
          sessionStorage.setItem('feedback_prompt_shown', 'true');
        }, 800);
      }
    } catch (e) {
      console.error('PDF Download Error Details:', e);

      // CVService.generatePdf already decodes the blob 402 into a typed error.
      if (e.code === 'NEED_DOWNLOAD') {
        setShowDownloadPaywall(true);
        setIsDownloading(false);
        return;
      }

      // Because the request uses responseType: 'blob', other server errors arrive as blobs
      if (e.response && e.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          console.error('Server Error Response (decoded):', reader.result);
        };
        reader.readAsText(e.response.data);
      } else if (e.response) {
        console.error('Server Error Response:', e.response.data);
      }

      toast.error('Download failed');
      setIsDownloading(false); // Close immediately on error
    }
  };

  // Word (.docx) export — built from the CV DATA (no DOM clone needed). Same
  // gates as the PDF: a locked template opens the unlock modal, and a
  // NEED_DOWNLOAD 402 opens the same download paywall. One download unit covers
  // either format (the backend consumes it once).
  const handleDownloadDocx = async () => {
    // Locked template → unlock modal first (same gate as the PDF click).
    if (!isUnlocked(templateId)) {
      const template = TEMPLATES.find((t) => t.id === templateId);
      setTemplateToUnlock(template);
      setUnlockModalOpen(true);
      return;
    }

    try {
      setIsDownloadingDocx(true);

      const blob = await CVService.generateDocx(
        {
          markdown: application.optimizedCV,
          userProfile: mergedUserProfile || userProfile,
        },
        {
          applicationId: application._id,
          isDraft: isDraftMode,
          templateId,
        }
      );

      const filename = `${userProfile?.firstName ? [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ') : 'Document'}_${activeTab === 'resume' ? 'CV' : 'CoverLetter'}.docx`;
      await downloadBlob(blob, filename);

      setIsDownloadingDocx(false);
      toast.success('Word document downloaded');
      triggerInterstitial('docx_download_success');
    } catch (e) {
      console.error('DOCX Download Error Details:', e);

      // CVService.generateDocx decodes the blob 402 into a typed error.
      if (e.code === 'NEED_DOWNLOAD') {
        setShowDownloadPaywall(true);
        setIsDownloadingDocx(false);
        return;
      }

      // Because the request uses responseType: 'blob', other errors arrive as blobs.
      if (e.response && e.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          console.error('Server Error Response (decoded):', reader.result);
        };
        reader.readAsText(e.response.data);
      } else if (e.response) {
        console.error('Server Error Response:', e.response.data);
      }

      toast.error('Download failed');
      setIsDownloadingDocx(false);
    }
  };

  const handleDownloadClick = () => {
    // console.log('Download clicked. Template:', templateId);
    // 1. Check if unlocked
    if (!isUnlocked(templateId)) {
      // console.log('Template locked. Opening modal.');
      const template = TEMPLATES.find((t) => t.id === templateId);
      setTemplateToUnlock(template);
      setUnlockModalOpen(true);
      return;
    }

    // 2. Ad requirement — NATIVE APP ONLY. On the native app, downloads are paid
    // for by watching a rewarded ad (alternating: Ad, Free, Ad, Free...). On web
    // we dropped the click-ad: downloads are gated server-side (1 free, then a
    // ₦500 pass or a subscription) and the paywall is shown on a NEED_DOWNLOAD
    // error from performDownload.
    const isNativeApp = Capacitor.isNativePlatform();
    if (isNativeApp && userProfile?.plan !== 'paid') {
      const downloadCount = parseInt(localStorage.getItem('download_count') || '0');
      // Policy: 0 (1st) = Ad, 1 (2nd) = Free, 2 (3rd) = Ad, etc.
      if (downloadCount % 2 === 0) {
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

  // Auto-download after a successful CV-download purchase. When a free user pays
  // for the ₦750 single-download pass, BillingReturn sends them back here with
  // ?paid=1. The pass is now on their account, so we fire the download straight
  // away — a one-time pass should deliver the PDF, not dump them on a page to
  // hunt for the button again. The Download button stays visible as a fallback in
  // case the browser blocks the programmatic save (some mobile in-app webviews).
  const autoDownloadFiredRef = useRef(false);
  useEffect(() => {
    if (autoDownloadFiredRef.current) return;
    if (searchParams.get('paid') !== '1') return;
    // Wait until the application + preview are loaded so #resume-content exists
    // for serialization.
    if (loading || !application) return;

    autoDownloadFiredRef.current = true;

    // Strip ?paid=1 (keep any other params, e.g. tab) so a refresh won't re-fire.
    const cleanParams = new URLSearchParams(searchParams);
    cleanParams.delete('paid');
    const qs = cleanParams.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });

    toast.success('Payment confirmed — starting your download…');
    // Defer a tick so the preview DOM is painted before we serialize it.
    setTimeout(() => {
      performDownload();
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, application, searchParams]);

  // MERGE PROFILE DATA: Prioritize draft personal info (CV Builder) over user profile
  const mergedUserProfile = React.useMemo(() => {
    if (!userProfile) return null;

    // If we have draft data, merge it in
    if (isDraftMode && application?.personalInfo) {
      const draftInfo = application.personalInfo;
      // console.log("Merging draft info:", draftInfo);

      return {
        ...userProfile,
        // Direct overrides
        email: draftInfo.email || userProfile.email,
        phone: draftInfo.phone || userProfile.phone,
        location: draftInfo.address || userProfile.location, // Address field maps to location

        // LinkedIn & Website (CV Builder uses 'linkedin'/'website', Profile uses 'linkedinUrl'/'portfolioUrl')
        linkedinUrl: draftInfo.linkedin || userProfile.linkedinUrl,
        portfolioUrl: draftInfo.website || userProfile.portfolioUrl,

        // Name splitting if needed (Profile uses first/last, Draft uses fullName)
        firstName: draftInfo.fullName ? draftInfo.fullName.split(' ')[0] : userProfile.firstName,
        lastName: draftInfo.fullName
          ? draftInfo.fullName.split(' ').slice(1).join(' ')
          : userProfile.lastName,
        otherName: '', // Draft usually just has full name
      };
    }

    return userProfile;
  }, [userProfile, application, isDraftMode]);

  if (showLoader)
    return (
      <LoadingScreen
        messages={[
          'Loading your CV...',
          'Preparing templates...',
          'Getting everything ready...',
          'Almost there...',
        ]}
        showProgress={false}
        duration={30000}
      />
    );

  if (error)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-300">
            <LayoutTemplate size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Unavailable
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="w-full btn-primary py-3">
            Return to Dashboard
          </button>
        </div>
      </div>
    );

  if (!application) return null;

  const handleEdit = async () => {
    // Always use the loaded application's _id, not the URL :id. The URL param
    // can be a draftCVId when this page was reached via a bundle/edit flow,
    // and `/analysis/<draftId>/edit` would 404 with "application not found".
    const applicationId = application?._id || id;

    const toastId = toast.loading('Preparing your CV for editing...');
    try {
      const res = await api.post(`/analysis/${applicationId}/edit`);
      toast.dismiss(toastId);

      if (res.data.draftId) {
        if (res.data.cached) {
          toast.success('Resuming previous edit…');
        } else {
          toast.success('Draft created! Redirecting to builder...');
        }
        navigate(`/cv-builder/${res.data.draftId}`);
        return;
      }
      toast.error('Failed to create editable draft');
    } catch (error) {
      toast.dismiss(toastId);

      // The edit endpoint runs an LLM extraction (5-15s) before creating the
      // draft. An upstream proxy can drop the connection while the backend
      // finishes successfully. The backend stamps sourceApplicationId on the
      // draft so we can find it after a dropped POST.
      try {
        const drafts = await CVService.getMyDrafts();
        const recent = (drafts || []).find(
          (d) =>
            d.sourceApplicationId === applicationId || d.sourceApplicationId?._id === applicationId
        );
        if (recent && recent._id) {
          toast.success('Resuming the draft we already created…');
          navigate(`/cv-builder/${recent._id}`);
          return;
        }
      } catch (_) {
        /* fall through to error toast */
      }

      console.error('Edit failed', error);
      const code = error.response?.data?.code;
      const msg = error.response?.data?.message;
      if (code === 'AI_UNAVAILABLE') {
        toast.error(msg || 'AI is unavailable. You have not been charged.');
      } else {
        toast.error(msg || 'Failed to prepare edit mode. Please try again.');
      }
    }
  };

  if (isDraftMode && application && !application.isDraftComplete) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            {/* Locked Badge */}
            <div className="relative mb-6 mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Lock className="w-7 h-7 animate-pulse" />
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-white dark:border-slate-900">
                !
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 font-heading">
              Preview & Download Locked
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-sm mx-auto font-medium">
              You must complete all steps of your CV journey in the builder before you can view
              templates or download the PDF.
            </p>

            {/* Checklist of missing sections */}
            <div className="text-left bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 mb-6 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Required Sections
              </span>
              {[
                { label: 'Heading', done: !!application.rawDraft?.personalInfo?.fullName },
                {
                  label: 'Work History',
                  done: (application.rawDraft?.experience?.length || 0) > 0,
                },
                { label: 'Projects', done: (application.rawDraft?.projects?.length || 0) > 0 },
                { label: 'Education', done: (application.rawDraft?.education?.length || 0) > 0 },
                { label: 'Skills', done: (application.rawDraft?.skills?.length || 0) > 0 },
                { label: 'Summary', done: !!application.rawDraft?.professionalSummary?.trim() },
              ].map((sec, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                  <span
                    className={
                      sec.done
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-500 font-bold'
                    }
                  >
                    {idx + 1}. {sec.label}
                  </span>
                  <span
                    className={sec.done ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}
                  >
                    {sec.done ? (
                      <Check className="w-4 h-4 inline" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 inline" />
                    )}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate(`/cv-builder/${application._id}`)}
              className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 font-bold text-sm"
            >
              Return to CV Builder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-100 dark:bg-slate-900 flex flex-col relative">
      <DownloadPaywallModal
        open={showDownloadPaywall}
        onClose={() => setShowDownloadPaywall(false)}
      />

      <SummaryTrim
        open={showSummaryTrim}
        currentSummary={currentSummary}
        onApply={applySummary}
        onClose={() => setShowSummaryTrim(false)}
      />

      {downloadAdOpen && isAndroidNative() && (
        <AdPlayer
          userId={userProfile?._id || userProfile?.id}
          onComplete={handleDownloadAdComplete}
          onClose={() => setDownloadAdOpen(false)} // User can close, but won't get reward
          androidTitle="Unlock High-Quality PDF"
          androidSubtitle="Watch a short video to unlock your download instantly."
          androidButtonText="Unlock Download"
          androidSuccessTitle="Ready to Download!"
          androidSuccessMessage="Your PDF will start downloading shortly."
        />
      )}

      {adForCreditsOpen && isAndroidNative() && (
        <AdPlayer
          userId={userProfile?._id || userProfile?.id}
          onComplete={handleAdForCreditsComplete}
          onClose={() => setAdForCreditsOpen(false)}
        />
      )}

      {creditSuccessModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600 dark:text-green-300" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              A.I Credits Earned!
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              You successfully watched the ad.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold block mb-1">
                New Balance
              </span>
              <div className="flex items-center justify-center gap-2 text-3xl font-extrabold text-indigo-600 dark:text-indigo-300">
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
                className="w-full py-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {unlockModalOpen && templateToUnlock && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setUnlockModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <TemplateThumbnail
                  type={templateToUnlock.id}
                  className="w-full h-full rounded-lg shadow-md object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Unlock {templateToUnlock.name}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                This is a premium template. Unlock it to download and use for your applications.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleUnlock}
                disabled={unlocking || (userProfile?.credits || 0) < templateToUnlock.cost}
                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  (userProfile?.credits || 0) >= templateToUnlock.cost
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {unlocking ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                    Unlock for {templateToUnlock.cost} A.I Credits
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">
                    {isAndroidNative() ? 'or earn A.I credits' : 'or'}
                  </span>
                </div>
              </div>

              {isAndroidNative() ? (
                // NATIVE ANDROID: earn credits by watching a rewarded video.
                <>
                  <button
                    onClick={() => {
                      setUnlockModalOpen(false);
                      setAdForCreditsOpen(true);
                    }}
                    className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-100"
                  >
                    <PlayCircle className="w-5 h-5" />
                    View Offer for +5 A.I Credits
                  </button>

                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center leading-relaxed px-4">
                    💚 We use ads to keep ApplyRight free for everyone. Thank you for your support!
                  </p>
                </>
              ) : (
                // WEB: no ads. Buy more credits, or go unlimited (a plan unlocks
                // every premium template).
                <>
                  <button
                    onClick={() => navigate('/credits')}
                    className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Sparkles className="w-5 h-5" />
                    Get more credits
                  </button>
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="w-full py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
                  >
                    Or go unlimited — unlock all premium templates →
                  </button>
                </>
              )}

              {(userProfile?.credits || 0) < templateToUnlock.cost && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                  You have {userProfile?.credits || 0} A.I credits. Need{' '}
                  {templateToUnlock.cost - (userProfile?.credits || 0)} more.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Prompt Modal - After Download */}
      {showFeedbackPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative text-center">
            <button
              onClick={() => setShowFeedbackPrompt(false)}
              className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-300" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Enjoying ApplyRight?
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              Your CV is ready! We'd love to hear how your experience was. Your feedback helps us
              improve.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowFeedbackPrompt(false);
                  window.open('/feedback', '_blank');
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Give Feedback
              </button>
              <button
                onClick={() => setShowFeedbackPrompt(false)}
                className="w-full py-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium text-sm transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {!immersive && <Navbar />}

      {/* Page header — gives job context, back button, and tab toggle. */}
      {!immersive && (
        <div className="relative h-14 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
          {/* LEFT: back to edit */}
          <button
            type="button"
            onClick={() => navigate(isDraftMode ? '/dashboard' : '/history')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Back to edit</span>
          </button>

          {/* CENTER: title + PDF·A4 chip, absolutely centered together */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[calc(100%-9rem)] lg:max-w-[calc(100%-26rem)]">
            {isDraftMode ? (
              <h1 className="font-heading text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {titleValue || 'Untitled draft'}
              </h1>
            ) : (
              <h1 className="font-heading text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {application?.jobId?.title || application?.jobTitle || 'Untitled role'}
                {(application?.jobId?.company || application?.jobCompany) && (
                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                    {' '}
                    at {application?.jobId?.company || application?.jobCompany}
                  </span>
                )}
              </h1>
            )}
            {/* Live page-length coach — tappable badge with layout trims (resume
                only); a plain PDF·paper chip on the cover-letter tab. */}
            <LengthCoach
              pageCount={pageCount}
              paperLabel={paperLabel}
              design={design}
              setDesign={setDesign}
              activeTab={activeTab}
              onShortenSummary={() => setShowSummaryTrim(true)}
              canTrimSummary={!!currentSummary}
              onTrimRoles={() => navigate(`/cv-builder/${builderId}/history?trim=1`)}
              canTrimRoles={!!builderId}
            />
          </div>

          {/* RIGHT: tab toggle (non-draft) + desktop actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Resume / Cover Letter tab toggle — single source of truth in the
            header for all screen sizes. Labels collapse to "CV"/"Letter" on
            phones to keep the row compact alongside the back button + title.
            The dedicated 52px mobile tab strip we used to render below the
            header was eating into the CV preview height — gone now. */}
            {!isDraftMode && (
              <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('resume')}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeTab === 'resume'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="sm:hidden">CV</span>
                  <span className="hidden sm:inline">Resume</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cover-letter')}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeTab === 'cover-letter'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="sm:hidden">Letter</span>
                  <span className="hidden sm:inline">Cover Letter</span>
                </button>
              </div>
            )}
            {/* Desktop primary actions — the mobile action bar is the phone equivalent. */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={
                  isDraftMode
                    ? () => navigate(`/cv-builder/${application._id}/finalize`)
                    : handleEdit
                }
                className="inline-flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                <PenTool className="w-4 h-4" />
                <span>Edit</span>
              </button>
              {/* Download → PDF or Word (.docx). Same paywall/unlock gating. */}
              <div className="relative">
                <button
                  type="button"
                  disabled={isDownloading || isDownloadingDocx}
                  onClick={() => setDownloadMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={downloadMenuOpen}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-wait text-white font-semibold text-sm px-3.5 py-1.5 rounded-lg shadow-sm transition-colors"
                >
                  {isDownloading || isDownloadingDocx ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{`Download ${activeTab === 'resume' ? 'CV' : 'Letter'}`}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {downloadMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDownloadMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-2 z-50 w-56 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        disabled={isDownloading}
                        onClick={() => {
                          setDownloadMenuOpen(false);
                          handleDownloadClick();
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait transition-colors"
                      >
                        {isDownloading ? (
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                        <span>Download PDF</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={isDownloadingDocx}
                        onClick={() => {
                          setDownloadMenuOpen(false);
                          handleDownloadDocx();
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait transition-colors"
                      >
                        {isDownloadingDocx ? (
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                        ) : (
                          <FileType className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                        <span>Download Word (.docx)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!immersive && !advisoryDismissed && (
        <div className="bg-amber-50 dark:bg-amber-500/15 border-b border-amber-200 dark:border-amber-500/30 px-4 md:px-6 py-2.5 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-300" />
          <p className="text-[12px] sm:text-[13px] leading-snug flex-1">
            AI can introduce inaccuracies. Review every claim against your real experience and edit
            anything that overstates what you did — before you download, print, or submit.
          </p>
          <button
            type="button"
            onClick={dismissAdvisory}
            aria-label="Dismiss"
            className="p-1 -m-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 hover:bg-amber-100 dark:hover:bg-amber-500/25 rounded transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile: no internal overflow — let the page document scroll naturally
          so users always reach the bottom regardless of zoom. Desktop keeps
          the fixed-viewport split with each pane scrolling independently. */}
      <div className="flex-1 flex flex-col lg:flex-row-reverse lg:min-h-0 lg:overflow-hidden">
        {/* LEFT: Document Preview Area */}
        <div className="flex-1 overflow-x-auto custom-scrollbar p-4 pb-20 md:p-8 lg:pb-8 flex justify-center bg-slate-100 dark:bg-slate-950 relative min-h-[80vh] lg:min-h-0 lg:overflow-y-auto">
          {/* Zoom + view controls — collapses to a single icon on demand */}
          <motion.div
            layout
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className="fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 lg:left-[calc(50%+12rem)] z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-full flex items-center overflow-hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              {controlsExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1 p-1.5"
                >
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-12 text-center tabular-nums">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <span
                    className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5"
                    aria-hidden="true"
                  />
                  <button
                    onClick={handleFit}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                    title="Fit to screen"
                  >
                    <Maximize2 size={16} />
                  </button>
                  <span
                    className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5"
                    aria-hidden="true"
                  />
                  <button
                    onClick={toggleImmersive}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                    title={immersive ? 'Exit fullscreen' : 'Fullscreen CV'}
                    aria-label={immersive ? 'Exit fullscreen' : 'Fullscreen CV'}
                  >
                    {immersive ? <Shrink size={16} /> : <Expand size={16} />}
                  </button>
                  <span
                    className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5"
                    aria-hidden="true"
                  />
                  <button
                    onClick={() => setControlsExpanded(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="Collapse controls"
                    aria-label="Collapse controls"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setControlsExpanded(true)}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                  aria-label="Open controls"
                  title="Open controls"
                >
                  <SlidersHorizontal size={18} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Wrapper for Layout Sizing — height tracks the actual rendered
              content (resume or cover letter) so multi-page documents fully
              scroll into view at any zoom. Falls back to one A4 page until
              the ResizeObserver delivers its first measurement. */}
          <div
            className="shrink-0 transition-[width,height] duration-200 origin-top"
            style={{
              width: `calc(${paperWidth} * ${scale})`,
              height: contentHeight
                ? `${contentHeight * scale}px`
                : `calc(${paperHeight} * ${scale})`,
            }}
          >
            <div
              ref={previewContentRef}
              id="resume-content"
              className="cv-template-container bg-white shadow-2xl mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative transition-transform select-none"
              style={{
                width: paperWidth,
                minWidth: paperWidth,
                minHeight: paperHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                // Copy-protection: block long-press callout / drag-to-save on mobile.
                WebkitTouchCallout: 'none',
                // Design tab: accent + line-height vars (templates consume them in
                // 2b) and fully-functional page margins.
                '--cv-accent': design.accent || undefined,
                '--cv-font': design.font || undefined,
                '--cv-leading':
                  design.density === 'compact' ? 1.35 : design.density === 'relaxed' ? 1.7 : 1.5,
                // The template renders its own padded white page — drive that
                // padding via --cv-margin so there's no second frame around it.
                // undefined at Normal → each template keeps its own designed padding.
                '--cv-margin':
                  design.margins === 'narrow'
                    ? '1.5rem'
                    : design.margins === 'wide'
                      ? '3.5rem'
                      : undefined,
              }}
              onContextMenu={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              {/* Faint anti-screenshot watermark — free users only; stripped from
                  the PDF clone in performDownload, so downloads are always clean. */}
              {userProfile?.plan !== 'paid' && (
                <PreviewWatermark dark={templateId === 'luxury-royal'} />
              )}
              {/* Blur + "Content hidden" cover while the tab is hidden/unfocused. */}
              <ScreenshotCover show={screenshotObscured} />

              {/* Tab Switcher inside the paper (optional) or floating above? Let's put it floating above in the layout or switch the content */}

              {activeTab === 'resume' ? (
                /* RESUME TEMPLATE RENDER */
                templateId === 'modern' ? (
                  <ModernCleanTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'modern-professional' ? (
                  <ModernProfessionalTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'ats-clean' ? (
                  <ATSCleanTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'student-ats' ? (
                  <StudentATSTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'minimal' ? (
                  <MinimalistTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'minimal-serif' ? (
                  <MinimalistSerifTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'minimal-grid' ? (
                  <MinimalistGridTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'minimal-mono' ? (
                  <MinimalistMonoTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'creative' ? (
                  <CreativePortfolioTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'executive' ? (
                  <ExecutiveLeadTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'tech' ? (
                  <TechStackTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'swiss' ? (
                  <SwissModernTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'luxury' ? (
                  <ElegantLuxuryTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'luxury-royal' ? (
                  <LuxuryRoyalTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'luxury-chic' ? (
                  <LuxuryChicTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'luxury-classic' ? (
                  <LuxuryClassicTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'luxury-gold' ? (
                  <LuxuryGoldTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'executive-board' ? (
                  <ExecutiveBoardTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'executive-strategy' ? (
                  <ExecutiveStrategyTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'executive-corporate' ? (
                  <ExecutiveCorporateTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'tech-devops' ? (
                  <TechDevOpsTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'tech-silicon' ? (
                  <TechSiliconTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'tech-google' ? (
                  <TechGoogleTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'executive-energy' ? (
                  <ExecutiveEnergyTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'energy-slb' ? (
                  <EnergySLBTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'energy-total' ? (
                  <EnergyTotalTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'energy-seplat' ? (
                  <EnergySeplatTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'energy-halliburton' ? (
                  <EnergyHalliburtonTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : templateId === 'energy-nlng' ? (
                  <EnergyNLNGTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                ) : (
                  /* Unknown/legacy templateId → safe ATS-clean default so saved
                     CVs referencing a no-longer-offered template still render. */
                  <ATSCleanTemplate
                    markdown={application.optimizedCV}
                    userProfile={mergedUserProfile || userProfile}
                  />
                )
              ) : (
                /* COVER LETTER RENDER */
                <div id="cover-letter-content" className="bg-white min-h-screen">
                  <div className="p-12">
                    <div className="mb-8 border-b border-slate-200 pb-6">
                      {/* Simple Header for Cover Letter */}
                      <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {mergedUserProfile?.firstName
                          ? [
                              mergedUserProfile.firstName,
                              mergedUserProfile.otherName,
                              mergedUserProfile.lastName,
                            ]
                              .filter(Boolean)
                              .join(' ')
                          : 'Your Name'}
                      </h1>
                      <div className="text-sm text-slate-500 flex flex-wrap gap-4">
                        {mergedUserProfile?.email && <span>{mergedUserProfile.email}</span>}
                        {mergedUserProfile?.phone && <span>{mergedUserProfile.phone}</span>}
                      </div>
                    </div>
                    {application.coverLetter ? (
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
                              className="mb-4 text-slate-700 leading-relaxed whitespace-pre-line text-base font-serif"
                              {...props}
                            />
                          ),
                        }}
                      >
                        {application.coverLetter}
                      </ReactMarkdown>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Mail className="w-10 h-10 mb-3 text-slate-300" />
                        <p className="font-medium text-slate-500">
                          Cover letter not yet generated.
                        </p>
                        <p className="text-sm mt-1">
                          Generate one from the Dashboard to see it here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile sticky action bar — surfaces Download + Edit directly so users
            don't need to discover the sidebar to find the primary actions. The
            "More" button opens the existing sidebar drawer for templates etc.
            Hidden in fullscreen so the CV truly fills the screen. */}
        {!immersive && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDownloadSheetOpen(true)}
              aria-haspopup="menu"
              aria-expanded={downloadSheetOpen}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {isDownloading || isDownloadingDocx ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {isDownloading || isDownloadingDocx
                  ? 'Working…'
                  : `Download ${activeTab === 'resume' ? 'CV' : 'Letter'}`}
              </span>
              {downloadSheetOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={
                isDraftMode
                  ? () => navigate(`/cv-builder/${application?._id}/finalize`)
                  : handleEdit
              }
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm px-3 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              aria-label="Edit"
            >
              <PenTool className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2.5 rounded-lg flex items-center justify-center transition-all"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile download chooser bottom sheet — mirrors the desktop PDF/Word
            split menu. Gating lives inside the handlers, not here. */}
        {downloadSheetOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/40 z-50"
              onClick={() => setDownloadSheetOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
              <button
                type="button"
                role="menuitem"
                disabled={isDownloading}
                onClick={() => {
                  setDownloadSheetOpen(false);
                  handleDownloadClick();
                }}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait transition-colors"
              >
                {isDownloading ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                )}
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={isDownloadingDocx}
                onClick={() => {
                  setDownloadSheetOpen(false);
                  handleDownloadDocx();
                }}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait transition-colors"
              >
                {isDownloadingDocx ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                ) : (
                  <FileType className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
                <span>Download Word (.docx)</span>
              </button>
            </div>
          </>
        )}

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* RIGHT: Sidebar Tools */}
        <div
          className={`
          fixed lg:relative inset-x-0 bottom-0 z-50 lg:z-20
          w-full lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-xl
          lg:h-full
          transition-transform duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
          h-[85vh] lg:max-h-none
          rounded-t-2xl lg:rounded-none
        `}
        >
          {/* Mobile drag handle */}
          <div className="lg:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
          </div>

          {/* Mobile close — drawer dismiss on phones (drag handle sits above). */}
          <div className="lg:hidden flex justify-end px-4 pb-1 -mt-1">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 dark:text-slate-500"
              aria-label="Close panel"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Draft CV name — moved here from the toolbar so editing it on mobile
                doesn't shift/overlap the toolbar row. Reuses the same handlers. */}
            {isDraftMode && (
              <div className="px-5 pt-3.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 block mb-1.5">
                  CV name
                </label>
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  onBlur={commitDraftTitle}
                  placeholder="Untitled draft"
                  className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-transparent rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            )}
            {/* a) Insights strip — collapsible editorial summary (replaces the pastel boxes). */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              {!isDraftMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setInsightsOpen((v) => !v)}
                    className="w-full flex items-center gap-2.5 text-left"
                    aria-expanded={insightsOpen}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${bandDot(application?.fitScore ?? 0)}`}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 flex-1">
                      Fit score
                    </span>
                    <span
                      className={`font-heading text-lg font-bold tabular-nums ${bandText(application?.fitScore ?? 0)}`}
                    >
                      {application?.fitScore ?? 0}%
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 dark:text-slate-500 transition-transform ${insightsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {insightsOpen && (
                    <div className="mt-3 space-y-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Optimized for{' '}
                        {application?.jobId?.title || application?.jobTitle || 'the role'}.
                      </p>
                      {/* Free users get the standard analysis (GPT-4o-mini); nudge them
                          toward the premium ApplyRight ATS analysis (GPT-4o). */}
                      {userProfile?.plan !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => navigate('/upgrade')}
                          className="inline-flex items-start gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:underline text-left"
                        >
                          <Crown className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          Upgrade to ApplyRight ATS for our sharpest, recruiter-grade analysis
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : atsReadiness ? (
                <>
                  <button
                    type="button"
                    onClick={() => setInsightsOpen((v) => !v)}
                    className="w-full flex items-center gap-2.5 text-left"
                    aria-expanded={insightsOpen}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${bandDot(atsReadiness.score)}`}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 flex-1">
                      ATS readiness
                    </span>
                    <span
                      className={`font-heading text-lg font-bold tabular-nums ${bandText(atsReadiness.score)}`}
                    >
                      {atsReadiness.score}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 dark:text-slate-500 transition-transform ${insightsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {insightsOpen && (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        {atsReadiness.checks?.map((check, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {check.passed ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                            )}
                            <span
                              className={
                                check.passed
                                  ? 'text-slate-600 dark:text-slate-300'
                                  : 'text-slate-500 dark:text-slate-400'
                              }
                            >
                              {check.label}
                              {check.detail && (
                                <span className="text-slate-400 dark:text-slate-500 ml-1">
                                  ({check.detail})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                      {atsReadiness.tips?.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-1.5">
                            Tips
                          </p>
                          <ul className="space-y-1">
                            {atsReadiness.tips.slice(0, 3).map((tip, i) => (
                              <li
                                key={i}
                                className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex gap-1.5"
                              >
                                <span className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                                  –
                                </span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Live draft preview
                </p>
              )}
            </div>

            {/* b) Rail tabs — Templates / Design (indigo underline like the masthead). */}
            <div className="px-5 flex gap-5 border-b border-slate-100 dark:border-slate-800">
              {['templates', 'design'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRailTab(tab)}
                  className={`relative py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                    railTab === tab
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                  {railTab === tab && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* c/d) Rail body — Templates (grouped) or the Design placeholder. */}
            <div className="p-5">
              {activeTab !== 'resume' ? (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-14 px-4 leading-relaxed">
                  Template styles apply to the CV. Switch to Resume to choose one.
                </p>
              ) : railTab === 'design' ? (
                <div className="space-y-6">
                  {/* Typeface — body-font override via --cv-font. Curated Google
                      Fonts (loaded in index.html + injected into the PDF head); each
                      template keeps its own font as the fallback when Default. */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2.5">
                      Typeface
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Default', value: '' },
                        { label: 'Inter', value: 'Inter, sans-serif' },
                        { label: 'Source Sans', value: "'Source Sans 3', sans-serif" },
                        { label: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
                        { label: 'Merriweather', value: 'Merriweather, serif' },
                        { label: 'Lora', value: 'Lora, serif' },
                      ].map((f) => (
                        <button
                          key={f.label}
                          type="button"
                          onClick={() => setDesign((d) => ({ ...d, font: f.value }))}
                          className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2.5 transition-all ${
                            design.font === f.value
                              ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <span
                            className="text-lg leading-none text-slate-900 dark:text-slate-100"
                            style={{ fontFamily: f.value || undefined }}
                          >
                            Aa
                          </span>
                          <span className="max-w-full truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            {f.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent — sets --cv-accent; templates paint it in 2b. */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2.5">
                      Accent
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Default = clear accent → each template's own default. */}
                      <button
                        type="button"
                        onClick={() => setDesign((d) => ({ ...d, accent: '' }))}
                        className={`h-8 px-3 rounded-full border text-[11px] font-semibold transition-all ${
                          design.accent === ''
                            ? 'border-indigo-600 ring-2 ring-indigo-600/30 text-slate-900 dark:text-slate-100'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        Default
                      </button>
                      {[
                        { name: 'Navy', hex: '#1e3a5f' },
                        { name: 'Slate', hex: '#334155' },
                        { name: 'Indigo', hex: '#4f46e5' },
                        { name: 'Emerald', hex: '#047857' },
                        { name: 'Burgundy', hex: '#7c2d12' },
                        { name: 'Charcoal', hex: '#111827' },
                      ].map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          onClick={() => setDesign((d) => ({ ...d, accent: sw.hex }))}
                          title={sw.name}
                          aria-label={sw.name}
                          className={`w-8 h-8 rounded-full transition-all ${
                            design.accent === sw.hex
                              ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                              : 'ring-1 ring-black/10 dark:ring-white/10 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Margins — fully functional: preview padding + PDF margin. */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2.5">
                      Margins
                    </p>
                    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                      {['narrow', 'normal', 'wide'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDesign((d) => ({ ...d, margins: m }))}
                          className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                            design.margins === m
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paper size — sets the preview dimensions + the PDF @page size. */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2.5">
                      Paper size
                    </p>
                    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                      {[
                        { value: 'a4', label: 'A4' },
                        { value: 'letter', label: 'Letter' },
                      ].map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setDesign((d) => ({ ...d, paper: p.value }))}
                          className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            design.paper === p.value
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Density — sets --cv-leading; templates read it in 2b. */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2.5">
                      Density
                    </p>
                    <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                      {['compact', 'normal', 'relaxed'].map((den) => (
                        <button
                          key={den}
                          type="button"
                          onClick={() => setDesign((d) => ({ ...d, density: den }))}
                          className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                            design.density === den
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {den}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 scrollbar-none">
                  {['Simple', 'Professional', 'Editorial', 'Industry'].map((groupName) => {
                    const groupTemplates = TEMPLATES.filter((t) => t.group === groupName);
                    if (!groupTemplates.length) return null;
                    return (
                      <div key={groupName} className="space-y-2.5">
                        <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                          {groupName}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {groupTemplates.map((t) => {
                            const locked = !isUnlocked(t.id);
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setTemplateId(t.id);
                                  setMobileSidebarOpen(false);
                                }}
                                className={`cursor-pointer rounded-lg border overflow-hidden transition-all ${
                                  templateId === t.id
                                    ? 'border-indigo-600 ring-1 ring-indigo-600'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                              >
                                {/* Live mini-render of the actual CV in this style. */}
                                <div className="relative flex justify-center overflow-hidden bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                                  <TemplatePreviewThumb
                                    templateId={t.id}
                                    markdown={application.optimizedCV}
                                    userProfile={mergedUserProfile || userProfile}
                                  />
                                  {/* Faint dim on locked styles. */}
                                  {locked && (
                                    <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/50" />
                                  )}
                                  {/* Recommended tag (kept from 1b). */}
                                  {t.isRecommended && (
                                    <span className="absolute top-1 left-1 font-mono text-[8px] uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-500/20 rounded px-1 py-0.5 leading-none">
                                      Recommended
                                    </span>
                                  )}
                                  {/* Lock icon on gated styles. */}
                                  {locked && (
                                    <div className="absolute top-1 right-1 p-0.5 bg-slate-800/90 rounded">
                                      <Lock size={10} className="text-white" />
                                    </div>
                                  )}
                                  {/* Tier badge — FREE / {cost} CR / PRO. */}
                                  <div
                                    className={`absolute bottom-1 right-1 px-1.5 py-0.5 text-[8px] font-bold rounded leading-none ${
                                      t.cost === 0
                                        ? 'bg-emerald-500 text-white'
                                        : locked
                                          ? 'bg-slate-800 text-white'
                                          : 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                    }`}
                                  >
                                    {t.cost === 0 ? 'FREE' : locked ? `${t.cost} CR` : 'PRO'}
                                  </div>
                                </div>
                                {/* Caption. */}
                                <div
                                  className={`flex items-center gap-1.5 px-2 py-1.5 ${
                                    templateId === t.id
                                      ? 'bg-indigo-50/50 dark:bg-indigo-500/10'
                                      : ''
                                  }`}
                                >
                                  <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                                    {t.name}
                                  </span>
                                  {templateId === t.id && (
                                    <Check
                                      size={13}
                                      className="shrink-0 text-indigo-600 dark:text-indigo-400"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeReview;
