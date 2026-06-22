import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, FileText, Plus, ArrowRight, Briefcase, Crown, Lock } from 'lucide-react';
import Navbar from '../../components/Navbar';
import AgentService from '../../services/agent.service';
import billingService from '../../services/billing.service';
import { signalReady } from '../../utils/splash';

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ clientCount: 0, cvCount: 0 });
  const [clients, setClients] = useState([]);
  const [entitlement, setEntitlement] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active agent plan unlocks CV creation. Until entitlement loads we treat it
  // as locked so we never flash an un-gated button (the server gate is the
  // source of truth either way).
  const hasPlan = !!entitlement && entitlement.tier !== 'free';

  const startCV = () => {
    if (!hasPlan) {
      toast.error('An active agent plan is required to create CVs.');
      navigate('/upgrade');
      return;
    }
    navigate('/cv-builder/new');
  };

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    user = {};
  }

  useEffect(() => {
    signalReady();
    let cancelled = false;
    const load = async () => {
      try {
        const [s, c, ent] = await Promise.all([
          AgentService.getSummary().catch(() => ({ clientCount: 0, cvCount: 0 })),
          AgentService.listClients().catch(() => []),
          billingService.getEntitlement().catch(() => null),
        ]);
        if (cancelled) return;
        setSummary(s);
        setClients(Array.isArray(c) ? c : []);
        setEntitlement(ent);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* Welcome */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1.5 text-amber-600">
            <Briefcase className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Agent workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Welcome{user.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build polished CVs for your clients and download them in minutes.
          </p>
        </div>

        {/* Plan gate banner — CV creation needs an active agent plan */}
        {!loading && !hasPlan && (
          <Link
            to="/upgrade"
            className="flex items-center justify-between gap-3 p-4 mb-6 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="block font-bold text-amber-900 dark:text-amber-200">
                  Choose an agent plan to start creating CVs
                </span>
                <span className="block text-sm text-amber-700/80 dark:text-amber-300/80">
                  Unlimited CV tailoring & downloads. Weekly, monthly or yearly.
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-600 shrink-0" />
          </Link>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link
            to="/agent/clients"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-amber-300 dark:hover:border-amber-500/40 transition-colors"
          >
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Clients</span>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {loading ? '–' : summary.clientCount}
            </p>
          </Link>
          <Link
            to="/my-cvs"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors"
          >
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">CVs created</span>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {loading ? '–' : summary.cvCount}
            </p>
          </Link>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <button
            type="button"
            onClick={startCV}
            className="flex items-center justify-between gap-3 p-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-left transition-colors shadow-sm shadow-indigo-200"
          >
            <div>
              <span className="block font-bold text-lg">Create a CV</span>
              <span className="block text-sm text-indigo-100">
                {hasPlan ? 'Start a new CV from scratch' : 'Requires an agent plan'}
              </span>
            </div>
            {hasPlan ? (
              <Plus className="w-6 h-6 shrink-0" />
            ) : (
              <Lock className="w-5 h-5 shrink-0" />
            )}
          </button>
          <Link
            to="/agent/clients"
            className="flex items-center justify-between gap-3 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/40 text-left transition-colors"
          >
            <div>
              <span className="block font-bold text-lg text-slate-900 dark:text-slate-100">
                Manage clients
              </span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">
                Organize CVs by client
              </span>
            </div>
            <Users className="w-6 h-6 shrink-0 text-amber-500" />
          </Link>
        </div>

        {/* Recent clients */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Your clients</h2>
            <Link
              to="/agent/clients"
              className="text-sm font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : clients.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                No clients yet. Add your first client to start filing their CVs.
              </p>
              <Link
                to="/agent/clients"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> Add a client
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {clients.slice(0, 6).map((c) => (
                <Link
                  key={c._id}
                  to={`/agent/clients/${c._id}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-amber-300 dark:hover:border-amber-500/40 transition-colors"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {c.cvCount} CV{c.cvCount === 1 ? '' : 's'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Upgrade nudge */}
        <Link
          to="/upgrade"
          className="flex items-center justify-between gap-3 p-5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-500 fill-amber-400" />
            <div>
              <span className="block font-bold text-amber-900 dark:text-amber-200">
                Agent plans — unlimited CVs & downloads
              </span>
              <span className="block text-sm text-amber-700/80 dark:text-amber-300/80">
                Weekly, monthly or yearly. Built for client work.
              </span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-600 shrink-0" />
        </Link>
      </main>
    </div>
  );
};

export default AgentDashboard;
