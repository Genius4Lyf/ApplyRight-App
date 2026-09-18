import { describe, expect, it } from 'vitest';
import {
  SIDEBAR_KEYS,
  SIDEBAR_METRICS,
  extractSection,
  planSidebar,
  removeSections,
} from './cvSidebarSections';

/**
 * The rail cannot paginate — buildPrintHtml pins it and Chrome repeats it per page, so
 * anything past one page is clipped out of a PDF the user paid for. These tests are about
 * that: what gets in, what spills back to the main column, and that nothing is ever lost
 * between the two.
 */

const SHORT_CV = `# Jordan Reyes

## Professional Summary
Operations lead.

## Work History
### Senior Operations Manager

#### Acme | 2021 - Present

- Led a team of 12.

## Skills
- **Technical Skills:** Excel, SQL

## Education
### B.Sc. Business Administration

#### State University | 2014 - 2018

## Certifications
- **Six Sigma Green Belt** — ASQ, 2020

## Languages
- **English** — Native
`;

// The same CV with a longer Certifications section — the section most likely to grow, and
// the one whose lines wrap hardest in a rail this narrow.
const longCv = (certCount) => {
  const certs = Array.from(
    { length: certCount },
    (_, i) =>
      `- **Advanced Professional Certification in Operations Management, Level ${i + 1}** — International Institute of Operations Excellence, 202${i % 10}`
  ).join('\n');
  return SHORT_CV.replace('- **Six Sigma Green Belt** — ASQ, 2020', certs);
};

describe('pulling a section out of the markdown', () => {
  it('finds a section by its English heading', () => {
    expect(extractSection(SHORT_CV, 'education')).toContain('B.Sc. Business Administration');
    expect(extractSection(SHORT_CV, 'certifications')).toContain('Six Sigma Green Belt');
  });

  it('finds the SAME section by its French heading', () => {
    // Stored markdown is canonical English, but localizeCvMarkdown rewrites headings to
    // French at the render layer and a template renders whichever it is handed.
    const french = SHORT_CV.replace('## Education', '## Formation').replace(
      '## Skills',
      '## Compétences'
    );
    expect(extractSection(french, 'education')).toContain('B.Sc. Business Administration');
    expect(extractSection(french, 'skills')).toContain('Excel');
  });

  it('returns nothing for a section the CV does not have', () => {
    expect(extractSection('## Skills\n- One\n', 'certifications')).toBe('');
  });

  it('reports the heading as the document writes it, so a rail can title the block', () => {
    const french = SHORT_CV.replace('## Education', '## Formation');
    expect(planSidebar(SHORT_CV, 'navy-portrait').headings.education).toBe('Education');
    expect(planSidebar(french, 'navy-portrait').headings.education).toBe('Formation');
  });

  it('removes only what it is asked to remove', () => {
    const left = removeSections(SHORT_CV, ['education']);
    expect(left).not.toContain('B.Sc. Business Administration');
    expect(left).toContain('Six Sigma Green Belt');
    expect(left).toContain('Senior Operations Manager');
  });
});

