// @vitest-environment jsdom
//
// THE DESIGN → CSS MAPPING.
//
// Four surfaces read this and only one of them is React, so a mistake here shows up in
// the downloaded PDF rather than on screen. Most of these assertions are about the
// difference between a property being SET TO A DEFAULT and being ABSENT — the templates
// use `var(--cv-x, their-own-value)` nineteen times over, and a fallback only fires when
// the property is genuinely missing.
import { describe, it, expect } from 'vitest';
import {
  designVars,
  designClassName,
  typeScaleStyle,
  supportsTypeScale,
  flowElementFor,
  applyDesignToNode,
  TYPE_SCALE,
  LEADING,
} from './cvDesignVars';
import { TEMPLATES, sidebarFill, GROUND_EDITABLE_IDS } from '../data/templates';

const plain = TEMPLATES.find((t) => !t.sidebar).id;
const sidebarTemplate = TEMPLATES.find((t) => t.sidebar).id;

describe('what it sets and what it leaves alone', () => {
  it('leaves --cv-margin ABSENT at normal, so each template keeps its own padding', () => {
    // The nineteen templates were each designed with their own page padding. "Normal" is
    // not one number — it is nineteen, and the only way to say so is to say nothing.
    expect(designVars({ margins: 'normal' }, { templateId: plain })).not.toHaveProperty(
      '--cv-margin'
    );
    expect(designVars({ margins: 'narrow' }, { templateId: plain })['--cv-margin']).toBe('1.5rem');
  });

  it('leaves --cv-font absent when no typeface is chosen', () => {
    expect(designVars({ font: '' }, { templateId: plain })).not.toHaveProperty('--cv-font');
    expect(designVars({ font: 'Lora, serif' }, { templateId: plain })['--cv-font']).toBe(
      'Lora, serif'
    );
  });

  it('always sets a line height, because there is one right answer for it', () => {
    // Unlike margins: --cv-leading is a single number the templates all read the same way,
    // so leaving it unset would just mean nineteen different fallbacks for "normal".
    expect(designVars({}, { templateId: plain })['--cv-leading']).toBe(LEADING.normal);
    expect(designVars({ density: 'compact' }, { templateId: plain })['--cv-leading']).toBe(
      LEADING.compact
    );
  });

  it('ignores a page colour on a template that does not allow one', () => {
    const notEditable = TEMPLATES.find((t) => !GROUND_EDITABLE_IDS.includes(t.id)).id;
    expect(designVars({ ground: '#ff0000' }, { templateId: notEditable })).not.toHaveProperty(
      '--cv-ground'
    );
    expect(
      designVars({ ground: '#ff0000' }, { templateId: GROUND_EDITABLE_IDS[0] })['--cv-ground']
    ).toBe('#ff0000');
  });

  it('falls back to the normal value for a scale it does not recognise', () => {
    // Values arrive from a database and from localStorage written by older builds.
    const v = designVars({ density: 'squished', textSize: 'enormous' }, { templateId: plain });
    expect(v['--cv-leading']).toBe(LEADING.normal);
    expect(v['--cv-type-scale']).toBe(TYPE_SCALE.normal);
  });
});

describe('text size, and where it must not go', () => {
  it('is offered on ordinary templates', () => {
    expect(supportsTypeScale(plain)).toBe(true);
    expect(designVars({ textSize: 'small' }, { templateId: plain })['--cv-type-scale']).toBe(0.94);
    expect(typeScaleStyle(plain)).toBeTruthy();
  });

  it('is withheld from EVERY sidebar template, derived rather than listed', () => {
    // The print clone pins a sidebar with `position: fixed` so Chrome repeats it per page.
    // Zoom around that is an unknown that would fail in the PDF only. Derived from
    // sidebarFill so a new sidebar template is excluded the day it is added.
    TEMPLATES.forEach((t) => {
      expect(supportsTypeScale(t.id)).toBe(!sidebarFill(t.id));
    });
    expect(typeScaleStyle(sidebarTemplate)).toBeUndefined();
    expect(designVars({ textSize: 'small' }, { templateId: sidebarTemplate })).not.toHaveProperty(
      '--cv-type-scale'
    );
  });

  it('sizes the wrapper as one page DIVIDED by the scale, not as a percentage', () => {
    // `calc(100% / zoom)` resolves against an already-zoomed containing block and
    // compounds. An explicit length does not.
    const style = typeScaleStyle(plain);
    expect(style.width).toContain('var(--cv-paper-w');
    expect(style.width).toContain('var(--cv-type-scale');
    expect(style.width).not.toContain('100%');
  });

  it('uses zoom rather than transform', () => {
    // transform: scale() would look identical and leave the layout box unchanged, so the
    // page count would stop responding to the control entirely.
    expect(typeScaleStyle(plain).zoom).toBeTruthy();
    expect(typeScaleStyle(plain).transform).toBeUndefined();
  });
});

