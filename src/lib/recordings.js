// Device-local store for interview recordings, so a user can come back and
// replay a live interview on the SAME device/browser. Uses IndexedDB (blobs are
// too big for localStorage). No backend / object storage — cross-device replay
// is a future infra step. Bounded to the most recent few per application.

const DB_NAME = 'applyright';
const STORE = 'recordings';
const MAX_PER_APP = 5;

const openDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('applicationId', 'applicationId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = (db, mode) => db.transaction(STORE, mode).objectStore(STORE);

const reqToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// All records for an application, newest-first (metadata + blob).
const allForApp = async (db, applicationId) => {
  const index = tx(db, 'readonly').index('applicationId');
  const rows = await reqToPromise(index.getAll(applicationId));
  return (rows || []).sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Save a recording and prune older ones for that application.
 * @returns {Promise<string|null>} the new record id, or null if storage failed.
 */
export async function saveRecording({ applicationId, blob, durationSec, createdAt }) {
  if (!blob) return null;
  try {
    const db = await openDb();
    const id = `${applicationId}:${createdAt}`;
    await reqToPromise(
      tx(db, 'readwrite').put({ id, applicationId, blob, durationSec, createdAt })
    );
    // Prune to the most recent MAX_PER_APP.
    const rows = await allForApp(db, applicationId);
    const stale = rows.slice(MAX_PER_APP);
    if (stale.length) {
      const store = tx(db, 'readwrite');
      stale.forEach((r) => store.delete(r.id));
    }
    db.close();
    return id;
  } catch {
    return null;
  }
}

// Metadata only (no blob) for listing, newest-first.
export async function listRecordings(applicationId) {
  try {
    const db = await openDb();
    const rows = await allForApp(db, applicationId);
    db.close();
    return rows.map(({ id, applicationId: appId, durationSec, createdAt }) => ({
      id,
      applicationId: appId,
      durationSec,
      createdAt,
    }));
  } catch {
    return [];
  }
}

export async function getRecordingBlob(id) {
  try {
    const db = await openDb();
    const row = await reqToPromise(tx(db, 'readonly').get(id));
    db.close();
    return row ? row.blob : null;
  } catch {
    return null;
  }
}

export async function deleteRecording(id) {
  try {
    const db = await openDb();
    await reqToPromise(tx(db, 'readwrite').delete(id));
    db.close();
    return true;
  } catch {
    return false;
  }
}
