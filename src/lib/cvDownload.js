import CVService from '../services/cv.service';
import { downloadBlob } from '../utils/download';
import { TEMPLATES, paperColor } from '../data/templates';

// The template a download falls back to when nothing has been chosen. 'ats-clean' is the
// free, single-column, ATS-parseable one — the safe default to hand someone who never
// opened the editor. Exported so the UI can NAME the template a blind download will use
// and resolve it identically, rather than each surface hard-coding the same string and
// drifting apart.
export const DEFAULT_TEMPLATE_ID = 'ats-clean';

/**
 * Resolve a template id to what the download will actually use, plus its human name.
 * @param {string} [templateId]
 * @returns {{ id: string, name: string, isDefault: boolean }}
 */
export function resolveDownloadTemplate(templateId) {
  const id = templateId || DEFAULT_TEMPLATE_ID;
  const match = TEMPLATES.find((t) => t.id === id);
  // An unknown/legacy id renders as ATS Clean (CVTemplateRenderer's own fallback), so
  // report it that way rather than echoing an id the user would never see.
  if (!match) {
    return {
      id: DEFAULT_TEMPLATE_ID,
      name: TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)?.name || 'ATS Clean',
      isDefault: true,
    };
  }
  return { id, name: match.name, isDefault: id === DEFAULT_TEMPLATE_ID };
}

// The CV download pipeline, extracted from ResumeReview so more than one surface can
// use it. This is a MOVE, not a rewrite: the HTML assembly, the service arguments and
// the error decoding are byte-for-byte what ResumeReview did, because the only working
// download path in the product runs through here.
//
// What deliberately did NOT move: the premium-template unlock gate, the native
// rewarded-ad gate, the interstitial, the feedback prompt and every spinner. Those are
// the CALLER's policy — ResumeReview has all of them, the Studio has none — and folding
// them in would have made this a rewrite instead of a move.
//
// Every function here returns a typed RESULT rather than throwing, so both callers
// handle the paywall the same way:
//   { ok: true }
//   { ok: false, needsPaywall: true }   → show DownloadPaywallModal (402 NEED_DOWNLOAD)
//   { ok: false, error }                → show a failure toast

/**
 * The filename both formats use. Falls back to "Document" when the profile has no name.
 * @param {object} userProfile
 * @param {'resume'|'cover-letter'} kind
 * @param {'pdf'|'docx'} ext
 */
export function buildDownloadFilename(userProfile, kind, ext) {
  const name = userProfile?.firstName
    ? [userProfile.firstName, userProfile.otherName, userProfile.lastName].filter(Boolean).join(' ')
    : 'Document';
  return `${name}_${kind === 'resume' ? 'CV' : 'CoverLetter'}.${ext}`;
}

/**
 * Serialize a rendered CV node into the standalone HTML the PDF backend renders.
 *
 * The clone is what makes the PDF clean and full-scale: the on-screen node is
 * transform-scaled to fit the preview and carries a watermark plus a screenshot-guard
 * blur for free users. Stripping those from the CLONE (never the live DOM) is why a
 * paid PDF never contains them.
 *
 * @param {HTMLElement} element the live preview node (#resume-content)
 * @param {{ paperWidth: string, paperHeight: string, paper: string, isDarkTemplate: boolean, templateId: string }} opts
 * @returns {string} a complete HTML document
 */
