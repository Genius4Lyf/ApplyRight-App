// Coordinates the Capacitor splash with the first-paint readiness of whichever
// route the app booted into. Without this, the splash hides on a fixed timer
// and the destination page flashes empty while its first fetch is in flight.

const READY_EVENT = 'app:route-ready';

let isReady = false;

export const signalReady = () => {
  if (isReady) return;
  isReady = true;
  window.dispatchEvent(new Event(READY_EVENT));
};

// Resolves when the current route signals it has content, or when `timeoutMs`
// elapses (safety net for slow backends / broken pages).
export const waitForReady = (timeoutMs = 8000) =>
  new Promise((resolve) => {
    if (isReady) return resolve('ready');
    const onReady = () => {
      cleanup();
      resolve('ready');
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve('timeout');
    }, timeoutMs);
    const cleanup = () => {
      window.removeEventListener(READY_EVENT, onReady);
      clearTimeout(timer);
    };
    window.addEventListener(READY_EVENT, onReady, { once: true });
  });
