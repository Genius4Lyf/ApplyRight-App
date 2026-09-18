// @vitest-environment jsdom
//
// EVERY SIDEBAR TEMPLATE PUTS THE SAME THINGS IN ITS RAIL.
//
// The util that decides the split is unit-tested next door, but a correct decision that
// no template renders is worth nothing — six of these seven wire it up separately, each
// with its own markup, and "forgot to render one of the four" is invisible until someone
// looks at a PDF. So this renders the real components and reads the real DOM.
//
// It also pins the load-bearing structural facts the PDF depends on: the rail carries
// `data-cv-sidebar`, and it has a main-column sibling on the correct side (cvDownload pins
// the rail and pushes that sibling clear; cvDesignVars measures it for the page count).
import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { TEMPLATE_COMPONENTS } from '../../lib/templateComponents';
import { sidebarOf } from '../../data/templates';

afterEach(cleanup);

const CV = `# Jordan Reyes

## Professional Summary
Operations lead with a decade behind the counter.

## Work History
### Senior Operations Manager

#### Acme Logistics | 2021 - Present

- Led a team of 12 and cut turnaround by 18%.

## Skills
- **Technical Skills:** Excel, SQL, Tableau

## Education
### B.Sc. Business Administration

#### State University | 2014 - 2018

## Certifications
- **Six Sigma Green Belt** — ASQ, 2020

## Languages
- **English** — Native
`;

const PROFILE = { firstName: 'Jordan', lastName: 'Reyes', email: 'j@example.com' };

const SIDEBAR_TEMPLATE_IDS = [
  'applyright-mono',
  'applyright-navy',
  'applyright-band',
  'applyright-band-twin',
  'minimal-grid',
  'slate-timeline',
  'navy-portrait',
  'sales-sidebar',
];

const renderTemplate = (id) => {
  const Comp = TEMPLATE_COMPONENTS[id];
  const { container } = render(<Comp markdown={CV} userProfile={PROFILE} />);
  const rail = container.querySelector('[data-cv-sidebar]');
  return { container, rail };
};

describe('sidebar templates carry the CV in their rail', () => {
  it.each(SIDEBAR_TEMPLATE_IDS)('%s renders a rail with a main-column sibling', (id) => {
    const { rail } = renderTemplate(id);
    expect(rail).toBeTruthy();

    // The side decides which sibling is the main column — and both the PDF fix-up and the
    // page-count measurement resolve it exactly this way.
    const spec = sidebarOf(id);
    const main = spec.side === 'right' ? rail.previousElementSibling : rail.nextElementSibling;
    expect(main).toBeTruthy();
    expect(main.textContent).toContain('Senior Operations Manager');
  });

  it.each(SIDEBAR_TEMPLATE_IDS)(
    '%s puts Skills, Education and Certifications in the rail',
    (id) => {
      const { rail } = renderTemplate(id);
      // A one-page CV like this one fits comfortably in every rail, so all of it lands there.
      expect(rail.textContent).toContain('Excel');
      expect(rail.textContent).toContain('B.Sc. Business Administration');
      expect(rail.textContent).toContain('Six Sigma Green Belt');
    }
  );

  it.each(SIDEBAR_TEMPLATE_IDS)('%s does not ALSO leave them in the main column', (id) => {
    // The bug this prevents is duplication: extracted into the rail but never removed from
    // the body, so the CV prints its certifications twice.
    const { rail, container } = renderTemplate(id);
    const spec = sidebarOf(id);
    const main = spec.side === 'right' ? rail.previousElementSibling : rail.nextElementSibling;
    expect(main.textContent).not.toContain('Six Sigma Green Belt');
    expect(main.textContent).not.toContain('B.Sc. Business Administration');
    // …and exactly one rail, so the queries above cannot have read the wrong node.
    expect(container.querySelectorAll('[data-cv-sidebar]')).toHaveLength(1);
  });

  it('spills the heaviest section back to the main column rather than clipping it', () => {
    // The rail cannot paginate — see lib/cvSidebarSections. On a CV too long for it, the
    // overflow must still be ON the page, in the main column.
    const certs = Array.from(
      { length: 40 },
      (_, i) =>
        `- **Advanced Professional Certification in Operations Management, Level ${i + 1}** — International Institute of Operations Excellence, 2020`
    ).join('\n');
    const longCv = CV.replace('- **Six Sigma Green Belt** — ASQ, 2020', certs);

    const Comp = TEMPLATE_COMPONENTS['minimal-grid'];
    const { container } = render(<Comp markdown={longCv} userProfile={PROFILE} />);
    const rail = container.querySelector('[data-cv-sidebar]');

    expect(rail.textContent).not.toContain('Level 40');
    expect(container.textContent).toContain('Level 40');
  });
});
