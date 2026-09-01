import React, { useEffect, useState } from 'react';
import { formatRelative } from '../../lib/relativeDate';
import { useTranslation } from 'react-i18next';
import CVService from '../../services/cv.service';
import { getCompletionStatus, cvBand } from '../../lib/cvCompleteness';
import { BAND_TEXT } from '../../lib/noteStyles';
import CvOriginIcon from '../workspace/CvOriginIcon';
import AriaCard from './AriaCard';

// How many rows stand before the list scrolls. Five is what fits without the card growing
// taller than the conversation it sits in — past that the picker stops being a question
// and becomes a page.
//
// ROW_HEIGHT is a MEASURE, not an imposed height: the rows size themselves from their
// padding, and this only decides where to cut. The cap is deliberately set half a row past
// the fifth, so the sixth is visibly sliced — a partially drawn row is the strongest
// possible signal that there is more below, and far more reliable than a scrollbar that
// only appears once you are already scrolling.
const MAX_VISIBLE = 5;
const ROW_HEIGHT = 57;

// Which of your CVs? Completion % + band come from the shared cvCompleteness helpers
// (the same source the sidebar and the dashboard use) — the row derivation is local, so the
// primitives are recomputed here rather than imported.
//
// Two callers, two questions: the tailor track asks which CV to tailor FROM, and a prep
// session asks which CV to analyse. Same list, same rows — so `eyebrow` swaps the
// question rather than a second copy of this component existing to change one line.
//
// `extra` renders BELOW the list: the prep session puts its upload there, which is
// exactly what someone with no saved CVs needs to see. Back is omitted when there is no
// `onCancel` — a first step has nothing to go back to.
const CvPickerCard = ({ onPick, onCancel, busyId, eyebrow, extra }) => {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // The LEAN list, not whole drafts: this card draws a title, a name, a date and a
        // percentage, and getMyDrafts would ship every bullet of every CV to do it. It is
        // also what carries `studioKind`, which is how a row knows who wrote it.
        const list = await CVService.listCvs('all');
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
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {eyebrow || t('ariaStudio.cvPicker.whichCv')}
        </p>

        {drafts === null && (
          <p className="mt-3 text-[13.5px] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.cvPicker.fetching')}
          </p>
        )}

        {drafts?.length === 0 && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {error ? t('ariaStudio.cvPicker.loadError') : t('ariaStudio.cvPicker.noneYet')}
          </p>
        )}

        {drafts?.length > 0 && (
          <>
            {/* ONE bordered container with hairline rules, not a stack of bordered cards.
              Six separate boxes each with their own border, radius and shadow read as six
              competing objects; the question is which of these, and a list answers that
              better than a pile does.

              The scrollbar is deliberately NOT hidden here (no `chat-scroll`): in a rail
              you already know the list is long, but a card that quietly cuts off at five
              with no visible edge is a card that looks like you only have five CVs. */}
            {/* ONE bordered container with hairline rules, not a stack of bordered cards:
              six boxes each with their own border, radius and shadow read as six competing
              objects, and the question here is which of these.

              Three columns, each doing one job — WHO WROTE IT, WHAT IT IS, HOW FAR ALONG.
              The origin icon leads, in a fixed-width slot, the way a file-type icon leads
              a row in any file list: identity first, and it scans as a column of its own.
              The percentage is right-aligned and tabular so 0% and 100% line up and can be
              compared down the list rather than read one at a time.

              The band rule that used to run down the left edge is gone. It was a second,
              louder encoding of exactly what the percentage already says, and with a
              coloured number in the row it made every unfinished CV read as an error. */}
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div
                className="divide-y divide-slate-200 overflow-y-auto overscroll-contain dark:divide-slate-800"
                style={{ maxHeight: MAX_VISIBLE * ROW_HEIGHT + Math.round(ROW_HEIGHT / 2) }}
              >
                {drafts.map((d) => {
                  const { percent, isComplete } = getCompletionStatus(d);
                  const band = cvBand(percent, isComplete);
                  const name = d.personalInfo?.fullName || t('ariaStudio.cvPicker.draft');
                  const relative = d.updatedAt ? formatRelative(new Date(d.updatedAt)) : '';
                  const busy = busyId === d._id;

                  return (
                    <button
                      key={d._id}
                      type="button"
                      disabled={!!busyId}
                      onClick={() => onPick?.(d)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 dark:hover:bg-slate-800/50 dark:focus-visible:ring-white"
                    >
                      <CvOriginIcon
                        origin={d.studioKind ? 'aria' : 'builder'}
                        size={15}
                        className="w-5 justify-center"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                          {d.title || t('ariaStudio.cvPicker.untitledCv')}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-slate-500 dark:text-slate-400">
                          {name}
                          {relative
                            ? ` · ${t('ariaStudio.cvPicker.editedRelative', { relative })}`
                            : ''}
                        </span>
                      </span>
                      <span
                        className={`w-10 shrink-0 text-right font-mono text-[12px] font-bold tabular-nums ${BAND_TEXT[band]}`}
                      >
                        {busy ? '…' : `${percent}%`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Says out loud that there is more below. A scrollbar alone is a thin hint on
              a trackpad, where it only appears once you are already scrolling. */}
            {drafts.length > MAX_VISIBLE && (
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                {t('ariaStudio.cvPicker.scrollHint', { count: drafts.length })}
              </p>
            )}
          </>
        )}

        {extra}

        {onCancel && (
          <div className="mt-4 flex items-center justify-start">
            <button
              type="button"
              onClick={() => onCancel()}
              disabled={!!busyId}
              className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {t('common.back')}
            </button>
          </div>
        )}
      </div>
    </AriaCard>
  );
};

export default CvPickerCard;
