import React from 'react';

// Aria's mark — a satellite orbiting a dot. `working` spins it faster + pulses the
// ring (she's drafting). Reuses the .aria-orbit keyframe from the focus bar; scaling
// keeps the same three spans crisp at any size.
//
// `tone`: 'aria' (default) is ink — black in light mode, white in dark mode.
// 'mono' inherits currentColor instead, for placements where a flat ink dot
// can't be read against its own background: inside a slate-900 button in
// light mode, default-tone black-on-near-black is nearly invisible, so those
// spots use mono to pick up the button's own (already-contrasting) text
// colour. Colour lives here (not in a CSS override) because these are
// Tailwind utilities and the .aria-* rules sit in @layer components, which
// utilities would win against regardless of specificity.
export default function AriaOrbit({ size = 20, working = false, tone = 'aria', className = '' }) {
  const mono = tone === 'mono';
  const ringTone = mono ? 'border-current opacity-30' : 'border-slate-900/30 dark:border-white/25';
  const dotTone = mono ? 'bg-current' : 'bg-slate-900 dark:bg-white';
  const inner = (
    <span
      className={`relative grid place-items-center ${working ? 'aria-orbit-work' : ''}`}
      style={{ width: 20, height: 20 }}
    >
      <span
        className={`aria-orbit-ring absolute inset-0 rounded-full border-[1.5px] ${ringTone}`}
      />
      <span className={`aria-orbit w-1 h-1 rounded-full ${dotTone}`} />
      <span className={`w-2 h-2 rounded-full ${dotTone}`} />
    </span>
  );
  if (size === 20) return <span className={`shrink-0 ${className}`}>{inner}</span>;
  return (
    <span className={`shrink-0 inline-block ${className}`} style={{ width: size, height: size }}>
      <span
        className="block"
        style={{
          width: 20,
          height: 20,
          transformOrigin: 'top left',
          transform: `scale(${size / 20})`,
        }}
      >
        {inner}
      </span>
    </span>
  );
}
