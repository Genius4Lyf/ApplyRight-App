import { useEffect, useState } from 'react';
import api from '../services/api';
import { detectDefaultCurrency } from '../lib/plans';

const GEO_CACHE_KEY = 'arGeo';
const OVERRIDE_KEY = 'arGeoOverrideNg';

// Shared across every hook instance for the life of the tab: four billing
// surfaces (Pricing, Upgrade, CreditStore, DownloadPaywallModal) mount this
// hook, but GET /auth/config must fire once per session, not once per surface.
let geoPromise = null;

const readCachedGeo = () => {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedGeo = (geo) => {
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
  } catch {
    /* best-effort only — a failed write just means a refetch next session */
  }
};

const fetchGeo = () => {
  if (geoPromise) return geoPromise;
  const cached = readCachedGeo();
  if (cached) {
    geoPromise = Promise.resolve(cached);
    return geoPromise;
  }
  geoPromise = api
    .get('/auth/config')
    .then((res) => {
      const geo =
        res?.data?.geo && typeof res.data.geo === 'object'
          ? res.data.geo
          : { country: null, currency: null };
      writeCachedGeo(geo);
      return geo;
    })
    .catch(() => ({ country: null, currency: null }));
  return geoPromise;
};

const readOverride = () => {
  try {
    return sessionStorage.getItem(OVERRIDE_KEY) === '1';
  } catch {
    return false;
  }
};

// Resolves the visitor's billing region from live request geo (the backend's
// GET /auth/config `geo` block — see Phase 1), fetched once per session.
//
// `country == null` (lookup failed, request blocked, local dev) is a distinct
// UNKNOWN state, not "foreign": it must still show the currency toggle and
// fall back to detectDefaultCurrency(), exactly like the pre-geo behaviour, so
// a failed lookup never traps a visitor in the wrong currency.
const useBillingRegion = () => {
  const [geoCountry, setGeoCountry] = useState(null);
  const [resolved, setResolved] = useState(false);
  const [override, setOverride] = useState(readOverride);

  useEffect(() => {
    let cancelled = false;
    fetchGeo().then((geo) => {
      if (cancelled) return;
      setGeoCountry(geo?.country ?? null);
      setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The escape hatch pins the region to Nigeria regardless of what geo said —
  // it does not correct the underlying signal, only this visitor's display.
  const country = override ? 'NG' : geoCountry;
  const showToggle = country === 'NG' || country == null;
  const currency = country === 'NG' ? 'NGN' : country != null ? 'USD' : detectDefaultCurrency();

  // For misdetected Nigerians (VPN, travel, a US-locale work laptop) who would
  // otherwise be stuck paying ~1.8x. Switches to NGN and reveals the normal
  // toggle for the rest of this session (sessionStorage, not just this render).
  const overrideToNigeria = () => {
    try {
      sessionStorage.setItem(OVERRIDE_KEY, '1');
    } catch {
      /* best-effort only */
    }
    setOverride(true);
  };

  return { country, currency, showToggle, resolved, overrideToNigeria };
};

export default useBillingRegion;
