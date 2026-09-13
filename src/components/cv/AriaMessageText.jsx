import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { healTail } from '../../lib/markdownTail';
import CopyMessageButton from './CopyMessageButton';

// Aria's words, as markdown.
//
// They used to be printed as a raw string in a <span>. The user's own bubble had
// `whitespace-pre-wrap`; Aria's did not — so her paragraph breaks collapsed into one long
// run and any **bold** she reached for showed its asterisks. Every reply arrived as a wall
// of text.
//
// Two things make this more than dropping <ReactMarkdown> in:
//
//  1. THE TYPEWRITER. A fresh reply types itself in, and the old one did that by returning
//     `text.slice(0, count)` — a bare string, which a parser cannot use. Worse, slicing
//     markdown mid-token puts the raw syntax on screen for a few frames: you would watch
//     "**bol" appear and then snap into bold. So the slice is HEALED before parsing (see
//     healTail) and the partial markup is never rendered at all.
//  2. THE ROW IS A FLEX COLUMN with a gap, and the orbit mark is its last child. Sibling
//     <p> elements would each become flex items and inherit that gap, and the mark would
//     stop being last. Everything therefore renders inside ONE block-level child.
//
// No rehype-raw: HTML in model output stays inert text, which is the right default for
// anything a model writes into a page.

const TYPE_CHARS_PER_TICK = 3;
const TYPE_TICK_MS = 16;

// Chat prose, not a document. Headings are deliberately flattened to bold text: index.css
// puts a display serif on every h1–h6 outside the CV templates, so one stray "##" would
// otherwise blow a bubble apart.
const boldParagraph = (props) => <p className="mb-3 font-semibold last:mb-0">{props.children}</p>;

/**
 * The words of one rendered bullet, for the clipboard.
 *
 * Read off the RENDERED children rather than by slicing the markdown source on the node's
 * position offsets. Two reasons: the source is a moving target while the reply types
 * itself in, and the children are already the plain text the user is looking at — which
 * is what they expect to land on the clipboard.
 */
const childText = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(childText).join('');
  return childText(node?.props?.children);
};

// A bullet you can take with you.
//
// When Aria is interviewing someone about a role or a project she answers with example
// lines they are MEANT to reuse — that is the whole point of them. Copying the message
// gave you all five at once; getting one meant dragging a selection across a single line,
// which on a phone is a fight with the text-selection handles.
//
// The control goes at the FRONT so every one of them starts at the same x-position and
// the eye can run down them, and it is icon-only because the word "Copy" is wider than
// some of the lines it would sit beside.
const CopyableListItem = (props) => {
  const text = childText(props.children).trim();
  return (
    <li className="pl-0.5">
      {text && (
        <CopyMessageButton
          text={text}
          compact
          reveal="bullet-copy"
          className="mr-1 translate-y-[-1px] align-middle"
        />
      )}
      {props.children}
    </li>
  );
};

const COMPONENTS = {
  p: (props) => <p className="mb-3 last:mb-0">{props.children}</p>,
  strong: (props) => <strong className="font-semibold">{props.children}</strong>,
  em: (props) => <em className="italic">{props.children}</em>,
  ul: (props) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{props.children}</ul>,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{props.children}</ol>,
  li: (props) => <li className="pl-0.5">{props.children}</li>,
  code: (props) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[15px] dark:bg-slate-800">
      {props.children}
    </code>
  ),
  a: (props) => (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2"
    >
      {props.children}
    </a>
  ),
  blockquote: (props) => (
    <blockquote className="mb-3 border-l-2 border-slate-300 pl-3 last:mb-0 dark:border-slate-600">
      {props.children}
    </blockquote>
  ),
  hr: () => null,
  h1: boldParagraph,
  h2: boldParagraph,
  h3: boldParagraph,
  h4: boldParagraph,
  h5: boldParagraph,
  h6: boldParagraph,
};

// Same renderer, bullets you can lift. Built once at module scope rather than per render,
// so ReactMarkdown is not handed a new components object on every typewriter tick.
const COMPONENTS_COPYABLE_BULLETS = { ...COMPONENTS, li: CopyableListItem };

/**
 * @param {object}   p
 * @param {string}   p.text   Aria's reply, as markdown
 * @param {boolean}  [p.typed]  already revealed (restored history) → render it whole
 * @param {boolean}  [p.reduce] prefers-reduced-motion → no typing, same as the old bailout
 * @param {Function} [p.onDone] fired once the reveal finishes; keeps StudioChat's
 *                              revealedRef contract so reopening a session never re-types
 * @param {boolean} [p.bulletCopy] give each bullet its own copy control. Off by default
 *                              and switched on only while a ROLE or PROJECT is being
 *                              interviewed — that is where her bullets are example
 *                              answers to reuse. Everywhere else they are just prose in
 *                              a list, and a control on every line would be clutter.
 */
const AriaMessageText = ({ text, typed = false, reduce = false, onDone, bulletCopy = false }) => {
  const full = String(text || '');
  const [count, setCount] = useState(typed || reduce ? full.length : 0);

  useEffect(() => {
    if (typed) {
      setCount(full.length);
      return undefined;
    }
    if (reduce) {
      setCount(full.length);
      onDone?.();
      return undefined;
    }
    let n = 0;
    setCount(0);
    const id = setInterval(() => {
      n = Math.min(full.length, n + TYPE_CHARS_PER_TICK);
      setCount(n);
      if (n >= full.length) {
        clearInterval(id);
        onDone?.();
      }
    }, TYPE_TICK_MS);
    return () => clearInterval(id);
    // onDone is a fresh closure every render; re-running on it would restart the reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, typed, reduce]);

  const done = count >= full.length;
  const source = useMemo(() => (done ? full : healTail(full.slice(0, count))), [full, count, done]);

  // Only once the reveal has finished. Mid-type, a bullet is a fragment — a copy control
  // beside it would hand over half a sentence, and the buttons would pop in one by one
  // as the list grew.
  const components = bulletCopy && done ? COMPONENTS_COPYABLE_BULLETS : COMPONENTS;

  return (
    <div className="aria-md">
      <ReactMarkdown components={components}>{source}</ReactMarkdown>
    </div>
  );
};

export default AriaMessageText;
