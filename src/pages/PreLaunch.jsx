import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import api from '../services/api';
import { LAUNCH, msUntil, countdownParts } from '../lib/launch';
import SignOutConfirm from '../components/SignOutConfirm';
import logo from '../assets/logo/applyright-icon-black.png';

// Where a gated visitor lands during the pre-launch campaign, instead of the blank
// "Under Maintenance" page. The campaign pays to get people here, so this page has a job:
// tell them when, tell them what is waiting, and give them something to do.
//
// Styled to the auth surface (the warm #f7f6f2 ground and editorial serif shipped with
// Login/Register) rather than the old slate maintenance shell — arriving from the landing
// page or straight out of signup should feel like one continuous surface.
const PAGE_GROUND = '#f7f6f2';

// How often to re-check once the clock has run out. The launch is a MANUAL toggle (there
// is no scheduler), so without this every gated user sits watching a dead zero. 60s rather
// than something eager because the whole audience is on this page at once and the API
// carries a global per-IP rate limit.
const RECHECK_MS = 60_000;
const MAX_RECHECKS = 30;

const Segment = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span className="font-heading text-[2rem] sm:text-[2.75rem] font-bold leading-none tabular-nums text-slate-900">
      {String(value).padStart(2, '0')}
    </span>
    <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
      {label}
    </span>
  </div>
);

