import React, { useState, useEffect } from 'react';
import {
  X, ExternalLink, Bookmark, BookmarkCheck, Building2, MapPin,
  Clock, Sparkles, FileText, Package,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import MatchScoreBadge from './MatchScoreBadge';
import MatchBreakdown from './MatchBreakdown';
import TailorCVButton from './TailorCVButton';
import jobSearchService from '../../services/jobSearchService';

const JobDetailPanel = ({
  result,
  searchId,
  isOpen,
  onClose,
  onToggleSave,
  onApplyClick,
  userCVs,
  onTailorSuccess,
}) => {
  const [fullDescription, setFullDescription] = useState(result?.fullDescription || '');
  const [loadingDesc, setLoadingDesc] = useState(false);

  useEffect(() => {
    if (isOpen && result && !result.fullDescription && !fullDescription) {
      loadFullDescription();
    } else if (result?.fullDescription) {
      setFullDescription(result.fullDescription);
    }
  }, [isOpen, result]);

  const loadFullDescription = async () => {
    setLoadingDesc(true);
    try {
      const detailed = await jobSearchService.getJobDetails(searchId, result._id);
      setFullDescription(detailed.fullDescription || detailed.snippet || '');
    } catch {
      setFullDescription(result.snippet || 'Failed to load description');
    } finally {
      setLoadingDesc(false);
    }
  };

  if (!result) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <MatchScoreBadge score={result.matchScore} size="lg" />
                <div>
                  <h2 className="font-bold text-lg text-slate-900">{result.title}</h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <Building2 className="w-4 h-4" />
                    {result.company}
                  </div>
                  {result.location && (
                    <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500">
                      <MapPin className="w-4 h-4" />
                      {result.location}
                    </div>
                  )}
                  {result.salary && (
                    <div className="mt-1 text-sm font-medium text-emerald-600">{result.salary}</div>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Match Breakdown */}
              {result.matchBreakdown && result.matchScore !== null && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Match Breakdown</h3>
                  <MatchBreakdown breakdown={result.matchBreakdown} />
                </div>
              )}

              {/* Job Description */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Job Description</h3>
                {loadingDesc ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                    {fullDescription || result.snippet || 'No description available'}
                  </div>
                )}
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`px-2 py-1 rounded-full ${
                  result.source === 'jobberman'
                    ? 'bg-green-50 text-green-600'
                    : 'bg-blue-50 text-blue-600'
                }`}>
                  {result.source === 'jobberman' ? 'Local' : 'Global'}
                </span>
                {result.category && (
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{result.category}</span>
                )}
                {result.postedDate && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(result.postedDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-5 border-t border-slate-200 space-y-2">
              <div className="flex gap-2">
                {result.applyUrl && (
                  <button
                    onClick={() => onApplyClick(searchId, result._id, result.applyUrl)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Apply Now <ExternalLink className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onToggleSave(searchId, result._id)}
                  className={`px-3 py-2.5 rounded-lg border transition-colors ${
                    result.saved
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-500'
                  }`}
                >
                  {result.saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>

              {/* Tailor CV Button */}
              <TailorCVButton
                searchId={searchId}
                resultId={result._id}
                jobTitle={result.title}
                company={result.company}
                userCVs={userCVs}
                onSuccess={onTailorSuccess}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default JobDetailPanel;
