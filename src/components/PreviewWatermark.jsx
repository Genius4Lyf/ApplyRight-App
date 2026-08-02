import { useEffect, useRef, useState } from 'react';
import logoUrl from '../assets/logo/applyright-icon-black.png';

// ---------------------------------------------------------------------------
// DETERRENT ONLY — this is NOT a screenshot block.
// Mobile/desktop browsers expose no API to intercept OS-level screenshots, so a
// full-frame OS grab or a phone photo of the screen still succeeds. The point of
// this watermark is that any such capture carries the ApplyRight brand + logo
// tiled across the CV, making the grab unusable as a real, clean application
// document. The only clean copy is the paid PDF download (this overlay is
// stripped from the PDF clone before rendering — see the `data-preview-watermark`
// hook in the download handlers).
//
// Shown for FREE users only (paid users get a clean, watermark-free preview);
// gating happens at the call sites via `user.plan !== 'paid'`.
//
// Contrast note: the CV "paper" is rendered `bg-white` in BOTH app light and dark
// mode (only the surrounding chrome flips), so a light-on-white watermark would be
// invisible in app dark mode. Contrast is therefore driven by the TEMPLATE
// background, not the app theme — pass `dark` for dark-backgrounded templates
// (e.g. luxury-royal) to switch to a light watermark.
// ---------------------------------------------------------------------------

const TILE_W = 240; // px — unrotated grid cell width (one "logo + text" mark)
const TILE_H = 128; // px — unrotated grid cell height

const PreviewWatermark = ({ dark = false }) => {
  const ref = useRef(null);
  // Enough tiles to blanket the rotated, over-sized layer. Seeded for an A4 page,
  // then recomputed from the real box so tall / multi-page CVs stay fully covered.
  const [count, setCount] = useState(80);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      // clientWidth/Height are the untransformed layout box, so this stays correct
      // even though the CV container is CSS-scaled.
      const w = el.clientWidth || 794; // ~210mm @ 96dpi fallback
      const h = el.clientHeight || 1123; // ~297mm @ 96dpi fallback
      // The inner layer is over-sized to 160% and rotated -30deg; tile past the
      // edges so the corners stay covered after rotation (overflow is clipped).
      const cols = Math.ceil((w * 1.6) / TILE_W);
      const rows = Math.ceil((h * 1.6) / TILE_H);
      setCount(Math.max(1, cols * rows));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const textColor = dark ? '#f8fafc' : '#312e81'; // slate-50 on dark bg / indigo-950 on white
  const halo = dark ? '0 1px 2px rgba(0,0,0,0.45)' : '0 1px 2px rgba(255,255,255,0.6)';

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-preview-watermark="true"
      className="pointer-events-none select-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 5 }}
    >
      <div
        className="absolute left-1/2 top-1/2 flex flex-wrap content-start justify-center"
        style={{
          width: '160%',
          height: '160%',
          transform: 'translate(-50%, -50%) rotate(-30deg)',
          transformOrigin: 'center',
          opacity: dark ? 0.16 : 0.11,
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center gap-1.5"
            style={{ width: TILE_W, height: TILE_H }}
          >
            <img
              src={logoUrl}
              alt=""
              draggable="false"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
                color: textColor,
                textShadow: halo,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              ApplyRight • Preview
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreviewWatermark;
