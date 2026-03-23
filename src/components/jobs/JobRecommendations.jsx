import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowRight, Loader2, TrendingUp, Globe, MapPin } from 'lucide-react';
import MatchScoreBadge from './MatchScoreBadge';
import jobSearchService from '../../services/jobSearchService';

const JobRecommendations = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isTrending, setIsTrending] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const hasProfile = !!user.jobProfile?.desiredTitle;

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      if (hasProfile) {
        // Personalized recommendations
        const data = await jobSearchService.getRecommendations(1, 6);
        setJobs(data.results || []);
        setMessage(data.message || '');
        setIsTrending(false);
      } else {
        // Trending jobs for all users
        const data = await jobSearchService.getTrending('mixed', 1, 6);
        setJobs(data.results || []);
        setIsTrending(true);
      }
    } catch (error) {
      console.error('Failed to load jobs', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900">{hasProfile ? 'Jobs for You' : 'Trending Jobs'}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (message && !jobs.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900">Jobs for You</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-slate-500 mb-3">{message}</p>
          <button
            onClick={() => navigate('/jobs')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Set up job preferences
          </button>
        </div>
      </div>
    );
  }

  if (!jobs.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isTrending ? (
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          ) : (
            <Briefcase className="w-5 h-5 text-indigo-600" />
          )}
          <h3 className="font-semibold text-slate-900">
            {isTrending ? 'Trending Jobs' : 'Jobs for You'}
          </h3>
        </div>
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          See all <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.slice(0, 6).map((job) => {
          const isGlobal = job.source !== 'jobberman';

          return (
            <div
              key={job.externalId || job._id}
              onClick={() => navigate('/jobs')}
              className="bg-white p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5 group flex flex-col justify-between min-h-[110px]"
            >
              <div className="flex items-start gap-3 mb-3">
                {job.matchScore != null && (
                  <MatchScoreBadge score={job.matchScore} size="sm" />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {job.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{job.company}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                <span className="text-xs text-slate-400 line-clamp-1 flex-1 pr-3">
                  {job.location || 'Location missing'}
                </span>

                {isGlobal ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md shrink-0 border border-indigo-100/50">
                    <Globe className="w-3 h-3" /> Global
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md shrink-0 border border-emerald-100/50">
                    <MapPin className="w-3 h-3" /> Local
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JobRecommendations;
