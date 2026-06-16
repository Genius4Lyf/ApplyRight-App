// Shape-matched skeleton for Dashboard.jsx's landing layout (welcome heading,
// two workflow cards, drafts grid). Rendered while the first drafts fetch is
// in flight so the page never paints empty between splash-hide and data load.

const Shimmer = ({ className = '' }) => (
  <div className={`bg-slate-200/70 dark:bg-slate-700/70 rounded animate-pulse ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="animate-in fade-in duration-200">
    <div className="max-w-3xl mx-auto text-center mb-12 space-y-4 flex flex-col items-center">
      <Shimmer className="h-6 w-44 rounded-full" />
      <Shimmer className="h-10 w-3/4" />
      <Shimmer className="h-5 w-2/3" />
      <Shimmer className="h-5 w-1/2" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"
        >
          <Shimmer className="w-14 h-14 rounded-xl mb-6" />
          <Shimmer className="h-7 w-1/2 mb-3" />
          <Shimmer className="h-4 w-full mb-2" />
          <Shimmer className="h-4 w-5/6 mb-2" />
          <Shimmer className="h-4 w-2/3 mb-6" />
          <Shimmer className="h-5 w-32 mt-auto" />
        </div>
      ))}
    </div>

    <div className="mb-16">
      <div className="flex items-center gap-2 mb-6">
        <Shimmer className="w-5 h-5 rounded" />
        <Shimmer className="h-5 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col"
          >
            <div className="flex justify-between items-start mb-3">
              <Shimmer className="w-10 h-10 rounded-lg" />
              <Shimmer className="h-4 w-16 rounded-full" />
            </div>
            <Shimmer className="h-5 w-3/4 mb-2" />
            <Shimmer className="h-3 w-full mb-1" />
            <Shimmer className="h-3 w-5/6 mb-4" />
            <Shimmer className="h-4 w-24 mt-auto" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default DashboardSkeleton;
