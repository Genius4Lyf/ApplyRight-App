import React, { useLayoutEffect, useRef, useState } from 'react';

// The id → component map is SHARED (lib/templateComponents). It used to be declared
// here with a comment saying CVTemplateRenderer's keys deliberately differed — which is
// exactly how three templates ended up rendering as ATS Clean everywhere except these
// thumbnails. One list now.
import { TEMPLATE_COMPONENTS } from '../lib/templateComponents';
import { paperColor, sidebarFill } from '../data/templates';

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

// The page itself, at full A4 width — the callers below scale it down. Falls back through
// the shared map rather than a locally-imported component: this line used to name
// `ATSCleanTemplate`, which stopped being imported when the map moved to
// lib/templateComponents. An unknown id would have thrown a ReferenceError here — a crash
// instead of the fallback it was written to be.
//
// A FULL SHEET, not just the content. The sample CV is shorter than A4, and a bare
// template ends where its content does — which on a sidebar template left the coloured
// column stopping partway down with white paper beneath it, in a picker whose whole job is
// judging how a template looks. CV Studio and the Studio preview both already fix this the
// same way (the page keeps its paper colour, and an out-of-flow band carries the sidebar to
// the bottom edge, from the shared `sidebarFill` registry). This is that treatment, third
// surface, same source.
const Inner = ({ templateId }) => {
  const Comp = TEMPLATE_COMPONENTS[templateId] || TEMPLATE_COMPONENTS['ats-clean'];
  const sidebar = sidebarFill(templateId);

  return (
    <div
      className={`relative ${sidebar ? 'cv-continuous-sidebar' : ''}`}
      style={{
        width: A4_WIDTH_PX,
        minHeight: A4_HEIGHT_PX,
        backgroundColor: paperColor(templateId),
      }}
    >
      {sidebar && (
        <div
          aria-hidden="true"
          className={`absolute inset-y-0 ${sidebar.className}`}
          style={{ [sidebar.side]: 0, width: sidebar.width, zIndex: 0 }}
        />
      )}
      <div className="relative">
        <Comp markdown={SAMPLE_MARKDOWN} userProfile={SAMPLE_USER_PROFILE} />
      </div>
    </div>
  );
};

// Live, scaled, non-interactive mini-render of one template with fixed sample
// content, so every template is directly comparable regardless of the user's
// actual CV length. Rendered at the template's DEFAULT styling — the design vars
// (accent/font/…) are deliberately NOT applied here; the main preview shows the
// applied design.
// `fluid` renders at whatever width the parent gives it, measured, instead of a fixed px
// value. The picker used a hardcoded 110px at every size, so the same small thumbnail was
// shown on a phone sheet and in a 384px desktop rail, leaving room unused in both.
const TemplatePreviewThumb = ({
  templateId,
  fluid = false,
  width = 150,
  height = Math.round(width * (A4_HEIGHT_PX / A4_WIDTH_PX)),
}) => {
  const boxRef = useRef(null);
  const [measured, setMeasured] = useState(0);

  useLayoutEffect(() => {
    if (!fluid) return undefined;
    const box = boxRef.current;
    if (!box) return undefined;
    // jsdom and older browsers have no ResizeObserver; the first measurement still lands,
    // which is all a rail that only resizes with the window strictly needs.
    setMeasured(box.clientWidth);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setMeasured(entry.contentRect.width || box.clientWidth)
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, [fluid]);

  if (fluid) {
    return (
      <div
        ref={boxRef}
        className="w-full"
        style={{ aspectRatio: `${A4_WIDTH_PX} / ${A4_HEIGHT_PX}`, overflow: 'hidden' }}
        aria-hidden="true"
      >
        {measured > 0 && (
          <div
            style={{
              width: A4_WIDTH_PX,
              transform: `scale(${measured / A4_WIDTH_PX})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          >
            <Inner templateId={templateId} />
          </div>
        )}
      </div>
    );
  }

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
        <Inner templateId={templateId} />
      </div>
    </div>
  );
};

export default React.memo(TemplatePreviewThumb);