const PreLaunch = ({ launch }) => {
  const { t } = useTranslation();

  // When MaintenanceGuard renders this it hands over the authoritative /system/status
  // copy. On the STANDALONE /pre-launch route (the link shared on social) there is no
  // prop, and the LAUNCH singleton cannot be relied on: it is hydrated asynchronously by
  // App.jsx and mutating it triggers no re-render, so a page mounted before that resolves
  // would sit there with no countdown forever. So fetch it here instead.
  const [remote, setRemote] = useState(null);

  useEffect(() => {
    if (launch) return undefined; // the guard already supplied it
    let alive = true;
    api
      .get('/system/status')
      .then(({ data }) => alive && setRemote(data?.launch || null))
      .catch(() => {
        // Fall through to the singleton / defaults — the page still renders its copy.
      });
    return () => {
      alive = false;
    };
  }, [launch]);

  const config = launch || remote || LAUNCH;
  const launchDate = config?.date || null;
  const bonusCredits = config?.bonusCredits ?? 50;

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [copied, setCopied] = useState(false);

  // Signed-in visitors only. Someone who followed the shared /pre-launch link without
  // an account has nothing to sign out OF, and offering it would imply they had one.
  const signedIn = typeof window !== 'undefined' && !!localStorage.getItem('token');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const navigate = useNavigate();

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // The interval exists only to force a re-render each second; the remaining time is
  // DERIVED during render from the absolute instant. Keeping it out of state is what
  // makes it correct: there is nothing to go stale when the date arrives after mount,
  // nothing to seed, and no drift — a decrementing counter loses minutes across
  // background-tab throttling and device sleep, which on a countdown is the whole
  // product.
  const [, tick] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (!launchDate) return undefined;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [launchDate, tick]);

  const remaining = msUntil(launchDate);

  const isLive = remaining !== null && remaining <= 0;

  // Once the clock hits zero, poll until the admin actually opens the door, then reload so
  // MaintenanceGuard re-evaluates and lets the user through.
  useEffect(() => {
    if (!isLive) return undefined;
    let attempts = 0;
    const id = setInterval(async () => {
      attempts += 1;
      if (attempts > MAX_RECHECKS) return clearInterval(id);
      try {
        const { data } = await api.get('/system/status');
        if (!data.maintenance || data.bypass) window.location.reload();
      } catch {
        // Offline or rate-limited — just try again on the next tick.
      }
    }, RECHECK_MS);
    return () => clearInterval(id);
  }, [isLive]);

  const parts = countdownParts(remaining);

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(user.referralCode || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the code is on screen to copy by hand.
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ backgroundColor: PAGE_GROUND }}
    >
      <div className="w-full max-w-md text-center">
        <div className="mb-9 flex items-center justify-center gap-2.5">
          <img src={logo} alt="ApplyRight" className="h-7 w-auto" />
          <span className="font-brand text-lg font-semibold tracking-tight text-slate-900">
            ApplyRight
          </span>
        </div>

        {/* This page has TWO audiences: a registrant waiting, and a stranger who followed
            the shared link. Telling the stranger they are "on the list" with credits
            "waiting on your account" is three claims that are simply not true of them —
            and it wastes the one link the campaign is spending money to circulate. */}
        <h1 className="text-[1.75rem] sm:text-[2rem] font-bold leading-[1.15] text-slate-900 text-balance">
          {isLive
            ? t('preLaunch.liveTitle')
            : signedIn
              ? t('preLaunch.title')
              : t('preLaunch.guestTitle')}
        </h1>

        <p className="mt-2.5 text-[15px] leading-relaxed text-slate-500 text-balance">
          {isLive
            ? signedIn
              ? t('preLaunch.liveBody')
              : t('preLaunch.guestLiveBody')
            : signedIn
              ? user.email
                ? t('preLaunch.bodyWithEmail', { email: user.email })
                : t('preLaunch.body')
              : t('preLaunch.guestBody')}
        </p>

        {/* No date configured → no timer at all, rather than a row of NaNs. */}
        {launchDate && !isLive && (
          <div className="mt-8 flex items-start justify-center gap-5 sm:gap-7">
            <Segment value={parts.days} label={t('preLaunch.units.days')} />
            <Segment value={parts.hours} label={t('preLaunch.units.hours')} />
            <Segment value={parts.minutes} label={t('preLaunch.units.minutes')} />
            <Segment value={parts.seconds} label={t('preLaunch.units.seconds')} />
          </div>
        )}

        <div className="mt-8 rounded-xl border border-slate-200 bg-white/70 px-5 py-4">
          <p className="text-[15px] font-semibold text-slate-900">
            {signedIn
              ? t('preLaunch.creditsWaiting', { credits: bonusCredits })
              : t('preLaunch.guestCredits', { credits: bonusCredits })}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {t(signedIn ? 'preLaunch.creditsHint' : 'preLaunch.guestCreditsHint')}
          </p>
        </div>

        {/* The whole reason /pre-launch is a public URL rather than something only the
            gate can render: a link shared on social has to be able to convert. */}
        {!signedIn && (
          <div className="mt-6">
            {/* Secondary before primary, the same order as the sign-out confirm: the way
                out sits left, the thing we want sits right and carries the weight. */}
            <div className="flex gap-3">
              <Link
                to="/"
                className="flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {t('preLaunch.ctaHome')}
              </Link>
              <Link
                to="/register"
                className="flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-slate-800"
              >
                {t('preLaunch.ctaSignUp')}
              </Link>
            </div>
            <p className="mt-3 text-[13px] text-slate-500">
              {t('preLaunch.ctaHaveAccount')}{' '}
              <Link
                to="/login"
                className="font-semibold text-slate-900 underline-offset-4 hover:underline"
              >
                {t('common.signIn')}
              </Link>
            </p>
          </div>
        )}

        {user.referralCode && (
          <div className="mt-5">
            <p className="text-[13px] leading-relaxed text-slate-500">
              {t('preLaunch.referralHint')}
            </p>
            <button
              type="button"
              onClick={copyReferral}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-[13px] font-semibold tracking-[0.08em] text-slate-900 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {user.referralCode}
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
          </div>
        )}

        {/* Quiet, and last. This page is a waiting room, so the way out is offered
            rather than advertised — but it has to BE here: without it a signed-in
            visitor is sealed in with no way to switch accounts or leave, since every
            other route sends them straight back to this page. */}
        {signedIn && (
          <div className="mt-10 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="text-[13px] font-medium text-slate-400 underline-offset-4 transition-colors hover:text-slate-600 hover:underline focus:outline-none focus-visible:text-slate-600 focus-visible:underline"
            >
              {t('nav.logout.confirm')}
            </button>
          </div>
        )}
      </div>

      {/* The same confirm the navbar and the studio sidebar use — one sign-out dialog
          for the whole product, not a third variant invented here. */}
      <SignOutConfirm
        open={confirmSignOut}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={signOut}
      />
    </div>
  );
};

export default PreLaunch;
