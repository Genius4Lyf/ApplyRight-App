import React from 'react';

// The id → component map is SHARED (lib/templateComponents). It used to be declared
// here with a comment saying CVTemplateRenderer's keys deliberately differed — which is
// exactly how three templates ended up rendering as ATS Clean everywhere except these
// thumbnails. One list now.
import { TEMPLATE_COMPONENTS } from '../lib/templateComponents';



// A4 width in px at 96dpi (210mm). The inner page renders at this width and is
// scaled down to fit the thumbnail; overflow is clipped so only the top of the
// CV shows.
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1122; // 297mm @96dpi — keep the thumb's aspect ratio true

// Fixed preview content — every template in the picker renders THIS, not the
// user's real CV. Rationale: templates lay out content differently (sidebar vs
// single-column, denser vs airier), so the SAME variable-length real CV renders
// at a different visual "fullness" per template, making them look inconsistent
// and impossible to fairly compare. A fixed sample makes every thumbnail show
// the same amount of content, so what differs is only the template's design.
const SAMPLE_MARKDOWN = `## Professional Summary
Results-driven professional with 5+ years of experience delivering measurable outcomes across cross-functional teams. Skilled in stakeholder communication, process improvement, and data-informed decision making across fast-paced, deadline-driven environments.

## Work History
### Senior Operations Manager

#### Acme Logistics Group | 2021 - Present

- Led a team of 12 to streamline warehouse operations, reducing turnaround time by 18%.
- Partnered with engineering to launch a new tracking system adopted company-wide.
- Managed vendor relationships worth $2M annually, negotiating a 9% cost reduction.
- Redesigned the shift-handoff process, cutting miscommunication incidents by 30%.

### Operations Analyst

#### Meridian Supply Co. | 2018 - 2021

- Built weekly reporting dashboards used by 30+ regional managers.
- Identified process gaps that cut order-processing errors by 25%.
- Trained 15 new hires on inventory systems and safety compliance procedures.

### Logistics Coordinator

#### Harborview Freight | 2016 - 2018

- Coordinated daily freight schedules across 8 regional distribution hubs.
- Reduced late-delivery rate from 12% to 4% within the first year.

## Skills
- **Technical Skills:** Excel, SQL, Tableau, Salesforce, SAP
- **Soft Skills:** Leadership, Communication, Problem Solving, Negotiation
- **Languages:** English, French

## Education
### B.Sc. in Business Administration

#### State University | 2014 - 2018

## Certifications
- **Six Sigma Green Belt** — ASQ, 2020
- **Project Management Fundamentals** — PMI, 2019

## Projects
### Regional Efficiency Initiative
- Rolled out a cross-site standard operating procedure adopted at 6 locations.
- Cut average fulfillment time by 22% within the first quarter.

### Vendor Consolidation Program
- Reduced active supplier count from 40 to 24 without disrupting service levels.
`;

const SAMPLE_USER_PROFILE = {
  firstName: 'Jordan',
  lastName: 'Reyes',
  currentJobTitle: 'Senior Operations Manager',
  email: 'jordan.reyes@example.com',
  phone: '+1 555 0134',
  location: 'Austin, TX',
  linkedinUrl: 'linkedin.com/in/jordanreyes',
  // Deliberately no photoUrl — templates already render correctly without one
  // (photo is optional everywhere), and this avoids needing a placeholder image.
};

// Live, scaled, non-interactive mini-render of one template with fixed sample
// content, so every template is directly comparable regardless of the user's
// actual CV length. Rendered at the template's DEFAULT styling — the design vars
// (accent/font/…) are deliberately NOT applied here; the main preview shows the
// applied design.
const TemplatePreviewThumb = ({
  templateId,
  width = 150,
  height = Math.round(width * (A4_HEIGHT_PX / A4_WIDTH_PX)),
}) => {
  const Comp = TEMPLATE_COMPONENTS[templateId] || ATSCleanTemplate;

  return (
    <div style={{ width, height, overflow: 'hidden', position: 'relative' }} aria-hidden="true">
      <div
        style={{
          width: A4_WIDTH_PX,
          transform: `scale(${width / A4_WIDTH_PX})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <Comp markdown={SAMPLE_MARKDOWN} userProfile={SAMPLE_USER_PROFILE} />
      </div>
    </div>
  );
};

export default React.memo(TemplatePreviewThumb);
