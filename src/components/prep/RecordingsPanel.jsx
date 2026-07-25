import React, { useEffect, useRef, useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listRecordings, getRecordingBlob, deleteRecording } from '../../lib/recordings';
import AudioPlayer from '../AudioPlayer';

// "Past interviews" — replay live-interview recordings saved on THIS device
// (IndexedDB). Hidden when there are none. Cross-device replay would need server
// storage (future). Plays one recording at a time via a lazily-loaded blob URL.
const fmtDuration = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

const fmtDate = (ms) => {
  try {
    return new Date(ms).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const RecordingsPanel = ({ applicationId, onItemsChange }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeUrl, setActiveUrl] = useState(null);
  const [confirmId, setConfirmId] = useState(null); // row pending delete-confirm
  const urlRef = useRef(null);

  const refresh = async () => {
    const rows = await listRecordings(applicationId);
    setItems(rows);
    setLoaded(true);
    if (typeof onItemsChange === 'function') {
      onItemsChange(rows);
    }
  };

  useEffect(() => {
    refresh();
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const play = async (id) => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    const blob = await getRecordingBlob(id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    setActiveUrl(url);
    setActiveId(id);
  };

  const remove = async (id) => {
    setConfirmId(null);
    await deleteRecording(id);
    if (id === activeId) {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setActiveUrl(null);
      setActiveId(null);
    }
    refresh();
  };

  // Nothing to show — render nothing (no empty state clutter).
  if (!loaded || items.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card">
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('interviewPrep.recordings.onThisDevice')}
        </p>
        <h3 className="mt-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {t('interviewPrep.recordings.pastInterviews')}
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
          {t('interviewPrep.recordings.savedReplay')}
        </p>
      </div>

      <div className="space-y-2.5">
        {items.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => play(r.id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" /> {t('interviewPrep.recordings.play')}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {fmtDate(r.createdAt)}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('interviewPrep.recordings.durationLong', {
                    duration: fmtDuration(r.durationSec),
                  })}
                </p>
              </div>
              {confirmId === r.id ? (
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="hidden sm:inline text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t('interviewPrep.recordings.deleteConfirm')}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {t('interviewPrep.recordings.delete')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {t('interviewPrep.recordings.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(r.id)}
                  title={t('interviewPrep.recordings.deleteRecording')}
                  className="shrink-0 p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {activeId === r.id && activeUrl && (
              <div className="mt-3">
                <AudioPlayer src={activeUrl} autoPlay durationHint={r.durationSec} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecordingsPanel;
