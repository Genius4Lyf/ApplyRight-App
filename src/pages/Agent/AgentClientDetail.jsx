import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Mail, Phone, FileText, Pencil } from 'lucide-react';
import Navbar from '../../components/Navbar';
import CVCard from '../../components/CVCard';
import AgentService from '../../services/agent.service';
import CVService from '../../services/cv.service';
import billingService from '../../services/billing.service';

const AgentClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [entitlement, setEntitlement] = useState(null);

  // Active agent plan unlocks CV creation (server-enforced too).
  const hasPlan = !!entitlement && entitlement.tier !== 'free';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [c, list, ent] = await Promise.all([
          AgentService.getClient(id),
          AgentService.getClientCVs(id).catch(() => []),
          billingService.getEntitlement().catch(() => null),
        ]);
        if (cancelled) return;
        setClient(c);
        setForm({
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          notes: c.notes || '',
        });
        setCvs(Array.isArray(list) ? list : []);
        setEntitlement(ent);
      } catch {
        if (!cancelled) {
          toast.error('Client not found');
          navigate('/agent/clients');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const startCV = () => {
    if (!hasPlan) {
      toast.error('An active agent plan is required to create CVs.');
      navigate('/upgrade');
      return;
    }
    navigate('/cv-builder/new', {
      state: { clientForCv: { clientId: id, clientName: client?.name } },
    });
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const updated = await AgentService.updateClient(id, form);
      setClient(updated);
      setEditing(false);
      toast.success('Client updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update client');
    }
  };

  const doDelete = async () => {
    try {
      await AgentService.deleteClient(id);
      toast.success('Client deleted');
      navigate('/agent/clients');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete client');
    }
  };

  // CVCard delete (removes the CV itself, not the client).
  const handleCvDelete = async (draft) => {
    try {
      await CVService.deleteDraft(draft._id);
      setCvs((prev) => prev.filter((d) => d._id !== draft._id));
      toast.success('CV deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete CV');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-8">
          <p className="text-sm text-slate-400">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <Link
          to="/agent/clients"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> All clients
        </Link>

        {/* Client header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6">
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                  className="input-field w-full"
                  placeholder="Name"
                />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  className="input-field w-full"
                  placeholder="Email"
                />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  className="input-field w-full"
                  placeholder="Phone"
                />
                <input
                  name="notes"
                  value={form.notes}
                  onChange={onChange}
                  className="input-field w-full"
                  placeholder="Notes"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {client.name}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {client.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {client.phone}
                    </span>
                  )}
                </div>
                {client.notes && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{client.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Edit client"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  aria-label="Delete client"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CVs */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            CVs ({cvs.length})
          </h2>
          <button
            type="button"
            onClick={startCV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> New CV for this client
          </button>
        </div>

        {cvs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              No CVs for {client.name} yet.
            </p>
            <button
              type="button"
              onClick={startCV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Build their first CV
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cvs.map((draft) => (
              <CVCard key={draft._id} draft={draft} layout="full" onDelete={handleCvDelete} />
            ))}
          </div>
        )}
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Delete client?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  &ldquo;{client.name}&rdquo; will be removed. Their {cvs.length} CV
                  {cvs.length === 1 ? '' : 's'} will be kept in My CVs but unfiled.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDelete}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentClientDetail;
