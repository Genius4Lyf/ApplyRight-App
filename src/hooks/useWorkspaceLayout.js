import { useCallback, useSyncExternalStore } from 'react';

// The workspace sidebar's responsive contract — the sibling of useStudioLayout, for the
// surfaces that host WorkspaceSidebar rather than Aria Studio's SessionRail.
//
//   < 1280px   the sidebar is a left drawer over the page (today's behaviour everywhere)
//   ≥ 1280px   it can sit inline as a persistent 248px panel, if the surface asked for
//              one and the user hasn't collapsed it
//
// 1280 = Tailwind's `xl`, and it is a width budget, not a taste call. The prep dashboard
// puts a 300px rail beside its content from `lg` (1024px) up, so at 1024 an inline panel
// would leave 1024 − 32 gutter − 248 panel − 16 gap − 64 padding − 300 rail − 24 gap =
// ~340px of actual content. At 1280 the same arithmetic gives ~596px, and at 1440 the
// content is byte-for-byte as wide as it is today. So the panel appears only once there
// is room to seat a third column, never merely because the page went two-column.
export const WORKSPACE_PANEL_MIN = 1280;

// jsdom does not implement matchMedia, and suites that never cared about widths do not
// stub it. Guarding HERE rather than in each consumer means a hook that only *might* ask
// about the viewport can be called from such a test and simply read as "not matching",
// instead of throwing on render.
const query = (q) =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null;

// matchMedia IS an external store, so subscribe to it as one — same reasoning as
// useStudioLayout: the current value is read on every render rather than mirrored into
// state, so there is no cascading render and no window where React disagrees with the
// viewport.
function useMedia(q) {
  const subscribe = useCallback(
    (onChange) => {
      const mq = query(q);
      if (!mq) return () => {};
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [q]
  );
  return useSyncExternalStore(
    subscribe,
    () => query(q)?.matches ?? false,
    () => false // server/prerender: assume the widest layout
  );
}

/**
 * Whether a workspace sidebar has an inline home at this width.
 *
 * There is deliberately NO collapse preference here — no state, no localStorage. Where
 * the panel fits, it is simply part of the page, the way a document's margin is: a control
 * to fold it away invites a decision nobody wants to make twice, and buys back 248px on a
 * screen that already had room to spare. Below the threshold it is a drawer, which is a
 * different thing, opening and closing for its own reasons (see useWorkspaceSidebar).
 *
 * Deliberately NOT useStudioLayout. That hook carries the whole right-hand artifact panel
 * (panelView / closePreview / panelOverlay), which no sidebar host needs, and Aria Studio
 * DOES let you collapse its rail — its stored preference lives under `ariaStudio:railOpen`
 * and has nothing to do with this.
 *
 * `enabled` is the host surface's opt-in, and today only the interview prep pages ask for
 * it. When false the hook still runs (hooks cannot be conditional) but reports no inline
 * home, so the surfaces that only ever wanted a drawer are untouched by sharing the code
 * path.
 */
export function useWorkspaceLayout({ enabled = false } = {}) {
  const wideEnough = useMedia(`(min-width: ${WORKSPACE_PANEL_MIN}px)`);
  return { railInline: enabled && wideEnough };
}
