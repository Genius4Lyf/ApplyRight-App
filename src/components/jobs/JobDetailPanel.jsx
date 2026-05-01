import React, { useState, useEffect, useMemo } from 'react';
import { X, ExternalLink, Building2, MapPin, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import jobSearchService from '../../services/jobSearchService';

/**
 * Detect if text contains meaningful HTML tags (not just entities)
 */
const isHTML = (str) => /<(p|div|ul|ol|li|br|h[1-6]|strong|b|em|i|a|table|span|section|article)\b/i.test(str);

/**
 * Sanitize HTML — strip dangerous content and unwanted platform-specific UI junk
 */
const sanitizeHTML = (html) => {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. Remove dangerous or unnecessary tags (including SVGs that cause duplicate icons)
  const tagsToRemove = doc.querySelectorAll('script, style, iframe, object, embed, form, input, button, img, svg, path, figure');
  tagsToRemove.forEach(el => el.remove());

  // 2. Remove social share links, and convert internal Jobberman metadata tags
  doc.querySelectorAll('a').forEach(a => {
    const text = (a.textContent || '').toLowerCase();
    const href = (a.href || '').toLowerCase();

    if (
      text.includes('share on') ||
      text.includes('report job') ||
      text.includes('log in and apply') ||
      href.includes('whatsapp') ||
      href.includes('linkedin.com/share') ||
      href.includes('facebook') ||
      href.includes('twitter')
    ) {
      // Complete removal for share links
      a.remove();
    } else if (href.startsWith('/') || href.includes('jobberman.com')) {
      // These are usually Jobberman tagging pills (e.g. "Lagos", "Full Time", "Human Resources")
      // Convert them to professional non-clickable badges
      const span = doc.createElement('span');
      span.setAttribute('data-badge', 'true');
      span.textContent = a.textContent;
      a.replaceWith(span);
    }
  });

  // 3. Remove text nodes containing specific junk and duplicate headers
  const treeWalker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodesToRemove = [];
  let currentNode;
  while ((currentNode = treeWalker.nextNode())) {
    const text = currentNode.nodeValue.trim().toLowerCase();

    // Remove these exact phrases or regex matches
    if (
      text === 'share link' ||
      text === 'share on whatsapp' ||
      text === 'share on linkedin' ||
      text === 'share on facebook' ||
      text === 'share on twitter' ||
      text === 'report job' ||
      text === 'important safety tips' ||
      text === 'job summary' ||
      text === 'easy apply' ||
      text === 'log in and apply' ||
      /^\d+\s+(month|week|day|hour|minute)s?\s+ago$/i.test(text) ||
      text.includes('do not make any payment without confirming') ||
      text.includes('if you think this advert is not genuine') ||
      /^(new|featured|immediate start)(\s+(new|featured|immediate start))*$/i.test(text)
    ) {
      textNodesToRemove.push(currentNode);
    }
  }

  textNodesToRemove.forEach(node => {
    const parent = node.parentNode;
    if (node) node.remove();
    // If parent is now an empty wrapper (like a <li> or <p>), remove it too
    if (parent && parent.textContent.trim() === '' && parent.tagName !== 'BODY') {
      parent.remove();
    }
  });

  // 4. Strip inline styles, classes, ids, and event listeners to ensure clean styling
  const allElements = doc.body.querySelectorAll('*');
  allElements.forEach(el => {
    // Keep classes for our custom injected tags and SVGs
    if (el.closest('span[data-badge="true"]') || ['svg', 'path', 'circle', 'polyline', 'rect', 'polygon'].includes(el.tagName.toLowerCase())) {
      return; 
    }
    el.removeAttribute('style');
    el.removeAttribute('class');
    el.removeAttribute('id');
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // 5. Remove empty elements (except structural ones)
  doc.body.querySelectorAll('*').forEach(el => {
    if (el.tagName !== 'BR' && el.tagName !== 'HR' && el.innerHTML.trim() === '') {
      el.remove();
    }
  });

  let finalHtml = doc.body.innerHTML.trim();

  // 6. Fix metadata formatting and missing badges
  // Jobberman outputs metadata in a single squished text node when icons are removed.
  finalHtml = finalHtml.replace(/(Min Qualification:|Experience Level:|Experience Length:)/gi, '<br/><strong>$1</strong> ');

  // Promote the extracted header into a styled H2 element with a larger font size
  finalHtml = finalHtml.replace(/(Job descriptions (?:&amp;|&) requirements)/gi, '<h2 class="text-xl font-bold text-slate-800 mt-8 mb-4 border-b border-slate-100 pb-2">$1</h2>');

  // Clean up any leading breaks we might have accidentally created at the very start
  finalHtml = finalHtml.replace(/^(<br\s*\/?>\s*)+/i, '');

  // 7. Safely reorder the large heading to be ABOVE the Qualifications block
  const reorderRegex = /((?:<br\s*\/?>\s*)*<strong>Min Qualification:<\/strong>[\s\S]*?<strong>Experience Length:<\/strong>[^<]*)((?:<br\s*\/?>\s*)*<h2[^>]*>Job descriptions (?:&amp;|&) requirements<\/h2>\s*)/i;
  finalHtml = finalHtml.replace(reorderRegex, '$2$1<br/><br/>');

  // Wrap raw salary strings in the same badge style so they don't break across lines
  // Matches "NGN 100,000 - 200,000" or similar ranges
  finalHtml = finalHtml.replace(/(NGN\s*[\d,]+\s*(-\s*[\d,]+)?)/g, '<span data-badge="true" class="whitespace-nowrap bg-emerald-50! text-emerald-700! border-emerald-200!">$1</span>');

  return finalHtml;
};

/**
 * Format a flat text blob (like Adzuna descriptions) into readable HTML.
 * Splits on sentence boundaries to create paragraphs, and detects
 * section-like patterns to add headers.
 */
const formatPlainText = (text) => {
  if (!text) return '';

  let str = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // If it has line breaks, process line by line
  if (str.includes('\n')) {
    return formatMultilineText(str);
  }

  // Single blob of text (typical Adzuna) — split into readable chunks
  return formatTextBlob(str);
};

/**
 * Handle text that already has line breaks
 */
const formatMultilineText = (text) => {
  const lines = text.split('\n');
  const parts = [];
  let inList = false;

  const HEADER_PATTERN = /^(about\s+(the|this|us)|requirements?|responsibilities|qualifications|skills?\s*(required|needed)?|experience|benefits?|what\s+(you|we)|who\s+(you|we)|your\s+role|the\s+(role|position|opportunity)|job\s+description|key\s+(duties|responsibilities)|how\s+to\s+apply|salary|location|company\s+overview|we\s+offer|what\s+we\s+offer|perks|duties|overview|summary|role\s+summary|minimum|preferred|essential|desirable|package|remuneration|apply|to\s+apply|ideal\s+candidate|why\s+join)/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (inList) { parts.push('</ul>'); inList = false; }
      continue;
    }

    // Section header detection
    const isHeader =
      (line.length < 80 && line.endsWith(':')) ||
      (line.length < 60 && line === line.toUpperCase() && /[A-Z]{3,}/.test(line)) ||
      HEADER_PATTERN.test(line);

    // Bullet detection
    const isBullet = /^[-•*▪◦–·►➤✓✔☑]\s/.test(line) || /^\d+[.)]\s/.test(line);

    if (isHeader) {
      if (inList) { parts.push('</ul>'); inList = false; }
      const headerText = line.replace(/:$/, '').trim();
      parts.push(`<h4>${headerText}</h4>`);
    } else if (isBullet) {
      const bulletText = line.replace(/^[-•*▪◦–·►➤✓✔☑]\s*/, '').replace(/^\d+[.)]\s*/, '');
      if (!inList) { parts.push('<ul>'); inList = true; }
      parts.push(`<li>${bulletText}</li>`);
    } else {
      if (inList) { parts.push('</ul>'); inList = false; }
      parts.push(`<p>${line}</p>`);
    }
  }

  if (inList) parts.push('</ul>');
  return parts.join('');
};

