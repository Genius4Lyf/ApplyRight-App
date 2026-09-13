import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toPlainText } from '../../lib/messageText';

// Copy one chat message — Aria's or the user's own.
//
// Aria writes the thing people came for: a set of bullets, a rewritten line, a summary.
// Before this the only way to get it out was a manual drag-select across a bubble, which
// on a phone is a fight with the text-selection handles.
//
// Two deliberate choices:
//
//  1. IT COPIES PLAIN TEXT, not the raw markdown (see lib/messageText). What lands on the
//     clipboard is what the user thought they were reading.
//  2. IT IS QUIET UNTIL WANTED. The `.msg-copy` class in index.css keeps it invisible
//     until the row is hovered on a pointer device, and faint-but-present on touch, where
//     there is no hover to reveal it. A visible button under every single message would
//     turn a conversation into a control panel.
//
// `navigator.clipboard` needs a secure context and is missing in some Android WebViews,
// which this app also ships into — so there is an execCommand fallback rather than a
// silent no-op.

const COPIED_MS = 1600;

const writeToClipboard = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or non-secure context — fall through to the legacy path.
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

/**
 * @param {object}  p
 * @param {string}  p.text       the message, as markdown
 * @param {string}  [p.className] extra positioning classes from the host row
 * @param {boolean} [p.compact]  icon only — for copying ONE bullet from inside a list,
 *                               where the word "Copy" beside every line would be wider
 *                               than the line it belongs to. The label survives as the
 *                               accessible name, so nothing is lost to a screen reader.
 * @param {string}  [p.reveal]   the class that governs when it fades in. Defaults to the
 *                               row-level `.msg-copy`; a bullet passes `.bullet-copy` so
 *                               hovering one line does not light up all five.
 */
const CopyMessageButton = ({ text, className = '', compact = false, reveal = 'msg-copy' }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const plain = toPlainText(text);
  if (!plain) return null;

  const onCopy = async () => {
    const ok = await writeToClipboard(plain);
    if (!ok) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  const label = copied ? t('common.copied') : t('common.copy');

  return (
    <button
      type="button"
      onClick={onCopy}
      title={label}
      aria-label={label}
      className={`${reveal} inline-flex items-center gap-1 rounded-md ${
        compact ? 'px-1 py-0.5' : 'px-1.5 py-1'
      } font-mono text-[10px] uppercase tracking-wide text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${className}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {!compact && <span>{label}</span>}
    </button>
  );
};

export default CopyMessageButton;
