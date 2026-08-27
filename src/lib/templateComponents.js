import ATSCleanTemplate from '../components/templates/ATSCleanTemplate';
import StudentATSTemplate from '../components/templates/StudentATSTemplate';
import ModernProfessionalTemplate from '../components/templates/ModernProfessionalTemplate';
import ModernCleanTemplate from '../components/templates/ModernCleanTemplate';
import MinimalistSerifTemplate from '../components/templates/MinimalistSerifTemplate';
import MinimalistGridTemplate from '../components/templates/MinimalistGridTemplate';
import ExecutiveCorporateTemplate from '../components/templates/ExecutiveCorporateTemplate';
import ExecutiveEnergyTemplate from '../components/templates/ExecutiveEnergyTemplate';
import OperationsBlueprintTemplate from '../components/templates/OperationsBlueprintTemplate';
import ApplyRightNavyTemplate from '../components/templates/ApplyRightNavyTemplate';
import ApplyRightMonoTemplate from '../components/templates/ApplyRightMonoTemplate';
import ApplyRightBandTemplate from '../components/templates/ApplyRightBandTemplate';
import ApplyRightBandTwinTemplate from '../components/templates/ApplyRightBandTwinTemplate';
import TheProfileTemplate from '../components/templates/TheProfileTemplate';
import TheAscentTemplate from '../components/templates/TheAscentTemplate';
import {
  AngularCorporateTemplate,
  NavyPortraitTemplate,
  SalesSidebarTemplate,
  SlateTimelineTemplate,
} from '../components/templates/SignatureCollectionTemplates';

/**
 * THE id → template component map. One list, deliberately.
 *
 * There used to be two, and they drifted. When the picker was pruned some ids were
 * renamed ('professional' → 'modern-professional', 'minimalist-serif' → 'minimal-serif',
 * 'minimalist-grid' → 'minimal-grid') in data/templates.js and in the thumbnail strip,
 * but NOT in CVTemplateRenderer — which resolves an unknown id by silently falling back
 * to ATS Clean. So anyone picking one of those three got the right thumbnail and the
 * wrong document: in Aria Studio's live preview, in the CV view modal, and in the PDF
 * they paid to download. Nothing errored; it just quietly handed them another template.
 *
 * Every id here must appear in data/templates.js and vice versa — templateComponents.test
 * asserts exactly that, so the next rename fails a test instead of shipping.
 */
export const TEMPLATE_COMPONENTS = {
  'ats-clean': ATSCleanTemplate,
  'student-ats': StudentATSTemplate,
  'modern-professional': ModernProfessionalTemplate,
  modern: ModernCleanTemplate,
  'minimal-serif': MinimalistSerifTemplate,
  'minimal-grid': MinimalistGridTemplate,
  'executive-corporate': ExecutiveCorporateTemplate,
  'executive-energy': ExecutiveEnergyTemplate,
  'operations-blueprint': OperationsBlueprintTemplate,
  'applyright-navy': ApplyRightNavyTemplate,
  'applyright-mono': ApplyRightMonoTemplate,
  'applyright-band': ApplyRightBandTemplate,
  'applyright-band-twin': ApplyRightBandTwinTemplate,
  'the-profile': TheProfileTemplate,
  'the-ascent': TheAscentTemplate,
  'slate-timeline': SlateTimelineTemplate,
  'navy-portrait': NavyPortraitTemplate,
  'angular-corporate': AngularCorporateTemplate,
  'sales-sidebar': SalesSidebarTemplate,
};

export default TEMPLATE_COMPONENTS;