describe('deciding what the rail can hold', () => {
  it('takes all four sections when the CV is short', () => {
    const { sidebarKeys } = planSidebar(SHORT_CV, 'navy-portrait', { contactCount: 4 });
    expect(sidebarKeys).toEqual(['skills', 'languages', 'certifications', 'education']);
  });

  it('spills Education first, then Certifications', () => {
    // The order the user chose: Skills is the last thing to leave the rail.
    const { sidebarKeys } = planSidebar(longCv(14), 'applyright-mono', {
      hasPhoto: true,
      contactCount: 5,
    });
    expect(sidebarKeys).toContain('skills');
    expect(sidebarKeys).not.toContain('education');
  });

  it('never admits a section while a higher-priority one was turned away', () => {
    // Strict priority, not best-fit packing: a short Education must not slip into the rail
    // over a Certifications section that did not fit.
    const { sidebarKeys } = planSidebar(longCv(14), 'applyright-mono', {
      hasPhoto: true,
      contactCount: 5,
    });
    const denied = SIDEBAR_KEYS.findIndex((key) => !sidebarKeys.includes(key));
    SIDEBAR_KEYS.slice(denied).forEach((key) => expect(sidebarKeys).not.toContain(key));
  });

  it('keeps Skills in the rail when the heavy sections cannot fit', () => {
    // The floor: what survives in the narrowest rail on a huge CV is the layout these
    // templates already ship — Skills, plus anything genuinely tiny (Languages is one line).
    const { sidebarKeys } = planSidebar(longCv(60), 'minimal-grid', {
      hasPhoto: true,
      contactCount: 5,
    });
    expect(sidebarKeys).toContain('skills');
    expect(sidebarKeys).not.toContain('certifications');
    expect(sidebarKeys).not.toContain('education');
  });

  it('never loses a section — what spills is still in the main column', () => {
    const { sidebar, sidebarKeys, mainMarkdown } = planSidebar(longCv(40), 'applyright-mono', {
      hasPhoto: true,
      contactCount: 5,
    });
    SIDEBAR_KEYS.forEach((key) => {
      const inRail = sidebarKeys.includes(key);
      const heading = key === 'certifications' ? '## Certifications' : null;
      if (heading && !inRail) expect(mainMarkdown).toContain(heading);
      if (inRail) expect(sidebar[key]).toBeTruthy();
    });
    // The one that matters most: a certification is never in neither place.
    const railHasCerts = sidebarKeys.includes('certifications');
    expect(railHasCerts || mainMarkdown.includes('Advanced Professional Certification')).toBe(true);
  });

  it('takes a section out of the main column once the rail has it', () => {
    const { sidebarKeys, mainMarkdown } = planSidebar(SHORT_CV, 'navy-portrait', {
      contactCount: 3,
    });
    expect(sidebarKeys).toContain('education');
    expect(mainMarkdown).not.toContain('B.Sc. Business Administration');
    // …and the sections that were never the rail's business are untouched.
    expect(mainMarkdown).toContain('Senior Operations Manager');
  });

  it('gives the narrowest rail the smallest budget', () => {
    const narrow = planSidebar(SHORT_CV, 'minimal-grid', { hasPhoto: true, contactCount: 4 });
    const wide = planSidebar(SHORT_CV, 'sales-sidebar', { hasPhoto: true, contactCount: 4 });
    expect(narrow.budgetPx).toBeLessThan(wide.budgetPx);
  });

  it('leaves a photo-less rail more room than a photo-bearing one', () => {
    const withPhoto = planSidebar(SHORT_CV, 'slate-timeline', { hasPhoto: true });
    const without = planSidebar(SHORT_CV, 'slate-timeline', { hasPhoto: false });
    expect(without.budgetPx).toBeGreaterThan(withPhoto.budgetPx);
  });

  it('never exceeds its own budget', () => {
    Object.keys(SIDEBAR_METRICS).forEach((id) => {
      const { estPx, budgetPx } = planSidebar(longCv(12), id, { hasPhoto: true, contactCount: 5 });
      expect(estPx).toBeLessThanOrEqual(budgetPx);
    });
  });

  it('hands an unregistered template the whole CV and an empty rail', () => {
    const { sidebarKeys, mainMarkdown } = planSidebar(SHORT_CV, 'ats-clean');
    expect(sidebarKeys).toEqual([]);
    expect(mainMarkdown).toContain('## Skills');
  });

  it('survives a CV with none of these sections, and a missing one', () => {
    expect(planSidebar('## Work History\n### Role\n', 'applyright-navy').sidebarKeys).toEqual([]);
    expect(planSidebar(undefined, 'applyright-navy').sidebarKeys).toEqual([]);
  });
});
