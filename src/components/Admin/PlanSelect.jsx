import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const PlanSelect = ({ value = 'free', onChange, disabled = false, size = 'sm' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (planValue) => {
    if (disabled) return;
    onChange(planValue);
    setIsOpen(false);
  };

  const isPaid = value === 'paid';

  // Sizing styles
  const sizeClasses = {
    sm: 'text-xs font-semibold px-2.5 py-1 rounded-full border',
    md: 'text-sm font-medium px-3.5 py-1.5 rounded-lg border',
  };

  // Color styles based on selection
  const colorClasses = isPaid
    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-200 focus:ring-emerald-300'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 focus:ring-slate-300';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses[size]} ${colorClasses}`}
      >
        <span className="capitalize">{value}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-28 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 origin-top-left animate-in fade-in slide-in-from-top-1 duration-100">
          <button
            type="button"
            onClick={() => handleSelect('free')}
            className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center justify-between transition-colors ${
              !isPaid
                ? 'bg-slate-50 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span>Free</span>
            {!isPaid && <Check className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
          </button>
          <button
            type="button"
            onClick={() => handleSelect('paid')}
            className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center justify-between transition-colors ${
              isPaid
                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <span>Paid</span>
            {isPaid && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default PlanSelect;