export function buildPrintHtml(
  element,
  { paperWidth, paperHeight, paper, isDarkTemplate, templateId }
) {
  const clone = element.cloneNode(true);
  const sidebar = clone.querySelector('[data-cv-sidebar]');
  if (sidebar) {
    // Real browser mechanism (verified against actual rendered PDF output), not a
    // measured/guessed height: position:fixed elements in Chrome's print engine are
    // anchored to the page box and repeat on every page automatically, unlike normal
    // flow content which only ever sizes to itself. Reads the width DIRECTLY off the
    // sidebar's own existing Tailwind class (e.g. `w-[34%]`) so this never drifts out
    // of sync with the template and needs no per-template registration.
    const widthMatch = sidebar.className.match(/\bw-\[([^\]]+)\]/);
    const sidebarWidth = widthMatch ? widthMatch[1] : null;
    if (sidebarWidth) {
      sidebar.style.position = 'fixed';
      sidebar.style.top = '0';
      sidebar.style.left = '0';
      sidebar.style.bottom = '0';
      sidebar.style.width = sidebarWidth;
      // The sidebar no longer takes up space in flow once fixed, so its sibling (the
      // main content column) needs the same inset pushed back in, or it would expand
      // to the full page width and sit underneath the fixed sidebar.
      const mainCol = sidebar.nextElementSibling;
      if (mainCol) mainCol.style.marginLeft = sidebarWidth;
    }
  }
  // Strip the on-screen preview watermark + any screenshot-guard blur so the
  // paid PDF is always clean.
  clone.querySelectorAll('[data-preview-watermark]').forEach((el) => el.remove());
  clone.style.filter = 'none';
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.width = paperWidth;
  clone.style.minWidth = paperWidth;
  clone.style.minHeight = 'auto'; // strips the inherited page-floor from #resume-content
  clone.style.margin = '0 auto';

  const contentHtml = clone.outerHTML;

  // THE PAGE BEHIND THE CV, in the actual PDF.
  //
  // The clone's minHeight is stripped just above, so the CV node ends with its content —
  // but the PDF PAGE is still a full sheet. Whatever `body` is painted shows below the
  // content, and 'transparent' prints as white. On a tinted template that put a hard
  // white band under every CV that ran short of a page, in the paid download.
  //
  // Royal Elegance keeps its own dark page (its template is designed against it).
  const bgColor = isDarkTemplate ? '#0f172a' : paperColor(templateId);

  return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Merriweather:wght@400;700;900&family=Inter:wght@400;600;700&family=Lora:wght@400;500;600;700&display=swap" rel="stylesheet">
                    <style>
                        /* Backend renders with preferCSSPageSize:true, so this sets the PDF page size. */
                        @page { size: ${paper === 'letter' ? 'letter' : 'A4'}; }
                        html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background: ${bgColor}; height: 100%; }

                        /* Table Layout Method for Print Margins */
                        .print-container {
                            width: 100%;
                            border-collapse: collapse;
                            border: 0 none;
                            margin-top: -5mm; /* Pull up to hide first page header */
                        }
                        .print-container td, .print-container th {
                            border: 0 none;
                            padding: 0;
                            margin: 0;
                        }
                        thead, tfoot {
                            height: 5mm;
                            display: table-header-group; /* Ensure repeat on break */
                        }
                        tfoot { display: table-footer-group; }

                        /* Spacer divs - transparent to show background */
                        .margin-spacer { height: 5mm; background: transparent; }

                        #resume-content, #cover-letter-content { padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
                    </style>
                </head>
                <body>
                    <table class="print-container">
                        <thead>
                            <tr><td><div class="margin-spacer"></div></td></tr>
                        </thead>
                        <tbody>
                            <tr><td>
                                ${contentHtml}
                            </td></tr>
                        </tbody>
                        <tfoot>
                            <tr><td><div class="margin-spacer"></div></td></tr>
                        </tfoot>
                    </table>
                </body>
                </html>
            `;
}

// Because the download requests use responseType:'blob', a server error arrives as a
// Blob rather than JSON — so it has to be read back asynchronously just to be logged.
function logBlobError(e) {
  if (e?.response?.data instanceof Blob) {
    const reader = new FileReader();
    reader.onload = () => {
      console.error('Server Error Response (decoded):', reader.result);
    };
    reader.readAsText(e.response.data);
  } else if (e?.response) {
    console.error('Server Error Response:', e.response.data);
  }
}

// A 402 { code: 'NEED_DOWNLOAD' } means the entitlement is spent: on web, one free
// lifetime download then a pass or subscription. CVService already decodes the blob
// 402 into a typed error; we only classify it. The entitlement rules themselves live
// server-side and are deliberately NOT duplicated here.
const isPaywall = (e) => e?.code === 'NEED_DOWNLOAD';

/**
 * Render the on-screen CV to PDF and hand the file over.
 *
 * @param {object} opts
 * @param {string} opts.elementId    DOM id of the rendered CV (e.g. 'resume-content')
 * @param {string} opts.paperWidth
 * @param {string} opts.paperHeight
 * @param {string} opts.paper        'a4' | 'letter'
 * @param {string} opts.templateId
 * @param {string} [opts.applicationId]
 * @param {boolean} [opts.isDraft]
 * @param {object} [opts.userProfile]
 * @param {'resume'|'cover-letter'} [opts.kind]
 * @returns {Promise<{ok:boolean, needsPaywall?:boolean, error?:Error}>}
 */
export async function downloadPdf({
  elementId = 'resume-content',
  paperWidth,
  paperHeight,
  paper,
  templateId,
  applicationId,
  isDraft,
  userProfile,
  kind = 'resume',
}) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`${kind === 'resume' ? 'Resume' : 'Cover letter'} content not found`);
    }

    const fullHtml = buildPrintHtml(element, {
      paperWidth,
      paperHeight,
      paper,
      isDarkTemplate: templateId === 'luxury-royal',
      templateId,
    });

    // The ONLY margin now: the template's own internal padding, plus the 5mm
    // thead/tfoot spacer in the print-container (structurally required — it's what
    // gives page 2+ of a multi-page CV a top margin at all, since a block's own
    // padding only applies once at the very start/end of the whole flowing document,
    // not per page break). Puppeteer's own page margin is removed entirely so nothing
    // stacks on top of that.
    const pdfMargin = '0px';
    const blob = await CVService.generatePdf(
      fullHtml,
      { margin: { top: pdfMargin, right: pdfMargin, bottom: pdfMargin, left: pdfMargin } },
      { templateId, applicationId, isDraft }
    );

    await downloadBlob(blob, buildDownloadFilename(userProfile, kind, 'pdf'));
    return { ok: true };
  } catch (e) {
    console.error('PDF Download Error Details:', e);
    if (isPaywall(e)) return { ok: false, needsPaywall: true };
    logBlobError(e);
    return { ok: false, error: e };
  }
}

/**
 * Export the CV as .docx. Built from the CV DATA (markdown), so unlike the PDF it
 * needs no rendered DOM. One download unit covers either format — the backend
 * consumes it once.
 *
 * @returns {Promise<{ok:boolean, needsPaywall?:boolean, error?:Error}>}
 */
export async function downloadDocx({
  markdown,
  userProfile,
  applicationId,
  isDraft,
  templateId,
  kind = 'resume',
  filenameProfile,
  outputLang,
}) {
  try {
    // outputLang drives the section LABELS in the .docx. The markdown sent up is
    // the untouched English-headed source — the backend translates at render time,
    // exactly as the on-screen templates do.
    const blob = await CVService.generateDocx(
      { markdown, userProfile, outputLang },
      { applicationId, isDraft, templateId }
    );
    // The filename uses the RAW profile while the document body uses the merged one —
    // preserving ResumeReview's existing split rather than quietly changing filenames.
    await downloadBlob(blob, buildDownloadFilename(filenameProfile ?? userProfile, kind, 'docx'));
    return { ok: true };
  } catch (e) {
    console.error('DOCX Download Error Details:', e);
    if (isPaywall(e)) return { ok: false, needsPaywall: true };
    logBlobError(e);
    return { ok: false, error: e };
  }
}
