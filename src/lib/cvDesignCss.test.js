// @vitest-environment jsdom
//
// THE RULES THAT HAVE TO REACH THE PDF.
//
// Every other design control is a CSS variable set inline on `#resume-content`, so it
// rides into the download on the clone. Section spacing cannot be — it overrides Tailwind
// classes written inside nineteen template files, which needs a rule, and a rule has to be
// somewhere the PDF's document can see it.
//
// The PDF's head loads the Tailwind v3 CDN and nothing else. It does NOT load
// src/index.css. So the specific failure this file exists to catch is the quiet one: the
// control works perfectly on screen and does nothing at all in the file the user paid for.
import { describe, it, expect } from 'vitest';
import { CV_DESIGN_CSS } from './cvDesignCss';
import { buildPrintHtml } from './cvDownload';

const node = () => {
  const el = document.createElement('div');
  el.id = 'resume-content';
  el.innerHTML = '<p>CV</p>';
  return el;
};

const html = () =>
  buildPrintHtml(node(), {
    paperWidth: '210mm',
    paperHeight: '297mm',
    paper: 'a4',
    isDarkTemplate: false,
    templateId: 'ats-clean',
  });

describe('it reaches the download', () => {
  it('injects the rules into the PDF head', () => {
    // THE ASSERTION THIS FILE IS FOR.
    expect(html()).toContain(CV_DESIGN_CSS);
  });

  it('puts them inside the <style> block, not loose in the body', () => {
    const out = html();
    const head = out.slice(0, out.indexOf('</style>'));
    expect(head).toContain('cv-gap-tight');
  });

  it('ships both settings, not just the one that was easy to test', () => {
    expect(html()).toContain('cv-gap-airy');
  });
});

describe('the rules themselves', () => {
  // Comments first — otherwise the explanatory block above each rule is read as part of
  // that rule's selector. Done by splitting rather than with a regex, because this repo's
  // patch tooling has eaten backslashes out of test files twice.
  const stripComments = (css) =>
    css
      .split('*/')
      .map((chunk) => {
        const opens = chunk.indexOf('/*');
        return opens === -1 ? chunk : chunk.slice(0, opens);
      })
      .join('');

  const rules = stripComments(CV_DESIGN_CSS)
    .split('}')
    .map((r) => r.split('{')[0].trim())
    .filter(Boolean);

  it('scopes every rule to #resume-content', () => {
    // Specificity is the mechanism: `#resume-content.cv-gap-tight h2` is 1-1-1 and beats
    // an arbitrary-value utility's 0-1-0. Unscoped, these rules would also be weaker AND
    // would leak onto the rest of the app.
    rules.forEach((selector) => {
      selector.split(',').forEach((part) => {
        expect(part.trim().startsWith('#resume-content')).toBe(true);
      });
    });
  });

  it('never touches a sidebar’s own headings', () => {
    // Sidebar templates render raw <h2> section labels inside the sidebar, outside the
    // markdown pipeline. Restyling those would move furniture the user never asked about.
    rules
      .filter((r) => r.includes(' h2') || r.includes(' h3'))
      .forEach((selector) => {
        if (selector.includes(':first-child')) return; // the reset, handled below
        expect(selector).toContain('data-cv-sidebar');
      });
  });

  it('restates first:mt-0, or every CV grows a gap above its first heading', () => {
    // The templates express this as Tailwind's `first:mt-0`, which these rules
    // out-specify. Forgetting to restate it is a visible band of white at the top of the
    // document, on every CV, at two of the three settings.
    expect(CV_DESIGN_CSS).toContain(':first-child');
    const reset = CV_DESIGN_CSS.slice(CV_DESIGN_CSS.indexOf(':first-child'));
    expect(reset).toContain('margin-top: 0');
  });

  it('says nothing at all at the default setting', () => {
    // There is no `cv-gap-normal` class and there must not be: normal means "leave the
    // nineteen templates exactly as they were designed".
    expect(CV_DESIGN_CSS).not.toContain('cv-gap-normal');
  });

  it('changes spacing only — never colour, size or family', () => {
    // Section spacing is one control. A rule here that also set a font size would make the
    // text-size control and this one silently fight.
    const declarations = CV_DESIGN_CSS.split('{')
      .slice(1)
      .map((b) => b.split('}')[0]);
    declarations.forEach((block) => {
      block
        .split(';')
        .map((d) => d.split(':')[0].trim())
        .filter(Boolean)
        .forEach((prop) => {
          expect(prop.startsWith('margin')).toBe(true);
        });
    });
  });
});
