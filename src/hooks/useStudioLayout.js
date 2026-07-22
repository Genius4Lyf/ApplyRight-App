import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';

// Aria Studio's responsive contract, in one place so the shell and its panes can't
// disagree about what "mobile" means.
//
//   < 820px   phone/small tablet — ONE pane at a time. Rail is a left drawer, the
//             artifact panel is a bottom sheet. Chat is full-bleed.
//   820–1100  the rail is inline (there's room for it), but the panel still uses the
//             sheet — two side panes at 900px would squeeze the chat to nothing.
//   ≥ 1100    the full three-pane desk.
export const MOBILE_MAX = 820;
export const PANEL_MIN = 1100;

const query = (q) => (typeof window !== 'undefined' ? window.matchMedia(q) : null);

// matchMedia IS an external store, so subscribe to it as one. useSyncExternalStore reads
// the CURRENT value on every render rather than mirroring it into state via an effect —
// no cascading render, and no window where React's copy disagrees with the viewport.
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
 * Layout mode + persisted collapse preferences.
 *
 * The prefs are the USER's intent, stored independently of the viewport: someone who
 * collapsed the panel on a wide screen should still find it collapsed when they come
 * back, and a narrow window shouldn't overwrite that choice. So the hook returns both
 * the stored preference and whether each pane can be inline at this width.
 */
export function useStudioLayout() {
  const isMobile = useMedia(`(max-width: ${MOBILE_MAX - 1}px)`);
  const panelCanBeInline = useMedia(`(min-width: ${PANEL_MIN}px)`);

  const [railOpen, setRailOpen] = useState(() => {
    try {
      return localStorage.getItem('ariaStudio:railOpen') !== '0';
    } catch {
      return true;
    }
  });
  // The right panel is now a THREE-state view, not an open/closed boolean:
  //   'insights' — the narrow, fixed-width StudioArtifactPanel (≈ today's panel)
  //   'preview'  — the WIDE StudioLivePreview that shares the room with the chat
  //   null       — closed; the chat owns everything
  // Migrated from the old `panelOpen` flag so a returning user keeps their preference.
  const [panelView, setPanelViewRaw] = useState(() => {
    try {
      const v = localStorage.getItem('ariaStudio:panelView');
      if (v === 'preview' || v === 'insights') return v;
      if (v === 'none') return null;
      // First run after the upgrade: honour the old open/closed boolean.
      return localStorage.getItem('ariaStudio:panelOpen') === '0' ? null : 'insights';
    } catch {
      return 'insights';
    }
  });

  // Mirror of panelView for the setter's guard — synced in an effect (not during render)
  // and read only inside event-handler callbacks, so it's always the committed value.
  const panelViewRef = useRef(panelView);
  useEffect(() => {
    panelViewRef.current = panelView;
  }, [panelView]);
  // The rail's open/closed state from JUST BEFORE the preview collapsed it, so closing
  // the preview can put it back exactly where the user had it.
  const railBeforePreviewRef = useRef(null);

  // Opening the WIDE preview auto-collapses the sessions rail, so the preview has room to
  // breathe (P1). The rail is the pressure valve — re-opening it splits chat/preview
  // equally. Centralised here so the rule is one place (and unit-testable) rather than
  // living in whichever button happened to trigger it.
  const setPanelView = useCallback((v) => {
    if (v === 'preview' && panelViewRef.current !== 'preview') {
      // Remember the rail's prior state before hiding it, so closePreview can restore it.
      setRailOpen((prev) => {
        railBeforePreviewRef.current = prev;
        return false;
      });
    }
    setPanelViewRaw(v);
  }, []);

  // Close the WIDE preview by RETURNING TO THE DEFAULT working view — the narrow insights
  // panel AND the sessions rail restored to where it was before preview opened (open if
  // there's nothing to restore). One action instead of leaving the user on a bare chat to
  // re-toggle both. Desktop only — the mobile sheet just closes.
  const closePreview = useCallback(() => {
    setPanelViewRaw('insights');
    setRailOpen(railBeforePreviewRef.current ?? true);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ariaStudio:railOpen', railOpen ? '1' : '0');
    } catch {
      /* storage unavailable — the preference just won't persist */
    }
  }, [railOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('ariaStudio:panelView', panelView || 'none');
    } catch {
      /* storage unavailable — the preference just won't persist */
    }
  }, [panelView]);

  // Overlay presentation state. Kept separate from the inline preference: dismissing a
  // drawer must not be remembered as "I want the rail collapsed on desktop".
  const [railOverlayWanted, setRailOverlay] = useState(false);
  const [panelOverlayWanted, setPanelOverlay] = useState(false);

  // DERIVED, not synced: an overlay is open only when it's wanted AND this width
  // actually presents it that way. Resizing past a breakpoint therefore closes it for
  // free — no effect, and no frame where a scrim sits over an inline pane.
  const railOverlay = railOverlayWanted && isMobile;
  const panelOverlay = panelOverlayWanted && !panelCanBeInline;

  return {
    isMobile,
    // The rail is inline whenever there's room AND the user hasn't collapsed it.
    railInline: !isMobile && railOpen,
    panelInline: panelCanBeInline && panelView !== null,
    railOpen,
    setRailOpen,
    panelView,
    setPanelView,
    closePreview,
    railOverlay,
    setRailOverlay,
    panelOverlay,
    setPanelOverlay,
    // Below PANEL_MIN the panel has no inline home, so its toggle opens the sheet.
    panelUsesSheet: !panelCanBeInline,
  };
}

// Pure mapping from layout state → the data-attrs the Studio's main row exposes for the
// CSS width negotiation (index.css keys flex-grow off `[data-panel]` × `[data-rail]`,
// mirroring the approved mock's data-mode × data-sessions). Kept separate and exported so
// the reflow contract is unit-testable without a DOM:
//   preview + rail closed → preview major (chat gives up width)
//   preview + rail open   → equal split
//   insights / none       → chat owns the room (panel is fixed-width or gone)
export function studioMainAttrs({ panelView, panelInline, railInline }) {
  return {
    'data-panel': panelInline ? panelView || 'none' : 'none',
    'data-rail': railInline ? 'open' : 'closed',
  };
}
