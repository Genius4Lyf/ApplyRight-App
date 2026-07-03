import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Briefcase, FileText, FileDown, Wallet, Sparkles, Plus, Lock, ArrowRight } from 'lucide-react';
import Navbar from '../../components/Navbar';
import CVCard from '../../components/CVCard';
import StatCard from '../../components/Agent/StatCard';
import AgentService from '../../services/agent.service';
import CVService from '../../services/cv.service';
import { formatNgn } from '../../lib/plans';
import { signalReady } from '../../utils/splash';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentCVs, setRecentCVs] = useState([]);
  const [loading, setLoading] = useState(true);

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    user = {};
  }

  useEffect(() => {
    signalReady();
    let cancelled = false;
    AgentService.getSummary()
      .then((d) => !cancelled && setSummary(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    CVService.getMyDrafts()
      .then((d) => !cancelled && setRecentCVs(Array.isArray(d) ? d.slice(0, 4) : []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const plan = summary?.plan || {};
  const hasPlan = !!plan.active;
  const rate = summary?.rateNgn || 500;
  const cvCount = summary?.cvCount ?? 0;
  const downloadsAllTime = summary?.downloads?.allTime ?? 0;
  const earnedAllTime = downloadsAllTime * rate;
  const credits = summary?.credits?.available ?? 0;

  const startCV = () => {
    if (!hasPlan) {
      toast.error('An active agent plan is required to create CVs.');
      navigate('/upgrade');
      return;
    }
    navigate('/cv-builder/new');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5 text-amber-600">
            <Briefcase className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Agent workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Welcome{user.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build CVs for your clients and download them in minutes.
          </p>
        </div>

        {/* Plan gate banner */}
        {!loading && !hasPlan && (
          <Link
            to="/upgrade"
            className="flex items-center justify-between gap-3 p-4 mb-6 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="font-bold text-amber-900 dark:text-amber-200">
                Choose an agent plan to start creating CVs
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-600 shrink-0" />
          </Link>
        )}

        {/* Overview — four equal, aligned cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            label="CV credits"
            icon={Sparkles}
            value={loading ? '–' : credits}
            sub={hasPlan ? 'for tailoring' : 'subscribe to get credits'}
          />
          <StatCard label="CVs created" icon={FileText} value={loading ? '–' : cvCount} />
          <StatCard
            label="CVs downloaded"
            icon={FileDown}
            value={loading ? '–' : downloadsAllTime}
            sub="all-time"
          />
          <StatCard
            label="Total made"
            icon={Wallet}
            value={loading ? '–' : formatNgn(earnedAllTime)}
            sub={`${downloadsAllTime} × ${formatNgn(rate)}`}
          />
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap items-center justify-end gap-4 mb-8 text-sm font-semibold">
          <Link
            to="/credits"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1"
          >
            Top up credits <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/agent/earnings"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1"
          >
            See full earnings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Create a CV — primary action */}
        <button
          type="button"
          onClick={startCV}
          className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-left transition-colors mb-8"
        >
          <div>
            <span className="block text-lg font-bold">Create a CV</span>
            <span className="block text-sm text-indigo-100 mt-0.5">
              {hasPlan ? 'Build and download it for your client' : 'Requires an active agent plan'}
            </span>
          </div>
          {hasPlan ? <Plus className="w-7 h-7 shrink-0" /> : <Lock className="w-6 h-6 shrink-0" />}
        </button>

        {/* Recent CVs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent CVs</h2>
            <Link
              to="/my-cvs"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentCVs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {loading ? 'Loading…' : 'No CVs yet — create your first one above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentCVs.map((draft) => (
                <CVCard key={draft._id} draft={draft} layout="compact" />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AgentDashboard;
