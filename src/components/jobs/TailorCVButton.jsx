import React, { useState } from 'react';
import { Sparkles, ChevronDown, FileText, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jobSearchService from '../../services/jobSearchService';

const TailorCVButton = ({ searchId, resultId, jobTitle, company, userCVs = [], onSuccess }) => {
  const [selectedCV, setSelectedCV] = useState(userCVs[0]?._id || '');
  const [showSelector, setShowSelector] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [bundling, setBundling] = useState(false);

  const handleTailor = async () => {
    if (!selectedCV) {
      toast.error('Please select a CV to tailor');
      return;
    }

    setTailoring(true);
    try {
      const result = await jobSearchService.tailorCV(searchId, resultId, selectedCV);
      toast.success(`CV tailored for ${jobTitle} at ${company}!`);

      // Dispatch credit update
      if (result.remainingCredits !== undefined) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: result.remainingCredits }));
      }

      onSuccess?.(result);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Insufficient credits', {
          description: `You need ${error.response.data.required} credits. You have ${error.response.data.available}.`,
          action: {
            label: 'Get Credits',
            onClick: () => (window.location.href = '/credits'),
          },
        });
      } else {
        toast.error('Failed to tailor CV');
      }
    } finally {
      setTailoring(false);
    }
  };

  const handleBundle = async () => {
    if (!selectedCV) {
      toast.error('Please select a CV to tailor');
      return;
    }

    setBundling(true);
    try {
      const result = await jobSearchService.tailorBundle(searchId, resultId, selectedCV);
      toast.success('Bundle generated! CV + Cover Letter + Interview Prep');

      if (result.remainingCredits !== undefined) {
        window.dispatchEvent(new CustomEvent('credit_updated', { detail: result.remainingCredits }));
      }

      onSuccess?.(result);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Insufficient credits', {
          description: `You need ${error.response.data.required} credits. You have ${error.response.data.available}.`,
          action: {
            label: 'Get Credits',
            onClick: () => (window.location.href = '/credits'),
          },
        });
      } else {
        toast.error('Failed to generate bundle');
      }
    } finally {
      setBundling(false);
    }
  };

  if (!userCVs.length) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-slate-400">Create a CV first to tailor it for this job</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* CV Selector */}
      {userCVs.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <FileText className="w-4 h-4" />
              {userCVs.find((cv) => cv._id === selectedCV)?.title || 'Select CV'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showSelector && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
              {userCVs.map((cv) => (
                <button
                  key={cv._id}
                  onClick={() => {
                    setSelectedCV(cv._id);
                    setShowSelector(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                    selectedCV === cv._id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'
                  }`}
                >
                  {cv.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleTailor}
          disabled={tailoring || bundling}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {tailoring ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {tailoring ? 'Tailoring...' : 'Tailor CV (15 cr)'}
        </button>

        <button
          onClick={handleBundle}
          disabled={tailoring || bundling}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
          title="CV + Cover Letter + Interview Prep"
        >
          {bundling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Package className="w-4 h-4" />
          )}
          {bundling ? '...' : 'Bundle (20 cr)'}
        </button>
      </div>
    </div>
  );
};

export default TailorCVButton;
