// THE NUMBER EVERY PAGE FEATURE RESTS ON.
//
// The length badge, the page-break guides and "fit to one page" all divide by the usable
// height of one printed page. There is no paginator to check them against — the preview
// is one continuous sheet — so if this number is wrong, every one of those features is
// wrong in the same direction at once, quietly, and nothing on screen contradicts it.
//
// It HAS been wrong. ResumeReview reserved a 10px Puppeteer margin that lib/cvDownload
// had deliberately removed, so every page was 20px shorter than it really is. The comment
// claiming they matched survived the change; the value did not. These tests exist so the
// next person to change the margin cannot leave the maths behind.
import { describe, it, expect } from 'vitest';
import {
  MM_TO_PX,
  PDF_PAGE_MARGIN,
  PDF_PAGE_MARGIN_PX,
  SPACER_MM,
  RAW_PAGE_HEIGHT_PX,
  reservedPerPagePx,
  effectivePageHeightPx,
  pageCountFor,
  paperGeometry,
} from './cvPageGeometry';

describe('the margin and the maths agree', () => {
  it('states the Puppeteer margin once, in two forms that match', () => {
    // PDF_PAGE_MARGIN is what goes to page.pdf(); PDF_PAGE_MARGIN_PX is what the page
    // maths subtracts. They are the same fact, and this is the assertion that keeps them
    // the same value.
    expect(PDF_PAGE_MARGIN).toBe(`${PDF_PAGE_MARGIN_PX}px`);
  });

  it('reserves the repeating spacers on both edges of every page', () => {
    // The thead/tfoot spacer repeats on EVERY printed page — that is the whole reason it
    // exists (a block's own padding applies once for the entire flowing document, not per
    // break). So it costs its height twice per page, not twice per document.
    expect(reservedPerPagePx()).toBeCloseTo(2 * PDF_PAGE_MARGIN_PX + 2 * SPACER_MM * MM_TO_PX, 5);
  });

  it('gives A4 about 1084px of usable height', () => {
    // The number this file exists to get right. 1122 raw − ~37.8 reserved. It was 1064
    // while the phantom 10px margin was still being subtracted.
    expect(effectivePageHeightPx('a4')).toBeCloseTo(1084.2, 1);
  });

  it('gives Letter its own, shorter page', () => {
    expect(effectivePageHeightPx('letter')).toBeCloseTo(1018.2, 1);
    expect(effectivePageHeightPx('letter')).toBeLessThan(effectivePageHeightPx('a4'));
  });

  it('falls back to A4 for a paper it does not know', () => {
    // design.paper comes from persisted state and could be anything after a bad write.
    // Falling back is right; returning NaN would make pageCount NaN and the badge blank.
    expect(effectivePageHeightPx('foolscap')).toBe(effectivePageHeightPx('a4'));
    expect(effectivePageHeightPx(undefined)).toBe(effectivePageHeightPx('a4'));
  });
});

describe('pageCountFor', () => {
  it('says one page before anything has been measured', () => {
    // contentHeight is 0 until the ResizeObserver delivers. "0 pages" is not a thing, and
    // a blank badge on first paint reads as broken.
    expect(pageCountFor(0, 'a4')).toBe(1);
    expect(pageCountFor(undefined, 'a4')).toBe(1);
  });

  it('counts a document that exactly fills a page as one page', () => {
    expect(pageCountFor(effectivePageHeightPx('a4'), 'a4')).toBe(1);
  });

  it('counts one pixel over as two', () => {
    // Deliberately not optimistic. Someone trying to reach one page is better served by a
    // badge that tips early than by one that says "1 page" and prints as 2.
    expect(pageCountFor(effectivePageHeightPx('a4') + 1, 'a4')).toBe(2);
  });

  it('counts the same document differently on Letter', () => {
    // The regression this closes: a CV that fits A4 and does not fit Letter must not
    // report the same number on both.
    const h = effectivePageHeightPx('a4') - 10;
    expect(pageCountFor(h, 'a4')).toBe(1);
    expect(pageCountFor(h, 'letter')).toBe(2);
  });
});

describe('paperGeometry', () => {
  it('gives A4 millimetres and Letter inches', () => {
    expect(paperGeometry('a4')).toEqual({ width: '210mm', height: '297mm', label: 'A4' });
    expect(paperGeometry('letter')).toEqual({ width: '8.5in', height: '11in', label: 'Letter' });
  });

  it('treats anything that is not Letter as A4', () => {
    expect(paperGeometry(undefined).label).toBe('A4');
  });

  it('keeps the raw heights within a pixel of the CSS lengths at 96dpi', () => {
    // 297mm is 1122.52px and 11in is exactly 1056px. Within a pixel, not exact, because
    // the A4 value is a FLOOR: this repo rounds 297mm both ways in different files
    // (1122 in StudioTemplatePreview and TemplatePreviewThumb, 1123 in PreviewWatermark),
    // and the page count has always used 1122. Half a pixel per page changes nothing;
    // silently moving the badge a second time while fixing it would.
    expect(RAW_PAGE_HEIGHT_PX.a4).toBeCloseTo(297 * MM_TO_PX, -0.5);
    expect(Math.abs(RAW_PAGE_HEIGHT_PX.a4 - 297 * MM_TO_PX)).toBeLessThan(1);
    expect(RAW_PAGE_HEIGHT_PX.letter).toBe(11 * 96);
  });
});
