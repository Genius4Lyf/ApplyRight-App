import React from 'react';

// Aria's mark — a satellite orbiting a dot. `working` spins it faster + pulses the
// ring (she's drafting). Reuses the .aria-orbit keyframe from the focus bar; scaling
// keeps the same three spans crisp at any size.
export default function AriaOrbit({ size = 20, working = false, className = '' }) {
  const inner = (
    <span
      className={`relative grid place-items-center ${working ? 'aria-orbit-work' : ''}`}
      style={{ width: 20, height: 20 }}
    >
      <span className="aria-orbit-ring absolute inset-0 rounded-full border-[1.5px] border-indigo-400/30 dark:border-indigo-400/25" />
      <span className="aria-orbit w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400" />
      <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
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
