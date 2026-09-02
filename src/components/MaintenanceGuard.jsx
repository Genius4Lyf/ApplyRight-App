import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Maintenance from '../pages/Maintenance';
import PreLaunch from '../pages/PreLaunch';

// One in-flight request shared by every mount.
//
// This guard is instantiated per ROUTE ELEMENT with a mount-only effect, so without this
// it fires a fresh /system/status on every single navigation. The backend carries a
// global 100-requests/15-minutes-per-IP limiter, and a mobile audience behind carrier NAT
// shares an IP — so a busy campaign day could collectively trip the limiter and show
// people "Too many requests" instead of the countdown. Resolving one promise for the
// whole session costs nothing and removes that entirely.
let statusPromise = null;
const fetchStatus = () => {
  if (!statusPromise) {
    statusPromise = api
      .get('/system/status')
      .then((res) => res.data)
      .catch((err) => {
        // Let the next mount retry rather than caching a failure for the session.
        statusPromise = null;
        throw err;
      });
  }
  return statusPromise;
};

const MaintenanceGuard = ({ children }) => {
  // null = undecided, 'open' = let them through, or which blocking page to show.
  const [verdict, setVerdict] = useState(null);
  // The authoritative launch block from the same response, handed to PreLaunch so it
  // never has to depend on the client singleton being hydrated yet.
  const [launch, setLaunch] = useState(null);

  useEffect(() => {
    let alive = true;

    fetchStatus()
      .then((data) => {
        if (!alive) return;
        setLaunch(data.launch || null);
        // api.js attaches the bearer token itself, so the server decides `bypass` from
        // the caller's own identity — this never re-derives it from localStorage, which
        // is what let a maintenanceAccess (non-admin) user be blocked client-side while
        // every real request of theirs would have succeeded.
        if (!data.maintenance || data.bypass) return setVerdict('open');
        // Both flags on = a launch is being counted down to. Maintenance alone keeps its
        // ordinary meaning: an unplanned outage, where a countdown would be a lie.
        setVerdict(data.launch?.enabled ? 'prelaunch' : 'maintenance');
      })
      .catch(() => {
        // Fail OPEN: an unreachable status check must not lock everyone out.
        if (alive) setVerdict('open');
      });

    return () => {
      alive = false;
    };
  }, []);

  if (verdict === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        {/* Deliberately blank — this resolves in one round trip. */}
      </div>
    );
  }

  // Hand the page the authoritative copy from /system/status rather than letting it read
  // the (possibly unhydrated) client singleton.
  if (verdict === 'prelaunch') return <PreLaunch launch={launch} />;

  if (verdict === 'maintenance') return <Maintenance />;

  return children;
};

export default MaintenanceGuard;
