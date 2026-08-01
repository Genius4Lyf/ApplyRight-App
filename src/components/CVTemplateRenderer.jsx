import React, { useMemo } from 'react';
import { localizeCvMarkdown } from '../lib/cvLabels';

// Template components — same set the full ResumeReview / Preview use.
import ATSCleanTemplate from './templates/ATSCleanTemplate';
import StudentATSTemplate from './templates/StudentATSTemplate';
import ModernProfessionalTemplate from './templates/ModernProfessionalTemplate';
import ModernCleanTemplate from './templates/ModernCleanTemplate';
import MinimalistTemplate from './templates/MinimalistTemplate';
import MinimalistSerifTemplate from './templates/MinimalistSerifTemplate';
import MinimalistGridTemplate from './templates/MinimalistGridTemplate';
import MinimalistMonoTemplate from './templates/MinimalistMonoTemplate';
import CreativePortfolioTemplate from './templates/CreativePortfolioTemplate';
import ExecutiveLeadTemplate from './templates/ExecutiveLeadTemplate';
import TechStackTemplate from './templates/TechStackTemplate';
import SwissModernTemplate from './templates/SwissModernTemplate';
import ElegantLuxuryTemplate from './templates/ElegantLuxuryTemplate';
import LuxuryRoyalTemplate from './templates/LuxuryRoyalTemplate';
import LuxuryChicTemplate from './templates/LuxuryChicTemplate';
import LuxuryClassicTemplate from './templates/LuxuryClassicTemplate';
import LuxuryGoldTemplate from './templates/LuxuryGoldTemplate';
import ExecutiveBoardTemplate from './templates/ExecutiveBoardTemplate';
import ExecutiveStrategyTemplate from './templates/ExecutiveStrategyTemplate';
import ExecutiveCorporateTemplate from './templates/ExecutiveCorporateTemplate';
import TechDevOpsTemplate from './templates/TechDevOpsTemplate';
import TechSiliconTemplate from './templates/TechSiliconTemplate';
import TechGoogleTemplate from './templates/TechGoogleTemplate';
import ExecutiveEnergyTemplate from './templates/ExecutiveEnergyTemplate';
import OperationsBlueprintTemplate from './templates/OperationsBlueprintTemplate';
import ApplyRightBandTemplate from './templates/ApplyRightBandTemplate';
import ApplyRightBandTwinTemplate from './templates/ApplyRightBandTwinTemplate';
import ApplyRightMonoTemplate from './templates/ApplyRightMonoTemplate';
import ApplyRightNavyTemplate from './templates/ApplyRightNavyTemplate';
import EnergySLBTemplate from './templates/EnergySLBTemplate';
import EnergyTotalTemplate from './templates/EnergyTotalTemplate';
import EnergySeplatTemplate from './templates/EnergySeplatTemplate';
import EnergyHalliburtonTemplate from './templates/EnergyHalliburtonTemplate';
import EnergyNLNGTemplate from './templates/EnergyNLNGTemplate';
import TheProfileTemplate from './templates/TheProfileTemplate';
import TheAscentTemplate from './templates/TheAscentTemplate';
import {
  AngularCorporateTemplate,
  NavyPortraitTemplate,
  SalesSidebarTemplate,
  SlateTimelineTemplate,
} from './templates/SignatureCollectionTemplates';

