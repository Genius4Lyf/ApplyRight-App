import React from 'react';

// Faint, tiled "ApplyRight • Preview" watermark for the on-screen CV preview.
// Purpose: a screenshot of the preview carries the watermark and is unusable for
// a real application, so the only clean copy is the paid PDF download.
//
// It carries `data-preview-watermark` so the PDF generator can strip it from the
// cloned content before rendering — the DOWNLOADED file is always clean. It's
// pointer-events-none (never blocks interaction) and aria-hidden (screen readers).
const WATERMARK_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='180'>
    <text x='20' y='110' transform='rotate(-30 170 90)' font-family='Arial, sans-serif' font-size='22' font-weight='700' fill='#4f46e5' letter-spacing='1'>ApplyRight • Preview</text>
  </svg>`
);

const PreviewWatermark = () => (
  <div
    aria-hidden="true"
    data-preview-watermark="true"
    className="pointer-events-none select-none absolute inset-0 overflow-hidden"
    style={{
      zIndex: 5,
      opacity: 0.11,
      backgroundImage: `url("data:image/svg+xml,${WATERMARK_SVG}")`,
      backgroundRepeat: 'repeat',
    }}
  />
);

export default PreviewWatermark;
