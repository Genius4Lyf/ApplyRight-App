// Shared editorial header for CV-builder steps: a font-mono section eyebrow, a
// serif title, and a muted subtitle — with an optional right-side action slot.
// Replaces the old per-step colored icon-coin + sans-serif bold headers.
const StepHeader = ({ eyebrow, title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3 mb-6">
    <div className="min-w-0">
      {eyebrow && (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 font-heading text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export default StepHeader;
