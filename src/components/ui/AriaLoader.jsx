import React from 'react';
import AriaOrbit from '../cv/AriaOrbit';

// The app's single loading signal: Aria's orbit, working. Every "we're busy" state
// routes through here so the semantics (centring, the live-region announcement, the
// reduced-motion fallback) are defined once instead of per spinner.
//
//   size        px. Don't go below ~14 — the orbit turns to mush.
//   label       what screen readers hear. The orbit is decorative spans, so without
//               this the wait is announced as nothing at all. Pass label="" when the
//               parent already says it out loud (a button reading "Saving…"): the
//               mark then goes aria-hidden rather than repeating the same words.
//   tone        'aria' = indigo (Aria is working). 'mono' = currentColor, required
//               on ink buttons where indigo-500 can't be read against the fill.
//   fullscreen  route-level waits: a fixed overlay pinned to the viewport, so the
//               orbit lands dead-centre of the PAGE — not centred inside whatever
//               container happens to wrap it, and not pushed off-centre by the nav
//               or by half-rendered content. Section/panel loaders don't use this.
//   inline      no wrapper box — sit in the text flow, e.g. inside a button.
//
// Reduced motion: the .aria-orbit rules already freeze the satellite. A frozen mark
// reads as "stuck" rather than "loading", so .aria-loader-mark adds a slow breath
// under that media query (see index.css).
export default function AriaLoader({
  size = 28,
  label = 'Loading…',
  tone = 'aria',
  fullscreen = false,
  inline = false,
  className = '',
}) {
  const mark = (
    <span className="aria-loader-mark inline-grid place-items-center">
      <AriaOrbit size={size} working tone={tone} />
    </span>
  );

  // No label => the surrounding UI already announces the wait; don't double-speak.
  if (!label) {
    return (
      <span aria-hidden="true" className={`inline-flex items-center ${className}`}>
        {mark}
      </span>
    );
  }

  if (inline) {
    return (
      <span role="status" aria-live="polite" className={`inline-flex items-center ${className}`}>
        {mark}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  // Route-level: pin to the viewport and paint the app background over whatever is
  // behind, so nothing half-rendered shifts around the orbit while the route loads.
  if (fullscreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-0 z-50 grid place-items-center bg-background ${className}`}
      >
        {mark}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center w-full py-10 ${className}`}
    >
      {mark}
      <span className="sr-only">{label}</span>
    </div>
  );
}
