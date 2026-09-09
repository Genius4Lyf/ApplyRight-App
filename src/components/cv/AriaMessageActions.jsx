import React from 'react';
import AriaOrbit from './AriaOrbit';
import CopyMessageButton from './CopyMessageButton';
import MessageFeedback from './MessageFeedback';

// The row of controls under one of Aria's replies.
//
// It was four identical copies of this, inline in StudioChat, AriaChat, AskAriaGenerate
// and ATSCoachPanel:
//
//   <div className="flex items-center gap-1">
//     <AriaOrbit size={16} className="aria-mark ml-1" />
//     <CopyMessageButton text={m.text} />
//   </div>
//
// TWO THINGS ARE FIXED BY MOVING IT HERE.
//
// 1. THE ALIGNMENT. Aria's message text sits at `px-1` — 4px from the left of her column.
//    The orbit came FIRST in this row and, being `visibility: hidden` on every row but
//    the latest (see .aria-mark in index.css), it still reserved its full width. So under
//    every message there was an invisible 16px element plus its margins holding the Copy
//    control ~26px to the right of the text it belonged to, with nothing on screen to
//    explain the indent. The controls lead now and the orbit trails, so the row starts
//    where the words start. `-ml-0.5` cancels the first button's own 6px inset, which is
//    what actually lands the glyph on 4px.
//
// 2. THE ORBIT STAYS EXACTLY WHAT IT WAS. Still `.aria-mark`, still one per conversation
//    on the newest reply, still reserving its space rather than being display:none — so
//    nothing shifts as new messages arrive. It reads as a signature at the end of her
//    latest answer rather than a bullet in front of a toolbar.
const AriaMessageActions = ({ text, feedbackId }) => (
  <div className="-ml-0.5 flex items-center gap-0.5">
    <CopyMessageButton text={text} />
    <MessageFeedback feedbackId={feedbackId} />
    <AriaOrbit size={16} className="aria-mark ml-1" />
  </div>
);

export default AriaMessageActions;
