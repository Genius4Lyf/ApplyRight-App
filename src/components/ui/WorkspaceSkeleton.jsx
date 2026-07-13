import React from 'react';

// Pulsing placeholder that mirrors the two-column editorial workspace (identity
// + momentum rail on the left, a centered note-deck on the right) so the loading
// state matches the real layout instead of a spinner or off-shape cards.
//
// Placeholder blocks are either solid (bg-slate-200 dark:bg-slate-700) or faint
// (bg-slate-100 dark:bg-slate-800); the root drives the pulse.
export default function WorkspaceSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 lg:gap-12 items-stretch animate-pulse">
      {/* LEFT RAIL */}
      <div className="flex flex-col">
        {/* Identity */}
        <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 h-8 w-44 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 h-3 w-52 rounded bg-slate-100 dark:bg-slate-800" />

        {/* Momentum — vertical list on desktop */}
        <div className="mt-8 hidden lg:block">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-3.5 border-b border-slate-200 dark:border-slate-700 ${
                i === 0 ? 'border-t' : ''
              }`}
            >
              <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-6 w-10 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>

        {/* Momentum — 2×2 grid on mobile */}
        <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 lg:hidden">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="px-4 py-3 border-slate-200 dark:border-slate-700 [&:nth-child(2)]:border-l [&:nth-child(4)]:border-l [&:nth-child(3)]:border-t [&:nth-child(4)]:border-t"
            >
              <div className="h-6 w-10 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>

        {/* Toggle + CTA */}
        <div className="mt-7 h-11 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="mt-3.5 h-11 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* RIGHT MAIN */}
      <div className="flex flex-col">
        {/* Controls row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>

        {/* Centered note-card skeleton */}
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-[430px] mx-auto overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {/* Binding */}
            <div className="flex h-[26px] items-center gap-4 border-b border-slate-100 dark:border-slate-700 px-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="h-[9px] w-[9px] rounded-full bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>

            {/* Body */}
            <div className="relative px-6 pl-10 py-5">
              {/* Stamp */}
              <div className="absolute top-4 right-6 h-9 w-14 rounded bg-slate-200 dark:bg-slate-700" />

              {/* Header */}
              <div className="pr-24">
                <div className="h-2.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* Verdict */}
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-11/12 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
              </div>

              {/* Band rail */}
              <div className="mt-4 h-1.5 w-full rounded bg-slate-100 dark:bg-slate-800" />

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 dark:border-slate-700 pt-4">
                <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Dots + hint */}
        <div className="mt-4 flex items-center justify-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 w-4 rounded-full bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="mt-2 h-2 w-40 mx-auto rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
