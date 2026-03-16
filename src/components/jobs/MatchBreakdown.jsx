import React from 'react';
import { Code, Briefcase, MapPin, Target } from 'lucide-react';

const categories = [
  { key: 'skillsScore', label: 'Skills', icon: Code, color: 'indigo' },
  { key: 'experienceScore', label: 'Experience', icon: Briefcase, color: 'emerald' },
  { key: 'locationScore', label: 'Location', icon: MapPin, color: 'amber' },
  { key: 'titleScore', label: 'Title Match', icon: Target, color: 'violet' },
];

const colorMap = {
  indigo: { bg: 'bg-indigo-500', track: 'bg-indigo-100', text: 'text-indigo-700' },
  emerald: { bg: 'bg-emerald-500', track: 'bg-emerald-100', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-500', track: 'bg-amber-100', text: 'text-amber-700' },
  violet: { bg: 'bg-violet-500', track: 'bg-violet-100', text: 'text-violet-700' },
};

const MatchBreakdown = ({ breakdown }) => {
  if (!breakdown || breakdown.skillsScore === null) {
    return (
      <div className="text-sm text-slate-400 italic py-2">
        Create a CV to see match breakdown
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map(({ key, label, icon: Icon, color }) => {
        const score = breakdown[key] ?? 0;
        const colors = colorMap[color];
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                <span className="text-xs font-medium text-slate-600">{label}</span>
              </div>
              <span className={`text-xs font-bold ${colors.text}`}>{score}%</span>
            </div>
            <div className={`h-1.5 rounded-full ${colors.track}`}>
              <div
                className={`h-full rounded-full ${colors.bg} transition-all duration-500`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MatchBreakdown;
