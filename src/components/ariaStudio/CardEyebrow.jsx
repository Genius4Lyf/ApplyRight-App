import React from 'react';

// ONE HEADING TREATMENT FOR EVERY CARD ARIA PUTS IN THE CHAT.
//
// The classes were already identical everywhere — `font-mono text-[10px] uppercase
// tracking-[0.14em]`, the size "Here's the plan" uses. What was NOT identical was the
// emoji some of them carry: an emoji ignores the 10px font-size it is nested in and
// renders at its own intrinsic size, so "📇 Review your contact details" and "💼 Next up"
// stood visibly taller than "Here's the plan" and "One thing first", which have no icon.
// Same CSS, two different heading sizes on screen, with nothing in the markup to explain
// why.
//
// So the icon gets a size of its own, set slightly below the text and with its line-box
// pinned, which is what stops it driving the line height. The result is one heading size
// across every card, icon or not.
//
// `text-[10px]` rather than a responsive pair on purpose: this is a label, not content.
// It reads the same at every width, and the cards around it already handle their own
// reflow.
const CardEyebrow = ({ icon, children, className = '' }) => (
  <p
    className={`font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 ${className}`}
  >
    {icon ? (
      <>
        <span
          aria-hidden="true"
          className="mr-1 inline-block align-middle text-[11px] leading-none"
        >
          {icon}
        </span>
        <span className="align-middle">{children}</span>
      </>
    ) : (
      children
    )}
  </p>
);

export default CardEyebrow;
