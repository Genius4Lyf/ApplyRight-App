import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, Plus, ArrowRight, X } from 'lucide-react';
import Navbar from '../../components/Navbar';
import AgentService from '../../services/agent.service';

const AgentClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AgentService.listClients()
      .then((data) => {
        if (!cancelled) setClients(Array.isArray(data) ? data : []);
      })
      .catch(() => !cancelled && toast.error('Failed to load clients'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return;
    }
    setSaving(true);
    try {
      const created = await AgentService.createClient(form);
      setClients((prev) => [{ ...created, cvCount: 0 }, ...prev]);
      setForm({ name: '', email: '', phone: '', notes: '' });
      setShowForm(false);
      toast.success('Client added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <header className="flex items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-amber-600">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Clients</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {clients.length > 0
                ? `${clients.length} client${clients.length === 1 ? '' : 's'}`
                : 'Your clients'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add client
          </button>
        </header>

        {showForm && (
          <form
            onSubmit={onSubmit}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">New client</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                  className="input-field w-full"
                  placeholder="Jane Doe"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  className="input-field w-full"
                  placeholder="jane@example.com"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  className="input-field w-full"
                  placeholder="+234…"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Notes
                </label>
                <input
                  name="notes"
                  value={form.notes}
                  onChange={onChange}
                  className="input-field w-full"
                  placeholder="Target role, etc."
                  disabled={saving}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Add client'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : clients.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center text-amber-500 mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              No clients yet
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto">
              Add a client to keep their CVs organized in one folder.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add your first client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map((c) => (
              <Link
                key={c._id}
                to={`/agent/clients/${c._id}`}
                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-amber-300 dark:hover:border-amber-500/40 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {c.cvCount} CV{c.cvCount === 1 ? '' : 's'}
                    {c.email ? ` · ${c.email}` : ''}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AgentClients;
