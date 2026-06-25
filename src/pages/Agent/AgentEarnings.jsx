import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Crown,
  FileDown,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  Lock,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, CartesianGrid } from 'recharts';
import Navbar from '../../components/Navbar';
import StatCard from '../../components/Agent/StatCard';
import AgentService from '../../services/agent.service';
import { formatNgn } from '../../lib/plans';
import { signalReady } from '../../utils/splash';

const PERIOD_LABEL = { 7: 'week', 30: 'month', 365: 'year' };
const periodLabel = (days) => PERIOD_LABEL[days] || (days ? `${days} days` : '');
const isoDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const prettyDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const AgentEarnings = () => {
  const [summary, setSummary] = useState(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  const loadSummary = async (r) => {
    setLoading(true);
    try {
      const data = await AgentService.getSummary({
        from: r.from || undefined,
        to: r.to || undefined,
      });
      setSummary(data);
      if (!r.from && !r.to && data?.range) {
        setRange({ from: isoDay(data.range.from), to: isoDay(data.range.to) });
      }
    } catch {
      toast.error('Could not load earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    signalReady();
    loadSummary({ from: '', to: '' });
  }, []);

  const onDate = (key) => (e) => {
    const next = { ...range, [key]: e.target.value };
    setRange(next);
    if (next.from && next.to) loadSummary(next);
  };

  const plan = summary?.plan || {};
  const hasPlan = !!plan.active;
  const rate = summary?.rateNgn || 500;
  const downloadsRange = summary?.downloads?.range ?? 0;
  const downloadsAllTime = summary?.downloads?.allTime ?? 0;
  const valueGenerated = downloadsRange * rate;
  const netProfit = valueGenerated - (plan.amountNgn || 0);
  const profitPositive = netProfit >= 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-amber-600">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Earnings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              What you’ve made
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Every CV you download is worth {formatNgn(rate)}. Pick a date range to see how you’re
              doing.
            </p>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={onDate('from')}
              className="input-field py-1.5 px-2.5 text-xs"
              aria-label="From date"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={onDate('to')}
              className="input-field py-1.5 px-2.5 text-xs"
              aria-label="To date"
            />
          </div>
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
                Subscribe to an agent plan to start earning
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-600 shrink-0" />
          </Link>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Your plan"
            icon={Crown}
            value={hasPlan ? plan.label || 'Active' : 'No plan'}
            sub={
              hasPlan
                ? `${formatNgn(plan.amountNgn)} / ${periodLabel(plan.periodDays)}${
                    plan.expiresAt ? ` · expires ${prettyDate(plan.expiresAt)}` : ''
                  }`
                : 'Subscribe to start earning'
            }
          />
          <StatCard
            label="CVs downloaded"
            icon={FileDown}
            value={loading ? '–' : downloadsRange}
            sub={`${downloadsAllTime} all-time`}
          />
          <StatCard
            label="Value generated"
            icon={Wallet}
            value={loading ? '–' : formatNgn(valueGenerated)}
            sub={`${downloadsRange} CVs × ${formatNgn(rate)}`}
          />
          <StatCard
            label="Net profit"
            icon={profitPositive ? TrendingUp : TrendingDown}
            value={loading ? '–' : `${netProfit < 0 ? '−' : ''}${formatNgn(Math.abs(netProfit))}`}
            tone={
              profitPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }
            sub={hasPlan ? `vs ${formatNgn(plan.amountNgn)} plan cost` : 'no plan cost yet'}
          />
        </div>

        {/* Downloads chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Downloads over time
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {prettyDate(range.from)} – {prettyDate(range.to)}
            </span>
          </div>
          {summary?.byDay?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={summary.byDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  }
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <Tooltip
                  labelFormatter={(d) => prettyDate(d)}
                  formatter={(v) => [`${v} download${v === 1 ? '' : 's'}`, 'CVs']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#dlFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              {loading ? 'Loading…' : 'No CV downloads in this range yet.'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AgentEarnings;
