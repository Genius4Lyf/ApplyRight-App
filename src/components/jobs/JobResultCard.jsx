import React from 'react';
import { MapPin, Building2, Clock, ExternalLink } from 'lucide-react';

const JobResultCard = ({ result, searchId, onViewDetails, onApplyClick }) => {
  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col h-full"
      onClick={() => onViewDetails(result)}
    >
      <div className="flex items-start gap-3 h-full">
        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-indigo-500" />
        </div>

        <div className="flex-1 min-w-0 flex flex-col h-full">
          <h3 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
            {result.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {result.company}
            </span>
            {result.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="line-clamp-1">{result.location}</span>
              </span>
            )}
          </div>

          {result.salary && (
            <div className="mt-1.5 text-xs font-medium text-emerald-600">{result.salary}</div>
          )}

          {result.snippet && (
            <p className="mt-2 text-xs text-slate-500 line-clamp-2">{result.snippet}</p>
          )}

          <div className="flex items-center justify-between mt-auto pt-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  result.source === 'jobberman'
                    ? 'bg-green-50 text-green-600'
                    : 'bg-blue-50 text-blue-600'
                }`}
              >
                {result.source === 'jobberman' ? 'Local' : 'Global'}
              </span>
              {result.postedDate && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  {timeAgo(result.postedDate)}
                </span>
              )}
            </div>

            {result.applyUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyClick(searchId, result._id, result.applyUrl);
                }}
                className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Apply <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobResultCard;