// Pure, read-only CV renderer. Takes an application (with `optimizedCV` markdown
// and `templateId`) and renders it with the same template components used by the
// full CV page — so the inline preview matches the real thing exactly.
const TEMPLATES = {
  'ats-clean': ATSCleanTemplate,
  modern: ModernCleanTemplate,
  minimalist: MinimalistTemplate,
  'minimalist-serif': MinimalistSerifTemplate,
  'minimalist-grid': MinimalistGridTemplate,
  'minimalist-mono': MinimalistMonoTemplate,
  'student-ats': StudentATSTemplate,
  professional: ModernProfessionalTemplate,
  swiss: SwissModernTemplate,
  creative: CreativePortfolioTemplate,
  tech: TechStackTemplate,
  'tech-devops': TechDevOpsTemplate,
  'tech-silicon': TechSiliconTemplate,
  'tech-google': TechGoogleTemplate,
  luxury: ElegantLuxuryTemplate,
  'luxury-royal': LuxuryRoyalTemplate,
  'luxury-chic': LuxuryChicTemplate,
  'luxury-classic': LuxuryClassicTemplate,
  'luxury-gold': LuxuryGoldTemplate,
  executive: ExecutiveLeadTemplate,
  'executive-board': ExecutiveBoardTemplate,
  'executive-strategy': ExecutiveStrategyTemplate,
  'executive-corporate': ExecutiveCorporateTemplate,
  'executive-energy': ExecutiveEnergyTemplate,
  'operations-blueprint': OperationsBlueprintTemplate,
  'applyright-band': ApplyRightBandTemplate,
  'applyright-band-twin': ApplyRightBandTwinTemplate,
  'applyright-mono': ApplyRightMonoTemplate,
  'applyright-navy': ApplyRightNavyTemplate,
  'energy-slb': EnergySLBTemplate,
  'energy-total': EnergyTotalTemplate,
  'energy-seplat': EnergySeplatTemplate,
  'energy-halliburton': EnergyHalliburtonTemplate,
  'energy-nlng': EnergyNLNGTemplate,
  'the-profile': TheProfileTemplate,
  'the-ascent': TheAscentTemplate,
  'slate-timeline': SlateTimelineTemplate,
  'navy-portrait': NavyPortraitTemplate,
  'angular-corporate': AngularCorporateTemplate,
  'sales-sidebar': SalesSidebarTemplate,
};

// Extract a minimal contact profile from the CV markdown (same heuristic as Preview).
const extractUserProfile = (markdown = '') => {
  const profile = {};
  try {
    const nameMatch = markdown.match(/^#\s+(.+)$/m);
    if (nameMatch) profile.fullName = nameMatch[1].trim();
    const emailMatch = markdown.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/);
    if (emailMatch) profile.email = emailMatch[0];
    const phoneMatch = markdown.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) profile.phone = phoneMatch[0];
    const linkedinMatch = markdown.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/);
    if (linkedinMatch) profile.linkedin = linkedinMatch[0];
  } catch {
    /* best-effort */
  }
  return profile;
};

const CVTemplateRenderer = ({ application, userProfile }) => {
  const rawMarkdown = application?.optimizedCV || '';

  // Templates render their own header from `userProfile` (name, email, phone,
  // location, linkedinUrl…) and strip their own H1 from the body. So pass the
  // REAL profile (from /auth/me) and the FULL markdown — exactly as the resume
  // page does — falling back to markdown-extracted contact only if no profile.
  const profile = useMemo(() => {
    if (userProfile && Object.keys(userProfile).length) return userProfile;
    return extractUserProfile(rawMarkdown);
  }, [userProfile, rawMarkdown]);

  // Section LABELS are translated at this render boundary only — the stored
  // markdown keeps its canonical English headings so markdownParser can read the
  // CV back. Covers every template at once, and the PDF (a serialization of this
  // DOM) inherits it. A CV with no outputLang renders English, exactly as before.
  const localizedMarkdown = useMemo(
    () => localizeCvMarkdown(rawMarkdown, application?.outputLang || 'en'),
    [rawMarkdown, application?.outputLang]
  );

  // Unknown/legacy templateId falls back to the safe, ATS-clean default.
  const Template = TEMPLATES[application?.templateId] || ATSCleanTemplate;
  return (
    <div className="cv-template-container bg-white text-black text-left">
      <Template markdown={localizedMarkdown} userProfile={profile} />
    </div>
  );
};

export default CVTemplateRenderer;
