import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cropPhotoToDataUrl, PHOTO_FORMAT_LABEL } from '../../utils/cvPhoto';

// FRAME THE PHOTO BEFORE IT GOES ON THE CV.
//
// Uploading used to take the largest CENTRED square and store it — the one rule
// guaranteed to be wrong for the photos people actually have: a half-body shot, a picture
// with someone standing off to one side, anything not already composed as a headshot. It
// produced CVs headed by a photo of somebody's chest, and the only way to fix it was to
// go and crop the file in another program first.
//
// So: drag to move, a slider to zoom, and what is inside the circle is what gets saved.
// The preview is the same circle every template renders, at the same crop, so there is no
// second and different result to be surprised by after downloading.
//
// Deliberately NOT a dialog. It appears inline, in the card that already holds the
// picker — a modal over a chat that is itself inside a drawer is the stacking problem
// this codebase keeps meeting.
const PhotoFramer = ({ image, onCancel, onApply }) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  // -1..1 of the spare space in each axis. 0,0 is exactly the centred crop that used to
  // be forced, so an untouched photo comes out byte-identical to the old behaviour.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const frameRef = useRef(null);

  const clamp = (value) => Math.max(-1, Math.min(1, value));

  // Pointer events, not mouse + touch: one path for a mouse, a finger and a stylus. The
  // capture matters — without it a quick drag stops dead the moment the pointer leaves
  // the circle, which on a phone is most of them.
  const startDrag = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, x0: offset.x, y0: offset.y };
  };

  const onDrag = (event) => {
    const start = dragRef.current;
    const box = frameRef.current?.getBoundingClientRect();
    if (!start || !box) return;
    const dx = (event.clientX - start.x) / box.width;
    const dy = (event.clientY - start.y) / box.height;
    // Dragging RIGHT should reveal what lies to the LEFT, so the crop window travels the
    // opposite way to the finger. The ×2 spans the full -1..1 range across one frame.
    setOffset({ x: clamp(start.x0 - dx * 2), y: clamp(start.y0 - dy * 2) });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  // A drag-only control is unusable without a pointer, and this sits between someone and
  // a finished CV.
  const onKeyDown = (event) => {
    const step = 0.08;
    const nudge = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key];
    if (!nudge) return;
    event.preventDefault();
    setOffset((current) => ({ x: clamp(current.x + nudge.x), y: clamp(current.y + nudge.y) }));
  };

  // What the circle shows: the image scaled so its SHORT side fills the frame, zoomed,
  // then shifted by the same offsets the crop will use. Mirroring the maths in
  // cropPhotoToDataUrl is what makes this a preview rather than an approximation.
  const short = Math.min(image.width, image.height) || 1;
  const spareXPct = ((image.width / short) * 100 - 100) / 2;
  const spareYPct = ((image.height / short) * 100 - 100) / 2;
  const landscape = image.width >= image.height;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
      <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        {t('ariaStudio.photoFramer.title')}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t('ariaStudio.photoFramer.hint')}
      </p>

      <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        {/* A real <button>, not a div with handlers. It IS interactive — drag to pan,
            arrow keys to nudge — so it should be focusable, announced and keyboard-
            reachable by construction rather than by bolting tabIndex onto a div. */}
        <button
          ref={frameRef}
          type="button"
          aria-label={t('ariaStudio.photoFramer.frameAria')}
          onClick={(event) => event.preventDefault()}
          onPointerDown={startDrag}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="relative h-32 w-32 shrink-0 cursor-grab touch-none overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-md outline-none ring-1 ring-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900 active:cursor-grabbing dark:border-slate-800 dark:bg-slate-800 dark:ring-slate-600 dark:focus-visible:ring-white"
        >
          <img
            src={image.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: landscape ? 'auto' : '100%',
              height: landscape ? '100%' : 'auto',
              transform: `translate(-50%, -50%) scale(${zoom}) translate(${-offset.x * spareXPct}%, ${
                -offset.y * spareYPct
              }%)`,
            }}
          />
        </button>

        <div className="w-full min-w-0 space-y-3">
          <div>
            <label
              htmlFor="studio-photo-zoom"
              className="mb-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500"
            >
              {t('ariaStudio.photoFramer.zoom')}
            </label>
            <input
              id="studio-photo-zoom"
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-slate-900 dark:accent-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onApply(cropPhotoToDataUrl(image, { zoom, offsetX: offset.x, offsetY: offset.y }))
              }
              className="btn-primary px-4 py-1.5 text-[13px]"
            >
              {t('ariaStudio.photoFramer.use')}
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:border-slate-500 dark:border-slate-600 dark:text-slate-300"
            >
              {t('ariaStudio.photoFramer.reset')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-1.5 text-[12px] font-semibold text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
        {PHOTO_FORMAT_LABEL}
      </p>
    </div>
  );
};

export default PhotoFramer;
