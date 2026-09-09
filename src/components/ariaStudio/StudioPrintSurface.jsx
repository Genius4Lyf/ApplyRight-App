import React from 'react';
import CVTemplateRenderer from '../CVTemplateRenderer';
import { groundColor } from '../../data/templates';
import { designVars, designClassName, typeScaleStyle } from '../../lib/cvDesignVars';
import { CV_DESIGN_CSS } from '../../lib/cvDesignCss';
import { paperGeometry } from '../../lib/cvPageGeometry';
import { resolveDesign } from '../../lib/cvDesign';

// The PDF path serialises a rendered DOM node, so the Studio needs one — but the Studio
// is a chat, with no CV on screen. This mounts the CV off-screen purely so
// `downloadPdf` has something to clone.
//
// The wrapper markup is the same shape ResumeReview renders (`#resume-content`, the
// paper dimensions, the design CSS vars templates consume) rather than a second
// invented one, because cvDownload's serialization was written against exactly this.
//
// Positioned off-screen rather than `display:none`: a hidden subtree has no layout, so
// the clone would serialise with collapsed dimensions and the PDF would come out empty.
//
// IT NOW HONOURS THE SAVED DESIGN. It used to hardcode `--cv-leading: 1.5` and nothing
// else, on the reasoning that the design controls "live in the editor, and this surface
// exists to produce a file". That reasoning stopped holding the moment the design became a
// property of the DOCUMENT rather than of the browser it was last opened in: the same CV
// downloaded from the Studio came out in different type, margins and spacing than the same
// CV downloaded from the editor, with nothing on screen to explain why. It also hardcoded
// A4, so a CV set to Letter printed at the wrong size from here.
const StudioPrintSurface = ({ application, userProfile }) => {
  if (!application) return null;

  const templateId = application.templateId;
  // Server-stored only — there is no localStorage fallback to consult, because this
  // surface may be printing a CV this browser has never opened in the editor.
  const design = resolveDesign(null, application.design);
  const { width, height } = paperGeometry(design.paper);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '-10000px',
        top: 0,
        width,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      {/* Section spacing — rules, not variables, so they have to be present in the
          document being cloned as well as in the PDF's own head. */}
      <style>{CV_DESIGN_CSS}</style>
      <div
        id="resume-content"
        className={`cv-template-container ${designClassName(design)}`}
        style={{
          width,
          minWidth: width,
          minHeight: height,
          // The PAGE takes the template's paper colour. This is the download, so a
          // hardcoded white here shipped a real white band in the PDF whenever a tinted
          // template's content ran short of the page — not just a preview glitch.
          // groundColor, not paperColor: it honours the user's page-colour choice where
          // the template allows one, and falls back to the template's own where it does not.
          backgroundColor: groundColor(templateId, design.ground),
          ...designVars(design, { templateId, paperWidth: width }),
        }}
      >
        <div style={typeScaleStyle(templateId)}>
          <CVTemplateRenderer application={application} userProfile={userProfile} />
        </div>
      </div>
    </div>
  );
};

export default StudioPrintSurface;
