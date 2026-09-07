import React, { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import { Rocket, Coins, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

// The whole pre-launch campaign on one screen: the settings, the credit grant, and the
// announcement email.
//
// Deliberately ordered top to bottom in the order they must actually happen on launch
// day. Both action cards are irreversible, so both require an explicit confirm, and the
// server independently refuses out-of-order calls (409) — this UI is the guardrail, the
// API is the guarantee.
const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Stat = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-lg font-bold tabular-nums text-slate-900">{value}</p>
  </div>
);

const AdminLaunch = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  // The full { sent, failed, remaining, lastError } breakdown from the last live send,
  // held until the admin dismisses it. A toast alone was the original design, and it
  // was wrong twice over: it disappears in a few seconds, and — because the endpoint
  // returns HTTP 200 even when it sent nothing (a bad domain, an auth error) — it was
  // rendered as toast.success unconditionally, so a real failure looked identical to a
  // real success. This is the persistent, honest version of that same information.
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/launch/status', authConfig());
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load launch status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grantBonus = async () => {
    if (
      !window.confirm(
        `Grant ${data.launch.bonusCredits} credits to ${data.pendingBonus} account(s)?\n\n` +
          `That issues ${data.bonusTotalIfRun.toLocaleString()} credits and cannot be undone.`
      )
    )
      return;
    setGranting(true);
    try {
      const res = await api.post('/admin/launch/backfill', {}, authConfig());
      toast.success(res.data.message);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Grant failed');
    } finally {
      setGranting(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await api.post('/admin/launch/announce', { mode: 'test' }, authConfig());
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test send failed');
    } finally {
      setTesting(false);
    }
  };

  const sendLive = async () => {
    // Confirm on sendableToday, not pendingEmail — the cap means those can genuinely
    // differ, and confirming on the bigger number is exactly the misleading promise the
    // button label made before.
    const capped = data.sendableToday < data.pendingEmail;
    if (
      !window.confirm(
        `Email ${data.sendableToday} account(s)${capped ? ` — today's cap; ${data.pendingEmail - data.sendableToday} more will wait for later days` : ''}?\n\n` +
          `This cannot be recalled. Send yourself a test first if you have not.`
      )
    )
      return;
    setSending(true);
    try {
      const res = await api.post('/admin/launch/announce', {}, authConfig());
      setResult(res.data.data);
      // The endpoint answers 200 whenever it FINISHED RUNNING, which is not the same as
      // whenever it worked — a domain or auth error stops the batch loop cleanly and
      // still returns 200 with sent:0. Grade the toast on what actually happened rather
      // than on the request having succeeded.
      if (res.data.data.sent > 0 && !res.data.data.lastError) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-slate-500">Loading…</div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-slate-500">Could not load launch status.</div>
      </AdminLayout>
    );
  }

  const emailBlockedReason = !data.emailConfigured
    ? 'RESEND_API_KEY is not set — nothing would actually be delivered.'
    : /resend\.dev/i.test(data.fromAddress || '')
      ? `Sending from ${data.fromAddress}. Set RESEND_FROM_EMAIL to a verified domain first.`
      : data.maintenanceMode
        ? 'Maintenance mode is still ON — recipients would land on a closed site.'
        : data.pendingBonus > 0
          ? `${data.pendingBonus} account(s) have not received their credits yet.`
          : data.pendingEmail > 0 && data.sendableToday === 0
            ? `Today's ${data.dailyCap}-email cap is used up. The rest are ready tomorrow.`
            : null;

  return (
    <AdminLayout>
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Rocket className="h-6 w-6 text-slate-400" />
          Launch campaign
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Run these in order: grant the credits, turn maintenance off, then send the email.
        </p>
      </div>

      {/* 1. Where things stand */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-900">Campaign status</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Accounts" value={data.totalUsers} />
          <Stat label="Awaiting credits" value={data.pendingBonus} />
          <Stat label="Not yet emailed" value={data.pendingEmail} />
          <Stat label="Bonus per account" value={data.launch.bonusCredits} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              data.launch.enabled
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Pre-launch {data.launch.enabled ? 'ON' : 'OFF'}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              data.maintenanceMode ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Maintenance {data.maintenanceMode ? 'ON' : 'OFF'}
          </span>
          {data.launch.date && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
              Launch {new Date(data.launch.date).toLocaleString()}
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Edit the date, the bonus and the pre-launch toggle in Settings → Launch.
        </p>
      </div>

      {/* 2. Credits */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 font-bold text-slate-900">
          <Coins className="h-4 w-4 text-slate-400" />
          Step 1 — Grant early-bird credits
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Adds {data.launch.bonusCredits} credits to every account that has not had them. Safe to
          re-run: accounts already granted are skipped.
        </p>
        {data.pendingBonus === 0 ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> All accounts have their credits.
          </p>
        ) : (
          <button
            type="button"
            onClick={grantBonus}
            disabled={granting || !data.launch.enabled}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {granting
              ? 'Granting…'
              : `Grant ${data.bonusTotalIfRun.toLocaleString()} credits to ${data.pendingBonus} account(s)`}
          </button>
        )}
        {!data.launch.enabled && data.pendingBonus > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Turn the pre-launch campaign on first.
          </p>
        )}
      </div>

      {/* 3. Email */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 font-bold text-slate-900">
          <Mail className="h-4 w-4 text-slate-400" />
          Step 2 — Send the launch announcement
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          One email per account, sent once. Anyone already emailed is skipped, so a retry only picks
          up the remainder.
        </p>

        {emailBlockedReason && (
          <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {emailBlockedReason}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={sendTest}
            disabled={testing || !data.emailConfigured}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {/* Named rather than "to me": it goes to a fixed pre-flight inbox, not to
                whichever admin is signed in. */}
            {testing ? 'Sending…' : 'Send a test'}
          </button>
          <button
            type="button"
            onClick={sendLive}
            disabled={sending || !!emailBlockedReason || data.pendingEmail === 0}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {sending
              ? 'Sending…'
              : data.pendingEmail === 0
                ? 'Everyone has been emailed'
                : data.sendableToday === 0
                  ? "Today's cap reached"
                  : // The label says what actually happens on click — the daily cap can leave
                    // a real gap between "not yet emailed" and "will be emailed today", and
                    // the button that used to promise the bigger number is the bug being fixed.
                    data.sendableToday < data.pendingEmail
                    ? `Email ${data.sendableToday} of ${data.pendingEmail} today`
                    : `Email ${data.pendingEmail} account(s)`}
          </button>
        </div>

        {data.claimedUnsent > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            {data.claimedUnsent} account(s) were claimed by an interrupted send and never confirmed.
            Re-running picks them up.
          </p>
        )}
      </div>

      {/* Result — what the last live send actually did, held until dismissed. Not a
          toast: this is the number the admin came here to confirm, and a message that
          disappears in three seconds is not a record they can check twice. */}
      {result && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="launch-send-result-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3
              id="launch-send-result-title"
              className="flex items-center gap-2 font-bold text-slate-900"
            >
              {result.lastError ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
              {result.lastError ? 'Send stopped early' : 'Announcement sent'}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <Stat label="Sent" value={result.sent} />
              <Stat label="Remaining" value={result.remaining} />
            </div>

            {result.failed > 0 && (
              <p className="mt-3 text-sm font-semibold text-rose-700">
                {result.failed} account(s) were NOT emailed.
              </p>
            )}

            {result.lastError && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {result.lastError}
              </p>
            )}

            {!result.lastError && result.remaining > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Today's {result.dailyCap}-email cap is reached. Run this again tomorrow for the
                rest.
              </p>
            )}

            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminLaunch;
