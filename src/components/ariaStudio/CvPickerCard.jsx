import React, { useEffect, useState } from 'react';
import { formatRelative } from '../../lib/relativeDate';
import { useTranslation } from 'react-i18next';
import CVService from '../../services/cv.service';
import { getCompletionStatus, cvBand } from '../../lib/cvCompleteness';
import { BAND_TEXT, BAND_RULEBG } from '../../lib/noteStyles';
import AriaCard from './AriaCard';

// Which CV are we tailoring FROM? Completion % + band come from the shared
// cvCompleteness helpers (the same source /my-cvs and the dashboard use) — MyCVs'
// deriveCv is page-local, so the primitives are recomputed here rather than imported.
const CvPickerCard = ({ onPick, onCancel, busyId }) => {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await CVService.getMyDrafts();
        if (alive) setDrafts(Array.isArray(list) ? list : []);
      } catch {
        if (alive) {
          setDrafts([]);
          setError(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AriaCard cardKey="cvpicker">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.cvPicker.whichCv')}
        </p>

        {drafts === null && (
          <p className="mt-3 text-[12px] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.cvPicker.fetching')}
          </p>
        )}

        {drafts?.length === 0 && (
          <p className="mt-3 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            {error ? t('ariaStudio.cvPicker.loadError') : t('ariaStudio.cvPicker.noneYet')}
          </p>
        )}

        {drafts?.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 max-h-[280px] overflow-y-auto scrollbar-none">
            {drafts.map((d) => {
              const { percent, isComplete } = getCompletionStatus(d);
              const band = cvBand(percent, isComplete);
              const name = d.personalInfo?.fullName || t('ariaStudio.cvPicker.draft');
              const relative = d.updatedAt
                ? formatRelative(new Date(d.updatedAt))
                : '';
              const busy = busyId === d._id;

              return (
                <button
                  key={d._id}
                  type="button"
                  disabled={!!busyId}
                  onClick={() => onPick?.(d)}
                  className="relative overflow-hidden text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white bg-white dark:bg-slate-900 pl-4 pr-3 py-2.5 flex items-center gap-3 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
                >
                  <span className={`absolute left-0 inset-y-0 w-[3px] ${BAND_RULEBG[band]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {d.title || t('ariaStudio.cvPicker.untitledCv')}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {name}
                      {relative ? ` · ${t('ariaStudio.cvPicker.editedRelative', { relative })}` : ''}
                    </span>
                  </span>
                  <span className={`shrink-0 font-mono text-[11px] font-bold ${BAND_TEXT[band]}`}>
                    {busy ? '…' : `${percent}%`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-start">
          <button
            type="button"
            onClick={() => onCancel?.()}
            disabled={!!busyId}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default CvPickerCard;
