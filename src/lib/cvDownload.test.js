// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/cv.service', () => ({
  default: { generatePdf: vi.fn(), generateDocx: vi.fn() },
}));
vi.mock('../utils/download', () => ({ downloadBlob: vi.fn().mockResolvedValue(undefined) }));

import CVService from '../services/cv.service';
import { downloadBlob } from '../utils/download';
import {
  buildPrintHtml,
  buildDownloadFilename,
  downloadPdf,
  downloadDocx,
  resolveDownloadTemplate,
  DEFAULT_TEMPLATE_ID,
} from './cvDownload';
import { TEMPLATES } from '../data/templates';

/**
 * These tests exist because cvDownload was EXTRACTED from ResumeReview, which owns the
 * only working CV download path in the product. The extraction was meant to be a pure
 * move, so what's pinned here is the things a "move" must not change: the assembled
 * HTML, the exact service arguments, and the 402 NEED_DOWNLOAD classification.
 */

const PAPER = { paperWidth: '210mm', paperHeight: '297mm', paper: 'a4' };

const mountCv = (id = 'resume-content') => {
  document.body.innerHTML = `
    <div id="${id}" style="transform: scale(0.6); filter: blur(4px);">
      <div data-preview-watermark>WATERMARK</div>
      <h1>Ernest Akibor</h1>
      <p>Wireline Field Operator</p>
    </div>`;
  return document.getElementById(id);
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('buildPrintHtml', () => {
  it('strips the preview watermark so a paid PDF is never marked', () => {
    const html = buildPrintHtml(mountCv(), PAPER);
    expect(html).not.toContain('WATERMARK');
    expect(html).not.toContain('data-preview-watermark');
    // …and the LIVE node keeps it — the clone is what gets stripped.
    expect(document.querySelector('[data-preview-watermark]')).toBeTruthy();
  });

  it('resets the preview transform and blur so the PDF renders at 100%', () => {
    const html = buildPrintHtml(mountCv(), PAPER);
    expect(html).toContain('transform: none');
    expect(html).toContain('filter: none');
    expect(html).not.toContain('scale(0.6)');
    expect(html).not.toContain('blur(4px)');
  });

  it('keeps the CV content itself', () => {
    const html = buildPrintHtml(mountCv(), PAPER);
    expect(html).toContain('Ernest Akibor');
    expect(html).toContain('Wireline Field Operator');
  });

  it('sets the @page size from the chosen paper', () => {
    expect(buildPrintHtml(mountCv(), PAPER)).toContain('@page { size: A4; }');
    expect(buildPrintHtml(mountCv(), { ...PAPER, paper: 'letter' })).toContain(
      '@page { size: letter; }'
    );
  });

  it('applies the dark background ONLY for the royal template', () => {
    const dark = buildPrintHtml(mountCv(), { ...PAPER, isDarkTemplate: true });
    const light = buildPrintHtml(mountCv(), { ...PAPER, isDarkTemplate: false });
    expect(dark).toContain('background: #0f172a');
    expect(light).toContain('background: transparent');
  });

  it('emits the print-container table used for repeating page margins', () => {
    const html = buildPrintHtml(mountCv(), PAPER);
    expect(html).toContain('class="print-container"');
    expect(html).toContain('display: table-header-group');
    expect(html).toContain('display: table-footer-group');
    expect(html).toContain('margin-spacer');
  });

  it('injects Tailwind and the template fonts', () => {
    const html = buildPrintHtml(mountCv(), PAPER);
    expect(html).toContain('cdn.tailwindcss.com');
    expect(html).toContain('fonts.googleapis.com');
  });
});

describe('buildDownloadFilename', () => {
  const profile = { firstName: 'Ernest', otherName: 'O', lastName: 'Akibor' };

  it('builds from the full name and format', () => {
    expect(buildDownloadFilename(profile, 'resume', 'pdf')).toBe('Ernest O Akibor_CV.pdf');
    expect(buildDownloadFilename(profile, 'resume', 'docx')).toBe('Ernest O Akibor_CV.docx');
    expect(buildDownloadFilename(profile, 'cover-letter', 'pdf')).toBe(
      'Ernest O Akibor_CoverLetter.pdf'
    );
  });

  it('skips absent name parts without leaving double spaces', () => {
    expect(
      buildDownloadFilename({ firstName: 'Ernest', lastName: 'Akibor' }, 'resume', 'pdf')
    ).toBe('Ernest Akibor_CV.pdf');
  });

  it('falls back to Document with no profile', () => {
    expect(buildDownloadFilename(null, 'resume', 'pdf')).toBe('Document_CV.pdf');
    expect(buildDownloadFilename({}, 'resume', 'pdf')).toBe('Document_CV.pdf');
  });
});

describe('resolveDownloadTemplate', () => {
  it('falls back to the ATS-safe default when nothing has been chosen', () => {
    const t = resolveDownloadTemplate(undefined);
    expect(t.id).toBe('ats-clean');
    expect(t.name).toBe('ATS Clean');
    expect(t.isDefault).toBe(true);
  });

  it('treats null and empty string as unchosen too', () => {
    expect(resolveDownloadTemplate(null).id).toBe(DEFAULT_TEMPLATE_ID);
    expect(resolveDownloadTemplate('').id).toBe(DEFAULT_TEMPLATE_ID);
  });

  it('returns the HUMAN NAME of a saved template, never the id', () => {
    const t = resolveDownloadTemplate('executive-energy');
    expect(t.name).toBe('Energy / Industrial');
    expect(t.isDefault).toBe(false);
  });

  it('reports an unknown/legacy id as the default it will actually render as', () => {
    // CVTemplateRenderer falls back to ATS Clean for unknown ids, so naming the raw id
    // would tell the user something they'd never see in the file.
    const t = resolveDownloadTemplate('some-deleted-template');
    expect(t.id).toBe('ats-clean');
    expect(t.name).toBe('ATS Clean');
    expect(t.isDefault).toBe(true);
  });

  it('resolves a name for every template in the catalogue', () => {
    TEMPLATES.forEach((tpl) => {
      const t = resolveDownloadTemplate(tpl.id);
      expect(t.name).toBe(tpl.name);
      expect(t.id).toBe(tpl.id);
    });
  });

  it('agrees with the id the download actually sends', async () => {
    // The card's claim and the file's contents must come from the same resolution —
    // this is the whole point of sharing the helper.
    mountCv();
    CVService.generatePdf.mockResolvedValue(new Blob(['pdf']));
    const chosen = resolveDownloadTemplate('minimal-grid');

    await downloadPdf({
      ...PAPER,
      templateId: chosen.id,
      applicationId: 'd1',
      isDraft: true,
      userProfile: {},
    });

    expect(CVService.generatePdf.mock.calls[0][2].templateId).toBe('minimal-grid');
    expect(chosen.name).toBe('Nordic Grid');
  });
});

describe('downloadPdf', () => {
  const opts = {
    ...PAPER,
    templateId: 'modern',
    applicationId: 'app1',
    isDraft: false,
    userProfile: { firstName: 'Ernest', lastName: 'Akibor' },
  };

  it('calls the backend with the fixed 10px margin and passes provenance through', async () => {
    mountCv();
    CVService.generatePdf.mockResolvedValue(new Blob(['pdf']));

    const res = await downloadPdf(opts);

    expect(res).toEqual({ ok: true });
    const [html, pdfOpts, meta] = CVService.generatePdf.mock.calls[0];
    expect(html).toContain('print-container');
    // The template's own padding supplies the visible margin; the page margin stays
    // small and fixed so it doesn't add a third border.
    expect(pdfOpts).toEqual({
      margin: { top: '10px', right: '10px', bottom: '10px', left: '10px' },
    });
    expect(meta).toEqual({ templateId: 'modern', applicationId: 'app1', isDraft: false });
  });

  it('hands the blob to downloadBlob under the built filename', async () => {
    mountCv();
    const blob = new Blob(['pdf']);
    CVService.generatePdf.mockResolvedValue(blob);

    await downloadPdf(opts);

    expect(downloadBlob).toHaveBeenCalledWith(blob, 'Ernest Akibor_CV.pdf');
  });

  it('reports a 402 NEED_DOWNLOAD as a paywall, not a failure', async () => {
    mountCv();
    const err = new Error('payment required');
    err.code = 'NEED_DOWNLOAD';
    CVService.generatePdf.mockRejectedValue(err);

    const res = await downloadPdf(opts);

    expect(res.needsPaywall).toBe(true);
    expect(res.ok).toBe(false);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('reports other server errors as plain failures', async () => {
    mountCv();
    CVService.generatePdf.mockRejectedValue(new Error('500'));

    const res = await downloadPdf(opts);

    expect(res.ok).toBe(false);
    expect(res.needsPaywall).toBeUndefined();
  });

  it('fails cleanly when the CV node is not in the DOM', async () => {
    const res = await downloadPdf(opts); // nothing mounted
    expect(res.ok).toBe(false);
    expect(CVService.generatePdf).not.toHaveBeenCalled();
  });

  it('serialises a cover letter from its own node', async () => {
    mountCv('cover-letter-content');
    CVService.generatePdf.mockResolvedValue(new Blob(['pdf']));

    await downloadPdf({ ...opts, elementId: 'cover-letter-content', kind: 'cover-letter' });

    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Ernest Akibor_CoverLetter.pdf');
  });

  it('marks a draft download as isDraft — the Studio/builder path', async () => {
    mountCv();
    CVService.generatePdf.mockResolvedValue(new Blob(['pdf']));

    await downloadPdf({ ...opts, isDraft: true, applicationId: 'draft1' });

    expect(CVService.generatePdf.mock.calls[0][2]).toMatchObject({
      isDraft: true,
      applicationId: 'draft1',
    });
  });
});

describe('downloadDocx', () => {
  const opts = {
    markdown: '# Ernest Akibor',
    userProfile: { firstName: 'Ernest', lastName: 'Akibor' },
    applicationId: 'app1',
    isDraft: false,
    templateId: 'modern',
  };

  it('builds from CV DATA — no rendered DOM required', async () => {
    CVService.generateDocx.mockResolvedValue(new Blob(['docx']));

    const res = await downloadDocx(opts); // nothing mounted, deliberately

    expect(res).toEqual({ ok: true });
    const [payload, meta] = CVService.generateDocx.mock.calls[0];
    expect(payload).toEqual({
      markdown: '# Ernest Akibor',
      userProfile: opts.userProfile,
    });
    expect(meta).toEqual({ applicationId: 'app1', isDraft: false, templateId: 'modern' });
  });

  it('uses the merged profile for the BODY and the raw one for the FILENAME', async () => {
    // ResumeReview has always done this; the move must not quietly change filenames.
    CVService.generateDocx.mockResolvedValue(new Blob(['docx']));

    await downloadDocx({
      ...opts,
      userProfile: { firstName: 'Merged', lastName: 'Profile' },
      filenameProfile: { firstName: 'Raw', lastName: 'Profile' },
    });

    expect(CVService.generateDocx.mock.calls[0][0].userProfile.firstName).toBe('Merged');
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Raw Profile_CV.docx');
  });

  it('reports a 402 NEED_DOWNLOAD as a paywall — one unit covers either format', async () => {
    const err = new Error('payment required');
    err.code = 'NEED_DOWNLOAD';
    CVService.generateDocx.mockRejectedValue(err);

    const res = await downloadDocx(opts);

    expect(res.needsPaywall).toBe(true);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('reports other errors as plain failures', async () => {
    CVService.generateDocx.mockRejectedValue(new Error('500'));
    const res = await downloadDocx(opts);
    expect(res.ok).toBe(false);
    expect(res.needsPaywall).toBeUndefined();
  });
});
