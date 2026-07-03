// Small dark-mode-aware metric card shared by the agent Dashboard + Earnings tabs.
const StatCard = ({ label, value, sub, icon: Icon, tone }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </span>
      {Icon && <Icon className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
    </div>
    <p
      className={`text-2xl font-extrabold leading-tight break-words ${tone || 'text-slate-900 dark:text-slate-100'}`}
    >
      {value}
    </p>
    {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
  </div>
);

export default StatCard;
