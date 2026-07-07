import { EyeOff } from 'lucide-react';

// Blur + "Content hidden" cover shown over the CV whenever the page/tab loses
// visibility or focus (driven by useScreenshotGuard). This defeats the app-
// switcher thumbnail preview and casual over-the-shoulder / screen-recording
// grabs while you're away from the tab.
//
// DETERRENT ONLY — like the watermark, this cannot stop an OS-level screenshot;
// it only obscures the CV during the brief window the browser reports as hidden.
//
// It uses `backdrop-blur` to blur the CV behind it while keeping its own label
// crisp, and a near-opaque background as a fallback for browsers without
// backdrop-filter support, so the content is hidden either way. Carries
// `data-preview-watermark` so it is stripped from the PDF clone (it never renders
// during a focused download anyway, but this keeps clones clean defensively).
const ScreenshotCover = ({ show }) => {
  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      data-preview-watermark="true"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl"
    >
      <EyeOff className="w-8 h-8 text-slate-500 dark:text-slate-400" />
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Content hidden
      </span>
      <span className="text-[11px] text-slate-400 dark:text-slate-500">
        Return to this tab to view your CV
      </span>
    </div>
  );
};

export default ScreenshotCover;
