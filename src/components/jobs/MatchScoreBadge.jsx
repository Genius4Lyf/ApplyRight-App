import React from 'react';

const MatchScoreBadge = ({ score, size = 'md' }) => {
  if (score === null || score === undefined) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-semibold border border-slate-200 ${
          size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-10 h-10 text-sm'
        }`}
        title="No CV available for scoring"
      >
        --
      </div>
    );
  }

  let colorClasses = '';
  if (score >= 70) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (score >= 40) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else {
    colorClasses = 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-bold border ${colorClasses} ${
        size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-10 h-10 text-sm'
      }`}
      title={`${score}% match`}
    >
      {score}
    </div>
  );
};

export default MatchScoreBadge;
