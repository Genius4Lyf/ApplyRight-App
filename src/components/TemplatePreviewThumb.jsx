import React from 'react';

// Kept templates — mapped by their REAL ids (must match ResumeReview's render
// ternary / templates.js). NOTE: intentionally NOT reusing CVTemplateRenderer,
// whose id keys differ (e.g. 'minimalist', 'professional').
import ATSCleanTemplate from './templates/ATSCleanTemplate';
import StudentATSTemplate from './templates/StudentATSTemplate';
import ModernProfessionalTemplate from './templates/ModernProfessionalTemplate';
import ModernCleanTemplate from './templates/ModernCleanTemplate';
import MinimalistSerifTemplate from './templates/MinimalistSerifTemplate';
import MinimalistGridTemplate from './templates/MinimalistGridTemplate';
import ExecutiveCorporateTemplate from './templates/ExecutiveCorporateTemplate';
import ExecutiveEnergyTemplate from './templates/ExecutiveEnergyTemplate';
import ApplyRightNavyTemplate from './templates/ApplyRightNavyTemplate';
import ApplyRightMonoTemplate from './templates/ApplyRightMonoTemplate';
import ApplyRightBandTemplate from './templates/ApplyRightBandTemplate';

const TEMPLATE_COMPONENTS = {
  'ats-clean': ATSCleanTemplate,
  'student-ats': StudentATSTemplate,
  'modern-professional': ModernProfessionalTemplate,
  modern: ModernCleanTemplate,
  'minimal-serif': MinimalistSerifTemplate,
  'minimal-grid': MinimalistGridTemplate,
  'executive-corporate': ExecutiveCorporateTemplate,
  'executive-energy': ExecutiveEnergyTemplate,
  'applyright-navy': ApplyRightNavyTemplate,
  'applyright-mono': ApplyRightMonoTemplate,
  'applyright-band': ApplyRightBandTemplate,
};

// A4 width in px at 96dpi (210mm). The inner page renders at this width and is
// scaled down to fit the thumbnail; overflow is clipped so only the top of the
// CV shows.
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1122; // 297mm @96dpi — keep the thumb's aspect ratio true

// Live, scaled, non-interactive mini-render of one template with the user's CV.
// Rendered at the template's DEFAULT styling — the design vars (accent/font/…)
// are deliberately NOT applied here; the main preview shows the applied design.
const TemplatePreviewThumb = ({
  templateId,
  markdown,
  userProfile,
  width = 150,
  height = Math.round(150 * (A4_HEIGHT_PX / A4_WIDTH_PX)), // ≈212
}) => {
  const Comp = TEMPLATE_COMPONENTS[templateId] || ATSCleanTemplate;

  return (
    <div style={{ width, height, overflow: 'hidden', position: 'relative' }} aria-hidden="true">
      <div
        style={{
          width: A4_WIDTH_PX,
          minHeight: A4_HEIGHT_PX,
          transform: `scale(${width / A4_WIDTH_PX})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <Comp markdown={markdown} userProfile={userProfile} />
      </div>
    </div>
  );
};

export default React.memo(TemplatePreviewThumb);