/**
 * Handle a single text blob with no line breaks (e.g. Adzuna).
 * Splits by sentence and groups into paragraphs of 2-3 sentences.
 * Detects embedded section keywords and creates headers.
 */
const formatTextBlob = (text) => {
  // Split on sentence boundaries (period/question/exclamation followed by space + capital)
  const sentences = text.match(/[^.!?]*[.!?]+\s*/g) || [text];
  const parts = [];
  let buffer = [];

  const SECTION_KEYWORDS = /\b(requirements?|responsibilities|qualifications|experience required|skills|benefits|about the (role|company|position)|key duties|what you|who you|your role|the role|we offer|how to apply|ideal candidate|minimum|essential)\b/i;

  const flushBuffer = () => {
    if (buffer.length > 0) {
      parts.push(`<p>${buffer.join(' ').trim()}</p>`);
      buffer = [];
    }
  };

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;

    // Check if this sentence looks like a section start
    if (SECTION_KEYWORDS.test(sentence) && i > 0) {
      flushBuffer();

      // Extract the keyword as a header if sentence is short enough
      const match = sentence.match(SECTION_KEYWORDS);
      if (match && sentence.length < 80) {
        // Split: make the keyword phrase a header, rest as paragraph
        const keyword = match[0];
        const headerText = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        parts.push(`<h4>${headerText}</h4>`);
        const remainder = sentence.replace(SECTION_KEYWORDS, '').replace(/^[:\s-]+/, '').trim();
        if (remainder) buffer.push(remainder);
      } else {
        buffer.push(sentence);
      }
    } else {
      buffer.push(sentence);
      // Create paragraph every 2-3 sentences for readability
      if (buffer.length >= 3) {
        flushBuffer();
      }
    }
  }

  flushBuffer();
  return parts.join('');
};

