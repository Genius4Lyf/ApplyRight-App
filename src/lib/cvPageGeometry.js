// HOW TALL A PRINTED PAGE ACTUALLY IS.
//
// The CV preview is one continuous sheet — there is no paginator. Everything that tells
// a user about pages (the length badge, the page-break guides, "fit to one page") is
// derived from ONE number: how much vertical room a single printed page really gives the
// document. Get that number wrong and every one of those features lies in the same
// direction at once.
//
// It lived inline in ResumeReview as three loose constants, and it had already drifted:
// `PDF_MARGIN_PX = 10 // matches pdfMargin in performDownload` had not matched since
// `pdfMargin` was deliberately changed to '0px' in lib/cvDownload (so nothing stacks on
// top of the spacers below). That made every page 20px shorter than it is, which is
// survivable for a badge and not survivable for a line drawn across the document.
//
// So the numbers live here, next to the reason for each, and `cvDownload` imports the
// margin rather than restating it. Two files cannot disagree about a value only one of
// them owns.

/** px per mm at 96dpi — the CSS reference resolution the preview and the PDF both use. */
export const MM_TO_PX = 96 / 25.4; // ≈3.7795

/**
 * Puppeteer's own page margin, as passed to `page.pdf()`.
 *
 * ZERO on purpose. The document already has two sources of page-edge space — the
 * template's own padding, and the 5mm thead/tfoot spacer below — and a Puppeteer margin
 * would stack on top of both. Exported so the page maths and the request that sets it
 * are the same value, not two literals that agree today.
 */
export const PDF_PAGE_MARGIN = '0px';
export const PDF_PAGE_MARGIN_PX = 0;

/**
 * The repeating table spacer, in mm.
 *
 * This is what gives page 2 and beyond a top margin at all: a block's own padding
 * applies once at the start and end of the whole flowing document, not at each page
 * break, so the print HTML wraps the CV in a table whose thead/tfoot repeat on every
 * printed page. It costs this much off the top AND the bottom of every page.
 */
export const SPACER_MM = 5;

/** Raw page height at 96dpi, before anything is reserved. */
export const RAW_PAGE_HEIGHT_PX = { a4: 1122, letter: 1056 };

/** What every page loses to margins and the repeating spacers. */
export const reservedPerPagePx = () => 2 * PDF_PAGE_MARGIN_PX + 2 * SPACER_MM * MM_TO_PX; // ≈37.8px

/**
 * The usable content height of one printed page.
 * A4 ≈ 1084px, Letter ≈ 1018px.
 */
export const effectivePageHeightPx = (paper) =>
  (RAW_PAGE_HEIGHT_PX[paper] || RAW_PAGE_HEIGHT_PX.a4) - reservedPerPagePx();

/**
 * How many pages a document of this measured height will print as.
 *
 * An estimate, and it says so: Chrome breaks at block boundaries, so a document that
 * measures 1.02 pages may still print as two if the block straddling the boundary cannot
 * be split. It is never wrong by more than one block, and it is never optimistic about
 * the total — which is the direction that matters when someone is trying to reach one page.
 */
export const pageCountFor = (contentHeight, paper) =>
  contentHeight ? Math.max(1, Math.ceil(contentHeight / effectivePageHeightPx(paper))) : 1;

/** Paper geometry for the preview sheet and the `@page` rule. */
export const paperGeometry = (paper) =>
  paper === 'letter'
    ? { width: '8.5in', height: '11in', label: 'Letter' }
    : { width: '210mm', height: '297mm', label: 'A4' };
