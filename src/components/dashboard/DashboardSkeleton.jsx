// Shape-matched skeleton for Dashboard.jsx's redesigned landing (left-aligned
// hero + two intent pillars, each a two-card row). Rendered while the first
// drafts fetch is in flight so the page never paints empty between splash-hide
// and data load.

const Shimmer = ({ className = '' }) => (
  <div className={`bg-slate-200/70 dark:bg-slate-700/70 rounded animate-pulse ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="animate-in fade-in duration-200">
    {/* Hero — left-aligned: eyebrow → serif title → subtitle */}
    <div className="max-w-3xl mb-12">
      <Shimmer className="h-3 w-28" />
      <Shimmer className="h-9 w-2/3 mt-3" />
      <Shimmer className="h-4 w-1/2 mt-3" />
    </div>

    {/* Two intent pillars */}
    <div className="space-y-10 mb-16">
      {[0, 1].map((p) => (
        <section key={p}>
          {/* Pillar eyebrow + hairline rule */}
          <div className="flex items-center gap-3 mb-4">
            <Shimmer className="h-3 w-24 shrink-0" />
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Card row */}
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4">
            {[0, 1].map((c) => (
              <div
                key={c}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-6 flex flex-col"
              >
                <Shimmer className="w-5 h-5 mb-4" />
                <Shimmer className="h-6 w-1/2 mb-3" />
                <Shimmer className="h-4 w-full mb-2" />
                <Shimmer className="h-4 w-5/6 mb-6" />
                <Shimmer className="h-4 w-28 mt-auto" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);

export default DashboardSkeleton;
