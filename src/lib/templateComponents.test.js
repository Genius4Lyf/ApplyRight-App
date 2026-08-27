// @vitest-environment jsdom
//
// jsdom for the PDF block at the bottom — buildPrintHtml clones a real DOM node.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATES, paperColor, DEFAULT_PAPER, sidebarFill } from '../data/templates';
import { TEMPLATE_COMPONENTS } from './templateComponents';
import { buildPrintHtml } from './cvDownload';

// Read a template's SOURCE, to check the registry against what the template really draws.
// Resolved from the package root (vitest's cwd) — `import.meta.url` does not resolve to a
// usable path under jsdom on Windows.
const readTemplateSource = (name) =>
  readFileSync(join(process.cwd(), 'src/components/templates', `${name}.jsx`), 'utf8');

// Two facts about a template that used to be written down in more than one place, and
// drifted. Both defects below shipped silently — nothing threw, nothing logged, the
// thumbnails even looked right. These are the tests that would have caught them.

describe('every offered template can actually be rendered', () => {
  // THE regression guard. Three ids were renamed in the picker ('professional' →
  // 'modern-professional', 'minimalist-serif' → 'minimal-serif', 'minimalist-grid' →
  // 'minimal-grid') and not in CVTemplateRenderer, which resolves an unknown id by
  // quietly falling back to ATS Clean. Users picked Modern Professional and downloaded
  // ATS Clean — in the live preview, the view modal, and the PDF they paid for.
  it('resolves every id in the picker to a component', () => {
    const unrenderable = TEMPLATES.filter((template) => !TEMPLATE_COMPONENTS[template.id]).map(
      (template) => template.id
    );
    expect(unrenderable).toEqual([]);
  });

  it('offers every component it knows about', () => {
    // The other direction: a component mapped here but absent from the picker is either a
    // template nobody can choose, or an id that has been renamed out from under it.
    const offered = new Set(TEMPLATES.map((template) => template.id));
    const unreachable = Object.keys(TEMPLATE_COMPONENTS).filter((id) => !offered.has(id));
    expect(unreachable).toEqual([]);
  });

  it('maps a real component, not a truthy accident', () => {
    Object.entries(TEMPLATE_COMPONENTS).forEach(([id, Component]) => {
      expect(typeof Component, `${id} should map to a component`).toBe('function');
    });
  });
});

describe('paper colour — the page behind the CV', () => {
  // A template paints its own paper only as far as its content goes; the A4 page it sits
  // on is taller. Unless the page paints the SAME colour, a short CV on a tinted template
  // ends in a hard white block partway down.
  const TINTED = {
    'modern-professional': '#f7f6f2',
    'minimal-serif': '#fcfbf7',
    'the-profile': '#faf8f4',
    'operations-blueprint': '#fbfaf7',
  };

  it('knows the four tinted templates', () => {
    // Read off each template's own root element. If one of these changes its paper and
    // this is not updated, the break comes back — so the values are pinned, not derived.
    Object.entries(TINTED).forEach(([id, hex]) => {
      expect(paperColor(id), `${id} paper`).toBe(hex);
    });
  });

  it('treats every other template as white', () => {
    const unexpected = TEMPLATES.filter(
      (template) => !TINTED[template.id] && paperColor(template.id) !== DEFAULT_PAPER
    ).map((template) => template.id);
    expect(unexpected).toEqual([]);
  });

  it('always answers, even for an id it has never heard of', () => {
    // Legacy CVs carry ids the picker no longer offers. The page still has to be painted
    // something — returning undefined would leave the modal's backdrop showing through.
    expect(paperColor('luxury-gold')).toBe(DEFAULT_PAPER);
    expect(paperColor(undefined)).toBe(DEFAULT_PAPER);
    expect(paperColor('')).toBe(DEFAULT_PAPER);
  });
});

describe('the PDF page takes the paper colour too', () => {
  // The band was never preview-only. buildPrintHtml strips the clone's page-floor so the
  // CV node ends with its content, but the PDF PAGE is still a full sheet — so whatever
  // `body` is painted shows below it, and the old 'transparent' printed as white.
  const node = () => {
    const el = document.createElement('div');
    el.id = 'resume-content';
    el.innerHTML = '<p>Ada Lovelace</p>';
    return el;
  };

  const html = (templateId, isDarkTemplate = false) =>
    buildPrintHtml(node(), {
      paperWidth: '210mm',
      paperHeight: '297mm',
      paper: 'a4',
      isDarkTemplate,
      templateId,
    });

  it('paints a tinted template’s own paper', () => {
    expect(html('modern-professional')).toContain('background: #f7f6f2');
  });

  it('paints white for an ordinary template', () => {
    expect(html('ats-clean')).toContain('background: #ffffff');
  });

  it('leaves Royal Elegance its dark page', () => {
    // That template is designed against the dark sheet — the paper colour must not win.
    expect(html('luxury-royal', true)).toContain('background: #0f172a');
  });
});

describe('the full-height sidebar band', () => {
  // A sidebar is laid out in flow, so it ends where its own content ends — leaving the
  // coloured column stopping partway down a page that is deliberately taller than the CV.
  // Six templates use a sidebar as a design element and need a band behind them.
  const WITH_SIDEBAR = [
    'applyright-navy',
    'applyright-mono',
    'slate-timeline',
    'navy-portrait',
    'sales-sidebar',
    'minimal-grid',
  ];

  it('knows exactly which templates need one', () => {
    const found = TEMPLATES.filter((template) => sidebarFill(template.id)).map((t) => t.id);
    expect(found.sort()).toEqual([...WITH_SIDEBAR].sort());
  });

  it('gives every one of them a side, a width and a colour', () => {
    // All three are needed to draw the band, and a width that disagrees with the
    // template's own sidebar shows as a seam down the page.
    WITH_SIDEBAR.forEach((id) => {
      const spec = sidebarFill(id);
      expect(spec.side, `${id} side`).toBe('left');
      expect(spec.width, `${id} width`).toMatch(/^\d+%$/);
      expect(spec.className, `${id} colour`).toMatch(/bg-\[#[0-9a-f]{3,8}\]/i);
    });
  });

  it('answers null for a template without one, and for ids it has never seen', () => {
    expect(sidebarFill('ats-clean')).toBeNull();
    expect(sidebarFill('luxury-gold')).toBeNull();
    expect(sidebarFill(undefined)).toBeNull();
  });

  it('matches each template’s own sidebar width', () => {
    // The band is drawn from this registry while the template draws its own column from
    // its `w-[…]` class. If the two disagree the page shows a stripe — and the PDF, which
    // reads the width off the template instead, would disagree with the preview.
    const source = {
      'applyright-navy': 'ApplyRightNavyTemplate',
      'applyright-mono': 'ApplyRightMonoTemplate',
      'minimal-grid': 'MinimalistGridTemplate',
    };
    Object.entries(source).forEach(([id, file]) => {
      const text = readTemplateSource(file);
      const sidebarTag = text.slice(text.indexOf('data-cv-sidebar'));
      const width = sidebarTag.match(/\bw-\[([^\]]+)\]/)?.[1];
      expect(width, `${file} declares a sidebar width`).toBeTruthy();
      expect(sidebarFill(id).width, `${id} band vs template`).toBe(width);
    });
  });
});