const FormattedDescription = ({ text }) => {
  const html = useMemo(() => {
    if (!text) return '<p class="text-slate-400 italic">No description available</p>';
    if (isHTML(text)) return sanitizeHTML(text);
    return formatPlainText(text);
  }, [text]);

  return (
    <div
      className="job-description text-sm text-slate-600 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const JobDetailPanel = ({
  result,
  searchId,
  isOpen,
  onClose,
  onApplyClick,
}) => {
  const [fullDescription, setFullDescription] = useState('');
  const [loadingDesc, setLoadingDesc] = useState(false);

  useEffect(() => {
    if (!isOpen || !result) {
      setFullDescription('');
      return;
    }

    // Use full description if already available
    if (result.fullDescription) {
      setFullDescription(result.fullDescription);
    } else {
      // Reset and fetch
      setFullDescription('');
      loadFullDescription();
    }
  }, [isOpen, result?._id]);

  const loadFullDescription = async () => {
    setLoadingDesc(true);
    try {
      const detailed = await jobSearchService.getJobDetails(searchId, result._id);
      setFullDescription(detailed.fullDescription || detailed.snippet || '');
    } catch {
      setFullDescription(result.snippet || 'Failed to load description');
    } finally {
      setLoadingDesc(false);
    }
  };

  if (!result) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="font-bold text-lg text-slate-900">{result.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <Building2 className="w-4 h-4" />
                  {result.company}
                </div>
                {result.location && (
                  <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500">
                    <MapPin className="w-4 h-4" />
                    {result.location}
                  </div>
                )}
                {result.salary && (
                  <div className="mt-1 text-sm font-medium text-emerald-600">{result.salary}</div>
                )}
              </div>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32">
              {/* Job Description */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Job Description</h3>
                {loadingDesc ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
                    ))}
                  </div>
                ) : (
                  <FormattedDescription text={fullDescription || result.snippet || 'No description available'} />
                )}
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`px-2 py-1 rounded-full ${result.source === 'jobberman'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-blue-50 text-blue-600'
                  }`}>
                  {result.source === 'jobberman' ? 'Local' : 'Global'}
                </span>
                {result.category && (
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{result.category}</span>
                )}
                {result.postedDate && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(result.postedDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Slim Glassmorphism Action Bar */}
            {result.applyUrl && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200/60 bg-white/85 backdrop-blur-xl z-10 pb-max-safe">
                <div className="max-w-lg mx-auto">
                  <button
                    onClick={() => onApplyClick(searchId, result._id, result.applyUrl)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                  >
                    Apply Now <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default JobDetailPanel;