describe('section spacing as a class', () => {
  it('is empty at normal, so the templates keep their designed rhythm', () => {
    expect(designClassName({ sectionGap: 'normal' })).toBe('');
    expect(designClassName({})).toBe('');
  });

  it('names a class at the other two settings', () => {
    expect(designClassName({ sectionGap: 'tight' })).toBe('cv-gap-tight');
    expect(designClassName({ sectionGap: 'airy' })).toBe('cv-gap-airy');
  });
});

describe('which element actually flows onto pages', () => {
  it('is the node itself on a single-column template', () => {
    const root = document.createElement('div');
    expect(flowElementFor(root, plain)).toBe(root);
  });

  it('is the MAIN COLUMN on a sidebar template', () => {
    // On screen the sidebar is in flow and the node measures max(sidebar, main). In print
    // the sidebar is fixed and repeats, so only the main column pushes onto page 2.
    const root = document.createElement('div');
    const aside = document.createElement('aside');
    aside.setAttribute('data-cv-sidebar', '');
    const main = document.createElement('div');
    root.append(aside, main);
    expect(flowElementFor(root, sidebarTemplate)).toBe(main);
  });

  it('falls back to the node when the sidebar has no sibling to speak of', () => {
    const root = document.createElement('div');
    const aside = document.createElement('aside');
    aside.setAttribute('data-cv-sidebar', '');
    root.append(aside);
    expect(flowElementFor(root, sidebarTemplate)).toBe(root);
  });

  it('survives a null node', () => {
    expect(flowElementFor(null, plain)).toBeNull();
  });
});

describe('writing a design straight onto a node', () => {
  const node = () => {
    const el = document.createElement('div');
    el.style.setProperty('--cv-leading', '1.5');
    return el;
  };

  it('applies vars and the gap class together', () => {
    const el = node();
    applyDesignToNode(el, { density: 'compact', sectionGap: 'tight' }, { templateId: plain });
    expect(el.style.getPropertyValue('--cv-leading')).toBe('1.35');
    expect(el.classList.contains('cv-gap-tight')).toBe(true);
  });

  it('CLEARS a property the new design does not set', () => {
    // The trap this guards: rung 3 sets a narrow margin, rung 4 does not mention margins,
    // and without a clear the ladder would measure rung 4 with rung 3's margin still on —
    // then commit a design that renders differently from the thing that was measured.
    const el = node();
    applyDesignToNode(el, { margins: 'narrow' }, { templateId: plain });
    expect(el.style.getPropertyValue('--cv-margin')).toBe('1.5rem');
    applyDesignToNode(el, { margins: 'normal' }, { templateId: plain });
    expect(el.style.getPropertyValue('--cv-margin')).toBe('');
  });

  it('restores exactly what it found', () => {
    const el = node();
    el.classList.add('cv-gap-airy');
    const before = el.getAttribute('style');
    const restore = applyDesignToNode(
      el,
      { density: 'compact', margins: 'narrow', sectionGap: 'tight' },
      { templateId: plain }
    );
    restore();
    expect(el.style.getPropertyValue('--cv-leading')).toBe('1.5');
    expect(el.style.getPropertyValue('--cv-margin')).toBe('');
    expect(el.classList.contains('cv-gap-airy')).toBe(true);
    expect(el.classList.contains('cv-gap-tight')).toBe(false);
    expect(el.getAttribute('style')).toBe(before);
  });

  it('does not touch --cv-paper-w, which is not the design tab’s to move', () => {
    const el = node();
    el.style.setProperty('--cv-paper-w', '210mm');
    applyDesignToNode(el, { margins: 'narrow' }, { templateId: plain });
    expect(el.style.getPropertyValue('--cv-paper-w')).toBe('210mm');
  });
});
