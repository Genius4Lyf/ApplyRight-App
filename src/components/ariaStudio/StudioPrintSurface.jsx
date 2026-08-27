import React from 'react';
import CVTemplateRenderer from '../CVTemplateRenderer';
import { paperColor } from '../../data/templates';

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
const A4 = { width: '210mm', height: '297mm' };

const StudioPrintSurface = ({ application, userProfile }) => {
  if (!application) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '-10000px',
        top: 0,
        width: A4.width,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <div
        id="resume-content"
        className="cv-template-container"
        style={{
          width: A4.width,
          minWidth: A4.width,
          minHeight: A4.height,
          // The PAGE takes the template's paper colour. This is the download, so a
          // hardcoded white here shipped a real white band in the PDF whenever a tinted
          // template's content ran short of the page — not just a preview glitch.
          backgroundColor: paperColor(application.templateId),
          // Studio downloads use each template's own designed spacing — the accent /
          // margin / density controls live in the editor, and this surface exists to
          // produce a file, not to be a second design tool.
          '--cv-leading': 1.5,
        }}
      >
        <CVTemplateRenderer application={application} userProfile={userProfile} />
      </div>
    </div>
  );
};

export default StudioPrintSurface;
