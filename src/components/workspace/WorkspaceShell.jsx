import React from 'react';

// The app shell for a workspace surface: an optional inline sidebar column, a header,
// and a content pane that scrolls inside a fixed frame.
//
// Shared by the interview prep dashboard (all three of its returns) and the prep index,
// because the two sit at the same address and any drift between them would show as the
// card jumping size or corner radius the instant a prep loads.
//
// There is no top navbar here: everything one held — Home, My CVs, Aria Studio, dark
// mode, the wallet, the profile menu — is already in the workspace sidebar, so on a wide
// screen a nav bar above a list you had to open a modal to see was chrome describing
// chrome. The sidebar became the nav instead, the way Aria Studio's rail is.
//
// `fixed inset-0` rather than a scrolling document, so the panel stays put while the
// content moves under it.
//
// The loading and error states render through here too. If they didn't, the panel would
// pop in and the whole page would jump from document scroll to a fixed shell the moment
// the fetch landed.
const WorkspaceShell = ({ sidebar, inlineSidebar, header, scrollRef, children, overlays }) => (
  <div className="fixed inset-0 flex flex-col overflow-hidden bg-transparent">
    {/* Portaled to the body — position in this tree is immaterial. */}
    {sidebar}

    {/* Flush to the viewport, same as Aria Studio: the sidebar's own right hairline is
        the only line between it and the content — no card frame, gap or padding. */}
    <div className="flex-1 min-h-0 w-full flex min-w-0">
      {inlineSidebar}

      <div className="min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
        {header}
        {/* THE scroll container. `overflow-y-auto` rather than `chat-scroll`, because this
            holds a long document and a document that scrolls should say so with a
            scrollbar — but `overscroll-contain` all the same, so exhausting it cannot
            rubber-band the fixed shell around it on iOS. */}
        <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>

    {/* Modals sit outside the scrolling pane on purpose. Both are viewport-fixed today
        (CVViewModal portals, AdPlayer is `fixed inset-0`) and nothing here establishes a
        containing block — but keeping them out means that stays true even if the pane
        later grows a transform. */}
    {overlays}
  </div>
);

export default WorkspaceShell;
